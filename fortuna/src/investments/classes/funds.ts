/**
 * Fondos indexados, ETF (sectoriales, temáticos, de bonos, de materias primas, apalancados),
 * fondos de gestión activa, planes de pensiones y seguros de ahorro / reaseguro.
 */
import { COMMODITIES } from '../../data/commodities';
import { COUNTRIES, HOME_COUNTRY_ID } from '../../data/countries';
import { ETF_BRANDS, FUND_HOUSES, THEMES } from '../../data/catalogNames';
import { SECTORS } from '../../data/sectors';
import { dateFromTick } from '../../economy/calendar';
import { transfer, toCents } from '../../economy/ledger';
import { esNum, publishNews } from '../../economy/news';
import { discoverConcept } from '../../economy/notebook';
import { netWorth } from '../../economy/portfolio';
import type { SimState } from '../../economy/types';
import { makeInstrument, payIncome, positionValue, type Ctx } from '../helpers';
import type { ClassRules } from '../rules';
import type { Instrument } from '../types';

const EQ_DIV = 0.025; // rentabilidad por dividendo media de la bolsa (el factor es de precio)

function etf(
  ctx: Ctx,
  name: string,
  sub: string,
  load: Record<string, number>,
  ter: number,
  extra: Partial<Parameters<typeof makeInstrument>[1]> = {},
  dist = false,
  incomeYield = EQ_DIV,
): Instrument {
  return makeInstrument(ctx, {
    cls: 'etf',
    sub,
    name,
    region: extra.region ?? HOME_COUNTRY_ID,
    ccy: extra.ccy ?? HOME_COUNTRY_ID,
    price: extra.price ?? 50 + Math.round(ctx.rng.next() * 150),
    load,
    vol: extra.vol ?? 0.01,
    // Acumulación: el dividendo se reinvierte. Distribución: se paga cada trimestre.
    drift: (dist ? 0 : incomeYield) - ter,
    yield: dist ? incomeYield : 0,
    attrs: { ter, policy: dist ? 'Distribución' : 'Acumulación', ...(extra.attrs ?? {}) },
  });
}

export const etfRules: ClassRules = {
  id: 'etf',
  cadence: 'daily',
  liquidity: 'instant',
  counterparty: 'market',
  fees: { spread: 0.002, buy: 0.0005, sell: 0.0005, min: 2 },
  execution: 'close',
  generate(ctx) {
    const out: Instrument[] = [];
    const brands = [...ETF_BRANDS];
    for (const [i, b] of brands.entries()) {
      out.push(
        etf(
          ctx,
          `${b} Áureo 20`,
          'índice',
          { eq: 1 },
          [0.0007, 0.0015, 0.0012, 0.0025, 0.004, 0.0009][i]!,
          {},
          i % 2 === 1,
        ),
      );
      out.push(
        etf(
          ctx,
          `${b} Fortuna Global`,
          'índice',
          { eqg: 1 },
          [0.0012, 0.002, 0.0018, 0.003, 0.0045, 0.0014][i]!,
          {},
          i % 2 === 0,
        ),
      );
    }
    for (const s of SECTORS) {
      for (const b of brands.slice(0, 2))
        out.push(
          etf(
            ctx,
            `${b} Sector ${s.name}`,
            'sectorial',
            { [`sec:${s.id}`]: 1 },
            0.0035,
            { attrs: { sector: s.name } },
            false,
            s.payout * 0.05,
          ),
        );
    }
    for (const c of COUNTRIES) {
      if (c.id === HOME_COUNTRY_ID) continue;
      out.push(
        etf(ctx, `${brands[2]} Bolsa ${c.name}`, 'país', { eqg: 0.9, [`fx:${c.id}`]: 1 }, 0.004, {
          vol: 0.06,
          region: c.id,
          attrs: { currency: c.currency.code },
        }),
      );
    }
    for (const t of THEMES) {
      const load: Record<string, number> = {};
      for (const [sec, w] of Object.entries(t.sectors)) load[`sec:${sec}`] = w;
      out.push(
        etf(
          ctx,
          `${ctx.rng.pick(brands)} ${t.name}`,
          'temático',
          load,
          0.006,
          { vol: 0.07, attrs: { theme: t.name } },
          false,
          0.012,
        ),
      );
    }
    for (const c of COUNTRIES) {
      const y = Number(ctx.inv.factors[`rate:${c.id}`] ?? 0.03);
      for (const [label, dur] of [
        ['corto plazo', 2],
        ['largo plazo', 9],
      ] as const) {
        const load: Record<string, number> = { [`rate:${c.id}`]: -dur };
        if (c.id !== HOME_COUNTRY_ID) load[`fx:${c.id}`] = 1;
        out.push(
          etf(
            ctx,
            `${brands[3]} Bonos ${c.name} ${label}`,
            'bonos',
            load,
            0.0015,
            { vol: 0.004, region: c.id, attrs: { duration: dur, currency: c.currency.code } },
            c.id === HOME_COUNTRY_ID,
            Math.max(0.005, y - (dur === 2 ? 0.006 : 0)),
          ),
        );
      }
    }
    for (const cd of COMMODITIES) {
      out.push(
        etf(
          ctx,
          `${brands[4]} ETC ${cd.name}`,
          'materias primas',
          { [`cmd:${cd.id}`]: 1, 'fx:columbria': 1 },
          0.0045,
          { vol: 0.01, attrs: { commodity: cd.name } },
          false,
          -0.01,
        ),
      );
    }
    // Apalancados e inversos: el reajuste diario erosiona el valor con la volatilidad.
    for (const [lev, label] of [
      [2, '2x apalancado'],
      [3, '3x apalancado'],
      [-1, 'inverso'],
      [-2, 'inverso 2x'],
    ] as const) {
      const drag = ((lev * lev - lev) * 0.2 * 0.2) / 2;
      const inst = etf(
        ctx,
        `${brands[5]} Áureo 20 ${label}`,
        'apalancado',
        { eq: lev },
        0.0095,
        { vol: 0.02, attrs: { leverage: lev } },
        false,
        -drag,
      );
      inst.hidden['decay'] = drag;
      out.push(inst);
    }
    out.push(
      etf(
        ctx,
        `${brands[0]} Dividendo Castelia`,
        'dividendo',
        { 'sec:utilities': 0.35, 'sec:telecom': 0.25, 'sec:finance': 0.2, 'sec:staples': 0.2 },
        0.0028,
        {},
        true,
        0.045,
      ),
    );
    out.push(
      etf(ctx, `${brands[1]} Pequeñas Compañías`, 'índice', { eq: 1.2 }, 0.0035, { vol: 0.08 }),
    );
    out.push(
      etf(
        ctx,
        `${brands[2]} Oro Físico`,
        'materias primas',
        { 'cmd:oro': 1, 'fx:columbria': 1 },
        0.0025,
        {},
        false,
        0,
      ),
    );
    return out;
  },
  monthly(ctx, inst, pos) {
    // Reparto trimestral de los ETF de distribución.
    if (!pos || inst.yield <= 0 || dateFromTick(ctx.state.tick).month % 3 !== 0) return;
    payIncome(
      ctx.state,
      'market',
      Math.round((positionValue(ctx.state, inst, pos) * inst.yield) / 4),
      `Reparto ${inst.name}`,
    );
    discoverConcept(ctx.state, 'dividendo');
  },
  onBuy(ctx, inst) {
    discoverConcept(ctx.state, 'fondos_indexados');
    if (inst.sub === 'apalancado') discoverConcept(ctx.state, 'apalancado_diario');
  },
};

const STRATEGIES = [
  { name: 'Renta Variable Castelia', load: { eq: 0.95 }, eqShare: 1 },
  { name: 'Renta Variable Global', load: { eqg: 0.95 }, eqShare: 1 },
  { name: 'Mixto Moderado', load: { eq: 0.4, 'rate:castelia': -2.5 }, eqShare: 0.4 },
  { name: 'Mixto Agresivo', load: { eq: 0.7, 'rate:castelia': -1.5 }, eqShare: 0.7 },
  { name: 'Renta Fija Flexible', load: { 'rate:castelia': -3.5 }, eqShare: 0 },
  { name: 'Tecnología Global', load: { 'sec:tech': 1.05 }, eqShare: 1 },
  {
    name: 'Value Europa Meridiana',
    load: { eqg: 0.8, 'sec:finance': 0.15, 'fx:meridia': 1 },
    eqShare: 1,
  },
  { name: 'Emergentes', load: { eqg: 1, 'fx:kaishan': 0.6, 'fx:qaravel': 0.3 }, eqShare: 1 },
  { name: 'Salud y Biotecnología', load: { 'sec:health': 1 }, eqShare: 1 },
  { name: 'Monetario', load: {}, eqShare: 0 },
  { name: 'Retorno Absoluto', load: { eq: 0.2 }, eqShare: 0.2 },
  { name: 'Small Caps Castelia', load: { eq: 1.15 }, eqShare: 1 },
] as const;

function activeFund(
  ctx: Ctx,
  cls: 'fund' | 'pension',
  house: string,
  strat: (typeof STRATEGIES)[number],
): Instrument {
  const { rng, state } = ctx;
  const ter =
    cls === 'pension'
      ? rng.range(0.011, 0.018)
      : strat.name === 'Monetario'
        ? 0.004
        : rng.range(0.012, 0.022);
  // Habilidad del gestor: la mayoría no bate a su índice tras comisiones.
  const alpha = rng.gauss() * 0.018 - 0.003;
  const cash = strat.name === 'Monetario' ? Math.max(0, state.countries[0]!.policyRate - 0.002) : 0;
  const stars = Math.max(1, Math.min(5, Math.round(3 + alpha * 60 + rng.gauss() * 1.1)));
  const inst = makeInstrument(ctx, {
    cls,
    sub:
      cls === 'pension'
        ? 'plan de pensiones'
        : strat.eqShare >= 0.9
          ? 'renta variable'
          : strat.eqShare > 0
            ? 'mixto'
            : 'renta fija',
    name: `${house} ${strat.name}${cls === 'pension' ? ' PP' : ''}`,
    region: HOME_COUNTRY_ID,
    price: 10 + Math.round(rng.next() * 30 * 100) / 100,
    load: { ...strat.load },
    vol: 0.02 + strat.eqShare * 0.035,
    drift:
      alpha +
      strat.eqShare * EQ_DIV +
      cash +
      (strat.eqShare === 0 && strat.name !== 'Monetario' ? 0.028 : 0) -
      ter,
    attrs: { ter, stars, strategy: strat.name, manager: house },
    hidden: { alpha },
  });
  return inst;
}

export const fundRules: ClassRules = {
  id: 'fund',
  cadence: 'daily',
  liquidity: 'instant',
  counterparty: 'market',
  fees: { spread: 0, buy: 0, sell: 0, min: 0 },
  execution: 'close',
  research: () => ({ costs: [40, 150, 400], days: [2, 5, 10] }),
  generate(ctx) {
    const out: Instrument[] = [];
    for (const house of FUND_HOUSES) {
      const picks = ctx.rng.shuffle([...STRATEGIES]).slice(0, 5);
      for (const s of picks) out.push(activeFund(ctx, 'fund', house, s));
    }
    return out;
  },
  onBuy(ctx) {
    discoverConcept(ctx.state, 'gestion_activa');
  },
};

export const pensionRules: ClassRules = {
  id: 'pension',
  cadence: 'daily',
  liquidity: 'secondary',
  counterparty: 'market',
  fees: { spread: 0, buy: 0, sell: 0, min: 0 },
  // Rescate anticipado: penalización del 10 %.
  secondaryDiscount: 0.1,
  execution: 'close',
  research: () => ({ costs: [40, 150, 400], days: [2, 5, 10] }),
  generate(ctx) {
    const out: Instrument[] = [];
    for (const house of FUND_HOUSES.slice(0, 8)) {
      for (const s of [STRATEGIES[2], STRATEGIES[3], STRATEGIES[0]] as const)
        out.push(activeFund(ctx, 'pension', house, s));
    }
    return out;
  },
  onBuy(ctx, inst, pos, qty) {
    const cost = toCents(inst.price * qty);
    ctx.inv.pensionYtd += cost;
    pos.contribYtd = (pos.contribYtd ?? 0) + cost;
    discoverConcept(ctx.state, 'plan_pensiones');
  },
};

// ---------------------------------------------------------------------------
// Seguros de ahorro, rentas y reaseguro
// ---------------------------------------------------------------------------

function accreditedLock(state: SimState): string | null {
  return netWorth(state) >= toCents(250_000) || state.inv.unlocks.accredited
    ? null
    : 'Solo para inversores acreditados (patrimonio ≥ 250.000 ₳)';
}

export const insuranceRules: ClassRules = {
  id: 'insurance',
  cadence: 'monthly',
  liquidity: 'secondary',
  counterparty: 'market',
  fees: { spread: 0, buy: 0, sell: 0, min: 0 },
  secondaryDiscount: 0.08,
  execution: 'close',
  research: (inst) => ({
    costs: inst.sub === 'reaseguro' ? [800, 3000, 9000] : [30, 90, 200],
    days: [3, 10, 20],
  }),
  unlock: (state, inst) => (inst.sub === 'reaseguro' ? accreditedLock(state) : null),
  generate(ctx) {
    const out: Instrument[] = [];
    const insurers = ['Seguros Égida', 'Mutua Estrella', 'Faro Vida', 'Atlas Re', 'Kapital Re'];
    for (const [i, years] of [3, 5, 10, 15, 20, 25].entries()) {
      const guaranteed = Math.max(
        0.005,
        (ctx.inv.factors['rate:castelia'] ?? 0.03) - 0.012 + i * 0.001,
      );
      out.push(
        makeInstrument(ctx, {
          cls: 'insurance',
          sub: 'seguro de ahorro',
          name: `${insurers[i % 2]} Ahorro Garantizado ${years} años`,
          region: HOME_COUNTRY_ID,
          price: 100,
          drift: guaranteed,
          attrs: { guaranteed, years, insurer: insurers[i % 2]! },
        }),
      );
    }
    for (const [i, years] of [10, 15, 20, 25, 30].entries()) {
      const rate = Math.max(0.01, (ctx.inv.factors['rate:castelia'] ?? 0.03) - 0.005 + i * 0.001);
      const annuity = (rate / (1 - Math.pow(1 + rate, -years))) * 1000;
      out.push(
        makeInstrument(ctx, {
          cls: 'insurance',
          sub: 'renta temporal',
          name: `${insurers[2]} Renta Asegurada ${years} años`,
          region: HOME_COUNTRY_ID,
          price: 1000,
          // Cada unidad de 1.000 ₳ paga una renta mensual fija: el capital se consume.
          yield: annuity / 1000,
          drift: -1 / years,
          attrs: { years, monthly: annuity / 12, insurer: insurers[2]! },
        }),
      );
    }
    for (let i = 0; i < 7; i++) {
      const catProb = ctx.rng.range(0.03, 0.12);
      const premium = catProb * ctx.rng.range(1.2, 2.2) + 0.03;
      out.push(
        makeInstrument(ctx, {
          cls: 'insurance',
          sub: 'reaseguro',
          name: `${insurers[3 + (i % 2)]} Bono Catástrofe ${['Huracán Atlántico', 'Terremoto Kaishan', 'Inundación Meridiana', 'Incendios Castelia', 'Sequía Qaravel', 'Granizo Nordhavn', 'Tsunami Costa'][i]}`,
          region: HOME_COUNTRY_ID,
          price: 10_000,
          yield: premium,
          attrs: { minimum: 10_000, premium },
          hidden: { catProb },
        }),
      );
    }
    return out;
  },
  monthly(ctx, inst, pos) {
    const { state, rng } = ctx;
    if (inst.sub === 'reaseguro') {
      if (inst.status === 'open' && rng.chance(Number(inst.hidden['catProb']) / 12)) {
        const loss = rng.range(0.4, 1);
        inst.idio += Math.log(Math.max(0.01, 1 - loss));
        inst.price *= 1 - loss;
        publishNews(state, {
          category: 'systemic',
          headline: `Catástrofe natural: ${inst.name} activa su cláusula y los inversores pierden el ${esNum(loss * 100, 0)} %`,
          body: 'Los bonos catástrofe pagan primas altas precisamente por esto.',
          tags: [inst.id],
          tone: -0.7,
          importance: pos ? 3 : 1,
        });
        // Tras el siniestro, el bono se renueva a su nominal.
        inst.base = 10_000;
        inst.idio = 0;
        inst.price = 10_000 * (1 - loss);
      }
      if (pos)
        payIncome(
          state,
          'market',
          Math.round((positionValue(state, inst, pos) * inst.yield) / 12),
          `Prima ${inst.name}`,
        );
      return;
    }
    if (inst.sub === 'renta temporal' && pos) {
      const monthly = toCents(Number(inst.attrs['monthly']) * pos.qty);
      // La renta combina devolución de capital (no tributa) e intereses (tributan).
      const capital = Math.round(toCents(pos.qty * 1000) / (Number(inst.attrs['years']) * 12));
      transfer(
        state.ledger,
        state.tick,
        'market',
        'player:cash',
        Math.min(monthly, capital),
        `Renta ${inst.name} (capital)`,
      );
      payIncome(state, 'market', Math.max(0, monthly - capital), `Renta ${inst.name} (intereses)`);
      pos.cost = Math.max(0, pos.cost - capital);
    }
  },
};
