/**
 * Jugadores automáticos para pruebas de balance. Cada estrategia juega una partida
 * completa con el mismo sueldo y gastos; comparamos los resultados entre estrategias.
 */
import { maxLoan } from '../economy/bank';
import { dateFromTick, HOURS_PER_DAY, isTradingDay } from '../economy/calendar';
import { findCompany } from '../economy/generate';
import { fromCents } from '../economy/ledger';
import { netWorth } from '../economy/portfolio';
import { Rng } from '../economy/rng';
import { applyCommand, newGame, step } from '../economy/sim';
import type { Company, SimState } from '../economy/types';
import { getCountry, sum } from '../economy/valuation';

export interface Strategy {
  id: string;
  name: string;
  /** Primer día hábil de cada mes, a las 10:00. */
  onMonth?(s: SimState, rng: Rng): void;
  /** Cada día hábil a las 10:00. */
  onDay?(s: SimState, rng: Rng): void;
  onStart?(s: SimState, rng: Rng): void;
}

/** Liquidez disponible, descontando la reserva para el impuesto de enero. */
const cash = (s: SimState) =>
  fromCents(
    s.ledger.balances['player:cash'] -
      Math.max(0, s.player.tax.realizedGainsYtd - s.player.tax.lossCarryForward) * 0.25,
  );
const expenses = (s: SimState) => fromCents(s.player.monthlyExpenses);
const listed = (s: SimState) => s.companies.filter((c) => c.status === 'listed' && !c.takeover);
const priceAur = (s: SimState, c: Company) => c.price * getCountry(s, c.country).fx;

function buy(s: SimState, c: Company, budget: number): void {
  const px = priceAur(s, c) * 1.01;
  const qty = Math.floor((budget - 10) / px);
  if (qty > 0) applyCommand(s, { type: 'order', side: 'buy', asset: 'stock', id: c.id, qty });
}

function sellAll(s: SimState, id: string): void {
  const h = s.player.stocks[id];
  if (h) applyCommand(s, { type: 'order', side: 'sell', asset: 'stock', id, qty: h.qty });
}

function momentum(c: Company, days: number): number {
  const n = c.closes.length;
  if (n <= days) return 0;
  return c.price / (c.closes[n - days - 1] ?? c.price) - 1;
}

export const STRATEGIES: Strategy[] = [
  { id: 'colchon', name: 'Dinero bajo el colchón' },
  {
    id: 'ahorrador',
    name: 'Ahorrador prudente (cuenta remunerada + depósitos)',
    onMonth(s) {
      const spare = cash(s) - expenses(s) * 1.2;
      if (spare > 50) applyCommand(s, { type: 'toSavings', amount: Math.floor(spare) });
      const sav = fromCents(s.ledger.balances['player:savings']);
      if (sav > 3000) {
        applyCommand(s, { type: 'fromSavings', amount: 2000 });
        applyCommand(s, { type: 'openDeposit', amount: 2000, months: 12 });
      }
    },
  },
  {
    id: 'indexador',
    name: 'Indexador paciente (compra mensual del Áureo 20)',
    onMonth(s) {
      const spare = cash(s) - expenses(s) * 1.3;
      if (spare < 150) return;
      const idx = s.indices.find((i) => i.id === 'AUR20');
      if (!idx) return;
      const members = idx.members
        .map((id) => findCompany(s, id))
        .filter((c): c is Company => !!c && c.status === 'listed');
      const caps = members.map((c) => priceAur(s, c) * c.sharesOutstanding);
      const total = sum(caps);
      // Compra el valor más infraponderado respecto al índice.
      const port =
        sum(members.map((c) => (s.player.stocks[c.id]?.qty ?? 0) * priceAur(s, c))) + spare;
      let best: Company | undefined;
      let bestGap = -Infinity;
      members.forEach((c, i) => {
        const target = ((caps[i] ?? 0) / total) * port;
        const gap = target - (s.player.stocks[c.id]?.qty ?? 0) * priceAur(s, c);
        if (gap > bestGap) {
          bestGap = gap;
          best = c;
        }
      });
      if (best) buy(s, best, spare);
    },
  },
  {
    id: 'valor',
    name: 'Inversor en valor (compra barato con beneficios)',
    onMonth(s, rng) {
      const d = dateFromTick(s.tick);
      const spare = cash(s) - expenses(s) * 1.3;
      if (d.month % 3 === 0) {
        // Análisis imperfecto: el valor razonable se estima con error.
        const ranked = listed(s)
          .filter((c) => sum(c.quarterlyEarnings) > 0)
          .map((c) => ({ c, score: (c.fairValue * Math.exp(rng.gauss() * 0.2)) / c.price }))
          .sort((a, b) => b.score - a.score);
        const keep = new Set(ranked.slice(0, 10).map((r) => r.c.id));
        for (const id of Object.keys(s.player.stocks)) if (!keep.has(id)) sellAll(s, id);
        const top = ranked.slice(0, 8).map((r) => r.c);
        const available = cash(s) - expenses(s) * 1.3;
        const each = available / Math.max(1, top.length);
        if (each > 150) for (const c of top) buy(s, c, each);
      } else if (spare > 150) {
        const holdings = Object.keys(s.player.stocks);
        const pick = holdings.length
          ? findCompany(s, holdings[rng.int(0, holdings.length - 1)]!)
          : undefined;
        if (pick && pick.status === 'listed') buy(s, pick, spare);
      }
    },
  },
  {
    id: 'momentum',
    name: 'Seguidor de tendencias (top 5 a 6 meses)',
    onMonth(s) {
      const ranked = listed(s).sort((a, b) => momentum(b, 126) - momentum(a, 126));
      const top = ranked.slice(0, 5);
      const keep = new Set(top.map((c) => c.id));
      for (const id of Object.keys(s.player.stocks)) if (!keep.has(id)) sellAll(s, id);
      const available = cash(s) - expenses(s) * 1.3;
      const each = available / top.length;
      if (each > 150) for (const c of top) buy(s, c, each);
    },
  },
  {
    id: 'daytrader',
    name: 'Especulador diario (compra y vende cada día)',
    onDay(s, rng) {
      for (const id of Object.keys(s.player.stocks)) sellAll(s, id);
      const available = cash(s) - expenses(s) * 1.1;
      if (available < 200) return;
      const picks = listed(s).filter((c) => momentum(c, 1) > 0.01);
      const n = Math.min(2, picks.length);
      for (let i = 0; i < n; i++) buy(s, rng.pick(picks), available / n);
    },
  },
  {
    id: 'yolo',
    name: 'Temerario apalancado (préstamo + un solo valor volátil)',
    onMonth(s) {
      const credit = fromCents(maxLoan(s));
      if (credit >= 1000) applyCommand(s, { type: 'takeLoan', amount: credit, months: 60 });
      const candidates = listed(s)
        .filter((c) => c.idioVol * c.beta > 0.02)
        .sort((a, b) => momentum(b, 20) - momentum(a, 20));
      const target = candidates[0];
      if (!target) return;
      for (const id of Object.keys(s.player.stocks)) if (id !== target.id) sellAll(s, id);
      // Deja lo justo para pagar el mes: todo lo demás, al mismo valor.
      const available = cash(s) - expenses(s) * 0.3;
      if (available > 150) buy(s, target, available);
    },
  },
];

export interface BotResult {
  strategy: string;
  seed: number;
  finalNetWorth: number;
  /** Patrimonio final en áureos del momento inicial (descontada la inflación). */
  realNetWorth: number;
  contributions: number;
  ruined: boolean;
  maxDrawdown: number;
  fees: number;
  trades: number;
}

export function runBot(
  strategy: Strategy,
  seed: number,
  years: number,
  base?: SimState,
): BotResult {
  const s: SimState = base ? structuredClone(base) : newGame({ seed });
  const rng = Rng.fromSeed(seed, `bot:${strategy.id}`);
  const cpi0 = getCountry(s, 'castelia').cpi;
  const endTick = s.tick + years * 365 * HOURS_PER_DAY;
  let lastMonth = -1;
  let ruined = false;
  let peak = netWorth(s);
  let mdd = 0;
  let fees = 0;
  let trades = 0;
  let contributions = fromCents(s.ledger.balances['player:cash']);
  strategy.onStart?.(s, rng);
  while (s.tick < endTick) {
    step(s);
    const d = dateFromTick(s.tick);
    if (d.hour === 10 && isTradingDay(d)) {
      if (d.month !== lastMonth) {
        lastMonth = d.month;
        contributions += fromCents((s.player.job?.netMonthly ?? 0) - s.player.monthlyExpenses);
        strategy.onMonth?.(s, rng);
      }
      strategy.onDay?.(s, rng);
    }
    if (d.hour === 23) {
      const nw = netWorth(s);
      peak = Math.max(peak, nw);
      if (peak > 0) mdd = Math.max(mdd, 1 - nw / peak);
      if (s.player.bankrupt) ruined = true;
      for (const e of s.outbox) if (e.type === 'trade') trades++;
      s.outbox = [];
    }
  }
  for (const t of s.player.trades) fees += fromCents(t.fees);
  const final = fromCents(netWorth(s));
  if (final < 0) ruined = true;
  const cpi1 = getCountry(s, 'castelia').cpi;
  return {
    strategy: strategy.id,
    seed,
    finalNetWorth: final,
    realNetWorth: final * (cpi0 / cpi1),
    contributions,
    ruined,
    maxDrawdown: mdd,
    fees,
    trades,
  };
}

export function median(xs: number[]): number {
  const y = [...xs].sort((a, b) => a - b);
  const m = Math.floor(y.length / 2);
  return y.length % 2 ? (y[m] ?? 0) : ((y[m - 1] ?? 0) + (y[m] ?? 0)) / 2;
}
