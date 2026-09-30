/**
 * Alternativos: coleccionismo, entretenimiento y deporte, préstamos entre particulares
 * y filantropía.
 */
import {
  ANTIQUES,
  ART_KINDS,
  ARTISTS,
  ARTISTS_MUSIC,
  ATHLETES,
  CARD_SETS,
  CAR_MAKES,
  CAR_MODELS,
  CAUSES,
  COMICS,
  FILM_WORDS_A,
  FILM_WORDS_B,
  GAME_STUDIOS,
  INSTRUMENTS,
  LOAN_PURPOSES,
  MICRO_REGIONS,
  NFT_COLLECTIONS,
  SNEAKERS,
  SPORTS_CLUBS,
  WATCH_BRANDS,
  WATCH_MODELS,
  WINE_REGIONS,
  WINERIES,
} from '../../data/catalogNames';
import { FIRST_NAMES } from '../../data/names';
import { dateFromTick, HOURS_PER_DAY } from '../../economy/calendar';
import { fromCents, toCents, transfer } from '../../economy/ledger';
import { esNum, publishNews } from '../../economy/news';
import { discoverConcept } from '../../economy/notebook';
import { lognormal, makeInstrument, payCost, payIncome, positionValue, type Ctx } from '../helpers';
import type { ClassRules } from '../rules';
import type { Instrument, Position } from '../types';

// ---------------------------------------------------------------------------
// Coleccionismo
// ---------------------------------------------------------------------------

const COLLECTIBLE_KINDS = [
  { sub: 'arte', w: 30, median: 9000, sigma: 1.5, vol: 0.14, authentic: 0.92, storage: 0.01 },
  {
    sub: 'coche clásico',
    w: 11,
    median: 65_000,
    sigma: 0.9,
    vol: 0.1,
    authentic: 0.97,
    storage: 0.02,
  },
  { sub: 'reloj', w: 15, median: 11_000, sigma: 1, vol: 0.1, authentic: 0.9, storage: 0.008 },
  { sub: 'vino', w: 14, median: 900, sigma: 1.1, vol: 0.08, authentic: 0.95, storage: 0.006 },
  { sub: 'cómic', w: 6, median: 2500, sigma: 1.2, vol: 0.18, authentic: 0.97, storage: 0.005 },
  { sub: 'cartas', w: 6, median: 1400, sigma: 1.4, vol: 0.25, authentic: 0.92, storage: 0.005 },
  { sub: 'zapatillas', w: 5, median: 700, sigma: 0.8, vol: 0.22, authentic: 0.86, storage: 0.005 },
  {
    sub: 'instrumento',
    w: 3,
    median: 45_000,
    sigma: 1.2,
    vol: 0.07,
    authentic: 0.94,
    storage: 0.01,
  },
  { sub: 'antigüedad', w: 5, median: 7000, sigma: 1.1, vol: 0.09, authentic: 0.88, storage: 0.008 },
  { sub: 'NFT', w: 3, median: 2500, sigma: 1.3, vol: 0.55, authentic: 1, storage: 0 },
] as const;

function hypeKey(ctx: Ctx, key: string): string {
  const k = `hype:${key}`;
  if (ctx.inv.factors[k] === undefined) ctx.inv.factors[k] = 0;
  return k;
}

function makeCollectible(ctx: Ctx, expires: number): Instrument {
  const { rng } = ctx;
  const kind = rng.weighted(COLLECTIBLE_KINDS, (k) => k.w);
  const year = dateFromTick(ctx.state.tick).year;
  let name = '';
  let key: string = kind.sub;
  const attrs: Instrument['attrs'] = {};
  let drift = 0.01;
  const load: Record<string, number> = { lux: 1 };
  switch (kind.sub) {
    case 'arte': {
      const artist = rng.pick(ARTISTS);
      key = artist;
      name = `${artist} — ${rng.pick(['Sin título', 'Bahía al anochecer', 'Retrato de un banquero', 'Composición', 'Grúas', 'La subasta', 'Mercado', 'Autorretrato'])} (${rng.pick(ART_KINDS)}, ${rng.int(1960, year)})`;
      attrs['artist'] = artist;
      break;
    }
    case 'coche clásico': {
      const make = rng.pick(CAR_MAKES);
      key = make;
      name = `${make} ${rng.pick(CAR_MODELS)} ${rng.int(1955, 1998)}`;
      attrs['km'] = rng.int(8_000, 180_000);
      break;
    }
    case 'reloj': {
      const brand = rng.pick(WATCH_BRANDS);
      key = brand;
      name = `${brand} ${rng.pick(WATCH_MODELS)} ref. ${rng.int(1000, 9999)}`;
      attrs['papers'] = rng.chance(0.6) ? 'caja y documentación' : 'sin documentación';
      break;
    }
    case 'vino': {
      const vintage = rng.int(1985, year - 3);
      name = `Caja de 12 · ${rng.pick(WINERIES)} ${rng.pick(WINE_REGIONS)} ${vintage}`;
      attrs['vintage'] = vintage;
      drift = 0.045;
      break;
    }
    case 'cómic':
      name = `${rng.pick(COMICS)} · grado ${esNum(rng.range(5, 9.8), 1)}`;
      key = 'comics';
      break;
    case 'cartas':
      name = `${rng.pick(CARD_SETS)} · carta ${rng.pick(['holográfica', 'firmada', 'error de impresión', 'edición limitada'])}`;
      key = 'cards';
      break;
    case 'zapatillas':
      name = `${rng.pick(SNEAKERS)} talla ${rng.int(38, 46)} (sin estrenar)`;
      key = 'sneakers';
      drift = -0.04;
      break;
    case 'instrumento':
      name = rng.pick(INSTRUMENTS);
      break;
    case 'antigüedad':
      name = rng.pick(ANTIQUES);
      break;
    case 'NFT':
      name = `${rng.pick(NFT_COLLECTIONS)} #${rng.int(1, 9999)}`;
      key = 'nft';
      drift = -0.35;
      load['crypto'] = 0.7;
      load['lux'] = 0.3;
      break;
  }
  load[hypeKey(ctx, key)] = 1;
  const value =
    Math.round(Math.max(kind.median * 0.12, lognormal(rng, kind.median, kind.sigma)) / 10) * 10;
  return makeInstrument(ctx, {
    cls: 'collectible',
    sub: kind.sub,
    name,
    region: 'castelia',
    price: value,
    load,
    vol: kind.vol,
    drift,
    unique: true,
    expiresInDays: expires,
    attrs: {
      ...attrs,
      condition: rng.pick(['excelente', 'muy bueno', 'bueno', 'restaurado']),
      provenance: rng.pick([
        'colección particular',
        'herencia',
        'galería',
        'subasta anterior',
        'sin procedencia clara',
      ]),
      storage: kind.storage,
    },
    hidden: {
      authentic: rng.chance(kind.authentic),
      peak: kind.sub === 'vino' ? Number(attrs['vintage']) + rng.int(12, 35) : 0,
    },
  });
}

export const collectibleRules: ClassRules = {
  id: 'collectible',
  cadence: 'monthly',
  liquidity: 'auction',
  counterparty: 'world',
  // Margen del marchante al comprar y comisión de la casa de subastas al vender.
  fees: { spread: 0.1, buy: 0.05, sell: 0, min: 40, sellAgent: 0.12 },
  execution: 'close',
  research: (inst) => ({
    costs: [15 + inst.price * 0.015, 40 + inst.price * 0.035, 100 + inst.price * 0.07],
    days: [3, 10, 25],
  }),
  generate(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < 1260; i++) out.push(makeCollectible(ctx, ctx.rng.int(15, 330)));
    return out;
  },
  spawnWeekly(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < ctx.rng.int(30, 42); i++)
      out.push(makeCollectible(ctx, ctx.rng.int(60, 300)));
    return out;
  },
  monthly(ctx, inst, pos) {
    const { state, rng } = ctx;
    // El vino mejora hasta su punto óptimo y después decae.
    if (inst.sub === 'vino' && dateFromTick(state.tick).year > Number(inst.hidden['peak']))
      inst.drift = -0.05;
    if (!pos) return;
    payCost(
      state,
      'world',
      Math.round((positionValue(state, inst, pos) * Number(inst.attrs['storage'] ?? 0.01)) / 12),
      `Seguro y custodia ${inst.name}`.slice(0, 70),
    );
    // Escándalo de falsificaciones: a veces la verdad sale sola.
    if (inst.hidden['authentic'] === false && rng.chance(0.01)) {
      inst.attrs['fake'] = true;
      inst.idio += Math.log(0.05);
      state.outbox.push({
        type: 'warning',
        tick: state.tick,
        message: `Un experto denuncia que tu "${inst.name}" es una falsificación`,
        ref: inst.id,
      });
      discoverConcept(state, 'falsificacion');
    }
  },
  onBuy(ctx) {
    discoverConcept(ctx.state, 'coleccionismo');
  },
};

// ---------------------------------------------------------------------------
// Entretenimiento y deporte
// ---------------------------------------------------------------------------

function makeEntertainment(ctx: Ctx, expires: number): Instrument {
  const { rng, state } = ctx;
  const sub = rng.weighted(
    ['película', 'álbum', 'videojuego', 'gira', 'atleta', 'club'] as const,
    (s) => ({ película: 6, álbum: 4, videojuego: 4, gira: 2.5, atleta: 3, club: 2 })[s],
  );
  const quality = rng.next();
  const base = {
    sub,
    region: 'castelia' as const,
    cls: 'entertainment' as const,
    expiresInDays: expires,
  };
  if (sub === 'atleta') {
    const who = rng.pick(ATHLETES);
    return makeInstrument(ctx, {
      ...base,
      name: `Derechos de imagen de ${who} (5 años)`,
      price: 1000,
      drift: -0.2,
      vol: 0.2,
      yield: rng.range(0.14, 0.24),
      attrs: {
        athlete: who,
        sport: rng.pick(['fútbol', 'tenis', 'baloncesto', 'atletismo', 'e-sports']),
        years: 5,
        secondaryDiscount: 0.3,
      },
      hidden: { talent: quality },
    });
  }
  if (sub === 'club') {
    const club = rng.pick(SPORTS_CLUBS);
    return makeInstrument(ctx, {
      ...base,
      name: `Acciones del ${club}`,
      price: Math.round(lognormal(rng, 120, 0.5)),
      load: { eq: 0.3, [hypeKeyE(ctx, club)]: 1 },
      vol: 0.22,
      yield: 0.012,
      attrs: { club, league: rng.pick(['Primera', 'Segunda']), secondaryDiscount: 0.08 },
      hidden: { talent: quality },
      expiresInDays: undefined,
    });
  }
  const months = rng.int(6, 30);
  const title =
    sub === 'película'
      ? `"${rng.pick(FILM_WORDS_A)} ${rng.pick(FILM_WORDS_B)}"`
      : sub === 'álbum'
        ? `Nuevo álbum de ${rng.pick(ARTISTS_MUSIC)}`
        : sub === 'videojuego'
          ? `${rng.pick(GAME_STUDIOS)}: "${rng.pick(['Operación', 'Leyendas de', 'Tycoon de', 'Crónicas de'])} ${rng.pick(FILM_WORDS_B)}"`
          : `Gira mundial de ${rng.pick(ARTISTS_MUSIC)}`;
  return makeInstrument(ctx, {
    ...base,
    name: `${sub === 'película' ? 'Película' : sub === 'videojuego' ? 'Videojuego' : ''} ${title}`.trim(),
    price: 500,
    attrs: {
      release: state.tick + months * 30 * HOURS_PER_DAY,
      budget: Math.round(lognormal(rng, sub === 'película' ? 6e6 : 1.5e6, 0.8)),
      director: `${rng.pick(FIRST_NAMES)} ${rng.pick(['Montenegro', 'Castell', 'Holt', 'Iturbe', 'Zhao'])}`,
      secondaryDiscount: 0.5,
    },
    hidden: { hit: quality, overrun: rng.range(0, 0.06) },
  });
}

function hypeKeyE(ctx: Ctx, key: string): string {
  return hypeKey(ctx, key);
}

export const entertainmentRules: ClassRules = {
  id: 'entertainment',
  cadence: 'monthly',
  liquidity: 'secondary',
  counterparty: 'world',
  fees: { spread: 0, buy: 0.03, sell: 0.03, min: 20 },
  secondaryDiscount: 0.4,
  execution: 'close',
  research: () => ({ costs: [120, 400, 1100], days: [4, 12, 25] }),
  generate(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < 230; i++) out.push(makeEntertainment(ctx, ctx.rng.int(20, 120)));
    return out;
  },
  spawnWeekly(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < ctx.rng.int(12, 20); i++) {
      const e = makeEntertainment(ctx, ctx.rng.int(20, 90));
      if (e.sub !== 'club') out.push(e);
    }
    return out;
  },
  monthly(ctx, inst, pos) {
    const { state, rng } = ctx;
    if (inst.status !== 'open') return;
    const q = Number(inst.hidden['talent'] ?? inst.hidden['hit'] ?? 0.5);
    if (inst.sub === 'atleta') {
      if (!pos) return;
      const injured = Number(inst.attrs['injuredMonths'] ?? 0);
      if (injured > 0) inst.attrs['injuredMonths'] = injured - 1;
      else if (rng.chance(0.012)) {
        inst.attrs['injuredMonths'] = rng.int(3, 10);
        state.outbox.push({
          type: 'warning',
          tick: state.tick,
          message: `${inst.attrs['athlete']} se lesiona: meses sin competir ni patrocinios`,
          ref: inst.id,
        });
      }
      const form = injured > 0 ? 0.15 : Math.max(0.1, 0.5 + q + rng.gauss() * 0.25);
      payIncome(
        state,
        'world',
        Math.round((pos.qty * 100_000 * inst.yield * form) / 12),
        `Derechos de imagen ${inst.attrs['athlete']}`,
      );
      if (state.tick - pos.opened > 5 * 365 * HOURS_PER_DAY)
        finish(ctx, inst, pos, 0, 'fin del contrato de derechos');
      return;
    }
    if (inst.sub === 'club') {
      if (dateFromTick(state.tick).month === 5) {
        const promo = rng.chance(0.15 + q * 0.2);
        const releg = !promo && rng.chance(0.25 - q * 0.2);
        if (promo || releg) {
          inst.idio += promo ? 0.25 : -0.3;
          if (pos)
            publishNews(state, {
              category: 'corporate',
              headline: `${inst.attrs['club']} ${promo ? 'asciende' : 'desciende'} de categoría`,
              body: promo
                ? 'La afición celebra y las acciones se disparan.'
                : 'Menos ingresos por televisión: las acciones se hunden.',
              tags: [inst.id],
              tone: promo ? 0.7 : -0.7,
              importance: 1,
            });
        }
      }
      if (pos && dateFromTick(state.tick).month === 7)
        payIncome(
          state,
          'world',
          Math.round(positionValue(state, inst, pos) * inst.yield),
          `Dividendo ${inst.attrs['club']}`,
        );
      return;
    }
    // Proyectos: sobrecostes durante la producción y resultado al estrenarse.
    if (rng.chance(Number(inst.hidden['overrun'] ?? 0))) {
      inst.idio -= 0.15;
      if (pos)
        state.outbox.push({
          type: 'warning',
          tick: state.tick,
          message: `${inst.name}: rodaje con retrasos y sobrecostes`,
          ref: inst.id,
        });
    }
    if (state.tick < Number(inst.attrs['release'])) return;
    const r = rng.next();
    const mult =
      r < 0.5 * (1.5 - q)
        ? rng.range(0.02, 0.5)
        : r < 0.82
          ? rng.range(0.6, 1.4)
          : rng.chance(0.15 * q + 0.03)
            ? rng.range(5, 15)
            : rng.range(1.6, 3.5);
    const paid = inst.price * mult;
    if (pos || mult > 5)
      publishNews(state, {
        category: 'corporate',
        headline:
          mult > 5
            ? `Fenómeno inesperado: ${inst.name} arrasa en todo el mundo`
            : mult < 0.5
              ? `${inst.name} fracasa en taquilla`
              : `${inst.name} cumple expectativas`,
        body: 'Los inversores del proyecto reciben su parte de los ingresos.',
        tags: [inst.id],
        tone: mult > 1 ? 0.6 : -0.5,
        importance: pos ? 2 : 1,
      });
    finish(ctx, inst, pos, paid, 'estreno');
  },
  onBuy(ctx) {
    discoverConcept(ctx.state, 'entretenimiento');
  },
};

function finish(
  ctx: Ctx,
  inst: Instrument,
  pos: Position | undefined,
  perUnit: number,
  why: string,
): void {
  const { state } = ctx;
  inst.status = 'matured';
  inst.attrs['closedTick'] = state.tick;
  inst.price = perUnit;
  if (!pos) return;
  const cash = toCents(perUnit * pos.qty);
  if (cash > 0)
    transfer(
      state.ledger,
      state.tick,
      'world',
      'player:cash',
      cash,
      `Liquidación ${inst.name}`.slice(0, 70),
    );
  state.player.tax.realizedGainsYtd += cash - pos.cost;
  delete state.inv.positions[inst.id];
  state.outbox.push({
    type: cash > pos.cost ? 'dividend' : 'warning',
    tick: state.tick,
    message: `${inst.name} (${why}): recibes ${esNum(fromCents(cash), 0)} ₳ por una inversión de ${esNum(fromCents(pos.cost), 0)} ₳`,
    ref: inst.id,
  });
}

// ---------------------------------------------------------------------------
// Préstamos entre particulares (P2P) y microfinanzas
// ---------------------------------------------------------------------------

const RATINGS = [
  { r: 'A', rate: 0.052, pd: 0.012 },
  { r: 'B', rate: 0.074, pd: 0.03 },
  { r: 'C', rate: 0.105, pd: 0.06 },
  { r: 'D', rate: 0.145, pd: 0.11 },
  { r: 'E', rate: 0.2, pd: 0.19 },
] as const;
const PLATFORMS = [
  { name: 'Préstamos Vecinales', risk: 0.0003 },
  { name: 'KaiLend', risk: 0.001 },
  { name: 'MicroGrúa', risk: 0.0006 },
  { name: 'Crowdlending Atalaya', risk: 0.0002 },
  { name: 'FastCash P2P', risk: 0.004 },
] as const;
const P2P_UNIT = 25;

function makeLoan(ctx: Ctx, expires: number): Instrument {
  const { rng } = ctx;
  const micro = rng.chance(0.15);
  const rating = rng.weighted(RATINGS, (x) => ({ A: 2, B: 3, C: 3, D: 2, E: 1 })[x.r]);
  const platform = rng.pick(PLATFORMS);
  const rate = micro ? rng.range(0.035, 0.07) : rating.rate * rng.range(0.9, 1.15);
  const term = rng.pick([12, 18, 24, 36, 48, 60]);
  const amount = micro
    ? Math.round(lognormal(rng, 600, 0.5))
    : Math.round(lognormal(rng, 8000, 0.8) / 50) * 50;
  const truePd = Math.min(0.6, (micro ? 0.04 : rating.pd) * lognormal(rng, 1, 0.55));
  return makeInstrument(ctx, {
    cls: 'p2p',
    sub: micro ? 'microcrédito' : amount > 15_000 ? 'pyme' : 'personal',
    name: micro
      ? `Microcrédito en ${rng.pick(MICRO_REGIONS)} (${rng.pick(['taller de costura', 'puesto de mercado', 'cabras', 'barca de pesca', 'huerto'])})`
      : `${rating.r} · ${rng.pick(FIRST_NAMES)}, ${rng.pick(LOAN_PURPOSES)}`,
    region: 'castelia',
    price: P2P_UNIT,
    lot: 1,
    yield: rate,
    expiresInDays: expires,
    attrs: {
      rating: micro ? 'Social' : rating.r,
      rate,
      term,
      amount,
      platform: platform.name,
      monthsLeft: term,
      outstanding: 1,
      secondaryDiscount: 0.06,
    },
    hidden: { pd: truePd, platformRisk: platform.risk },
  });
}

export const p2pRules: ClassRules = {
  id: 'p2p',
  cadence: 'none',
  liquidity: 'secondary',
  counterparty: 'world',
  fees: { spread: 0, buy: 0, sell: 0.01, min: 0 },
  secondaryDiscount: 0.06,
  execution: 'close',
  research: () => ({ costs: [5, 15, 40], days: [1, 3, 6] }),
  unlock: (_state, inst) => (inst.attrs['funded'] ? 'Préstamo ya financiado' : null),
  generate(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < 620; i++) out.push(makeLoan(ctx, ctx.rng.int(10, 70)));
    return out;
  },
  spawnWeekly(ctx) {
    const out: Instrument[] = [];
    for (let i = 0; i < ctx.rng.int(45, 65); i++) out.push(makeLoan(ctx, ctx.rng.int(20, 70)));
    return out;
  },
  monthly(ctx, inst, pos) {
    const { state, rng } = ctx;
    if (!pos || inst.status !== 'open') return;
    inst.attrs['funded'] = true;
    const outstanding = Number(inst.attrs['outstanding']);
    const n = Number(inst.attrs['monthsLeft']);
    const r = Number(inst.attrs['rate']) / 12;
    if (
      rng.chance(Number(inst.hidden['pd']) / 12) ||
      rng.chance(Number(inst.hidden['platformRisk']))
    ) {
      // Impago: se recupera una parte meses después (aquí, de golpe y descontada).
      const recovery = rng.range(0.15, 0.4);
      const cash = toCents(P2P_UNIT * outstanding * recovery * pos.qty);
      if (cash > 0)
        transfer(
          state.ledger,
          state.tick,
          'world',
          'player:cash',
          cash,
          `Recobro ${inst.name}`.slice(0, 70),
        );
      state.player.tax.realizedGainsYtd += cash - pos.cost;
      delete state.inv.positions[inst.id];
      inst.status = 'failed';
      inst.attrs['closedTick'] = state.tick;
      inst.price = 0;
      state.outbox.push({
        type: 'warning',
        tick: state.tick,
        message: `Impago en ${inst.name}: recuperas el ${esNum(recovery * 100, 0)} % pendiente`,
        ref: inst.id,
      });
      discoverConcept(state, 'impago');
      return;
    }
    const pmt = (outstanding * r) / (1 - Math.pow(1 + r, -n));
    const interest = outstanding * r;
    const principal = Math.min(outstanding, pmt - interest);
    const principalCents = toCents(P2P_UNIT * principal * pos.qty);
    transfer(
      state.ledger,
      state.tick,
      'world',
      'player:cash',
      principalCents,
      `Devolución capital ${inst.name}`.slice(0, 70),
    );
    payIncome(
      state,
      'world',
      toCents(P2P_UNIT * interest * pos.qty),
      `Intereses ${inst.name}`.slice(0, 70),
    );
    pos.cost = Math.max(0, pos.cost - principalCents);
    inst.attrs['outstanding'] = outstanding - principal;
    inst.attrs['monthsLeft'] = n - 1;
    inst.price = P2P_UNIT * (outstanding - principal);
    if (n - 1 <= 0 || inst.price < 0.01) {
      state.player.tax.realizedGainsYtd -= pos.cost;
      delete state.inv.positions[inst.id];
      inst.status = 'matured';
      inst.attrs['closedTick'] = state.tick;
    }
  },
  onBuy(ctx) {
    discoverConcept(ctx.state, 'p2p');
  },
};

// ---------------------------------------------------------------------------
// Filantropía
// ---------------------------------------------------------------------------

export const philanthropyRules: ClassRules = {
  id: 'philanthropy',
  cadence: 'none',
  liquidity: 'none',
  counterparty: 'world',
  fees: { spread: 0, buy: 0, sell: 0, min: 0 },
  execution: 'close',
  generate(ctx) {
    return CAUSES.map((c) =>
      makeInstrument(ctx, {
        cls: 'philanthropy',
        sub: c.faction,
        name: c.name,
        region: 'castelia',
        price: 1,
        attrs: { faction: c.faction, unit: '1 ₳ donado' },
      }),
    );
  },
  onBuy(ctx, inst, _pos, qty) {
    const { inv, state } = ctx;
    const amount = toCents(qty);
    inv.donationsYtd += amount;
    const faction = String(inst.attrs['faction']);
    inv.reputation[faction] = (inv.reputation[faction] ?? 0) + Math.sqrt(qty) / 5;
    discoverConcept(state, 'filantropia');
  },
};
