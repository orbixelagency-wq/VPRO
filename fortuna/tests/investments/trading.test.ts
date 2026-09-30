import { describe, expect, it } from 'vitest';
import { DERIVATIVES_QUIZ } from '../../src/data/quiz';
import { dateFromTick } from '../../src/economy/calendar';
import { checkInvariants } from '../../src/economy/invariants';
import { netWorth } from '../../src/economy/portfolio';
import { applyCommand, step, stepHours } from '../../src/economy/sim';
import type { SimState } from '../../src/economy/types';
import { executeBuy, executeSell, findInstrument, maxMortgage } from '../../src/investments/engine';
import type { Instrument } from '../../src/investments/types';
import { freshGame, untilMarket } from '../economy/helpers';

function until18(s: SimState): void {
  for (let i = 0; i < 30; i++) {
    step(s);
    if (dateFromTick(s.tick).hour === 18) return;
  }
}

const rich = (seed: number, cash = 2_000_000) => freshGame({ seed, startingCash: cash });

describe('Operativa del catálogo', () => {
  it('comprar y vender al instante nunca da beneficio, en ninguna clase', () => {
    const s = rich(41);
    s.inv.unlocks.derivatives = true;
    const byClass = new Map<string, Instrument[]>();
    for (const i of s.inv.instruments) {
      if (i.status !== 'open' || i.cls === 'future' || i.cls === 'cfd' || i.cls === 'philanthropy')
        continue;
      const list = byClass.get(i.cls) ?? [];
      if (list.length < 6) list.push(i);
      byClass.set(i.cls, list);
    }
    let tested = 0;
    for (const [cls, list] of byClass) {
      for (const inst of list) {
        const cash0 = s.ledger.balances['player:cash'];
        const nw0 = netWorth(s);
        const qty = inst.lot;
        const b = executeBuy(s, inst, qty);
        if (!b.ok) continue;
        const r = executeSell(s, inst, qty, 'normal');
        expect(r.ok, `${cls} ${inst.name}: ${r.message}`).toBe(true);
        // Nunca se gana; solo los fondos sin comisiones (valor liquidativo) salen a la par.
        if (cls === 'fund') expect(s.ledger.balances['player:cash']).toBeLessThanOrEqual(cash0);
        else expect(s.ledger.balances['player:cash'], `${cls} ${inst.name}`).toBeLessThan(cash0);
        expect(netWorth(s)).toBeLessThanOrEqual(nw0);
        tested++;
      }
    }
    expect(tested).toBeGreaterThan(60);
    expect(checkInvariants(s)).toEqual([]);
  });

  it('las órdenes de fondos y cripto se ejecutan al precio de las 18:00', () => {
    const s = rich(42);
    const etf = s.inv.instruments.find((i) => i.cls === 'etf')!;
    const r = applyCommand(s, { type: 'invBuy', id: etf.id, qty: 10 });
    expect(r.ok).toBe(true);
    expect(s.inv.positions[etf.id]).toBeUndefined();
    until18(s);
    expect(s.inv.positions[etf.id]?.qty).toBe(10);
  });

  it('un inmueble con hipoteca cobra alquiler, paga IBI y cancela la hipoteca al venderse', () => {
    const s = freshGame({ seed: 43, startingCash: 60_000, netSalary: 4000 });
    const home = s.inv.instruments
      .filter(
        (i) => i.cls === 'realestate' && i.status === 'open' && i.yield > 0.04 && i.price < 150_000,
      )
      .sort((a, b) => a.price - b.price)
      .find((i) => maxMortgage(s, i, 25) > i.price * 70)!;
    expect(home).toBeDefined();
    expect(
      applyCommand(s, { type: 'invBuy', id: home.id, qty: 1, mortgage: { ltv: 0.7, years: 25 } })
        .ok,
    ).toBe(true);
    until18(s);
    const pos = s.inv.positions[home.id]!;
    expect(pos).toBeDefined();
    expect(pos.mortgageId).toBeDefined();
    expect(s.player.loans.some((l) => l.kind === 'mortgage')).toBe(true);
    stepHours(s, 200 * 24);
    const memos = s.ledger.journal.map((j) => j.memo);
    expect(memos.some((m) => m.startsWith('IBI'))).toBe(true);
    expect(
      memos.some((m) => m.startsWith('Alquiler')) ||
        (s.inv.positions[home.id]?.vacantMonths ?? 0) > 0,
    ).toBe(true);
    expect(applyCommand(s, { type: 'invSell', id: home.id, qty: 1 }).ok).toBe(true);
    stepHours(s, 160 * 24);
    expect(s.inv.positions[home.id]).toBeUndefined();
    expect(s.player.loans.some((l) => l.kind === 'mortgage')).toBe(false);
    expect(checkInvariants(s)).toEqual([]);
  });

  it('los derivados exigen el test de conveniencia', () => {
    const s = rich(44);
    const fut = s.inv.instruments.find((i) => i.cls === 'future')!;
    expect(applyCommand(s, { type: 'invOpen', id: fut.id, direction: 'long', qty: 1 }).ok).toBe(
      false,
    );
    expect(applyCommand(s, { type: 'unlockDerivatives', answers: [0, 0, 0, 0] }).ok).toBe(false);
    expect(
      applyCommand(s, { type: 'unlockDerivatives', answers: DERIVATIVES_QUIZ.map((q) => q.answer) })
        .ok,
    ).toBe(true);
    expect(applyCommand(s, { type: 'invOpen', id: fut.id, direction: 'long', qty: 1 }).ok).toBe(
      true,
    );
  });

  it('una posición apalancada que se hunde recibe llamadas de margen o se liquida', () => {
    const s = freshGame({ seed: 45, startingCash: 30_000 });
    s.inv.unlocks.derivatives = true;
    const fut = s.inv.instruments.find(
      (i) => i.cls === 'future' && i.attrs['underlying'] === 'cmd:oro',
    )!;
    expect(applyCommand(s, { type: 'invOpen', id: fut.id, direction: 'long', qty: 1 }).ok).toBe(
      true,
    );
    until18(s);
    expect(s.inv.positions[fut.id]).toBeDefined();
    const cash0 = s.ledger.balances['player:cash'];
    // Hundimos el oro un 40 %: la garantía (10 %) se evapora.
    s.inv.commodities['oro']!.price *= 0.6;
    s.inv.commodities['oro']!.anchor *= 0.6;
    for (let i = 0; i < 26; i++) step(s);
    const events = s.outbox.map((e) => e.message).join(' | ');
    expect(events).toMatch(/margen|liquidaci|garant/i);
    expect(s.ledger.balances['player:cash']).toBeLessThan(cash0);
    expect(checkInvariants(s)).toEqual([]);
  });

  it('las opciones compradas se liquidan por diferencias al vencer', async () => {
    const s = rich(46);
    s.inv.unlocks.derivatives = true;
    await untilMarket(s);
    const opt = s.inv.instruments
      .filter((i) => i.cls === 'option' && i.status === 'open')
      .sort((a, b) => Number(a.attrs['expiry']) - Number(b.attrs['expiry']))[0]!;
    expect(applyCommand(s, { type: 'invBuy', id: opt.id, qty: 2 }).ok).toBe(true);
    expect(s.inv.positions[opt.id]?.qty).toBe(2);
    while (s.tick < Number(opt.attrs['expiry']) + 24 * 9) step(s);
    expect(s.inv.positions[opt.id]).toBeUndefined();
    expect(findInstrument(s, opt.id)?.status ?? 'expired').toBe('expired');
    expect(checkInvariants(s)).toEqual([]);
  });

  it('investigar cuesta dinero, tarda días y revela estimaciones', () => {
    const s = rich(47);
    const art = s.inv.instruments.find(
      (i) => i.cls === 'collectible' && i.status === 'open' && (i.expires ?? 0) > s.tick + 30 * 24,
    )!;
    const cash0 = s.ledger.balances['player:cash'];
    expect(applyCommand(s, { type: 'invResearch', id: art.id }).ok).toBe(true);
    expect(s.ledger.balances['player:cash']).toBeLessThan(cash0);
    expect(s.inv.research[art.id] ?? 0).toBe(0);
    stepHours(s, 5 * 24);
    expect(s.inv.research[art.id]).toBe(1);
  });

  it('las donaciones y los planes de pensiones desgravan en enero', () => {
    const s = rich(48, 50_000);
    const cause = s.inv.instruments.find((i) => i.cls === 'philanthropy')!;
    const plan = s.inv.instruments.find((i) => i.cls === 'pension')!;
    applyCommand(s, { type: 'invBuy', id: cause.id, qty: 1000 });
    applyCommand(s, { type: 'invBuy', id: plan.id, qty: 50 });
    until18(s);
    expect(s.inv.donationsYtd).toBe(100_000);
    expect(s.inv.pensionYtd).toBeGreaterThan(0);
    stepHours(s, 366 * 24);
    expect(s.ledger.journal.some((j) => j.memo.startsWith('Devolución de Hacienda'))).toBe(true);
    expect(s.inv.reputation[String(cause.attrs['faction'])]).toBeGreaterThan(0);
  });
});
