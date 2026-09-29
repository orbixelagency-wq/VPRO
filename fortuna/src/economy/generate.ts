import { COUNTRIES, HOME_COUNTRY_ID } from '../data/countries';
import {
  CEO_STYLES,
  COMPANY_ROOTS,
  COMPANY_SUFFIXES,
  FIRST_NAMES,
  FOREIGN_FLAVOR,
  LAST_NAMES,
} from '../data/names';
import { SECTORS } from '../data/sectors';
import { HOURS_PER_DAY } from './calendar';
import { createLedger } from './ledger';
import { Rng, seedState } from './rng';
import type {
  Bond,
  Company,
  Country,
  GlobalMacro,
  MarketIndex,
  PlayerState,
  SimSettings,
  SimState,
} from './types';
import {
  bondFairYield,
  bondPriceFromYield,
  companyRating,
  countryDef,
  fairValuePerShare,
  riskFreeYield,
  sectorDef,
  sovereignYield,
  TICKS_PER_YEAR,
} from './valuation';

export const SCHEMA_VERSION = 1;

export const DEFAULT_SETTINGS: SimSettings = { volatility: 1, crisisFrequency: 1, sandbox: false };

/** Reparto de las 50 empresas cotizadas iniciales por país. */
const LISTINGS_PER_COUNTRY: Record<string, number> = {
  castelia: 22,
  columbria: 10,
  meridia: 6,
  nordhavn: 5,
  kaishan: 5,
  qaravel: 2,
};

const QARAVEL_SECTORS = ['energy', 'materials', 'finance', 'realestate'];

export function createInitialGlobal(): GlobalMacro {
  return {
    phase: 'expansion',
    monthsInPhase: 14,
    nextPhase: null,
    monthsToNext: 0,
    fear: 16,
    equityPremium: 0.045,
    froth: 0.1,
    oil: 78,
    shock: null,
  };
}

function createCountries(rng: Rng, global: GlobalMacro): Country[] {
  return COUNTRIES.map((def) => {
    const c: Country = {
      id: def.id,
      gdpGrowth: def.trendGrowth + rng.gauss() * 0.003,
      inflation: def.inflationTarget + rng.gauss() * 0.004,
      unemployment: def.naturalUnemployment + rng.gauss() * 0.005,
      policyRate: 0,
      debtToGdp: def.initialDebtToGdp,
      gdp: def.initialGdp,
      fx: def.initialFx,
      cpi: 1,
      pmi: 51 + rng.gauss(),
      nextMeeting: rng.int(5, 40) * HOURS_PER_DAY + 14,
      spread: def.baseSpread,
      history: [],
    };
    c.policyRate = Math.max(
      0,
      roundTo(def.neutralReal + c.inflation + rng.gauss() * 0.003, 0.0025),
    );
    c.spread = def.baseSpread + Math.max(0, c.debtToGdp - 0.9) * 0.02;
    void global;
    return c;
  });
}

export function roundTo(x: number, step: number): number {
  return Math.round(x / step) * step;
}

function makeTicker(name: string, used: Set<string>, rng: Rng): string {
  const letters = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z ]/g, '');
  const words = letters.split(' ').filter(Boolean);
  const candidates: string[] = [];
  const first = words[0] ?? 'X';
  candidates.push(first.slice(0, 4));
  if (words.length > 1)
    candidates.push((first.slice(0, 2) + (words[1] ?? '').slice(0, 2)).slice(0, 4));
  candidates.push(first.slice(0, 3));
  candidates.push(
    first.slice(0, 1) +
      words
        .map((w) => w[0])
        .join('')
        .slice(1, 3) +
      first.slice(-1),
  );
  for (const cand of candidates) {
    if (cand.length >= 3 && !used.has(cand)) {
      used.add(cand);
      return cand;
    }
  }
  for (;;) {
    const cand =
      first.slice(0, 2) +
      String.fromCharCode(65 + rng.int(0, 25)) +
      String.fromCharCode(65 + rng.int(0, 25));
    if (!used.has(cand)) {
      used.add(cand);
      return cand;
    }
  }
}

function makeCompanyName(
  rng: Rng,
  sector: string,
  country: string,
  usedNames: Set<string>,
): string {
  for (let attempt = 0; attempt < 40; attempt++) {
    const root = rng.pick(COMPANY_ROOTS[sector] ?? ['Grupo']);
    const suffix = rng.pick(COMPANY_SUFFIXES[sector] ?? ['']);
    let name = suffix && !root.includes(' ') && rng.chance(0.75) ? `${root} ${suffix}` : root;
    if (country !== HOME_COUNTRY_ID) {
      const flavor = rng.pick(FOREIGN_FLAVOR[country] ?? ['Global']);
      name = rng.chance(0.5)
        ? `${flavor}${root.split(' ')[0]?.toLowerCase() ?? ''}`
        : `${flavor} ${name}`;
    }
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  const fallback = `Grupo ${rng.pick(LAST_NAMES)} ${usedNames.size}`;
  usedNames.add(fallback);
  return fallback;
}

export function personName(rng: Rng): string {
  return `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`;
}

export interface CompanyContext {
  usedTickers: Set<string>;
  usedNames: Set<string>;
}

/** Genera una empresa coherente con su sector y país. `state` debe tener países y macro. */
export function generateCompany(
  state: SimState,
  rng: Rng,
  ctx: CompanyContext,
  country: string,
  sectorId?: string,
  ipo = false,
): Company {
  const sector =
    sectorId ??
    (country === 'qaravel' ? rng.pick(QARAVEL_SECTORS) : rng.weighted(SECTORS, (s) => s.weight).id);
  const sec = sectorDef(sector);
  const cdef = countryDef(country);
  const fx = state.countries.find((c) => c.id === country)?.fx ?? cdef.initialFx;
  const name = makeCompanyName(rng, sector, country, ctx.usedNames);
  const id = makeTicker(name, ctx.usedTickers, rng);
  const quality = Math.min(1, Math.max(0, 0.5 + rng.gauss() * 0.22));
  const style = rng.pick(CEO_STYLES);
  const sizeAur = Math.exp(Math.log(ipo ? 400 : 2200) + rng.gauss() * 1.15); // ingresos, millones AUR
  const revenue = sizeAur / fx;
  const margin = Math.max(0.01, sec.baseMargin * (0.55 + 0.9 * quality) + rng.gauss() * 0.015);
  const growth =
    sec.baseGrowth +
    (cdef.trendGrowth - 0.02) * 0.8 +
    style.growthBias +
    rng.gauss() * 0.02 +
    (ipo ? 0.04 : 0);
  const debt = revenue * sec.leverage * rng.range(0.4, 1.5) * (1 + style.riskBias * 0.3);
  const cash = revenue * rng.range(0.04, 0.2);
  const qRev = revenue / 4;
  const quarterlyRevenue = [0, 1, 2, 3].map((i) => qRev * Math.pow(1 + growth, (i - 3) / 4));
  const interestQ = (debt * (0.035 + cdef.baseSpread)) / 4;
  const quarterlyEarnings = quarterlyRevenue.map(
    (r) => r * margin * (1 + rng.gauss() * 0.04) - interestQ,
  );
  const fraud = rng.chance(style.id === 'promoter' ? 0.14 : 0.03);
  const company: Company = {
    id,
    name,
    sector,
    country,
    ceo: { name: personName(rng), style: style.id },
    founded: 2030 - (ipo ? rng.int(3, 9) : rng.int(8, 120)),
    sharesOutstanding: 1,
    revenueTtm: quarterlyRevenue.reduce((a, b) => a + b, 0),
    quarterlyRevenue,
    quarterlyEarnings,
    margin,
    targetMargin: margin,
    growth,
    cash,
    debt,
    dividendPerShare: 0,
    consensusEps: 0,
    price: 1,
    prevClose: 1,
    open: 1,
    dayHigh: 1,
    dayLow: 1,
    fairValue: 1,
    sentiment: rng.gauss() * 0.12 + (ipo ? 0.15 : 0),
    tempImpact: 0,
    anchor: 0,
    adv: 0,
    volumeToday: 0,
    beta: sec.beta * (0.8 + 0.4 * rng.next()),
    idioVol: sec.idioVol * (0.75 + 0.6 * rng.next()) * (ipo ? 1.4 : 1),
    hidden: { fraud, fraudSeverity: fraud ? rng.range(0.25, 0.7) : 0, quality },
    status: 'listed',
    nextEarningsDay: 0,
    takeover: null,
    splitCount: 0,
    closes: [],
    intraday: [],
  };
  // Número de acciones para un precio inicial "de pantalla" razonable.
  company.sharesOutstanding = 1;
  const valueTotal = fairValuePerShare(state, company); // con 1M de acciones = valor total
  const targetPriceAur = Math.exp(Math.log(28) + rng.gauss() * 0.75);
  company.sharesOutstanding = Math.max(0.5, valueTotal / (targetPriceAur / fx));
  company.fairValue = fairValuePerShare(state, company);
  company.price = company.fairValue * Math.exp(company.sentiment);
  company.prevClose = company.open = company.dayHigh = company.dayLow = company.price;
  company.anchor = Math.log(company.fairValue) + company.sentiment;
  const payout = Math.max(0, sec.payout + rng.gauss() * 0.1 - (ipo ? 0.3 : 0));
  const eps = company.quarterlyEarnings[3]! / company.sharesOutstanding;
  company.dividendPerShare = Math.max(0, eps * payout);
  company.consensusEps = eps * (1 + growth / 4);
  const turnover = rng.range(0.002, 0.007) * (ipo ? 2 : 1);
  company.adv = company.sharesOutstanding * 1e6 * turnover;
  return company;
}

function createBonds(state: SimState, rng: Rng): Bond[] {
  const bonds: Bond[] = [];
  const maturities = [1, 2, 3, 5, 7, 10, 15, 30];
  for (const country of state.countries) {
    const def = countryDef(country.id);
    for (const years of maturities) {
      if (def.id === 'qaravel' && years > 10) continue;
      const remaining = years - rng.range(0, Math.min(0.9, years * 0.3));
      const maturityTick = Math.round(state.tick + remaining * TICKS_PER_YEAR);
      const y = sovereignYield(country, remaining, state.global) + rng.gauss() * 0.004;
      const coupon = Math.max(0, roundTo(y, 0.00125));
      bonds.push({
        id: `${def.currency.code}-${years}A`,
        name: `${def.treasury} ${(coupon * 100).toFixed(2).replace('.', ',')} % ${years} años`,
        issuer: def.id,
        issuerType: 'government',
        country: def.id,
        coupon,
        maturityTick,
        frequency: def.id === 'columbria' ? 2 : 1,
        rating:
          def.baseSpread === 0
            ? 'AAA'
            : def.baseSpread < 0.01
              ? 'A'
              : def.baseSpread < 0.02
                ? 'BBB'
                : 'BB',
        price: 100,
        yield: y,
        status: 'active',
        recovery: 0.6,
        closes: [],
      });
    }
  }
  const issuers = state.companies.filter((c) => c.debt > c.revenueTtm * 0.3).slice(0, 22);
  for (const c of issuers) {
    const years = rng.pick([3, 4, 5, 6, 8, 10, 12]);
    const rating = companyRating(c);
    const country = state.countries.find((x) => x.id === c.country)!;
    const remaining = years - rng.range(0, 1.5);
    const bond: Bond = {
      id: `${c.id}-${String(2030 + Math.round(remaining)).slice(2)}`,
      name: '',
      issuer: c.id,
      issuerType: 'corporate',
      country: c.country,
      coupon: 0,
      maturityTick: Math.round(state.tick + remaining * TICKS_PER_YEAR),
      frequency: 1,
      rating,
      price: 100,
      yield: 0,
      status: 'active',
      recovery: 0.4,
      closes: [],
    };
    const y = riskFreeYield(country, remaining, state.global) + country.spread * 0.5 + 0.012;
    bond.coupon = Math.max(0.005, roundTo(y + rng.gauss() * 0.004, 0.00125));
    bond.name = `${c.name} ${(bond.coupon * 100).toFixed(2).replace('.', ',')} % ${2030 + Math.round(remaining)}`;
    bonds.push(bond);
  }
  for (const b of bonds) {
    b.yield = bondFairYield(state, b);
    b.price = bondPriceFromYield(b, state.tick, b.yield);
  }
  return bonds;
}

export function createIndices(state: SimState): MarketIndex[] {
  const home = state.companies.filter(
    (c) => c.country === HOME_COUNTRY_ID && c.status === 'listed',
  );
  const top = [...home]
    .sort((a, b) => b.price * b.sharesOutstanding - a.price * a.sharesOutstanding)
    .slice(0, 20);
  const all = state.companies.filter((c) => c.status === 'listed');
  const make = (id: string, name: string, members: string[], base: number): MarketIndex => ({
    id,
    name,
    value: base,
    prevClose: base,
    closes: [],
    members,
    divisor: 1,
  });
  return [
    make(
      'AUR20',
      'Áureo 20',
      top.map((c) => c.id),
      10_000,
    ),
    make(
      'GLOBAL',
      'Fortuna Global',
      all.map((c) => c.id),
      1_000,
    ),
  ];
}

export function createPlayer(name = 'Jugador'): PlayerState {
  return {
    name,
    job: null,
    monthlyExpenses: 0,
    stocks: {},
    bonds: {},
    deposits: [],
    loans: [],
    orders: [],
    trades: [],
    tax: {
      realizedGainsYtd: 0,
      lossCarryForward: 0,
      dividendsYtd: 0,
      interestYtd: 0,
      withheldYtd: 0,
      paidTotal: 0,
    },
    netWorthHistory: [],
    bankrupt: false,
    overdraftMonths: 0,
    notebook: [],
    creditScore: 640,
  };
}

/** Crea el mundo en el tick 0 (antes del calentamiento histórico). */
export function createWorld(seed: number, settings: SimSettings = DEFAULT_SETTINGS): SimState {
  const genRng = Rng.fromSeed(seed, 'generate');
  const global = createInitialGlobal();
  const state: SimState = {
    schemaVersion: SCHEMA_VERSION,
    seed,
    tick: 0,
    settings: { ...settings },
    rng: {
      macro: seedState(seed, 'macro'),
      market: seedState(seed, 'market'),
      corporate: seedState(seed, 'corporate'),
      news: seedState(seed, 'news'),
      events: seedState(seed, 'events'),
    },
    ledger: createLedger(),
    global,
    countries: [],
    companies: [],
    bonds: [],
    indices: [],
    player: createPlayer(),
    news: [],
    nextId: 1,
    ipoQueue: [],
    outbox: [],
  };
  state.countries = createCountries(genRng, global);
  const ctx: CompanyContext = { usedTickers: new Set(), usedNames: new Set() };
  for (const [country, n] of Object.entries(LISTINGS_PER_COUNTRY)) {
    for (let i = 0; i < n; i++) state.companies.push(generateCompany(state, genRng, ctx, country));
  }
  // Presentaciones de resultados escalonadas a lo largo del trimestre.
  for (const c of state.companies) c.nextEarningsDay = genRng.int(12, 100);
  state.bonds = createBonds(state, genRng);
  state.indices = createIndices(state);
  for (const idx of state.indices) {
    const raw = indexRawValue(state, idx);
    idx.divisor = raw / idx.value;
  }
  return state;
}

const companyMaps = new WeakMap<Company[], Map<string, Company>>();

/** Búsqueda O(1) de empresas por ticker (la caché se rehace si la lista cambia). */
export function findCompany(state: SimState, id: string): Company | undefined {
  let map = companyMaps.get(state.companies);
  if (!map || map.size !== state.companies.length) {
    map = new Map(state.companies.map((c) => [c.id, c]));
    companyMaps.set(state.companies, map);
  }
  return map.get(id);
}

export function indexRawValue(state: SimState, idx: MarketIndex): number {
  let total = 0;
  for (const id of idx.members) {
    const c = findCompany(state, id);
    if (!c || c.status !== 'listed') continue;
    const fx = state.countries.find((x) => x.id === c.country)?.fx ?? 1;
    total += c.price * c.sharesOutstanding * fx;
  }
  return total;
}
