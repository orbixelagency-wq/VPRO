/**
 * Mercados financieros alternativos: criptoactivos, materias primas y divisas.
 */
import { COMMODITIES } from '../../data/commodities';
import { COUNTRIES, HOME_COUNTRY_ID } from '../../data/countries';
import { CRYPTO_MAJORS, CRYPTO_PREFIX, CRYPTO_SUFFIX } from '../../data/catalogNames';
import { HOURS_PER_DAY } from '../../economy/calendar';
import { transfer } from '../../economy/ledger';
import { esNum, publishNews } from '../../economy/news';
import { discoverConcept } from '../../economy/notebook';
import { lognormal, makeInstrument, payCost, payIncome, positionValue, type Ctx } from '../helpers';
import type { ClassRules } from '../rules';
import type { Instrument } from '../types';

// ---------------------------------------------------------------------------
// Cripto
// ---------------------------------------------------------------------------

const CRYPTO_KINDS = [
  { sub: 'memecoin', w: 35, beta: 1.8, vol: 1.7, legit: 0.3, stake: 0, spread: 0.03 },
  { sub: 'DeFi', w: 20, beta: 1.5, vol: 1.1, legit: 0.55, stake: [0.05, 0.3], spread: 0.015 },
  { sub: 'capa 1', w: 12, beta: 1.3, vol: 0.95, legit: 0.7, stake: [0.03, 0.09], spread: 0.01 },
  { sub: 'gaming', w: 10, beta: 1.6, vol: 1.25, legit: 0.45, stake: 0, spread: 0.02 },
  { sub: 'IA', w: 10, beta: 1.7, vol: 1.3, legit: 0.45, stake: 0, spread: 0.02 },
  {
    sub: 'activos reales',
    w: 10,
    beta: 0.8,
    vol: 0.5,
    legit: 0.7,
    stake: [0.03, 0.07],
    spread: 0.012,
  },
  { sub: 'stablecoin', w: 3, beta: 0, vol: 0.01, legit: 0.8, stake: [0.03, 0.12], spread: 0.004 },
] as const;

function cryptoName(ctx: Ctx, used: Set<string>): { name: string; ticker: string } {
  for (let i = 0; i < 50; i++) {
    const name = `${ctx.rng.pick(CRYPTO_PREFIX)}${ctx.rng.pick(CRYPTO_SUFFIX)}`;
    const ticker = name
      .replace(/[^A-Za-z]/g, '')
      .toUpperCase()
      .slice(0, ctx.rng.int(3, 5));
    if (!used.has(ticker)) {
      used.add(ticker);
      return { name, ticker };
    }
  }
  const t = `X${used.size}`;
  used.add(t);
  return { name: `Token ${t}`, ticker: t };
}

function makeToken(ctx: Ctx, used: Set<string>, launch: boolean): Instrument {
  const { rng } = ctx;
  const kind = rng.weighted(CRYPTO_KINDS, (k) => k.w);
  const { name, ticker } = cryptoName(ctx, used);
  const legit = rng.chance(kind.legit);
  const stake = Array.isArray(kind.stake)
    ? rng.range(kind.stake[0], kind.stake[1]) * (legit ? 1 : 1.8)
    : 0;
  const price = kind.sub === 'stablecoin' ? 1 : lognormal(rng, launch ? 0.05 : 0.8, 2.2);
  const drift =
    kind.sub === 'stablecoin'
      ? 0
      : legit
        ? rng.gauss() * 0.25 + 0.05
        : rng.gauss() * 0.4 - 1.1 + (launch ? 0.9 : 0);
  return makeInstrument(ctx, {
    cls: 'crypto',
    sub: kind.sub,
    name: `${name} (${ticker})`,
    region: 'columbria',
    ccy: 'columbria',
    price,
    load: { crypto: kind.beta * rng.range(0.8, 1.2) },
    vol: kind.vol * rng.range(0.8, 1.2),
    drift,
    yield: stake,
    attrs: {
      ticker,
      spread: kind.spread,
      staking: stake,
      launched: launch ? 'Nuevo lanzamiento' : 'Establecido',
      holders: Math.round(lognormal(rng, launch ? 800 : 20000, 1.3)),
    },
    hidden: {
      legit,
      rugRisk: legit ? 0.002 : rng.range(0.01, 0.07),
      depegRisk: kind.sub === 'stablecoin' ? (legit ? 0.004 : 0.05) : 0,
    },
  });
}

export const cryptoRules: ClassRules = {
  id: 'crypto',
  cadence: 'daily',
  liquidity: 'instant',
  counterparty: 'market',
  fees: { spread: 0.012, buy: 0.001, sell: 0.001, min: 1 },
  execution: 'close',
  research: () => ({ costs: [20, 90, 300], days: [1, 4, 10] }),
  generate(ctx) {
    const used = new Set<string>();
    const out: Instrument[] = [];
    const majorPrices: Record<string, number> = {
      AURC: 42_000,
      ETHR: 2_300,
      SOLC: 95,
      VUSD: 1,
      ATLT: 1,
      CRDL: 0.55,
      PKVS: 7.2,
      SHLG: 3.1,
    };
    for (const m of CRYPTO_MAJORS) {
      used.add(m.ticker);
      const stable = 'stable' in m && m.stable;
      out.push(
        makeInstrument(ctx, {
          cls: 'crypto',
          sub: stable ? 'stablecoin' : 'principal',
          name: `${m.name} (${m.ticker})`,
          region: 'columbria',
          ccy: 'columbria',
          price: majorPrices[m.ticker] ?? 1,
          load: { crypto: m.beta },
          vol: stable ? 0.01 : m.vol * 0.6,
          drift: stable ? 0 : 0.02,
          yield: stable ? 0.04 : m.ticker === 'ETHR' ? 0.035 : 0,
          attrs: {
            ticker: m.ticker,
            spread: 0.004,
            staking: stable ? 0.04 : 0,
            launched: 'Establecido',
            marketCapBn: m.mcap,
          },
          hidden: {
            legit: m.legit > 0.9 || ctx.rng.chance(m.legit),
            rugRisk: 0.0005,
            depegRisk: stable ? 0.004 : 0,
          },
        }),
      );
    }
    for (let i = 0; i < 312; i++) out.push(makeToken(ctx, used, false));
    return out;
  },
  spawnWeekly(ctx) {
    const used = new Set(
      ctx.inv.instruments.filter((i) => i.cls === 'crypto').map((i) => String(i.attrs['ticker'])),
    );
    const out: Instrument[] = [];
    const n = ctx.inv.crypto.regime === 'bull' ? ctx.rng.int(3, 6) : ctx.rng.int(1, 2);
    for (let i = 0; i < n; i++) out.push(makeToken(ctx, used, true));
    return out;
  },
  monthly(ctx, inst, pos) {
    const { state, rng } = ctx;
    if (inst.status !== 'open') return;
    if (rng.chance(Number(inst.hidden['rugRisk'] ?? 0))) {
      inst.idio += Math.log(0.02);
      inst.price *= 0.02;
      inst.status = 'failed';
      inst.attrs['closedTick'] = state.tick;
      if (pos || rng.chance(0.2))
        publishNews(state, {
          category: 'scandal',
          headline: `Tirón de alfombra: los creadores de ${inst.name} desaparecen con los fondos`,
          body: 'El token pierde el 98 % de su valor en minutos. La web del proyecto ya no carga.',
          tags: [inst.id],
          tone: -1,
          importance: pos ? 3 : 1,
        });
      if (pos) discoverConcept(state, 'rug_pull');
      return;
    }
    if (
      inst.sub === 'stablecoin' &&
      inst.price > 0.9 &&
      rng.chance(Number(inst.hidden['depegRisk'] ?? 0) / 12)
    ) {
      const to = rng.range(0.35, 0.9);
      inst.idio += Math.log(to);
      publishNews(state, {
        category: 'systemic',
        headline: `${inst.name} pierde la paridad: cotiza a ${esNum(to, 2)} dólares`,
        body: 'Las reservas que la respaldaban no eran lo que parecían.',
        tags: [inst.id],
        tone: -0.9,
        importance: 2,
      });
    }
    if (inst.price < inst.base * 0.02 && inst.sub !== 'stablecoin') {
      inst.status = 'failed';
      inst.attrs['closedTick'] = state.tick;
    }
    if (pos && inst.yield > 0) {
      payIncome(
        state,
        'market',
        Math.round((positionValue(state, inst, pos) * inst.yield) / 12),
        `Staking ${inst.attrs['ticker']}`,
      );
      discoverConcept(state, 'staking');
    }
    if (pos && !inst.hidden['legit'] && rng.chance(0.15)) discoverConcept(state, 'rug_pull');
  },
  onBuy(ctx) {
    discoverConcept(ctx.state, 'cripto');
  },
};

/** Hackeo de un exchange: golpe a todo el mercado cripto (llamado cada mes). */
export function maybeExchangeHack(ctx: Ctx): void {
  const { state, rng, inv } = ctx;
  if (!rng.chance(0.012)) return;
  inv.factors['crypto'] = (inv.factors['crypto'] ?? 0) - 0.18;
  publishNews(state, {
    category: 'systemic',
    headline: `Hackeo en ${rng.pick(['KaiEx', 'Valmera Exchange', 'CoinLonja', 'Atlantic Crypto'])}: roban criptomonedas por valor de ${rng.int(200, 1500)} millones`,
    body: 'El exchange congela las retiradas. Todo el mercado cripto se desploma y los reguladores prometen mano dura.',
    tags: ['crypto'],
    tone: -0.9,
    importance: 2,
  });
}

// ---------------------------------------------------------------------------
// Materias primas
// ---------------------------------------------------------------------------

export const commodityRules: ClassRules = {
  id: 'commodity',
  cadence: 'daily',
  liquidity: 'instant',
  counterparty: 'market',
  fees: { spread: 0.006, buy: 0.002, sell: 0.002, min: 3 },
  execution: 'close',
  generate(ctx) {
    const out: Instrument[] = [];
    for (const cd of COMMODITIES) {
      out.push(
        makeInstrument(ctx, {
          cls: 'commodity',
          sub: 'certificado',
          name: `Certificado ${cd.name} (1 ${cd.unit})`,
          region: 'columbria',
          ccy: 'columbria',
          price: cd.price,
          load: { [`cmd:${cd.id}`]: 1 },
          drift: -0.008,
          attrs: { unit: cd.unit, commodity: cd.name, spread: 0.006 },
        }),
      );
    }
    const physical = [
      { name: 'Lingote de oro 1 onza', cmd: 'oro', oz: 1, prem: 0.05 },
      { name: 'Lingote de oro 100 g', cmd: 'oro', oz: 3.215, prem: 0.035 },
      { name: 'Lingote de oro 1 kg', cmd: 'oro', oz: 32.15, prem: 0.02 },
      { name: 'Moneda Soberano de Castelia (oro)', cmd: 'oro', oz: 0.2354, prem: 0.08 },
      { name: 'Moneda Gaviota de plata', cmd: 'plata', oz: 1, prem: 0.18 },
      { name: 'Lingote de plata 1 kg', cmd: 'plata', oz: 32.15, prem: 0.09 },
      {
        name: 'Barril físico de aceite de oliva (bodega La Vega)',
        cmd: 'aceite',
        oz: 0.19,
        prem: 0.12,
      },
    ];
    for (const p of physical) {
      const px = COMMODITIES.find((c) => c.id === p.cmd)!.price * p.oz;
      out.push(
        makeInstrument(ctx, {
          cls: 'commodity',
          sub: 'físico',
          name: p.name,
          region: 'columbria',
          ccy: 'columbria',
          price: px,
          load: { [`cmd:${p.cmd}`]: 1 },
          attrs: { spread: p.prem * 2, storage: 0.006, commodity: p.cmd },
        }),
      );
    }
    return out;
  },
  monthly(ctx, inst, pos) {
    if (!pos || !inst.attrs['storage']) return;
    payCost(
      ctx.state,
      'world',
      Math.round((positionValue(ctx.state, inst, pos) * Number(inst.attrs['storage'])) / 12),
      `Custodia y seguro ${inst.name}`,
    );
  },
  onBuy(ctx) {
    discoverConcept(ctx.state, 'materias_primas');
  },
};

// ---------------------------------------------------------------------------
// Divisas
// ---------------------------------------------------------------------------

function repriceFx(ctx: Ctx, inst: Instrument): void {
  inst.price = ctx.state.countries.find((c) => c.id === inst.region)?.fx ?? inst.price;
}

export const forexRules: ClassRules = {
  id: 'forex',
  cadence: 'daily',
  liquidity: 'instant',
  counterparty: 'market',
  fees: { spread: 0.004, buy: 0.001, sell: 0.001, min: 2 },
  execution: 'close',
  generate(ctx) {
    const out: Instrument[] = [];
    for (const c of COUNTRIES) {
      if (c.id === HOME_COUNTRY_ID) continue;
      const fx = ctx.state.countries.find((x) => x.id === c.id)!.fx;
      out.push(
        makeInstrument(ctx, {
          cls: 'forex',
          sub: 'cuenta en divisa',
          name: `Cuenta en ${c.currency.name} (${c.currency.code})`,
          region: c.id,
          price: fx,
          lot: 100,
          attrs: { currency: c.currency.code },
        }),
      );
      for (const months of [3, 6, 12]) {
        out.push(
          makeInstrument(ctx, {
            cls: 'forex',
            sub: 'depósito en divisa',
            name: `Depósito ${months} meses en ${c.currency.code}`,
            region: c.id,
            price: fx,
            lot: 1000,
            attrs: {
              currency: c.currency.code,
              months,
              liquidity: 'secondary',
              secondaryDiscount: 0.015,
            },
          }),
        );
      }
    }
    return out;
  },
  reprice: repriceFx,
  monthly(ctx, inst, pos) {
    const { state } = ctx;
    if (!pos) return;
    const country = state.countries.find((c) => c.id === inst.region)!;
    if (inst.sub === 'cuenta en divisa') {
      const r = Math.max(0, country.policyRate - 0.005);
      payIncome(
        state,
        'market',
        Math.round((positionValue(state, inst, pos) * r) / 12),
        `Intereses cuenta ${inst.attrs['currency']}`,
      );
      return;
    }
    // Depósito en divisa: al vencer se cobran los intereses y se reconvierte a áureos.
    const months = Number(inst.attrs['months']);
    if (state.tick - pos.opened < months * 30 * HOURS_PER_DAY) return;
    const value = positionValue(state, inst, pos);
    const r = Math.max(0, country.policyRate - 0.002);
    transfer(state.ledger, state.tick, 'market', 'player:cash', value, `Vencimiento ${inst.name}`);
    payIncome(state, 'market', Math.round((value * r * months) / 12), `Intereses ${inst.name}`);
    state.player.tax.realizedGainsYtd += value - pos.cost;
    delete state.inv.positions[inst.id];
    discoverConcept(state, 'divisa');
  },
  onBuy(ctx) {
    discoverConcept(ctx.state, 'divisa');
  },
};
