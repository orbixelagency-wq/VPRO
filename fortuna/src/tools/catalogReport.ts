/**
 * Inspector del catálogo de inversiones.
 * Uso: npm run catalog -- [semilla] [años a simular] [--csv fichero] [--clase id]
 */
import { writeFileSync } from 'node:fs';
import { checkInvariants } from '../economy/invariants';
import { newGame, step } from '../economy/sim';
import { CLASS_META, HIDDEN_LABELS } from '../investments/meta';
import type { Instrument } from '../investments/types';
import { catalogSummary } from '../investments/view';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional = args.filter(
  (a, i) => !a.startsWith('--') && !(args[i - 1] ?? '').startsWith('--'),
);
const seed = Number(positional[0] ?? 42);
const years = Number(positional[1] ?? 0);
const onlyClass = flag('--clase');
const csv = flag('--csv');

const t0 = performance.now();
const s = newGame({ seed });
for (let h = 0; h < years * 365 * 24; h++) {
  step(s);
  s.outbox.length = 0;
}
const ms = performance.now() - t0;
const { classes, total } = catalogSummary(s);

const pctl = (xs: number[], q: number) => {
  const y = [...xs].sort((a, b) => a - b);
  return y[Math.min(y.length - 1, Math.floor(q * y.length))] ?? 0;
};
const fx = (i: Instrument) => s.countries.find((c) => c.id === i.ccy)?.fx ?? 1;
const fmt = (x: number) =>
  (x >= 1e6
    ? `${(x / 1e6).toFixed(1)} M`
    : x >= 1e3
      ? `${(x / 1e3).toFixed(1)} k`
      : x.toFixed(2)
  ).padStart(9);

console.log(
  `\nFORTUNA · catálogo · semilla ${seed} · ${years} años simulados (${(ms / 1000).toFixed(1)} s)\n`,
);
console.log(
  'clase'.padEnd(30),
  'abiertos'.padStart(8),
  'p10 ₳'.padStart(9),
  'mediana'.padStart(9),
  'p90 ₳'.padStart(9),
  'renta med.'.padStart(10),
  'subtipos',
);
for (const c of classes) {
  if (onlyClass && c.id !== onlyClass) continue;
  const list = s.inv.instruments.filter((i) => i.cls === c.id && i.status === 'open');
  if (!list.length) {
    console.log(
      `${c.glyph} ${c.name}`.padEnd(30),
      String(c.count).padStart(8),
      '   (mercado de la Fase 1)',
    );
    continue;
  }
  const prices = list.map((i) => i.price * fx(i));
  const yields = list.map((i) => i.yield);
  const subs = new Set(list.map((i) => i.sub));
  console.log(
    `${c.glyph} ${c.name}`.padEnd(30),
    String(list.length).padStart(8),
    fmt(pctl(prices, 0.1)),
    fmt(pctl(prices, 0.5)),
    fmt(pctl(prices, 0.9)),
    `${(pctl(yields, 0.5) * 100).toFixed(1)} %`.padStart(10),
    [...subs].slice(0, 6).join(', '),
  );
}
console.log(`\nTotal disponible: ${total.toLocaleString('es-ES')} instrumentos y oportunidades\n`);

// Información oculta: distribución de los campos clave.
const hiddenStats = new Map<string, number[]>();
for (const i of s.inv.instruments) {
  if (onlyClass && i.cls !== onlyClass) continue;
  for (const [k, v] of Object.entries(i.hidden)) {
    const n = typeof v === 'boolean' ? (v ? 1 : 0) : v;
    const key = `${i.cls}.${k}`;
    hiddenStats.set(key, [...(hiddenStats.get(key) ?? []), n]);
  }
}
console.log('Información oculta (media · p10 · p90):');
for (const [k, v] of [...hiddenStats].sort()) {
  const mean = v.reduce((a, b) => a + b, 0) / v.length;
  const label = HIDDEN_LABELS[k.split('.')[1]!]?.label ?? k;
  console.log(
    `  ${k.padEnd(28)} ${mean.toFixed(3).padStart(8)} ${pctl(v, 0.1).toFixed(3).padStart(8)} ${pctl(v, 0.9).toFixed(3).padStart(8)}  ${label}`,
  );
}

const errors = checkInvariants(s);
console.log(`\nInvariantes: ${errors.length ? errors.join('; ') : 'OK'}`);
console.log(`Estado serializado: ${(JSON.stringify(s).length / 1e6).toFixed(1)} MB`);

if (csv) {
  const rows = ['id;clase;subtipo;nombre;zona;precio_aur;renta;estado;liquidez_dias_expira'];
  for (const i of s.inv.instruments) {
    const meta = CLASS_META.find((m) => m.id === i.cls);
    rows.push(
      [
        i.id,
        meta?.name ?? i.cls,
        i.sub,
        `"${i.name.replace(/"/g, "'")}"`,
        i.region,
        (i.price * fx(i)).toFixed(2),
        i.yield.toFixed(4),
        i.status,
        i.expires ? Math.round((i.expires - s.tick) / 24) : '',
      ].join(';'),
    );
  }
  writeFileSync(csv, rows.join('\n'));
  console.log(`CSV escrito en ${csv} (${rows.length - 1} filas)`);
}
