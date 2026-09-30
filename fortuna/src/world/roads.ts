/**
 * Grafo viario derivado de la retícula: cruces, tramos dirigidos con carriles (se circula por
 * la derecha) y semáforos. Datos puros para el tráfico y los peatones.
 */
import type { CityLayout, GridLine } from './cityGen';

export interface Vec2 {
  x: number;
  z: number;
}

export interface Lane {
  start: Vec2;
  end: Vec2;
  len: number;
}

export interface Edge {
  id: number;
  from: number;
  to: number;
  /** Eje de la calle por la que discurre: 'x' = este-oeste. */
  axis: 'x' | 'z';
  dir: Vec2;
  avenue: boolean;
  lanes: Lane[];
  /** Tramos que salen del cruce de llegada (sin cambio de sentido). */
  next: number[];
  /** Velocidad máxima en m/s. */
  limit: number;
}

export interface RoadNode {
  id: number;
  i: number;
  j: number;
  x: number;
  z: number;
  /** Desfase del ciclo semafórico (s). */
  offset: number;
}

export interface RoadGraph {
  nodes: RoadNode[];
  edges: Edge[];
  xs: GridLine[];
  zs: GridLine[];
}

/** Distancia del eje de cada carril al centro de la calzada. */
export function laneOffsets(avenue: boolean): number[] {
  return avenue ? [2.3, 5.9] : [2.7];
}

export function buildRoadGraph(city: CityLayout): RoadGraph {
  const { xs, zs } = city.grid;
  const nodes: RoadNode[] = [];
  const idx = (i: number, j: number) => j * xs.length + i;
  for (let j = 0; j < zs.length; j++)
    for (let i = 0; i < xs.length; i++)
      nodes.push({
        id: idx(i, j),
        i,
        j,
        x: xs[i]!.pos,
        z: zs[j]!.pos,
        offset: ((i * 7 + j * 13) % 9) * 4,
      });
  const edges: Edge[] = [];
  const add = (a: RoadNode, b: RoadNode) => {
    const axis: 'x' | 'z' = a.j === b.j ? 'x' : 'z';
    const line = axis === 'x' ? zs[a.j]! : xs[a.i]!;
    const cross = (n: RoadNode) => (axis === 'x' ? xs[n.i]! : zs[n.j]!).width / 2 + 1.2;
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const dir = { x: (b.x - a.x) / len, z: (b.z - a.z) / len };
    const right = { x: -dir.z, z: dir.x };
    const lanes: Lane[] = laneOffsets(line.avenue).map((off) => {
      const start = {
        x: a.x + dir.x * cross(a) + right.x * off,
        z: a.z + dir.z * cross(a) + right.z * off,
      };
      const end = {
        x: b.x - dir.x * cross(b) + right.x * off,
        z: b.z - dir.z * cross(b) + right.z * off,
      };
      return { start, end, len: Math.hypot(end.x - start.x, end.z - start.z) };
    });
    edges.push({
      id: edges.length,
      from: a.id,
      to: b.id,
      axis,
      dir,
      avenue: line.avenue,
      lanes,
      next: [],
      limit: line.avenue ? 13.9 : 8.3,
    });
  };
  for (const n of nodes) {
    if (n.i + 1 < xs.length) {
      add(n, nodes[idx(n.i + 1, n.j)]!);
      add(nodes[idx(n.i + 1, n.j)]!, n);
    }
    if (n.j + 1 < zs.length) {
      add(n, nodes[idx(n.i, n.j + 1)]!);
      add(nodes[idx(n.i, n.j + 1)]!, n);
    }
  }
  const byFrom = new Map<number, number[]>();
  for (const e of edges) {
    const list = byFrom.get(e.from) ?? [];
    list.push(e.id);
    byFrom.set(e.from, list);
  }
  for (const e of edges) e.next = (byFrom.get(e.to) ?? []).filter((id) => edges[id]!.to !== e.from);
  return { nodes, edges, xs, zs };
}

export type Signal = 'green' | 'amber' | 'red';

/** Ciclo de 40 s: verde este-oeste, ámbar, todo rojo, verde norte-sur, ámbar, todo rojo. */
export const SIGNAL_CYCLE = 40;

export function signalAt(node: RoadNode, axis: 'x' | 'z', timeSec: number): Signal {
  const t = (((timeSec + node.offset) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  const local = axis === 'x' ? t : (t + SIGNAL_CYCLE / 2) % SIGNAL_CYCLE;
  if (local < 15) return 'green';
  if (local < 18) return 'amber';
  return 'red';
}

/** Los peatones cruzan una calzada cuando los coches de ese eje tienen rojo y queda margen. */
export function pedestrianMayCross(node: RoadNode, roadAxis: 'x' | 'z', timeSec: number): boolean {
  const t = (((timeSec + node.offset) % SIGNAL_CYCLE) + SIGNAL_CYCLE) % SIGNAL_CYCLE;
  const local = roadAxis === 'x' ? t : (t + SIGNAL_CYCLE / 2) % SIGNAL_CYCLE;
  // Rojo para los coches de ese eje: de 18 a 40. Se empieza a cruzar hasta el segundo 27.
  return local >= 19 && local < 27;
}

/** ¿Está el punto sobre una calzada? (para las pruebas de peatones) */
export function onRoadway(city: CityLayout, x: number, z: number): boolean {
  for (const r of city.roads)
    if (x > r.rect.x0 && x < r.rect.x1 && z > r.rect.z0 && z < r.rect.z1) return true;
  return false;
}
