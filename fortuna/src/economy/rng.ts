/**
 * Generador pseudoaleatorio determinista (sfc32) con estado serializable.
 * Cada subsistema usa su propio flujo para que las acciones del jugador
 * no desplacen la secuencia aleatoria de otros sistemas.
 */
export type RngState = [number, number, number, number];

function splitmix32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x9e3779b9) >>> 0;
    let z = s;
    z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
    z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
    return (z ^ (z >>> 16)) >>> 0;
  };
}

export function hashString(text: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function seedState(seed: number, stream = ''): RngState {
  const sm = splitmix32((seed ^ hashString(stream)) >>> 0);
  const st: RngState = [sm(), sm(), sm(), sm()];
  const rng = new Rng(st);
  for (let i = 0; i < 12; i++) rng.nextU32();
  return rng.state;
}

export class Rng {
  state: RngState;
  constructor(state: RngState) {
    this.state = state;
  }

  static fromSeed(seed: number, stream = ''): Rng {
    return new Rng(seedState(seed, stream));
  }

  nextU32(): number {
    const s = this.state;
    let a = s[0],
      b = s[1],
      c = s[2],
      d = s[3];
    const t = (((a + b) >>> 0) + d) >>> 0;
    d = (d + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = (c << 21) | (c >>> 11);
    c = (c + t) >>> 0;
    s[0] = a >>> 0;
    s[1] = b >>> 0;
    s[2] = c >>> 0;
    s[3] = d;
    return t;
  }

  /** Uniforme en [0, 1). */
  next(): number {
    return this.nextU32() / 4294967296;
  }

  range(min: number, max: number): number {
    return min + (max - min) * this.next();
  }

  int(min: number, maxInclusive: number): number {
    return min + Math.floor(this.next() * (maxInclusive - min + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick() sobre lista vacía');
    return items[Math.floor(this.next() * items.length)] as T;
  }

  weighted<T>(items: readonly T[], weight: (item: T) => number): T {
    let total = 0;
    for (const it of items) total += Math.max(0, weight(it));
    let r = this.next() * total;
    for (const it of items) {
      r -= Math.max(0, weight(it));
      if (r <= 0) return it;
    }
    return items[items.length - 1] as T;
  }

  /** Normal estándar (Box-Muller, sin caché para mantener el estado simple). */
  gauss(): number {
    let u = this.next();
    if (u < 1e-12) u = 1e-12;
    const v = this.next();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /**
   * Normal de varianza unitaria con colas gruesas (mezcla de dos normales):
   * la mayoría de días son tranquilos y unos pocos, muy movidos.
   */
  fatTail(): number {
    const calm = this.next() < 0.9;
    return this.gauss() * (calm ? 0.85 : 1.9);
  }

  shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const tmp = items[i] as T;
      items[i] = items[j] as T;
      items[j] = tmp;
    }
    return items;
  }
}
