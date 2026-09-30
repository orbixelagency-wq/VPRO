import { describe, expect, it } from 'vitest';
import { runStrategies } from './balanceRuns';

/** Balance (2/3): operar compulsivamente o con apalancamiento se paga. */
describe('Balance económico · estrategias temerarias', () => {
  const { med, ruin, results } = runStrategies(['colchon', 'daytrader', 'yolo']);

  it('operar compulsivamente destruye capital por costes', () => {
    expect(med('daytrader')).toBeLessThan(med('colchon') * 0.5);
  });

  it('el apalancamiento temerario arruina con alta probabilidad', () => {
    expect(ruin('yolo')).toBeGreaterThanOrEqual(0.35);
  });

  it('no existe ningún atajo de dinero infinito', () => {
    for (const r of results)
      expect(r.finalNetWorth).toBeLessThan(Math.max(1, r.contributions) * 25);
  });
});
