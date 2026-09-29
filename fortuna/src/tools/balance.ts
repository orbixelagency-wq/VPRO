/**
 * Informe de balance: todas las estrategias automáticas sobre varias semillas.
 * Uso: npm run balance -- [nº semillas] [años]
 */
import { newGame } from '../economy/sim';
import { median, runBot, STRATEGIES, type BotResult } from './bots';

const nSeeds = Number(process.argv[2] ?? 8);
const years = Number(process.argv[3] ?? 6);
const results: BotResult[] = [];
const t0 = performance.now();
for (let seed = 1; seed <= nSeeds; seed++) {
  const base = newGame({ seed });
  for (const st of STRATEGIES) results.push(runBot(st, seed, years, base));
}
const fmt = (x: number) => Math.round(x).toLocaleString('es-ES').padStart(10);
console.log(
  `${nSeeds} semillas × ${years} años (${((performance.now() - t0) / 1000).toFixed(1)} s)\n`,
);
console.log(
  'estrategia'.padEnd(12),
  'mediana ₳'.padStart(10),
  'real ₳'.padStart(10),
  'p10'.padStart(10),
  'p90'.padStart(10),
  'máx'.padStart(10),
  'ruina',
  'DD med',
  'comis.'.padStart(8),
);
for (const st of STRATEGIES) {
  const r = results.filter((x) => x.strategy === st.id);
  const nw = r.map((x) => x.finalNetWorth).sort((a, b) => a - b);
  const p = (q: number) => nw[Math.min(nw.length - 1, Math.floor(q * nw.length))] ?? 0;
  console.log(
    st.id.padEnd(12),
    fmt(median(nw)),
    fmt(median(r.map((x) => x.realNetWorth))),
    fmt(p(0.1)),
    fmt(p(0.9)),
    fmt(Math.max(...nw)),
    `${Math.round((r.filter((x) => x.ruined).length / r.length) * 100)}%`.padStart(5),
    `${Math.round(median(r.map((x) => x.maxDrawdown)) * 100)}%`.padStart(6),
    fmt(median(r.map((x) => x.fees))).slice(2),
  );
}
console.log(`\nAportaciones medias: ${fmt(median(results.map((x) => x.contributions)))} ₳`);
