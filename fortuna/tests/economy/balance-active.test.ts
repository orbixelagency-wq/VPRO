import { describe, expect, it } from 'vitest';
import { runStrategies } from './balanceRuns';

/** Balance (3/3): la gestión activa puede premiar el análisis, pero sin atajos. */
describe('Balance económico · gestión activa', () => {
  const { results, ruin } = runStrategies(['valor', 'momentum']);

  it('valor y tendencias no se arruinan sin apalancamiento', () => {
    expect(ruin('valor')).toBe(0);
    expect(ruin('momentum')).toBeLessThanOrEqual(0.2);
  });

  it('no existe ningún atajo de dinero infinito', () => {
    for (const r of results) expect(r.finalNetWorth).toBeLessThan(Math.max(1, r.contributions) * 8);
  });
});
