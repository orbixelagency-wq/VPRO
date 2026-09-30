import type { NewGameOptions, PlayerCommand, CommandResult } from '../economy/sim';
import type { SimEvent } from '../economy/types';
import type { SimView } from '../economy/view';
import type { CatalogPage, CatalogQuery } from '../investments/view';

/** Velocidades del reloj: horas de juego por segundo real. 0 = pausa. */
export const SPEEDS = [0, 1, 6, 24, 24 * 7, 24 * 30] as const;

export type ToWorker =
  | { type: 'new'; options: NewGameOptions }
  | { type: 'load'; state: string }
  | { type: 'speed'; hoursPerSecond: number }
  | { type: 'command'; requestId: number; command: PlayerCommand }
  | { type: 'select'; id: string | null }
  | { type: 'selectInstrument'; id: string | null }
  | { type: 'catalog'; requestId: number; query: CatalogQuery }
  | { type: 'debug'; enabled: boolean }
  | { type: 'save'; requestId: number }
  | {
      type: 'quote';
      requestId: number;
      asset: 'stock' | 'bond';
      id: string;
      side: 'buy' | 'sell';
      qty: number;
    };

export interface QuoteView {
  ok: boolean;
  reason?: string;
  price: number;
  total: number;
  commission: number;
  fxFee: number;
  spreadPct: number;
  impactPct: number;
}

export type FromWorker =
  | { type: 'ready'; view: SimView }
  | { type: 'progress'; label: string; pct: number }
  | { type: 'view'; view: SimView; events: SimEvent[] }
  | { type: 'commandResult'; requestId: number; result: CommandResult }
  | { type: 'saved'; requestId: number; state: string; meta: SaveMeta }
  | { type: 'quote'; requestId: number; quote: QuoteView }
  | { type: 'catalog'; requestId: number; page: CatalogPage }
  | { type: 'error'; message: string };

export interface SaveMeta {
  playerName: string;
  seed: number;
  tick: number;
  date: string;
  netWorth: number;
  schemaVersion: number;
}
