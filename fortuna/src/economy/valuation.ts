import { COUNTRIES, HOME_COUNTRY_ID, type CountryDef } from '../data/countries';
import { SECTORS, type SectorDef } from '../data/sectors';
import { DAYS_PER_YEAR, HOURS_PER_DAY } from './calendar';
import type { Bond, Company, Country, GlobalMacro, Rating, SimState } from './types';

const countryDefs = new Map(COUNTRIES.map((c) => [c.id, c]));
const sectorDefs = new Map(SECTORS.map((s) => [s.id, s]));

export function countryDef(id: string): CountryDef {
  const d = countryDefs.get(id);
  if (!d) throw new Error(`País desconocido: ${id}`);
  return d;
}

export function sectorDef(id: string): SectorDef {
  const d = sectorDefs.get(id);
  if (!d) throw new Error(`Sector desconocido: ${id}`);
  return d;
}

export function getCountry(state: SimState, id: string): Country {
  const c = state.countries.find((x) => x.id === id);
  if (!c) throw new Error(`País no encontrado: ${id}`);
  return c;
}

export function homeCountry(state: SimState): Country {
  return getCountry(state, HOME_COUNTRY_ID);
}

export const TICKS_PER_YEAR = DAYS_PER_YEAR * HOURS_PER_DAY;

/**
 * Rentabilidad del bono sin riesgo del país a T años: expectativa de tipos futuros
 * (reversión del tipo oficial al neutral) + prima por plazo. Si el tipo oficial está
 * por encima del neutral, la curva se invierte: señal adelantada de recesión.
 */
export function riskFreeYield(country: Country, years: number, global: GlobalMacro): number {
  const def = countryDef(country.id);
  const neutral = def.neutralReal + def.inflationTarget;
  const T = Math.max(years, 1 / 12);
  const k = 2.5;
  const avgPath = neutral + ((country.policyRate - neutral) * k * (1 - Math.exp(-T / k))) / T;
  const termPremium = 0.0045 * Math.log1p(T);
  // Refugio: en pánico los bonos de los países "seguros" bajan de rentabilidad.
  const safeHaven =
    def.baseSpread === 0 ? (-0.00025 * Math.max(0, global.fear - 18) * Math.min(T, 10)) / 10 : 0;
  return Math.max(-0.005, avgPath + termPremium + safeHaven);
}

export function sovereignYield(country: Country, years: number, global: GlobalMacro): number {
  return riskFreeYield(country, years, global) + country.spread;
}

const RATING_SPREADS: Record<Rating, number> = {
  AAA: 0.003,
  AA: 0.005,
  A: 0.008,
  BBB: 0.014,
  BB: 0.028,
  B: 0.045,
  CCC: 0.09,
  D: 0.3,
};

export const RATING_ORDER: readonly Rating[] = ['AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC', 'D'];

export function creditSpread(rating: Rating, global: GlobalMacro): number {
  const base = RATING_SPREADS[rating];
  // Los diferenciales se abren con el miedo, mucho más en calidades bajas.
  const stress = Math.max(0, global.fear - 16) / 30;
  const idx = RATING_ORDER.indexOf(rating);
  return base * (1 + stress * (0.4 + idx * 0.25));
}

export function companyRating(c: Company): Rating {
  if (c.status === 'bankrupt') return 'D';
  const earnings = sum(c.quarterlyEarnings);
  const lev = c.debt / Math.max(1, c.revenueTtm);
  const sec = sectorDef(c.sector);
  const relLev = lev / Math.max(0.1, sec.leverage);
  let score = 0;
  score += earnings > 0 ? 2 : -2;
  score += c.margin > sec.baseMargin ? 1 : 0;
  score -= relLev > 2 ? 3 : relLev > 1.4 ? 2 : relLev > 1 ? 1 : 0;
  score += c.revenueTtm > 5000 ? 2 : c.revenueTtm > 1000 ? 1 : 0;
  score += c.hidden.quality > 0.6 ? 1 : 0;
  if (score >= 5) return 'AAA';
  if (score >= 4) return 'AA';
  if (score >= 3) return 'A';
  if (score >= 2) return 'BBB';
  if (score >= 1) return 'BB';
  if (score >= -1) return 'B';
  return 'CCC';
}

export function sum(xs: readonly number[]): number {
  let s = 0;
  for (const x of xs) s += x;
  return s;
}

/** Coste de capital de la empresa (tasa de descuento de los beneficios). */
export function costOfEquity(state: SimState, c: Company): number {
  const country = getCountry(state, c.country);
  const def = countryDef(c.country);
  const sec = sectorDef(c.sector);
  const rf = riskFreeYield(country, 10, state.global);
  const neutral10 = def.neutralReal + def.inflationTarget + 0.0045 * Math.log1p(10);
  const rateEffect = (rf - neutral10) * sec.rateSensitivity;
  return (
    neutral10 +
    rateEffect +
    country.spread +
    state.global.equityPremium * (0.6 + 0.4 * sec.beta) +
    sec.riskPremium +
    (1 - c.hidden.quality) * 0.01
  );
}

/**
 * Valor razonable por acción (divisa local): múltiplo de Gordon sobre el BPA de los
 * últimos 12 meses; si hay pérdidas, se valora por ventas con descuento.
 */
export function fairValuePerShare(state: SimState, c: Company): number {
  const sec = sectorDef(c.sector);
  const r = costOfEquity(state, c);
  const earnings = forwardEarnings(state, c);
  // Valoración continua: múltiplo de beneficios o, si es mayor, un suelo por ventas
  // (lo que pagaría un comprador por el negocio aunque hoy no gane dinero).
  const pe = Math.min(40, Math.max(4, twoStageMultiple(r, c.growth)));
  const bySales = c.revenueTtm * sec.priceToSales * 0.2 * (0.5 + c.hidden.quality);
  let equity = Math.max(earnings * pe, bySales);
  // Ajuste por caja neta: la deuda excesiva penaliza.
  const excessDebt = Math.max(0, c.debt - c.revenueTtm * sec.leverage * 1.5);
  equity = equity + 0.3 * c.cash - 0.5 * excessDebt;
  const floor = c.revenueTtm * 0.03;
  return Math.max(floor, equity) / c.sharesOutstanding;
}

/**
 * Beneficio anual esperado por el mercado: último trimestre anualizado, con el margen
 * a mitad de camino hacia su nivel estructural. Mirar hacia delante evita que las
 * noticias se incorporen al precio con meses de retraso (deriva explotable).
 */
export function forwardEarnings(state: SimState, c: Company): number {
  const country = getCountry(state, c.country);
  const lastRev = c.quarterlyRevenue[c.quarterlyRevenue.length - 1] ?? c.revenueTtm / 4;
  const annualRev = lastRev * 4 * (1 + c.growth * 0.5);
  // El fraude engaña al mercado: los márgenes publicados están inflados.
  const reportedMargin = c.margin + (c.hidden.fraud ? c.hidden.fraudSeverity * 0.15 : 0);
  const margin = 0.5 * reportedMargin + 0.5 * c.targetMargin;
  const interest = c.debt * (country.policyRate + 0.015 + country.spread);
  return annualRev * margin - interest;
}

/**
 * Múltiplo de beneficios en dos etapas: el crecimiento propio de la empresa durante
 * unos años (el que el mercado ya descuenta) y después un crecimiento perpetuo moderado.
 * Así el crecimiento esperado queda en el precio y no es una ventaja gratuita.
 */
export function twoStageMultiple(r: number, growth: number): number {
  const H = 3;
  const g1 = Math.min(0.3, Math.max(-0.1, growth));
  const g2 = 0.025;
  const q = (1 + g1) / (1 + r);
  let pv = 0;
  let f = 1;
  for (let t = 1; t <= H; t++) {
    f *= q;
    pv += f;
  }
  return pv + (f * (1 + g2)) / Math.max(0.02, r - g2);
}

/** Diferencial de compra/venta en tanto por uno según la capitalización. */
export function stockSpread(c: Company, fx: number): number {
  const mcapAur = (c.price * c.sharesOutstanding * fx) / 1e6; // millones de AUR... sharesOutstanding en millones
  const bps = 4 + 260 / Math.sqrt(Math.max(1, mcapAur));
  return Math.min(0.03, bps / 10_000);
}

export function marketCapAur(state: SimState, c: Company): number {
  return c.price * c.sharesOutstanding * getCountry(state, c.country).fx;
}

/** Volatilidad diaria total estimada (para el impacto de mercado). */
export function dailyVol(state: SimState, c: Company): number {
  const m = state.global.fear / 100 / Math.sqrt(252);
  return Math.sqrt((c.beta * m) ** 2 + c.idioVol ** 2 + 0.006 ** 2);
}

/** Flujos de caja restantes de un bono: [años hasta el pago, importe por 100]. */
export function bondCashflows(b: Bond, tick: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const step = TICKS_PER_YEAR / b.frequency;
  const cpn = (b.coupon * 100) / b.frequency;
  let t = b.maturityTick;
  let first = true;
  while (t > tick) {
    out.push([(t - tick) / TICKS_PER_YEAR, cpn + (first ? 100 : 0)]);
    first = false;
    t -= step;
  }
  return out.reverse();
}

export function bondPriceFromYield(b: Bond, tick: number, y: number): number {
  const f = b.frequency;
  let p = 0;
  for (const [t, cf] of bondCashflows(b, tick)) p += cf / Math.pow(1 + y / f, f * t);
  return p;
}

export function bondYearsToMaturity(b: Bond, tick: number): number {
  return Math.max(0, (b.maturityTick - tick) / TICKS_PER_YEAR);
}

/** Duración modificada aproximada (sensibilidad del precio a los tipos). */
export function bondDuration(b: Bond, tick: number): number {
  const y = b.yield;
  const p0 = bondPriceFromYield(b, tick, y);
  const p1 = bondPriceFromYield(b, tick, y + 0.0001);
  return p0 > 0 ? ((p0 - p1) / p0) * 10_000 : 0;
}

export function bondFairYield(state: SimState, b: Bond): number {
  const country = getCountry(state, b.country);
  const T = bondYearsToMaturity(b, state.tick);
  if (b.issuerType === 'government') return sovereignYield(country, T, state.global);
  return (
    riskFreeYield(country, T, state.global) +
    country.spread * 0.5 +
    creditSpread(b.rating, state.global)
  );
}

export function isHomeCountry(id: string): boolean {
  return id === HOME_COUNTRY_ID;
}
