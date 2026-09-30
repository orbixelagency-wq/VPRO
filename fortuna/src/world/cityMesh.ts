/**
 * Convierte el plano procedural en mallas de Three.js. Los edificios se fusionan por zona
 * de 400 m y estilo de fachada (pocas llamadas de dibujo y recorte por frustum); el mobiliario
 * urbano usa instancias.
 */
import * as THREE from 'three/webgpu';
import { Rng } from '../economy/rng';
import { COAST_X, type Building, type CityLayout, type Rect } from './cityGen';
import {
  BAY_W,
  FACADE_BAYS,
  FACADE_FLOORS,
  FLOOR_H,
  makeAsphalt,
  makeFacade,
  makeField,
  makeGrass,
  makePaving,
  makeRoof,
  makeTiles,
  type FacadeTextures,
} from './textures';

const TILE = 400;
const SIDEWALK_H = 0.15;

class GeoBuilder {
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

const U_PERIOD = BAY_W * FACADE_BAYS;
const V_PERIOD = FLOOR_H * FACADE_FLOORS;

/** Material 0 = fachada, 1 = tejado plano, 2 = tejado de teja. */
function addBuilding(gb: GeoBuilder, b: Building, rng: Rng, base: number): void {
  const x0 = b.x - b.w / 2;
  const x1 = b.x + b.w / 2;
  const z0 = b.z - b.d / 2;
  const z1 = b.z + b.d / 2;
  const y0 = base;
  const y1 = base + b.h;
  const color = new THREE.Color(b.color);
  const uo = Math.floor(rng.range(0, FACADE_BAYS)) / FACADE_BAYS;
  const vo = Math.floor(rng.range(0, FACADE_FLOORS)) / FACADE_FLOORS;
  const v0 = vo;
  const v1 = vo + b.h / V_PERIOD;
  gb.setMaterial(0);
  const wall = (ax: number, az: number, bx: number, bz: number, n: number[]) => {
    const len = Math.hypot(bx - ax, bz - az) / U_PERIOD;
    gb.quad(
      [ax, y0, az],
      [bx, y0, bz],
      [bx, y1, bz],
      [ax, y1, az],
      n,
      [
        [uo, v0],
        [uo + len, v0],
        [uo + len, v1],
        [uo, v1],
      ],
      color,
    );
  };
  wall(x0, z1, x1, z1, [0, 0, 1]);
  wall(x1, z1, x1, z0, [1, 0, 0]);
  wall(x1, z0, x0, z0, [0, 0, -1]);
  wall(x0, z0, x0, z1, [-1, 0, 0]);
  const roofColor = new THREE.Color().setHSL(0, 0, rng.range(0.55, 0.8));
  if (b.roof === 'plano') {
    gb.setMaterial(1);
    gb.quad(
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
      [x0, y1, z0],
      [0, 1, 0],
      [
        [x0 / 8, z1 / 8],
        [x1 / 8, z1 / 8],
        [x1 / 8, z0 / 8],
        [x0 / 8, z0 / 8],
      ],
      roofColor,
    );
    // Pretil y casetón en los edificios altos.
    if (b.floors >= 5 && b.w > 10 && b.d > 10) {
      gb.setMaterial(0);
      const cw = Math.min(6, b.w / 3);
      const cd = Math.min(5, b.d / 3);
      const ch = 3;
      const cx = b.x + rng.range(-b.w / 5, b.w / 5);
      const cz = b.z + rng.range(-b.d / 5, b.d / 5);
      addBox(
        gb,
        cx - cw / 2,
        y1,
        cz - cd / 2,
        cx + cw / 2,
        y1 + ch,
        cz + cd / 2,
        color.clone().multiplyScalar(0.85),
      );
    }
    return;
  }
  // Tejado a dos aguas: la cumbrera sigue el lado largo.
  gb.setMaterial(2);
  const ridgeH = Math.min(b.w, b.d) * 0.32;
  const tile = new THREE.Color('#ffffff');
  if (b.w >= b.d) {
    const zm = b.z;
    const n1 = new THREE.Vector3(0, b.d / 2, ridgeH).normalize().toArray();
    const n2 = new THREE.Vector3(0, b.d / 2, -ridgeH).normalize().toArray();
    gb.quad(
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1 + ridgeH, zm],
      [x0, y1 + ridgeH, zm],
      n1,
      uvRect(x0, x1, 0, 4),
      tile,
    );
    gb.quad(
      [x1, y1, z0],
      [x0, y1, z0],
      [x0, y1 + ridgeH, zm],
      [x1, y1 + ridgeH, zm],
      n2,
      uvRect(x0, x1, 0, 4),
      tile,
    );
    gb.setMaterial(0);
    gb.tri(
      [x1, y1, z1],
      [x1, y1, z0],
      [x1, y1 + ridgeH, zm],
      [1, 0, 0],
      [
        [0, v1],
        [0.2, v1],
        [0.1, v1 + 0.05],
      ],
      color,
    );
    gb.tri(
      [x0, y1, z0],
      [x0, y1, z1],
      [x0, y1 + ridgeH, zm],
      [-1, 0, 0],
      [
        [0, v1],
        [0.2, v1],
        [0.1, v1 + 0.05],
      ],
      color,
    );
  } else {
    const xm = b.x;
    const n1 = new THREE.Vector3(b.w / 2, ridgeH, 0).normalize().toArray();
    const n2 = new THREE.Vector3(-b.w / 2, ridgeH, 0).normalize().toArray();
    gb.quad(
      [x1, y1, z1],
      [x1, y1, z0],
      [xm, y1 + ridgeH, z0],
      [xm, y1 + ridgeH, z1],
      n1,
      uvRect(z0, z1, 0, 4),
      tile,
    );
    gb.quad(
      [x0, y1, z0],
      [x0, y1, z1],
      [xm, y1 + ridgeH, z1],
      [xm, y1 + ridgeH, z0],
      n2,
      uvRect(z0, z1, 0, 4),
      tile,
    );
    gb.setMaterial(0);
    gb.tri(
      [x0, y1, z1],
      [x1, y1, z1],
      [xm, y1 + ridgeH, z1],
      [0, 0, 1],
      [
        [0, v1],
        [0.2, v1],
        [0.1, v1 + 0.05],
      ],
      color,
    );
    gb.tri(
      [x1, y1, z0],
      [x0, y1, z0],
      [xm, y1 + ridgeH, z0],
      [0, 0, -1],
      [
        [0, v1],
        [0.2, v1],
        [0.1, v1 + 0.05],
      ],
      color,
    );
  }
}

function uvRect(a: number, b: number, c: number, dd: number): number[][] {
  return [
    [a / 3, c],
    [b / 3, c],
    [b / 3, dd],
    [a / 3, dd],
  ];
}

function addBox(
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

function flat(gb: GeoBuilder, r: Rect, y: number, uvScale: number, color: THREE.Color): void {
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

export interface CityMeshes {
  group: THREE.Group;
  facades: THREE.MeshStandardMaterial[];
  lampHeads: THREE.InstancedMesh;
  lampPositions: THREE.Vector3[];
  water: THREE.Mesh;
  dispose(): void;
}

export function buildCityMeshes(city: CityLayout): CityMeshes {
  const rng = Rng.fromSeed(city.seed, 'citymesh');
  const group = new THREE.Group();
  group.name = 'ciudad';
  const disposables: { dispose(): void }[] = [];
  const track = <T extends { dispose(): void }>(x: T): T => {
    disposables.push(x);
    return x;
  };

  // --- Materiales ---
  const facadeTex: FacadeTextures[] = [];
  for (let i = 0; i < 8; i++) facadeTex.push(makeFacade(i, city.seed));
  const facades = facadeTex.map((t) =>
    track(
      new THREE.MeshStandardMaterial({
        map: track(t.map),
        emissiveMap: track(t.emissive),
        emissive: new THREE.Color('#ffd9a0'),
        emissiveIntensity: 0,
        vertexColors: true,
        roughness: t.roughness,
        metalness: t.metalness,
      }),
    ),
  );
  const roofMat = track(
    new THREE.MeshStandardMaterial({
      map: track(makeRoof(city.seed)),
      vertexColors: true,
      roughness: 0.95,
    }),
  );
  const tileMat = track(
    new THREE.MeshStandardMaterial({ map: track(makeTiles(city.seed)), roughness: 0.8 }),
  );
  const avenueMat = track(
    new THREE.MeshStandardMaterial({ map: track(makeAsphalt(city.seed, true)), roughness: 0.92 }),
  );
  const streetMat = track(
    new THREE.MeshStandardMaterial({ map: track(makeAsphalt(city.seed, false)), roughness: 0.92 }),
  );
  const pavingMat = track(
    new THREE.MeshStandardMaterial({
      map: track(makePaving(city.seed)),
      vertexColors: true,
      roughness: 0.9,
    }),
  );
  const grassMat = track(
    new THREE.MeshStandardMaterial({ map: track(makeGrass(city.seed)), roughness: 1 }),
  );
  const fieldMat = track(
    new THREE.MeshStandardMaterial({ map: track(makeField(city.seed)), roughness: 1 }),
  );
  const dryMat = track(
    new THREE.MeshStandardMaterial({ map: track(makeGrass(city.seed, true)), roughness: 1 }),
  );

  // --- Edificios: una malla por zona de 400 m y estilo de fachada ---
  const chunks = new Map<string, GeoBuilder>();
  for (const b of city.buildings) {
    const key = `${Math.floor(b.x / TILE)},${Math.floor(b.z / TILE)},${b.facade}`;
    let gb = chunks.get(key);
    if (!gb) {
      gb = new GeoBuilder();
      chunks.set(key, gb);
    }
    addBuilding(gb, b, rng, SIDEWALK_H);
  }
  for (const [key, gb] of chunks) {
    const facade = Number(key.split(',')[2]);
    const geo = track(gb.build());
    const mesh = new THREE.Mesh(geo, [facades[facade]!, roofMat, tileMat]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = `edificios ${key}`;
    group.add(mesh);
  }

  // --- Calles ---
  for (const avenue of [true, false]) {
    const gb = new GeoBuilder();
    gb.setMaterial(0);
    const white = new THREE.Color('#ffffff');
    for (const r of city.roads) {
      if (r.avenue !== avenue) continue;
      const y = avenue ? 0.02 : 0.01;
      const R = r.rect;
      if (r.axis === 'x') {
        const len = (R.x1 - R.x0) / 16;
        gb.quad(
          [R.x0, y, R.z1],
          [R.x1, y, R.z1],
          [R.x1, y, R.z0],
          [R.x0, y, R.z0],
          [0, 1, 0],
          [
            [0, 0],
            [0, len],
            [1, len],
            [1, 0],
          ],
          white,
        );
      } else {
        const len = (R.z1 - R.z0) / 16;
        gb.quad(
          [R.x0, y, R.z1],
          [R.x1, y, R.z1],
          [R.x1, y, R.z0],
          [R.x0, y, R.z0],
          [0, 1, 0],
          [
            [0, len],
            [1, len],
            [1, 0],
            [0, 0],
          ],
          white,
        );
      }
    }
    const mesh = new THREE.Mesh(track(gb.build()), avenue ? avenueMat : streetMat);
    mesh.receiveShadow = true;
    mesh.name = avenue ? 'avenidas' : 'calles';
    group.add(mesh);
  }

  // --- Aceras (con bordillo) y suelo de cada manzana ---
  const walk = new GeoBuilder();
  walk.setMaterial(0);
  const grounds = { grass: new GeoBuilder(), field: new GeoBuilder(), dry: new GeoBuilder() };
  for (const g of Object.values(grounds)) g.setMaterial(0);
  const light = new THREE.Color('#ffffff');
  const plaza = new THREE.Color('#e8e1d6');
  for (const b of city.blocks) {
    addBox(
      walk,
      b.rect.x0,
      0,
      b.rect.z0,
      b.rect.x1,
      SIDEWALK_H,
      b.rect.z1,
      b.use === 'plaza' ? plaza : light,
      2,
    );
    const g =
      b.use === 'parque' || b.use === 'villas' || b.use === 'adosados'
        ? grounds.grass
        : b.use === 'campo'
          ? grounds.field
          : b.use === 'naves'
            ? grounds.dry
            : null;
    if (g) flat(g, b.inner, SIDEWALK_H + 0.01, b.use === 'campo' ? 24 : 6, light);
  }
  const walkMesh = new THREE.Mesh(track(walk.build()), pavingMat);
  walkMesh.receiveShadow = true;
  walkMesh.name = 'aceras';
  group.add(walkMesh);
  for (const [k, g] of Object.entries(grounds)) {
    const m = new THREE.Mesh(
      track(g.build()),
      k === 'grass' ? grassMat : k === 'field' ? fieldMat : dryMat,
    );
    m.receiveShadow = true;
    group.add(m);
  }

  // --- Terreno exterior, muelle y mar ---
  const land = new GeoBuilder();
  land.setMaterial(0);
  flat(land, { x0: COAST_X, z0: -3000, x1: 3500, z1: 3000 }, -0.02, 12, light);
  const landMesh = new THREE.Mesh(track(land.build()), dryMat);
  landMesh.receiveShadow = true;
  group.add(landMesh);
  const quay = new GeoBuilder();
  quay.setMaterial(0);
  addBox(quay, COAST_X - 3, -4, -3000, COAST_X, 0, 3000, new THREE.Color('#9a958c'), 3);
  group.add(new THREE.Mesh(track(quay.build()), pavingMat));
  const water = new THREE.Mesh(
    track(new THREE.PlaneGeometry(6000, 6000)),
    track(new THREE.MeshStandardMaterial({ color: '#1b4556', roughness: 0.08, metalness: 0.35 })),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(COAST_X - 3000, -1.4, 0);
  water.name = 'mar';
  group.add(water);

  // --- Mobiliario urbano instanciado ---
  const lamps = city.props.filter((p) => p.kind === 'farola');
  const trees = city.props.filter((p) => p.kind === 'arbol');
  const benches = city.props.filter((p) => p.kind === 'banco');
  const fountains = city.props.filter((p) => p.kind === 'fuente');
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const place = (
    mesh: THREE.InstancedMesh,
    i: number,
    x: number,
    y: number,
    z: number,
    rot: number,
    s: number,
    sy = s,
  ) => {
    q.setFromAxisAngle(up, rot);
    m4.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(s, sy, s));
    mesh.setMatrixAt(i, m4);
  };

  const poleGeo = track(
    mergeGeos([
      new THREE.CylinderGeometry(0.07, 0.1, 6, 8).translate(0, 3, 0),
      new THREE.BoxGeometry(1.5, 0.08, 0.08).translate(0.7, 5.95, 0),
    ]),
  );
  const pole = new THREE.InstancedMesh(
    poleGeo,
    track(new THREE.MeshStandardMaterial({ color: '#3c4146', roughness: 0.5, metalness: 0.6 })),
    lamps.length,
  );
  const headGeo = track(new THREE.BoxGeometry(0.55, 0.14, 0.3).translate(1.35, 5.86, 0));
  const lampHeads = new THREE.InstancedMesh(
    headGeo,
    track(
      new THREE.MeshStandardMaterial({
        color: '#dfe3e6',
        emissive: new THREE.Color('#ffcf8a'),
        emissiveIntensity: 0,
        roughness: 0.3,
      }),
    ),
    lamps.length,
  );
  const lampPositions: THREE.Vector3[] = [];
  lamps.forEach((l, i) => {
    place(pole, i, l.x, SIDEWALK_H, l.z, l.rot, 1);
    place(lampHeads, i, l.x, SIDEWALK_H, l.z, l.rot, 1);
    lampPositions.push(
      new THREE.Vector3(l.x + Math.cos(-l.rot) * 1.35, 5.7, l.z + Math.sin(-l.rot) * 1.35),
    );
  });
  pole.castShadow = true;
  group.add(pole, lampHeads);

  const trunk = new THREE.InstancedMesh(
    track(new THREE.CylinderGeometry(0.14, 0.22, 3.2, 6).translate(0, 1.6, 0)),
    track(new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 })),
    trees.length,
  );
  const canopyGeo = track(new THREE.IcosahedronGeometry(2.2, 1).translate(0, 4.4, 0));
  const canopy = new THREE.InstancedMesh(
    canopyGeo,
    track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true })),
    trees.length,
  );
  const leaf = new THREE.Color();
  trees.forEach((t, i) => {
    const s = t.scale;
    place(trunk, i, t.x, SIDEWALK_H, t.z, rng.range(0, 6), s);
    place(
      canopy,
      i,
      t.x,
      SIDEWALK_H,
      t.z,
      rng.range(0, 6),
      s * rng.range(0.85, 1.15),
      s * rng.range(0.8, 1.2),
    );
    leaf.setHSL(rng.range(0.22, 0.32), rng.range(0.35, 0.55), rng.range(0.22, 0.34));
    canopy.setColorAt(i, leaf);
  });
  trunk.castShadow = canopy.castShadow = true;
  canopy.receiveShadow = true;
  group.add(trunk, canopy);

  const benchGeo = track(
    mergeGeos([
      new THREE.BoxGeometry(1.8, 0.08, 0.5).translate(0, 0.45, 0),
      new THREE.BoxGeometry(1.8, 0.4, 0.06).translate(0, 0.7, -0.24),
      new THREE.BoxGeometry(0.08, 0.45, 0.45).translate(-0.8, 0.22, 0),
      new THREE.BoxGeometry(0.08, 0.45, 0.45).translate(0.8, 0.22, 0),
    ]),
  );
  const bench = new THREE.InstancedMesh(
    benchGeo,
    track(new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.8 })),
    benches.length,
  );
  benches.forEach((b, i) => place(bench, i, b.x, SIDEWALK_H, b.z, b.rot, 1));
  bench.castShadow = true;
  group.add(bench);

  const basinGeo = track(
    mergeGeos([
      new THREE.CylinderGeometry(4, 4.2, 0.6, 32).translate(0, 0.3, 0),
      new THREE.CylinderGeometry(0.4, 0.6, 2.4, 12).translate(0, 1.2, 0),
      new THREE.CylinderGeometry(1.2, 0.3, 0.3, 16).translate(0, 2.4, 0),
    ]),
  );
  const basin = new THREE.InstancedMesh(
    basinGeo,
    track(new THREE.MeshStandardMaterial({ color: '#d8d2c6', roughness: 0.7 })),
    fountains.length,
  );
  fountains.forEach((f, i) => place(basin, i, f.x, SIDEWALK_H, f.z, 0, 1));
  basin.castShadow = basin.receiveShadow = true;
  group.add(basin);

  for (const im of [pole, lampHeads, trunk, canopy, bench, basin]) {
    im.instanceMatrix.needsUpdate = true;
    im.computeBoundingSphere();
  }

  return {
    group,
    facades,
    lampHeads,
    lampPositions,
    water,
    dispose() {
      for (const d of disposables) d.dispose();
    },
  };
}

/** Fusiona geometrías no indexadas o indexadas sencillas (sin dependencias externas). */
function mergeGeos(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
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
