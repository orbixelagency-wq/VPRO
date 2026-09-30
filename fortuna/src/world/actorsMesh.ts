/**
 * Dibujo de vehículos y peatones con instancias (pocas llamadas de dibujo para cientos de
 * actores). Los peatones se animan moviendo piernas y brazos por matriz cada fotograma.
 */
import * as THREE from 'three/webgpu';
import { float, uniform, vertexColor } from 'three/tsl';
import { mergeGeos } from './geo';
import type { Pedestrian } from './pedestrians';
import type { Car, VehicleKind } from './traffic';

const KINDS: VehicleKind[] = ['turismo', 'taxi', 'furgoneta', 'autobus'];

/** Geometría de carrocería en espacio local unitario: largo en z (+z = morro), base en y = 0. */
function bodyGeo(kind: VehicleKind): THREE.BufferGeometry {
  if (kind === 'autobus')
    return mergeGeos([new THREE.BoxGeometry(1, 0.86, 1).translate(0, 0.53, 0)]);
  if (kind === 'furgoneta')
    return mergeGeos([
      new THREE.BoxGeometry(1, 0.62, 1).translate(0, 0.43, 0),
      new THREE.BoxGeometry(0.98, 0.3, 0.72).translate(0, 0.86, -0.12),
    ]);
  return mergeGeos([
    new THREE.BoxGeometry(1, 0.42, 1).translate(0, 0.39, 0),
    new THREE.BoxGeometry(0.97, 0.12, 0.3).translate(0, 0.62, 0.34),
    new THREE.BoxGeometry(0.97, 0.12, 0.26).translate(0, 0.62, -0.36),
  ]);
}

/** Cristales (oscuros) en el mismo espacio local. */
function glassGeo(kind: VehicleKind): THREE.BufferGeometry {
  if (kind === 'autobus')
    return mergeGeos([
      new THREE.BoxGeometry(1.01, 0.3, 0.9).translate(0, 0.72, -0.02),
      new THREE.BoxGeometry(0.9, 0.42, 0.02).translate(0, 0.66, 0.5),
    ]);
  if (kind === 'furgoneta')
    return mergeGeos([new THREE.BoxGeometry(0.99, 0.26, 0.2).translate(0, 0.82, 0.3)]);
  return mergeGeos([new THREE.BoxGeometry(0.86, 0.34, 0.46).translate(0, 0.78, -0.02)]);
}

function wheelsGeo(): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  for (const x of [-0.46, 0.46])
    for (const z of [-0.32, 0.32])
      parts.push(
        new THREE.CylinderGeometry(0.34, 0.34, 0.12, 12).rotateZ(Math.PI / 2).translate(x, 0.34, z),
      );
  return mergeGeos(parts);
}

interface KindMeshes {
  body: THREE.InstancedMesh;
  glass: THREE.InstancedMesh;
  wheels: THREE.InstancedMesh;
  front: THREE.InstancedMesh;
  rear: THREE.InstancedMesh;
  sign: THREE.InstancedMesh | null;
}

export class ActorsMesh {
  readonly group = new THREE.Group();
  /** 0 de día, 1 de noche (faros encendidos). */
  readonly night = uniform(0);
  private kinds = new Map<VehicleKind, KindMeshes>();
  private owned: { dispose(): void }[] = [];
  private ped: {
    torso: THREE.InstancedMesh;
    head: THREE.InstancedMesh;
    hair: THREE.InstancedMesh;
    legs: THREE.InstancedMesh;
    arms: THREE.InstancedMesh;
    umbrella: THREE.InstancedMesh;
  };
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private v = new THREE.Vector3();
  private s = new THREE.Vector3();
  private c = new THREE.Color();

  constructor(
    private maxCars: number,
    private maxPeds: number,
  ) {
    this.group.name = 'actores';
    const track = <T extends { dispose(): void }>(x: T): T => {
      this.owned.push(x);
      return x;
    };
    const paint = track(
      new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.5 }),
    );
    const glass = track(
      new THREE.MeshStandardMaterial({ color: '#1c2630', roughness: 0.12, metalness: 0.6 }),
    );
    const rubber = track(new THREE.MeshStandardMaterial({ color: '#15171a', roughness: 0.9 }));
    // Faros: blancos cálidos; pilotos: rojos. Se encienden de noche (y los pilotos al frenar).
    const headMat = track(new THREE.MeshStandardNodeMaterial({ color: '#f4f1e6', roughness: 0.2 }));
    headMat.emissiveNode = vertexColor().mul(this.night.mul(3).add(0.05));
    const tailMat = track(
      new THREE.MeshStandardNodeMaterial({ vertexColors: true, roughness: 0.3 }),
    );
    tailMat.emissiveNode = vertexColor().mul(this.night.mul(1.6).add(float(0.25)));
    const signMat = track(
      new THREE.MeshStandardMaterial({
        color: '#2e8b57',
        emissive: '#2e8b57',
        emissiveIntensity: 0.8,
      }),
    );
    const lamp = (z: number, color: string) => {
      const g = mergeGeos([
        new THREE.BoxGeometry(0.2, 0.08, 0.02).translate(-0.34, 0.46, z),
        new THREE.BoxGeometry(0.2, 0.08, 0.02).translate(0.34, 0.46, z),
      ]);
      const col = new THREE.Color(color);
      const n = g.getAttribute('position').count;
      const arr = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) col.toArray(arr, i * 3);
      g.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3));
      return track(g);
    };
    const frontGeo = lamp(0.505, '#fff4dc');
    const rearGeo = lamp(-0.505, '#ff2a1a');
    const wheels = track(wheelsGeo());
    for (const k of KINDS) {
      const inst = (geo: THREE.BufferGeometry, mat: THREE.Material) => {
        const im = new THREE.InstancedMesh(geo, mat, maxCars);
        im.count = 0;
        im.frustumCulled = false;
        this.group.add(im);
        return im;
      };
      const body = inst(track(bodyGeo(k)), paint);
      body.castShadow = true;
      const km: KindMeshes = {
        body,
        glass: inst(track(glassGeo(k)), glass),
        wheels: inst(wheels, rubber),
        front: inst(frontGeo, headMat),
        rear: inst(rearGeo, tailMat),
        sign:
          k === 'taxi'
            ? inst(track(new THREE.BoxGeometry(0.3, 0.1, 0.12).translate(0, 0.73, 0.1)), signMat)
            : null,
      };
      // Color por instancia.
      km.body.setColorAt(0, new THREE.Color('#ffffff'));
      this.kinds.set(k, km);
    }

    // Peatones: piezas unitarias; la escala y la postura van en la matriz.
    const inst = (geo: THREE.BufferGeometry, mat: THREE.Material, count: number) => {
      const im = new THREE.InstancedMesh(track(geo), mat, count);
      im.count = 0;
      im.frustumCulled = false;
      im.castShadow = true;
      this.group.add(im);
      return im;
    };
    const cloth = track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.9 }));
    const skin = track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.7 }));
    this.ped = {
      torso: inst(new THREE.BoxGeometry(0.42, 0.6, 0.24).translate(0, 0.3, 0), cloth, maxPeds),
      head: inst(new THREE.SphereGeometry(0.12, 10, 8), skin, maxPeds),
      hair: inst(
        new THREE.SphereGeometry(0.125, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2),
        cloth,
        maxPeds,
      ),
      // Pierna y brazo con el pivote arriba (cadera, hombro).
      legs: inst(
        new THREE.BoxGeometry(0.15, 0.84, 0.17).translate(0, -0.42, 0),
        cloth,
        maxPeds * 2,
      ),
      arms: inst(new THREE.BoxGeometry(0.11, 0.6, 0.12).translate(0, -0.3, 0), cloth, maxPeds * 2),
      umbrella: inst(
        mergeGeos([
          new THREE.ConeGeometry(0.62, 0.28, 10, 1, true).translate(0, 2.1, 0),
          new THREE.CylinderGeometry(0.015, 0.015, 0.9, 4).translate(0, 1.7, 0),
        ]),
        track(
          new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.6,
            side: THREE.DoubleSide,
          }),
        ),
        maxPeds,
      ),
    };
    // El atributo de color por instancia debe existir antes del primer dibujo (evita recompilar).
    const white = new THREE.Color('#ffffff');
    for (const im of Object.values(this.ped)) {
      im.setColorAt(0, white);
      if (im === this.ped.legs || im === this.ped.arms) im.setColorAt(1, white);
    }
  }

  updateCars(cars: Car[]): void {
    const counts = new Map<VehicleKind, number>();
    for (const k of KINDS) counts.set(k, 0);
    const up = new THREE.Vector3(0, 1, 0);
    for (const car of cars) {
      const km = this.kinds.get(car.kind)!;
      const i = counts.get(car.kind)!;
      if (i >= this.maxCars) continue;
      counts.set(car.kind, i + 1);
      this.q.setFromAxisAngle(up, Math.atan2(car.hx, car.hz));
      this.v.set(car.x, 0.02, car.z);
      this.s.set(car.width, car.height, car.len);
      this.m.compose(this.v, this.q, this.s);
      km.body.setMatrixAt(i, this.m);
      km.glass.setMatrixAt(i, this.m);
      km.front.setMatrixAt(i, this.m);
      km.rear.setMatrixAt(i, this.m);
      km.sign?.setMatrixAt(i, this.m);
      // Ruedas: escala propia (no se deforman con la altura del vehículo).
      this.s.set(car.width, 1, car.len);
      this.m.compose(this.v, this.q, this.s);
      km.wheels.setMatrixAt(i, this.m);
      km.body.setColorAt(i, this.c.set(car.color));
    }
    for (const [k, km] of this.kinds) {
      const n = counts.get(k)!;
      for (const im of [km.body, km.glass, km.wheels, km.front, km.rear, km.sign]) {
        if (!im) continue;
        im.count = n;
        im.instanceMatrix.needsUpdate = true;
      }
      if (km.body.instanceColor) km.body.instanceColor.needsUpdate = true;
    }
  }

  updatePeds(peds: Pedestrian[], showUmbrellas: boolean): void {
    const P = this.ped;
    const up = new THREE.Vector3(0, 1, 0);
    const n = Math.min(peds.length, this.maxPeds);
    let u = 0;
    const base = new THREE.Matrix4();
    const local = new THREE.Matrix4();
    const out = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      const p = peds[i]!;
      const hgt = p.height;
      this.q.setFromAxisAngle(up, Math.atan2(p.hx, p.hz));
      // Pequeño balanceo vertical al andar.
      const swing = p.moving ? Math.sin(p.phase) : 0;
      const bob = p.moving ? Math.abs(Math.cos(p.phase)) * 0.03 : 0;
      this.v.set(p.x, 0.15 + bob, p.z);
      this.s.set(hgt, hgt, hgt);
      base.compose(this.v, this.q, this.s);
      // Torso, cabeza y pelo.
      local.makeTranslation(0, 0.86, 0);
      P.torso.setMatrixAt(i, out.multiplyMatrices(base, local));
      P.torso.setColorAt(i, this.c.set(p.shirt));
      local.makeTranslation(0, 1.6, 0);
      P.head.setMatrixAt(i, out.multiplyMatrices(base, local));
      P.head.setColorAt(i, this.c.set(p.skin));
      local.makeTranslation(0, 1.62, -0.01);
      P.hair.setMatrixAt(i, out.multiplyMatrices(base, local));
      P.hair.setColorAt(i, this.c.set(p.hair));
      // Piernas y brazos: giran sobre la cadera y el hombro.
      for (const side of [-1, 1]) {
        const k = i * 2 + (side > 0 ? 1 : 0);
        local.makeRotationX(swing * 0.5 * side).setPosition(side * 0.11, 0.86, 0);
        P.legs.setMatrixAt(k, out.multiplyMatrices(base, local));
        P.legs.setColorAt(k, this.c.set(p.pants));
        const armSwing = p.umbrella && showUmbrellas && side > 0 ? -1.2 : -swing * 0.45 * side;
        local.makeRotationX(armSwing).setPosition(side * 0.27, 1.42, 0);
        P.arms.setMatrixAt(k, out.multiplyMatrices(base, local));
        P.arms.setColorAt(k, this.c.set(p.shirt));
      }
      if (p.umbrella && showUmbrellas) {
        local.makeTranslation(0.22, 0, 0.1);
        P.umbrella.setMatrixAt(u, out.multiplyMatrices(base, local));
        P.umbrella.setColorAt(u, this.c.set(p.shirt));
        u++;
      }
    }
    for (const [im, count] of [
      [P.torso, n],
      [P.head, n],
      [P.hair, n],
      [P.legs, n * 2],
      [P.arms, n * 2],
      [P.umbrella, u],
    ] as const) {
      im.count = count;
      im.instanceMatrix.needsUpdate = true;
      if (im.instanceColor) im.instanceColor.needsUpdate = true;
    }
  }

  dispose(): void {
    for (const o of this.owned) o.dispose();
  }
}
