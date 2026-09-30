/**
 * Texturas generadas por código (canvas): fachadas con ventanas, asfalto con marcas viales,
 * aceras, césped, campos y tejados. El juego se ve bien sin ningún recurso externo;
 * ASSETS.md explica cómo sustituirlas por texturas de biblioteca.
 */
import * as THREE from 'three/webgpu';
import { Rng } from '../economy/rng';

/** Cada textura de fachada cubre 8 vanos × 8 plantas. */
export const FACADE_BAYS = 8;
export const FACADE_FLOORS = 8;
export const BAY_W = 3;
export const FLOOR_H = 3.2;

function canvas(
  w: number,
  h: number,
): [
  HTMLCanvasElement | OffscreenCanvas,
  CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
] {
  const c =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(w, h)
      : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const ctx = c.getContext('2d') as CanvasRenderingContext2D;
  return [c, ctx];
}

function toTexture(
  c: HTMLCanvasElement | OffscreenCanvas,
  srgb = true,
  repeat = true,
): THREE.CanvasTexture {
  const t = new THREE.CanvasTexture(c as HTMLCanvasElement);
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.anisotropy = 8;
  t.generateMipmaps = true;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

function noise(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  w: number,
  h: number,
  rng: Rng,
  amount: number,
  alpha = 0.08,
): void {
  for (let i = 0; i < amount; i++) {
    const v = Math.floor(rng.range(0, 255));
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha})`;
    ctx.fillRect(rng.range(0, w), rng.range(0, h), rng.range(1, 3), rng.range(1, 3));
  }
}

interface FacadeSpec {
  wall: string;
  glass: string;
  /** Ventana: fracción del vano y de la planta. */
  winW: number;
  winH: number;
  frame: string | null;
  bands?: string;
  balconies?: boolean;
  shutters?: string;
  curtain?: boolean;
  industrial?: boolean;
  house?: boolean;
  lit: number;
}

const FACADES: FacadeSpec[] = [
  {
    wall: '#e9e4dc',
    glass: '#28313a',
    winW: 0.46,
    winH: 0.5,
    frame: '#f6f3ee',
    balconies: true,
    lit: 0.34,
  },
  {
    wall: '#e2d4c8',
    glass: '#232a31',
    winW: 0.4,
    winH: 0.52,
    frame: '#c9c0b4',
    bands: 'rgba(0,0,0,0.08)',
    lit: 0.3,
  },
  {
    wall: '#efe4cf',
    glass: '#1f262d',
    winW: 0.3,
    winH: 0.62,
    frame: '#fbf7ee',
    shutters: '#5f7f63',
    balconies: true,
    lit: 0.28,
  },
  {
    wall: '#8fa6b8',
    glass: '#5b7d96',
    winW: 0.96,
    winH: 0.9,
    frame: '#d7e1e8',
    curtain: true,
    lit: 0.45,
  },
  {
    wall: '#5b6977',
    glass: '#3f5a70',
    winW: 0.96,
    winH: 0.84,
    frame: '#7d8a96',
    curtain: true,
    lit: 0.4,
  },
  {
    wall: '#f1f1ef',
    glass: '#243039',
    winW: 0.8,
    winH: 0.42,
    frame: '#dcdcd8',
    bands: 'rgba(0,0,0,0.12)',
    lit: 0.33,
  },
  {
    wall: '#bfc3c5',
    glass: '#2c3439',
    winW: 0.9,
    winH: 0.16,
    frame: null,
    industrial: true,
    lit: 0.15,
  },
  {
    wall: '#f4efe6',
    glass: '#2a323a',
    winW: 0.34,
    winH: 0.46,
    frame: '#ffffff',
    house: true,
    lit: 0.35,
  },
];

export interface FacadeTextures {
  map: THREE.CanvasTexture;
  emissive: THREE.CanvasTexture;
  roughness: number;
  metalness: number;
}

export function makeFacade(index: number, seed: number): FacadeTextures {
  const f = FACADES[index % FACADES.length]!;
  const rng = Rng.fromSeed(seed, `facade:${index}`);
  const px = 64; // píxeles por vano
  const py = 64; // píxeles por planta
  const W = px * FACADE_BAYS;
  const H = py * FACADE_FLOORS;
  const [c, ctx] = canvas(W, H);
  const [e, ectx] = canvas(W, H);
  ctx.fillStyle = f.wall;
  ctx.fillRect(0, 0, W, H);
  ectx.fillStyle = '#000';
  ectx.fillRect(0, 0, W, H);
  noise(ctx, W, H, rng, 4000, f.curtain ? 0.03 : 0.07);
  if (f.industrial) {
    // Chapa ondulada.
    for (let x = 0; x < W; x += 6) {
      ctx.fillStyle = x % 12 === 0 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, 0, 3, H);
    }
  }
  for (let fy = 0; fy < FACADE_FLOORS; fy++) {
    if (f.bands) {
      ctx.fillStyle = f.bands;
      ctx.fillRect(0, fy * py + py - 8, W, 8);
    }
    for (let bx = 0; bx < FACADE_BAYS; bx++) {
      if (f.industrial && (fy !== 1 || bx % 2)) continue;
      if (f.house && rng.chance(0.3)) continue;
      const ww = px * f.winW;
      const wh = py * f.winH;
      const x = bx * px + (px - ww) / 2;
      const y = fy * py + (py - wh) / 2 - (f.house ? 4 : 0);
      if (f.frame) {
        ctx.fillStyle = f.frame;
        ctx.fillRect(x - 3, y - 3, ww + 6, wh + 6);
      }
      // Cristal: refleja el cielo (más claro arriba) con un brillo en diagonal y cortinas.
      const g = ctx.createLinearGradient(x, y, x, y + wh);
      g.addColorStop(0, shade(f.glass, 70));
      g.addColorStop(0.55, shade(f.glass, 25));
      g.addColorStop(1, f.glass);
      ctx.fillStyle = g;
      ctx.fillRect(x, y, ww, wh);
      ctx.fillStyle = 'rgba(255,255,255,0.10)';
      ctx.beginPath();
      ctx.moveTo(x + ww * 0.15, y);
      ctx.lineTo(x + ww * 0.45, y);
      ctx.lineTo(x + ww * 0.1, y + wh);
      ctx.lineTo(x, y + wh * 0.8);
      ctx.fill();
      if (!f.curtain && rng.chance(0.35)) {
        ctx.fillStyle = rng.pick([
          'rgba(230,220,200,0.55)',
          'rgba(200,210,215,0.5)',
          'rgba(180,150,120,0.5)',
        ]);
        ctx.fillRect(x, y, ww, wh * rng.range(0.2, 0.5));
      }
      if (f.curtain) {
        ctx.fillStyle = 'rgba(255,255,255,0.05)';
        ctx.fillRect(x, y, ww * 0.4, wh);
      }
      if (f.shutters) {
        ctx.fillStyle = f.shutters;
        ctx.fillRect(x - 10, y, 8, wh);
        ctx.fillRect(x + ww + 2, y, 8, wh);
      }
      if (f.balconies && fy > 0 && rng.chance(0.6)) {
        ctx.fillStyle = 'rgba(40,40,40,0.55)';
        ctx.fillRect(x - 6, y + wh - 10, ww + 12, 3);
        for (let k = 0; k < ww + 12; k += 5) ctx.fillRect(x - 6 + k, y + wh - 10, 1, 12);
      }
      // Ventanas encendidas: tonos cálidos y algún televisor azulado.
      if (rng.chance(f.lit)) {
        const warm = rng.chance(0.85);
        const lum = rng.range(0.55, 1);
        ectx.fillStyle = warm
          ? `rgba(255,${Math.round(190 + 40 * lum)},${Math.round(120 + 40 * lum)},${lum})`
          : `rgba(150,190,255,${lum * 0.8})`;
        ectx.fillRect(x, y, ww, wh);
        if (rng.chance(0.4)) {
          ectx.fillStyle = 'rgba(0,0,0,0.5)';
          ectx.fillRect(x + ww * rng.range(0.2, 0.6), y, ww * 0.25, wh);
        }
      }
    }
  }
  if (f.house) {
    // Puerta en la planta baja.
    ctx.fillStyle = '#5b4636';
    ctx.fillRect(px * 3.3, H - py * 0.85, px * 0.45, py * 0.85);
  }
  return {
    map: toTexture(c),
    emissive: toTexture(e),
    roughness: f.curtain ? 0.35 : f.industrial ? 0.6 : 0.85,
    metalness: f.industrial ? 0.25 : 0,
  };
}

function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((n >> 16) & 255) + amt);
  const g = Math.min(255, ((n >> 8) & 255) + amt);
  const b = Math.min(255, (n & 255) + amt);
  return `rgb(${r},${g},${b})`;
}

/** Asfalto: la coordenada u cruza la calzada (0–1) y v recorre 16 m. */
export function makeAsphalt(seed: number, avenue: boolean): THREE.CanvasTexture {
  const rng = Rng.fromSeed(seed, `asphalt:${avenue}`);
  const [c, ctx] = canvas(256, 512);
  ctx.fillStyle = '#3a3c3f';
  ctx.fillRect(0, 0, 256, 512);
  noise(ctx, 256, 512, rng, 9000, 0.12);
  // Manchas y parches.
  for (let i = 0; i < 12; i++) {
    ctx.fillStyle = `rgba(0,0,0,${rng.range(0.04, 0.12)})`;
    ctx.beginPath();
    ctx.ellipse(
      rng.range(0, 256),
      rng.range(0, 512),
      rng.range(10, 40),
      rng.range(10, 60),
      rng.range(0, 3),
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(235,235,225,0.85)';
  ctx.fillRect(6, 0, 4, 512);
  ctx.fillRect(246, 0, 4, 512);
  if (avenue) {
    ctx.fillStyle = 'rgba(235,235,225,0.85)';
    ctx.fillRect(123, 0, 3, 512);
    ctx.fillRect(130, 0, 3, 512);
    for (const u of [64, 192]) for (let v = 0; v < 512; v += 64) ctx.fillRect(u - 1, v, 3, 32);
  } else {
    ctx.fillStyle = 'rgba(235,235,225,0.85)';
    for (let v = 0; v < 512; v += 64) ctx.fillRect(126, v, 4, 36);
  }
  return toTexture(c);
}

export function makePaving(seed: number): THREE.CanvasTexture {
  const rng = Rng.fromSeed(seed, 'paving');
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#a9a39a';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      const v = Math.round(rng.range(-12, 12));
      ctx.fillStyle = `rgb(${165 + v},${160 + v},${152 + v})`;
      ctx.fillRect(x + 1, y + 1, 30, 30);
    }
  }
  noise(ctx, 256, 256, rng, 2500, 0.08);
  return toTexture(c);
}

export function makeGrass(seed: number, dry = false): THREE.CanvasTexture {
  const rng = Rng.fromSeed(seed, `grass:${dry}`);
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = dry ? '#8f8a55' : '#4f7a3a';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 9000; i++) {
    const g = Math.round(rng.range(-25, 25));
    ctx.fillStyle = dry
      ? `rgba(${150 + g},${140 + g},${80 + g},0.5)`
      : `rgba(${70 + g},${120 + g},${50 + g},0.5)`;
    ctx.fillRect(rng.range(0, 256), rng.range(0, 256), 1, rng.range(2, 5));
  }
  return toTexture(c);
}

export function makeField(seed: number): THREE.CanvasTexture {
  const rng = Rng.fromSeed(seed, 'field');
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#9b8a5a';
  ctx.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 8) {
    ctx.fillStyle = x % 16 ? 'rgba(90,110,50,0.55)' : 'rgba(120,95,60,0.4)';
    ctx.fillRect(x, 0, 5, 256);
  }
  noise(ctx, 256, 256, rng, 4000, 0.1);
  return toTexture(c);
}

export function makeRoof(seed: number): THREE.CanvasTexture {
  const rng = Rng.fromSeed(seed, 'roof');
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#5b5d60';
  ctx.fillRect(0, 0, 256, 256);
  noise(ctx, 256, 256, rng, 12000, 0.15);
  return toTexture(c);
}

export function makeTiles(seed: number): THREE.CanvasTexture {
  const rng = Rng.fromSeed(seed, 'tiles');
  const [c, ctx] = canvas(256, 256);
  ctx.fillStyle = '#9d4a32';
  ctx.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 16) {
    for (let x = (y / 16) % 2 ? 8 : 0; x < 256; x += 16) {
      const v = Math.round(rng.range(-18, 18));
      ctx.fillStyle = `rgb(${158 + v},${76 + v},${52 + v})`;
      ctx.fillRect(x, y, 15, 14);
    }
  }
  return toTexture(c);
}
