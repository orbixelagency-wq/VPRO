const nf = (min: number, max: number) =>
  new Intl.NumberFormat('es-ES', { minimumFractionDigits: min, maximumFractionDigits: max });
const n0 = nf(0, 0);
const n2 = nf(2, 2);
const n1 = nf(1, 1);

export const money = (x: number, decimals = 2) => `${(decimals === 0 ? n0 : n2).format(x)} ₳`;
export const num = (x: number, decimals = 2) =>
  (decimals === 0 ? n0 : decimals === 1 ? n1 : n2).format(x);
export const pct = (x: number, decimals = 2, sign = false) =>
  `${sign && x > 0 ? '+' : ''}${nf(decimals, decimals).format(x * 100)} %`;
export const signed = (x: number, decimals = 2) =>
  `${x > 0 ? '+' : ''}${(decimals === 0 ? n0 : n2).format(x)}`;

/** Cifras grandes compactas: 1,2 M ₳, 850 mil ₳. */
export function compact(x: number, unit = ' ₳'): string {
  const a = Math.abs(x);
  if (a >= 1e12) return `${n1.format(x / 1e12)} B${unit}`;
  if (a >= 1e9) return `${n1.format(x / 1e9)} mil M${unit}`;
  if (a >= 1e6) return `${n1.format(x / 1e6)} M${unit}`;
  if (a >= 1e4) return `${n1.format(x / 1e3)} mil${unit}`;
  return `${n0.format(x)}${unit}`;
}

/** Capitalización ya expresada en millones. */
export const capMillions = (m: number) => compact(m * 1e6);

export const toneClass = (x: number) => (x > 0.00001 ? 'up' : x < -0.00001 ? 'down' : 'flat');
