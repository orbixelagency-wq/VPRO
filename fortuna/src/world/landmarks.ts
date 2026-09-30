/**
 * Edificios singulares de Puerto Valmera (datos puros, sin Three.js): la Bolsa, la sede del
 * Banco de Valmera, el Ayuntamiento, la Universidad, el Hospital, y la casa y la tienda de
 * barrio del jugador. Cada uno es una lista de piezas (cajas, cilindros, prismas, cúpulas) que
 * `cityMesh.ts` dibuja y `physics.ts` convierte en colisiones.
 */
import { DISTRICTS } from '../data/districts';
import type { Rng } from '../economy/rng';
import type { Block, Building, Prop, Rect } from './cityGen';

export type LandmarkId =
  'casa' | 'tienda' | 'banco' | 'bolsa' | 'ayuntamiento' | 'universidad' | 'hospital';

export type PartMat =
  | 'stone'
  | 'stoneDark'
  | 'facade'
  | 'metal'
  | 'patina'
  | 'roof'
  | 'accent'
  | 'door'
  | 'glassLit'
  | 'sign'
  | 'clock'
  | 'fabric'
  | 'wood'
  | 'floor'
  | 'wall'
  | 'ceiling'
  | 'screen'
  | 'ticker'
  | 'plant'
  | 'bed'
  | 'dark';

export interface Part {
  shape: 'box' | 'cyl' | 'prism' | 'dome' | 'sphere';
  /** Centro en planta. */
  x: number;
  z: number;
  /** Base (cota inferior). */
  y: number;
  /** Ancho (x) o diámetro; alto; fondo (z). */
  w: number;
  h: number;
  d: number;
  mat: PartMat;
  color?: string;
  /** Índice de fachada para `mat: 'facade'`. */
  facade?: number;
  /** Colisiona con el jugador. */
  solid?: boolean;
  /** Texto de un rótulo (`mat: 'sign'`). */
  text?: string;
  /** Prisma: dirección de la cumbrera. */
  axis?: 'x' | 'z';
  /** Brilla de noche. */
  glow?: boolean;
  /** Hacia dónde mira un rótulo, reloj o panel (normal en planta). Por defecto +z. */
  face?: { x: number; z: number };
}

export interface Door {
  /** Punto en el plano de fachada. */
  x: number;
  z: number;
  /** Normal hacia la calle. */
  nx: number;
  nz: number;
}

export interface Landmark {
  id: LandmarkId;
  name: string;
  district: string;
  door: Door;
  parts: Part[];
  /** Tiene interior visitable. */
  interior: boolean;
  footprint: Rect;
}

const GROUND = 0.15; // cota de la acera

const NAMES: Record<LandmarkId, string> = {
  casa: 'Tu casa',
  tienda: 'Ultramarinos La Esquina',
  banco: 'Banco de Valmera',
  bolsa: 'Bolsa de Valmera',
  ayuntamiento: 'Ayuntamiento',
  universidad: 'Universidad de Valmera',
  hospital: 'Hospital General',
};

export function landmarkName(id: LandmarkId): string {
  return NAMES[id];
}

interface Slot {
  id: LandmarkId;
  district: string;
  use: Block['use'];
  build(b: Block): { parts: Part[]; door: Door };
}

const SLOTS: Slot[] = [
  { id: 'bolsa', district: 'lonja', use: 'plaza', build: bolsa },
  { id: 'banco', district: 'lonja', use: 'plaza', build: banco },
  { id: 'ayuntamiento', district: 'casco', use: 'plaza', build: ayuntamiento },
  { id: 'universidad', district: 'campus', use: 'parque', build: universidad },
  { id: 'hospital', district: 'villanueva', use: 'plaza', build: hospital },
];

const bw = (r: Rect) => r.x1 - r.x0;
const bd = (r: Rect) => r.z1 - r.z0;
const inRect = (r: Rect, x: number, z: number, m = 0) =>
  x >= r.x0 - m && x <= r.x1 + m && z >= r.z0 - m && z <= r.z1 + m;

export function placeLandmarks(
  rng: Rng,
  blocks: Block[],
  buildings: Building[],
  props: Prop[],
  sidewalk: number,
): { landmarks: Landmark[]; buildings: Building[]; props: Prop[] } {
  const landmarks: Landmark[] = [];
  let bs = buildings;
  let ps = props;
  const used = new Set<Block>();

  for (const slot of SLOTS) {
    const anchor = DISTRICTS.find((d) => d.id === slot.district)!.pos;
    let best: Block | null = null;
    let bestD = Infinity;
    for (const b of blocks) {
      if (used.has(b) || b.district !== slot.district) continue;
      if (bw(b.inner) < 56 || bd(b.inner) < 56) continue;
      const cx = (b.rect.x0 + b.rect.x1) / 2;
      const cz = (b.rect.z0 + b.rect.z1) / 2;
      const dd = Math.hypot(cx - anchor[0], cz - anchor[1]);
      if (dd < bestD) {
        bestD = dd;
        best = b;
      }
    }
    if (!best) continue;
    used.add(best);
    const blk = best;
    bs = bs.filter((x) => !inRect(blk.rect, x.x, x.z));
    ps = ps.filter((p) => p.kind === 'farola' || !inRect(blk.inner, p.x, p.z, 0.5));
    blk.use = slot.use;
    blk.landmark = slot.id;
    const { parts, door } = slot.build(blk);
    // Árboles y bancos en la plaza delantera.
    const r = blk.inner;
    for (const side of [-1, 1]) {
      for (let z = r.z1 - 4; z > door.z + 9; z -= 9) {
        ps.push({
          kind: 'arbol',
          x: (r.x0 + r.x1) / 2 + side * (bw(r) / 2 - 3),
          z,
          rot: 0,
          scale: rng.range(0.9, 1.2),
        });
      }
      ps.push({
        kind: 'banco',
        x: (r.x0 + r.x1) / 2 + side * (bw(r) / 2 - 9),
        z: Math.max(door.z + 8, r.z1 - 10),
        rot: side > 0 ? Math.PI / 2 : -Math.PI / 2,
        scale: 1,
      });
    }
    landmarks.push({
      id: slot.id,
      name: NAMES[slot.id],
      district: slot.district,
      door,
      parts,
      interior: slot.id === 'bolsa' || slot.id === 'banco',
      footprint: blk.inner,
    });
  }

  // Casa y tienda: bloques existentes de Las Grúas con fachada a la calle.
  const gruas = DISTRICTS.find((d) => d.id === 'gruas')!.pos;
  const candidates: { b: Building; door: Door; dist: number }[] = [];
  for (const b of bs) {
    if (b.district !== 'gruas' || b.kind !== 'bloque' || b.w < 9 || b.d < 9) continue;
    const blk = blocks.find((k) => inRect(k.rect, b.x, b.z));
    if (!blk || blk.landmark) continue;
    const door = streetDoor(b, blk.inner);
    if (!door) continue;
    candidates.push({ b, door, dist: Math.hypot(b.x - gruas[0], b.z - gruas[1]) });
  }
  candidates.sort((a, b) => a.dist - b.dist);
  const home = candidates[0];
  if (home) {
    landmarks.push({
      id: 'casa',
      name: NAMES.casa,
      district: 'gruas',
      door: home.door,
      parts: homeParts(home.door),
      interior: true,
      footprint: rectOf(home.b),
    });
    // La tienda: cerca de casa, en otro edificio y con fachada ancha.
    const shop = candidates.find(
      (c) =>
        c.b !== home.b &&
        Math.max(c.b.w, c.b.d) >= 12 &&
        Math.hypot(c.door.x - home.door.x, c.door.z - home.door.z) > 25 &&
        Math.hypot(c.door.x - home.door.x, c.door.z - home.door.z) < 160,
    );
    if (shop) {
      landmarks.push({
        id: 'tienda',
        name: NAMES.tienda,
        district: 'gruas',
        door: shop.door,
        parts: shopParts(shop.door, sidewalk),
        interior: true,
        footprint: rectOf(shop.b),
      });
    }
  }
  return { landmarks, buildings: bs, props: ps };
}

function rectOf(b: Building): Rect {
  return { x0: b.x - b.w / 2, x1: b.x + b.w / 2, z0: b.z - b.d / 2, z1: b.z + b.d / 2 };
}

/** Puerta en la cara del edificio que da a la acera (si alguna coincide con el borde). */
function streetDoor(b: Building, inner: Rect): Door | null {
  const e = 0.05;
  if (Math.abs(b.z + b.d / 2 - inner.z1) < e) return { x: b.x, z: inner.z1, nx: 0, nz: 1 };
  if (Math.abs(b.z - b.d / 2 - inner.z0) < e) return { x: b.x, z: inner.z0, nx: 0, nz: -1 };
  if (Math.abs(b.x + b.w / 2 - inner.x1) < e) return { x: inner.x1, z: b.z, nx: 1, nz: 0 };
  if (Math.abs(b.x - b.w / 2 - inner.x0) < e) return { x: inner.x0, z: b.z, nx: -1, nz: 0 };
  return null;
}

/**
 * Coloca una pieza definida en coordenadas locales de fachada (u a lo largo, v hacia la calle)
 * sobre una puerta con cualquier orientación.
 */
function onFacade(
  door: Door,
  u: number,
  v: number,
  y: number,
  w: number,
  h: number,
  depth: number,
  p: Omit<Part, 'x' | 'z' | 'y' | 'w' | 'h' | 'd'>,
): Part {
  const alongX = door.nz !== 0;
  // Eje "a lo largo" de la fachada y normal.
  const tx = alongX ? 1 : 0;
  const tz = alongX ? 0 : 1;
  const x = door.x + tx * u + door.nx * v;
  const z = door.z + tz * u + door.nz * v;
  const axis = p.axis ? (alongX ? p.axis : p.axis === 'x' ? 'z' : 'x') : undefined;
  return {
    ...p,
    axis,
    face: { x: door.nx, z: door.nz },
    x,
    z,
    y,
    w: alongX ? w : depth,
    h,
    d: alongX ? depth : w,
  };
}

function homeParts(door: Door): Part[] {
  return [
    onFacade(door, 0, 0.08, GROUND, 2.2, 2.9, 0.18, { shape: 'box', mat: 'stoneDark' }),
    onFacade(door, 0, 0.12, GROUND, 1.6, 2.5, 0.12, { shape: 'box', mat: 'door' }),
    onFacade(door, 0, 0.35, GROUND + 3.0, 0.3, 0.3, 0.3, {
      shape: 'box',
      mat: 'accent',
      color: '#ffe2a8',
      glow: true,
    }),
    onFacade(door, 1.55, 0.1, GROUND + 2.1, 0.7, 0.45, 0.05, {
      shape: 'box',
      mat: 'sign',
      text: '14',
      color: '#1d4e89',
    }),
  ];
}

function shopParts(door: Door, sidewalk: number): Part[] {
  const awning = Math.min(2.2, sidewalk - 0.8);
  return [
    // Escaparates iluminados a ambos lados de la puerta.
    onFacade(door, -3.4, 0.06, GROUND + 0.5, 3.8, 2.1, 0.08, { shape: 'box', mat: 'glassLit' }),
    onFacade(door, 3.4, 0.06, GROUND + 0.5, 3.8, 2.1, 0.08, { shape: 'box', mat: 'glassLit' }),
    onFacade(door, 0, 0.08, GROUND, 1.8, 2.5, 0.1, { shape: 'box', mat: 'glassLit' }),
    // Toldo verde y rótulo.
    onFacade(door, 0, awning / 2, GROUND + 2.8, 11, 0.5, awning, {
      shape: 'prism',
      axis: 'x',
      mat: 'fabric',
      color: '#2f6b4a',
    }),
    onFacade(door, 0, 0.1, GROUND + 3.4, 7.5, 0.8, 0.12, {
      shape: 'box',
      mat: 'sign',
      text: 'ULTRAMARINOS LA ESQUINA',
      color: '#2f6b4a',
      glow: true,
    }),
    // Cajas de fruta en la acera.
    onFacade(door, -5.2, 0.35, GROUND, 1.2, 0.7, 0.7, {
      shape: 'box',
      mat: 'wood',
      solid: true,
    }),
  ];
}

// --- Edificios singulares: la fachada principal mira al sur (+z), hacia la plaza. ---

function bolsa(b: Block): { parts: Part[]; door: Door } {
  const r = b.inner;
  const cx = (r.x0 + r.x1) / 2;
  const w = Math.min(bw(r) - 14, 58);
  const d = Math.min(bd(r) - 26, 34);
  const z0 = r.z0 + 6;
  const wall = z0 + d;
  const front = wall + 7;
  const top = GROUND + 0.9;
  const parts: Part[] = [
    {
      shape: 'box',
      x: cx,
      z: (z0 + front) / 2 - 1,
      y: GROUND,
      w: w + 4,
      h: 0.9,
      d: front - z0 + 2,
      mat: 'stone',
      solid: true,
    },
    {
      shape: 'box',
      x: cx,
      z: front + 0.35,
      y: GROUND,
      w: w * 0.62,
      h: 0.6,
      d: 0.7,
      mat: 'stone',
      solid: true,
    },
    {
      shape: 'box',
      x: cx,
      z: front + 1.05,
      y: GROUND,
      w: w * 0.62,
      h: 0.3,
      d: 0.7,
      mat: 'stone',
      solid: true,
    },
    { shape: 'box', x: cx, z: z0 + d / 2, y: top, w, h: 13, d, mat: 'stone', solid: true },
    // Entablamento, frontón y rótulo.
    {
      shape: 'box',
      x: cx,
      z: (wall + front) / 2,
      y: top + 9.6,
      w,
      h: 1.6,
      d: front - wall,
      mat: 'stone',
    },
    {
      shape: 'prism',
      axis: 'x',
      x: cx,
      z: (wall + front) / 2,
      y: top + 11.2,
      w: w + 0.4,
      h: 3.8,
      d: front - wall + 0.4,
      mat: 'stone',
    },
    {
      shape: 'box',
      x: cx,
      z: front + 0.02,
      y: top + 9.85,
      w: w * 0.55,
      h: 1.1,
      d: 0.08,
      mat: 'sign',
      text: 'BOLSA DE VALMERA',
      color: '#3a3226',
    },
    // Cúpula de cobre.
    { shape: 'cyl', x: cx, z: z0 + d / 2, y: top + 13, w: 15, h: 3, d: 15, mat: 'stone' },
    { shape: 'dome', x: cx, z: z0 + d / 2, y: top + 16, w: 15, h: 7.5, d: 15, mat: 'patina' },
    { shape: 'cyl', x: cx, z: z0 + d / 2, y: top + 23.3, w: 1.2, h: 3, d: 1.2, mat: 'patina' },
    // Puerta monumental.
    { shape: 'box', x: cx, z: wall + 0.15, y: top, w: 3.6, h: 5.6, d: 0.3, mat: 'door' },
  ];
  const n = 8;
  for (let i = 0; i < n; i++) {
    const x = cx - w * 0.45 + (w * 0.9 * i) / (n - 1);
    parts.push({
      shape: 'cyl',
      x,
      z: front - 1.2,
      y: top,
      w: 1.2,
      h: 9.6,
      d: 1.2,
      mat: 'stone',
      solid: true,
    });
  }
  // Mástiles con banderas a los lados de la escalinata.
  for (const s of [-1, 1]) {
    const x = cx + s * (w * 0.36);
    parts.push({
      shape: 'cyl',
      x,
      z: front + 3,
      y: GROUND,
      w: 0.18,
      h: 11,
      d: 0.18,
      mat: 'metal',
      solid: true,
    });
    parts.push({
      shape: 'box',
      x: x + 1.1,
      z: front + 3,
      y: GROUND + 8.6,
      w: 2.2,
      h: 1.4,
      d: 0.05,
      mat: 'fabric',
      color: s > 0 ? '#1d4e89' : '#b8862b',
    });
  }
  return { parts, door: { x: cx, z: wall, nx: 0, nz: 1 } };
}

function banco(b: Block): { parts: Part[]; door: Door } {
  const r = b.inner;
  const cx = (r.x0 + r.x1) / 2;
  const pw = Math.min(bw(r) - 12, 58);
  const pd = Math.min(bd(r) - 24, 40);
  const z0 = r.z0 + 6;
  const front = z0 + pd;
  const tw = 26;
  const td = 24;
  const tz = z0 + td / 2 + 2;
  const th = 96;
  return {
    parts: [
      {
        shape: 'box',
        x: cx,
        z: z0 + pd / 2,
        y: GROUND,
        w: pw,
        h: 10,
        d: pd,
        mat: 'stoneDark',
        solid: true,
      },
      {
        shape: 'box',
        x: cx,
        z: tz,
        y: GROUND,
        w: tw,
        h: th,
        d: td,
        mat: 'facade',
        facade: 4,
        solid: true,
      },
      {
        shape: 'box',
        x: cx,
        z: tz,
        y: GROUND + th,
        w: tw - 6,
        h: 9,
        d: td - 6,
        mat: 'accent',
        color: '#c9a45c',
        glow: true,
      },
      {
        shape: 'box',
        x: cx,
        z: tz,
        y: GROUND + th + 9,
        w: tw - 12,
        h: 4,
        d: td - 12,
        mat: 'metal',
      },
      { shape: 'cyl', x: cx, z: tz, y: GROUND + th + 13, w: 0.7, h: 20, d: 0.7, mat: 'metal' },
      {
        shape: 'box',
        x: cx,
        z: front + 2.2,
        y: GROUND + 4.6,
        w: 16,
        h: 0.45,
        d: 4.4,
        mat: 'metal',
      },
      { shape: 'box', x: cx, z: front + 0.08, y: GROUND, w: 7, h: 4.2, d: 0.16, mat: 'glassLit' },
      {
        shape: 'box',
        x: cx,
        z: front + 0.05,
        y: GROUND + 6.4,
        w: pw * 0.55,
        h: 1.5,
        d: 0.1,
        mat: 'sign',
        text: 'BANCO DE VALMERA',
        color: '#0f2a44',
        glow: true,
      },
      // Columnas del porche.
      {
        shape: 'cyl',
        x: cx - 7.4,
        z: front + 4,
        y: GROUND,
        w: 0.5,
        h: 4.6,
        d: 0.5,
        mat: 'metal',
        solid: true,
      },
      {
        shape: 'cyl',
        x: cx + 7.4,
        z: front + 4,
        y: GROUND,
        w: 0.5,
        h: 4.6,
        d: 0.5,
        mat: 'metal',
        solid: true,
      },
    ],
    door: { x: cx, z: front, nx: 0, nz: 1 },
  };
}

function ayuntamiento(b: Block): { parts: Part[]; door: Door } {
  const r = b.inner;
  const cx = (r.x0 + r.x1) / 2;
  const w = Math.min(bw(r) - 16, 54);
  const d = Math.min(bd(r) - 30, 24);
  const z0 = r.z0 + 8;
  const wall = z0 + d;
  const tf = wall + 4;
  return {
    parts: [
      {
        shape: 'box',
        x: cx,
        z: z0 + d / 2,
        y: GROUND,
        w,
        h: 15,
        d,
        mat: 'facade',
        facade: 2,
        color: '#e3c48f',
        solid: true,
      },
      {
        shape: 'prism',
        axis: 'x',
        x: cx,
        z: z0 + d / 2,
        y: GROUND + 15,
        w: w + 0.6,
        h: 4.5,
        d: d + 0.6,
        mat: 'roof',
      },
      {
        shape: 'box',
        x: cx,
        z: tf - 4.5,
        y: GROUND,
        w: 9,
        h: 31,
        d: 9,
        mat: 'stone',
        color: '#dcc39a',
        solid: true,
      },
      {
        shape: 'prism',
        axis: 'x',
        x: cx,
        z: tf - 4.5,
        y: GROUND + 31,
        w: 9.4,
        h: 5,
        d: 9.4,
        mat: 'roof',
      },
      { shape: 'box', x: cx, z: tf + 0.03, y: GROUND + 23, w: 5, h: 5, d: 0.08, mat: 'clock' },
      { shape: 'box', x: cx, z: tf + 0.2, y: GROUND + 7, w: 8, h: 0.35, d: 1.6, mat: 'stone' },
      { shape: 'box', x: cx, z: tf + 0.06, y: GROUND, w: 3.2, h: 5, d: 0.12, mat: 'door' },
      {
        shape: 'box',
        x: cx,
        z: tf + 0.05,
        y: GROUND + 11,
        w: 7,
        h: 0.9,
        d: 0.08,
        mat: 'sign',
        text: 'AYUNTAMIENTO',
        color: '#6b4b2a',
      },
      { shape: 'cyl', x: cx, z: tf - 4.5, y: GROUND + 36, w: 0.14, h: 7, d: 0.14, mat: 'metal' },
      {
        shape: 'box',
        x: cx + 1.3,
        z: tf - 4.5,
        y: GROUND + 41,
        w: 2.6,
        h: 1.6,
        d: 0.05,
        mat: 'fabric',
        color: '#1d4e89',
      },
    ],
    door: { x: cx, z: tf, nx: 0, nz: 1 },
  };
}

function universidad(b: Block): { parts: Part[]; door: Door } {
  const r = b.inner;
  const cx = (r.x0 + r.x1) / 2;
  const w = Math.min(bw(r) - 10, 88);
  const d = Math.min(bd(r) - 36, 20);
  const z0 = r.z0 + 8;
  const wall = z0 + d;
  const parts: Part[] = [
    {
      shape: 'box',
      x: cx,
      z: z0 + d / 2,
      y: GROUND,
      w,
      h: 13,
      d,
      mat: 'facade',
      facade: 1,
      color: '#b8684a',
      solid: true,
    },
    {
      shape: 'box',
      x: cx,
      z: z0 + d / 2 + 3,
      y: GROUND,
      w: 22,
      h: 19,
      d: d + 6,
      mat: 'stone',
      solid: true,
    },
    {
      shape: 'prism',
      axis: 'x',
      x: cx,
      z: wall + 3,
      y: GROUND + 19,
      w: 22.6,
      h: 4,
      d: 0.8,
      mat: 'stone',
    },
    {
      shape: 'box',
      x: cx,
      z: wall + 6.05,
      y: GROUND + 15.5,
      w: 16,
      h: 1.1,
      d: 0.08,
      mat: 'sign',
      text: 'UNIVERSIDAD DE VALMERA',
      color: '#3a3226',
    },
    { shape: 'box', x: cx, z: wall + 6.06, y: GROUND, w: 3.4, h: 5, d: 0.12, mat: 'door' },
  ];
  for (const s of [-1, 1])
    parts.push({
      shape: 'box',
      x: cx + s * (w / 2 - 6),
      z: z0 + d / 2,
      y: GROUND + 13,
      w: 8,
      h: 6,
      d: 8,
      mat: 'stone',
    });
  return { parts, door: { x: cx, z: wall + 6, nx: 0, nz: 1 } };
}

function hospital(b: Block): { parts: Part[]; door: Door } {
  const r = b.inner;
  const cx = (r.x0 + r.x1) / 2;
  const w = Math.min(bw(r) - 12, 64);
  const d = Math.min(bd(r) - 26, 30);
  const z0 = r.z0 + 6;
  const wall = z0 + d;
  return {
    parts: [
      {
        shape: 'box',
        x: cx,
        z: z0 + d / 2,
        y: GROUND,
        w,
        h: 26,
        d,
        mat: 'facade',
        facade: 5,
        solid: true,
      },
      {
        shape: 'box',
        x: cx,
        z: wall + 3,
        y: GROUND,
        w: 24,
        h: 6,
        d: 6,
        mat: 'facade',
        facade: 5,
        solid: true,
      },
      { shape: 'box', x: cx, z: wall + 7, y: GROUND + 4.2, w: 14, h: 0.4, d: 3, mat: 'metal' },
      { shape: 'box', x: cx, z: wall + 6.06, y: GROUND, w: 5, h: 3.4, d: 0.12, mat: 'glassLit' },
      {
        shape: 'box',
        x: cx,
        z: wall + 6.05,
        y: GROUND + 4.9,
        w: 14,
        h: 0.9,
        d: 0.08,
        mat: 'sign',
        text: 'HOSPITAL GENERAL',
        color: '#b3261e',
        glow: true,
      },
      // Cruz roja en la azotea.
      {
        shape: 'box',
        x: cx,
        z: z0 + 3,
        y: GROUND + 28,
        w: 6,
        h: 2,
        d: 0.6,
        mat: 'accent',
        color: '#d7322a',
        glow: true,
      },
      {
        shape: 'box',
        x: cx,
        z: z0 + 3,
        y: GROUND + 26,
        w: 2,
        h: 6,
        d: 0.6,
        mat: 'accent',
        color: '#d7322a',
        glow: true,
      },
      {
        shape: 'box',
        x: cx,
        z: z0 + d / 2,
        y: GROUND + 26,
        w: 18,
        h: 0.3,
        d: 18,
        mat: 'stoneDark',
      },
    ],
    door: { x: cx, z: wall + 6, nx: 0, nz: 1 },
  };
}
