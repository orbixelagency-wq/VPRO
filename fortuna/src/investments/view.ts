/**
 * Proyecciones del catálogo para la interfaz: resumen por clase, páginas filtradas y
 * ficha completa de un instrumento. La verdad oculta nunca sale de aquí salvo como
 * estimación según el nivel de investigación (o en modo depuración).
 */
import { COUNTRIES } from '../data/countries';
import { districtName } from '../data/districts';
import { formatDate, HOURS_PER_DAY } from '../economy/calendar';
import { fromCents } from '../economy/ledger';
import type { SimState } from '../economy/types';
import { isMarginClass } from './classes/derivatives';
import {
  findInstrument,
  liquidityOf,
  quoteCatalog,
  reprice,
  researchCost,
  rulesOf,
  unlockReason,
} from './engine';
import { ctxOf, estimateBool, estimateNumber, fxOf } from './helpers';
import {
  ATTR_LABELS,
  CLASS_META,
  HIDDEN_LABELS,
  LIQUIDITY_LABEL,
  RESEARCH_LEVELS,
  type Fmt,
} from './meta';
import type { AssetClassId, Instrument, Position } from './types';

export interface CatalogQuery {
  cls: AssetClassId | 'all';
  q?: string;
  sub?: string;
  region?: string;
  sort?: 'price' | 'yield' | 'name' | 'change' | 'expires';
  dir?: 1 | -1;
  offset?: number;
  limit?: number;
  heldOnly?: boolean;
  maxPrice?: number;
}

export interface CatalogRow {
  id: string;
  cls: AssetClassId;
  sub: string;
  name: string;
  region: string;
  priceAur: number;
  price: number;
  ccy: string;
  yield: number;
  change: number;
  held: boolean;
  unique: boolean;
  lot: number;
  status: string;
  expiresInDays: number | null;
  locked: string | null;
  liquidity: string;
  research: number;
  spark: number[];
}

export interface CatalogPage {
  rows: CatalogRow[];
  total: number;
  subs: string[];
  regions: { id: string; name: string }[];
}

export interface ClassSummary {
  id: string;
  name: string;
  group: string;
  glyph: string;
  count: number;
  held: number;
}

export function regionName(id: string): string {
  return COUNTRIES.find((c) => c.id === id)?.name ?? districtName(id);
}

/** Número de instrumentos disponibles por clase (incluye acciones y bonos del mercado). */
export function catalogSummary(state: SimState): { classes: ClassSummary[]; total: number } {
  const count = new Map<string, number>();
  const held = new Map<string, number>();
  for (const i of state.inv.instruments) {
    if (i.status !== 'open') continue;
    count.set(i.cls, (count.get(i.cls) ?? 0) + 1);
  }
  for (const id of Object.keys(state.inv.positions)) {
    const i = findInstrument(state, id);
    if (i) held.set(i.cls, (held.get(i.cls) ?? 0) + 1);
  }
  count.set('stock', state.companies.filter((c) => c.status === 'listed').length);
  count.set('bond', state.bonds.filter((b) => b.status === 'active').length);
  held.set('stock', Object.keys(state.player.stocks).length);
  held.set('bond', Object.keys(state.player.bonds).length);
  const classes = CLASS_META.map((m) => ({
    id: m.id,
    name: m.name,
    group: m.group,
    glyph: m.glyph,
    count: count.get(m.id) ?? 0,
    held: held.get(m.id) ?? 0,
  }));
  return { classes, total: classes.reduce((a, c) => a + c.count, 0) };
}

function rowOf(state: SimState, i: Instrument): CatalogRow {
  const h = i.hist;
  const prev = h.length > 4 ? h[h.length - 5]! : (h[0] ?? i.price);
  return {
    id: i.id,
    cls: i.cls,
    sub: i.sub,
    name: i.name,
    region: regionName(i.region),
    priceAur: i.price * fxOf(state, i.ccy),
    price: i.price,
    ccy: COUNTRIES.find((c) => c.id === i.ccy)?.currency.code ?? 'AUR',
    yield: i.yield,
    change: prev > 0 ? i.price / prev - 1 : 0,
    held: !!state.inv.positions[i.id],
    unique: i.unique,
    lot: i.lot,
    status: i.status,
    expiresInDays:
      i.expires !== undefined
        ? Math.max(0, Math.ceil((i.expires - state.tick) / HOURS_PER_DAY))
        : null,
    locked: i.status === 'open' ? unlockReason(state, i) : null,
    liquidity: LIQUIDITY_LABEL[liquidityOf(i)] ?? '',
    research: state.inv.research[i.id] ?? 0,
    spark: h.slice(-26),
  };
}

export function queryCatalog(state: SimState, q: CatalogQuery): CatalogPage {
  const needle = (q.q ?? '').trim().toLowerCase();
  const ctx = ctxOf(state);
  let list = state.inv.instruments.filter((i) => {
    const held = !!state.inv.positions[i.id];
    if (!held && i.status !== 'open') return false;
    if (q.cls !== 'all' && i.cls !== q.cls) return false;
    if (q.heldOnly && !held) return false;
    return true;
  });
  const subs = [...new Set(list.map((i) => i.sub))].sort();
  const regionIds = [...new Set(list.map((i) => i.region))];
  list = list.filter(
    (i) =>
      (!q.sub || i.sub === q.sub) &&
      (!q.region || i.region === q.region) &&
      (!needle || i.name.toLowerCase().includes(needle) || i.id.toLowerCase().includes(needle)) &&
      (!q.maxPrice || i.price * fxOf(state, i.ccy) <= q.maxPrice),
  );
  const dir = q.dir ?? -1;
  const key = q.sort ?? 'price';
  const val = (i: Instrument): number | string => {
    switch (key) {
      case 'name':
        return i.name;
      case 'yield':
        return i.yield;
      case 'expires':
        return i.expires ?? Number.MAX_SAFE_INTEGER;
      case 'change': {
        const prev = i.hist.length > 4 ? i.hist[i.hist.length - 5]! : (i.hist[0] ?? i.price);
        return prev > 0 ? i.price / prev : 1;
      }
      default:
        return i.price * fxOf(state, i.ccy);
    }
  };
  list.sort((a, b) => {
    const va = val(a);
    const vb = val(b);
    return (va < vb ? -1 : va > vb ? 1 : 0) * dir;
  });
  const offset = q.offset ?? 0;
  const page = list.slice(offset, offset + (q.limit ?? 80));
  // Los derivados sobre acciones se valoran al consultarlos.
  for (const i of page) if (i.cls === 'option' || i.cls === 'cfd') reprice(ctx, i);
  return {
    rows: page.map((i) => rowOf(state, i)),
    total: list.length,
    subs,
    regions: regionIds
      .map((id) => ({ id, name: regionName(id) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
}

export interface AttrView {
  label: string;
  value: string;
}

export interface HiddenView {
  label: string;
  /** Texto de la estimación o null si no se ha investigado lo suficiente. */
  estimate: string | null;
  tone: 'good' | 'bad' | 'neutral';
  truth?: string;
}

export interface InstrumentDetail extends CatalogRow {
  className: string;
  glyph: string;
  description: string;
  attrs: AttrView[];
  hidden: HiddenView[];
  hist: number[];
  researchLevel: number;
  researchLabel: string;
  nextResearch: { cost: number; days: number; label: string } | null;
  researchPending: boolean;
  fees: { spread: number; buy: number; sell: number; buyTax: number; agent: number };
  execution: 'live' | 'close';
  margin: boolean;
  position: {
    qty: number;
    cost: number;
    value: number;
    pnl: number;
    selling: string | null;
    margin?: number;
    pnlMargin?: number;
    mortgage?: { outstanding: number; monthly: number } | null;
  } | null;
  buyQuote: { ok: boolean; reason?: string; total: number; fees: number; tax: number } | null;
  sellModes: string[];
  mortgageAllowed: boolean;
}

function fmtValue(v: unknown, fmt: Fmt): string {
  const n = typeof v === 'number' ? v : Number(v);
  const f = (d: number) =>
    n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
  switch (fmt) {
    case 'pct':
      return `${(n * 100).toLocaleString('es-ES', { maximumFractionDigits: Math.abs(n) < 0.1 ? 2 : 1 })} %`;
    case 'money':
      return `${n.toLocaleString('es-ES', { maximumFractionDigits: n < 100 ? 2 : 0 })} ₳`;
    case 'num':
      return f(2);
    case 'int':
      return Math.round(n).toLocaleString('es-ES');
    case 'bool':
      return v ? 'Sí' : 'No';
    case 'score':
      return `${Math.round(n * 10)}/10`;
    case 'ratio':
      return `×${f(2)}`;
    case 'year':
      return String(Math.round(n));
    case 'date':
      return formatDate(n, false);
    case 'days':
      return `${Math.round(n)} días`;
    default:
      return String(v);
  }
}

export function instrumentDetail(
  state: SimState,
  id: string,
  debug: boolean,
): InstrumentDetail | null {
  const inst = findInstrument(state, id);
  if (!inst) return null;
  const ctx = ctxOf(state);
  if (inst.status === 'open' && (inst.cls === 'option' || inst.cls === 'cfd')) reprice(ctx, inst);
  const rules = rulesOf(inst.cls);
  const meta = CLASS_META.find((m) => m.id === inst.cls)!;
  const row = rowOf(state, inst);
  const attrs: AttrView[] = [];
  for (const [k, v] of Object.entries(inst.attrs)) {
    const lab = ATTR_LABELS[k === 'premium' && inst.cls === 'option' ? 'premiumShare' : k];
    if (!lab) continue;
    attrs.push({ label: lab.label, value: fmtValue(v, lab.fmt) });
  }
  const level = state.inv.research[inst.id] ?? 0;
  const hidden: HiddenView[] = [];
  for (const [k, v] of Object.entries(inst.hidden)) {
    const lab = HIDDEN_LABELS[k];
    if (!lab || (k === 'peak' && !v)) continue;
    let estimate: string | null = null;
    let tone: HiddenView['tone'] = 'neutral';
    if (typeof v === 'boolean') {
      const e = estimateBool(inst, k, level);
      if (e !== null) {
        estimate =
          level >= 3
            ? e
              ? 'Sí'
              : 'No'
            : e
              ? level === 1
                ? 'Probablemente sí'
                : 'Casi seguro que sí'
              : level === 1
                ? 'Hay dudas'
                : 'Casi seguro que no';
        tone = e === (lab.good === 'high') ? 'good' : 'bad';
      }
    } else {
      const e = estimateNumber(inst, k, level);
      if (e) {
        estimate =
          level >= 3
            ? fmtValue(e.value, lab.fmt)
            : `${fmtValue(e.value, lab.fmt)} ± ${fmtValue(e.margin, lab.fmt === 'ratio' ? 'num' : lab.fmt)}`;
        tone = 'neutral';
      }
    }
    hidden.push({
      label: lab.label,
      estimate,
      tone,
      ...(debug ? { truth: fmtValue(v, lab.fmt) } : {}),
    });
  }
  const next = researchCost(inst, level + 1);
  const pos: Position | undefined = state.inv.positions[inst.id];
  const fx = fxOf(state, inst.ccy);
  let position: InstrumentDetail['position'] = null;
  if (pos) {
    const margin = isMarginClass(inst.cls);
    const value = margin ? 0 : inst.cls === 'philanthropy' ? 0 : inst.price * fx * pos.qty;
    const loan = pos.mortgageId
      ? state.player.loans.find((l) => l.id === pos.mortgageId)
      : undefined;
    position = {
      qty: pos.qty,
      cost: fromCents(pos.cost),
      value,
      pnl: margin
        ? fromCents(
            (pos.pnl ?? 0) +
              Math.round(
                pos.qty *
                  (inst.price - (pos.mark ?? inst.price)) *
                  Number(inst.attrs['multiplier'] ?? 1) *
                  fx *
                  100,
              ),
          )
        : value - fromCents(pos.cost),
      selling: pos.selling
        ? `${pos.selling.mode === 'auction' ? 'En subasta' : 'En venta'} · ${formatDate(pos.selling.readyTick, false)}`
        : null,
      ...(margin ? { margin: fromCents(pos.margin ?? 0), pnlMargin: fromCents(pos.pnl ?? 0) } : {}),
      ...(loan
        ? {
            mortgage: {
              outstanding: fromCents(loan.outstanding),
              monthly: fromCents(loan.monthlyPayment),
            },
          }
        : { mortgage: null }),
    };
  }
  const q =
    inst.status === 'open' && !isMarginClass(inst.cls)
      ? quoteCatalog(state, inst, 'buy', inst.lot)
      : null;
  const liq = liquidityOf(inst);
  const sellModes =
    liq === 'listing'
      ? ['listing', 'quick']
      : liq === 'auction'
        ? ['auction']
        : liq === 'none'
          ? []
          : ['normal'];
  return {
    ...row,
    className: meta.name,
    glyph: meta.glyph,
    description: meta.description,
    attrs,
    hidden,
    hist: inst.hist.slice(-260),
    researchLevel: level,
    researchLabel: RESEARCH_LEVELS[level] ?? '',
    nextResearch: next ? { ...next, label: RESEARCH_LEVELS[level + 1] ?? '' } : null,
    researchPending: state.inv.researchQueue.some((j) => j.id === inst.id),
    fees: {
      spread: typeof inst.attrs['spread'] === 'number' ? inst.attrs['spread'] : rules.fees.spread,
      buy: rules.fees.buy,
      sell: rules.fees.sell,
      buyTax: rules.fees.buyTax ?? 0,
      agent: rules.fees.sellAgent ?? 0,
    },
    execution: rules.execution,
    margin: isMarginClass(inst.cls),
    position,
    buyQuote: q
      ? {
          ok: q.ok,
          reason: q.reason,
          total: fromCents(q.total),
          fees: fromCents(q.fees),
          tax: fromCents(q.tax),
        }
      : null,
    sellModes,
    mortgageAllowed: inst.cls === 'realestate',
  };
}

/** Posiciones del catálogo para la cartera. */
export function catalogHoldings(state: SimState) {
  const out: {
    id: string;
    cls: string;
    name: string;
    qty: number;
    value: number;
    cost: number;
    pnl: number;
    selling: boolean;
  }[] = [];
  for (const [id, pos] of Object.entries(state.inv.positions)) {
    const inst = findInstrument(state, id);
    if (!inst) continue;
    const margin = isMarginClass(inst.cls);
    const fx = fxOf(state, inst.ccy);
    const value = margin
      ? fromCents(pos.margin ?? 0)
      : inst.cls === 'philanthropy'
        ? 0
        : inst.price * fx * pos.qty;
    const pnl = margin
      ? fromCents(
          (pos.pnl ?? 0) +
            Math.round(
              pos.qty *
                (inst.price - (pos.mark ?? inst.price)) *
                Number(inst.attrs['multiplier'] ?? 1) *
                fx *
                100,
            ),
        )
      : value - fromCents(pos.cost);
    out.push({
      id,
      cls: inst.cls,
      name: inst.name,
      qty: pos.qty,
      value,
      cost: fromCents(pos.cost),
      pnl,
      selling: !!pos.selling,
    });
  }
  return out.sort((a, b) => b.value - a.value);
}

export function pendingCatalogOrders(state: SimState) {
  return state.inv.orders.map((o) => ({
    id: o.id,
    side: o.side,
    qty: o.qty,
    name: findInstrument(state, o.instId)?.name ?? o.instId,
    instId: o.instId,
    date: formatDate(o.placedTick),
  }));
}
