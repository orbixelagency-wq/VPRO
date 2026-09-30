/**
 * Tráfico: vehículos que circulan por el grafo viario, respetan semáforos, siguen al de delante
 * (modelo de conductor inteligente simplificado), giran en los cruces y ceden el paso a
 * peatones y al jugador. Solo se simulan los coches cercanos al jugador: aparecen y desaparecen
 * en un anillo alrededor (streaming). Lógica pura, testeable sin render.
 */
import { Rng } from '../economy/rng';
import { signalAt, type Edge, type RoadGraph, type Vec2 } from './roads';

export type VehicleKind = 'turismo' | 'furgoneta' | 'autobus' | 'taxi';

interface Turn {
  p0: Vec2;
  p1: Vec2;
  p2: Vec2;
  len: number;
}

export interface Car {
  id: number;
  kind: VehicleKind;
  color: string;
  len: number;
  width: number;
  height: number;
  edge: number;
  lane: number;
  s: number;
  v: number;
  /** Carácter del conductor: fracción del límite a la que le gusta ir. */
  pace: number;
  nextEdge: number;
  nextLane: number;
  turn: Turn | null;
  x: number;
  z: number;
  /** Rumbo (vector unitario). */
  hx: number;
  hz: number;
  braking: boolean;
  /** Segundos detenido por otro vehículo (para deshacer atascos imposibles). */
  stuck: number;
  ghost: number;
}

export interface Obstacle {
  x: number;
  z: number;
  r: number;
}

export interface TrafficContext {
  focus: Vec2;
  /** Radio de simulación alrededor del jugador. */
  radius: number;
  /** Vehículos deseados en ese radio. */
  target: number;
  obstacles: Obstacle[];
  /** Multiplicador de velocidad (lluvia, niebla). */
  speedFactor: number;
}

const PALETTE = [
  '#e8e8e6',
  '#1d1f22',
  '#8c9196',
  '#b0b4b8',
  '#7a1f23',
  '#23395b',
  '#2f4f3a',
  '#c9b48a',
  '#4a4e53',
  '#d9d2c5',
  '#9e3b22',
  '#335c81',
];

const SPECS: Record<VehicleKind, { len: number; width: number; height: number }> = {
  turismo: { len: 4.3, width: 1.8, height: 1.45 },
  taxi: { len: 4.5, width: 1.8, height: 1.5 },
  furgoneta: { len: 5.2, width: 2.0, height: 2.3 },
  autobus: { len: 11.5, width: 2.5, height: 3.1 },
};

const A_MAX = 2.2;
const MIN_GAP = 2.2;
const HEADWAY = 1.2;

export class TrafficSim {
  cars: Car[] = [];
  private rng: Rng;
  private nextId = 1;

  constructor(
    readonly graph: RoadGraph,
    seed: number,
  ) {
    this.rng = Rng.fromSeed(seed, 'traffic');
  }

  update(dt: number, timeSec: number, ctx: TrafficContext): void {
    this.stream(ctx);
    const cars = this.cars;
    // 1) Aceleraciones con las posiciones actuales.
    const acc = new Array<number>(cars.length);
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i]!;
      const edge = this.graph.edges[c.edge]!;
      const vmax = (c.turn ? 6.5 : edge.limit * c.pace) * ctx.speedFactor;
      let gap = Infinity;
      // Bloqueado por un coche que cruza (no por el de delante en la cola).
      let byCar = false;
      const look = Math.max(10, c.v * 3 + 8);
      for (let k = 0; k < cars.length; k++) {
        if (k === i) continue;
        const o = cars[k]!;
        const crossing = o.hx * c.hx + o.hz * c.hz < 0.7;
        // Un atasco imposible en un cruce se deshace ignorando a los coches que cruzan.
        if (crossing && c.ghost > 0) continue;
        const g = gapTo(c, o.x, o.z, o.len / 2, o.width / 2, look);
        if (g < gap) {
          gap = g;
          byCar = crossing;
        }
      }
      for (const o of ctx.obstacles) {
        const g = gapTo(c, o.x, o.z, o.r, o.r + 0.3, look);
        if (g < gap) {
          gap = g;
          byCar = false;
        }
      }
      // Semáforo al final del tramo y hueco libre en el carril de destino.
      if (!c.turn) {
        const lane = edge.lanes[c.lane]!;
        const toEnd = lane.len - c.s - c.len / 2;
        if (toEnd < 25 && this.entryBlocked(c, i)) {
          if (toEnd - 0.5 < gap) {
            gap = Math.max(0, toEnd - 0.5);
            byCar = false;
          }
        }
        const toStop = lane.len - c.s - 1 - c.len / 2;
        if (toStop < 60) {
          const sig = signalAt(this.graph.nodes[edge.to]!, edge.axis, timeSec);
          const canStop = (c.v * c.v) / (2 * 5) < toStop + 0.5;
          if (sig === 'red' || (sig === 'amber' && canStop)) {
            if (toStop < gap) {
              gap = Math.max(0, toStop);
              byCar = false;
            }
          }
        }
      }
      const sStar = MIN_GAP + c.v * HEADWAY;
      let a = A_MAX * (1 - Math.pow(c.v / Math.max(0.1, vmax), 4));
      if (gap < Infinity) a -= A_MAX * Math.pow(sStar / Math.max(0.05, gap), 2);
      acc[i] = Math.max(-9, a);
      c.braking = a < -0.5;
      if (c.v < 0.1 && byCar && gap < 4) c.stuck += dt;
      else c.stuck = 0;
      if (c.stuck > 12) {
        c.ghost = 2.5;
        c.stuck = 0;
      }
      if (c.ghost > 0) c.ghost -= dt;
    }
    // 2) Integración y avance por carriles y giros.
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i]!;
      c.v = Math.max(0, c.v + acc[i]! * dt);
      c.s += c.v * dt;
      this.advance(c);
    }
  }

  /** ¿Hay alguien entrando o recién entrado en el carril al que va? (evita que dos giros se crucen) */
  private entryBlocked(c: Car, self: number): boolean {
    for (let k = 0; k < this.cars.length; k++) {
      if (k === self) continue;
      const o = this.cars[k]!;
      if (o.turn && o.nextEdge === c.nextEdge && o.nextLane === c.nextLane) {
        // Solo cede si el otro ya está dentro del cruce (el primero en llegar pasa).
        return true;
      }
      if (!o.turn && o.edge === c.nextEdge && o.lane === c.nextLane && o.s < o.len + 3) return true;
    }
    return false;
  }

  private advance(c: Car): void {
    for (let guard = 0; guard < 3; guard++) {
      const edge = this.graph.edges[c.edge]!;
      if (!c.turn) {
        const lane = edge.lanes[c.lane]!;
        if (c.s < lane.len) {
          const t = c.s / lane.len;
          c.x = lane.start.x + (lane.end.x - lane.start.x) * t;
          c.z = lane.start.z + (lane.end.z - lane.start.z) * t;
          c.hx = edge.dir.x;
          c.hz = edge.dir.z;
          return;
        }
        c.s -= lane.len;
        const next = this.graph.edges[c.nextEdge]!.lanes[c.nextLane]!;
        c.turn = makeTurn(lane.end, edge.dir, next.start, this.graph.edges[c.nextEdge]!.dir);
      } else {
        if (c.s < c.turn.len) {
          const t = c.s / c.turn.len;
          const p = bezier(c.turn, t);
          const q = bezier(c.turn, Math.min(1, t + 0.02));
          const dx = q.x - p.x;
          const dz = q.z - p.z;
          const n = Math.hypot(dx, dz);
          c.x = p.x;
          c.z = p.z;
          if (n > 1e-4) {
            c.hx = dx / n;
            c.hz = dz / n;
          }
          return;
        }
        c.s -= c.turn.len;
        c.turn = null;
        c.edge = c.nextEdge;
        c.lane = c.nextLane;
        this.chooseNext(c);
      }
    }
  }

  private chooseNext(c: Car): void {
    const edge = this.graph.edges[c.edge]!;
    const options = edge.next.map((id) => this.graph.edges[id]!);
    if (!options.length) {
      // Fin de la red: se da la vuelta (no debería pasar en la retícula).
      const back = this.graph.edges.find((e) => e.from === edge.to && e.to === edge.from)!;
      c.nextEdge = back.id;
      c.nextLane = 0;
      return;
    }
    const right = { x: -edge.dir.z, z: edge.dir.x };
    const kind = (e: Edge) => {
      const dot = e.dir.x * edge.dir.x + e.dir.z * edge.dir.z;
      if (dot > 0.9) return 'recto';
      return e.dir.x * right.x + e.dir.z * right.z > 0 ? 'derecha' : 'izquierda';
    };
    const weights = options.map((e) => {
      const k = kind(e);
      // Los autobuses prefieren seguir por las avenidas.
      if (c.kind === 'autobus') return e.avenue ? (k === 'recto' ? 6 : 1) : 0.05;
      return k === 'recto' ? 3 : 1;
    });
    const pick = this.rng.weighted(options, (_e) => weights[options.indexOf(_e)]!);
    const k = kind(pick);
    c.nextEdge = pick.id;
    const n = pick.lanes.length;
    c.nextLane = k === 'derecha' ? n - 1 : k === 'izquierda' ? 0 : Math.min(c.lane, n - 1);
  }

  /** Aparición y retirada de vehículos alrededor del jugador. */
  private stream(ctx: TrafficContext): void {
    const r2 = (ctx.radius + 40) ** 2;
    this.cars = this.cars.filter((c) => (c.x - ctx.focus.x) ** 2 + (c.z - ctx.focus.z) ** 2 < r2);
    const initial = this.cars.length === 0;
    if (this.cars.length >= ctx.target) return;
    // Solo los tramos cuyo centro cae dentro del radio.
    const near = this.graph.edges.filter((e) => {
      const n = this.graph.nodes[e.from]!;
      const m = this.graph.nodes[e.to]!;
      return (
        Math.hypot((n.x + m.x) / 2 - ctx.focus.x, (n.z + m.z) / 2 - ctx.focus.z) < ctx.radius + 50
      );
    });
    if (!near.length) return;
    let spawns = initial ? ctx.target : 2;
    let attempts = 0;
    while (
      this.cars.length < ctx.target &&
      spawns > 0 &&
      attempts < (initial ? ctx.target * 6 : 30)
    ) {
      attempts++;
      const e = this.rng.pick(near);
      const lane = this.rng.int(0, e.lanes.length - 1);
      const L = e.lanes[lane]!;
      if (L.len < 20) continue;
      const s = this.rng.range(4, L.len - 12);
      const x = L.start.x + ((L.end.x - L.start.x) * s) / L.len;
      const z = L.start.z + ((L.end.z - L.start.z) * s) / L.len;
      const d = Math.hypot(x - ctx.focus.x, z - ctx.focus.z);
      // Fuera de la vista inmediata salvo en el primer llenado.
      if (d > ctx.radius || (!initial && d < ctx.radius * 0.55)) continue;
      if (this.cars.some((c) => Math.hypot(c.x - x, c.z - z) < 14)) continue;
      if (ctx.obstacles.some((o) => Math.hypot(o.x - x, o.z - z) < 8)) continue;
      this.spawn(e, lane, s);
      spawns--;
    }
  }

  spawn(e: Edge, lane: number, s: number): Car {
    const roll = this.rng.next();
    const kind: VehicleKind =
      e.avenue && roll < 0.07
        ? 'autobus'
        : roll < 0.18
          ? 'taxi'
          : roll < 0.32
            ? 'furgoneta'
            : 'turismo';
    const spec = SPECS[kind];
    const color =
      kind === 'taxi'
        ? '#f2f2ee'
        : kind === 'autobus'
          ? this.rng.pick(['#c0392b', '#1f6f8b'])
          : this.rng.pick(PALETTE);
    const c: Car = {
      id: this.nextId++,
      kind,
      color,
      ...spec,
      edge: e.id,
      lane,
      s,
      v: e.limit * 0.6,
      pace: this.rng.range(0.8, 1.05),
      nextEdge: e.id,
      nextLane: lane,
      turn: null,
      x: 0,
      z: 0,
      hx: e.dir.x,
      hz: e.dir.z,
      braking: false,
      stuck: 0,
      ghost: 0,
    };
    this.chooseNext(c);
    this.advance(c);
    this.cars.push(c);
    return c;
  }
}

/** Distancia libre hasta un objeto si está delante y en la trayectoria; si no, Infinity. */
function gapTo(c: Car, x: number, z: number, halfLen: number, halfW: number, look: number): number {
  const rx = x - c.x;
  const rz = z - c.z;
  const ahead = rx * c.hx + rz * c.hz;
  if (ahead <= 0 || ahead > look + halfLen) return Infinity;
  const lat = Math.abs(rx * -c.hz + rz * c.hx);
  if (lat > c.width / 2 + halfW + 0.15) return Infinity;
  return ahead - c.len / 2 - halfLen;
}

function makeTurn(p0: Vec2, d0: Vec2, p2: Vec2, d1: Vec2): Turn {
  const dot = d0.x * d1.x + d0.z * d1.z;
  const p1 =
    dot > 0.9
      ? { x: (p0.x + p2.x) / 2, z: (p0.z + p2.z) / 2 }
      : Math.abs(d0.x) > 0.5
        ? { x: p2.x, z: p0.z }
        : { x: p0.x, z: p2.z };
  const t: Turn = { p0, p1, p2, len: 0 };
  let len = 0;
  let prev = p0;
  for (let k = 1; k <= 10; k++) {
    const p = bezier(t, k / 10);
    len += Math.hypot(p.x - prev.x, p.z - prev.z);
    prev = p;
  }
  t.len = Math.max(0.5, len);
  return t;
}

function bezier(t: Turn, u: number): Vec2 {
  const a = (1 - u) * (1 - u);
  const b = 2 * (1 - u) * u;
  const c = u * u;
  return {
    x: a * t.p0.x + b * t.p1.x + c * t.p2.x,
    z: a * t.p0.z + b * t.p1.z + c * t.p2.z,
  };
}
