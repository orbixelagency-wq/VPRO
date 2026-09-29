import { newGame, type NewGameOptions } from '../../src/economy/sim';
import type { SimState } from '../../src/economy/types';

const cache = new Map<string, SimState>();

/** Partida nueva (cacheada por opciones, se devuelve una copia independiente). */
export function freshGame(opts: NewGameOptions = { seed: 7 }): SimState {
  const key = JSON.stringify(opts);
  let base = cache.get(key);
  if (!base) {
    base = newGame(opts);
    cache.set(key, base);
  }
  return structuredClone(base);
}

/** Avanza hasta el siguiente instante con el mercado abierto (hora indicada). */
export async function untilMarket(state: SimState, hour = 11): Promise<void> {
  const { step } = await import('../../src/economy/sim');
  const { dateFromTick, isTradingDay } = await import('../../src/economy/calendar');
  for (let i = 0; i < 24 * 8; i++) {
    const d = dateFromTick(state.tick);
    if (isTradingDay(d) && d.hour === hour) return;
    step(state);
  }
  throw new Error('No se encontró sesión de mercado');
}
