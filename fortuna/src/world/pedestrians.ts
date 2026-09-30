/**
 * Peatones: pasean por las aceras (anillo alrededor de cada manzana), se paran a mirar
 * escaparates, cruzan en los pasos de las esquinas cuando el semáforo les deja y esquivan al
 * jugador. Como el tráfico, solo existen alrededor del jugador. Lógica pura.
 */
import { Rng } from '../economy/rng';
import type { Block, CityLayout, Rect } from './cityGen';
import { pedestrianMayCross, type RoadGraph, type Vec2 } from './roads';

export type PedState = 'walk' | 'idle' | 'wait' | 'cross';

export interface Pedestrian {
  id: number;
  block: number;
  /** Posición a lo largo del anillo de acera (m). */
  u: number;
  dir: 1 | -1;
  lateral: number;
  speed: number;
  state: PedState;
  timer: number;
  cross: { from: Vec2; to: Vec2; t: number; len: number; block: number; u: number } | null;
  /** Nodo y eje de la calzada que va a cruzar. */
  waitAt: { node: number; axis: 'x' | 'z' } | null;
  x: number;
  z: number;
  hx: number;
  hz: number;
  /** Fase de la animación de paso. */
  phase: number;
  moving: boolean;
  shirt: string;
  pants: string;
  skin: string;
  hair: string;
  height: number;
  umbrella: boolean;
}

export interface CrowdContext {
  focus: Vec2;
  radius: number;
  target: number;
  /** Probabilidad de llevar paraguas (lluvia). */
  umbrellas: number;
  player: Vec2;
}

const SHIRTS = [
  '#2f4858',
  '#86bbd8',
  '#f6ae2d',
  '#33658a',
  '#c44536',
  '#e5e5e5',
  '#3d405b',
  '#81b29a',
  '#f2cc8f',
  '#6d597a',
  '#1b1b1e',
  '#b56576',
];
const PANTS = ['#22223b', '#4a4e69', '#2b2d42', '#5c4d3c', '#7f7f7f', '#1d3557', '#a68a64'];
const SKINS = ['#f1c7a5', '#e0ac87', '#c68863', '#8d5b3e', '#5e3a24', '#f5d6bf'];
const HAIRS = ['#1b1b1b', '#3b2a20', '#6a4a30', '#b08a55', '#d8c8a8', '#8c8c8c'];

/** Distancia del anillo de paseo al borde exterior de la manzana (dentro de la acera). */
const RING_INSET = 1.7;

export function ringRect(b: Block): Rect {
  return {
    x0: b.rect.x0 + RING_INSET,
    z0: b.rect.z0 + RING_INSET,
    x1: b.rect.x1 - RING_INSET,
    z1: b.rect.z1 - RING_INSET,
  };
}

function ringLength(r: Rect): number {
  return 2 * (r.x1 - r.x0 + (r.z1 - r.z0));
}

/** Esquinas del anillo en orden horario visto desde arriba: NO, NE, SE, SO. */
function cornerU(r: Rect, k: number): number {
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  return [0, w, w + d, 2 * w + d][k]!;
}

export function ringPoint(r: Rect, u: number): { p: Vec2; t: Vec2; n: Vec2 } {
  const w = r.x1 - r.x0;
  const d = r.z1 - r.z0;
  const L = 2 * (w + d);
  let s = ((u % L) + L) % L;
  if (s < w) return { p: { x: r.x0 + s, z: r.z0 }, t: { x: 1, z: 0 }, n: { x: 0, z: -1 } };
  s -= w;
  if (s < d) return { p: { x: r.x1, z: r.z0 + s }, t: { x: 0, z: 1 }, n: { x: 1, z: 0 } };
  s -= d;
  if (s < w) return { p: { x: r.x1 - s, z: r.z1 }, t: { x: -1, z: 0 }, n: { x: 0, z: 1 } };
  s -= w;
  return { p: { x: r.x0, z: r.z1 - s }, t: { x: 0, z: -1 }, n: { x: -1, z: 0 } };
}

export class Crowd {
  peds: Pedestrian[] = [];
  private rng: Rng;
  private nextId = 1;
  private rings: Rect[];
  private byGrid = new Map<string, number>();

  constructor(
    private city: CityLayout,
    private graph: RoadGraph,
    seed: number,
  ) {
    this.rng = Rng.fromSeed(seed, 'crowd');
    this.rings = city.blocks.map(ringRect);
    city.blocks.forEach((b, i) => this.byGrid.set(`${b.gi},${b.gj}`, i));
  }

  update(dt: number, timeSec: number, ctx: CrowdContext): void {
    this.stream(ctx);
    for (const p of this.peds) this.step(p, dt, timeSec, ctx);
  }

  /** Peatones sobre la calzada (los coches les ceden el paso). */
  crossing(): Pedestrian[] {
    return this.peds.filter((p) => p.state === 'cross');
  }

  private step(p: Pedestrian, dt: number, timeSec: number, ctx: CrowdContext): void {
    p.moving = false;
    if (p.state === 'idle') {
      p.timer -= dt;
      if (p.timer <= 0) p.state = 'walk';
      return;
    }
    if (p.state === 'wait') {
      const w = p.waitAt!;
      if (pedestrianMayCross(this.graph.nodes[w.node]!, w.axis, timeSec)) {
        p.state = 'cross';
        p.waitAt = null;
      }
      return;
    }
    // Esquiva al jugador: si lo tiene justo delante, se detiene un momento.
    const px = ctx.player.x - p.x;
    const pz = ctx.player.z - p.z;
    const ahead = px * p.hx + pz * p.hz;
    if (ahead > 0 && ahead < 1.4 && Math.abs(px * -p.hz + pz * p.hx) < 0.7) return;

    p.moving = true;
    p.phase += dt * p.speed * 3.2;
    if (p.state === 'cross') {
      const c = p.cross!;
      c.t += p.speed * dt;
      const k = Math.min(1, c.t / c.len);
      p.x = c.from.x + (c.to.x - c.from.x) * k;
      p.z = c.from.z + (c.to.z - c.from.z) * k;
      if (k >= 1) {
        p.block = c.block;
        p.u = c.u;
        p.cross = null;
        p.state = 'walk';
        p.dir = this.rng.chance(0.5) ? 1 : -1;
        p.lateral = p.dir * Math.abs(p.lateral);
        this.place(p);
      }
      return;
    }
    const r = this.rings[p.block]!;
    const L = ringLength(r);
    const prevU = p.u;
    p.u = (((p.u + p.dir * p.speed * dt) % L) + L) % L;
    // ¿Ha pasado por una esquina?
    for (let k = 0; k < 4; k++) {
      const cu = cornerU(r, k);
      const passed =
        p.dir > 0
          ? (prevU < cu && p.u >= cu) || (cu === 0 && prevU > p.u)
          : (prevU > cu && p.u <= cu) || (cu === 0 && p.u > prevU);
      if (passed) {
        if (this.rng.chance(0.35) && this.startCrossing(p, k)) return;
        break;
      }
    }
    if (this.rng.chance(dt * 0.02)) {
      p.state = 'idle';
      p.timer = this.rng.range(2, 8);
    }
    this.place(p);
  }

  /** Intenta cruzar desde la esquina k de su manzana a una manzana vecina. */
  private startCrossing(p: Pedestrian, k: number): boolean {
    const b = this.city.blocks[p.block]!;
    // Opciones: cruzar la calle norte-sur (a la manzana este/oeste) o la este-oeste (norte/sur).
    const east = k === 1 || k === 2;
    const south = k === 2 || k === 3;
    const choices: {
      gi: number;
      gj: number;
      axis: 'x' | 'z';
      corner: number;
      node: [number, number];
    }[] = [
      {
        gi: b.gi + (east ? 1 : -1),
        gj: b.gj,
        axis: 'z',
        corner: [1, 0, 3, 2][k]!,
        node: [b.gi + (east ? 1 : 0), b.gj + (south ? 1 : 0)],
      },
      {
        gi: b.gi,
        gj: b.gj + (south ? 1 : -1),
        axis: 'x',
        corner: [3, 2, 1, 0][k]!,
        node: [b.gi + (east ? 1 : 0), b.gj + (south ? 1 : 0)],
      },
    ];
    const c = this.rng.pick(choices);
    const target = this.byGrid.get(`${c.gi},${c.gj}`);
    if (target === undefined) return false;
    const from = ringPoint(this.rings[p.block]!, cornerU(this.rings[p.block]!, k)).p;
    const tr = this.rings[target]!;
    const tu = cornerU(tr, c.corner);
    const to = ringPoint(tr, tu).p;
    const nodeId = c.node[1] * this.graph.xs.length + c.node[0];
    if (!this.graph.nodes[nodeId]) return false;
    p.x = from.x;
    p.z = from.z;
    const len = Math.hypot(to.x - from.x, to.z - from.z);
    p.hx = (to.x - from.x) / len;
    p.hz = (to.z - from.z) / len;
    p.cross = { from, to, t: 0, len, block: target, u: tu };
    p.waitAt = { node: nodeId, axis: c.axis };
    p.state = 'wait';
    return true;
  }

  private place(p: Pedestrian): void {
    const r = this.rings[p.block]!;
    const { p: q, t, n } = ringPoint(r, p.u);
    // Cada sentido va por su lado de la acera; "lateral" > 0 hacia la calzada.
    p.x = q.x + n.x * p.lateral;
    p.z = q.z + n.z * p.lateral;
    p.hx = t.x * p.dir;
    p.hz = t.z * p.dir;
  }

  private stream(ctx: CrowdContext): void {
    const r2 = (ctx.radius + 25) ** 2;
    this.peds = this.peds.filter(
      (p) => p.state === 'cross' || (p.x - ctx.focus.x) ** 2 + (p.z - ctx.focus.z) ** 2 < r2,
    );
    const initial = this.peds.length === 0;
    if (this.peds.length >= ctx.target) return;
    // Solo las manzanas que tocan el círculo de simulación.
    const near: number[] = [];
    this.rings.forEach((r, i) => {
      const dx = Math.max(r.x0 - ctx.focus.x, 0, ctx.focus.x - r.x1);
      const dz = Math.max(r.z0 - ctx.focus.z, 0, ctx.focus.z - r.z1);
      if (dx * dx + dz * dz < ctx.radius * ctx.radius) near.push(i);
    });
    if (!near.length) return;
    let budget = initial ? ctx.target : 4;
    let attempts = 0;
    while (
      this.peds.length < ctx.target &&
      budget > 0 &&
      attempts < (initial ? ctx.target * 6 : 24)
    ) {
      attempts++;
      const bi = this.rng.pick(near);
      const r = this.rings[bi]!;
      const u = this.rng.range(0, ringLength(r));
      const q = ringPoint(r, u).p;
      const d = Math.hypot(q.x - ctx.focus.x, q.z - ctx.focus.z);
      if (d > ctx.radius || (!initial && d < ctx.radius * 0.6)) continue;
      this.spawn(bi, u, ctx.umbrellas);
      budget--;
    }
  }

  spawn(block: number, u: number, umbrellas: number): Pedestrian {
    const rng = this.rng;
    const dir: 1 | -1 = rng.chance(0.5) ? 1 : -1;
    const p: Pedestrian = {
      id: this.nextId++,
      block,
      u,
      dir,
      lateral: dir * rng.range(0.35, 0.9),
      speed: rng.range(1.05, 1.6),
      state: rng.chance(0.12) ? 'idle' : 'walk',
      timer: rng.range(1, 6),
      cross: null,
      waitAt: null,
      x: 0,
      z: 0,
      hx: 1,
      hz: 0,
      phase: rng.range(0, 6),
      moving: false,
      shirt: rng.pick(SHIRTS),
      pants: rng.pick(PANTS),
      skin: rng.pick(SKINS),
      hair: rng.pick(HAIRS),
      height: rng.range(0.92, 1.08),
      umbrella: rng.chance(umbrellas),
    };
    this.place(p);
    this.peds.push(p);
    return p;
  }
}
