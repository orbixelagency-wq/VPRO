import { describe, expect, it } from 'vitest';
import { applyCommand, newGame, step, stepHours, type PlayerCommand } from '../../src/economy/sim';
import { freshGame, untilMarket } from './helpers';

const YEAR = 365 * 24;

describe('Determinismo', () => {
  it('la misma semilla genera exactamente el mismo mundo', () => {
    const a = newGame({ seed: 2024 });
    const b = newGame({ seed: 2024 });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('semillas distintas generan mundos distintos', () => {
    const a = freshGame({ seed: 1 });
    const b = freshGame({ seed: 2 });
    expect(a.companies.map((c) => c.name)).not.toEqual(b.companies.map((c) => c.name));
  });

  it('dos simulaciones idénticas con los mismos comandos terminan igual', async () => {
    const run = async () => {
      const s = freshGame({ seed: 11 });
      await untilMarket(s);
      const cmds: PlayerCommand[] = [
        { type: 'order', side: 'buy', asset: 'stock', id: s.companies[0]!.id, qty: 3 },
        { type: 'toSavings', amount: 100 },
      ];
      for (const c of cmds) applyCommand(s, c);
      stepHours(s, YEAR / 2);
      return JSON.stringify(s);
    };
    expect(await run()).toBe(await run());
  });

  it('guardar y cargar a mitad de partida no altera el futuro', () => {
    const a = freshGame({ seed: 5 });
    stepHours(a, 2000);
    const saved = JSON.parse(JSON.stringify(a));
    stepHours(a, YEAR / 2);
    stepHours(saved, YEAR / 2);
    expect(JSON.stringify(saved)).toBe(JSON.stringify(a));
  });

  it('las acciones del jugador no desplazan el azar del resto del mundo', () => {
    const a = freshGame({ seed: 3 });
    const b = freshGame({ seed: 3 });
    applyCommand(b, { type: 'toSavings', amount: 200 });
    for (let i = 0; i < 24 * 30; i++) {
      step(a);
      step(b);
    }
    expect(b.global).toEqual(a.global);
    expect(b.countries.map((c) => c.policyRate)).toEqual(a.countries.map((c) => c.policyRate));
  });
});
