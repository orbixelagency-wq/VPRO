/// <reference lib="webworker" />
/**
 * La simulación económica corre aquí, fuera del hilo principal, para no bloquear
 * los fotogramas. El hilo principal solo recibe vistas y eventos.
 */
import { formatDate } from '../economy/calendar';
import { findCompany } from '../economy/generate';
import { fromCents } from '../economy/ledger';
import { netWorth } from '../economy/portfolio';
import { applyCommand, drainEvents, newGame, step } from '../economy/sim';
import { quoteBond, quoteStock } from '../economy/trading';
import type { SimEvent, SimState } from '../economy/types';
import { buildView } from '../economy/view';
import { queryCatalog } from '../investments/view';
import { migrate } from '../save/migrations';
import type { FromWorker, ToWorker } from './protocol';

declare const self: DedicatedWorkerGlobalScope;

let state: SimState | null = null;
let hoursPerSecond = 0;
let selected: string | null = null;
let selectedInstrument: string | null = null;
let debug = false;
let carry = 0;
let last = performance.now();
let pending: SimEvent[] = [];
let dirty = true;
const TICK_MS = 50;
const VIEW_MS = 100;
let lastView = 0;
/** Presupuesto de CPU por intervalo para no saturar el worker a velocidades altas. */
const MAX_HOURS_PER_TICK = 24 * 3;

function post(msg: FromWorker): void {
  self.postMessage(msg);
}

function pushView(): void {
  if (!state) return;
  post({
    type: 'view',
    view: buildView(state, { selected, selectedInstrument, debug }),
    events: pending,
  });
  pending = [];
  dirty = false;
}

function loop(): void {
  const now = performance.now();
  const dt = (now - last) / 1000;
  last = now;
  if (state && hoursPerSecond > 0 && !state.player.bankrupt) {
    carry += dt * hoursPerSecond;
    let n = Math.min(Math.floor(carry), MAX_HOURS_PER_TICK);
    carry -= Math.floor(carry);
    while (n-- > 0) step(state);
    pending.push(...drainEvents(state));
    if (pending.length > 200) pending = pending.slice(-200);
    dirty = true;
  }
  if (dirty && now - lastView >= VIEW_MS) {
    lastView = now;
    pushView();
  }
}

setInterval(loop, TICK_MS);

self.onmessage = (e: MessageEvent<ToWorker>) => {
  const msg = e.data;
  try {
    switch (msg.type) {
      case 'new': {
        post({ type: 'progress', label: 'Generando el mundo y un año de historia…', pct: 0.1 });
        state = newGame(msg.options);
        pending = [];
        selected = state.companies.find((c) => c.status === 'listed')?.id ?? null;
        post({ type: 'ready', view: buildView(state, { selected, selectedInstrument, debug }) });
        break;
      }
      case 'load': {
        state = migrate(JSON.parse(msg.state));
        pending = [];
        selected = state.companies.find((c) => c.status === 'listed')?.id ?? null;
        post({ type: 'ready', view: buildView(state, { selected, selectedInstrument, debug }) });
        break;
      }
      case 'speed':
        hoursPerSecond = msg.hoursPerSecond;
        carry = 0;
        break;
      case 'select':
        selected = msg.id;
        dirty = true;
        break;
      case 'selectInstrument':
        selectedInstrument = msg.id;
        dirty = true;
        break;
      case 'catalog': {
        if (!state) return;
        post({ type: 'catalog', requestId: msg.requestId, page: queryCatalog(state, msg.query) });
        break;
      }
      case 'debug':
        debug = msg.enabled;
        dirty = true;
        break;
      case 'command': {
        if (!state) return;
        const result = applyCommand(state, msg.command);
        pending.push(...drainEvents(state));
        post({ type: 'commandResult', requestId: msg.requestId, result });
        pushView();
        break;
      }
      case 'quote': {
        if (!state) return;
        let q;
        if (msg.asset === 'stock') {
          const c = findCompany(state, msg.id);
          if (!c) return;
          q = quoteStock(state, c, msg.side, msg.qty);
        } else {
          const b = state.bonds.find((x) => x.id === msg.id);
          if (!b) return;
          q = quoteBond(state, b, msg.side, msg.qty);
        }
        post({
          type: 'quote',
          requestId: msg.requestId,
          quote: {
            ok: q.ok,
            reason: q.reason,
            price: q.price,
            total: fromCents(q.total),
            commission: fromCents(q.commission),
            fxFee: fromCents(q.fxFee),
            spreadPct: q.spreadPct,
            impactPct: q.impactPct,
          },
        });
        break;
      }
      case 'save': {
        if (!state) return;
        post({
          type: 'saved',
          requestId: msg.requestId,
          state: JSON.stringify(state),
          meta: {
            playerName: state.player.name,
            seed: state.seed,
            tick: state.tick,
            date: formatDate(state.tick, false),
            netWorth: fromCents(netWorth(state)),
            schemaVersion: state.schemaVersion,
          },
        });
        break;
      }
    }
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) });
  }
};
