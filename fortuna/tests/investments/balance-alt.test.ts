import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/economy/sim';
import { median, runBot, STRATEGIES, type BotResult } from '../../src/tools/bots';
import { ALT_STRATEGIES } from '../../src/tools/botsAlt';

/**
 * Balance del catálogo: ninguna clase de activo es un atajo de dinero infinito y las
 * estrategias temerarias pagan su riesgo.
 */
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 4);
const YEARS = Number(process.env.BALANCE_YEARS ?? 4);

describe('Balance del catálogo', () => {
  const results: BotResult[] = [];
  const colchon = STRATEGIES.find((s) => s.id === 'colchon')!;
  for (let seed = 1; seed <= SEEDS; seed++) {
    const base = newGame({ seed: seed * 313 });
    for (const st of [colchon, ...ALT_STRATEGIES])
      results.push(runBot(st, seed * 313, YEARS, base));
  }
  const by = (id: string) => results.filter((r) => r.strategy === id);
  const med = (id: string) => median(by(id).map((r) => r.finalNetWorth));
  const ruin = (id: string) => by(id).filter((r) => r.ruined).length / by(id).length;

  it('ninguna estrategia del catálogo multiplica el dinero de forma absurda', () => {
    for (const r of results)
      expect(r.finalNetWorth, `${r.strategy} semilla ${r.seed}`).toBeLessThan(
        Math.max(1, r.contributions) * 20,
      );
  });

  it('el especulador cripto acaba peor que quien no invierte', () => {
    expect(med('cripto')).toBeLessThan(med('colchon'));
  });

  it('el apalancamiento en futuros arruina o destruye capital con frecuencia', () => {
    const bad =
      by('futuros').filter((r) => r.ruined || r.finalNetWorth < r.contributions * 0.8).length /
      by('futuros').length;
    expect(bad).toBeGreaterThanOrEqual(0.25);
  });

  it('prestar en P2P diversificado no arruina', () => {
    expect(ruin('p2p')).toBe(0);
  });

  it('coleccionar por impulso cuesta dinero (márgenes, subastas y custodia)', () => {
    expect(med('coleccionista')).toBeLessThan(med('colchon') * 1.05);
  });
});
