/**
 * Convierte el plano procedural en mallas de Three.js con streaming por teselas:
 * - Edificios: cada tesela de 200 m tiene una versión lejana ligera (siempre cargada, dos
 *   materiales) y una detallada (todos los estilos de fachada, casetones, tejados a dos aguas)
 *   que se construye poco a poco al acercarse y se libera al alejarse.
 * - Mobiliario (farolas, árboles, bancos, fuentes): instancias por tesela de 400 m, ocultas
 *   más allá de la distancia de detalle.
 * - Calles, aceras, pasos de cebra, semáforos, mar y edificios singulares: estáticos.
 */
import * as THREE from 'three/webgpu';
import { Rng } from '../economy/rng';
import { COAST_X, type Building, type CityLayout } from './cityGen';
import { addBox, flat, GeoBuilder, mergeGeos } from './geo';
import { buildParts, PartMaterials, type PartsMesh } from './partsMesh';
import { signalAt, type RoadGraph } from './roads';
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
  makeZebra,
  type FacadeTextures,
} from './textures';

const TILE = 200;
const PROP_TILE = 400;
const SIDEWALK_H = 0.15;

const U_PERIOD = BAY_W * FACADE_BAYS;
const V_PERIOD = FLOOR_H * FACADE_FLOORS;

/** Material 0 = fachada, 1 = tejado plano, 2 = tejado de teja. */
function addBuilding(gb: GeoBuilder, b: Building, rng: Rng, base: number, far = false): void {
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
  if (far) {
    // Versión lejana: sin tejados a dos aguas ni casetones.
    // La tapa usa el mismo material que la fachada, muestreando un texel de pared (una sola
    // llamada de dibujo por estilo y tesela).
    const t = [0.002, 0.998];
    gb.quad(
      [x0, y1, z1],
      [x1, y1, z1],
      [x1, y1, z0],
      [x0, y1, z0],
      [0, 1, 0],
      [t, t, t, t],
      roofColor.multiplyScalar(0.8),
    );
    return;
  }
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

export interface CityMeshes {
  group: THREE.Group;
  facades: THREE.MeshStandardMaterial[];
  /** Material de los cabezales de farola (su brillo lo controla el entorno). */
  lampHeadMaterial: THREE.MeshStandardMaterial;
  lampPositions: THREE.Vector3[];
  water: THREE.Mesh;
  /** Materiales de asfalto y acera (el entorno los moja cuando llueve). */
  groundMaterials: THREE.MeshStandardMaterial[];
  partMaterials: PartMaterials;
  landmarks: PartsMesh;
  /** Streaming: carga y libera teselas según la posición del jugador. */
  update(focus: THREE.Vector3, timeSec: number): void;
  setDetailRadius(r: number): void;
  streamStats(): { near: number; pending: number; propTiles: number };
  dispose(): void;
}

interface Chunk {
  key: string;
  cx: number;
  cz: number;
  buildings: { b: Building; index: number }[];
  far: THREE.Mesh | null;
  near: THREE.Group | null;
}

/** Estilos de fachada que se agrupan en la versión lejana: cristal y resto. */
const FAR_STYLE = [1, 1, 1, 3, 3, 1, 1, 1];

export function buildCityMeshes(city: CityLayout, graph: RoadGraph): CityMeshes {
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

  // --- Edificios en teselas ---
  const chunks = new Map<string, Chunk>();
  city.buildings.forEach((b, index) => {
    const cx = Math.floor(b.x / TILE);
    const cz = Math.floor(b.z / TILE);
    const key = `${cx},${cz}`;
    let c = chunks.get(key);
    if (!c) {
      c = { key, cx, cz, buildings: [], far: null, near: null };
      chunks.set(key, c);
    }
    c.buildings.push({ b, index });
  });
  const bRng = (index: number) => Rng.fromSeed(city.seed, `b${index}`);
  for (const c of chunks.values()) {
    const gb = new GeoBuilder();
    const groups = new Map<number, GeoBuilder>();
    for (const { b, index } of c.buildings) {
      const style = FAR_STYLE[b.facade] ?? 1;
      let g = groups.get(style);
      if (!g) {
        g = new GeoBuilder();
        groups.set(style, g);
      }
      addBuilding(g, b, bRng(index), SIDEWALK_H, true);
    }
    // Una malla por tesela con un grupo por estilo lejano.
    const mats: THREE.Material[] = [];
    for (const [style, g] of groups) {
      const base = mats.length;
      mats.push(facades[style]!);
      for (const gr of g.groups) {
        gb.setMaterial(base + gr.material);
        const offset = gb.pos.length / 3;
        for (let k = gr.start; k < gr.start + gr.count; k++) gb.idx.push(g.idx[k]! + offset);
        gb.groups[gb.groups.length - 1]!.count += gr.count;
      }
      // Copia de los atributos después de reindexar.
      gb.pos.push(...g.pos);
      gb.nor.push(...g.nor);
      gb.uv.push(...g.uv);
      gb.col.push(...g.col);
    }
    const mesh = new THREE.Mesh(track(gb.build()), mats);
    mesh.name = `edificios lejanos ${c.key}`;
    mesh.receiveShadow = true;
    c.far = mesh;
    group.add(mesh);
  }

  const buildNear = (c: Chunk): THREE.Group => {
    const g = new THREE.Group();
    g.name = `edificios ${c.key}`;
    const byStyle = new Map<number, GeoBuilder>();
    for (const { b, index } of c.buildings) {
      let gb = byStyle.get(b.facade);
      if (!gb) {
        gb = new GeoBuilder();
        byStyle.set(b.facade, gb);
      }
      addBuilding(gb, b, bRng(index), SIDEWALK_H);
    }
    for (const [style, gb] of byStyle) {
      const mesh = new THREE.Mesh(gb.build(), [facades[style]!, roofMat, tileMat]);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      g.add(mesh);
    }
    return g;
  };
  const freeNear = (c: Chunk) => {
    if (!c.near) return;
    group.remove(c.near);
    for (const m of c.near.children) (m as THREE.Mesh).geometry.dispose();
    c.near = null;
  };

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

  // --- Pasos de cebra junto a cada cruce ---
  {
    const gb = new GeoBuilder();
    gb.setMaterial(0);
    const white = new THREE.Color('#ffffff');
    const { xs, zs } = city.grid;
    for (const n of graph.nodes) {
      const xl = xs[n.i]!;
      const zl = zs[n.j]!;
      const y = 0.035;
      // Cruzan la calle norte-sur (xl) por encima y por debajo del cruce, y la este-oeste (zl).
      for (const s of [-1, 1]) {
        const z0 = n.z + s * (zl.width / 2 + 0.3);
        const z1 = n.z + s * (zl.width / 2 + 3.3);
        const a = Math.min(z0, z1);
        const b = Math.max(z0, z1);
        gb.quad(
          [n.x - xl.width / 2, y, b],
          [n.x + xl.width / 2, y, b],
          [n.x + xl.width / 2, y, a],
          [n.x - xl.width / 2, y, a],
          [0, 1, 0],
          [
            [0, 0],
            [xl.width / 4, 0],
            [xl.width / 4, 1],
            [0, 1],
          ],
          white,
        );
        const x0 = n.x + s * (xl.width / 2 + 0.3);
        const x1 = n.x + s * (xl.width / 2 + 3.3);
        const l = Math.min(x0, x1);
        const r = Math.max(x0, x1);
        gb.quad(
          [l, y, n.z + zl.width / 2],
          [r, y, n.z + zl.width / 2],
          [r, y, n.z - zl.width / 2],
          [l, y, n.z - zl.width / 2],
          [0, 1, 0],
          [
            [0, 0],
            [0, 1],
            [zl.width / 4, 1],
            [zl.width / 4, 0],
          ],
          white,
        );
      }
    }
    const zebra = new THREE.Mesh(
      track(gb.build()),
      track(
        new THREE.MeshStandardMaterial({
          map: track(makeZebra()),
          transparent: true,
          roughness: 0.7,
          depthWrite: false,
        }),
      ),
    );
    zebra.receiveShadow = true;
    zebra.name = 'pasos de cebra';
    zebra.renderOrder = 1;
    group.add(zebra);
  }

  // --- Semáforos: un poste en cada esquina con un foco por eje ---
  const blockAt = new Map<string, (typeof city.blocks)[number]>();
  for (const b of city.blocks) blockAt.set(`${b.gi},${b.gj}`, b);
  const poles: { x: number; z: number; node: number }[] = [];
  for (const n of graph.nodes) {
    const corners: [number, number, 'x0' | 'x1', 'z0' | 'z1', number, number][] = [
      [n.i, n.j, 'x0', 'z0', 0.7, 0.7],
      [n.i - 1, n.j, 'x1', 'z0', -0.7, 0.7],
      [n.i, n.j - 1, 'x0', 'z1', 0.7, -0.7],
      [n.i - 1, n.j - 1, 'x1', 'z1', -0.7, -0.7],
    ];
    for (const [gi, gj, kx, kz, ox, oz] of corners) {
      const b = blockAt.get(`${gi},${gj}`);
      if (b) poles.push({ x: b.rect[kx] + ox, z: b.rect[kz] + oz, node: n.id });
    }
  }
  const signalPole = new THREE.InstancedMesh(
    track(
      mergeGeos([
        new THREE.CylinderGeometry(0.08, 0.1, 3.6, 8).translate(0, 1.8, 0),
        new THREE.BoxGeometry(0.34, 0.95, 0.3).translate(0, 3.3, 0.22),
        new THREE.BoxGeometry(0.3, 0.95, 0.34).translate(0.22, 3.3, 0),
      ]),
    ),
    track(new THREE.MeshStandardMaterial({ color: '#2d3136', roughness: 0.5, metalness: 0.5 })),
    poles.length,
  );
  // Dos focos por poste: uno para el tráfico este-oeste (mira a z) y otro para el norte-sur.
  const signalHead = new THREE.InstancedMesh(
    track(new THREE.SphereGeometry(0.13, 8, 6)),
    track(new THREE.MeshBasicMaterial({ color: '#ffffff' })),
    poles.length * 2,
  );
  {
    const m4 = new THREE.Matrix4();
    poles.forEach((p, i) => {
      m4.makeTranslation(p.x, SIDEWALK_H, p.z);
      signalPole.setMatrixAt(i, m4);
      m4.makeTranslation(p.x, SIDEWALK_H + 3.4, p.z + 0.38);
      signalHead.setMatrixAt(i * 2, m4);
      m4.makeTranslation(p.x + 0.38, SIDEWALK_H + 3.4, p.z);
      signalHead.setMatrixAt(i * 2 + 1, m4);
    });
    signalPole.castShadow = true;
    signalPole.computeBoundingSphere();
    signalHead.computeBoundingSphere();
    group.add(signalPole, signalHead);
  }
  const SIGNAL_COLORS = {
    green: new THREE.Color('#2bff7a'),
    amber: new THREE.Color('#ffb21a'),
    red: new THREE.Color('#ff2d1f'),
  };
  const updateSignals = (focus: THREE.Vector3, timeSec: number) => {
    poles.forEach((p, i) => {
      if (Math.abs(p.x - focus.x) > 350 || Math.abs(p.z - focus.z) > 350) return;
      const node = graph.nodes[p.node]!;
      signalHead.setColorAt(i * 2, SIGNAL_COLORS[signalAt(node, 'x', timeSec)]);
      signalHead.setColorAt(i * 2 + 1, SIGNAL_COLORS[signalAt(node, 'z', timeSec)]);
    });
    if (signalHead.instanceColor) signalHead.instanceColor.needsUpdate = true;
  };

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

  // --- Edificios singulares ---
  const partMaterials = new PartMaterials(city.seed, facades);
  const landmarks = buildParts(
    city.landmarks.flatMap((l) => l.parts),
    partMaterials,
    'edificios singulares',
  );
  group.add(landmarks.group);

  // --- Mobiliario urbano instanciado, por teselas de 400 m ---
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
  const poleMat = track(
    new THREE.MeshStandardMaterial({ color: '#3c4146', roughness: 0.5, metalness: 0.6 }),
  );
  const headGeo = track(new THREE.BoxGeometry(0.55, 0.14, 0.3).translate(1.35, 5.86, 0));
  const lampHeadMaterial = track(
    new THREE.MeshStandardMaterial({
      color: '#dfe3e6',
      emissive: new THREE.Color('#ffcf8a'),
      emissiveIntensity: 0,
      roughness: 0.3,
    }),
  );
  const trunkGeo = track(new THREE.CylinderGeometry(0.14, 0.22, 3.2, 6).translate(0, 1.6, 0));
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 1 }));
  const canopyGeo = track(new THREE.IcosahedronGeometry(2.2, 1).translate(0, 4.4, 0));
  const canopyMat = track(
    new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.95, flatShading: true }),
  );
  const benchGeo = track(
    mergeGeos([
      new THREE.BoxGeometry(1.8, 0.08, 0.5).translate(0, 0.45, 0),
      new THREE.BoxGeometry(1.8, 0.4, 0.06).translate(0, 0.7, -0.24),
      new THREE.BoxGeometry(0.08, 0.45, 0.45).translate(-0.8, 0.22, 0),
      new THREE.BoxGeometry(0.08, 0.45, 0.45).translate(0.8, 0.22, 0),
    ]),
  );
  const benchMat = track(new THREE.MeshStandardMaterial({ color: '#7a5a3c', roughness: 0.8 }));
  const basinGeo = track(
    mergeGeos([
      new THREE.CylinderGeometry(4, 4.2, 0.6, 32).translate(0, 0.3, 0),
      new THREE.CylinderGeometry(0.4, 0.6, 2.4, 12).translate(0, 1.2, 0),
      new THREE.CylinderGeometry(1.2, 0.3, 0.3, 16).translate(0, 2.4, 0),
    ]),
  );
  const basinMat = track(new THREE.MeshStandardMaterial({ color: '#d8d2c6', roughness: 0.7 }));

  const lampPositions: THREE.Vector3[] = [];
  const propTiles = new Map<string, { group: THREE.Group; cx: number; cz: number }>();
  const byTile = new Map<string, typeof city.props>();
  for (const p of city.props) {
    const key = `${Math.floor(p.x / PROP_TILE)},${Math.floor(p.z / PROP_TILE)}`;
    const list = byTile.get(key) ?? [];
    list.push(p);
    byTile.set(key, list);
  }
  for (const [key, props] of byTile) {
    const [cx, cz] = key.split(',').map(Number) as [number, number];
    const g = new THREE.Group();
    g.name = `mobiliario ${key}`;
    const lamps = props.filter((p) => p.kind === 'farola');
    const trees = props.filter((p) => p.kind === 'arbol');
    const benches = props.filter((p) => p.kind === 'banco');
    const fountains = props.filter((p) => p.kind === 'fuente');
    const made: THREE.InstancedMesh[] = [];
    if (lamps.length) {
      const pole = new THREE.InstancedMesh(poleGeo, poleMat, lamps.length);
      const head = new THREE.InstancedMesh(headGeo, lampHeadMaterial, lamps.length);
      lamps.forEach((l, i) => {
        place(pole, i, l.x, SIDEWALK_H, l.z, l.rot, 1);
        place(head, i, l.x, SIDEWALK_H, l.z, l.rot, 1);
        lampPositions.push(
          new THREE.Vector3(l.x + Math.cos(-l.rot) * 1.35, 5.7, l.z + Math.sin(-l.rot) * 1.35),
        );
      });
      pole.castShadow = true;
      made.push(pole, head);
    }
    if (trees.length) {
      const trunk = new THREE.InstancedMesh(trunkGeo, trunkMat, trees.length);
      const canopy = new THREE.InstancedMesh(canopyGeo, canopyMat, trees.length);
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
      made.push(trunk, canopy);
    }
    if (benches.length) {
      const bench = new THREE.InstancedMesh(benchGeo, benchMat, benches.length);
      benches.forEach((b, i) => place(bench, i, b.x, SIDEWALK_H, b.z, b.rot, 1));
      bench.castShadow = true;
      made.push(bench);
    }
    if (fountains.length) {
      const basin = new THREE.InstancedMesh(basinGeo, basinMat, fountains.length);
      fountains.forEach((f, i) => place(basin, i, f.x, SIDEWALK_H, f.z, 0, 1));
      basin.castShadow = basin.receiveShadow = true;
      made.push(basin);
    }
    for (const im of made) {
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
      g.add(im);
      disposables.push(im);
    }
    group.add(g);
    propTiles.set(key, { group: g, cx, cz });
  }

  // --- Streaming ---
  let detailRadius = 450;
  const pending: Chunk[] = [];
  let lastStream = -1;
  const update = (focus: THREE.Vector3, timeSec: number) => {
    // Construye como mucho una tesela detallada por fotograma.
    const next = pending.shift();
    if (next && !next.near) {
      next.near = buildNear(next);
      group.add(next.near);
      if (next.far) next.far.visible = false;
    }
    if (timeSec - lastStream < 0.4 && lastStream >= 0) return;
    lastStream = timeSec;
    updateSignals(focus, timeSec);
    for (const c of chunks.values()) {
      const dx = (c.cx + 0.5) * TILE - focus.x;
      const dz = (c.cz + 0.5) * TILE - focus.z;
      const d = Math.hypot(dx, dz);
      if (d < detailRadius) {
        if (!c.near && !pending.includes(c)) pending.push(c);
      } else if (d > detailRadius + 150 && c.near) {
        freeNear(c);
        if (c.far) c.far.visible = true;
      }
    }
    // Primero lo más cercano.
    pending.sort(
      (a, b) =>
        Math.hypot((a.cx + 0.5) * TILE - focus.x, (a.cz + 0.5) * TILE - focus.z) -
        Math.hypot((b.cx + 0.5) * TILE - focus.x, (b.cz + 0.5) * TILE - focus.z),
    );
    const propR = Math.max(260, detailRadius * 0.9);
    for (const t of propTiles.values()) {
      const dx = Math.max(0, Math.abs((t.cx + 0.5) * PROP_TILE - focus.x) - PROP_TILE / 2);
      const dz = Math.max(0, Math.abs((t.cz + 0.5) * PROP_TILE - focus.z) - PROP_TILE / 2);
      t.group.visible = Math.hypot(dx, dz) < propR;
    }
  };

  return {
    group,
    facades,
    lampHeadMaterial,
    lampPositions,
    water,
    groundMaterials: [avenueMat, streetMat, pavingMat],
    partMaterials,
    landmarks,
    update,
    setDetailRadius(r: number) {
      detailRadius = r;
      lastStream = -1;
    },
    streamStats() {
      let near = 0;
      for (const c of chunks.values()) if (c.near) near++;
      let props = 0;
      for (const t of propTiles.values()) if (t.group.visible) props++;
      return { near, pending: pending.length, propTiles: props };
    },
    dispose() {
      for (const c of chunks.values()) freeNear(c);
      landmarks.dispose();
      partMaterials.dispose();
      for (const d of disposables) d.dispose();
    },
  };
}
