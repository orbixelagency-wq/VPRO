/**
 * Efectos de clima alrededor de la cámara: lluvia (segmentos que caen con el viento), nieve
 * (copos que flotan), relámpagos y suelo mojado (el asfalto se oscurece y brilla).
 */
import * as THREE from 'three/webgpu';

const BOX = { x: 70, y: 36, z: 70 };

export class WeatherFx {
  readonly group = new THREE.Group();
  private rain: THREE.LineSegments;
  private rainPos: Float32Array;
  private snow: THREE.Points;
  private snowPos: Float32Array;
  private drops: number;
  private flakes: number;
  /** Intensidad del destello del relámpago (0–1), la lee el entorno. */
  flash = 0;
  private nextBolt = 4;
  /** Se llama al caer un rayo (para el trueno). */
  onBolt: ((distance: number) => void) | null = null;
  private baseRough = new Map<THREE.MeshStandardMaterial, { r: number; c: THREE.Color }>();

  constructor(quality: number) {
    this.group.name = 'clima';
    this.drops = Math.round(1200 + quality * 1600);
    this.flakes = Math.round(800 + quality * 900);
    this.rainPos = new Float32Array(this.drops * 6);
    for (let i = 0; i < this.drops; i++) {
      const x = (Math.random() - 0.5) * BOX.x;
      const y = Math.random() * BOX.y;
      const z = (Math.random() - 0.5) * BOX.z;
      this.rainPos.set([x, y, z, x, y - 0.6, z], i * 6);
    }
    const rg = new THREE.BufferGeometry();
    rg.setAttribute('position', new THREE.BufferAttribute(this.rainPos, 3));
    this.rain = new THREE.LineSegments(
      rg,
      new THREE.LineBasicMaterial({
        color: '#b9c6d3',
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
      }),
    );
    this.rain.frustumCulled = false;
    this.rain.visible = false;
    this.snowPos = new Float32Array(this.flakes * 3);
    for (let i = 0; i < this.flakes; i++)
      this.snowPos.set(
        [(Math.random() - 0.5) * BOX.x, Math.random() * BOX.y, (Math.random() - 0.5) * BOX.z],
        i * 3,
      );
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.BufferAttribute(this.snowPos, 3));
    this.snow = new THREE.Points(
      sg,
      new THREE.PointsMaterial({
        color: '#ffffff',
        size: 0.09,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      }),
    );
    this.snow.frustumCulled = false;
    this.snow.visible = false;
    this.group.add(this.rain, this.snow);
  }

  update(
    dt: number,
    center: THREE.Vector3,
    w: { rain: number; snow: number; wind: number; thunder: boolean; wet: number },
    indoor: boolean,
    ground: THREE.MeshStandardMaterial[],
  ): void {
    const cx = center.x;
    const cz = center.z;
    const cy = center.y;
    // Lluvia: solo se actualiza la fracción visible de gotas.
    const nRain = indoor ? 0 : Math.round(this.drops * Math.min(1, w.rain * 1.3));
    this.rain.visible = nRain > 0;
    if (nRain > 0) {
      const fall = (11 + w.rain * 4) * dt;
      const drift = w.wind * 5 * dt;
      const len = 0.35 + w.rain * 0.45;
      const p = this.rainPos;
      for (let i = 0; i < nRain; i++) {
        const o = i * 6;
        let x = p[o]! + drift;
        let y = p[o + 1]! - fall;
        let z = p[o + 2]!;
        // Recicla las gotas que salen de la caja alrededor de la cámara.
        if (y < cy - 8) y += BOX.y;
        if (x - cx > BOX.x / 2) x -= BOX.x;
        else if (cx - x > BOX.x / 2) x += BOX.x;
        if (z - cz > BOX.z / 2) z -= BOX.z;
        else if (cz - z > BOX.z / 2) z += BOX.z;
        if (y > cy + BOX.y) y -= BOX.y;
        p[o] = x;
        p[o + 1] = y;
        p[o + 2] = z;
        p[o + 3] = x - drift * 0.5;
        p[o + 4] = y + len;
        p[o + 5] = z;
      }
      this.rain.geometry.setDrawRange(0, nRain * 2);
      this.rain.geometry.getAttribute('position').needsUpdate = true;
      (this.rain.material as THREE.LineBasicMaterial).opacity = 0.18 + w.rain * 0.3;
    }
    const nSnow = indoor ? 0 : Math.round(this.flakes * Math.min(1, w.snow * 1.4));
    this.snow.visible = nSnow > 0;
    if (nSnow > 0) {
      const p = this.snowPos;
      const t = performance.now() / 1000;
      for (let i = 0; i < nSnow; i++) {
        const o = i * 3;
        let x = p[o]! + (Math.sin(t + i) * 0.4 + w.wind * 1.5) * dt;
        let y = p[o + 1]! - 1.1 * dt;
        let z = p[o + 2]! + Math.cos(t * 0.7 + i) * 0.3 * dt;
        if (y < cy - 6) y += BOX.y;
        if (y > cy + BOX.y) y -= BOX.y;
        if (x - cx > BOX.x / 2) x -= BOX.x;
        else if (cx - x > BOX.x / 2) x += BOX.x;
        if (z - cz > BOX.z / 2) z -= BOX.z;
        else if (cz - z > BOX.z / 2) z += BOX.z;
        p[o] = x;
        p[o + 1] = y;
        p[o + 2] = z;
      }
      this.snow.geometry.setDrawRange(0, nSnow);
      this.snow.geometry.getAttribute('position').needsUpdate = true;
    }
    // Relámpagos durante las tormentas.
    this.flash = Math.max(0, this.flash - dt * 5);
    if (w.thunder && !indoor) {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.flash = 1;
        this.nextBolt = 5 + Math.random() * 14;
        this.onBolt?.(300 + Math.random() * 2500);
      }
    }
    // Suelo mojado: más oscuro y más liso (refleja las luces).
    for (const m of ground) {
      let b = this.baseRough.get(m);
      if (!b) {
        b = { r: m.roughness, c: m.color.clone() };
        this.baseRough.set(m, b);
      }
      m.roughness = b.r - (b.r - 0.28) * w.wet;
      m.color.copy(b.c).multiplyScalar(1 - 0.38 * w.wet);
    }
  }

  dispose(): void {
    this.rain.geometry.dispose();
    (this.rain.material as THREE.Material).dispose();
    this.snow.geometry.dispose();
    (this.snow.material as THREE.Material).dispose();
  }
}
