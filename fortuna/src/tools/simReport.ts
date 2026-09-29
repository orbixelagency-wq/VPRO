/**
 * Informe de calibración: simula varios años y muestra estadísticas del mundo.
 * Uso: npm run sim -- [semilla] [años]
 */
import { HOURS_PER_DAY, DAYS_PER_YEAR } from '../economy/calendar';
import { checkInvariants } from '../economy/invariants';
import { PHASE_LABEL } from '../economy/macro';
import { newGame, step } from '../economy/sim';

const seed = Number(process.argv[2] ?? 42);
const years = Number(process.argv[3] ?? 10);
const t0 = performance.now();
const s = newGame({ seed });
const tInit = performance.now() - t0;
const idx = s.indices[0]!;
const startIdx = idx.value;
const phases: string[] = [];
let lastPhase = s.global.phase;
const yearly: string[] = [];
let yStart = idx.value;
const t1 = performance.now();
for (let y = 0; y < years; y++) {
  for (let h = 0; h < DAYS_PER_YEAR * HOURS_PER_DAY; h++) {
    step(s);
    if (s.global.phase !== lastPhase) {
      phases.push(`${Math.floor(s.tick / 8760) + 2030}:${PHASE_LABEL[s.global.phase]}`);
      lastPhase = s.global.phase;
    }
  }
  s.outbox = [];
  const home = s.countries[0]!;
  yearly.push(
    `${2031 + y}: índice ${(idx.value / yStart - 1) * 100 >= 0 ? '+' : ''}${((idx.value / yStart - 1) * 100).toFixed(1)}%  miedo ${s.global.fear.toFixed(0)}  tipo ${(home.policyRate * 100).toFixed(2)}%  IPC ${(home.inflation * 100).toFixed(1)}%  PIB ${(home.gdpGrowth * 100).toFixed(1)}%  paro ${(home.unemployment * 100).toFixed(1)}%  crudo ${s.global.oil.toFixed(0)}  shock ${s.global.shock?.kind ?? '-'}`,
  );
  yStart = idx.value;
}
const ms = performance.now() - t1;
const closes = idx.closes.slice(-years * 252);
const rets = closes.slice(1).map((v, i) => Math.log(v / closes[i]!));
const mean = rets.reduce((a, b) => a + b, 0) / rets.length;
const sd = Math.sqrt(rets.reduce((a, b) => a + (b - mean) ** 2, 0) / rets.length);
let peak = 0,
  mdd = 0;
for (const v of closes) {
  peak = Math.max(peak, v);
  mdd = Math.max(mdd, 1 - v / peak);
}
console.log(yearly.join('\n'));
console.log('Fases:', phases.join(' | '));
console.log(
  `Índice: ${startIdx.toFixed(0)} → ${idx.value.toFixed(0)}  CAGR ${((Math.pow(idx.value / startIdx, 1 / years) - 1) * 100).toFixed(2)}%  vol anual ${(sd * Math.sqrt(252) * 100).toFixed(1)}%  max drawdown ${(mdd * 100).toFixed(1)}%`,
);
const st = { listed: 0, bankrupt: 0, acquired: 0 };
for (const c of s.companies) st[c.status]++;
console.log('Empresas:', st, 'total', s.companies.length);
const vols = s.companies
  .filter((c) => c.status === 'listed')
  .map((c) => {
    const cl = c.closes.slice(-252);
    const r = cl.slice(1).map((v, i) => Math.log(v / cl[i]!));
    const m = r.reduce((a, b) => a + b, 0) / r.length;
    return Math.sqrt(r.reduce((a, b) => a + (b - m) ** 2, 0) / r.length) * Math.sqrt(252);
  });
vols.sort((a, b) => a - b);
console.log(
  `Vol anual acciones: min ${(vols[0]! * 100).toFixed(0)}% mediana ${(vols[Math.floor(vols.length / 2)]! * 100).toFixed(0)}% max ${(vols[vols.length - 1]! * 100).toFixed(0)}%`,
);
console.log(
  'Precios (primeras 8):',
  s.companies
    .slice(0, 8)
    .map((c) => `${c.id} ${c.price.toFixed(2)} (fv ${c.fairValue.toFixed(2)})`)
    .join(', '),
);
console.log('Invariantes:', checkInvariants(s));
console.log(
  `Tiempo: init ${tInit.toFixed(0)} ms, ${years} años ${ms.toFixed(0)} ms (${(ms / years).toFixed(0)} ms/año)`,
);
