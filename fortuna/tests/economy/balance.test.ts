import { describe, expect, it } from 'vitest';
import { runStrategies } from './balanceRuns';

/** Balance (1/3): la prudencia a largo plazo funciona. */
describe('Balance económico · estrategias prudentes', () => {
  const { by, med, ruin } = runStrategies(['colchon', 'ahorrador', 'indexador']);

  it('las estrategias prudentes no se arruinan', () => {
    for (const id of ['colchon', 'ahorrador', 'indexador']) expect(ruin(id)).toBe(0);
  });

  it('invertir con paciencia rinde más que ahorrar, y ahorrar más que no hacer nada', () => {
    expect(med('ahorrador')).toBeGreaterThanOrEqual(med('colchon'));
    expect(med('indexador')).toBeGreaterThan(med('colchon'));
  });

  it('la inflación erosiona el dinero parado', () => {
    for (const r of by('colchon')) expect(r.realNetWorth).toBeLessThan(r.finalNetWorth);
  });
});
