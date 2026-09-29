import { describe, expect, it } from 'vitest';
import { Rng } from '../../src/economy/rng';

describe('Rng', () => {
  it('es determinista para la misma semilla y flujo', () => {
    const a = Rng.fromSeed(123, 'x');
    const b = Rng.fromSeed(123, 'x');
    for (let i = 0; i < 1000; i++) expect(a.next()).toBe(b.next());
  });

  it('flujos distintos producen secuencias distintas', () => {
    const a = Rng.fromSeed(123, 'market');
    const b = Rng.fromSeed(123, 'news');
    expect(a.next()).not.toBe(b.next());
  });

  it('el estado es serializable y reanudable', () => {
    const a = Rng.fromSeed(9);
    for (let i = 0; i < 50; i++) a.next();
    const copy = new Rng(JSON.parse(JSON.stringify(a.state)));
    for (let i = 0; i < 100; i++) expect(copy.next()).toBe(a.next());
  });

  it('uniforme en [0,1) y normal con media 0 y varianza 1', () => {
    const r = Rng.fromSeed(1);
    let sum = 0;
    let sq = 0;
    let fat = 0;
    const n = 50_000;
    for (let i = 0; i < n; i++) {
      const u = r.next();
      expect(u).toBeGreaterThanOrEqual(0);
      expect(u).toBeLessThan(1);
      const g = r.gauss();
      sum += g;
      sq += g * g;
      const t = r.fatTail();
      fat += t * t;
    }
    expect(Math.abs(sum / n)).toBeLessThan(0.02);
    expect(Math.abs(sq / n - 1)).toBeLessThan(0.03);
    expect(Math.abs(fat / n - 1)).toBeLessThan(0.05);
  });
});
