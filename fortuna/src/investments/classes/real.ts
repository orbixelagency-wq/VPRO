/**
 * Activos reales: tierras agrícolas (cosechas, clima, subvenciones) y proyectos de energía.
 */
import { ENERGY_KINDS, ENERGY_PLACES } from '../../data/catalogNames';
import { dateFromTick } from '../../economy/calendar';
import { toCents } from '../../economy/ledger';
import { esNum, publishNews } from '../../economy/news';
import { discoverConcept } from '../../economy/notebook';
import { lognormal, makeInstrument, payCost, payIncome, positionValue, type Ctx } from '../helpers';
import type { ClassRules } from '../rules';
import type { Instrument } from '../types';

const CROPS = [
  {
    id: 'olivar',
    name: 'Olivar',
    priceHa: 26_000,
    rev: 3_300,
    cost: 1_150,
    cmd: 'aceite',
    month: 11,
    region: 'vega',
    w: 5,
  },
  {
    id: 'vina',
    name: 'Viñedo',
    priceHa: 36_000,
    rev: 4_900,
    cost: 2_300,
    cmd: null,
    month: 9,
    region: 'vega',
    w: 3,
  },
  {
    id: 'cereal',
    name: 'Cereal',
    priceHa: 9_500,
    rev: 950,
    cost: 430,
    cmd: 'trigo',
    month: 6,
    region: 'vega',
    w: 4,
  },
  {
    id: 'almendro',
    name: 'Almendros',
    priceHa: 19_000,
    rev: 3_000,
    cost: 1_250,
    cmd: 'agua',
    month: 8,
    region: 'vega',
    w: 3,
  },
  {
    id: 'citricos',
    name: 'Cítricos',
    priceHa: 32_000,
    rev: 5_700,
    cost: 2_700,
    cmd: 'agua',
    month: 1,
    region: 'costa',
    w: 2,
  },
  {
    id: 'cafetal',
    name: 'Cafetal (Kaishan)',
    priceHa: 11_000,
    rev: 2_700,
    cost: 1_350,
    cmd: 'cafe',
    month: 10,
    region: 'kaishan',
    w: 2,
  },
  {
    id: 'cacao',
    name: 'Cacaotal (Qaravel)',
    priceHa: 9_000,
    rev: 2_300,
    cost: 1_150,
    cmd: 'cacao',
    month: 3,
    region: 'qaravel',
    w: 1,
  },
  {
    id: 'ganado',
    name: 'Dehesa con ganado',
    priceHa: 7_500,
    rev: 720,
    cost: 270,
    cmd: 'trigo',
    month: 4,
    region: 'vega',
    w: 2,
  },
] as const;

const FARM_NAMES = ['Finca', 'Cortijo', 'Masía', 'Hacienda', 'Heredad', 'Quinta'] as const;
const FARM_PLACES = [
  'El Olmo',
  'Los Almendros',
  'La Solana',
  'El Pozo Viejo',
  'Las Encinas',
  'La Umbría',
  'El Molino',
  'Valdecañas',
  'La Atalaya',
  'El Cerro',
] as const;

function makeFarm(ctx: Ctx, expires: number): Instrument {
  const { rng } = ctx;
  const crop = rng.weighted(CROPS, (c) => c.w);
  const ha = Math.max(1, Math.round(lognormal(rng, 14, 0.9)));
  const irrigated = crop.id !== 'cafetal' && crop.id !== 'cacao' && rng.chance(0.4);
  const price =
    Math.round((ha * crop.priceHa * (irrigated ? 1.35 : 1) * lognormal(rng, 1, 0.12)) / 500) * 500;
  const load: Record<string, number> = { cpi: 0.6, 're:vega': 0.35 };
  if (crop.cmd) load[`cmd:${crop.cmd}`] = 0.3;
  return makeInstrument(ctx, {
    cls: 'farmland',
    sub: crop.name.toLowerCase(),
    name: `${rng.pick(FARM_NAMES)} ${rng.pick(FARM_PLACES)} · ${ha} ha de ${crop.name.toLowerCase()}`,
    region: crop.region === 'kaishan' || crop.region === 'qaravel' ? crop.region : crop.region,
    price,
    load,
    vol: 0.04,
    drift: 0.005,
    unique: true,
    expiresInDays: expires,
    yield: ((crop.rev - crop.cost) * 0.9 + 140) / (crop.priceHa * (irrigated ? 1.35 : 1)),
    attrs: {
      crop: crop.name,
      cropId: crop.id,
      ha,
      irrigated,
      harvestMonth: crop.month,
      cooperative: `Cooperativa ${rng.pick(FARM_PLACES)}`,
    },
    hidden: {
      soil: lognormal(rng, 1, 0.18),
      waterSecurity: irrigated ? rng.range(0.6, 1) : rng.range(0, 0.4),
    },
  });
}

export const farmlandRules: ClassRules = {
  id: 'farmland',
  cadence: 'monthly',
  liquidity: 'listing',
  counterparty: 'world',
  fees: { spread: 0.02, buy: 0.015, sell: 0, min: 500, buyTax: 0.06, sellAgent: 0.03 },
  listingDays: [60, 240],
  quickSaleDiscount: 0.2,
  execution: 'close',
  research: (inst) => ({
    costs: [200 + inst.price * 0.001, 600 + inst.price * 0.002, 1500 + inst.price * 0.003],
    days: [4, 12, 25],
  }),
  generate(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < 230; i++) out.push(makeFarm(ctx, ctx.rng.int(30, 200)));
    return out;
  },
  spawnWeekly(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < ctx.rng.int(12, 22); i++) out.push(makeFarm(ctx, ctx.rng.int(30, 160)));
    return out;
  },
  monthly(ctx, inst, pos) {
    const { state, rng, inv } = ctx;
    const d = dateFromTick(state.tick);
    if (!pos) return;
    const ha = Number(inst.attrs['ha']);
    const crop = CROPS.find((c) => c.id === inst.attrs['cropId'])!;
    if (d.month !== Number(inst.attrs['harvestMonth'])) return;
    const w = inv.weather;
    const irrigated = !!inst.attrs['irrigated'];
    // Sequía: el secano sufre mucho; el regadío depende de la seguridad del agua.
    const water = irrigated ? Number(inst.hidden['waterSecurity']) : 0;
    const weatherYield = Math.max(0.1, 1 + w * (0.45 - 0.35 * water));
    const hail = rng.chance(0.03) ? rng.range(0.3, 0.8) : 1;
    const cmdRatio = crop.cmd
      ? Math.pow(inv.commodities[crop.cmd]!.price / inv.commodities[crop.cmd]!.anchor, 0.8)
      : 1;
    const revenue =
      ha *
      crop.rev *
      cmdRatio *
      weatherYield *
      hail *
      Number(inst.hidden['soil']) *
      Math.exp(inv.factors['cpi'] ?? 0);
    const costs = ha * crop.cost * Math.exp(inv.factors['cpi'] ?? 0);
    const net = revenue * 0.9 - costs;
    const subsidy = ha * 140;
    if (net > 0) payIncome(state, 'world', toCents(net), `Cosecha ${inst.name}`.slice(0, 70));
    else payCost(state, 'world', toCents(-net), `Pérdidas de la cosecha ${inst.name}`.slice(0, 70));
    payIncome(
      state,
      'gov',
      toCents(subsidy),
      `Ayuda del Fondo Agrario ${inst.name}`.slice(0, 70),
      0,
    );
    state.outbox.push({
      type: net > 0 ? 'dividend' : 'warning',
      tick: state.tick,
      message: `Cosecha de ${crop.name.toLowerCase()} en ${inst.name.split('·')[0]!.trim()}: ${net >= 0 ? 'beneficio' : 'pérdida'} de ${esNum(Math.abs(net), 0)} ₳${hail < 1 ? ' (granizo)' : w < -0.5 ? ' (sequía)' : ''}`,
      ref: inst.id,
    });
    discoverConcept(state, 'agricultura');
    if (w < -0.5) discoverConcept(state, 'clima');
  },
};

/** Noticias del clima (una vez al mes). */
export function weatherNews(ctx: Ctx): void {
  const { state, inv, rng } = ctx;
  const m = dateFromTick(state.tick).month;
  if (inv.weather < -0.65 && m >= 4 && m <= 8 && rng.chance(0.5)) {
    publishNews(state, {
      category: 'macro',
      headline: rng.pick([
        'Sequía histórica en La Vega: los embalses, al 18 %',
        'Sin lluvia desde hace cuatro meses: el campo pide ayudas',
        'La sequía dispara el precio del aceite de oliva',
      ]),
      body: 'Los agricultores de secano dan por perdida buena parte de la cosecha. Los precios agrícolas suben.',
      tags: ['farmland'],
      tone: -0.4,
      importance: 2,
    });
  } else if (inv.weather > 0.7 && rng.chance(0.3)) {
    publishNews(state, {
      category: 'macro',
      headline: 'Primavera lluviosa: se esperan cosechas récord',
      body: 'Buenas noticias para el campo; malas para quien apostó por la subida de los precios agrícolas.',
      tags: ['farmland'],
      tone: 0.3,
      importance: 1,
    });
  }
}

// ---------------------------------------------------------------------------
// Energía
// ---------------------------------------------------------------------------

function makeEnergy(ctx: Ctx, expires: number): Instrument {
  const { rng } = ctx;
  const k = rng.pick(ENERGY_KINDS);
  const capex = rng.range(k.capex[0], k.capex[1]);
  const place = rng.pick(ENERGY_PLACES);
  const expected = k.yield * lognormal(rng, 1, 0.12);
  const load: Record<string, number> = { 'rate:castelia': -5 };
  if (k.loadPower > 0) load['power'] = k.loadPower * 0.6;
  if (k.id === 'pozo') load['cmd:crudo'] = 0.8;
  return makeInstrument(ctx, {
    cls: 'energy',
    sub: k.name.toLowerCase(),
    name: `${k.name} ${place} (${esNum(capex / 1e6, 1)} M ₳)`,
    region: 'castelia',
    price: 1000,
    load,
    vol: k.vol * 0.5,
    drift: k.id === 'pozo' ? -0.12 : -0.01,
    yield: expected,
    expiresInDays: expires,
    attrs: {
      kind: k.id,
      place,
      capex: Math.round(capex),
      mw: Math.round((capex / 1.1e6) * 10) / 10,
      expectedYield: expected,
      unit: 'participación de 1.000 ₳',
    },
    hidden: { capacity: lognormal(rng, 0.95, 0.12), regulation: k.id === 'pozo' ? 0.001 : 0.003 },
  });
}

export const energyRules: ClassRules = {
  id: 'energy',
  cadence: 'monthly',
  liquidity: 'secondary',
  counterparty: 'world',
  fees: { spread: 0, buy: 0.015, sell: 0.015, min: 20 },
  secondaryDiscount: 0.1,
  execution: 'close',
  research: () => ({ costs: [300, 1000, 2500], days: [5, 14, 30] }),
  generate(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < 160; i++) out.push(makeEnergy(ctx, ctx.rng.int(30, 200)));
    return out;
  },
  spawnWeekly(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < ctx.rng.int(8, 14); i++) out.push(makeEnergy(ctx, ctx.rng.int(30, 150)));
    return out;
  },
  monthly(ctx, inst, pos) {
    const { state, rng, inv } = ctx;
    if (inst.status !== 'open') return;
    if (rng.chance(Number(inst.hidden['regulation']))) {
      inst.yield *= 0.72;
      inst.idio -= 0.25;
      inst.hidden['regulation'] = 0;
      publishNews(state, {
        category: 'macro',
        headline: `El Gobierno recorta con carácter retroactivo la retribución de ${inst.sub === 'pozo' ? 'los pozos' : 'las renovables'}`,
        body: `Los inversores de ${inst.name} verán reducidos sus ingresos un 28 %. Las asociaciones del sector hablan de "inseguridad jurídica".`,
        tags: [inst.id],
        tone: -0.7,
        importance: pos ? 2 : 1,
      });
      if (pos) discoverConcept(state, 'riesgo_regulatorio');
    }
    if (!pos) return;
    const m = dateFromTick(state.tick).month;
    const kind = String(inst.attrs['kind']);
    const season =
      kind === 'solar'
        ? 1 + 0.45 * Math.cos(((m - 6) / 12) * 2 * Math.PI)
        : kind === 'eolica'
          ? 1 + 0.25 * Math.cos((m / 12) * 2 * Math.PI)
          : 1;
    const powerRatio = Math.exp(inv.factors['power'] ?? 0);
    const market =
      kind === 'pozo' ? inv.commodities['crudo']!.price / 78 : Math.pow(powerRatio, 0.8);
    const decline = kind === 'pozo' ? Math.pow(0.988, (state.tick - pos.opened) / 730) : 1;
    const income =
      (positionValue(state, inst, pos) / Math.max(0.01, inst.price / 1000)) *
      (inst.yield / 12) *
      Number(inst.hidden['capacity']) *
      season *
      market *
      decline *
      Math.max(0.2, 1 + rng.gauss() * 0.12);
    payIncome(state, 'world', Math.round(income), `Ingresos ${inst.name}`.slice(0, 70));
    discoverConcept(state, 'energia');
  },
};
