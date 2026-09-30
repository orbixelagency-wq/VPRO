import { describe, expect, it } from 'vitest';
import { dateFromTick, tickFromDate } from '../../src/economy/calendar';
import { checkInvariants } from '../../src/economy/invariants';
import { applyCommand } from '../../src/economy/sim';
import { buildView } from '../../src/economy/view';
import { openState } from '../../src/world/hours';
import { freshGame } from './helpers';

describe('Vida en la ciudad', () => {
  it('comprar en la tienda descuenta el precio de la cuenta y conserva el dinero', () => {
    const s = freshGame();
    const before = s.ledger.balances['player:cash'];
    const r = applyCommand(s, { type: 'purchase', item: 'cafe' });
    expect(r.ok).toBe(true);
    expect(s.ledger.balances['player:cash']).toBe(before - 140);
    expect(s.ledger.journal.at(-1)?.memo).toBe('Café con leche');
    expect(checkInvariants(s)).toEqual([]);
    expect(applyCommand(s, { type: 'purchase', item: 'yate' }).ok).toBe(false);
  });

  it('dormir avanza el reloj hasta las 8:00 del día siguiente', () => {
    const s = freshGame();
    const start = s.tick;
    const r = applyCommand(s, { type: 'waitUntil', hour: 8 });
    expect(r.ok).toBe(true);
    expect(dateFromTick(s.tick).hour).toBe(8);
    expect(s.tick - start).toBeGreaterThan(0);
    expect(s.tick - start).toBeLessThanOrEqual(24);
    expect(checkInvariants(s)).toEqual([]);
  });

  it('la vista incluye el tiempo actual y la previsión de cuatro días', () => {
    const v = buildView(freshGame());
    expect(v.meteo.temp).toBeGreaterThan(-10);
    expect(v.forecast).toHaveLength(4);
  });
});

describe('Horarios', () => {
  const monday = (() => {
    let t = tickFromDate(2031, 1, 13, 0);
    while (dateFromTick(t).weekday !== 0) t += 24;
    return t;
  })();

  it('el banco abre por la mañana los laborables y cierra el fin de semana', () => {
    expect(openState('banco', monday + 10).open).toBe(true);
    expect(openState('banco', monday + 16).open).toBe(false);
    expect(openState('banco', monday + 5).note).toContain('8:00');
    expect(openState('banco', monday + 5 * 24 + 10).open).toBe(false);
  });

  it('la Bolsa solo abre los días de mercado y la casa siempre', () => {
    expect(openState('bolsa', monday + 11).open).toBe(true);
    expect(openState('bolsa', monday + 6 * 24 + 11).open).toBe(false);
    expect(openState('casa', monday + 3).open).toBe(true);
    expect(openState('tienda', monday + 23).note).toContain('mañana');
  });
});
