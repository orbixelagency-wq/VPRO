/**
 * Inmobiliario por barrios de Puerto Valmera, embargos y lotes de liquidación.
 * Rentas de alquiler con inquilinos que no pagan, vacíos, reformas, IBI y comunidad;
 * compra con ITP del 8 % y notaría, venta anunciada (semanas) o rápida con descuento.
 */
import { DISTRICTS, type DistrictDef } from '../../data/districts';
import { FIRST_NAMES, LAST_NAMES } from '../../data/names';
import { dateFromTick } from '../../economy/calendar';
import { fromCents, toCents, transfer } from '../../economy/ledger';
import { esNum, publishNews } from '../../economy/news';
import { discoverConcept } from '../../economy/notebook';
import { homeCountry } from '../../economy/valuation';
import { factorPrice, lognormal, makeInstrument, payCost, payIncome, type Ctx } from '../helpers';
import type { ClassRules } from '../rules';
import type { Instrument, Position } from '../types';

type PropType =
  | 'piso'
  | 'estudio'
  | 'local'
  | 'oficina'
  | 'nave'
  | 'terreno'
  | 'edificio'
  | 'vacacional'
  | 'chalet'
  | 'garaje'
  | 'trastero';

const TYPES: Record<
  PropType,
  { label: string; m2: [number, number]; priceMult: number; yieldAdj: number; costPct: number }
> = {
  estudio: { label: 'Estudio', m2: [26, 45], priceMult: 1.1, yieldAdj: 0.006, costPct: 0.012 },
  piso: { label: 'Piso', m2: [55, 140], priceMult: 1, yieldAdj: 0, costPct: 0.011 },
  chalet: { label: 'Chalet', m2: [140, 420], priceMult: 0.95, yieldAdj: -0.008, costPct: 0.013 },
  local: {
    label: 'Local comercial',
    m2: [40, 260],
    priceMult: 0.85,
    yieldAdj: 0.012,
    costPct: 0.01,
  },
  oficina: { label: 'Oficina', m2: [60, 650], priceMult: 0.9, yieldAdj: 0.008, costPct: 0.012 },
  nave: {
    label: 'Nave industrial',
    m2: [300, 3500],
    priceMult: 0.35,
    yieldAdj: 0.016,
    costPct: 0.008,
  },
  terreno: { label: 'Terreno', m2: [500, 25_000], priceMult: 0.07, yieldAdj: -1, costPct: 0.002 },
  edificio: {
    label: 'Edificio completo',
    m2: [600, 2400],
    priceMult: 0.82,
    yieldAdj: 0.006,
    costPct: 0.012,
  },
  vacacional: {
    label: 'Apartamento turístico',
    m2: [40, 95],
    priceMult: 1.15,
    yieldAdj: 0.022,
    costPct: 0.02,
  },
  // Las entradas más baratas al inmobiliario.
  garaje: {
    label: 'Plaza de garaje',
    m2: [11, 16],
    priceMult: 0.55,
    yieldAdj: -0.012,
    costPct: 0.006,
  },
  trastero: { label: 'Trastero', m2: [4, 12], priceMult: 0.45, yieldAdj: -0.008, costPct: 0.006 },
};

const CONDITIONS = [
  { id: 'a reformar', mult: 0.78 },
  { id: 'buen estado', mult: 1 },
  { id: 'reformado', mult: 1.12 },
  { id: 'obra nueva', mult: 1.22 },
] as const;

const STREETS = [
  'Calle del Almirante',
  'Avenida de la Travesía',
  'Calle Mayor',
  'Paseo de las Grúas',
  'Calle de la Lonja',
  'Plaza del Mercado',
  'Calle de los Tintoreros',
  'Avenida del Puerto',
  'Calle Salvatierra',
  'Travesía del Faro',
  'Calle de la Bolsa',
  'Camino de la Vega',
  'Paseo Marítimo',
  'Calle Nueva',
  'Ronda Sur',
] as const;

function makeProperty(ctx: Ctx, d: DistrictDef, expiresIn: number, distressed = false): Instrument {
  const { rng } = ctx;
  const mix: Partial<Record<PropType, number>> = {
    ...d.mix,
    garaje: d.id === 'vega' ? 0.3 : 1.4,
    trastero: d.id === 'vega' ? 0.2 : 0.8,
  };
  const type = rng.weighted(Object.keys(mix) as PropType[], (t) => mix[t] ?? 0);
  const t = TYPES[type];
  const small = type === 'garaje' || type === 'trastero';
  const m2 = Math.round(rng.range(t.m2[0], t.m2[1]));
  const cond = rng.weighted(CONDITIONS, (c) =>
    c.id === 'obra nueva' ? 0.6 : c.id === 'a reformar' ? (distressed ? 3 : 1.2) : 2,
  );
  const priceM2 = d.priceM2 * Math.exp(ctx.inv.factors[`re:${d.id}`] ?? 0);
  let value = m2 * priceM2 * t.priceMult * cond.mult * lognormal(rng, 1, 0.1);
  value = Math.round(value / (small ? 100 : 500)) * (small ? 100 : 500);
  const grossYield =
    t.yieldAdj <= -1 ? 0 : Math.max(0.01, (d.grossYield + t.yieldAdj) * lognormal(rng, 1, 0.12));
  const defects = rng.chance(distressed ? 0.7 : 0.35)
    ? rng.range(0.01, distressed ? 0.3 : 0.14)
    : 0;
  const price = distressed ? Math.round((value * rng.range(0.55, 0.78)) / 500) * 500 : value;
  const rooms =
    type === 'piso' || type === 'chalet' || type === 'vacacional'
      ? Math.max(1, Math.round(m2 / 30))
      : 0;
  const rented = grossYield > 0 && !distressed && type !== 'vacacional' && rng.chance(0.45);
  const inst = makeInstrument(ctx, {
    cls: distressed ? 'distressed' : 'realestate',
    sub: distressed ? `embargo · ${t.label.toLowerCase()}` : t.label.toLowerCase(),
    name: `${t.label} ${m2} m² · ${rng.pick(STREETS)}, ${d.name}`,
    region: d.id,
    price,
    load: { [`re:${d.id}`]: type === 'terreno' ? 1.4 : 1 },
    vol: 0.05,
    drift: 0,
    yield: grossYield,
    unique: true,
    expiresInDays: expiresIn,
    attrs: {
      type: t.label,
      m2,
      condition: cond.id,
      ...(rooms ? { rooms } : {}),
      district: d.name,
      rentMonthly: Math.round((value * grossYield) / 12),
      rented,
      ...(distressed ? { appraisal: value, discount: 1 - price / value } : {}),
    },
    hidden: {
      defects,
      tenantRisk: rng.range(0, 1),
      trend: d.trend,
      ...(distressed
        ? { squatters: rng.chance(0.3), liens: rng.chance(0.35) ? rng.range(0.03, 0.25) : 0 }
        : {}),
      ...(type === 'vacacional' ? { licenceRisk: d.id === 'casco' ? 0.03 : 0.008 } : {}),
    },
  });
  // Si el inmueble está en malas condiciones, su tasación lo refleja poco a poco.
  inst.base = distressed ? value : price;
  if (distressed) inst.price = price;
  return inst;
}

function researchRE(inst: Instrument) {
  const v = inst.price;
  return {
    costs: [40 + v * 0.004, 120 + v * 0.008, 300 + v * 0.012] as [number, number, number],
    days: [3, 10, 21] as [number, number, number],
  };
}

/** Rentas y gastos mensuales de un inmueble en propiedad. */
function landlordMonth(ctx: Ctx, inst: Instrument, pos: Position): void {
  const { state, rng } = ctx;
  const value = inst.price;
  const t = Object.values(TYPES).find((x) => x.label === inst.attrs['type']) ?? TYPES.piso;
  // IBI, comunidad, seguro y mantenimiento.
  payCost(state, 'gov', toCents((value * 0.006) / 12), `IBI ${inst.name}`.slice(0, 70));
  payCost(
    state,
    'world',
    toCents((value * t.costPct) / 12),
    `Comunidad y mantenimiento ${inst.name}`.slice(0, 70),
  );
  if (inst.yield <= 0) return;
  // Inquilino: vacíos, impagos y rotación.
  if ((pos.vacantMonths ?? 0) > 0) {
    pos.vacantMonths = (pos.vacantMonths ?? 1) - 1;
    return;
  }
  const risk = Number(inst.hidden['tenantRisk'] ?? 0.5);
  if (rng.chance(0.004 + risk * 0.012)) {
    pos.vacantMonths = rng.int(3, 9);
    payCost(
      state,
      'world',
      toCents(rng.range(800, 3000)),
      `Abogado y desahucio ${inst.name}`.slice(0, 70),
    );
    state.outbox.push({
      type: 'warning',
      tick: state.tick,
      message: `El inquilino de ${inst.name} deja de pagar. Toca desahucio.`,
      ref: inst.id,
    });
    discoverConcept(state, 'impago_alquiler');
    return;
  }
  if (rng.chance(0.012)) {
    pos.vacantMonths = rng.int(1, 3);
    state.outbox.push({
      type: 'warning',
      tick: state.tick,
      message: `${inst.name} se queda vacío: buscando nuevo inquilino`,
      ref: inst.id,
    });
    return;
  }
  let rent = (value * inst.yield) / 12;
  if (inst.attrs['type'] === 'Apartamento turístico') {
    const month = dateFromTick(state.tick).month;
    const season = month >= 5 && month <= 8 ? 1.8 : month === 3 || month === 11 ? 1 : 0.55;
    rent = rent * season * 0.78; // limpieza, plataformas y gestión
    if (rng.chance(Number(inst.hidden['licenceRisk'] ?? 0))) {
      inst.yield *= 0.6;
      inst.attrs['type'] = 'Piso';
      publishNews(state, {
        category: 'macro',
        headline: `El ayuntamiento retira licencias turísticas en ${inst.attrs['district']}`,
        body: 'Los propietarios deberán pasar al alquiler tradicional. La rentabilidad cae de golpe.',
        tags: [inst.id],
        tone: -0.6,
        importance: 2,
      });
      discoverConcept(state, 'riesgo_regulatorio');
    }
  }
  payIncome(state, 'world', toCents(rent), `Alquiler ${inst.name}`.slice(0, 70));
  discoverConcept(state, 'alquiler');
}

export const realEstateRules: ClassRules = {
  id: 'realestate',
  cadence: 'monthly',
  liquidity: 'listing',
  counterparty: 'world',
  fees: { spread: 0.02, buy: 0.015, sell: 0, min: 600, buyTax: 0.08, sellAgent: 0.03 },
  listingDays: [30, 150],
  quickSaleDiscount: 0.15,
  execution: 'close',
  research: researchRE,
  generate(ctx) {
    const out: Instrument[] = [];
    for (const d of DISTRICTS)
      for (let i = 0; i < 140; i++) out.push(makeProperty(ctx, d, ctx.rng.int(20, 300)));
    return out;
  },
  spawnWeekly(ctx) {
    const out: Instrument[] = [];
    for (const d of DISTRICTS) {
      const n = ctx.rng.int(3, 6);
      for (let i = 0; i < n; i++) out.push(makeProperty(ctx, d, ctx.rng.int(40, 280)));
    }
    return out;
  },
  monthly(ctx, inst, pos) {
    if (pos) landlordMonth(ctx, inst, pos);
    // La renta se actualiza con la inflación.
    if (dateFromTick(ctx.state.tick).month === 0 && typeof inst.attrs['rentMonthly'] === 'number') {
      inst.attrs['rentMonthly'] = Math.round(
        Number(inst.attrs['rentMonthly']) * (1 + Math.max(0, homeCountry(ctx.state).inflation)),
      );
    }
  },
  onBuy(ctx, inst, pos) {
    const { state } = ctx;
    discoverConcept(state, 'inmobiliario');
    if (!inst.attrs['rented']) pos.vacantMonths = ctx.rng.int(1, 2);
    const defects = Number(inst.hidden['defects'] ?? 0);
    if (defects > 0) {
      const known = (state.inv.research[inst.id] ?? 0) >= 2;
      // Si lo investigaste, negociaste la rebaja: el vendedor paga la reparación.
      const cost = toCents(inst.price * defects * (known ? 0.15 : 1));
      payCost(state, 'world', cost, `Reparaciones imprevistas ${inst.name}`.slice(0, 70));
      state.outbox.push({
        type: 'warning',
        tick: state.tick,
        message: known
          ? `Gracias a la inspección negociaste las reparaciones de ${inst.name}: pagas solo ${esNum(fromCents(cost), 0)} ₳`
          : `Sorpresa en ${inst.name}: ${ctx.rng.pick(['humedades', 'la instalación eléctrica', 'aluminosis', 'el tejado', 'las tuberías'])} · ${esNum(fromCents(cost), 0)} ₳ en reparaciones`,
        ref: inst.id,
      });
      inst.hidden['defects'] = 0;
      discoverConcept(state, 'informacion_oculta');
    }
  },
};

// ---------------------------------------------------------------------------
// Embargos y liquidaciones
// ---------------------------------------------------------------------------

const LOT_KINDS = [
  'stock de una cadena de muebles en quiebra',
  'maquinaria de una imprenta cerrada',
  'inventario de una tienda de electrónica',
  'flota de furgonetas de una mensajería',
  'mobiliario de un hotel embargado',
  'existencias de una bodega arruinada',
  'material de oficina de una startup liquidada',
] as const;

function makeLot(ctx: Ctx, expiresIn: number): Instrument {
  const { rng } = ctx;
  const price = Math.round(lognormal(rng, 6000, 0.9) / 100) * 100;
  // Multiplicador oculto: lo que realmente se recupera revendiendo el lote.
  const multiple = Math.max(0.2, lognormal(rng, 1.05, 0.45));
  return makeInstrument(ctx, {
    cls: 'distressed',
    sub: 'lote de liquidación',
    name: `Lote: ${rng.pick(LOT_KINDS)}`,
    region: 'poligono',
    price,
    unique: true,
    expiresInDays: expiresIn,
    attrs: { months: rng.int(3, 8), liquidity: 'none', inventory: `${rng.int(40, 900)} artículos` },
    hidden: { multiple },
  });
}

export const distressedRules: ClassRules = {
  id: 'distressed',
  cadence: 'monthly',
  liquidity: 'listing',
  counterparty: 'world',
  fees: { spread: 0.02, buy: 0.02, sell: 0, min: 400, buyTax: 0.04, sellAgent: 0.03 },
  listingDays: [40, 180],
  quickSaleDiscount: 0.2,
  execution: 'close',
  research: (inst) =>
    inst.sub === 'lote de liquidación'
      ? { costs: [80, 250, 600], days: [2, 5, 10] }
      : researchRE(inst),
  generate(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < 110; i++)
      out.push(makeProperty(ctx, ctx.rng.pick(DISTRICTS), ctx.rng.int(10, 60), true));
    for (let i = 0; i < 45; i++) out.push(makeLot(ctx, ctx.rng.int(7, 40)));
    return out;
  },
  spawnWeekly(ctx) {
    const out: Instrument[] = [];
    const bad = ctx.state.global.phase === 'recession' ? 2 : 1;
    for (let i = 0; i < ctx.rng.int(8, 14) * bad; i++)
      out.push(makeProperty(ctx, ctx.rng.pick(DISTRICTS), ctx.rng.int(10, 50), true));
    for (let i = 0; i < ctx.rng.int(3, 6) * bad; i++) out.push(makeLot(ctx, ctx.rng.int(7, 30)));
    return out;
  },
  monthly(ctx, inst, pos) {
    const { state } = ctx;
    if (!pos) return;
    if (inst.sub === 'lote de liquidación') {
      // El lote se revende por partes durante unos meses.
      const months = Number(inst.attrs['months']);
      const paid = Number(inst.attrs['paidMonths'] ?? 0);
      const total = pos.cost * Number(inst.hidden['multiple']);
      const part = Math.round(total / months);
      transfer(
        state.ledger,
        state.tick,
        'world',
        'player:cash',
        part,
        `Reventa ${inst.name}`.slice(0, 70),
      );
      inst.attrs['paidMonths'] = paid + 1;
      inst.price = Math.max(0, (inst.price * (months - paid - 1)) / Math.max(1, months - paid));
      if (paid + 1 >= months) {
        const received = part * months;
        state.player.tax.realizedGainsYtd += received - pos.cost;
        delete state.inv.positions[inst.id];
        inst.status = 'closed';
        inst.attrs['closedTick'] = state.tick;
        state.outbox.push({
          type: received > pos.cost ? 'dividend' : 'warning',
          tick: state.tick,
          message: `Lote liquidado: recuperas ${esNum(fromCents(received), 0)} ₳ de ${esNum(fromCents(pos.cost), 0)} ₳`,
          ref: inst.id,
        });
      }
      return;
    }
    // Un inmueble embargado ya en propiedad se comporta como cualquier otro.
    landlordMonth(ctx, inst, pos);
  },
  reprice(ctx, inst) {
    if (inst.sub === 'lote de liquidación') return;
    // En venta cotiza con el descuento del embargo; ya comprado, se tasa a su valor real.
    const full = factorPrice(inst, ctx.inv.factors);
    inst.price = ctx.inv.positions[inst.id]
      ? full
      : full * (1 - Number(inst.attrs['discount'] ?? 0));
  },
  onBuy(ctx, inst, pos) {
    const { state, rng } = ctx;
    discoverConcept(state, 'embargo');
    if (inst.sub === 'lote de liquidación') return;
    inst.attrs['liquidity'] = 'listing';
    if (inst.hidden['squatters']) {
      pos.vacantMonths = rng.int(6, 18);
      payCost(
        state,
        'world',
        toCents(rng.range(2000, 6000)),
        `Desalojo judicial ${inst.name}`.slice(0, 70),
      );
      state.outbox.push({
        type: 'warning',
        tick: state.tick,
        message: `${inst.name} estaba ocupado: meses de juicio hasta recuperarlo`,
        ref: inst.id,
      });
      inst.hidden['squatters'] = false;
    } else pos.vacantMonths = rng.int(1, 3);
    const liens = Number(inst.hidden['liens'] ?? 0);
    if (liens > 0) {
      payCost(
        state,
        'world',
        toCents(Number(inst.attrs['appraisal']) * liens),
        `Cargas pendientes ${inst.name}`.slice(0, 70),
      );
      state.outbox.push({
        type: 'warning',
        tick: state.tick,
        message: `El registro revela deudas pendientes sobre ${inst.name}: las pagas tú`,
        ref: inst.id,
      });
      inst.hidden['liens'] = 0;
    }
    realEstateRules.onBuy?.(ctx, inst, pos, 1);
  },
};

export function ownerName(ctx: Ctx): string {
  return `${ctx.rng.pick(FIRST_NAMES)} ${ctx.rng.pick(LAST_NAMES)}`;
}
