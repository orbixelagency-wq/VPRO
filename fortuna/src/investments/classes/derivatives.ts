/**
 * Derivados: opciones (solo compra, pérdida limitada a la prima) y productos con margen
 * (futuros, CFD y divisas apalancadas) con liquidación diaria, financiación, llamadas de
 * margen y cierre forzoso. Bloqueados hasta superar el test de conveniencia.
 */
import { COMMODITIES } from '../../data/commodities';
import { COUNTRIES, HOME_COUNTRY_ID } from '../../data/countries';
import { dateFromTick, HOURS_PER_DAY, isMarketOpen, tickFromDate } from '../../economy/calendar';
import { fromCents, toCents, transfer, type Cents } from '../../economy/ledger';
import { esNum } from '../../economy/news';
import { discoverConcept } from '../../economy/notebook';
import { netWorth } from '../../economy/portfolio';
import type { SimState } from '../../economy/types';
import { dailyVol, homeCountry, marketCapAur, sectorDef } from '../../economy/valuation';
import { companyOf, fxOf, makeInstrument, type Ctx } from '../helpers';
import type { ClassRules } from '../rules';
import type { AssetClassId, Instrument, Position } from '../types';

const DERIVATIVES_MIN_NET_WORTH = 5_000;

export function derivativesLock(state: SimState): string | null {
  if (!state.inv.unlocks.derivatives) return 'Debes superar el test de conveniencia de derivados';
  if (netWorth(state) < toCents(DERIVATIVES_MIN_NET_WORTH))
    return `Necesitas un patrimonio de al menos ${esNum(DERIVATIVES_MIN_NET_WORTH, 0)} ₳`;
  return null;
}

export function isMarginClass(cls: AssetClassId): boolean {
  return cls === 'future' || cls === 'cfd';
}

// ---------------------------------------------------------------------------
// Opciones
// ---------------------------------------------------------------------------

function normCdf(x: number): number {
  // Aproximación de Abramowitz-Stegun (error < 7,5e-8).
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  const p =
    d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  return x > 0 ? 1 - p : p;
}

export function blackScholes(
  type: 'call' | 'put',
  S: number,
  K: number,
  T: number,
  r: number,
  sigma: number,
): number {
  if (T <= 0) return Math.max(0, type === 'call' ? S - K : K - S);
  const sq = sigma * Math.sqrt(T);
  const d1 = (Math.log(S / K) + (r + (sigma * sigma) / 2) * T) / sq;
  const d2 = d1 - sq;
  return type === 'call'
    ? S * normCdf(d1) - K * Math.exp(-r * T) * normCdf(d2)
    : K * Math.exp(-r * T) * normCdf(-d2) - S * normCdf(-d1);
}

function underlyingPrice(state: SimState, ref: string): number | null {
  if (ref === 'AUR20') return state.indices.find((i) => i.id === 'AUR20')?.value ?? null;
  if (ref === 'GLOBAL') return state.indices.find((i) => i.id === 'GLOBAL')?.value ?? null;
  if (ref.startsWith('cmd:')) return state.inv.commodities[ref.slice(4)]?.price ?? null;
  if (ref.startsWith('fx:')) {
    const [a, b] = ref.slice(3).split('/');
    const fa = state.countries.find((c) => c.id === a)?.fx;
    const fb = state.countries.find((c) => c.id === b)?.fx;
    return fa && fb ? fa / fb : null;
  }
  const c = companyOf(state, ref);
  if (!c || c.status !== 'listed') return null;
  return c.price;
}

function underlyingVol(state: SimState, ref: string): number {
  if (ref === 'AUR20' || ref === 'GLOBAL') return (state.global.fear / 100) * 0.75;
  const c = companyOf(state, ref);
  return c ? dailyVol(state, c) * Math.sqrt(252) * 1.1 : 0.3;
}

const OPTION_EXPIRIES = 5;

function thirdFriday(year: number, month: number): number {
  const first = tickFromDate(year, month, 1, 17);
  const wd = dateFromTick(first).weekday;
  const offset = (4 - wd + 7) % 7;
  return first + (offset + 14) * HOURS_PER_DAY;
}

function optionUnderlyings(state: SimState): { id: string; name: string; ccy: string }[] {
  const listed = state.companies.filter((c) => c.status === 'listed');
  listed.sort((a, b) => marketCapAur(state, b) - marketCapAur(state, a));
  return [
    { id: 'AUR20', name: 'Áureo 20', ccy: HOME_COUNTRY_ID },
    ...listed.slice(0, 25).map((c) => ({ id: c.id, name: c.name, ccy: c.country })),
  ];
}

function createSeries(ctx: Ctx, expiry: number): Instrument[] {
  const out: Instrument[] = [];
  const d = dateFromTick(expiry);
  const label = `${String(d.day).padStart(2, '0')}/${String(d.month + 1).padStart(2, '0')}/${String(d.year).slice(2)}`;
  for (const u of optionUnderlyings(ctx.state)) {
    const S = underlyingPrice(ctx.state, u.id);
    if (!S) continue;
    const step = S > 5000 ? 250 : S > 500 ? 25 : S > 100 ? 5 : S > 20 ? 1 : 0.5;
    const atm = Math.round(S / step) * step;
    for (const k of [-2, -1, 0, 1, 2]) {
      const strike = Math.max(step, atm + k * step * (S > 20 ? 2 : 1));
      for (const type of ['call', 'put'] as const) {
        const inst = makeInstrument(ctx, {
          cls: 'option',
          sub: type,
          name: `${type === 'call' ? 'Call' : 'Put'} ${u.name} ${esNum(strike, strike < 10 ? 1 : 0)} · ${label}`,
          region: u.ccy,
          ccy: u.ccy,
          price: 0.01,
          lot: 1,
          attrs: { underlying: u.id, type, strike, expiry, multiplier: 10, underlyingName: u.name },
        });
        out.push(inst);
      }
    }
  }
  for (const o of out) repriceOption(ctx, o);
  return out;
}

function repriceOption(ctx: Ctx, inst: Instrument): void {
  const S = underlyingPrice(ctx.state, String(inst.attrs['underlying']));
  if (S === null) return;
  const T = Math.max(0, (Number(inst.attrs['expiry']) - ctx.state.tick) / (365 * HOURS_PER_DAY));
  const r = homeCountry(ctx.state).policyRate;
  const sigma = underlyingVol(ctx.state, String(inst.attrs['underlying']));
  // Precio por contrato (10 títulos): prima × multiplicador.
  const premium = Math.max(
    0.005,
    blackScholes(inst.sub as 'call' | 'put', S, Number(inst.attrs['strike']), T, r, sigma),
  );
  inst.price = premium * Number(inst.attrs['multiplier'] ?? 10);
  inst.attrs['premium'] = premium;
  inst.attrs['spot'] = S;
  inst.attrs['iv'] = sigma;
}

export const optionRules: ClassRules = {
  id: 'option',
  cadence: 'daily',
  liquidity: 'instant',
  counterparty: 'market',
  // El precio de cada instrumento es por contrato (prima × 10 títulos).
  fees: { spread: 0.06, buy: 0.01, sell: 0.01, min: 3 },
  execution: 'live',
  exchangeHours: true,
  unlock: derivativesLock,
  generate(ctx) {
    const out: Instrument[] = [];
    const d = dateFromTick(ctx.state.tick);
    for (let k = 0; k < OPTION_EXPIRIES; k++) {
      const m = (d.month + k) % 12;
      const y = d.year + Math.floor((d.month + k) / 12);
      const exp = thirdFriday(y, m);
      if (exp <= ctx.state.tick) continue;
      out.push(...createSeries(ctx, exp));
    }
    return out;
  },
  reprice(ctx, inst) {
    repriceOption(ctx, inst);
  },
  monthly(ctx, inst, pos) {
    // Vencimiento: se liquida por diferencias y la serie se cierra.
    if (inst.status !== 'open' || Number(inst.attrs['expiry']) > ctx.state.tick) return;
    settleOption(ctx, inst, pos);
  },
  spawnWeekly(ctx) {
    // Serie nueva a 5 meses cuando la más próxima vence.
    const { state, inv } = ctx;
    for (const inst of inv.instruments) {
      if (
        inst.cls === 'option' &&
        inst.status === 'open' &&
        Number(inst.attrs['expiry']) <= state.tick
      )
        settleOption(ctx, inst, inv.positions[inst.id]);
    }
    const expiries = new Set(
      inv.instruments
        .filter((i) => i.cls === 'option' && i.status === 'open')
        .map((i) => Number(i.attrs['expiry'])),
    );
    if (expiries.size >= OPTION_EXPIRIES) return [];
    const d = dateFromTick(state.tick);
    const out: Instrument[] = [];
    for (let k = 0; k <= OPTION_EXPIRIES; k++) {
      const m = (d.month + k) % 12;
      const y = d.year + Math.floor((d.month + k) / 12);
      const exp = thirdFriday(y, m);
      if (
        exp > state.tick + 7 * HOURS_PER_DAY &&
        !expiries.has(exp) &&
        expiries.size + (out.length ? 1 : 0) < OPTION_EXPIRIES
      ) {
        out.push(...createSeries(ctx, exp));
        expiries.add(exp);
      }
    }
    return out;
  },
};

function settleOption(ctx: Ctx, inst: Instrument, pos: Position | undefined): void {
  const { state } = ctx;
  const S =
    underlyingPrice(state, String(inst.attrs['underlying'])) ?? Number(inst.attrs['spot'] ?? 0);
  const K = Number(inst.attrs['strike']);
  const intrinsic = Math.max(0, inst.sub === 'call' ? S - K : K - S);
  inst.price = intrinsic * Number(inst.attrs['multiplier']);
  inst.status = 'expired';
  inst.attrs['closedTick'] = state.tick;
  if (!pos) return;
  const payout = toCents(inst.price * pos.qty * fxOf(state, inst.ccy));
  if (payout > 0)
    transfer(
      state.ledger,
      state.tick,
      'market',
      'player:cash',
      payout,
      `Liquidación ${inst.name}`.slice(0, 70),
    );
  state.player.tax.realizedGainsYtd += payout - pos.cost;
  delete state.inv.positions[inst.id];
  state.outbox.push({
    type: payout > 0 ? 'dividend' : 'warning',
    tick: state.tick,
    message:
      payout > 0
        ? `${inst.name} vence dentro del dinero: cobras ${esNum(fromCents(payout))} ₳`
        : `${inst.name} vence sin valor`,
    ref: inst.id,
  });
  discoverConcept(state, 'opciones');
}

// ---------------------------------------------------------------------------
// Futuros, CFD y divisas con margen
// ---------------------------------------------------------------------------

interface MarginSpec {
  ref: string;
  multiplier: number;
  margin: number;
  /** Financiación anual sobre el nominal (CFD) por encima del tipo oficial. */
  financing: number;
  /** Coste mensual de renovación (futuros sobre materias primas). */
  roll: number;
}

function spec(inst: Instrument): MarginSpec {
  return {
    ref: String(inst.attrs['underlying']),
    multiplier: Number(inst.attrs['multiplier'] ?? 1),
    margin: Number(inst.attrs['marginPct'] ?? 0.1),
    financing: Number(inst.attrs['financing'] ?? 0),
    roll: Number(inst.attrs['roll'] ?? 0),
  };
}

/** Fija el precio inicial real (los instrumentos se crean con un precio provisional). */
function anchorMargin(ctx: Ctx, inst: Instrument): void {
  repriceMargin(ctx, inst);
  inst.base = inst.price;
  inst.hist = [inst.price];
}

function repriceMargin(ctx: Ctx, inst: Instrument): void {
  const p = underlyingPrice(ctx.state, spec(inst).ref);
  if (p === null) {
    if (inst.status === 'open') {
      inst.status = 'closed';
      inst.attrs['closedTick'] = ctx.state.tick;
    }
    return;
  }
  inst.price = p;
}

export const futureRules: ClassRules = {
  id: 'future',
  cadence: 'daily',
  liquidity: 'instant',
  counterparty: 'market',
  fees: { spread: 0.0008, buy: 0.0002, sell: 0.0002, min: 4 },
  execution: 'close',
  unlock: derivativesLock,
  generate(ctx) {
    const out: Instrument[] = [];
    for (const cd of COMMODITIES) {
      out.push(
        makeInstrument(ctx, {
          cls: 'future',
          sub: 'materia prima',
          name: `Futuro ${cd.name}`,
          region: 'columbria',
          ccy: 'columbria',
          price: cd.price,
          attrs: {
            underlying: `cmd:${cd.id}`,
            multiplier: cd.price > 1000 ? 1 : cd.price > 50 ? 10 : 100,
            marginPct: 0.1,
            roll: 0.003,
            unit: cd.unit,
          },
        }),
      );
    }
    for (const [id, name] of [
      ['AUR20', 'Mini Áureo 20'],
      ['GLOBAL', 'Mini Fortuna Global'],
    ] as const) {
      out.push(
        makeInstrument(ctx, {
          cls: 'future',
          sub: 'índice',
          name: `Futuro ${name}`,
          region: HOME_COUNTRY_ID,
          price: 1,
          attrs: { underlying: id, multiplier: 1, marginPct: 0.08, roll: 0.0005 },
        }),
      );
    }
    for (const c of COUNTRIES) {
      if (c.id === HOME_COUNTRY_ID) continue;
      out.push(
        makeInstrument(ctx, {
          cls: 'future',
          sub: 'divisa',
          name: `Futuro ${c.currency.code}/AUR`,
          region: c.id,
          price: 1,
          attrs: {
            underlying: `fx:${c.id}/${HOME_COUNTRY_ID}`,
            multiplier: 10_000,
            marginPct: 0.04,
            roll: 0.0003,
          },
        }),
      );
    }
    for (const i of out) anchorMargin(ctx, i);
    return out;
  },
  reprice: repriceMargin,
};

export const cfdRules: ClassRules = {
  id: 'cfd',
  cadence: 'daily',
  liquidity: 'instant',
  counterparty: 'market',
  fees: { spread: 0.002, buy: 0.001, sell: 0.001, min: 3 },
  execution: 'live',
  exchangeHours: true,
  unlock: derivativesLock,
  generate(ctx) {
    const out: Instrument[] = [];
    for (const c of ctx.state.companies.filter((x) => x.status === 'listed')) {
      out.push(
        makeInstrument(ctx, {
          cls: 'cfd',
          sub: 'acción',
          name: `CFD ${c.name}`,
          region: c.country,
          ccy: c.country,
          price: c.price,
          attrs: {
            underlying: c.id,
            multiplier: 1,
            marginPct: 0.2,
            financing: 0.03,
            sector: sectorDef(c.sector).name,
          },
        }),
      );
    }
    for (const [id, name] of [
      ['AUR20', 'Áureo 20'],
      ['GLOBAL', 'Fortuna Global'],
    ] as const) {
      out.push(
        makeInstrument(ctx, {
          cls: 'cfd',
          sub: 'índice',
          name: `CFD ${name}`,
          region: HOME_COUNTRY_ID,
          price: 1,
          attrs: { underlying: id, multiplier: 1, marginPct: 0.05, financing: 0.025 },
        }),
      );
    }
    // Divisas cruzadas con apalancamiento 30:1 (el "forex" de los anuncios).
    const others = COUNTRIES.filter((c) => c.id !== HOME_COUNTRY_ID);
    for (let a = 0; a < others.length; a++) {
      for (let b = a + 1; b < others.length; b++) {
        const A = others[a]!;
        const B = others[b]!;
        out.push(
          makeInstrument(ctx, {
            cls: 'cfd',
            sub: 'divisa',
            name: `${A.currency.code}/${B.currency.code} apalancado`,
            region: B.id,
            ccy: B.id,
            price: 1,
            attrs: {
              underlying: `fx:${A.id}/${B.id}`,
              multiplier: 10_000,
              marginPct: 1 / 30,
              financing: 0.01,
            },
          }),
        );
      }
    }
    for (const i of out) anchorMargin(ctx, i);
    return out;
  },
  spawnWeekly(ctx) {
    // Nuevas cotizadas: nuevos CFD.
    const existing = new Set(
      ctx.inv.instruments.filter((i) => i.cls === 'cfd').map((i) => String(i.attrs['underlying'])),
    );
    const out: Instrument[] = [];
    for (const c of ctx.state.companies) {
      if (c.status !== 'listed' || existing.has(c.id)) continue;
      const i = makeInstrument(ctx, {
        cls: 'cfd',
        sub: 'acción',
        name: `CFD ${c.name}`,
        region: c.country,
        ccy: c.country,
        price: c.price,
        attrs: {
          underlying: c.id,
          multiplier: 1,
          marginPct: 0.25,
          financing: 0.03,
          sector: sectorDef(c.sector).name,
        },
      });
      anchorMargin(ctx, i);
      out.push(i);
    }
    return out;
  },
  reprice: repriceMargin,
};

/** Garantía exigida para una posición a precio actual. */
function requiredMargin(state: SimState, inst: Instrument, qty: number): Cents {
  const s = spec(inst);
  return toCents(Math.abs(qty) * inst.price * s.multiplier * s.margin * fxOf(state, inst.ccy));
}

export function unrealizedMargin(state: SimState, inst: Instrument, pos: Position): Cents {
  const s = spec(inst);
  return toCents(
    pos.qty * (inst.price - (pos.mark ?? inst.price)) * s.multiplier * fxOf(state, inst.ccy),
  );
}

export function openMargin(ctx: Ctx, inst: Instrument, direction: 'long' | 'short', qty: number) {
  const { state } = ctx;
  const rules = inst.cls === 'future' ? futureRules : cfdRules;
  if (!Number.isInteger(qty) || qty <= 0) return { ok: false, message: 'Cantidad no válida' };
  if (inst.status !== 'open') return { ok: false, message: 'No disponible' };
  if (rules.exchangeHours && !isMarketOpen(state.tick))
    return { ok: false, message: 'Solo se opera con la bolsa abierta' };
  if (state.inv.positions[inst.id])
    return { ok: false, message: 'Ya tienes una posición abierta: ciérrala primero' };
  const reprice = rules.reprice!;
  reprice(ctx, inst);
  const s = spec(inst);
  const signed = direction === 'long' ? qty : -qty;
  const margin = requiredMargin(state, inst, signed);
  const notional = toCents(qty * inst.price * s.multiplier * fxOf(state, inst.ccy));
  const fee = Math.max(
    toCents(rules.fees.min),
    Math.round(notional * (rules.fees.buy + rules.fees.spread / 2)),
  );
  if (state.ledger.balances['player:cash'] < margin + fee && !state.settings.sandbox)
    return {
      ok: false,
      message: `Necesitas ${esNum(fromCents(margin + fee))} ₳ de garantía y comisiones`,
    };
  if (state.settings.sandbox && state.ledger.balances['player:cash'] < margin + fee)
    transfer(
      state.ledger,
      state.tick,
      'world',
      'player:cash',
      margin + fee - state.ledger.balances['player:cash'],
      'Crédito sandbox',
    );
  transfer(
    state.ledger,
    state.tick,
    'player:cash',
    'player:margin',
    margin,
    `Garantía ${inst.name}`.slice(0, 70),
  );
  transfer(
    state.ledger,
    state.tick,
    'player:cash',
    'broker',
    fee,
    `Comisión ${inst.name}`.slice(0, 70),
  );
  state.inv.positions[inst.id] = {
    qty: signed,
    cost: fee,
    opened: state.tick,
    margin,
    mark: inst.price,
    pnl: -fee,
  };
  state.outbox.push({
    type: 'trade',
    tick: state.tick,
    message: `${direction === 'long' ? 'Largo' : 'Corto'} ${qty} × ${inst.name} (apalancamiento ${esNum(1 / s.margin, 0)}x)`,
    ref: inst.id,
  });
  discoverConcept(state, 'prestamo');
  discoverConcept(state, 'margen');
  return { ok: true, message: `Posición abierta con ${esNum(fromCents(margin))} ₳ de garantía` };
}

/** Liquida la variación de precio de una posición entre la garantía y el mercado. */
function settle(state: SimState, inst: Instrument, pos: Position): void {
  const pnl = unrealizedMargin(state, inst, pos);
  if (pnl > 0)
    transfer(
      state.ledger,
      state.tick,
      'market',
      'player:margin',
      pnl,
      `Liquidación diaria ${inst.name}`.slice(0, 70),
    );
  else if (pnl < 0) moveFromMargin(state, pos, -pnl, 'market', `Liquidación diaria ${inst.name}`);
  pos.margin = (pos.margin ?? 0) + pnl;
  pos.pnl = (pos.pnl ?? 0) + pnl;
  pos.mark = inst.price;
}

/** Paga desde la garantía de la posición; si no alcanza, el resto sale de la cuenta corriente. */
function moveFromMargin(
  state: SimState,
  pos: Position,
  amount: Cents,
  to: 'market' | 'broker',
  memo: string,
): void {
  const available = Math.max(0, pos.margin ?? 0);
  const fromMargin = Math.min(available, amount);
  if (fromMargin > 0)
    transfer(state.ledger, state.tick, 'player:margin', to, fromMargin, memo.slice(0, 70));
  const rest = amount - fromMargin;
  if (rest > 0) {
    transfer(state.ledger, state.tick, 'player:cash', to, rest, `${memo} (déficit)`.slice(0, 70));
    // El déficit no sale de la garantía: se compensa para que la cuenta de margen cuadre.
    pos.margin = (pos.margin ?? 0) + rest;
  }
}

export function closeMargin(ctx: Ctx, inst: Instrument, reason: string) {
  const { state } = ctx;
  const pos = state.inv.positions[inst.id];
  if (!pos || !isMarginClass(inst.cls)) return { ok: false, message: 'No hay posición abierta' };
  const rules = inst.cls === 'future' ? futureRules : cfdRules;
  if (reason === 'Cierre de posición' && rules.exchangeHours && !isMarketOpen(state.tick))
    return { ok: false, message: 'Solo se opera con la bolsa abierta' };
  rules.reprice!(ctx, inst);
  settle(state, inst, pos);
  const s = spec(inst);
  const notional = toCents(Math.abs(pos.qty) * inst.price * s.multiplier * fxOf(state, inst.ccy));
  const fee = Math.max(
    toCents(rules.fees.min),
    Math.round(notional * (rules.fees.sell + rules.fees.spread / 2)),
  );
  moveFromMargin(state, pos, fee, 'broker', `Comisión cierre ${inst.name}`);
  pos.margin = (pos.margin ?? 0) - Math.min(fee, pos.margin ?? 0);
  pos.pnl = (pos.pnl ?? 0) - fee;
  const back = Math.max(0, pos.margin ?? 0);
  if (back > 0)
    transfer(
      state.ledger,
      state.tick,
      'player:margin',
      'player:cash',
      back,
      `Devolución garantía ${inst.name}`.slice(0, 70),
    );
  state.player.tax.realizedGainsYtd += pos.pnl ?? 0;
  delete state.inv.positions[inst.id];
  state.outbox.push({
    type: 'trade',
    tick: state.tick,
    message: `${reason}: ${inst.name} · resultado ${esNum(fromCents(pos.pnl ?? 0))} ₳`,
    ref: inst.id,
  });
  return { ok: true, message: `Posición cerrada. Resultado: ${esNum(fromCents(pos.pnl ?? 0))} ₳` };
}

/** 18:00: liquidación diaria, financiación, costes de renovación y llamadas de margen. */
export function marginDaily(ctx: Ctx): void {
  const { state } = ctx;
  const rate = homeCountry(state).policyRate;
  const day = dateFromTick(state.tick);
  for (const [id, pos] of Object.entries(state.inv.positions)) {
    const inst = state.inv.instruments.find((i) => i.id === id);
    if (!inst || !isMarginClass(inst.cls)) continue;
    const rules = inst.cls === 'future' ? futureRules : cfdRules;
    rules.reprice!(ctx, inst);
    if (inst.status !== 'open') {
      closeMargin(ctx, inst, 'Cierre forzoso (el subyacente ha dejado de cotizar)');
      continue;
    }
    settle(state, inst, pos);
    const s = spec(inst);
    const notional = toCents(Math.abs(pos.qty) * inst.price * s.multiplier * fxOf(state, inst.ccy));
    let carry = 0;
    if (s.financing > 0) carry += Math.round((notional * (Math.max(0, rate) + s.financing)) / 365);
    if (s.roll > 0 && day.day === 1) carry += Math.round(notional * s.roll);
    if (carry > 0) {
      moveFromMargin(state, pos, carry, 'broker', `Financiación ${inst.name}`);
      pos.margin = (pos.margin ?? 0) - Math.min(carry, pos.margin ?? 0);
      pos.pnl = (pos.pnl ?? 0) - carry;
    }
    const required = requiredMargin(state, inst, pos.qty);
    if ((pos.margin ?? 0) < required * 0.5) {
      const topUp = required - (pos.margin ?? 0);
      if (state.ledger.balances['player:cash'] >= topUp) {
        transfer(
          state.ledger,
          state.tick,
          'player:cash',
          'player:margin',
          topUp,
          `Llamada de margen ${inst.name}`.slice(0, 70),
        );
        pos.margin = (pos.margin ?? 0) + topUp;
        state.outbox.push({
          type: 'warning',
          tick: state.tick,
          message: `Llamada de margen: repones ${esNum(fromCents(topUp))} ₳ en ${inst.name}`,
          ref: inst.id,
        });
      } else {
        closeMargin(ctx, inst, 'Liquidación forzosa por falta de garantías');
        state.outbox.push({
          type: 'warning',
          tick: state.tick,
          message: `El bróker cierra tu posición en ${inst.name}: no tenías garantías suficientes`,
          ref: inst.id,
        });
      }
      discoverConcept(state, 'margen');
    }
  }
}
