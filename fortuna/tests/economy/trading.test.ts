import { describe, expect, it } from 'vitest';
import { checkInvariants } from '../../src/economy/invariants';
import { netWorth } from '../../src/economy/portfolio';
import { applyCommand, step } from '../../src/economy/sim';
import { quoteStock } from '../../src/economy/trading';
import { freshGame, untilMarket } from './helpers';

describe('Operativa en bolsa', () => {
  it('comprar y vender al instante siempre pierde dinero (sin arbitraje)', async () => {
    for (const qty of [1, 10, 100, 1000]) {
      const s = freshGame({ seed: 21, startingCash: 1_000_000 });
      await untilMarket(s);
      for (const c of s.companies.filter((x) => x.status === 'listed').slice(0, 12)) {
        const before = netWorth(s);
        const cashBefore = s.ledger.balances['player:cash'];
        const buy = applyCommand(s, { type: 'order', side: 'buy', asset: 'stock', id: c.id, qty });
        if (!buy.ok) continue;
        applyCommand(s, { type: 'order', side: 'sell', asset: 'stock', id: c.id, qty });
        expect(s.ledger.balances['player:cash']).toBeLessThan(cashBefore);
        expect(netWorth(s)).toBeLessThan(before);
      }
      expect(checkInvariants(s)).toEqual([]);
    }
  });

  it('las órdenes grandes sufren más impacto y mueven el precio', async () => {
    const s = freshGame({ seed: 22, startingCash: 10_000_000 });
    await untilMarket(s);
    const c = s.companies.find((x) => x.status === 'listed')!;
    const small = quoteStock(s, c, 'buy', 1);
    const big = quoteStock(s, c, 'buy', Math.floor(c.adv));
    expect(big.impactPct).toBeGreaterThan(small.impactPct);
    expect(big.price).toBeGreaterThan(small.price);
    const p0 = c.price;
    applyCommand(s, {
      type: 'order',
      side: 'buy',
      asset: 'stock',
      id: c.id,
      qty: Math.floor(c.adv),
    });
    expect(c.price).toBeGreaterThan(p0);
  });

  it('no se puede vender lo que no se tiene ni comprar sin saldo', async () => {
    const s = freshGame({ seed: 23, startingCash: 50 });
    await untilMarket(s);
    const c = s.companies.find((x) => x.status === 'listed' && x.price > 5)!;
    expect(
      applyCommand(s, { type: 'order', side: 'sell', asset: 'stock', id: c.id, qty: 1 }).ok,
    ).toBe(false);
    expect(
      applyCommand(s, { type: 'order', side: 'buy', asset: 'stock', id: c.id, qty: 100_000 }).ok,
    ).toBe(false);
    expect(Object.keys(s.player.stocks)).toHaveLength(0);
  });

  it('con el mercado cerrado la orden espera a la apertura', async () => {
    const s = freshGame({ seed: 24, startingCash: 5000 });
    await untilMarket(s, 20);
    const c = s.companies.find((x) => x.status === 'listed')!;
    const r = applyCommand(s, { type: 'order', side: 'buy', asset: 'stock', id: c.id, qty: 2 });
    expect(r.ok).toBe(true);
    expect(s.player.orders).toHaveLength(1);
    await untilMarket(s, 10);
    expect(s.player.orders).toHaveLength(0);
    expect(s.player.stocks[c.id]?.qty).toBe(2);
  });

  it('las órdenes límite solo se ejecutan si el precio llega', async () => {
    const s = freshGame({ seed: 25, startingCash: 5000 });
    await untilMarket(s);
    const c = s.companies.find((x) => x.status === 'listed')!;
    applyCommand(s, {
      type: 'order',
      side: 'buy',
      asset: 'stock',
      id: c.id,
      qty: 1,
      limit: c.price * 0.01,
    });
    for (let i = 0; i < 48; i++) step(s);
    expect(s.player.stocks[c.id]).toBeUndefined();
    expect(s.player.orders).toHaveLength(1);
  });

  it('los bonos se compran, pagan cupón y se amortizan a la par', async () => {
    const s = freshGame({ seed: 26, startingCash: 50_000 });
    await untilMarket(s);
    const b = s.bonds
      .filter((x) => x.status === 'active' && x.country === 'castelia')
      .sort((a, z) => a.maturityTick - z.maturityTick)[0]!;
    expect(
      applyCommand(s, { type: 'order', side: 'buy', asset: 'bond', id: b.id, qty: 10 }).ok,
    ).toBe(true);
    const cashAfterBuy = s.ledger.balances['player:cash'];
    while (s.tick < b.maturityTick + 48) step(s);
    expect(b.status).toBe('matured');
    expect(s.player.bonds[b.id]).toBeUndefined();
    expect(s.ledger.balances['player:cash']).toBeGreaterThan(cashAfterBuy);
    expect(checkInvariants(s)).toEqual([]);
  });
});
