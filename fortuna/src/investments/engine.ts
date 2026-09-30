/**
 * Motor genérico del catálogo de inversiones: valoración, operativa, ventas ilíquidas,
 * investigación, rentas e impuestos. Las reglas específicas viven en `classes/`.
 */
import { dateFromTick, HOURS_PER_DAY, isMarketOpen } from '../economy/calendar';
import { fromCents, toCents, transfer, type Cents } from '../economy/ledger';
import { esNum, publishNews } from '../economy/news';
import { discoverConcept } from '../economy/notebook';
import { seedState } from '../economy/rng';
import type { Loan, SimState } from '../economy/types';
import { homeCountry, isHomeCountry } from '../economy/valuation';
import { CLASS_RULES } from './classes';
import {
  closeMargin,
  isMarginClass,
  marginDaily,
  openMargin,
  unrealizedMargin,
} from './classes/derivatives';
import { maybeExchangeHack } from './classes/markets';
import { weatherNews } from './classes/real';
import { initFactors, updateFactorsDaily, updateFactorsMonthly } from './factors';
import { ctxOf, factorPrice, fxOf, stepIdio, type Ctx } from './helpers';
import type { ClassRules } from './rules';
import type { AssetClassId, CatalogOrder, Instrument, InvestmentsState, Position } from './types';

export function rulesOf(cls: AssetClassId): ClassRules {
  const r = CLASS_RULES[cls];
  if (!r) throw new Error(`Clase de activo desconocida: ${cls}`);
  return r;
}

const instMaps = new WeakMap<Instrument[], Map<string, Instrument>>();

export function findInstrument(state: SimState, id: string): Instrument | undefined {
  const list = state.inv.instruments;
  let map = instMaps.get(list);
  if (!map || map.size !== list.length) {
    map = new Map(list.map((i) => [i.id, i]));
    instMaps.set(list, map);
  }
  return map.get(id);
}

export function createInvestments(state: SimState): InvestmentsState {
  const inv: InvestmentsState = {
    instruments: [],
    orders: [],
    factors: {},
    commodities: {},
    crypto: { regime: 'winter', daysInRegime: 200 },
    weather: 0,
    positions: {},
    research: {},
    researchQueue: [],
    unlocks: { derivatives: false, accredited: false },
    pensionYtd: 0,
    donationsYtd: 0,
    reputation: {},
    serial: 0,
    rng: seedState(state.seed, 'investments'),
  };
  state.inv = inv;
  initFactors(state, inv);
  const ctx = ctxOf(state);
  for (const rules of Object.values(CLASS_RULES)) {
    for (const inst of rules.generate(ctx)) inv.instruments.push(inst);
  }
  return inv;
}

// ---------------------------------------------------------------------------
// Valoración
// ---------------------------------------------------------------------------

export function reprice(ctx: Ctx, inst: Instrument): void {
  const rules = rulesOf(inst.cls);
  if (rules.reprice) rules.reprice(ctx, inst);
  else inst.price = factorPrice(inst, ctx.inv.factors);
}

/** Valor para el patrimonio en céntimos de ₳ de todas las posiciones del catálogo. */
export function catalogValue(state: SimState): { value: Cents; margin: Cents } {
  let value = 0;
  for (const [id, pos] of Object.entries(state.inv.positions)) {
    const inst = findInstrument(state, id);
    if (!inst) continue;
    if (isMarginClass(inst.cls)) value += unrealizedMargin(state, inst, pos);
    else if (inst.cls !== 'philanthropy')
      value += Math.round(inst.price * fxOf(state, inst.ccy) * pos.qty * 100);
  }
  return { value, margin: state.ledger.balances['player:margin'] };
}

// ---------------------------------------------------------------------------
// Cotizaciones y operativa
// ---------------------------------------------------------------------------

export interface CatalogQuote {
  ok: boolean;
  reason?: string;
  /** Precio unitario de ejecución (divisa del instrumento). */
  price: number;
  gross: Cents;
  fees: Cents;
  tax: Cents;
  /** Compra: total a pagar. Venta: neto a cobrar. */
  total: Cents;
  /** Parte financiada con hipoteca (compras). */
  financed: Cents;
  execution: 'now' | 'close' | 'listing' | 'auction';
}

/** Liquidez efectiva (una clase puede tener instrumentos con liquidez distinta). */
export function liquidityOf(inst: Instrument): ClassRules['liquidity'] {
  const l = inst.attrs['liquidity'];
  return typeof l === 'string' ? (l as ClassRules['liquidity']) : rulesOf(inst.cls).liquidity;
}

function secondaryDiscountOf(inst: Instrument, rules: ClassRules): number {
  const d = inst.attrs['secondaryDiscount'];
  return typeof d === 'number' ? d : (rules.secondaryDiscount ?? 0.1);
}

function spreadOf(inst: Instrument, rules: ClassRules): number {
  const s = inst.attrs['spread'];
  return typeof s === 'number' ? s : rules.fees.spread;
}

export function unlockReason(state: SimState, inst: Instrument): string | null {
  const rules = rulesOf(inst.cls);
  if (state.settings.sandbox) return null;
  return rules.unlock ? rules.unlock(state, inst) : null;
}

export function quoteCatalog(
  state: SimState,
  inst: Instrument,
  side: 'buy' | 'sell',
  qty: number,
  mode: 'normal' | 'quick' = 'normal',
  mortgage?: { ltv: number; years: number },
): CatalogQuote {
  const rules = rulesOf(inst.cls);
  // Productos en vivo: precio recalculado con el subyacente actual.
  if (rules.execution === 'live' && rules.reprice && inst.status === 'open')
    rules.reprice(ctxOf(state), inst);
  const fail = (reason: string): CatalogQuote => ({
    ok: false,
    reason,
    price: inst.price,
    gross: 0,
    fees: 0,
    tax: 0,
    total: 0,
    financed: 0,
    execution: 'now',
  });
  if (!Number.isInteger(qty) || qty <= 0) return fail('Cantidad no válida');
  if (isMarginClass(inst.cls))
    return fail('Los productos apalancados se abren y se cierran como posición');
  if (qty % inst.lot !== 0) return fail(`La cantidad debe ser múltiplo de ${inst.lot}`);
  const pos = state.inv.positions[inst.id];
  if (side === 'buy') {
    if (inst.status !== 'open') return fail('Ya no está disponible');
    const lock = unlockReason(state, inst);
    if (lock) return fail(lock);
    if (inst.unique && (qty > 1 || pos)) return fail('Es una pieza única');
  } else {
    if (!pos || pos.qty < qty) return fail('No tienes suficientes unidades');
    if (pos.selling) return fail('Ya está a la venta');
    if (liquidityOf(inst) === 'none') return fail('Este activo no se puede vender');
  }
  const fx = fxOf(state, inst.ccy);
  const spread = spreadOf(inst, rules);
  const f = rules.fees;
  let unit = inst.price;
  let execution: CatalogQuote['execution'] = rules.execution === 'close' ? 'close' : 'now';
  if (side === 'buy') unit *= 1 + spread / 2;
  else {
    unit *= 1 - spread / 2;
    const liq = liquidityOf(inst);
    if (liq === 'secondary') unit *= 1 - secondaryDiscountOf(inst, rules);
    if (liq === 'listing') {
      if (mode === 'quick') unit *= 1 - (rules.quickSaleDiscount ?? 0.15);
      else execution = 'listing';
    }
    if (liq === 'auction') execution = 'auction';
  }
  const gross = toCents(unit * qty * fx);
  const pct = side === 'buy' ? f.buy : f.sell;
  let fees = Math.max(toCents(f.min), Math.round(gross * pct));
  if (!isHomeCountry(inst.ccy)) fees += Math.round(gross * 0.0025);
  if (side === 'sell' && f.sellAgent) fees += Math.round(gross * f.sellAgent);
  const tax = side === 'buy' && f.buyTax ? Math.round(gross * f.buyTax) : 0;
  let financed = 0;
  if (side === 'buy' && mortgage) {
    if (inst.cls !== 'realestate') return fail('Solo los inmuebles se pueden hipotecar');
    const ltv = Math.min(0.8, Math.max(0, mortgage.ltv));
    financed = Math.round(gross * ltv);
    const limit = maxMortgage(state, inst, mortgage.years);
    if (financed > limit && !state.settings.sandbox)
      return fail(`El banco solo financia hasta ${esNum(fromCents(limit), 0)} ₳ con tus ingresos`);
  }
  const total = side === 'buy' ? gross + fees + tax - financed : gross - fees;
  return { ok: true, price: unit, gross, fees, tax, total, financed, execution };
}

/** Hipoteca máxima: cuotas ≤ 40 % de (nómina + 70 % de alquileres, incluido este). */
export function maxMortgage(state: SimState, inst: Instrument, years: number): Cents {
  const p = state.player;
  let rents = 0;
  for (const [id] of Object.entries(state.inv.positions)) {
    const i = findInstrument(state, id);
    if (i && i.cls === 'realestate') rents += (i.price * i.yield) / 12;
  }
  rents += (inst.price * inst.yield) / 12;
  const income = fromCents(p.job?.netMonthly ?? 0) + rents * 0.7;
  const payments = fromCents(p.loans.reduce((a, l) => a + l.monthlyPayment, 0));
  const capacity = Math.max(0, income * 0.4 - payments);
  const r = mortgageRate(state) / 12;
  const n = Math.max(5, Math.min(30, years)) * 12;
  return toCents((capacity * (1 - Math.pow(1 + r, -n))) / r);
}

export function mortgageRate(state: SimState): number {
  return (
    homeCountry(state).policyRate +
    0.013 +
    Math.max(0, (700 - state.player.creditScore) / 100) * 0.01
  );
}

export interface CatalogResult {
  ok: boolean;
  message: string;
}

function ensureCash(state: SimState, needed: Cents): boolean {
  const cash = state.ledger.balances['player:cash'];
  if (cash >= needed) return true;
  if (state.settings.sandbox) {
    transfer(state.ledger, state.tick, 'world', 'player:cash', needed - cash, 'Crédito sandbox');
    return true;
  }
  return false;
}

/** Punto de entrada de las compras: inmediata o a precio de cierre según la clase. */
export function placeCatalogBuy(
  state: SimState,
  id: string,
  qty: number,
  mortgage?: { ltv: number; years: number },
): CatalogResult {
  const inst = findInstrument(state, id);
  if (!inst) return { ok: false, message: 'Instrumento desconocido' };
  if (state.player.bankrupt) return { ok: false, message: 'Estás en bancarrota' };
  if (isMarginClass(inst.cls))
    return { ok: false, message: 'Los productos apalancados se abren como posición larga o corta' };
  const rules = rulesOf(inst.cls);
  const q = quoteCatalog(state, inst, 'buy', qty, 'normal', mortgage);
  if (!q.ok) return { ok: false, message: q.reason ?? 'Operación rechazada' };
  if (rules.execution === 'live') {
    if (rules.exchangeHours && !isMarketOpen(state.tick))
      return { ok: false, message: 'Solo se opera con la bolsa abierta' };
    return executeBuy(state, inst, qty, mortgage);
  }
  if (state.inv.orders.some((o) => o.instId === id && o.side === 'buy' && inst.unique))
    return { ok: false, message: 'Ya tienes una oferta en curso' };
  const order: CatalogOrder = {
    id: state.nextId++,
    instId: id,
    side: 'buy',
    qty,
    placedTick: state.tick,
    ...(mortgage ? { mortgage } : {}),
  };
  state.inv.orders.push(order);
  return { ok: true, message: 'Orden registrada: se ejecutará al precio de las 18:00' };
}

export function executeBuy(
  state: SimState,
  inst: Instrument,
  qty: number,
  mortgage?: { ltv: number; years: number },
): CatalogResult {
  const rules = rulesOf(inst.cls);
  const q = quoteCatalog(state, inst, 'buy', qty, 'normal', mortgage);
  if (!q.ok) return { ok: false, message: q.reason ?? 'Operación rechazada' };
  if (!ensureCash(state, q.total))
    return { ok: false, message: 'Saldo insuficiente en la cuenta corriente' };
  const L = state.ledger;
  const memo = `${inst.name}`.slice(0, 60);
  if (q.financed > 0) {
    const loan = createMortgage(state, q.financed, mortgage?.years ?? 25, inst.id);
    transfer(L, state.tick, 'bank', 'player:cash', q.financed, `Hipoteca #${loan.id}`);
  }
  transfer(L, state.tick, 'player:cash', rules.counterparty, q.gross, `Compra ${memo}`);
  transfer(
    L,
    state.tick,
    'player:cash',
    rules.counterparty === 'market' ? 'broker' : 'world',
    q.fees,
    `Gastos de compra ${memo}`,
  );
  if (q.tax > 0)
    transfer(L, state.tick, 'player:cash', 'gov', q.tax, `Impuesto de transmisiones ${memo}`);
  const pos: Position = state.inv.positions[inst.id] ?? { qty: 0, cost: 0, opened: state.tick };
  pos.qty += qty;
  pos.cost += q.gross + q.fees + q.tax;
  if (q.financed > 0) pos.mortgageId = state.player.loans[state.player.loans.length - 1]!.id;
  state.inv.positions[inst.id] = pos;
  rules.onBuy?.(ctxOf(state), inst, pos, qty);
  state.outbox.push({
    type: 'trade',
    tick: state.tick,
    message: `Compra: ${qty > 1 ? `${qty} × ` : ''}${inst.name}`,
    ref: inst.id,
  });
  discoverConcept(state, 'comisiones');
  if (Object.keys(state.inv.positions).length + Object.keys(state.player.stocks).length >= 5)
    discoverConcept(state, 'diversificacion');
  return { ok: true, message: 'Compra realizada' };
}

function createMortgage(state: SimState, amount: Cents, years: number, collateral: string): Loan {
  const rate = mortgageRate(state);
  const months = Math.max(5, Math.min(30, years)) * 12;
  const r = rate / 12;
  const loan: Loan = {
    id: state.nextId++,
    kind: 'mortgage',
    collateral,
    principal: amount,
    outstanding: amount,
    rate,
    monthlyPayment: Math.ceil((amount * r) / (1 - Math.pow(1 + r, -months))),
    monthsLeft: months,
    missedPayments: 0,
  };
  state.player.loans.push(loan);
  discoverConcept(state, 'hipoteca');
  return loan;
}

/** Venta: inmediata, a precio de cierre, anunciada, rápida o en subasta según la clase. */
export function placeCatalogSell(
  state: SimState,
  id: string,
  qty: number,
  mode: 'normal' | 'quick' = 'normal',
): CatalogResult {
  const inst = findInstrument(state, id);
  if (!inst) return { ok: false, message: 'Instrumento desconocido' };
  const rules = rulesOf(inst.cls);
  const q = quoteCatalog(state, inst, 'sell', qty, mode);
  if (!q.ok) return { ok: false, message: q.reason ?? 'Operación rechazada' };
  const pos = state.inv.positions[inst.id]!;
  const ctx = ctxOf(state);
  if (q.execution === 'listing') {
    const [a, b] = rules.listingDays ?? [30, 120];
    pos.selling = {
      mode: 'listing',
      readyTick: state.tick + ctx.rng.int(a, b) * HOURS_PER_DAY,
      asking: inst.price,
    };
    return { ok: true, message: 'Anunciado. Buscaremos comprador en las próximas semanas.' };
  }
  if (q.execution === 'auction') {
    const d = dateFromTick(state.tick);
    const daysToSat = ((5 - d.weekday + 7) % 7) + 7; // la siguiente subasta con catálogo impreso
    pos.selling = {
      mode: 'auction',
      readyTick: state.tick + daysToSat * HOURS_PER_DAY,
      asking: inst.price,
    };
    return { ok: true, message: 'Consignado para la subasta del sábado de la semana próxima.' };
  }
  if (q.execution === 'close') {
    state.inv.orders.push({
      id: state.nextId++,
      instId: id,
      side: 'sell',
      qty,
      placedTick: state.tick,
    });
    return { ok: true, message: 'Orden registrada: se ejecutará al precio de las 18:00' };
  }
  if (rules.exchangeHours && !isMarketOpen(state.tick))
    return { ok: false, message: 'Solo se opera con la bolsa abierta' };
  return executeSell(state, inst, qty, mode === 'quick' ? 'quick' : 'normal');
}

/** Liquida una venta al precio de ejecución (con una tasación opcional distinta). */
export function executeSell(
  state: SimState,
  inst: Instrument,
  qty: number,
  mode: 'normal' | 'quick',
  overridePrice?: number,
): CatalogResult {
  const rules = rulesOf(inst.cls);
  const pos = state.inv.positions[inst.id];
  if (!pos || pos.qty < qty) return { ok: false, message: 'No tienes suficientes unidades' };
  const saved = pos.selling;
  delete pos.selling;
  const q = quoteCatalog(state, inst, 'sell', qty, mode);
  if (!q.ok) {
    pos.selling = saved;
    return { ok: false, message: q.reason ?? 'Operación rechazada' };
  }
  let gross = q.gross;
  let fees = q.fees;
  if (overridePrice !== undefined) {
    gross = toCents(overridePrice * qty * fxOf(state, inst.ccy));
    fees = Math.max(
      toCents(rules.fees.min),
      Math.round(gross * (rules.fees.sell + (rules.fees.sellAgent ?? 0))),
    );
  }
  const L = state.ledger;
  transfer(
    L,
    state.tick,
    rules.counterparty,
    'player:cash',
    gross,
    `Venta ${inst.name}`.slice(0, 70),
  );
  transfer(
    L,
    state.tick,
    'player:cash',
    rules.counterparty === 'market' ? 'broker' : 'world',
    Math.min(fees, gross),
    `Gastos de venta ${inst.name}`.slice(0, 70),
  );
  const costPart = Math.round((pos.cost * qty) / pos.qty);
  state.player.tax.realizedGainsYtd += gross - Math.min(fees, gross) - costPart;
  pos.qty -= qty;
  pos.cost -= costPart;
  repayMortgageOnSale(state, inst, pos);
  if (pos.qty <= 0) {
    delete state.inv.positions[inst.id];
    rules.onSold?.(ctxOf(state), inst);
  }
  state.outbox.push({
    type: 'trade',
    tick: state.tick,
    message: `Venta: ${qty > 1 ? `${qty} × ` : ''}${inst.name} por ${esNum(fromCents(gross - fees))} ₳`,
    ref: inst.id,
  });
  discoverConcept(state, 'impuestos');
  return { ok: true, message: 'Venta realizada' };
}

function repayMortgageOnSale(state: SimState, inst: Instrument, pos: Position): void {
  if (!pos.mortgageId || pos.qty > 0) return;
  const loan = state.player.loans.find((l) => l.id === pos.mortgageId);
  if (!loan) return;
  transfer(
    state.ledger,
    state.tick,
    'player:cash',
    'bank',
    loan.outstanding,
    `Cancelación hipoteca #${loan.id} (${inst.name})`.slice(0, 70),
  );
  state.player.loans = state.player.loans.filter((l) => l.id !== loan.id);
}

export function cancelSale(state: SimState, id: string): CatalogResult {
  const pos = state.inv.positions[id];
  if (!pos?.selling) return { ok: false, message: 'No está a la venta' };
  delete pos.selling;
  return { ok: true, message: 'Venta retirada' };
}

export function cancelCatalogOrder(state: SimState, orderId: number): CatalogResult {
  const before = state.inv.orders.length;
  state.inv.orders = state.inv.orders.filter((o) => o.id !== orderId);
  return state.inv.orders.length < before
    ? { ok: true, message: 'Orden cancelada' }
    : { ok: false, message: 'Orden no encontrada' };
}

// ---------------------------------------------------------------------------
// Productos con margen (futuros, CFD, divisas apalancadas) y opciones
// ---------------------------------------------------------------------------

export function openLeveraged(
  state: SimState,
  id: string,
  direction: 'long' | 'short',
  qty: number,
): CatalogResult {
  const inst = findInstrument(state, id);
  if (!inst) return { ok: false, message: 'Instrumento desconocido' };
  const lock = unlockReason(state, inst);
  if (lock) return { ok: false, message: lock };
  if (state.player.bankrupt) return { ok: false, message: 'Estás en bancarrota' };
  if (state.inv.positions[id])
    return { ok: false, message: 'Ya tienes una posición abierta: ciérrala primero' };
  if (rulesOf(inst.cls).execution === 'close') {
    state.inv.orders.push({
      id: state.nextId++,
      instId: id,
      side: direction,
      qty,
      placedTick: state.tick,
    });
    return { ok: true, message: 'Orden registrada: se abrirá al precio de las 18:00' };
  }
  return openMargin(ctxOf(state), inst, direction, qty);
}

export function closeLeveraged(state: SimState, id: string): CatalogResult {
  const inst = findInstrument(state, id);
  if (!inst) return { ok: false, message: 'Instrumento desconocido' };
  if (!state.inv.positions[id]) return { ok: false, message: 'No hay posición abierta' };
  if (rulesOf(inst.cls).execution === 'close') {
    state.inv.orders.push({
      id: state.nextId++,
      instId: id,
      side: 'close',
      qty: 0,
      placedTick: state.tick,
    });
    return { ok: true, message: 'Orden registrada: se cerrará al precio de las 18:00' };
  }
  return closeMargin(ctxOf(state), inst, 'Cierre de posición');
}

// ---------------------------------------------------------------------------
// Investigación
// ---------------------------------------------------------------------------

export function researchCost(
  inst: Instrument,
  level: number,
): { cost: number; days: number } | null {
  const rules = rulesOf(inst.cls);
  if (!rules.research || level < 1 || level > 3) return null;
  const r = rules.research(inst);
  return { cost: r.costs[level - 1]!, days: r.days[level - 1]! };
}

export function startResearch(state: SimState, id: string): CatalogResult {
  const inst = findInstrument(state, id);
  if (!inst) return { ok: false, message: 'Instrumento desconocido' };
  const current = state.inv.research[id] ?? 0;
  if (state.inv.researchQueue.some((j) => j.id === id))
    return { ok: false, message: 'Ya hay un análisis en curso' };
  const next = current + 1;
  const rc = researchCost(inst, next);
  if (!rc) return { ok: false, message: 'No hay más que investigar' };
  const cost = toCents(rc.cost);
  if (!ensureCash(state, cost)) return { ok: false, message: 'Saldo insuficiente' };
  transfer(
    state.ledger,
    state.tick,
    'player:cash',
    'world',
    cost,
    `Análisis nivel ${next}: ${inst.name}`.slice(0, 70),
  );
  state.inv.researchQueue.push({
    id,
    level: next,
    readyTick: state.tick + rc.days * HOURS_PER_DAY,
  });
  discoverConcept(state, 'informacion_oculta');
  return { ok: true, message: `Encargado. Resultados en ${rc.days} días.` };
}

// ---------------------------------------------------------------------------
// Pasos de simulación
// ---------------------------------------------------------------------------

/** 18:00 de cada día: factores, precios, órdenes, margen, investigación y ventas. */
export function investmentsDaily(state: SimState, trading: boolean): void {
  const inv = state.inv;
  const ctx = ctxOf(state);
  updateFactorsDaily(state, inv, trading);
  const d = dateFromTick(state.tick);
  const weekly = d.weekday === 4;
  for (const inst of dailyInstruments(inv.instruments)) {
    if (inst.status !== 'open') continue;
    const rules = rulesOf(inst.cls);
    // Las opciones solo se revalorizan si alguien las tiene (o al consultarlas).
    if (inst.cls === 'option') {
      if (inv.positions[inst.id]) reprice(ctx, inst);
      continue;
    }
    if (!rules.reprice && (trading || inst.cls === 'crypto'))
      stepIdio(inst, inst.cls === 'crypto' ? 1 / 365 : 1 / 252, ctx.rng);
    reprice(ctx, inst);
    if (weekly) pushHist(inst);
  }
  executeOrders(state);
  marginDaily(ctx);
  // Investigación terminada.
  const done = inv.researchQueue.filter((j) => j.readyTick <= state.tick);
  if (done.length) {
    inv.researchQueue = inv.researchQueue.filter((j) => j.readyTick > state.tick);
    for (const j of done) {
      inv.research[j.id] = Math.max(inv.research[j.id] ?? 0, j.level);
      const inst = findInstrument(state, j.id);
      state.outbox.push({
        type: 'warning',
        tick: state.tick,
        message: `Análisis completado: ${inst?.name ?? j.id} (nivel ${j.level})`,
        ref: j.id,
      });
    }
  }
  // Ventas anunciadas y subastas.
  for (const [id, pos] of Object.entries(inv.positions)) {
    if (!pos.selling || pos.selling.readyTick > state.tick) continue;
    const inst = findInstrument(state, id);
    if (!inst) continue;
    if (pos.selling.mode === 'listing') {
      const achieved = inst.price * Math.exp(ctx.rng.gauss() * 0.06 - 0.02);
      executeSell(state, inst, pos.qty, 'normal', achieved);
    } else if (pos.selling.mode === 'auction') {
      runAuctionSale(ctx, inst, pos);
    }
  }
}

const dailyLists = new WeakMap<Instrument[], { n: number; list: Instrument[] }>();

/** Instrumentos de revalorización diaria (caché que se rehace cuando cambia el catálogo). */
function dailyInstruments(all: Instrument[]): Instrument[] {
  const c = dailyLists.get(all);
  if (c && c.n === all.length) return c.list;
  const list = all.filter((i) => rulesOf(i.cls).cadence === 'daily');
  dailyLists.set(all, { n: all.length, list });
  return list;
}

function pushHist(inst: Instrument): void {
  inst.hist.push(inst.price);
  if (inst.hist.length > 260) inst.hist.splice(0, inst.hist.length - 260);
}

function executeOrders(state: SimState): void {
  const orders = state.inv.orders;
  if (!orders.length) return;
  state.inv.orders = [];
  for (const o of orders) {
    const inst = findInstrument(state, o.instId);
    if (!inst) continue;
    const ctx = ctxOf(state);
    const r =
      o.side === 'buy'
        ? executeBuy(state, inst, o.qty, o.mortgage)
        : o.side === 'sell'
          ? executeSell(state, inst, o.qty, 'normal')
          : o.side === 'close'
            ? closeMargin(ctx, inst, 'Cierre de posición')
            : openMargin(ctx, inst, o.side, o.qty);
    if (!r.ok)
      state.outbox.push({
        type: 'warning',
        tick: state.tick,
        message: `Orden rechazada (${inst.name}): ${r.message}`,
        ref: inst.id,
      });
  }
}

function runAuctionSale(ctx: Ctx, inst: Instrument, pos: Position): void {
  const { state, rng } = ctx;
  const authentic = inst.hidden['authentic'];
  if (authentic === false) {
    // La casa de subastas autentica la pieza: es falsa.
    delete pos.selling;
    inst.hidden['authentic'] = false;
    inst.attrs['fake'] = true;
    inst.base *= 0.05;
    inst.price *= 0.05;
    publishNews(state, {
      category: 'corporate',
      headline: `La casa de subastas retira "${inst.name}": el peritaje concluye que es una falsificación`,
      body: 'La pieza vuelve a su propietario. Su valor de mercado se desploma.',
      tags: [inst.id],
      tone: -0.8,
      importance: 1,
    });
    discoverConcept(state, 'falsificacion');
    return;
  }
  if (rng.chance(0.12)) {
    delete pos.selling;
    state.outbox.push({
      type: 'warning',
      tick: state.tick,
      message: `Subasta desierta: "${inst.name}" no alcanzó el precio de salida`,
      ref: inst.id,
    });
    return;
  }
  const hammer = inst.price * Math.exp(rng.gauss() * 0.22 - 0.02);
  executeSell(state, inst, pos.qty, 'normal', hammer);
  if (hammer > inst.price * 1.3) {
    publishNews(state, {
      category: 'corporate',
      headline: `Martillazo: "${inst.name}" se adjudica por ${esNum(hammer * fxOf(state, inst.ccy), 0)} ₳, muy por encima de su estimación`,
      body: 'La sala aplaudió la puja final. Los coleccionistas hablan de un nuevo récord.',
      tags: [inst.id],
      tone: 0.5,
      importance: 1,
    });
  }
}

/** Sábado: nuevas oportunidades y limpieza del catálogo. */
export function investmentsWeekly(state: SimState): void {
  const ctx = ctxOf(state);
  const inv = state.inv;
  for (const rules of Object.values(CLASS_RULES)) {
    if (!rules.spawnWeekly) continue;
    for (const inst of rules.spawnWeekly(ctx)) inv.instruments.push(inst);
  }
  // Oportunidades caducadas o activos muertos que nadie tiene.
  const keep: Instrument[] = [];
  for (const inst of inv.instruments) {
    const held = !!inv.positions[inst.id];
    const expired = inst.expires !== undefined && inst.expires < state.tick && !held;
    const dead =
      inst.status !== 'open' &&
      !held &&
      state.tick - Number(inst.attrs['closedTick'] ?? inst.born) > 30 * HOURS_PER_DAY;
    if (expired || dead) {
      delete inv.research[inst.id];
      continue;
    }
    keep.push(inst);
  }
  if (keep.length !== inv.instruments.length) inv.instruments = keep;
}

/** Día 1 de cada mes: inmuebles, lujo, capital riesgo, rentas y eventos. */
export function investmentsMonthly(state: SimState): void {
  const inv = state.inv;
  updateFactorsMonthly(state, inv);
  const ctx = ctxOf(state);
  maybeExchangeHack(ctx);
  weatherNews(ctx);
  // Hipotecas con tres cuotas impagadas: ejecución.
  for (const loan of [...state.player.loans])
    if (loan.kind === 'mortgage' && loan.missedPayments >= 3) foreclose(state, loan);
  for (const inst of inv.instruments) {
    const rules = rulesOf(inst.cls);
    const pos = inv.positions[inst.id];
    if (rules.cadence === 'monthly' && inst.status === 'open') {
      stepIdio(inst, 1 / 12, ctx.rng);
      reprice(ctx, inst);
      pushHist(inst);
    }
    if (rules.monthly && (inst.status === 'open' || pos)) rules.monthly(ctx, inst, pos);
  }
}

/** 1 de enero: deducciones de planes de pensiones y donativos. */
export function investmentsYearly(state: SimState): void {
  const inv = state.inv;
  const pension = Math.min(inv.pensionYtd, 150_000);
  const pensionRefund = Math.round(pension * 0.2);
  const d = inv.donationsYtd;
  const donationRefund = Math.round(Math.min(d, 25_000) * 0.8 + Math.max(0, d - 25_000) * 0.35);
  const refund = pensionRefund + donationRefund;
  if (refund > 0) {
    transfer(
      state.ledger,
      state.tick,
      'gov',
      'player:cash',
      refund,
      'Devolución de Hacienda (planes de pensiones y donativos)',
    );
    state.outbox.push({
      type: 'dividend',
      tick: state.tick,
      message: `Hacienda te devuelve ${esNum(fromCents(refund))} ₳ por deducciones`,
      ref: 'tax',
    });
    discoverConcept(state, 'deducciones');
  }
  inv.pensionYtd = 0;
  inv.donationsYtd = 0;
}

/** Préstamos hipotecarios impagados: el banco ejecuta la garantía. */
export function foreclose(state: SimState, loan: Loan): void {
  if (!loan.collateral) return;
  const inst = findInstrument(state, loan.collateral);
  const pos = inst ? state.inv.positions[inst.id] : undefined;
  if (!inst || !pos) return;
  const proceeds = toCents(inst.price * 0.7 * fxOf(state, inst.ccy));
  transfer(
    state.ledger,
    state.tick,
    'world',
    'player:cash',
    proceeds,
    `Subasta judicial ${inst.name}`.slice(0, 70),
  );
  state.player.tax.realizedGainsYtd += proceeds - pos.cost;
  delete state.inv.positions[inst.id];
  const pay = Math.min(loan.outstanding, Math.max(0, state.ledger.balances['player:cash']));
  if (pay > 0)
    transfer(
      state.ledger,
      state.tick,
      'player:cash',
      'bank',
      pay,
      `Ejecución hipotecaria #${loan.id}`,
    );
  loan.outstanding -= pay;
  if (loan.outstanding <= 0)
    state.player.loans = state.player.loans.filter((l) => l.id !== loan.id);
  else loan.collateral = undefined;
  state.player.creditScore = Math.max(300, state.player.creditScore - 120);
  state.outbox.push({
    type: 'warning',
    tick: state.tick,
    message: `El banco ejecuta la hipoteca y subasta ${inst.name}`,
  });
}
