/**
 * Mercados privados: participaciones en negocios de Puerto Valmera, franquicias y startups.
 * Ilíquidos, opacos y con resultados muy dispersos. La investigación marca la diferencia.
 */
import {
  BUSINESS_NAMES,
  BUSINESS_TYPES,
  FRANCHISES,
  STARTUP_PITCHES,
  STARTUP_PREFIX,
  STARTUP_SUFFIX,
} from '../../data/catalogNames';
import { DISTRICTS } from '../../data/districts';
import { FIRST_NAMES, LAST_NAMES } from '../../data/names';
import { dateFromTick, HOURS_PER_DAY } from '../../economy/calendar';
import { fromCents, toCents, transfer } from '../../economy/ledger';
import { esNum, publishNews } from '../../economy/news';
import { discoverConcept } from '../../economy/notebook';
import { netWorth } from '../../economy/portfolio';
import type { SimState } from '../../economy/types';
import { lognormal, makeInstrument, payIncome, positionValue, type Ctx } from '../helpers';
import type { ClassRules } from '../rules';
import type { Instrument, Position } from '../types';

function person(ctx: Ctx): string {
  return `${ctx.rng.pick(FIRST_NAMES)} ${ctx.rng.pick(LAST_NAMES)}`;
}

// ---------------------------------------------------------------------------
// Negocios locales y franquicias
// ---------------------------------------------------------------------------

function makeBusiness(ctx: Ctx, expires: number): Instrument {
  const { rng } = ctx;
  const t = rng.pick(BUSINESS_TYPES);
  const d = rng.pick(DISTRICTS);
  const owner = person(ctx);
  const stake = rng.pick([0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.49]);
  const annualProfit = lognormal(rng, ((t.ticket[0] + t.ticket[1]) / 2) * 0.3, 0.45);
  const multiple = rng.range(2.4, 4.4);
  const price = Math.round((annualProfit * multiple * stake) / 100) * 100;
  const quality = rng.range(0, 1);
  const trueRatio = Math.max(0.2, lognormal(rng, 0.88, 0.28));
  const honesty = rng.range(0.4, 1);
  const surname = owner.split(' ')[1] ?? owner;
  return makeInstrument(ctx, {
    cls: 'business',
    sub: t.name.toLowerCase(),
    name: `${t.name} "${rng.pick(BUSINESS_NAMES)} ${surname}" (${Math.round(stake * 100)} %)`,
    region: d.id,
    price: Math.max(1000, price),
    load: { eq: 0.15, cpi: 0.8 },
    vol: t.vol * 0.4,
    unique: true,
    expiresInDays: expires,
    attrs: {
      business: t.name,
      district: d.name,
      owner,
      stake,
      claimedProfit: Math.round(annualProfit * stake),
      multiple: Math.round(multiple * 10) / 10,
      yearsOpen: rng.int(0, 25),
      employees: rng.int(1, 30),
    },
    hidden: { trueRatio, honesty, failRisk: t.fail * (1.5 - quality), quality, vol: t.vol },
  });
}

function makeFranchise(ctx: Ctx, expires: number): Instrument {
  const { rng } = ctx;
  const f = rng.pick(FRANCHISES);
  const d = rng.pick(DISTRICTS);
  const price = Math.round((f.fee * rng.range(1.8, 2.8)) / 1000) * 1000;
  const profitYield = rng.range(0.07, 0.15);
  return makeInstrument(ctx, {
    cls: 'franchise',
    sub: f.name,
    name: `Franquicia ${f.name} · ${d.name}`,
    region: d.id,
    price,
    load: { eq: 0.2, cpi: 0.7 },
    vol: 0.06,
    unique: true,
    expiresInDays: expires,
    attrs: {
      brand: f.name,
      district: d.name,
      royalty: f.royalty,
      fee: f.fee,
      expectedProfit: Math.round(price * profitYield),
      operator: person(ctx),
    },
    hidden: {
      trueRatio: Math.max(0.3, lognormal(rng, 0.95, 0.2)),
      honesty: rng.range(0.7, 1),
      failRisk: 0.02 + rng.range(0, 0.03),
      quality: rng.range(0.3, 1),
      vol: 0.12,
    },
  });
}

/** Reparto mensual de beneficios de un negocio o franquicia participado. */
function distributions(ctx: Ctx, inst: Instrument, pos: Position | undefined): void {
  const { state, rng } = ctx;
  if (inst.status !== 'open') return;
  const failRisk = Number(inst.hidden['failRisk'] ?? 0.05);
  const recession = state.global.phase === 'recession' ? 1.8 : 1;
  if (rng.chance((failRisk * recession) / 12)) {
    inst.status = 'failed';
    inst.attrs['closedTick'] = state.tick;
    const recovered = pos ? Math.round(positionValue(state, inst, pos) * 0.05) : 0;
    inst.price = 0;
    if (pos) {
      if (recovered > 0)
        transfer(
          state.ledger,
          state.tick,
          'world',
          'player:cash',
          recovered,
          `Liquidación ${inst.name}`.slice(0, 70),
        );
      state.player.tax.realizedGainsYtd += recovered - pos.cost;
      delete state.inv.positions[inst.id];
      state.outbox.push({
        type: 'bankruptcy',
        tick: state.tick,
        message: `${inst.attrs['business'] ?? inst.attrs['brand']} cierra: pierdes tu inversión`,
        ref: inst.id,
      });
      discoverConcept(state, 'quiebra');
    }
    return;
  }
  if (!pos) return;
  const claimed = Number(inst.attrs['claimedProfit'] ?? inst.attrs['expectedProfit'] ?? 0);
  const skim = (1 - Number(inst.hidden['honesty'] ?? 1)) * 0.3;
  const month = dateFromTick(state.tick).month;
  const season =
    inst.sub === 'cafetería' || inst.sub === 'restaurante'
      ? month >= 5 && month <= 8
        ? 1.2
        : 0.9
      : 1;
  const cycle =
    state.global.phase === 'recession' ? 0.75 : state.global.phase === 'overheating' ? 1.08 : 1;
  const noise = Math.max(0, 1 + rng.gauss() * Number(inst.hidden['vol'] ?? 0.2));
  const amount =
    (claimed * Number(inst.hidden['trueRatio'] ?? 1) * (1 - skim) * season * cycle * noise) / 12;
  payIncome(state, 'world', toCents(amount), `Reparto de beneficios ${inst.name}`.slice(0, 70));
  // La valoración sigue a lo que realmente reparte (mercado privado: tasación lenta).
  const trailing = amount * 12 * Number(inst.attrs['multiple'] ?? 3.5);
  if (inst.cls === 'business' && trailing > 0)
    inst.idio += 0.15 * Math.log(Math.max(0.05, trailing / Math.max(1, inst.price)));
}

const businessResearch = () => ({
  costs: [150, 600, 1500] as [number, number, number],
  days: [3, 10, 21] as [number, number, number],
});

export const businessRules: ClassRules = {
  id: 'business',
  cadence: 'monthly',
  liquidity: 'secondary',
  counterparty: 'world',
  fees: { spread: 0, buy: 0.02, sell: 0.02, min: 300 },
  secondaryDiscount: 0.25,
  execution: 'close',
  research: businessResearch,
  generate(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < 380; i++) out.push(makeBusiness(ctx, ctx.rng.int(15, 120)));
    return out;
  },
  spawnWeekly(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < ctx.rng.int(18, 32); i++) out.push(makeBusiness(ctx, ctx.rng.int(15, 90)));
    return out;
  },
  monthly: distributions,
  onBuy(ctx) {
    discoverConcept(ctx.state, 'socio_capitalista');
  },
};

export const franchiseRules: ClassRules = {
  id: 'franchise',
  cadence: 'monthly',
  liquidity: 'secondary',
  counterparty: 'world',
  fees: { spread: 0, buy: 0.02, sell: 0.02, min: 500 },
  secondaryDiscount: 0.2,
  execution: 'close',
  research: businessResearch,
  generate(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < 60; i++) out.push(makeFranchise(ctx, ctx.rng.int(20, 120)));
    return out;
  },
  spawnWeekly(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < ctx.rng.int(3, 6); i++) out.push(makeFranchise(ctx, ctx.rng.int(20, 90)));
    // Escándalo de marca: afecta a todas sus franquicias.
    if (ctx.rng.chance(0.004)) {
      const brand = ctx.rng.pick(FRANCHISES).name;
      for (const i of ctx.inv.instruments) {
        if (i.cls === 'franchise' && i.attrs['brand'] === brand) {
          i.hidden['trueRatio'] = Number(i.hidden['trueRatio']) * 0.65;
          i.idio -= 0.3;
        }
      }
      publishNews(ctx.state, {
        category: 'scandal',
        headline: `${brand}, en el ojo del huracán: ${ctx.rng.pick(['intoxicación masiva en varios locales', 'un vídeo viral destapa sus cocinas', 'demanda colectiva de sus franquiciados'])}`,
        body: 'Las ventas de toda la cadena se hunden. Los franquiciados temen por su inversión.',
        tags: ['franchise'],
        tone: -0.8,
        importance: 2,
      });
    }
    return out;
  },
  monthly: distributions,
  onBuy(ctx) {
    discoverConcept(ctx.state, 'franquicia');
  },
};

// ---------------------------------------------------------------------------
// Startups
// ---------------------------------------------------------------------------

const STAGES = [
  { id: 'Pre-semilla', val: [0.6e6, 2e6], ticket: 500, fail: 0.42, exit: 0.02 },
  { id: 'Semilla', val: [2e6, 7e6], ticket: 1000, fail: 0.34, exit: 0.04 },
  { id: 'Serie A', val: [8e6, 35e6], ticket: 5000, fail: 0.26, exit: 0.08 },
  { id: 'Serie B', val: [35e6, 140e6], ticket: 25_000, fail: 0.18, exit: 0.14 },
  { id: 'Serie C', val: [120e6, 450e6], ticket: 50_000, fail: 0.12, exit: 0.22 },
] as const;

function accredited(state: SimState): boolean {
  return state.inv.unlocks.accredited || netWorth(state) >= toCents(250_000);
}

function makeStartup(ctx: Ctx, stageIndex: number, roundDays: number): Instrument {
  const { rng, state } = ctx;
  const st = STAGES[stageIndex]!;
  const pitch = rng.pick(STARTUP_PITCHES);
  const name = `${rng.pick(STARTUP_PREFIX)}${rng.pick(STARTUP_SUFFIX)}`;
  const val = Math.round(rng.range(st.val[0], st.val[1]) / 1e5) * 1e5;
  const quality = Math.pow(rng.next(), 1.3);
  return makeInstrument(ctx, {
    cls: 'startup',
    sub: st.id.toLowerCase(),
    name: `${name} — ${pitch.pitch}`,
    region: 'castelia',
    price: st.ticket,
    unique: false,
    expiresInDays: roundDays,
    attrs: {
      company: name,
      stage: st.id,
      stageIndex,
      sector: pitch.sector,
      founders: `${person(ctx)} y ${person(ctx)}`,
      valuation: val,
      val0: val,
      dilution: 1,
      ticket: st.ticket,
      roundCloses: state.tick + roundDays * HOURS_PER_DAY,
      growth: `${rng.int(5, 40)} % mensual`,
      nextEvent: state.tick + rng.int(270, 600) * HOURS_PER_DAY,
    },
    hidden: { quality, integrity: rng.range(0, 1) },
  });
}

function repriceStartup(_ctx: Ctx, inst: Instrument): void {
  inst.price =
    inst.base *
    (Number(inst.attrs['valuation']) / Number(inst.attrs['val0'])) *
    Number(inst.attrs['dilution']);
}

function startupEvent(ctx: Ctx, inst: Instrument, pos: Position | undefined): void {
  const { state, rng, inv } = ctx;
  const idx = Number(inst.attrs['stageIndex']);
  const st = STAGES[Math.min(idx, STAGES.length - 1)]!;
  const q = Number(inst.hidden['quality']);
  const mood = Math.exp((inv.factors['vc'] ?? 0) - (inst.f0['vc'] ?? inv.factors['vc'] ?? 0));
  const company = String(inst.attrs['company']);
  inst.attrs['nextEvent'] = state.tick + rng.int(300, 620) * HOURS_PER_DAY;
  const close = (paidPerUnit: number, headline: string, body: string, tone: number) => {
    inst.status = paidPerUnit > 0 ? 'closed' : 'failed';
    inst.attrs['closedTick'] = state.tick;
    inst.price = paidPerUnit;
    if (pos) {
      const cash = toCents(paidPerUnit * pos.qty);
      if (cash > 0)
        transfer(state.ledger, state.tick, 'world', 'player:cash', cash, `Salida ${company}`);
      state.player.tax.realizedGainsYtd += cash - pos.cost;
      delete state.inv.positions[inst.id];
      state.outbox.push({
        type: cash > pos.cost ? 'dividend' : 'warning',
        tick: state.tick,
        message: `${company}: ${headline.toLowerCase()} · recibes ${esNum(fromCents(cash), 0)} ₳`,
        ref: inst.id,
      });
      discoverConcept(state, 'capital_riesgo');
    }
    if (pos || Math.abs(tone) > 0.8)
      publishNews(state, {
        category: 'corporate',
        headline: `${company}: ${headline}`,
        body,
        tags: [inst.id],
        tone,
        importance: pos ? 2 : 1,
      });
  };
  if (Number(inst.hidden['integrity']) < 0.07) {
    close(
      0,
      'los fundadores, investigados por falsear sus métricas',
      'La startup se disuelve. Los inversores lo pierden todo.',
      -1,
    );
    return;
  }
  const r = rng.next();
  const pFail = st.fail * (1.5 - q) * (mood < 0.8 ? 1.3 : 1);
  const pExit = st.exit * (0.4 + q * 1.2) * Math.min(1.5, mood);
  if (r < pFail) {
    close(
      0,
      'cierra tras quedarse sin caja',
      'No consiguió la siguiente ronda de financiación. Los empleados se marchan y los activos no cubren las deudas.',
      -0.6,
    );
    return;
  }
  if (r < pFail + pExit) {
    const ipo = idx >= 4 && rng.chance(0.3 + q * 0.3);
    const mult = ipo ? rng.range(1.4, 4) : rng.range(0.6, 2.8) * (0.6 + q);
    const val = Number(inst.attrs['valuation']) * mult;
    inst.attrs['valuation'] = val;
    repriceStartup(ctx, inst);
    if (ipo)
      state.ipoQueue.push({
        day: Math.floor(state.tick / HOURS_PER_DAY) + 20,
        country: 'castelia',
      });
    close(
      inst.price,
      ipo
        ? 'sale a bolsa'
        : `es comprada por ${rng.pick(['Nexa Systems', 'Grupo Albión', 'Huaxin Holdings', 'Crest & Holt', 'Pioneer Partners'])}`,
      `Operación valorada en ${esNum(val / 1e6, 0)} millones de áureos.`,
      mult > 1 ? 0.8 : -0.2,
    );
    return;
  }
  // Nueva ronda: al alza, plana o a la baja (con dilución).
  const up = rng.chance(Math.min(0.85, 0.25 + q * 0.6) * Math.min(1.3, mood));
  const flat = !up && rng.chance(0.5);
  const factor = up
    ? rng.range(1.7, 3.4) * Math.sqrt(mood)
    : flat
      ? rng.range(0.95, 1.3)
      : rng.range(0.35, 0.7);
  inst.attrs['valuation'] = Number(inst.attrs['valuation']) * factor;
  inst.attrs['dilution'] = Number(inst.attrs['dilution']) * (up ? 0.8 : flat ? 0.87 : 0.72);
  if (up && idx < STAGES.length - 1) {
    inst.attrs['stageIndex'] = idx + 1;
    inst.attrs['stage'] = STAGES[idx + 1]!.id;
  }
  repriceStartup(ctx, inst);
  inst.hist.push(inst.price);
  if (pos) {
    const change = factor * (up ? 0.8 : flat ? 0.87 : 0.72) - 1;
    state.outbox.push({
      type: up ? 'dividend' : 'warning',
      tick: state.tick,
      message: `${company} cierra una ronda ${up ? 'al alza' : flat ? 'plana' : 'a la baja'}: tu participación se revaloriza un ${change >= 0 ? '+' : ''}${esNum(change * 100, 0)} %`,
      ref: inst.id,
    });
    discoverConcept(state, 'dilucion');
  }
}

export const startupRules: ClassRules = {
  id: 'startup',
  cadence: 'none',
  liquidity: 'secondary',
  counterparty: 'world',
  fees: { spread: 0, buy: 0.05, sell: 0.03, min: 25 },
  secondaryDiscount: 0.45,
  execution: 'close',
  research: (inst) => {
    const s = Number(inst.attrs['stageIndex']);
    return { costs: [150 + s * 300, 600 + s * 1200, 2000 + s * 4000], days: [5, 14, 30] };
  },
  unlock(state, inst) {
    if (state.tick > Number(inst.attrs['roundCloses'])) return 'La ronda de inversión está cerrada';
    if (Number(inst.attrs['stageIndex']) >= 3 && !accredited(state))
      return 'Rondas Serie B/C: solo inversores acreditados (patrimonio ≥ 250.000 ₳)';
    return null;
  },
  generate(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < 380; i++)
      out.push(
        makeStartup(
          ctx,
          ctx.rng.weighted([0, 1, 2, 3, 4], (s) => [5, 5, 3, 1.5, 0.8][s]!),
          ctx.rng.int(20, 90),
        ),
      );
    return out;
  },
  spawnWeekly(ctx) {
    const out: Instrument[] = [];
    const n = Math.round(ctx.rng.int(20, 34) * Math.min(1.6, Math.exp(ctx.inv.factors['vc'] ?? 0)));
    for (let i = 0; i < n; i++)
      out.push(
        makeStartup(
          ctx,
          ctx.rng.weighted([0, 1, 2, 3, 4], (s) => [5, 5, 3, 1.5, 0.8][s]!),
          ctx.rng.int(20, 75),
        ),
      );
    return out;
  },
  reprice: repriceStartup,
  monthly(ctx, inst, pos) {
    if (inst.status !== 'open') return;
    if (ctx.state.tick >= Number(inst.attrs['nextEvent'])) startupEvent(ctx, inst, pos);
  },
  onBuy(ctx) {
    discoverConcept(ctx.state, 'capital_riesgo');
  },
};
