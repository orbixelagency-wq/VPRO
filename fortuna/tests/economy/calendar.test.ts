import { describe, expect, it } from 'vitest';
import {
  dateFromTick,
  isMarketOpen,
  isTradingDay,
  tickFromDate,
  START_YEAR,
} from '../../src/economy/calendar';

describe('Calendario', () => {
  it('convierte fechas en ticks y viceversa', () => {
    for (const [y, m, d, h] of [
      [START_YEAR, 0, 1, 0],
      [START_YEAR + 1, 1, 28, 13],
      [START_YEAR + 5, 11, 31, 23],
      [START_YEAR + 2, 6, 15, 9],
    ] as const) {
      const t = tickFromDate(y, m, d, h);
      const back = dateFromTick(t);
      expect([back.year, back.month, back.day, back.hour]).toEqual([y, m, d, h]);
    }
  });

  it('la bolsa cierra fines de semana y festivos', () => {
    const newYear = dateFromTick(tickFromDate(START_YEAR + 1, 0, 1, 10));
    expect(isTradingDay(newYear)).toBe(false);
    let weekend = 0;
    for (let day = 0; day < 14; day++) if (!isTradingDay(dateFromTick(day * 24))) weekend++;
    expect(weekend).toBeGreaterThanOrEqual(4);
    const mondayNoon = tickFromDate(START_YEAR, 0, 8, 12); // día 7 = lunes
    expect(isMarketOpen(mondayNoon)).toBe(true);
    expect(isMarketOpen(mondayNoon + 10)).toBe(false);
  });
});
