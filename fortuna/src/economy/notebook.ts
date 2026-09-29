import type { SimState } from './types';

/** Desbloquea un concepto del Cuaderno del inversor la primera vez que el jugador lo vive. */
export function discoverConcept(state: SimState, id: string): void {
  if (state.player.notebook.includes(id)) return;
  state.player.notebook.push(id);
  state.outbox.push({ type: 'notebook', tick: state.tick, message: id, ref: id });
}
