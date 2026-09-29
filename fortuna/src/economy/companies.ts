import { HOME_COUNTRY_ID } from '../data/countries';
import { HOURS_PER_DAY } from './calendar';
import { generateCompany, indexRawValue, type CompanyContext } from './generate';
import { toCents, transfer } from './ledger';
import { esNum, publishNews, type RumorResolution } from './news';
import { discoverConcept } from './notebook';
import { Rng } from './rng';
import type { Company, SimState } from './types';
import {
  companyRating,
  countryDef,
  RATING_ORDER,
  fairValuePerShare,
  getCountry,
  sectorDef,
  sum,
} from './valuation';

const fmtPct = (x: number) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(1).replace('.', ',')} %`;

/** Presentación de resultados trimestrales. */
export function reportEarnings(state: SimState, c: Company, rng: Rng): void {
  const sec = sectorDef(c.sector);
  const country = getCountry(state, c.country);
  const cdef = countryDef(c.country);
  const g = state.global;
  const gap = country.gdpGrowth - cdef.trendGrowth;
  let shock = 0;
  if (g.shock) {
    const s = g.shock;
    const hurt: Record<string, string[]> = {
      banking_crisis: ['finance', 'realestate'],
      pandemic: ['discretionary', 'energy', 'industrial'],
      trade_war: ['industrial', 'materials', 'tech'],
      oil_shock: ['discretionary', 'industrial'],
      tech_crash: ['tech'],
    };
    if (hurt[s.kind]?.includes(c.sector)) shock -= 0.06 * s.severity;
    if (s.kind === 'pandemic' && c.sector === 'health') shock += 0.04 * s.severity;
  }
  // Margen estructural: deriva aleatoria con reversión a la calidad del negocio.
  const structural = sec.baseMargin * (0.55 + 0.9 * c.hidden.quality);
  c.targetMargin *= Math.exp(
    rng.gauss() * 0.05 + 0.15 * Math.log(structural / Math.max(0.005, c.targetMargin)),
  );
  // Golpes de negocio: pérdida de un cliente, producto fallido, competidor agresivo.
  let businessHit = 0;
  if (rng.chance(0.03 * (1.6 - c.hidden.quality))) {
    businessHit = rng.range(0.05, 0.16);
    c.targetMargin *= rng.range(0.35, 0.8);
    publishNews(state, {
      category: 'corporate',
      headline: `${c.name} lanza un aviso de beneficios: ${rng.pick(['pierde a su mayor cliente', 'su nuevo producto no despega', 'un competidor le arrebata cuota', 'problemas en su principal fábrica'])}`,
      body: 'La compañía rebaja sus previsiones para el año. Los analistas recortan precios objetivo.',
      tags: [c.id],
      tone: -0.7,
      importance: 2,
    });
    c.sentiment -= 0.06;
  } else if (rng.chance(0.025 * (0.5 + c.hidden.quality))) {
    // Y también golpes de suerte: un gran contrato, un producto que triunfa.
    businessHit = -rng.range(0.06, 0.2);
    c.targetMargin *= rng.range(1.05, 1.3);
    c.growth += 0.01;
    publishNews(state, {
      category: 'corporate',
      headline: `${c.name} ${rng.pick(['firma el mayor contrato de su historia', 'arrasa con su nuevo producto', 'entra con fuerza en un mercado nuevo', 'gana cuota a su principal rival'])}`,
      body: 'La dirección eleva sus previsiones de ingresos y márgenes.',
      tags: [c.id],
      tone: 0.7,
      importance: 2,
    });
    c.sentiment += 0.05;
  }
  const lastRev = c.quarterlyRevenue[3] ?? c.revenueTtm / 4;
  // Crecimiento nominal: estructural + desvío de la inflación + ciclo.
  const inflationDrift = country.inflation - cdef.inflationTarget;
  const revGrowthQ =
    (c.growth + inflationDrift + sec.cyclicality * gap) / 4 +
    shock -
    businessHit +
    rng.gauss() * 0.015;
  const rev = Math.max(0.1, lastRev * Math.exp(revGrowthQ));
  // Apalancamiento operativo: el margen sufre más que las ventas en las recesiones.
  let targetMargin =
    c.targetMargin * (1 + (2 + 3 * (1 - c.hidden.quality)) * sec.cyclicality * gap + shock * 1.5);
  if (c.sector === 'energy') targetMargin *= Math.pow(g.oil / 78, 0.8);
  else targetMargin *= 1 - 0.04 * Math.log(g.oil / 78);
  c.margin += 0.35 * (targetMargin - c.margin) + rng.gauss() * 0.004;
  c.margin = Math.max(-0.4, Math.min(0.6, c.margin));
  const rateCost =
    country.policyRate +
    0.015 +
    country.spread +
    (RATING_ORDER.indexOf(companyRating(c)) >= 4 ? 0.02 : 0);
  const interest = (c.debt * rateCost) / 4;
  const realEarnings = rev * c.margin - interest;
  // El fraude infla los beneficios publicados.
  const reported = c.hidden.fraud
    ? realEarnings + rev * c.hidden.fraudSeverity * 0.15
    : realEarnings;

  c.quarterlyRevenue.push(rev);
  c.quarterlyRevenue.shift();
  c.quarterlyEarnings.push(reported);
  c.quarterlyEarnings.shift();
  c.revenueTtm = sum(c.quarterlyRevenue);

  const eps = reported / c.sharesOutstanding;
  const surprise = (eps - c.consensusEps) / Math.max(Math.abs(c.consensusEps), 1e-6);
  const clamped = Math.max(-1, Math.min(1, surprise));
  c.sentiment += clamped * 0.09;

  // Caja, dividendos y deuda.
  const payout = Math.max(0, sec.payout + (c.hidden.quality - 0.5) * 0.2);
  const newDps = realEarnings > 0 ? eps * payout : c.dividendPerShare * 0.3;
  const cut = newDps < c.dividendPerShare * 0.8 && c.dividendPerShare > 0;
  c.dividendPerShare = Math.max(0, newDps);
  const dividends = c.dividendPerShare * c.sharesOutstanding;
  const investment = rev * Math.max(0, c.growth) * 0.35;
  c.cash += realEarnings - dividends - investment;
  const buffer = rev * 0.15;
  if (c.cash < buffer) {
    c.debt += buffer - c.cash;
    c.cash = buffer;
  } else if (c.cash > rev * 1.2 && c.debt > 0) {
    const repay = Math.min(c.debt, c.cash - rev * 1.2);
    c.debt -= repay;
    c.cash -= repay;
  }
  c.growth += 0.1 * (sec.baseGrowth + (cdef.trendGrowth - 0.02) - c.growth) + rng.gauss() * 0.005;
  c.consensusEps =
    eps * (1 + c.growth / 4) * (1 + rng.gauss() * 0.03) + (gap < -0.01 ? -Math.abs(eps) * 0.05 : 0);

  const beat = surprise > 0.03;
  const miss = surprise < -0.03;
  publishNews(state, {
    category: 'earnings',
    headline: beat
      ? `${c.name} bate previsiones: beneficio ${fmtPct(surprise)} sobre el consenso`
      : miss
        ? `${c.name} decepciona: beneficio ${fmtPct(surprise)} frente a lo esperado`
        : `${c.name} presenta resultados en línea con lo esperado`,
    body: `Ingresos trimestrales de ${esNum(rev, 0)} M, margen del ${esNum(c.margin * 100, 1)} %. ${
      cut
        ? 'La compañía recorta el dividendo.'
        : c.dividendPerShare > 0
          ? `Dividendo trimestral de ${esNum(c.dividendPerShare, 3)} por acción.`
          : 'No reparte dividendo.'
    }`,
    tags: [c.id],
    tone: clamped,
    importance: Math.abs(surprise) > 0.15 ? 2 : 1,
  });
  if (cut) c.sentiment -= 0.05;

  payDividend(state, c);
  checkDistress(state, c, rng);
}

function payDividend(state: SimState, c: Company): void {
  const h = state.player.stocks[c.id];
  if (!h || c.dividendPerShare <= 0) return;
  const fx = getCountry(state, c.country).fx;
  const gross = toCents(h.qty * c.dividendPerShare * fx);
  if (gross <= 0) return;
  const withheld = Math.round(gross * 0.19);
  transfer(state.ledger, state.tick, 'market', 'player:cash', gross, `Dividendo ${c.id}`);
  transfer(state.ledger, state.tick, 'player:cash', 'gov', withheld, `Retención dividendo ${c.id}`);
  state.player.tax.dividendsYtd += gross;
  state.player.tax.withheldYtd += withheld;
  state.outbox.push({
    type: 'dividend',
    tick: state.tick,
    message: `Dividendo de ${c.name}: ${esNum(gross / 100)} ₳`,
    ref: c.id,
  });
  discoverConcept(state, 'dividendo');
  discoverConcept(state, 'retencion');
}

/** Tensiones financieras: ampliación de capital o quiebra. */
function checkDistress(state: SimState, c: Company, rng: Rng): void {
  const sec = sectorDef(c.sector);
  const earningsTtm = sum(c.quarterlyEarnings);
  const lev = c.debt / Math.max(1, c.revenueTtm) / Math.max(0.2, sec.leverage);
  const score = lev / 2.6 + (earningsTtm < 0 ? 0.55 : 0) + (c.margin < 0 ? 0.25 : 0);
  if (score > 1.25 && rng.chance(0.35)) {
    declareBankruptcy(state, c);
  } else if (score > 0.95 && rng.chance(0.4)) {
    const newShares = c.sharesOutstanding * rng.range(0.25, 0.6);
    const raise = newShares * c.price * 0.75;
    c.sharesOutstanding += newShares;
    c.debt = Math.max(0, c.debt - raise);
    c.sentiment -= 0.08;
    publishNews(state, {
      category: 'corporate',
      headline: `${c.name} anuncia una ampliación de capital con descuento para reducir deuda`,
      body: `Emitirá un ${((newShares / (c.sharesOutstanding - newShares)) * 100).toFixed(0)} % de acciones nuevas. Los accionistas actuales ven diluida su participación.`,
      tags: [c.id],
      tone: -0.6,
      importance: 2,
    });
    discoverConcept(state, 'dilucion');
  }
}

export function declareBankruptcy(state: SimState, c: Company): void {
  if (c.status !== 'listed') return;
  c.status = 'bankrupt';
  c.sentiment = -3.5;
  c.price *= 0.12;
  c.fairValue = c.price * 0.2;
  c.takeover = null;
  // Día de exclusión de cotización: las acciones valen 0 a partir de entonces.
  c.nextEarningsDay = Math.floor(state.tick / HOURS_PER_DAY) + 10;
  publishNews(state, {
    category: 'corporate',
    headline: `${c.name} se declara en concurso de acreedores`,
    body: 'La compañía no puede atender sus deudas. Los accionistas probablemente lo perderán todo; los bonistas recuperarán una parte.',
    tags: [c.id],
    tone: -1,
    importance: 3,
  });
  state.outbox.push({
    type: 'bankruptcy',
    tick: state.tick,
    message: `${c.name} quiebra`,
    ref: c.id,
  });
  for (const b of state.bonds) {
    if (b.issuer === c.id && b.status === 'active') defaultBond(state, b.id);
  }
  if (state.player.stocks[c.id]) discoverConcept(state, 'quiebra');
}

export function defaultBond(state: SimState, bondId: string): void {
  const b = state.bonds.find((x) => x.id === bondId);
  if (!b || b.status !== 'active') return;
  b.status = 'defaulted';
  b.rating = 'D';
  const fx = getCountry(state, b.country).fx;
  const h = state.player.bonds[b.id];
  if (h) {
    const recovered = toCents(h.qty * b.recovery * 100 * fx);
    transfer(
      state.ledger,
      state.tick,
      'market',
      'player:cash',
      recovered,
      `Recuperación impago ${b.id}`,
    );
    const cost = h.avgCost * h.qty;
    state.player.tax.realizedGainsYtd += Math.round(recovered - cost);
    delete state.player.bonds[b.id];
    discoverConcept(state, 'impago');
  }
  b.price = b.recovery * 100;
}

/** Revelación de fraude contable. */
export function revealFraud(state: SimState, c: Company): void {
  if (!c.hidden.fraud || c.status !== 'listed') return;
  const sev = c.hidden.fraudSeverity;
  c.hidden.fraud = false;
  c.quarterlyEarnings = c.quarterlyEarnings.map(
    (e, i) => e - (c.quarterlyRevenue[i] ?? 0) * sev * 0.15,
  );
  c.sentiment -= 0.5 + sev * 0.5;
  c.debt *= 1 + sev * 0.5;
  c.targetMargin *= 1 - sev * 0.4;
  publishNews(state, {
    category: 'scandal',
    headline: `Escándalo en ${c.name}: la compañía reconoce haber inflado sus beneficios`,
    body: `La auditoría forense destapa un agujero contable. El consejero delegado, ${c.ceo.name}, dimite. Los reguladores abren una investigación.`,
    tags: [c.id],
    tone: -1,
    importance: 3,
  });
}

export function launchTakeover(state: SimState, c: Company, rng: Rng): void {
  if (c.status !== 'listed' || c.takeover) return;
  const premium = rng.range(0.2, 0.45);
  const bidder = rng.pick([
    'Crest & Holt Capital',
    'Fondo Soberano de Qaravel',
    'Grupo Albión',
    'Huaxin Holdings',
    'Pioneer Partners',
    'Nordhavn Invest',
  ]);
  c.takeover = {
    price: c.price * (1 + premium),
    closeDay: Math.floor(state.tick / HOURS_PER_DAY) + rng.int(30, 60),
    bidder,
  };
  publishNews(state, {
    category: 'corporate',
    headline: `${bidder} lanza una OPA sobre ${c.name} con una prima del ${(premium * 100).toFixed(0)} %`,
    body: `Ofrece ${esNum(c.takeover.price)} por acción en efectivo. El consejo estudiará la oferta. La operación se liquidará en unas semanas.`,
    tags: [c.id],
    tone: 0.9,
    importance: 3,
  });
  if (state.player.stocks[c.id]) discoverConcept(state, 'opa');
}

function completeTakeover(state: SimState, c: Company): void {
  if (!c.takeover) return;
  const h = state.player.stocks[c.id];
  if (h) {
    const fx = getCountry(state, c.country).fx;
    const proceeds = toCents(h.qty * c.takeover.price * fx);
    transfer(
      state.ledger,
      state.tick,
      'market',
      'player:cash',
      proceeds,
      `Liquidación OPA ${c.id}`,
    );
    state.player.tax.realizedGainsYtd += Math.round(proceeds - h.avgCost * h.qty);
    delete state.player.stocks[c.id];
  }
  c.price = c.takeover.price;
  publishNews(state, {
    category: 'corporate',
    headline: `${c.takeover.bidder} completa la compra de ${c.name}, que deja de cotizar`,
    body: 'Los accionistas reciben el precio de la oferta en efectivo.',
    tags: [c.id],
    tone: 0.2,
    importance: 1,
  });
  removeFromIndices(state, c);
  c.status = 'acquired';
  c.takeover = null;
  scheduleIpo(state, c.country);
}

function delist(state: SimState, c: Company): void {
  const h = state.player.stocks[c.id];
  if (h) {
    state.player.tax.realizedGainsYtd -= Math.round(h.avgCost * h.qty);
    delete state.player.stocks[c.id];
  }
  removeFromIndices(state, c);
  c.price = Math.max(c.price, 1e-4);
  scheduleIpo(state, c.country);
}

function removeFromIndices(state: SimState, c: Company): void {
  for (const idx of state.indices) {
    if (!idx.members.includes(c.id)) continue;
    const before = indexRawValue(state, idx);
    idx.members = idx.members.filter((m) => m !== c.id);
    const after = indexRawValue(state, idx);
    // Mantiene la continuidad del índice: se ajusta el divisor.
    if (before > 0 && after > 0) idx.divisor *= after / before;
  }
}

function addToIndices(state: SimState, c: Company): void {
  for (const idx of state.indices) {
    const eligible =
      idx.id === 'GLOBAL' ||
      (idx.id === 'AUR20' && c.country === HOME_COUNTRY_ID && idx.members.length < 20);
    if (!eligible) continue;
    const before = indexRawValue(state, idx);
    idx.members.push(c.id);
    const after = indexRawValue(state, idx);
    if (before > 0) idx.divisor *= after / before;
  }
}

function scheduleIpo(state: SimState, country: string): void {
  const rng = new Rng(state.rng.corporate);
  state.ipoQueue.push({ day: Math.floor(state.tick / HOURS_PER_DAY) + rng.int(15, 70), country });
}

function runIpos(state: SimState, day: number, rng: Rng): void {
  const due = state.ipoQueue.filter((q) => q.day <= day);
  if (due.length === 0) return;
  state.ipoQueue = state.ipoQueue.filter((q) => q.day > day);
  const ctx: CompanyContext = {
    usedTickers: new Set(state.companies.map((c) => c.id)),
    usedNames: new Set(state.companies.map((c) => c.name)),
  };
  for (const q of due) {
    const c = generateCompany(state, rng, ctx, q.country, undefined, true);
    c.nextEarningsDay = day + rng.int(30, 90);
    c.closes = [];
    state.companies.push(c);
    addToIndices(state, c);
    publishNews(state, {
      category: 'corporate',
      headline: `${c.name} debuta en bolsa: la demanda multiplica por ${rng.int(2, 9)} la oferta`,
      body: `Salida a bolsa a ${esNum(c.price)} por acción. Sector: ${sectorDef(c.sector).name}. Empresa joven, con fuerte crecimiento y todavía sin historial.`,
      tags: [c.id],
      tone: 0.4,
      importance: 2,
    });
  }
}

/** Procesos corporativos diarios (antes de la apertura). */
export function stepCorporateDaily(
  state: SimState,
  day: number,
  tradingDay: boolean,
  rumors: RumorResolution[],
): void {
  const rng = new Rng(state.rng.corporate);
  for (const r of rumors) {
    if (r.kind === 'takeover') launchTakeover(state, r.company, rng);
    if (r.kind === 'scandal') revealFraud(state, r.company);
  }
  for (const c of state.companies) {
    if (c.status === 'bankrupt' && day >= c.nextEarningsDay) {
      delist(state, c);
      c.nextEarningsDay = Number.MAX_SAFE_INTEGER;
      continue;
    }
    if (c.status !== 'listed') continue;
    if (c.takeover && day >= c.takeover.closeDay && tradingDay) {
      completeTakeover(state, c);
      continue;
    }
    if (tradingDay && day >= c.nextEarningsDay) {
      c.nextEarningsDay = day + 91;
      reportEarnings(state, c, rng);
    }
    // Fraude que sale a la luz por sí solo.
    if (c.hidden.fraud && rng.chance(0.0012)) revealFraud(state, c);
    // OPA espontánea (más probable en empresas pequeñas y baratas).
    if (!c.takeover && c.status === 'listed') {
      const cheap = c.price < c.fairValue * 0.85 ? 2 : 1;
      if (rng.chance(0.00004 * cheap)) launchTakeover(state, c, rng);
    }
    c.fairValue = fairValuePerShare(state, c);
  }
  runIpos(state, day, rng);
}

/** Contrasplits/splits cuando el precio en áureos se dispara. */
export function maybeSplit(state: SimState, c: Company): void {
  const fx = getCountry(state, c.country).fx;
  if (c.price * fx < 900 || c.status !== 'listed') return;
  const ratio = 5;
  c.sharesOutstanding *= ratio;
  c.price /= ratio;
  c.prevClose /= ratio;
  c.open /= ratio;
  c.dayHigh /= ratio;
  c.dayLow /= ratio;
  c.fairValue /= ratio;
  c.dividendPerShare /= ratio;
  c.consensusEps /= ratio;
  c.adv *= ratio;
  c.closes = c.closes.map((x) => x / ratio);
  c.intraday = c.intraday.map((x) => x / ratio);
  if (c.takeover) c.takeover.price /= ratio;
  c.splitCount++;
  const h = state.player.stocks[c.id];
  if (h) {
    h.qty *= ratio;
    h.avgCost = h.avgCost / ratio;
  }
  for (const o of state.player.orders) {
    if (o.asset === 'stock' && o.assetId === c.id) {
      o.qty *= ratio;
      if (o.limit) o.limit /= ratio;
    }
  }
  publishNews(state, {
    category: 'corporate',
    headline: `${c.name} desdobla sus acciones (split 5 por 1)`,
    body: 'Cada acción se convierte en cinco. El valor total de la participación no cambia, pero la acción es más accesible para el pequeño inversor.',
    tags: [c.id],
    tone: 0.15,
    importance: 1,
  });
  if (h) discoverConcept(state, 'split');
}
