/**
 * Vista serializable del estado para la interfaz. La UI nunca lee el estado interno:
 * recibe esta proyección desde el worker. La información oculta solo viaja en modo depuración.
 */
import { COUNTRIES } from '../data/countries';
import {
  catalogHoldings,
  catalogSummary,
  instrumentDetail,
  pendingCatalogOrders,
  type ClassSummary,
  type InstrumentDetail,
} from '../investments/view';
import { depositRate, loanRate, maxLoan, savingsRate } from './bank';
import { formatDate, isMarketOpen } from './calendar';
import { findCompany } from './generate';
import { fromCents } from './ledger';
import { PHASE_LABEL } from './macro';
import { portfolioSummary } from './portfolio';
import { GAME_START_TICK } from './sim';
import type { CyclePhase, NewsCategory, SimState } from './types';
import {
  bondDuration,
  bondYearsToMaturity,
  companyRating,
  countryDef,
  getCountry,
  marketCapAur,
  riskFreeYield,
  sectorDef,
  stockSpread,
  sum,
} from './valuation';

export interface CompanyRow {
  id: string;
  name: string;
  sector: string;
  sectorName: string;
  country: string;
  currency: string;
  price: number;
  priceAur: number;
  changePct: number;
  marketCap: number; // millones de ₳
  pe: number | null;
  divYield: number;
  status: 'listed' | 'bankrupt' | 'acquired';
  spark: number[];
  takeover: boolean;
  held: number;
  debug?: { fairValue: number; sentiment: number; fraud: boolean; quality: number };
}

export interface CompanyDetail extends CompanyRow {
  ceo: string;
  ceoStyle: string;
  founded: number;
  closes: number[];
  intraday: number[];
  open: number;
  dayHigh: number;
  dayLow: number;
  prevClose: number;
  revenueTtm: number;
  earningsTtm: number;
  margin: number;
  debt: number;
  cash: number;
  dividendPerShare: number;
  shares: number;
  rating: string;
  adv: number;
  spreadPct: number;
  nextEarningsInDays: number;
  takeoverInfo: { price: number; bidder: string } | null;
  news: NewsRow[];
  holding: { qty: number; avgCost: number; value: number; pnl: number } | null;
  fx: number;
}

export interface NewsRow {
  id: number;
  tick: number;
  date: string;
  category: NewsCategory;
  headline: string;
  body: string;
  tone: number;
  importance: number;
  tags: string[];
  debugFalse?: boolean;
}

export interface BondRow {
  id: string;
  name: string;
  issuerType: 'government' | 'corporate';
  country: string;
  currency: string;
  rating: string;
  coupon: number;
  yield: number;
  price: number;
  years: number;
  duration: number;
  status: string;
  held: number;
  spark: number[];
}

export interface CountryRow {
  id: string;
  name: string;
  currency: string;
  symbol: string;
  gdpGrowth: number;
  inflation: number;
  unemployment: number;
  policyRate: number;
  fx: number;
  debtToGdp: number;
  pmi: number;
  y2: number;
  y10: number;
  history: {
    day: number;
    gdpGrowth: number;
    inflation: number;
    rate: number;
    unemployment: number;
  }[];
}

export interface HoldingRow {
  kind: 'stock' | 'bond';
  id: string;
  name: string;
  qty: number;
  price: number;
  value: number;
  cost: number;
  pnl: number;
  pnlPct: number;
  weight: number;
}

export interface SimView {
  tick: number;
  gameDay: number;
  date: string;
  marketOpen: boolean;
  phase: CyclePhase;
  phaseLabel: string;
  fear: number;
  oil: number;
  shock: string | null;
  debug?: { nextPhase: string | null; monthsToNext: number; froth: number; equityPremium: number };
  player: {
    name: string;
    job: { title: string; employer: string; netMonthly: number } | null;
    monthlyExpenses: number;
    cash: number;
    savings: number;
    deposits: number;
    stocks: number;
    bonds: number;
    alternatives: number;
    margin: number;
    debt: number;
    netWorth: number;
    netWorthHistory: number[];
    bankrupt: boolean;
    creditScore: number;
    notebook: string[];
    holdings: HoldingRow[];
    orders: {
      id: number;
      kind: string;
      asset: string;
      assetId: string;
      qty: number;
      limit?: number;
      date: string;
    }[];
    depositList: { id: number; principal: number; rate: number; maturity: string }[];
    loans: {
      id: number;
      outstanding: number;
      rate: number;
      monthlyPayment: number;
      monthsLeft: number;
      missed: number;
    }[];
    trades: {
      date: string;
      kind: string;
      asset: string;
      id: string;
      qty: number;
      price: number;
      cashFlow: number;
      fees: number;
      pnl: number;
    }[];
    tax: {
      realizedGainsYtd: number;
      lossCarryForward: number;
      dividendsYtd: number;
      interestYtd: number;
      withheldYtd: number;
      paidTotal: number;
    };
    journal: { date: string; memo: string; amount: number }[];
  };
  rates: { savings: number; deposits: Record<number, number>; loan: number; maxLoan: number };
  indices: { id: string; name: string; value: number; changePct: number; closes: number[] }[];
  countries: CountryRow[];
  companies: CompanyRow[];
  bonds: BondRow[];
  news: NewsRow[];
  selected: CompanyDetail | null;
  catalog: { classes: ClassSummary[]; total: number };
  instrument: InstrumentDetail | null;
  catalogHoldings: ReturnType<typeof catalogHoldings>;
  catalogOrders: ReturnType<typeof pendingCatalogOrders>;
  unlocks: { derivatives: boolean; accredited: boolean };
  reputation: Record<string, number>;
  weather: number;
  cryptoRegime: string;
}

export interface ViewOptions {
  selected?: string | null;
  selectedInstrument?: string | null;
  debug?: boolean;
}

function newsRow(n: SimState['news'][number], debug: boolean): NewsRow {
  return {
    id: n.id,
    tick: n.tick,
    date: formatDate(n.tick),
    category: n.category,
    headline: n.headline,
    body: n.body,
    tone: n.tone,
    importance: n.importance,
    tags: n.tags,
    ...(debug && n.hidden ? { debugFalse: n.hidden.isFalse } : {}),
  };
}

export function buildView(state: SimState, opts: ViewOptions = {}): SimView {
  const debug = !!opts.debug;
  const p = state.player;
  const summary = portfolioSummary(state);
  const g = state.global;

  const companies: CompanyRow[] = state.companies
    .filter((c) => c.status === 'listed' || p.stocks[c.id])
    .map((c) => {
      const fx = getCountry(state, c.country).fx;
      const earnings = sum(c.quarterlyEarnings);
      const row: CompanyRow = {
        id: c.id,
        name: c.name,
        sector: c.sector,
        sectorName: sectorDef(c.sector).name,
        country: c.country,
        currency: countryDef(c.country).currency.code,
        price: c.price,
        priceAur: c.price * fx,
        changePct: c.price / c.prevClose - 1,
        marketCap: marketCapAur(state, c),
        pe: earnings > 0 ? (c.price * c.sharesOutstanding) / earnings : null,
        divYield: (c.dividendPerShare * 4) / c.price,
        status: c.status,
        spark: c.closes.slice(-40),
        takeover: !!c.takeover,
        held: p.stocks[c.id]?.qty ?? 0,
      };
      if (debug)
        row.debug = {
          fairValue: c.fairValue,
          sentiment: c.sentiment,
          fraud: c.hidden.fraud,
          quality: c.hidden.quality,
        };
      return row;
    });

  const holdings: HoldingRow[] = [];
  const invested = summary.stocks + summary.bonds;
  for (const [id, h] of Object.entries(p.stocks)) {
    const c = findCompany(state, id);
    if (!c) continue;
    const priceAur = c.price * getCountry(state, c.country).fx;
    const value = priceAur * h.qty;
    const cost = fromCents(h.avgCost * h.qty);
    holdings.push({
      kind: 'stock',
      id,
      name: c.name,
      qty: h.qty,
      price: priceAur,
      value,
      cost,
      pnl: value - cost,
      pnlPct: cost > 0 ? value / cost - 1 : 0,
      weight: invested > 0 ? (value * 100) / invested : 0,
    });
  }
  for (const [id, h] of Object.entries(p.bonds)) {
    const b = state.bonds.find((x) => x.id === id);
    if (!b) continue;
    const priceAur = b.price * getCountry(state, b.country).fx;
    const value = priceAur * h.qty;
    const cost = fromCents(h.avgCost * h.qty);
    holdings.push({
      kind: 'bond',
      id,
      name: b.name,
      qty: h.qty,
      price: priceAur,
      value,
      cost,
      pnl: value - cost,
      pnlPct: cost > 0 ? value / cost - 1 : 0,
      weight: invested > 0 ? (value * 100) / invested : 0,
    });
  }
  holdings.sort((a, b) => b.value - a.value);

  const bonds: BondRow[] = state.bonds
    .filter((b) => b.status === 'active' || p.bonds[b.id])
    .map((b) => ({
      id: b.id,
      name: b.name,
      issuerType: b.issuerType,
      country: b.country,
      currency: countryDef(b.country).currency.code,
      rating: b.rating,
      coupon: b.coupon,
      yield: b.yield,
      price: b.price,
      years: bondYearsToMaturity(b, state.tick),
      duration: b.status === 'active' ? bondDuration(b, state.tick) : 0,
      status: b.status,
      held: p.bonds[b.id]?.qty ?? 0,
      spark: b.closes.slice(-60),
    }));

  const countries: CountryRow[] = state.countries.map((c) => {
    const def = COUNTRIES.find((d) => d.id === c.id)!;
    return {
      id: c.id,
      name: def.name,
      currency: def.currency.code,
      symbol: def.currency.symbol,
      gdpGrowth: c.gdpGrowth,
      inflation: c.inflation,
      unemployment: c.unemployment,
      policyRate: c.policyRate,
      fx: c.fx,
      debtToGdp: c.debtToGdp,
      pmi: c.pmi,
      y2: riskFreeYield(c, 2, g) + c.spread,
      y10: riskFreeYield(c, 10, g) + c.spread,
      history: c.history.slice(-120),
    };
  });

  let selected: CompanyDetail | null = null;
  const sc = opts.selected ? findCompany(state, opts.selected) : undefined;
  if (sc) {
    const row = companies.find((r) => r.id === sc.id) ?? {
      ...companies[0]!,
      id: sc.id,
      name: sc.name,
    };
    const fx = getCountry(state, sc.country).fx;
    const h = p.stocks[sc.id];
    const valueAur = h ? sc.price * fx * h.qty : 0;
    selected = {
      ...row,
      ceo: sc.ceo.name,
      ceoStyle: sc.ceo.style,
      founded: sc.founded,
      closes: sc.closes.slice(-1300),
      intraday: sc.intraday,
      open: sc.open,
      dayHigh: sc.dayHigh,
      dayLow: sc.dayLow,
      prevClose: sc.prevClose,
      revenueTtm: sc.revenueTtm,
      earningsTtm: sum(sc.quarterlyEarnings),
      margin: sc.margin,
      debt: sc.debt,
      cash: sc.cash,
      dividendPerShare: sc.dividendPerShare,
      shares: sc.sharesOutstanding,
      rating: companyRating(sc),
      adv: sc.adv,
      spreadPct: stockSpread(sc, fx),
      nextEarningsInDays: Math.max(0, sc.nextEarningsDay - Math.floor(state.tick / 24)),
      takeoverInfo: sc.takeover ? { price: sc.takeover.price, bidder: sc.takeover.bidder } : null,
      news: state.news
        .filter((n) => n.tags.includes(sc.id))
        .slice(-12)
        .reverse()
        .map((n) => newsRow(n, debug)),
      holding: h
        ? {
            qty: h.qty,
            avgCost: fromCents(h.avgCost),
            value: valueAur,
            pnl: valueAur - fromCents(h.avgCost * h.qty),
          }
        : null,
      fx,
    };
  }

  return {
    tick: state.tick,
    gameDay: Math.max(0, Math.floor((state.tick - GAME_START_TICK) / 24)),
    date: formatDate(state.tick),
    marketOpen: isMarketOpen(state.tick),
    phase: g.phase,
    phaseLabel: PHASE_LABEL[g.phase],
    fear: g.fear,
    oil: g.oil,
    shock: g.shock?.kind ?? null,
    ...(debug
      ? {
          debug: {
            nextPhase: g.nextPhase,
            monthsToNext: g.monthsToNext,
            froth: g.froth,
            equityPremium: g.equityPremium,
          },
        }
      : {}),
    player: {
      name: p.name,
      job: p.job
        ? { title: p.job.title, employer: p.job.employer, netMonthly: fromCents(p.job.netMonthly) }
        : null,
      monthlyExpenses: fromCents(p.monthlyExpenses),
      cash: fromCents(summary.cash),
      savings: fromCents(summary.savings),
      deposits: fromCents(summary.deposits),
      stocks: fromCents(summary.stocks),
      bonds: fromCents(summary.bonds),
      alternatives: fromCents(summary.alternatives),
      margin: fromCents(summary.margin),
      debt: fromCents(summary.debt),
      netWorth: fromCents(summary.netWorth),
      netWorthHistory: p.netWorthHistory.slice(-730).map(fromCents),
      bankrupt: p.bankrupt,
      creditScore: p.creditScore,
      notebook: [...p.notebook],
      holdings,
      orders: p.orders.map((o) => ({
        id: o.id,
        kind: o.kind,
        asset: o.asset,
        assetId: o.assetId,
        qty: o.qty,
        limit: o.limit,
        date: formatDate(o.placedTick),
      })),
      depositList: p.deposits.map((d) => ({
        id: d.id,
        principal: fromCents(d.principal),
        rate: d.rate,
        maturity: formatDate(d.maturityTick, false),
      })),
      loans: p.loans.map((l) => ({
        id: l.id,
        outstanding: fromCents(l.outstanding),
        rate: l.rate,
        monthlyPayment: fromCents(l.monthlyPayment),
        monthsLeft: l.monthsLeft,
        missed: l.missedPayments,
      })),
      trades: p.trades
        .slice(-40)
        .reverse()
        .map((t) => ({
          date: formatDate(t.tick),
          kind: t.kind,
          asset: t.asset,
          id: t.assetId,
          qty: t.qty,
          price: t.price,
          cashFlow: fromCents(t.cashFlow),
          fees: fromCents(t.fees),
          pnl: fromCents(t.realizedPnl),
        })),
      tax: {
        realizedGainsYtd: fromCents(p.tax.realizedGainsYtd),
        lossCarryForward: fromCents(p.tax.lossCarryForward),
        dividendsYtd: fromCents(p.tax.dividendsYtd),
        interestYtd: fromCents(p.tax.interestYtd),
        withheldYtd: fromCents(p.tax.withheldYtd),
        paidTotal: fromCents(p.tax.paidTotal),
      },
      journal: state.ledger.journal
        .slice(-30)
        .reverse()
        .map((e) => ({
          date: formatDate(e.tick),
          memo: e.memo,
          amount: fromCents(
            e.to.startsWith('player') && !e.from.startsWith('player')
              ? e.amount
              : e.from.startsWith('player') && !e.to.startsWith('player')
                ? -e.amount
                : 0,
          ),
        })),
    },
    rates: {
      savings: savingsRate(state),
      deposits: Object.fromEntries([3, 6, 12, 24, 36].map((m) => [m, depositRate(state, m)])),
      loan: loanRate(state),
      maxLoan: fromCents(maxLoan(state)),
    },
    indices: state.indices.map((i) => ({
      id: i.id,
      name: i.name,
      value: i.value,
      changePct: i.value / i.prevClose - 1,
      closes: i.closes.slice(-1300),
    })),
    countries,
    companies,
    bonds,
    news: state.news
      .slice(-80)
      .reverse()
      .map((n) => newsRow(n, debug)),
    selected,
    catalog: catalogSummary(state),
    instrument: opts.selectedInstrument
      ? instrumentDetail(state, opts.selectedInstrument, debug)
      : null,
    catalogHoldings: catalogHoldings(state),
    catalogOrders: pendingCatalogOrders(state),
    unlocks: { ...state.inv.unlocks },
    reputation: { ...state.inv.reputation },
    weather: state.inv.weather,
    cryptoRegime: state.inv.crypto.regime,
  };
}
