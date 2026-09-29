import { SCHEMA_VERSION } from '../economy/generate';
import type { SimState } from '../economy/types';

/**
 * Migraciones de partidas guardadas. Cada entrada transforma el esquema N en N+1.
 * Nunca se borra una migración: así cualquier partida antigua sigue cargando.
 */
type Migration = (s: Record<string, unknown>) => Record<string, unknown>;

const MIGRATIONS: Record<number, Migration> = {
  // 1 → 2: (ejemplo para futuras versiones)
};

export function migrate(raw: unknown): SimState {
  if (!raw || typeof raw !== 'object') throw new Error('Partida corrupta: formato no válido');
  let s = raw as Record<string, unknown>;
  let v = typeof s.schemaVersion === 'number' ? s.schemaVersion : 0;
  if (v > SCHEMA_VERSION)
    throw new Error(`La partida es de una versión más nueva del juego (esquema ${v})`);
  while (v < SCHEMA_VERSION) {
    const m = MIGRATIONS[v];
    if (!m) throw new Error(`No hay migración desde el esquema ${v}`);
    s = m(s);
    v++;
    s.schemaVersion = v;
  }
  for (const key of ['tick', 'seed', 'ledger', 'companies', 'countries', 'player', 'rng']) {
    if (!(key in s)) throw new Error(`Partida corrupta: falta "${key}"`);
  }
  return s as unknown as SimState;
}
