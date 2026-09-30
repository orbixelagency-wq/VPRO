/**
 * Generador procedural de Puerto Valmera. Produce datos puros (sin Three.js): calles,
 * manzanas, edificios y mobiliario urbano. Determinista con la semilla de la partida.
 * Unidades: metros. x crece hacia el este, z hacia el sur. El mar queda al oeste.
 */
import { DISTRICTS } from '../data/districts';
import { Rng } from '../economy/rng';
import { DISTRICT_STYLES, type BlockUse } from './districtStyle';
import { placeLandmarks, type Landmark, type LandmarkId } from './landmarks';

export interface Rect {
  x0: number;
  z0: number;
  x1: number;
  z1: number;
}

export interface Road {
  rect: Rect;
  axis: 'x' | 'z';
  width: number;
  avenue: boolean;
}

export type BuildingKind = 'bloque' | 'torre' | 'nave' | 'villa' | 'adosado' | 'granja' | 'podio';

export interface Building {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  floors: number;
  district: string;
  kind: BuildingKind;
  color: string;
  facade: number;
  roof: 'plano' | 'dos-aguas';
}

export interface Prop {
  kind: 'farola' | 'arbol' | 'banco' | 'fuente';
  x: number;
  z: number;
  rot: number;
  scale: number;
}

export interface Block {
  rect: Rect;
  inner: Rect;
  district: string;
  use: BlockUse;
  /** Posición en la retícula (índices de las calles que la delimitan por el oeste y el norte). */
  gi: number;
  gj: number;
  /** Edificio singular que ocupa la manzana, si lo hay. */
  landmark?: LandmarkId;
}

export interface CityLayout {
  seed: number;
  bounds: Rect;
  /** Coordenada x de la línea de costa (al oeste está el mar). */
  coastX: number;
  sidewalk: number;
  roads: Road[];
  blocks: Block[];
  buildings: Building[];
  props: Prop[];
  /** Ejes de la retícula: calles norte-sur (xs) y este-oeste (zs). */
  grid: { xs: GridLine[]; zs: GridLine[] };
  landmarks: Landmark[];
  spawn: { x: number; z: number };
}

export const CITY_BOUNDS: Rect = { x0: -640, z0: -760, x1: 860, z1: 760 };
export const COAST_X = -660;
const SIDEWALK = 3.5;
const FLOOR_H = 3.2;

/** Barrio de un punto: el centro más cercano (Voronoi). */
export function districtAt(x: number, z: number): string {
  let best = DISTRICTS[0]!.id;
  let bd = Infinity;
  for (const d of DISTRICTS) {
    const dx = x - d.pos[0];
    const dz = z - d.pos[1];
    const dist = dx * dx + dz * dz;
    if (dist < bd) {
      bd = dist;
      best = d.id;
    }
  }
  return best;
}

export interface GridLine {
  pos: number;
  width: number;
  avenue: boolean;
}

function gridLines(rng: Rng, from: number, to: number): GridLine[] {
  const out: GridLine[] = [];
  let p = from;
  let i = 0;
  while (p <= to) {
    const avenue = i % 3 === 0;
    out.push({ pos: p, width: avenue ? 18 : 11, avenue });
    p += rng.range(76, 112);
    i++;
  }
  return out;
}

function inset(r: Rect, m: number): Rect {
  return { x0: r.x0 + m, z0: r.z0 + m, x1: r.x1 - m, z1: r.z1 - m };
}

const w = (r: Rect) => r.x1 - r.x0;
const d = (r: Rect) => r.z1 - r.z0;

export function generateCity(seed: number): CityLayout {
  const rng = Rng.fromSeed(seed, 'city');
  const B = CITY_BOUNDS;
  const xs = gridLines(rng, B.x0, B.x1);
  const zs = gridLines(rng, B.z0, B.z1);
  const roads: Road[] = [];
  const x0 = xs[0]!.pos;
  const x1 = xs[xs.length - 1]!.pos;
  const z0 = zs[0]!.pos;
  const z1 = zs[zs.length - 1]!.pos;
  for (const l of xs)
    roads.push({
      rect: {
        x0: l.pos - l.width / 2,
        x1: l.pos + l.width / 2,
        z0: z0 - zs[0]!.width / 2,
        z1: z1 + zs[zs.length - 1]!.width / 2,
      },
      axis: 'z',
      width: l.width,
      avenue: l.avenue,
    });
  for (const l of zs)
    roads.push({
      rect: {
        z0: l.pos - l.width / 2,
        z1: l.pos + l.width / 2,
        x0: x0 - xs[0]!.width / 2,
        x1: x1 + xs[xs.length - 1]!.width / 2,
      },
      axis: 'x',
      width: l.width,
      avenue: l.avenue,
    });

  const blocks: Block[] = [];
  const buildings: Building[] = [];
  const props: Prop[] = [];

  for (let i = 0; i + 1 < xs.length; i++) {
    for (let j = 0; j + 1 < zs.length; j++) {
      const rect: Rect = {
        x0: xs[i]!.pos + xs[i]!.width / 2,
        x1: xs[i + 1]!.pos - xs[i + 1]!.width / 2,
        z0: zs[j]!.pos + zs[j]!.width / 2,
        z1: zs[j + 1]!.pos - zs[j + 1]!.width / 2,
      };
      const cx = (rect.x0 + rect.x1) / 2;
      const cz = (rect.z0 + rect.z1) / 2;
      const district = districtAt(cx, cz);
      const style = DISTRICT_STYLES[district]!;
      const use = rng.weighted(Object.keys(style.uses) as BlockUse[], (u) => style.uses[u] ?? 0);
      const block: Block = { rect, inner: inset(rect, SIDEWALK), district, use, gi: i, gj: j };
      blocks.push(block);
      fillBlock(rng, block, buildings, props);
    }
  }
  streetProps(rng, roads, blocks, props);

  // Edificios singulares (bolsa, banco, ayuntamiento…) y la casa y la tienda del jugador.
  const lm = placeLandmarks(Rng.fromSeed(seed, 'landmarks'), blocks, buildings, props, SIDEWALK);
  const home = lm.landmarks.find((l) => l.id === 'casa')!;
  // Punto de partida: en la acera, delante del portal de casa.
  const spawn = { x: home.door.x + home.door.nx * 1.4, z: home.door.z + home.door.nz * 1.4 };
  return {
    seed,
    bounds: B,
    coastX: COAST_X,
    sidewalk: SIDEWALK,
    roads,
    blocks,
    buildings: lm.buildings,
    props: lm.props,
    grid: { xs, zs },
    landmarks: lm.landmarks,
    spawn,
  };
}

function building(
  rng: Rng,
  district: string,
  kind: BuildingKind,
  x: number,
  z: number,
  bw: number,
  bd: number,
  floors: number,
): Building {
  const style = DISTRICT_STYLES[district]!;
  const h = kind === 'nave' ? rng.range(7, 13) : floors * FLOOR_H + (kind === 'torre' ? 4 : 0.6);
  return {
    x,
    z,
    w: bw,
    d: bd,
    h,
    floors,
    district,
    kind,
    color: rng.pick(style.palette),
    facade: rng.pick(style.facades),
    roof: kind === 'villa' || kind === 'adosado' || kind === 'granja' ? 'dos-aguas' : 'plano',
  };
}

function floorsFor(rng: Rng, district: string, bias = 0): number {
  const [a, b] = DISTRICT_STYLES[district]!.floors;
  // Sesgo hacia alturas bajas: pocas torres muy altas.
  const t = Math.pow(rng.next(), 1.6 - bias);
  return Math.max(1, Math.round(a + (b - a) * t));
}

/** Rellena una manzana según su uso. */
function fillBlock(rng: Rng, b: Block, out: Building[], props: Prop[]): void {
  const r = b.inner;
  const s = DISTRICT_STYLES[b.district]!;
  const W = w(r);
  const D = d(r);
  if (W < 12 || D < 12) return;
  switch (b.use) {
    case 'manzana': {
      const depth = Math.min(rng.range(s.depth[0], s.depth[1]), Math.min(W, D) / 2 - 1);
      if (depth < 8) {
        out.push(
          building(
            rng,
            b.district,
            'bloque',
            (r.x0 + r.x1) / 2,
            (r.z0 + r.z1) / 2,
            W,
            D,
            floorsFor(rng, b.district),
          ),
        );
        return;
      }
      // Fachadas norte y sur a lo ancho; este y oeste entre ellas. Patio interior.
      const strip = (ax0: number, az0: number, ax1: number, az1: number, along: 'x' | 'z') => {
        const len = along === 'x' ? ax1 - ax0 : az1 - az0;
        let p = 0;
        while (p < len - 4) {
          let f = rng.range(s.frontage[0], s.frontage[1]);
          if (len - p - f < s.frontage[0]) f = len - p;
          const fl = floorsFor(rng, b.district);
          if (along === 'x')
            out.push(
              building(
                rng,
                b.district,
                'bloque',
                ax0 + p + f / 2,
                (az0 + az1) / 2,
                f - 0.02,
                az1 - az0,
                fl,
              ),
            );
          else
            out.push(
              building(
                rng,
                b.district,
                'bloque',
                (ax0 + ax1) / 2,
                az0 + p + f / 2,
                ax1 - ax0,
                f - 0.02,
                fl,
              ),
            );
          p += f;
        }
      };
      strip(r.x0, r.z0, r.x1, r.z0 + depth, 'x');
      strip(r.x0, r.z1 - depth, r.x1, r.z1, 'x');
      strip(r.x0, r.z0 + depth, r.x0 + depth, r.z1 - depth, 'z');
      strip(r.x1 - depth, r.z0 + depth, r.x1, r.z1 - depth, 'z');
      if (s.trees > 0.3 && W - depth * 2 > 10 && D - depth * 2 > 10)
        props.push({
          kind: 'arbol',
          x: (r.x0 + r.x1) / 2,
          z: (r.z0 + r.z1) / 2,
          rot: 0,
          scale: rng.range(0.9, 1.3),
        });
      return;
    }
    case 'torres': {
      const n = W > 70 && rng.chance(0.5) ? 2 : 1;
      const tw = Math.min(W / n - 10, rng.range(s.frontage[0], s.frontage[1]));
      const td = Math.min(D - 14, rng.range(s.depth[0], s.depth[1]));
      for (let k = 0; k < n; k++) {
        const cx = r.x0 + (W / n) * (k + 0.5);
        const cz = (r.z0 + r.z1) / 2 + rng.range(-4, 4);
        out.push(
          building(rng, b.district, 'torre', cx, cz, tw, td, floorsFor(rng, b.district, 0.4)),
        );
      }
      // Podio comercial bajo, pegado a la acera.
      if (rng.chance(0.5))
        out.push(building(rng, b.district, 'podio', (r.x0 + r.x1) / 2, r.z1 - 5, W - 4, 9, 2));
      for (let k = 0; k < 4; k++)
        props.push({
          kind: 'banco',
          x: rng.range(r.x0 + 3, r.x1 - 3),
          z: r.z0 + 3,
          rot: 0,
          scale: 1,
        });
      return;
    }
    case 'naves': {
      const along: 'x' | 'z' = W > D ? 'x' : 'z';
      const len = along === 'x' ? W : D;
      let p = 2;
      while (p < len - 20) {
        const f = Math.min(rng.range(s.frontage[0], s.frontage[1]), len - p - 2);
        if (f < 14) break;
        const depth = (along === 'x' ? D : W) - rng.range(6, 16);
        if (along === 'x')
          out.push(
            building(rng, b.district, 'nave', r.x0 + p + f / 2, r.z0 + depth / 2 + 3, f, depth, 1),
          );
        else
          out.push(
            building(rng, b.district, 'nave', r.x0 + depth / 2 + 3, r.z0 + p + f / 2, depth, f, 1),
          );
        p += f + rng.range(6, 12);
      }
      return;
    }
    case 'villas': {
      const cell = 34;
      const nx = Math.max(1, Math.floor(W / cell));
      const nz = Math.max(1, Math.floor(D / cell));
      for (let a = 0; a < nx; a++) {
        for (let c = 0; c < nz; c++) {
          if (rng.chance(0.15)) continue;
          const cx = r.x0 + (W / nx) * (a + 0.5);
          const cz = r.z0 + (D / nz) * (c + 0.5);
          const size = rng.range(11, 17);
          out.push(
            building(
              rng,
              b.district,
              'villa',
              cx + rng.range(-3, 3),
              cz + rng.range(-3, 3),
              size,
              size * rng.range(0.7, 1),
              floorsFor(rng, b.district),
            ),
          );
          for (let t = 0; t < 3; t++)
            props.push({
              kind: 'arbol',
              x: cx + rng.range(-cell / 2.4, cell / 2.4),
              z: cz + rng.range(-cell / 2.4, cell / 2.4),
              rot: 0,
              scale: rng.range(0.7, 1.2),
            });
        }
      }
      return;
    }
    case 'adosados': {
      for (const side of [0, 1]) {
        const depth = 11;
        const z = side === 0 ? r.z0 + depth / 2 : r.z1 - depth / 2;
        let p = 0;
        while (p < W - 8) {
          const f = rng.range(s.frontage[0], s.frontage[1]);
          if (p + f > W) break;
          out.push(
            building(
              rng,
              b.district,
              'adosado',
              r.x0 + p + f / 2,
              z,
              f - 0.05,
              depth,
              floorsFor(rng, b.district),
            ),
          );
          p += f;
        }
      }
      for (let t = 0; t < 4; t++)
        props.push({
          kind: 'arbol',
          x: rng.range(r.x0 + 4, r.x1 - 4),
          z: (r.z0 + r.z1) / 2 + rng.range(-4, 4),
          rot: 0,
          scale: rng.range(0.7, 1.1),
        });
      return;
    }
    case 'campo': {
      if (rng.chance(0.5))
        out.push(
          building(
            rng,
            b.district,
            'granja',
            r.x0 + rng.range(10, W - 10),
            r.z0 + rng.range(10, D - 10),
            rng.range(12, 20),
            rng.range(9, 14),
            floorsFor(rng, b.district),
          ),
        );
      const n = Math.round((W * D) / 900);
      for (let t = 0; t < n; t++)
        props.push({
          kind: 'arbol',
          x: rng.range(r.x0 + 2, r.x1 - 2),
          z: rng.range(r.z0 + 2, r.z1 - 2),
          rot: 0,
          scale: rng.range(0.6, 1),
        });
      return;
    }
    case 'parque': {
      const n = Math.round((W * D) / 260);
      for (let t = 0; t < n; t++)
        props.push({
          kind: 'arbol',
          x: rng.range(r.x0 + 2, r.x1 - 2),
          z: rng.range(r.z0 + 2, r.z1 - 2),
          rot: 0,
          scale: rng.range(0.8, 1.5),
        });
      for (let t = 0; t < 6; t++)
        props.push({
          kind: 'banco',
          x: rng.range(r.x0 + 4, r.x1 - 4),
          z: rng.range(r.z0 + 4, r.z1 - 4),
          rot: rng.pick([0, Math.PI / 2]),
          scale: 1,
        });
      return;
    }
    case 'plaza': {
      props.push({ kind: 'fuente', x: (r.x0 + r.x1) / 2, z: (r.z0 + r.z1) / 2, rot: 0, scale: 1 });
      for (let t = 0; t < 8; t++) {
        const a = (t / 8) * Math.PI * 2;
        props.push({
          kind: t % 2 ? 'banco' : 'arbol',
          x: (r.x0 + r.x1) / 2 + Math.cos(a) * Math.min(W, D) * 0.32,
          z: (r.z0 + r.z1) / 2 + Math.sin(a) * Math.min(W, D) * 0.32,
          rot: a + Math.PI / 2,
          scale: 1,
        });
      }
      return;
    }
  }
}

function insideRoad(roads: Road[], x: number, z: number, except: Road): boolean {
  for (const r of roads) {
    if (r === except) continue;
    if (x > r.rect.x0 - 2 && x < r.rect.x1 + 2 && z > r.rect.z0 - 2 && z < r.rect.z1 + 2)
      return true;
  }
  return false;
}

/** Farolas y árboles de alineación a lo largo de las calles. */
function streetProps(rng: Rng, roads: Road[], _blocks: Block[], props: Prop[]): void {
  for (const road of roads) {
    const len = road.axis === 'x' ? w(road.rect) : d(road.rect);
    const step = road.avenue ? 26 : 32;
    for (let p = 8; p < len; p += step) {
      for (const side of [-1, 1]) {
        const off = road.width / 2 + 0.6;
        const x =
          road.axis === 'x' ? road.rect.x0 + p : (road.rect.x0 + road.rect.x1) / 2 + side * off;
        const z =
          road.axis === 'x' ? (road.rect.z0 + road.rect.z1) / 2 + side * off : road.rect.z0 + p;
        if (x < COAST_X + 10 || insideRoad(roads, x, z, road)) continue;
        const style = DISTRICT_STYLES[districtAt(x, z)]!;
        if (rng.chance(style.lights))
          props.push({
            kind: 'farola',
            x,
            z,
            rot:
              road.axis === 'x' ? (side > 0 ? Math.PI / 2 : -Math.PI / 2) : side > 0 ? Math.PI : 0,
            scale: 1,
          });
        if (road.avenue && rng.chance(style.trees)) {
          const tx = road.axis === 'x' ? x + step / 2 : x + side * 1.4;
          const tz = road.axis === 'x' ? z + side * 1.4 : z + step / 2;
          if (!insideRoad(roads, tx, tz, road))
            props.push({ kind: 'arbol', x: tx, z: tz, rot: 0, scale: rng.range(0.8, 1.1) });
        }
      }
    }
  }
}

/** ¿Está el punto dentro de algún edificio? (Para pruebas y colocación.) */
export function insideBuilding(
  city: CityLayout,
  x: number,
  z: number,
  margin = 0,
): Building | null {
  for (const b of city.buildings) {
    if (Math.abs(x - b.x) < b.w / 2 + margin && Math.abs(z - b.z) < b.d / 2 + margin) return b;
  }
  return null;
}
