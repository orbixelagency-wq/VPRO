import { describe, expect, it } from 'vitest';
import { dateFromTick } from '../../src/economy/calendar';
import { checkInvariants } from '../../src/economy/invariants';
import { Rng } from '../../src/economy/rng';
import { applyCommand, step, type PlayerCommand } from '../../src/economy/sim';
import type { SimState } from '../../src/economy/types';
import { freshGame } from '../economy/helpers';

function chaos(s: SimState, rng: Rng): PlayerCommand {
  const open = s.inv.instruments.filter((i) => i.status === 'open');
  const held = Object.keys(s.inv.positions);
  const pick = () => rng.pick(open);
  switch (rng.int(0, 9)) {
    case 0:
    case 1:
    case 2: {
      const i = pick();
      return {
        type: 'invBuy',
        id: i.id,
        qty: i.lot * rng.int(1, 4),
        ...(i.cls === 'realestate' && rng.chance(0.5)
          ? { mortgage: { ltv: rng.range(0.3, 0.8), years: 25 } }
          : {}),
      };
    }
    case 3:
      return held.length
        ? { type: 'invSell', id: rng.pick(held), qty: 1, quick: rng.chance(0.3) }
        : { type: 'invResearch', id: pick().id };
    case 4: {
      const m = open.filter((i) => i.cls === 'future' || i.cls === 'cfd');
      return {
        type: 'invOpen',
        id: rng.pick(m).id,
        direction: rng.chance(0.5) ? 'long' : 'short',
        qty: rng.int(1, 5),
      };
    }
    case 5:
      return held.length
        ? { type: 'invClose', id: rng.pick(held) }
        : { type: 'invResearch', id: pick().id };
    case 6:
      return { type: 'invResearch', id: pick().id };
    case 7:
      return held.length
        ? { type: 'invCancelSale', id: rng.pick(held) }
        : { type: 'toSavings', amount: 50 };
    case 8:
      return s.inv.orders.length
        ? { type: 'invCancelOrder', orderId: s.inv.orders[0]!.id }
        : { type: 'fromSavings', amount: 10 };
    default:
      return { type: 'unlockDerivatives', answers: [1, 0, 1, 1] };
  }
}

describe('Invariantes con el catálogo', () => {
  it('2 años de un jugador caótico en todas las clases de activo', () => {
    const s = freshGame({ seed: 91, startingCash: 400_000, netSalary: 3000 });
    const rng = Rng.fromSeed(91, 'chaos-inv');
    let actions = 0;
    for (let h = 0; h < 2 * 365 * 24; h++) {
      step(s);
      const d = dateFromTick(s.tick);
      if (d.hour >= 9 && d.hour <= 17 && rng.chance(0.12)) {
        applyCommand(s, chaos(s, rng));
        actions++;
      }
      if (d.hour === 20) expect(checkInvariants(s)).toEqual([]);
      s.outbox.length = 0;
    }
    expect(actions).toBeGreaterThan(500);
    expect(Object.keys(s.inv.positions).length + s.player.trades.length).toBeGreaterThan(0);
  });
});
