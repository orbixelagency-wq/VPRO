/**
 * Dibuja listas de piezas (`Part`) de edificios singulares e interiores. Las piezas se fusionan
 * por material (pocas llamadas de dibujo); rótulos, reloj y panel de cotizaciones llevan su
 * propia textura. Lo que brilla de noche usa un nodo TSL: color de vértice × intensidad.
 */
import * as THREE from 'three/webgpu';
import { float, uniform, vertexColor } from 'three/tsl';
import type { Part, PartMat } from './landmarks';
import { boxUV, cylinder, ellipsoid, GeoBuilder, prism } from './geo';
import {
  BAY_W,
  FACADE_BAYS,
  FACADE_FLOORS,
  FLOOR_H,
  makeDynamicCanvas,
  makePlanks,
  makeSignTexture,
  makeStone,
  makeTiles,
} from './textures';

const DEFAULT_COLORS: Record<PartMat, string> = {
  stone: '#cdbfa6',
  stoneDark: '#4a5058',
  facade: '#ffffff',
  metal: '#7d8a96',
  patina: '#6f9c8c',
  roof: '#ffffff',
  accent: '#c9a45c',
  door: '#4a3322',
  glassLit: '#ffe2a6',
  sign: '#1d2a36',
  clock: '#f4efe4',
  fabric: '#888888',
  wood: '#8a6a4a',
  floor: '#b09070',
  wall: '#e9e1d3',
  ceiling: '#f4f1ea',
  screen: '#7fc0ff',
  ticker: '#111111',
  plant: '#3f6b3a',
  bed: '#f2f2f2',
  dark: '#2b2d42',
};

/** Materiales compartidos entre la ciudad y los interiores. */
export class PartMaterials {
  /** 0 de día, 1 de noche: controla lo que se enciende al anochecer. */
  readonly night = uniform(0);
  private cache = new Map<string, THREE.Material>();
  private textures: THREE.Texture[] = [];
  private stone: THREE.Texture;
  private planks: THREE.Texture;
  private tiles: THREE.Texture;

  constructor(
    seed: number,
    /** Materiales de fachada de la ciudad (índice = estilo). */
    private facades: THREE.MeshStandardMaterial[],
  ) {
    this.stone = this.track(makeStone(seed));
    this.planks = this.track(makePlanks(seed));
    this.tiles = this.track(makeTiles(seed));
  }

  track<T extends THREE.Texture>(t: T): T {
    this.textures.push(t);
    return t;
  }

  get(mat: PartMat, glow: boolean, facade = 0): THREE.Material {
    if (mat === 'facade') return this.facades[facade] ?? this.facades[0]!;
    const key = `${mat}:${glow ? 1 : 0}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const m = new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.8 });
    switch (mat) {
      case 'stone':
      case 'stoneDark':
        m.map = this.stone;
        m.roughness = 0.85;
        break;
      case 'floor':
        m.map = this.planks;
        m.roughness = 0.55;
        break;
      case 'roof':
        m.map = this.tiles;
        break;
      case 'metal':
        m.metalness = 0.7;
        m.roughness = 0.35;
        break;
      case 'patina':
        m.metalness = 0.35;
        m.roughness = 0.55;
        break;
      case 'door':
      case 'wood':
        m.roughness = 0.65;
        break;
      case 'plant':
        m.roughness = 1;
        m.flatShading = true;
        break;
      case 'screen':
        m.roughness = 0.2;
        break;
    }
    // Lo que brilla: pantallas siempre; escaparates y rótulos más de noche.
    if (mat === 'screen' || mat === 'ticker') m.emissiveNode = vertexColor().mul(float(1.1));
    else if (glow || mat === 'glassLit')
      m.emissiveNode = vertexColor().mul(this.night.mul(1.6).add(mat === 'glassLit' ? 0.35 : 0.05));
    this.cache.set(key, m);
    return m;
  }

  dispose(): void {
    for (const m of this.cache.values()) m.dispose();
    for (const t of this.textures) t.dispose();
  }
}

export interface PartsMesh {
  group: THREE.Group;
  /** Dibuja el reloj (si hay) con la hora dada. */
  setClock(hour: number): void;
  /** Panel de cotizaciones (si hay). */
  ticker: TickerBoard | null;
  dispose(): void;
}

export interface TickerRow {
  id: string;
  price: number;
  change: number;
}

export class TickerBoard {
  private canvas = makeDynamicCanvas(1024, 208);
  readonly texture = this.canvas.texture;
  private offset = 0;
  private rows: TickerRow[] = [];

  setRows(rows: TickerRow[]): void {
    this.rows = rows;
    this.draw();
  }

  /** Desplaza la cinta inferior (llamar unas pocas veces por segundo). */
  scroll(dt: number): void {
    if (!this.rows.length) return;
    this.offset += dt * 60;
    this.draw();
  }

  private draw(): void {
    const { ctx, w, h } = this.canvas;
    ctx.fillStyle = '#07090c';
    ctx.fillRect(0, 0, w, h);
    ctx.font = '600 22px ui-monospace, Menlo, monospace';
    ctx.textBaseline = 'middle';
    // Rejilla de 4 columnas × 4 filas con los valores principales.
    const cols = 4;
    const top = this.rows.slice(0, 16);
    top.forEach((r, i) => {
      const cx = (i % cols) * (w / cols) + 18;
      const cy = 24 + Math.floor(i / cols) * 36;
      ctx.fillStyle = '#e8e2d0';
      ctx.fillText(r.id, cx, cy);
      ctx.fillStyle = r.change >= 0 ? '#4fd18b' : '#ff6b5e';
      const arrow = r.change >= 0 ? '▲' : '▼';
      ctx.fillText(
        `${r.price.toFixed(2)} ${arrow}${Math.abs(r.change * 100).toFixed(1)}%`,
        cx + 88,
        cy,
      );
    });
    // Cinta que se desplaza.
    ctx.fillStyle = '#12161c';
    ctx.fillRect(0, h - 44, w, 44);
    ctx.font = '600 24px ui-monospace, Menlo, monospace';
    const text = this.rows
      .map(
        (r) =>
          `${r.id} ${r.price.toFixed(2)} ${r.change >= 0 ? '+' : ''}${(r.change * 100).toFixed(1)}%`,
      )
      .join('   ·   ');
    const width = ctx.measureText(text + '   ·   ').width || 1;
    let x = -(this.offset % width);
    ctx.fillStyle = '#f2c14e';
    while (x < w) {
      ctx.fillText(text, x, h - 22);
      x += width;
    }
    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}

const FACADE_U = BAY_W * FACADE_BAYS;
const FACADE_V = FLOOR_H * FACADE_FLOORS;

export function buildParts(parts: Part[], mats: PartMaterials, name: string): PartsMesh {
  const group = new THREE.Group();
  group.name = name;
  const builders = new Map<string, { gb: GeoBuilder; mat: THREE.Material }>();
  const owned: { dispose(): void }[] = [];
  let clock: {
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
    tex: THREE.CanvasTexture;
    last: number;
  } | null = null;
  let ticker: TickerBoard | null = null;
  const color = new THREE.Color();

  const plane = (p: Part, mat: THREE.Material, inset = 0.012) => {
    const f = p.face ?? { x: 0, z: 1 };
    const alongX = Math.abs(f.z) > 0.5;
    const width = alongX ? p.w : p.d;
    const depth = alongX ? p.d : p.w;
    const geo = new THREE.PlaneGeometry(width, p.h);
    owned.push(geo);
    const m = new THREE.Mesh(geo, mat);
    m.position.set(p.x + f.x * (depth / 2 + inset), p.y + p.h / 2, p.z + f.z * (depth / 2 + inset));
    m.rotation.y = Math.atan2(f.x, f.z);
    group.add(m);
    return m;
  };

  for (const p of parts) {
    const glow = !!p.glow;
    const mat = mats.get(p.mat, glow, p.facade);
    const key = p.mat === 'facade' ? `facade:${p.facade ?? 0}` : `${p.mat}:${glow ? 1 : 0}`;
    let entry = builders.get(key);
    if (!entry) {
      entry = { gb: new GeoBuilder(), mat };
      entry.gb.setMaterial(0);
      builders.set(key, entry);
    }
    const gb = entry.gb;
    color.set(p.color ?? DEFAULT_COLORS[p.mat]);
    const su = p.mat === 'facade' ? FACADE_U : 2;
    const sv = p.mat === 'facade' ? FACADE_V : 2;
    switch (p.shape) {
      case 'box':
        boxUV(
          gb,
          p.x - p.w / 2,
          p.y,
          p.z - p.d / 2,
          p.x + p.w / 2,
          p.y + p.h,
          p.z + p.d / 2,
          color,
          su,
          sv,
          p.y > 0.5,
        );
        break;
      case 'cyl':
        cylinder(gb, p.x, p.y, p.z, p.w / 2, p.h, color, p.w > 3 ? 32 : 12);
        break;
      case 'prism':
        prism(gb, p.x, p.y, p.z, p.w, p.h, p.d, p.axis ?? 'x', color);
        break;
      case 'dome':
        ellipsoid(gb, p.x, p.y, p.z, p.w / 2, p.h, p.d / 2, color, true, 24, 10);
        break;
      case 'sphere':
        ellipsoid(gb, p.x, p.y + p.h / 2, p.z, p.w / 2, p.h / 2, p.d / 2, color, false, 10, 6);
        break;
    }
    // Texturas propias delante de la pieza.
    if (p.mat === 'sign' && p.text) {
      const f = p.face ?? { x: 0, z: 1 };
      const width = Math.abs(f.z) > 0.5 ? p.w : p.d;
      const tex = mats.track(makeSignTexture(p.text, width / p.h, p.glow ? '#fff4d6' : '#f3ead7'));
      const m = new THREE.MeshStandardNodeMaterial({ map: tex, transparent: true, roughness: 0.6 });
      if (p.glow) m.emissiveNode = THREE.TSL.texture(tex).rgb.mul(mats.night.mul(1.2).add(0.1));
      owned.push(m);
      plane(p, m);
    } else if (p.mat === 'clock') {
      const c = makeDynamicCanvas(256, 256);
      mats.track(c.texture);
      const m = new THREE.MeshStandardNodeMaterial({ map: c.texture, roughness: 0.5 });
      m.emissiveNode = THREE.TSL.texture(c.texture).rgb.mul(mats.night.mul(0.9));
      owned.push(m);
      plane(p, m);
      clock = { ctx: c.ctx, tex: c.texture, last: -1 };
    } else if (p.mat === 'ticker') {
      ticker = new TickerBoard();
      owned.push(ticker);
      const m = new THREE.MeshBasicNodeMaterial({ map: ticker.texture });
      owned.push(m);
      plane(p, m, 0.02);
    }
  }

  for (const [key, { gb, mat }] of builders) {
    const geo = gb.build();
    owned.push(geo);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = `${name} ${key}`;
    mesh.castShadow = !key.startsWith('glassLit') && !key.startsWith('screen');
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  return {
    group,
    ticker,
    setClock(hour: number) {
      if (!clock) return;
      const minute = Math.floor(hour * 60);
      if (minute === clock.last) return;
      clock.last = minute;
      drawClock(clock.ctx, hour);
      clock.tex.needsUpdate = true;
    },
    dispose() {
      for (const o of owned) o.dispose();
    },
  };
}

function drawClock(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  hour: number,
): void {
  const s = 256;
  const c = s / 2;
  ctx.fillStyle = '#6b4b2a';
  ctx.fillRect(0, 0, s, s);
  ctx.beginPath();
  ctx.arc(c, c, 116, 0, Math.PI * 2);
  ctx.fillStyle = '#f7f1e3';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#2a2118';
  ctx.stroke();
  ctx.fillStyle = '#2a2118';
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r0 = i % 3 === 0 ? 86 : 96;
    ctx.save();
    ctx.translate(c + Math.sin(a) * ((r0 + 106) / 2), c - Math.cos(a) * ((r0 + 106) / 2));
    ctx.rotate(a);
    ctx.fillRect(-3, -(106 - r0) / 2, 6, 106 - r0);
    ctx.restore();
  }
  const h12 = hour % 12;
  const min = (hour % 1) * 60;
  const hand = (angle: number, len: number, width: number) => {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(angle);
    ctx.fillRect(-width / 2, -len, width, len + 12);
    ctx.restore();
  };
  hand((h12 / 12) * Math.PI * 2, 58, 10);
  hand((min / 60) * Math.PI * 2, 90, 6);
  ctx.beginPath();
  ctx.arc(c, c, 8, 0, Math.PI * 2);
  ctx.fill();
}
