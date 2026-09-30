import { HOURS_PER_DAY } from '../economy/calendar';
import { findCompany } from '../economy/generate';
import { transfer, type AccountId, type Cents } from '../economy/ledger';
import { hashString, Rng } from '../economy/rng';
import type { Company, SimState } from '../economy/types';
import { getCountry } from '../economy/valuation';
import type { AssetClassId, Instrument, InvestmentsState, Position } from './types';

export interface Ctx {
  state: SimState;
  inv: InvestmentsState;
  rng: Rng;
}

export function ctxOf(state: SimState): Ctx {
  return { state, inv: state.inv, rng: new Rng(state.inv.rng) };
}

const PREFIX: Record<AssetClassId, string> = {
  etf: 'ETF',
  fund: 'FND',
  pension: 'PPL',
  insurance: 'SEG',
  crypto: 'CRY',
  commodity: 'CMD',
  forex: 'FX',
  option: 'OPC',
  future: 'FUT',
  cfd: 'CFD',
  realestate: 'INM',
  distressed: 'EMB',
  business: 'NEG',
  franchise: 'FRA',
  startup: 'STA',
  farmland: 'AGR',
  energy: 'ENE',
  collectible: 'COL',
  entertainment: 'ENT',
  p2p: 'P2P',
  philanthropy: 'FIL',
};

export interface InstrumentSpec {
  cls: AssetClassId;
  sub: string;
  name: string;
  region: string;
  ccy?: string;
  price: number;
  load?: Record<string, number>;
  vol?: number;
  drift?: number;
  yield?: number;
  unique?: boolean;
  lot?: number;
  expiresInDays?: number;
  attrs?: Instrument['attrs'];
  hidden?: Instrument['hidden'];
  id?: string;
}

/** Crea un instrumento anclado a los factores actuales. */
export function makeInstrument(ctx: Ctx, spec: InstrumentSpec): Instrument {
  const { inv, state } = ctx;
  const load = spec.load ?? {};
  const f0: Record<string, number> = {};
  for (const k of Object.keys(load)) f0[k] = inv.factors[k] ?? 0;
  inv.serial++;
  return {
    id: spec.id ?? `${PREFIX[spec.cls]}-${inv.serial.toString(36).toUpperCase().padStart(4, '0')}`,
    cls: spec.cls,
    sub: spec.sub,
    name: spec.name,
    region: spec.region,
    ccy: spec.ccy ?? 'castelia',
    price: spec.price,
    base: spec.price,
    load,
    f0,
    idio: 0,
    vol: spec.vol ?? 0,
    drift: spec.drift ?? 0,
    yield: spec.yield ?? 0,
    status: 'open',
    unique: spec.unique ?? false,
    lot: spec.lot ?? 1,
    born: state.tick,
    ...(spec.expiresInDays ? { expires: state.tick + spec.expiresInDays * HOURS_PER_DAY } : {}),
    attrs: spec.attrs ?? {},
    hidden: spec.hidden ?? {},
    hist: [spec.price],
  };
}

/** Precio por factores: base · exp(Σ carga·Δfactor + idio). */
export function factorPrice(inst: Instrument, F: Record<string, number>): number {
  let x = inst.idio;
  for (const k in inst.load) x += (inst.load[k] ?? 0) * ((F[k] ?? 0) - (inst.f0[k] ?? 0));
  const p = inst.base * Math.exp(x);
  return Number.isFinite(p) ? Math.max(0, p) : 0;
}

/** Paseo aleatorio propio con deriva (dt en años). */
export function stepIdio(inst: Instrument, dt: number, rng: Rng): void {
  if (inst.vol <= 0 && inst.drift === 0) return;
  inst.idio +=
    (inst.drift - (inst.vol * inst.vol) / 2) * dt + inst.vol * Math.sqrt(dt) * rng.fatTail();
}

export function fxOf(state: SimState, countryId: string): number {
  return getCountry(state, countryId).fx;
}

/** Valor de mercado de una posición en céntimos de ₳. */
export function positionValue(state: SimState, inst: Instrument, pos: Position): Cents {
  return Math.round(inst.price * fxOf(state, inst.ccy) * pos.qty * 100);
}

/** Renta cobrada: se retiene el 19 % a cuenta, como los intereses y dividendos. */
export function payIncome(
  state: SimState,
  from: AccountId,
  gross: Cents,
  memo: string,
  withholding = 0.19,
): void {
  if (gross <= 0) return;
  const withheld = Math.round(gross * withholding);
  transfer(state.ledger, state.tick, from, 'player:cash', gross, memo);
  if (withheld > 0)
    transfer(
      state.ledger,
      state.tick,
      'player:cash',
      'gov',
      withheld,
      `Retención ${memo.toLowerCase()}`,
    );
  state.player.tax.interestYtd += gross;
  state.player.tax.withheldYtd += withheld;
}

/** Gasto recurrente del jugador (mantenimiento, seguros, IBI…). */
export function payCost(state: SimState, to: AccountId, amount: Cents, memo: string): void {
  if (amount <= 0) return;
  transfer(state.ledger, state.tick, 'player:cash', to, amount, memo);
}

export function companyOf(state: SimState, id: string): Company | undefined {
  return findCompany(state, id);
}

/** Azar determinista y estable para un instrumento (no se puede "volver a tirar"). */
export function stableNoise(key: string): number {
  const r = Rng.fromSeed(hashString(key));
  return r.gauss();
}

export function stableUniform(key: string): number {
  return Rng.fromSeed(hashString(key)).next();
}

const NOISE_BY_LEVEL = [Infinity, 0.35, 0.12, 0];
const FRACTION_FIELDS = new Set([
  'tenantRisk',
  'honesty',
  'quality',
  'integrity',
  'waterSecurity',
  'hit',
  'talent',
]);

/** Estimación de un valor oculto numérico según el nivel de investigación (0–3). */
export function estimateNumber(
  inst: Instrument,
  field: string,
  level: number,
): { value: number; margin: number } | null {
  const truth = inst.hidden[field];
  if (typeof truth !== 'number' || level <= 0) return null;
  const sd = NOISE_BY_LEVEL[Math.min(3, level)] ?? 0;
  const n = stableNoise(`${inst.id}:${field}:${level}`);
  const scale = Math.max(Math.abs(truth), 0.02);
  let value = truth + n * sd * scale * 0.8;
  // Las estimaciones respetan el rango posible del dato (no hay riesgos negativos).
  if (truth >= 0) value = Math.max(0, value);
  if (truth <= 1 && truth >= 0 && FRACTION_FIELDS.has(field)) value = Math.min(1, value);
  return { value, margin: sd * scale };
}

/** Estimación de un valor oculto booleano: acierta el 70 % / 90 % / 100 % según el nivel. */
export function estimateBool(inst: Instrument, field: string, level: number): boolean | null {
  const truth = inst.hidden[field];
  if (typeof truth !== 'boolean' || level <= 0) return null;
  const acc = [0.5, 0.7, 0.9, 1][Math.min(3, level)] ?? 1;
  return stableUniform(`${inst.id}:${field}:${level}`) < acc ? truth : !truth;
}

export function lognormal(rng: Rng, median: number, sigma: number): number {
  return median * Math.exp(rng.gauss() * sigma);
}

export function roundPrice(x: number): number {
  if (x >= 1000) return Math.round(x / 100) * 100;
  if (x >= 100) return Math.round(x);
  return Math.round(x * 100) / 100;
}
