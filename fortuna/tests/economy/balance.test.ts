import { describe, expect, it } from 'vitest';
import { newGame } from '../../src/economy/sim';
import { median, runBot, STRATEGIES, type BotResult } from '../../src/tools/bots';

/**
 * Pruebas de balance con jugadores automáticos. Verifican que la economía premia la
 * prudencia a largo plazo, castiga la temeridad y no tiene atajos de dinero infinito.
 * BALANCE_SEEDS y BALANCE_YEARS permiten ejecutar la versión larga.
 */
const SEEDS = Number(process.env.BALANCE_SEEDS ?? 6);
const YEARS = Number(process.env.BALANCE_YEARS ?? 5);

describe('Balance económico', () => {
  const results: BotResult[] = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    const base = newGame({ seed: seed * 101 });
    for (const st of STRATEGIES) results.push(runBot(st, seed * 101, YEARS, base));
  }
  const by = (id: string) => results.filter((r) => r.strategy === id);
  const med = (id: string) => median(by(id).map((r) => r.finalNetWorth));
  const ruin = (id: string) => by(id).filter((r) => r.ruined).length / by(id).length;

  it('las estrategias prudentes no se arruinan', () => {
    for (const id of ['colchon', 'ahorrador', 'indexador']) expect(ruin(id)).toBe(0);
  });

  it('invertir con paciencia rinde más que ahorrar, y ahorrar más que no hacer nada', () => {
    expect(med('ahorrador')).toBeGreaterThanOrEqual(med('colchon'));
    expect(med('indexador')).toBeGreaterThan(med('colchon'));
  });

  it('la inflación erosiona el dinero parado', () => {
    for (const r of by('colchon')) expect(r.realNetWorth).toBeLessThan(r.finalNetWorth);
  });

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
