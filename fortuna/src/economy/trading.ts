import { findCompany } from './generate';
import { HOURS_PER_DAY, isMarketOpen } from './calendar';
import { toCents, transfer } from './ledger';
import { esNum } from './news';
import { discoverConcept } from './notebook';
import type { Bond, Company, PendingOrder, Rating, SimState, TradeRecord } from './types';
import { dailyVol, getCountry, isHomeCountry, stockSpread } from './valuation';

export interface Quote {
  ok: boolean;
  reason?: string;
  /** Precio medio de ejecución estimado en divisa del activo. */
  price: number;
  /** Importe bruto en céntimos de AUR (sin comisiones). */
  gross: number;
  commission: number;
  fxFee: number;
  /** Total en céntimos (compra: lo que pagas; venta: lo que cobras). */
  total: number;
  spreadPct: number;
  impactPct: number;
}

const TRADE_LIMIT = 500;
const ORDER_EXPIRY_DAYS = 30;

function commissionFor(notionalCents: number, home: boolean, asset: 'stock' | 'bond'): number {
  const min = home ? (asset === 'stock' ? 200 : 300) : 800;
  const pct = home ? (asset === 'stock' ? 0.001 : 0.0015) : asset === 'stock' ? 0.0015 : 0.002;
  return Math.max(min, Math.round(notionalCents * pct));
}

export function quoteStock(state: SimState, c: Company, side: 'buy' | 'sell', qty: number): Quote {
  const fail = (reason: string): Quote => ({
    ok: false,
    reason,
    price: c.price,
    gross: 0,
    commission: 0,
    fxFee: 0,
    total: 0,
    spreadPct: 0,
    impactPct: 0,
  });
  if (!Number.isInteger(qty) || qty <= 0) return fail('Cantidad no válida');
  if (c.status !== 'listed') return fail('El valor no cotiza');
  if (qty > c.adv * 3) return fail('Orden demasiado grande para la liquidez del valor');
  const fx = getCountry(state, c.country).fx;
  const spread = stockSpread(c, fx);
  const participation = qty / Math.max(1, c.adv);
  const impact = Math.min(0.3, 0.7 * dailyVol(state, c) * Math.sqrt(participation));
  const sign = side === 'buy' ? 1 : -1;
  const price = c.price * (1 + sign * (spread / 2 + impact * 0.6));
  const gross = toCents(qty * price * fx);
  const home = isHomeCountry(c.country);
  const commission = commissionFor(gross, home, 'stock');
  const fxFee = home ? 0 : Math.round(gross * 0.0025);
  const total = side === 'buy' ? gross + commission + fxFee : gross - commission - fxFee;
  return { ok: true, price, gross, commission, fxFee, total, spreadPct: spread, impactPct: impact };
}

const BOND_SPREAD: Record<Rating, number> = {
  AAA: 0.0015,
  AA: 0.002,
  A: 0.003,
  BBB: 0.004,
  BB: 0.007,
  B: 0.01,
  CCC: 0.02,
  D: 0.05,
};

export function quoteBond(state: SimState, b: Bond, side: 'buy' | 'sell', qty: number): Quote {
  const fail = (reason: string): Quote => ({
    ok: false,
    reason,
    price: b.price,
    gross: 0,
    commission: 0,
    fxFee: 0,
    total: 0,
    spreadPct: 0,
    impactPct: 0,
  });
  if (!Number.isInteger(qty) || qty <= 0) return fail('Cantidad no válida');
  if (b.status !== 'active') return fail('El bono no está activo');
  const fx = getCountry(state, b.country).fx;
  const spread = BOND_SPREAD[b.rating];
  const sign = side === 'buy' ? 1 : -1;
  const price = b.price * (1 + (sign * spread) / 2);
  const gross = toCents(qty * price * fx); // qty = títulos de 100 de nominal
  const home = isHomeCountry(b.country);
  const commission = commissionFor(gross, home, 'bond');
  const fxFee = home ? 0 : Math.round(gross * 0.0025);
  const total = side === 'buy' ? gross + commission + fxFee : gross - commission - fxFee;
  return { ok: true, price, gross, commission, fxFee, total, spreadPct: spread, impactPct: 0 };
}

export interface TradeResult {
  ok: boolean;
  message: string;
  trade?: TradeRecord;
}

function recordTrade(state: SimState, t: TradeRecord): void {
  state.player.trades.push(t);
  if (state.player.trades.length > TRADE_LIMIT) state.player.trades.shift();
  state.outbox.push({
    type: 'trade',
    tick: state.tick,
    message: `${t.kind === 'buy' ? 'Compra' : 'Venta'} ${t.qty} × ${t.assetId} a ${esNum(t.price)}`,
    ref: t.assetId,
  });
}

/** Garantiza liquidez en modo sandbox (crédito ilimitado). */
function ensureCash(state: SimState, needed: number): boolean {
  const cash = state.ledger.balances['player:cash'];
  if (cash >= needed) return true;
  if (state.settings.sandbox) {
    transfer(state.ledger, state.tick, 'world', 'player:cash', needed - cash, 'Crédito sandbox');
    return true;
  }
  return false;
}

export function executeStock(
  state: SimState,
  c: Company,
  side: 'buy' | 'sell',
  qty: number,
): TradeResult {
  const q = quoteStock(state, c, side, qty);
  if (!q.ok) return { ok: false, message: q.reason ?? 'Orden rechazada' };
  const holdings = state.player.stocks;
  const fees = q.commission + q.fxFee;
  let realized = 0;
  if (side === 'buy') {
    if (!ensureCash(state, q.total))
      return { ok: false, message: 'Saldo insuficiente en la cuenta corriente' };
    transfer(state.ledger, state.tick, 'player:cash', 'market', q.gross, `Compra ${qty} ${c.id}`);
    transfer(state.ledger, state.tick, 'player:cash', 'broker', fees, `Comisión compra ${c.id}`);
    const h = holdings[c.id] ?? { qty: 0, avgCost: 0 };
    h.avgCost = (h.avgCost * h.qty + q.total) / (h.qty + qty);
    h.qty += qty;
    holdings[c.id] = h;
  } else {
    const h = holdings[c.id];
    if (!h || h.qty < qty) return { ok: false, message: 'No tienes suficientes acciones' };
    transfer(state.ledger, state.tick, 'market', 'player:cash', q.gross, `Venta ${qty} ${c.id}`);
    transfer(state.ledger, state.tick, 'player:cash', 'broker', fees, `Comisión venta ${c.id}`);
    realized = Math.round(q.total - h.avgCost * qty);
    h.qty -= qty;
    if (h.qty === 0) delete holdings[c.id];
    state.player.tax.realizedGainsYtd += realized;
    discoverConcept(state, 'impuestos');
  }
  // Impacto de mercado: la mitad es permanente, la otra se disipa en las horas siguientes.
  const sign = side === 'buy' ? 1 : -1;
  const permanent = sign * q.impactPct * 0.5;
  const temporary = sign * q.impactPct * 0.5;
  c.price *= Math.exp(permanent + temporary);
  c.tempImpact += temporary;
  c.sentiment += permanent * 0.5;
  c.volumeToday += qty;
  if (c.price > c.dayHigh) c.dayHigh = c.price;
  if (c.price < c.dayLow) c.dayLow = c.price;

  const trade: TradeRecord = {
    tick: state.tick,
    kind: side,
    asset: 'stock',
    assetId: c.id,
    qty,
    price: q.price,
    cashFlow: side === 'buy' ? -q.total : q.total,
    fees,
    realizedPnl: realized,
  };
  recordTrade(state, trade);
  discoverConcept(state, 'comisiones');
  discoverConcept(state, 'spread');
  if (q.impactPct > 0.004) discoverConcept(state, 'impacto_mercado');
  if (!isHomeCountry(c.country)) discoverConcept(state, 'divisa');
  if (Object.keys(holdings).length >= 5) discoverConcept(state, 'diversificacion');
  return { ok: true, message: 'Orden ejecutada', trade };
}

export function executeBond(
  state: SimState,
  b: Bond,
  side: 'buy' | 'sell',
  qty: number,
): TradeResult {
  const q = quoteBond(state, b, side, qty);
  if (!q.ok) return { ok: false, message: q.reason ?? 'Orden rechazada' };
  const holdings = state.player.bonds;
  const fees = q.commission + q.fxFee;
  let realized = 0;
  if (side === 'buy') {
    if (!ensureCash(state, q.total))
      return { ok: false, message: 'Saldo insuficiente en la cuenta corriente' };
    transfer(state.ledger, state.tick, 'player:cash', 'market', q.gross, `Compra ${qty} ${b.id}`);
    transfer(state.ledger, state.tick, 'player:cash', 'broker', fees, `Comisión compra ${b.id}`);
    const h = holdings[b.id] ?? { qty: 0, avgCost: 0 };
    h.avgCost = (h.avgCost * h.qty + q.total) / (h.qty + qty);
    h.qty += qty;
    holdings[b.id] = h;
  } else {
    const h = holdings[b.id];
    if (!h || h.qty < qty) return { ok: false, message: 'No tienes suficientes títulos' };
    transfer(state.ledger, state.tick, 'market', 'player:cash', q.gross, `Venta ${qty} ${b.id}`);
    transfer(state.ledger, state.tick, 'player:cash', 'broker', fees, `Comisión venta ${b.id}`);
    realized = Math.round(q.total - h.avgCost * qty);
    h.qty -= qty;
    if (h.qty === 0) delete holdings[b.id];
    state.player.tax.realizedGainsYtd += realized;
  }
  recordTrade(state, {
    tick: state.tick,
    kind: side,
    asset: 'bond',
    assetId: b.id,
    qty,
    price: q.price,
    cashFlow: side === 'buy' ? -q.total : q.total,
    fees,
    realizedPnl: realized,
  });
  discoverConcept(state, 'bono_precio_tipos');
  return { ok: true, message: 'Orden ejecutada' };
}

export function placeOrder(
  state: SimState,
  order: Omit<PendingOrder, 'id' | 'placedTick'>,
): TradeResult {
  if (state.player.bankrupt) return { ok: false, message: 'Estás en bancarrota: no puedes operar' };
  const full: PendingOrder = { ...order, id: state.nextId++, placedTick: state.tick };
  if (isMarketOpen(state.tick) && order.limit === undefined) return runOrder(state, full);
  state.player.orders.push(full);
  return {
    ok: true,
    message: isMarketOpen(state.tick)
      ? 'Orden límite registrada'
      : 'Mercado cerrado: la orden se ejecutará en la apertura',
  };
}

function runOrder(state: SimState, o: PendingOrder): TradeResult {
  if (o.asset === 'stock') {
    const c = findCompany(state, o.assetId);
    if (!c) return { ok: false, message: 'Valor desconocido' };
    return executeStock(state, c, o.kind, o.qty);
  }
  const b = state.bonds.find((x) => x.id === o.assetId);
  if (!b) return { ok: false, message: 'Bono desconocido' };
  return executeBond(state, b, o.kind, o.qty);
}

/** Procesa órdenes pendientes (en cada tick con mercado abierto). */
export function processOrders(state: SimState): void {
  if (state.player.orders.length === 0) return;
  const remaining: PendingOrder[] = [];
  for (const o of state.player.orders) {
    if (state.tick - o.placedTick > ORDER_EXPIRY_DAYS * HOURS_PER_DAY) {
      state.outbox.push({
        type: 'warning',
        tick: state.tick,
        message: `Orden caducada: ${o.kind === 'buy' ? 'compra' : 'venta'} de ${o.assetId}`,
      });
      continue;
    }
    if (o.limit !== undefined) {
      const px =
        o.asset === 'stock'
          ? findCompany(state, o.assetId)?.price
          : state.bonds.find((x) => x.id === o.assetId)?.price;
      if (px === undefined) continue;
      const hit = o.kind === 'buy' ? px <= o.limit : px >= o.limit;
      if (!hit) {
        remaining.push(o);
        continue;
      }
    }
    const res = runOrder(state, o);
    if (!res.ok)
      state.outbox.push({
        type: 'warning',
        tick: state.tick,
        message: `Orden rechazada (${o.assetId}): ${res.message}`,
      });
  }
  state.player.orders = remaining;
}

export function cancelOrder(state: SimState, id: number): boolean {
  const before = state.player.orders.length;
  state.player.orders = state.player.orders.filter((o) => o.id !== id);
  return state.player.orders.length < before;
}
