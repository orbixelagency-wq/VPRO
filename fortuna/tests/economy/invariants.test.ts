import { describe, expect, it } from 'vitest';
import { dateFromTick, isTradingDay } from '../../src/economy/calendar';
import { checkInvariants } from '../../src/economy/invariants';
import { Rng } from '../../src/economy/rng';
import { applyCommand, step, type PlayerCommand } from '../../src/economy/sim';
import { freshGame } from './helpers';

/** Un jugador caótico que hace de todo al azar: la simulación no debe romperse nunca. */
function chaosCommand(s: ReturnType<typeof freshGame>, rng: Rng): PlayerCommand {
  const listed = s.companies.filter((c) => c.status === 'listed');
  const bonds = s.bonds.filter((b) => b.status === 'active');
  const held = Object.keys(s.player.stocks);
  switch (rng.int(0, 9)) {
    case 0:
    case 1:
      return {
        type: 'order',
        side: 'buy',
        asset: 'stock',
        id: rng.pick(listed).id,
        qty: rng.int(1, 40),
      };
    case 2:
      return held.length
        ? { type: 'order', side: 'sell', asset: 'stock', id: rng.pick(held), qty: rng.int(1, 60) }
        : { type: 'toSavings', amount: rng.int(1, 500) };
    case 3:
      return {
        type: 'order',
        side: rng.chance(0.5) ? 'buy' : 'sell',
        asset: 'bond',
        id: rng.pick(bonds).id,
        qty: rng.int(1, 5),
      };
    case 4:
      return { type: 'toSavings', amount: rng.int(1, 800) };
    case 5:
      return { type: 'fromSavings', amount: rng.int(1, 800) };
    case 6:
      return { type: 'openDeposit', amount: rng.int(400, 2000), months: rng.pick([3, 6, 12]) };
    case 7:
      return s.player.deposits.length
        ? { type: 'breakDeposit', depositId: s.player.deposits[0]!.id }
        : { type: 'takeLoan', amount: rng.int(500, 6000), months: 24 };
    case 8:
      return s.player.loans.length
        ? { type: 'repayLoan', loanId: s.player.loans[0]!.id, amount: rng.int(50, 900) }
        : { type: 'takeLoan', amount: 2000, months: 36 };
    default:
      return {
        type: 'order',
        side: 'buy',
        asset: 'stock',
        id: rng.pick(listed).id,
        qty: rng.int(1, 10),
        limit: 0.0001,
      };
  }
}

describe('Invariantes', () => {
  it('3 años con un jugador caótico: el dinero se conserva y no hay valores imposibles', () => {
    const s = freshGame({ seed: 77, startingCash: 5000 });
    const rng = Rng.fromSeed(77, 'chaos');
    let checks = 0;
    for (let h = 0; h < 3 * 365 * 24; h++) {
      step(s);
      const d = dateFromTick(s.tick);
      if (isTradingDay(d) && d.hour >= 9 && d.hour <= 17 && rng.chance(0.08))
        applyCommand(s, chaosCommand(s, rng));
      if (d.hour === 20) {
        const errors = checkInvariants(s);
        expect(errors).toEqual([]);
        checks++;
      }
      s.outbox.length = 0;
    }
    expect(checks).toBeGreaterThan(1000);
    expect(s.player.trades.length).toBeGreaterThan(20);
  });

  it('10 años sin jugador: precios positivos, índices vivos y mercado repuesto', () => {
    const s = freshGame({ seed: 8 });
    for (let h = 0; h < 10 * 365 * 24; h++) {
      step(s);
      if (h % (24 * 90) === 0) expect(checkInvariants(s)).toEqual([]);
      s.outbox.length = 0;
    }
    expect(checkInvariants(s)).toEqual([]);
    const listed = s.companies.filter((c) => c.status === 'listed').length;
    expect(listed).toBeGreaterThanOrEqual(44);
    expect(s.indices.every((i) => i.value > 0)).toBe(true);
  });
});
