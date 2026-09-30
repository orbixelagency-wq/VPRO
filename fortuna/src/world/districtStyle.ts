/**
 * Estilo urbano de cada barrio: cómo se parcela, cuánto sube y de qué color es.
 * Datos puros (sin Three.js) para que el generador de ciudad sea testeable.
 */
export type BlockUse =
  'manzana' | 'torres' | 'naves' | 'villas' | 'adosados' | 'campo' | 'parque' | 'plaza';

export interface DistrictStyle {
  /** Número de plantas [mín, máx]. */
  floors: [number, number];
  /** Fachada de cada parcela [mín, máx] en metros. */
  frontage: [number, number];
  /** Fondo edificable [mín, máx]. */
  depth: [number, number];
  /** Usos de manzana con sus pesos. */
  uses: Partial<Record<BlockUse, number>>;
  /** Paleta de fachadas (hex). */
  palette: string[];
  /** Estilo de fachada: índice del atlas de ventanas. */
  facades: number[];
  /** Densidad de farolas y árboles (0–1). */
  lights: number;
  trees: number;
}

export const DISTRICT_STYLES: Record<string, DistrictStyle> = {
  gruas: {
    floors: [4, 9],
    frontage: [12, 22],
    depth: [12, 18],
    uses: { manzana: 8, parque: 1, plaza: 0.6 },
    palette: ['#b9a58f', '#a58c78', '#c7b8a2', '#8f7f72', '#b3a28a'],
    facades: [0, 1],
    lights: 0.8,
    trees: 0.4,
  },
  casco: {
    floors: [3, 6],
    frontage: [8, 14],
    depth: [10, 15],
    uses: { manzana: 9, plaza: 1.2 },
    palette: ['#d8c3a0', '#e3d2b4', '#c9a97f', '#e6c9a8', '#bfa27c', '#d9b99a'],
    facades: [2],
    lights: 1,
    trees: 0.2,
  },
  lonja: {
    floors: [12, 48],
    frontage: [26, 44],
    depth: [22, 36],
    uses: { torres: 8, plaza: 1.4, parque: 0.6 },
    palette: ['#7c8a97', '#5f6d7a', '#9aa6b0', '#495663', '#8795a3'],
    facades: [3, 4],
    lights: 1,
    trees: 0.6,
  },
  campus: {
    floors: [3, 8],
    frontage: [18, 34],
    depth: [14, 22],
    uses: { manzana: 5, parque: 2.2, plaza: 1 },
    palette: ['#b2574a', '#c26a55', '#a8664f', '#d0a386', '#9c5446'],
    facades: [1, 5],
    lights: 0.9,
    trees: 0.9,
  },
  puerto: {
    floors: [2, 4],
    frontage: [30, 70],
    depth: [24, 44],
    uses: { naves: 9, plaza: 0.4 },
    palette: ['#6f7b83', '#8a7b66', '#5f6a70', '#9b8f7b', '#4f5a60'],
    facades: [6],
    lights: 0.6,
    trees: 0.05,
  },
  almendros: {
    floors: [2, 3],
    frontage: [22, 34],
    depth: [14, 20],
    uses: { villas: 9, parque: 1 },
    palette: ['#f1ebe0', '#e8e0d0', '#f5efe4', '#dcd2c0', '#ebe6dc'],
    facades: [7],
    lights: 0.5,
    trees: 1,
  },
  villanueva: {
    floors: [2, 4],
    frontage: [9, 14],
    depth: [10, 14],
    uses: { adosados: 7, manzana: 2, parque: 1.3 },
    palette: ['#d9c9b0', '#cdb79d', '#e2d6c1', '#b9a48c', '#d3c2a8'],
    facades: [7, 0],
    lights: 0.7,
    trees: 0.8,
  },
  poligono: {
    floors: [2, 3],
    frontage: [28, 60],
    depth: [22, 40],
    uses: { naves: 9, plaza: 0.5 },
    palette: ['#8c939a', '#a19a8a', '#7a8288', '#b5ab95', '#6a7278'],
    facades: [6],
    lights: 0.5,
    trees: 0.1,
  },
  vega: {
    floors: [1, 2],
    frontage: [16, 24],
    depth: [12, 18],
    uses: { campo: 9, villas: 1 },
    palette: ['#e6dcc6', '#d8c7a4', '#efe6d2'],
    facades: [7],
    lights: 0.15,
    trees: 0.6,
  },
  costa: {
    floors: [3, 10],
    frontage: [16, 28],
    depth: [12, 18],
    uses: { manzana: 6, parque: 1, plaza: 1 },
    palette: ['#f2efe8', '#e7f0f2', '#f5e9d7', '#dfe8ea', '#efe3cf'],
    facades: [5, 2],
    lights: 0.8,
    trees: 0.7,
  },
};
