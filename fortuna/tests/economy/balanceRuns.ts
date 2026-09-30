import { newGame } from '../../src/economy/sim';
import { median, runBot, STRATEGIES, type BotResult } from '../../src/tools/bots';

/**
 * Ejecuta un subconjunto de bots sobre varias semillas. Los tests de balance se reparten
 * en varios archivos para que Vitest los ejecute en paralelo.
 * BALANCE_SEEDS y BALANCE_YEARS permiten ejecutar la versión larga.
 */
export const SEEDS = Number(process.env.BALANCE_SEEDS ?? 6);
export const YEARS = Number(process.env.BALANCE_YEARS ?? 5);

export function runStrategies(ids: string[]) {
  const results: BotResult[] = [];
  for (let seed = 1; seed <= SEEDS; seed++) {
    const base = newGame({ seed: seed * 101 });
    for (const st of STRATEGIES.filter((s) => ids.includes(s.id)))
      results.push(runBot(st, seed * 101, YEARS, base));
  }
  const by = (id: string) => results.filter((r) => r.strategy === id);
  return {
    results,
    by,
    med: (id: string) => median(by(id).map((r) => r.finalNetWorth)),
    ruin: (id: string) => by(id).filter((r) => r.ruined).length / by(id).length,
  };
}
