import { describe, expect, it } from 'vitest';
import { capitalGainsTax, maxLoan } from '../../src/economy/bank';
import { checkInvariants } from '../../src/economy/invariants';
import { applyCommand, stepHours } from '../../src/economy/sim';
import { freshGame } from './helpers';

describe('Banca', () => {
  it('un depósito devuelve capital más intereses al vencer', () => {
    const s = freshGame({ seed: 31, startingCash: 5000 });
    expect(applyCommand(s, { type: 'openDeposit', amount: 2000, months: 12 }).ok).toBe(true);
    const rate = s.player.deposits[0]!.rate;
    expect(rate).toBeGreaterThan(0);
    expect(s.ledger.balances['player:deposits']).toBe(200_000);
    stepHours(s, 366 * 24);
    expect(s.player.deposits).toHaveLength(0);
    expect(s.ledger.balances['player:deposits']).toBe(0);
    const j = s.ledger.journal;
    expect(j.find((e) => e.memo.startsWith('Vencimiento depósito'))?.amount).toBe(200_000);
    const interest = j.find((e) => e.memo.startsWith('Intereses depósito'))?.amount ?? 0;
    expect(interest).toBeCloseTo(200_000 * rate, -2);
    expect(checkInvariants(s)).toEqual([]);
  });

  it('un préstamo se amortiza por completo con las cuotas', () => {
    const s = freshGame({ seed: 32, startingCash: 3000 });
    const limit = maxLoan(s);
    expect(limit).toBeGreaterThan(0);
    expect(applyCommand(s, { type: 'takeLoan', amount: 1000, months: 12 }).ok).toBe(true);
    expect(s.player.loans).toHaveLength(1);
    stepHours(s, 14 * 31 * 24);
    expect(s.player.loans).toHaveLength(0);
    expect(checkInvariants(s)).toEqual([]);
  });

  it('el banco no presta por encima de la capacidad de pago', () => {
    const s = freshGame({ seed: 33 });
    const r = applyCommand(s, { type: 'takeLoan', amount: 1_000_000, months: 60 });
    expect(r.ok).toBe(false);
  });

  it('sin nómina ni ahorro, el descubierto lleva a la bancarrota', () => {
    const s = freshGame({ seed: 34, startingCash: 0 });
    s.player.job = null;
    stepHours(s, 365 * 24);
    expect(s.player.bankrupt).toBe(true);
    expect(checkInvariants(s)).toEqual([]);
  });

  it('el impuesto sobre ganancias es progresivo por tramos', () => {
    expect(capitalGainsTax(0)).toBe(0);
    expect(capitalGainsTax(100_000)).toBe(19_000);
    expect(capitalGainsTax(600_000)).toBe(114_000);
    expect(capitalGainsTax(1_600_000)).toBe(114_000 + 210_000);
    const big = capitalGainsTax(100_000_000);
    expect(big / 100_000_000).toBeGreaterThan(0.24);
    expect(big / 100_000_000).toBeLessThan(0.27);
  });

  it('el dinero parado pierde poder adquisitivo con la inflación', () => {
    const s = freshGame({ seed: 35 });
    const cpi0 = s.countries.find((c) => c.id === 'castelia')!.cpi;
    stepHours(s, 3 * 365 * 24);
    const cpi1 = s.countries.find((c) => c.id === 'castelia')!.cpi;
    expect(cpi1).toBeGreaterThan(cpi0);
    expect(s.player.notebook).toContain('inflacion');
  });
});
