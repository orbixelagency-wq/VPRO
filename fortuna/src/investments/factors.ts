/**
 * Factores comunes del catálogo. Cada instrumento se valora como
 * precio = base · exp(Σ carga·(factor − factor₀) + idio), así miles de activos se mueven
 * de forma coherente con la bolsa, los tipos, las materias primas, el clima o la burbuja cripto.
 */
import { COMMODITIES } from '../data/commodities';
import { COUNTRIES, HOME_COUNTRY_ID } from '../data/countries';
import { DISTRICTS } from '../data/districts';
import { SECTORS } from '../data/sectors';
import { dateFromTick } from '../economy/calendar';
import { Rng } from '../economy/rng';
import type { SimState } from '../economy/types';
import { countryDef, homeCountry, riskFreeYield } from '../economy/valuation';
import type { InvestmentsState } from './types';

const DT_DAY = 1 / 252;

export function rate10(state: SimState, countryId: string): number {
  const c = state.countries.find((x) => x.id === countryId)!;
  return riskFreeYield(c, 10, state.global) + c.spread;
}

/** Crecimiento global ponderado respecto a su tendencia (≈ −0,05 … +0,02). */
export function globalGrowthGap(state: SimState): number {
  let s = 0;
  let w = 0;
  for (const c of state.countries) {
    const def = countryDef(c.id);
    s += (c.gdpGrowth - def.trendGrowth) * def.weight;
    w += def.weight;
  }
  return s / w;
}

export function initFactors(state: SimState, inv: InvestmentsState): void {
  const F = inv.factors;
  for (const cd of COMMODITIES) inv.commodities[cd.id] = { price: cd.price, anchor: cd.price };
  F['crypto'] = 0;
  F['lux'] = 0;
  F['vc'] = 0;
  F['power'] = 0;
  for (const s of SECTORS) F[`sec:${s.id}`] = 0;
  for (const d of DISTRICTS) F[`re:${d.id}`] = 0;
  syncMarketFactors(state, inv);
  F['_oil'] = Math.log(state.global.oil);
  F['_fear'] = state.global.fear;
  F['_eqMonth'] = F['eq'] ?? 0;
  F['_techMonth'] = 0;
  F['_rateMonth'] = F['rate:castelia'] ?? 0;
}

/** Factores que se leen directamente del resto de la simulación. */
function syncMarketFactors(state: SimState, inv: InvestmentsState): void {
  const F = inv.factors;
  const home = state.indices.find((i) => i.id === 'AUR20');
  const glob = state.indices.find((i) => i.id === 'GLOBAL');
  if (home) F['eq'] = Math.log(home.value);
  if (glob) F['eqg'] = Math.log(glob.value);
  for (const c of COUNTRIES) {
    const ct = state.countries.find((x) => x.id === c.id)!;
    F[`fx:${c.id}`] = Math.log(ct.fx);
    F[`rate:${c.id}`] = rate10(state, c.id);
  }
  F['cpi'] = Math.log(homeCountry(state).cpi);
  F['fear'] = state.global.fear / 100;
  for (const [id, cs] of Object.entries(inv.commodities)) F[`cmd:${id}`] = Math.log(cs.price);
}

/** Índices sectoriales: rentabilidad diaria ponderada por capitalización de las cotizadas. */
function updateSectorFactors(state: SimState, inv: InvestmentsState): void {
  const sums = new Map<string, { r: number; w: number }>();
  for (const c of state.companies) {
    if (c.status !== 'listed' || c.closes.length < 2) continue;
    const prev = c.closes[c.closes.length - 2]!;
    const last = c.closes[c.closes.length - 1]!;
    const r = Math.log(last / prev);
    if (!Number.isFinite(r) || Math.abs(r) > 0.6) continue;
    const w = c.price * c.sharesOutstanding;
    const e = sums.get(c.sector) ?? { r: 0, w: 0 };
    e.r += r * w;
    e.w += w;
    sums.set(c.sector, e);
  }
  for (const [sec, e] of sums)
    if (e.w > 0) inv.factors[`sec:${sec}`] = (inv.factors[`sec:${sec}`] ?? 0) + e.r / e.w;
}

function updateCommodities(state: SimState, inv: InvestmentsState, rng: Rng): void {
  const F = inv.factors;
  const home = homeCountry(state);
  const gap = globalGrowthGap(state);
  const oilLog = Math.log(state.global.oil);
  const dOil = oilLog - (F['_oil'] ?? oilLog);
  const dFear = (state.global.fear - (F['_fear'] ?? state.global.fear)) / 100;
  const realRate = rate10(state, HOME_COUNTRY_ID) - home.inflation;
  const dReal = realRate - (F['_real'] ?? realRate);
  const month = dateFromTick(state.tick).month;
  for (const cd of COMMODITIES) {
    const cs = inv.commodities[cd.id]!;
    const d = cd.drivers;
    // El clima desplaza el precio de equilibrio de los productos agrícolas (sequía → escasez).
    let dl =
      cd.reversion *
      DT_DAY *
      (Math.log(cs.anchor / cs.price) - (d.weather ?? 0) * 0.35 * inv.weather);
    dl += (d.inflation ?? 0) * (home.inflation - 0.02) * DT_DAY;
    dl += (d.growth ?? 0) * gap * 2 * DT_DAY;
    dl += (d.fear ?? 0) * dFear;
    dl += (d.realRate ?? 0) * dReal;
    dl += (d.oil ?? 0) * dOil;
    if (cd.season) {
      const phase = (m: number) =>
        cd.season!.amp * Math.cos((2 * Math.PI * (m - cd.season!.peakMonth)) / 12);
      dl += (phase(month + 1 / 21) - phase(month)) * 0.5;
    }
    dl += cd.vol * Math.sqrt(DT_DAY) * rng.fatTail();
    cs.price *= Math.exp(dl);
    cs.anchor *= Math.pow(1 + home.inflation, DT_DAY);
    if (cd.id === 'crudo') cs.price = cs.price * 0.8 + state.global.oil * 0.2;
  }
  F['_oil'] = oilLog;
  F['_fear'] = state.global.fear;
  F['_real'] = realRate;
}

/** Mercado cripto: regímenes de euforia, pánico e invierno. */
function updateCrypto(state: SimState, inv: InvestmentsState, rng: Rng, eqReturn: number): void {
  const m = inv.crypto;
  const g = state.global;
  m.daysInRegime++;
  const cfg = {
    bull: { mu: 0.9, vol: 0.65 },
    bear: { mu: -1.2, vol: 0.8 },
    winter: { mu: -0.05, vol: 0.45 },
  }[m.regime];
  const dt = 1 / 365;
  inv.factors['crypto'] =
    (inv.factors['crypto'] ?? 0) +
    (cfg.mu - cfg.vol ** 2 / 2) * dt +
    cfg.vol * Math.sqrt(dt) * rng.fatTail() +
    0.9 * eqReturn;
  const lowRates = homeCountry(state).policyRate < 0.02 ? 1.6 : 1;
  if (m.regime === 'bull' && rng.chance(1 / 300 + g.froth / 900 + Math.max(0, g.fear - 25) / 3000))
    switchCrypto(m, 'bear');
  else if (m.regime === 'bear' && m.daysInRegime > 40 && rng.chance(1 / 110))
    switchCrypto(m, 'winter');
  else if (m.regime === 'winter' && m.daysInRegime > 120 && rng.chance((1 / 380) * lowRates))
    switchCrypto(m, 'bull');
}

function switchCrypto(
  m: InvestmentsState['crypto'],
  to: InvestmentsState['crypto']['regime'],
): void {
  m.regime = to;
  m.daysInRegime = 0;
}

/** Actualización diaria (tras el cierre). */
export function updateFactorsDaily(state: SimState, inv: InvestmentsState, trading: boolean): void {
  const rng = new Rng(inv.rng);
  const prevEq = inv.factors['eq'] ?? 0;
  if (trading) {
    updateSectorFactors(state, inv);
    updateCommodities(state, inv, rng);
  }
  syncMarketFactors(state, inv);
  const eqRet = trading ? (inv.factors['eq'] ?? 0) - prevEq : 0;
  updateCrypto(state, inv, rng, eqRet);
  // Precio mayorista de la electricidad: gas, crudo y cada vez más renovables.
  const F = inv.factors;
  const gas = inv.commodities['gas']!;
  const target =
    0.55 * Math.log(gas.price / 3.2) +
    0.15 * Math.log(state.global.oil / 78) -
    0.012 * (state.tick / 8760);
  F['power'] = (F['power'] ?? 0) + 0.02 * (target - (F['power'] ?? 0)) + rng.gauss() * 0.02;
}

/** Actualización mensual: inmobiliario por barrio, lujo, capital riesgo y clima. */
export function updateFactorsMonthly(state: SimState, inv: InvestmentsState): void {
  const rng = new Rng(inv.rng);
  const F = inv.factors;
  const home = homeCountry(state);
  const rate = F['rate:castelia'] ?? 0;
  const dRate = rate - (F['_rateMonth'] ?? rate);
  const recession = state.global.phase === 'recession' ? -0.004 : 0;
  const shock =
    state.global.shock?.kind === 'banking_crisis' ? -0.015 * state.global.shock.severity : 0;
  const common = rng.gauss() * 0.006;
  for (const d of DISTRICTS) {
    const nominal = (home.gdpGrowth + home.inflation) * 0.8;
    const dl =
      nominal / 12 +
      d.trend / 12 -
      3.5 * dRate +
      recession +
      shock +
      common +
      (d.vol / Math.sqrt(12)) * rng.gauss() * 0.7;
    F[`re:${d.id}`] = (F[`re:${d.id}`] ?? 0) + dl;
  }
  const eq = F['eq'] ?? 0;
  const dEq = eq - (F['_eqMonth'] ?? eq);
  F['lux'] =
    (F['lux'] ?? 0) + 0.45 * dEq + 0.004 + state.global.froth * 0.004 + rng.gauss() * 0.025;
  const tech = F['sec:tech'] ?? 0;
  const dTech = tech - (F['_techMonth'] ?? tech);
  F['vc'] =
    (F['vc'] ?? 0) + 1.1 * dTech - 2.5 * dRate + state.global.froth * 0.006 + rng.gauss() * 0.04;
  F['_eqMonth'] = eq;
  F['_techMonth'] = tech;
  F['_rateMonth'] = rate;
  // Modas del coleccionismo: cada artista, marca o colección tiene su propio ciclo.
  for (const k of Object.keys(F)) {
    if (k.startsWith('hype:')) F[k] = (F[k] ?? 0) * 0.985 + rng.gauss() * 0.045;
  }
  // Clima: anomalía persistente con sequías y años húmedos.
  inv.weather = Math.max(-1, Math.min(1, inv.weather * 0.75 + rng.gauss() * 0.3));
}
