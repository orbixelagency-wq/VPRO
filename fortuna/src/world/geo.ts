/**
 * Utilidades de geometría: un constructor de mallas fusionadas (posición, normal, UV, color y
 * grupos de material) y primitivas en coordenadas de mundo.
 */
import * as THREE from 'three/webgpu';
import type { Rect } from './cityGen';

export class GeoBuilder {
  pos: number[] = [];
  nor: number[] = [];
  uv: number[] = [];
  col: number[] = [];
  idx: number[] = [];
  groups: { start: number; count: number; material: number }[] = [];
  private cur = -1;

  setMaterial(m: number): void {
    if (this.cur === m) return;
    this.cur = m;
    this.groups.push({ start: this.idx.length, count: 0, material: m });
  }

  /** Cuadrilátero a-b-c-d (antihorario visto desde fuera). */
  quad(
    a: number[],
    b: number[],
    c: number[],
    dd: number[],
    n: number[],
    uvs: number[][],
    color: THREE.Color,
  ): void {
    const base = this.pos.length / 3;
    for (const [p, t] of [
      [a, uvs[0]],
      [b, uvs[1]],
      [c, uvs[2]],
      [dd, uvs[3]],
    ] as const) {
      this.pos.push(p[0]!, p[1]!, p[2]!);
      this.nor.push(n[0]!, n[1]!, n[2]!);
      this.uv.push(t![0]!, t![1]!);
      this.col.push(color.r, color.g, color.b);
    }
    this.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    this.groups[this.groups.length - 1]!.count += 6;
  }

  tri(
    a: number[],
    b: number[],
    c: number[],
    n: number[],
    uvs: number[][],
    color: THREE.Color,
  ): void {
    const base = this.pos.length / 3;
    for (const [p, t] of [
      [a, uvs[0]],
      [b, uvs[1]],
      [c, uvs[2]],
    ] as const) {
      this.pos.push(p[0]!, p[1]!, p[2]!);
      this.nor.push(n[0]!, n[1]!, n[2]!);
      this.uv.push(t![0]!, t![1]!);
      this.col.push(color.r, color.g, color.b);
    }
    this.idx.push(base, base + 1, base + 2);
    this.groups[this.groups.length - 1]!.count += 3;
  }

  build(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.nor, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setIndex(this.idx);
    for (const gr of this.groups) if (gr.count > 0) g.addGroup(gr.start, gr.count, gr.material);
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

export function addBox(
  gb: GeoBuilder,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  color: THREE.Color,
  uvScale = 1,
): void {
  const u = (v: number) => v / uvScale;
  gb.quad(
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
    [0, 0, 1],
    [
      [u(x0), u(y0)],
      [u(x1), u(y0)],
      [u(x1), u(y1)],
      [u(x0), u(y1)],
    ],
    color,
  );
  gb.quad(
    [x1, y0, z1],
    [x1, y0, z0],
    [x1, y1, z0],
    [x1, y1, z1],
    [1, 0, 0],
    [
      [u(z1), u(y0)],
      [u(z0), u(y0)],
      [u(z0), u(y1)],
      [u(z1), u(y1)],
    ],
    color,
  );
  gb.quad(
    [x1, y0, z0],
    [x0, y0, z0],
    [x0, y1, z0],
    [x1, y1, z0],
    [0, 0, -1],
    [
      [u(x1), u(y0)],
      [u(x0), u(y0)],
      [u(x0), u(y1)],
      [u(x1), u(y1)],
    ],
    color,
  );
  gb.quad(
    [x0, y0, z0],
    [x0, y0, z1],
    [x0, y1, z1],
    [x0, y1, z0],
    [-1, 0, 0],
    [
      [u(z0), u(y0)],
      [u(z1), u(y0)],
      [u(z1), u(y1)],
      [u(z0), u(y1)],
    ],
    color,
  );
  gb.quad(
    [x0, y1, z1],
    [x1, y1, z1],
    [x1, y1, z0],
    [x0, y1, z0],
    [0, 1, 0],
    [
      [u(x0), u(z1)],
      [u(x1), u(z1)],
      [u(x1), u(z0)],
      [u(x0), u(z0)],
    ],
    color,
  );
}

export function flat(
  gb: GeoBuilder,
  r: Rect,
  y: number,
  uvScale: number,
  color: THREE.Color,
): void {
  gb.quad(
    [r.x0, y, r.z1],
    [r.x1, y, r.z1],
    [r.x1, y, r.z0],
    [r.x0, y, r.z0],
    [0, 1, 0],
    [
      [r.x0 / uvScale, r.z1 / uvScale],
      [r.x1 / uvScale, r.z1 / uvScale],
      [r.x1 / uvScale, r.z0 / uvScale],
      [r.x0 / uvScale, r.z0 / uvScale],
    ],
    color,
  );
}

/** Fusiona geometrías no indexadas o indexadas sencillas (sin dependencias externas). */
export function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const gb = new GeoBuilder();
  gb.setMaterial(0);
  const white = new THREE.Color('#ffffff');
  for (const g0 of geos) {
    const g = g0.index ? g0.toNonIndexed() : g0;
    const p = g.getAttribute('position');
    const n = g.getAttribute('normal');
    const uv = g.getAttribute('uv');
    for (let i = 0; i < p.count; i += 3) {
      const pt = (k: number) => [p.getX(i + k), p.getY(i + k), p.getZ(i + k)];
      const uvp = (k: number) => (uv ? [uv.getX(i + k), uv.getY(i + k)] : [0, 0]);
      gb.tri(
        pt(0),
        pt(1),
        pt(2),
        [n.getX(i), n.getY(i), n.getZ(i)],
        [uvp(0), uvp(1), uvp(2)],
        white,
      );
    }
    g0.dispose();
  }
  const out = gb.build();
  // La normal por cara es suficiente para objetos pequeños; se recalcula por vértice.
  out.computeVertexNormals();
  return out;
}

/** Caja con UV en metros y escalas independientes en horizontal (su) y vertical (sv). */
export function boxUV(
  gb: GeoBuilder,
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  color: THREE.Color,
  su: number,
  sv: number,
  bottom = false,
): void {
  const U = (v: number) => v / su;
  const V = (v: number) => v / sv;
  const faces: [number[], number[], number[], number[], number[], number[][]][] = [
    [
      [x0, y0, z1],
      [x1, y0, z1],
      [x1, y1, z1],
      [x0, y1, z1],
      [0, 0, 1],
      [
        [U(x0), V(y0)],
        [U(x1), V(y0)],
        [U(x1), V(y1)],
        [U(x0), V(y1)],
      ],
    ],
    [
      [x1, y0, z1],
      [x1, y0, z0],
      [x1, y1, z0],
      [x1, y1, z1],
      [1, 0, 0],
      [
        [U(-z1), V(y0)],
        [U(-z0), V(y0)],
        [U(-z0), V(y1)],
        [U(-z1), V(y1)],
      ],
    ],
    [
      [x1, y0, z0],
      [x0, y0, z0],
      [x0, y1, z0],
      [x1, y1, z0],
      [0, 0, -1],
      [
        [U(-x1), V(y0)],
        [U(-x0), V(y0)],
        [U(-x0), V(y1)],
        [U(-x1), V(y1)],
      ],
    ],
    [
      [x0, y0, z0],
      [x0, y0, z1],
      [x0, y1, z1],
      [x0, y1, z0],
      [-1, 0, 0],
      [
        [U(z0), V(y0)],
        [U(z1), V(y0)],
        [U(z1), V(y1)],
        [U(z0), V(y1)],
      ],
    ],
    [
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
      [x0, y1, z0],
      [0, 1, 0],
      [
        [U(x0), U(z1)],
        [U(x1), U(z1)],
        [U(x1), U(z0)],
        [U(x0), U(z0)],
      ],
    ],
  ];
  if (bottom)
    faces.push([
      [x0, y0, z0],
      [x1, y0, z0],
      [x1, y0, z1],
      [x0, y0, z1],
      [0, -1, 0],
      [
        [U(x0), U(z0)],
        [U(x1), U(z0)],
        [U(x1), U(z1)],
        [U(x0), U(z1)],
      ],
    ]);
  for (const f of faces) gb.quad(f[0], f[1], f[2], f[3], f[4], f[5], color);
}

/** Cilindro vertical (base en y0) con tapa superior. */
export function cylinder(
  gb: GeoBuilder,
  cx: number,
  y0: number,
  cz: number,
  r: number,
  h: number,
  color: THREE.Color,
  seg = 16,
): void {
  const y1 = y0 + h;
  const circ = 2 * Math.PI * r;
  for (let i = 0; i < seg; i++) {
    const a0 = (i / seg) * Math.PI * 2;
    const a1 = ((i + 1) / seg) * Math.PI * 2;
    const p0 = [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r];
    const p1 = [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r];
    const am = (a0 + a1) / 2;
    const n = [Math.cos(am), 0, Math.sin(am)];
    const u0 = ((i / seg) * circ) / 2;
    const u1 = (((i + 1) / seg) * circ) / 2;
    gb.quad(
      [p1[0]!, y0, p1[1]!],
      [p0[0]!, y0, p0[1]!],
      [p0[0]!, y1, p0[1]!],
      [p1[0]!, y1, p1[1]!],
      n,
      [
        [u1, y0 / 2],
        [u0, y0 / 2],
        [u0, y1 / 2],
        [u1, y1 / 2],
      ],
      color,
    );
    gb.tri(
      [cx, y1, cz],
      [p1[0]!, y1, p1[1]!],
      [p0[0]!, y1, p0[1]!],
      [0, 1, 0],
      [
        [0.5, 0.5],
        [0.5 + Math.cos(a1) / 2, 0.5 + Math.sin(a1) / 2],
        [0.5 + Math.cos(a0) / 2, 0.5 + Math.sin(a0) / 2],
      ],
      color,
    );
  }
}

/** Prisma triangular (tejado a dos aguas, frontón): cumbrera a lo largo de x o de z. */
export function prism(
  gb: GeoBuilder,
  cx: number,
  y0: number,
  cz: number,
  w: number,
  h: number,
  d: number,
  axis: 'x' | 'z',
  color: THREE.Color,
): void {
  const y1 = y0 + h;
  if (axis === 'x') {
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    const z0 = cz - d / 2;
    const z1 = cz + d / 2;
    const n1 = new THREE.Vector3(0, d / 2, h).normalize().toArray();
    const n2 = new THREE.Vector3(0, d / 2, -h).normalize().toArray();
    const uv = [
      [x0 / 3, 0],
      [x1 / 3, 0],
      [x1 / 3, d / 6],
      [x0 / 3, d / 6],
    ];
    gb.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, cz], [x0, y1, cz], n1, uv, color);
    gb.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, cz], [x1, y1, cz], n2, uv, color);
    gb.tri(
      [x1, y0, z1],
      [x1, y0, z0],
      [x1, y1, cz],
      [1, 0, 0],
      [
        [0, 0],
        [d / 3, 0],
        [d / 6, h / 3],
      ],
      color,
    );
    gb.tri(
      [x0, y0, z0],
      [x0, y0, z1],
      [x0, y1, cz],
      [-1, 0, 0],
      [
        [0, 0],
        [d / 3, 0],
        [d / 6, h / 3],
      ],
      color,
    );
  } else {
    const x0 = cx - w / 2;
    const x1 = cx + w / 2;
    const z0 = cz - d / 2;
    const z1 = cz + d / 2;
    const n1 = new THREE.Vector3(w / 2, h, 0).normalize().toArray();
    const n2 = new THREE.Vector3(-w / 2, h, 0).normalize().toArray();
    const uv = [
      [z0 / 3, 0],
      [z1 / 3, 0],
      [z1 / 3, w / 6],
      [z0 / 3, w / 6],
    ];
    gb.quad([x1, y0, z1], [x1, y0, z0], [cx, y1, z0], [cx, y1, z1], n1, uv, color);
    gb.quad([x0, y0, z0], [x0, y0, z1], [cx, y1, z1], [cx, y1, z0], n2, uv, color);
    gb.tri(
      [x0, y0, z1],
      [x1, y0, z1],
      [cx, y1, z1],
      [0, 0, 1],
      [
        [0, 0],
        [w / 3, 0],
        [w / 6, h / 3],
      ],
      color,
    );
    gb.tri(
      [x1, y0, z0],
      [x0, y0, z0],
      [cx, y1, z0],
      [0, 0, -1],
      [
        [0, 0],
        [w / 3, 0],
        [w / 6, h / 3],
      ],
      color,
    );
  }
}

/** Esfera o cúpula (media esfera) centrada en (cx, cy, cz) con radios rx, ry, rz. */
export function ellipsoid(
  gb: GeoBuilder,
  cx: number,
  cy: number,
  cz: number,
  rx: number,
  ry: number,
  rz: number,
  color: THREE.Color,
  half: boolean,
  seg = 16,
  rings = 8,
): void {
  const pt = (i: number, j: number) => {
    const phi = half ? (j / rings) * (Math.PI / 2) : (j / rings) * Math.PI - Math.PI / 2;
    const th = (i / seg) * Math.PI * 2;
    const c = Math.cos(phi);
    return {
      p: [cx + Math.cos(th) * c * rx, cy + Math.sin(phi) * ry, cz + Math.sin(th) * c * rz],
      n: new THREE.Vector3((Math.cos(th) * c) / rx, Math.sin(phi) / ry, (Math.sin(th) * c) / rz)
        .normalize()
        .toArray(),
      uv: [i / seg, j / rings],
    };
  };
  for (let j = 0; j < rings; j++)
    for (let i = 0; i < seg; i++) {
      const a = pt(i, j);
      const b = pt(i + 1, j);
      const c = pt(i + 1, j + 1);
      const d = pt(i, j + 1);
      const n = new THREE.Vector3(
        (a.n[0]! + c.n[0]!) / 2,
        (a.n[1]! + c.n[1]!) / 2,
        (a.n[2]! + c.n[2]!) / 2,
      )
        .normalize()
        .toArray();
      gb.quad(b.p, a.p, d.p, c.p, n, [b.uv, a.uv, d.uv, c.uv], color);
    }
}
