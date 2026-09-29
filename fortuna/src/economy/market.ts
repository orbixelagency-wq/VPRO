import { SECTORS } from '../data/sectors';
import { maybeSplit } from './companies';
import { indexRawValue } from './generate';
import { Rng } from './rng';
import type { Company, SimState } from './types';
import { bondFairYield, bondPriceFromYield, countryDef, getCountry } from './valuation';

/** Actualizaciones de precio por sesión: subasta de apertura + 8 horas. */
export const UPDATES_PER_DAY = 9;
const HALF_LIFE_DAYS = 20;
const KAPPA = Math.log(2) / (HALF_LIFE_DAYS * UPDATES_PER_DAY);

function logTarget(c: Company): number {
  if (c.takeover) return Math.log(c.takeover.price * 0.975);
  return Math.log(Math.max(1e-6, c.fairValue)) + c.sentiment;
}

/**
 * Mueve todos los precios un paso. Los factores comunes (mercado, país, sector) generan
 * correlaciones; en momentos de miedo el factor de mercado domina y todo cae a la vez.
 */
function movePrices(state: SimState, rng: Rng, scale: number): void {
  const vs = state.settings.volatility;
  const perUpdate = Math.sqrt(1 / UPDATES_PER_DAY) * scale;
  const marketSigma = (state.global.fear / 100 / Math.sqrt(252)) * 0.62 * vs;
  const m = rng.fatTail() * marketSigma * perUpdate;
  const countryShock = new Map<string, number>();
  for (const ct of state.countries)
    countryShock.set(ct.id, rng.gauss() * 0.003 * countryDef(ct.id).macroVol * vs * perUpdate);
  const sectorShock = new Map<string, number>();
  const sectorVol = 0.004 * (1 + Math.max(0, state.global.fear - 20) / 40);
  for (const s of SECTORS) sectorShock.set(s.id, rng.gauss() * sectorVol * vs * perUpdate);

  for (const c of state.companies) {
    if (c.status === 'acquired') continue;
    const lp = Math.log(c.price);
    let dl: number;
    if (c.status === 'bankrupt') {
      dl = rng.gauss() * 0.06 * perUpdate - 0.02 * perUpdate;
    } else {
      const idio = rng.fatTail() * c.idioVol * 0.6 * vs * perUpdate * (c.takeover ? 0.2 : 1);
      const common = c.takeover
        ? m * 0.1
        : c.beta * m + (countryShock.get(c.country) ?? 0) + (sectorShock.get(c.sector) ?? 0);
      const shock = common + idio;
      // Los shocks son casi permanentes (paseo aleatorio): el precio no vuelve a un ancla
      // conocida, así que el ruido no se puede explotar. Solo una parte pequeña es transitoria.
      if (!c.takeover) {
        c.sentiment += shock * 0.92;
        c.anchor += shock * 0.92;
      }
      dl = KAPPA * scale * (logTarget(c) - lp) + shock;
      // Disipación del impacto temporal de órdenes grandes.
      const decay = c.tempImpact * 0.35;
      c.tempImpact -= decay;
      dl -= decay;
    }
    c.price = Math.exp(lp + dl);
    if (!Number.isFinite(c.price) || c.price <= 0) c.price = 1e-4;
    if (c.price > c.dayHigh) c.dayHigh = c.price;
    if (c.price < c.dayLow) c.dayLow = c.price;
    c.intraday.push(c.price);
    c.volumeToday += (c.adv / UPDATES_PER_DAY) * (0.6 + rng.next() * 0.8) * (1 + Math.abs(dl) * 30);
  }
}

export function updateIndices(state: SimState): void {
  for (const idx of state.indices) {
    const raw = indexRawValue(state, idx);
    if (raw > 0) idx.value = raw / idx.divisor;
  }
}

/** Subasta de apertura: recoge el hueco de la noche (noticias, resultados). */
export function marketOpen(state: SimState): void {
  const rng = new Rng(state.rng.market);
  // El cierre anterior se fija en la apertura: así la variación del día sigue visible
  // durante la tarde y la noche.
  for (const idx of state.indices) idx.prevClose = idx.value;
  for (const c of state.companies) {
    c.prevClose = c.price;
    c.intraday = [c.price];
    c.volumeToday = 0;
    if (c.status !== 'listed') continue;
    // El mercado descuenta de golpe casi toda de la información nueva (resultados,
    // noticias, tipos): así no hay tendencias predecibles que explotar.
    const target = logTarget(c);
    const news = target - c.anchor;
    c.price *= Math.exp(0.95 * news);
    c.anchor = target;
  }
  // El hueco nocturno equivale a unas 3 actualizaciones de reversión y ruido reducido.
  movePrices(state, rng, 1.6);
  for (const c of state.companies) {
    c.open = c.price;
    c.dayHigh = c.price;
    c.dayLow = c.price;
  }
  updateIndices(state);
}

export function marketTick(state: SimState): void {
  const rng = new Rng(state.rng.market);
  movePrices(state, rng, 1);
  updateIndices(state);
}

/** Cierre: históricos, sentimiento y precios de bonos. Devuelve el retorno del índice local. */
export function marketClose(state: SimState): number {
  const rng = new Rng(state.rng.market);
  const g = state.global;
  for (const c of state.companies) {
    if (c.status === 'acquired') continue;
    c.closes.push(c.price);
    // Sentimiento: persistente (los excesos duran meses), salvo la euforia de burbuja en beta alta.
    const frothTilt = g.froth * Math.max(0, c.beta - 0.8) * 0.35;
    c.sentiment += 0.0004 * (frothTilt - c.sentiment) + rng.gauss() * 0.002;
    c.sentiment = Math.max(-4, Math.min(1.8, c.sentiment));
    // Liquidez: el volumen medio se adapta lentamente.
    c.adv = c.adv * 0.97 + c.volumeToday * 0.03;
    maybeSplit(state, c);
  }
  const home = state.indices[0];
  let ret = 0;
  if (home) {
    const lastClose = home.closes[home.closes.length - 1] ?? home.prevClose;
    ret = home.value / lastClose - 1;
  }
  for (const idx of state.indices) {
    idx.closes.push(idx.value);
  }
  updateBondPrices(state);
  return ret;
}

export function updateBondPrices(state: SimState): void {
  const rng = new Rng(state.rng.market);
  for (const b of state.bonds) {
    if (b.status !== 'active') {
      b.closes.push(b.price);
      continue;
    }
    b.yield = bondFairYield(state, b) + rng.gauss() * 0.0004;
    b.price = bondPriceFromYield(b, state.tick, b.yield);
    b.closes.push(b.price);
  }
}

export function fxOf(state: SimState, countryId: string): number {
  return getCountry(state, countryId).fx;
}
