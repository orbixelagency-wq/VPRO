import { describe, expect, it } from 'vitest';
import { checkInvariants } from '../../src/economy/invariants';
import { newGame, stepHours } from '../../src/economy/sim';
import { CLASS_RULES } from '../../src/investments/classes';
import { catalogSummary } from '../../src/investments/view';
import { migrate } from '../../src/save/migrations';
import { freshGame } from '../economy/helpers';

describe('Catálogo de inversiones', () => {
  it('al empezar hay al menos 5.000 instrumentos y oportunidades', () => {
    const s = freshGame({ seed: 7 });
    const { total, classes } = catalogSummary(s);
    expect(total).toBeGreaterThanOrEqual(5000);
    // Todas las clases de activo del documento tienen instrumentos.
    for (const c of classes) expect(c.count, c.name).toBeGreaterThan(0);
    expect(classes.length).toBe(Object.keys(CLASS_RULES).length + 2);
  });

  it('identificadores únicos y precios válidos', () => {
    const s = freshGame({ seed: 7 });
    const ids = new Set<string>();
    for (const i of s.inv.instruments) {
      expect(ids.has(i.id), i.id).toBe(false);
      ids.add(i.id);
      expect(Number.isFinite(i.price) && i.price >= 0, `${i.id} ${i.price}`).toBe(true);
      if (i.status === 'open' && i.cls !== 'option')
        expect(i.price, `${i.cls} ${i.name}`).toBeGreaterThan(0);
    }
  });

  it('el catálogo es determinista para la misma semilla', () => {
    const a = newGame({ seed: 99 });
    const b = newGame({ seed: 99 });
    expect(a.inv.instruments.map((i) => `${i.id}:${i.price.toFixed(6)}`)).toEqual(
      b.inv.instruments.map((i) => `${i.id}:${i.price.toFixed(6)}`),
    );
  });

  it('se repone con oportunidades nuevas y sigue por encima de 5.000 tras dos años', () => {
    const s = freshGame({ seed: 7 });
    const before = new Set(s.inv.instruments.map((i) => i.id));
    stepHours(s, 2 * 365 * 24);
    const { total } = catalogSummary(s);
    expect(total).toBeGreaterThanOrEqual(5000);
    const fresh = s.inv.instruments.filter((i) => !before.has(i.id)).length;
    expect(fresh).toBeGreaterThan(3000);
    expect(checkInvariants(s)).toEqual([]);
  });

  it('una partida del esquema 1 se migra al 2 con el catálogo completo', () => {
    const s = freshGame({ seed: 7 });
    const v1 = JSON.parse(JSON.stringify(s));
    delete v1.inv;
    delete v1.ledger.balances['player:margin'];
    v1.schemaVersion = 1;
    const migrated = migrate(v1);
    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.inv.instruments.length).toBeGreaterThan(4000);
    expect(checkInvariants(migrated)).toEqual([]);
  });
});
