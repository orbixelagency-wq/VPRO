/**
 * Cielo, sol, luna, niebla y ciclo día/noche ligados al reloj de la simulación.
 * El cielo usa dispersión atmosférica física (SkyMesh) con nubes.
 */
import * as THREE from 'three/webgpu';
import { SkyMesh } from 'three/addons/objects/SkyMesh.js';
import { Rng } from '../economy/rng';
import { sunState } from './sun';

export interface Sun {
  /** Dirección hacia el sol (normalizada). */
  dir: THREE.Vector3;
  elevation: number;
  /** 0 = noche cerrada, 1 = pleno día. */
  daylight: number;
}

export function sunAt(hour: number, dayOfYear: number): Sun {
  const s = sunState(hour, dayOfYear);
  return { dir: new THREE.Vector3(s.x, s.y, s.z), elevation: s.elevation, daylight: s.daylight };
}

export class Environment {
  readonly sky: SkyMesh;
  readonly sun: THREE.DirectionalLight;
  readonly moon: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly fog: THREE.Fog;
  private stars: THREE.Points;
  private lampLights: THREE.PointLight[] = [];
  private lampTargets: THREE.Vector3[] = [];
  state: Sun = sunAt(12, 180);

  constructor(scene: THREE.Scene, far: number, lampLights: number) {
    this.sky = new SkyMesh();
    this.sky.scale.setScalar(9000);
    this.sky.turbidity.value = 4;
    this.sky.rayleigh.value = 1.6;
    this.sky.mieCoefficient.value = 0.004;
    this.sky.mieDirectionalG.value = 0.82;
    this.sky.cloudCoverage.value = 0.35;
    this.sky.cloudDensity.value = 0.45;
    // El cielo no recibe niebla: si no, se tiñe entero del color de la bruma y pierde el azul.
    (this.sky.material as THREE.Material & { fog?: boolean }).fog = false;
    scene.add(this.sky);

    this.sun = new THREE.DirectionalLight('#fff4e0', 3);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);

    this.moon = new THREE.DirectionalLight('#9fb4ff', 0.25);
    scene.add(this.moon, this.moon.target);

    this.hemi = new THREE.HemisphereLight('#bcd4ff', '#6b5a48', 0.8);
    scene.add(this.hemi);

    this.fog = new THREE.Fog('#c9d6e3', far * 0.35, far);
    scene.fog = this.fog;

    // Estrellas: solo visibles de noche.
    const starGeo = new THREE.BufferGeometry();
    const pts: number[] = [];
    const rng = Rng.fromSeed(7, 'stars');
    for (let i = 0; i < 1500; i++) {
      const u = rng.range(-1, 1);
      const t = rng.range(0, Math.PI * 2);
      const r = Math.sqrt(1 - u * u);
      if (u < 0.05) continue;
      pts.push(r * Math.cos(t) * 9000, u * 9000, r * Math.sin(t) * 9000);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    this.stars = new THREE.Points(
      starGeo,
      new THREE.PointsMaterial({
        color: '#ffffff',
        size: 2,
        sizeAttenuation: false,
        transparent: true,
        opacity: 0,
        fog: false,
      }),
    );
    scene.add(this.stars);

    for (let i = 0; i < lampLights; i++) {
      const l = new THREE.PointLight('#ffcf8a', 0, 26, 1.6);
      scene.add(l);
      this.lampLights.push(l);
    }
  }

  setShadowQuality(mapSize: number, range: number): void {
    this.sun.shadow.mapSize.set(mapSize, mapSize);
    const cam = this.sun.shadow.camera;
    cam.left = -range;
    cam.right = range;
    cam.top = range;
    cam.bottom = -range;
    cam.near = 1;
    cam.far = 900;
    cam.updateProjectionMatrix();
    this.sun.shadow.map?.dispose();
    this.sun.shadow.map = null as unknown as THREE.RenderTarget;
  }

  setFar(far: number): void {
    this.fog.near = far * 0.35;
    this.fog.far = far;
  }

  /** Actualiza el cielo y la luz. `focus` es la posición del jugador (sombras centradas en él). */
  update(
    hour: number,
    dayOfYear: number,
    focus: THREE.Vector3,
    renderer: THREE.WebGPURenderer,
    facades: THREE.MeshStandardMaterial[],
    lampHeads: THREE.InstancedMesh,
    lampPositions: THREE.Vector3[],
    clouds: number,
  ): void {
    const s = sunAt(hour, dayOfYear);
    this.state = s;
    const d = s.daylight;
    this.sky.sunPosition.value.copy(s.dir).multiplyScalar(1000);
    this.sky.cloudCoverage.value = clouds;
    // Sol: se tiñe de naranja cerca del horizonte.
    const low = THREE.MathUtils.clamp(s.elevation / 0.35, 0, 1);
    this.sun.color.setRGB(1, 0.72 + 0.26 * low, 0.5 + 0.42 * low);
    this.sun.intensity = 5.5 * d * (1 - clouds * 0.4);
    const shadowDir = s.elevation > 0.02 ? s.dir : new THREE.Vector3(0.3, 1, 0.2).normalize();
    this.sun.position.copy(focus).addScaledVector(shadowDir, 400);
    this.sun.target.position.copy(focus);
    // castShadow se deja fijo: cambiarlo recompila todos los shaders (fotogramas negros al atardecer).
    // De noche el sol tiene intensidad 0, así que su sombra no se ve.
    // Luna: opuesta al sol, fría y débil.
    this.moon.position
      .copy(focus)
      .addScaledVector(new THREE.Vector3(-s.dir.x, Math.max(0.35, -s.dir.y), -s.dir.z), 400);
    this.moon.target.position.copy(focus);
    this.moon.intensity = 0.5 * (1 - d);
    this.hemi.intensity = 0.55 + 1.35 * d;
    this.hemi.color.setHSL(0.6, 0.45, 0.35 + 0.45 * d);
    this.hemi.groundColor.setHSL(0.08, 0.25, 0.08 + 0.22 * d);
    // Niebla del color del horizonte.
    const dusk = 1 - Math.abs(THREE.MathUtils.clamp(s.elevation, -0.2, 0.3) - 0.05) / 0.25;
    const fogDay = new THREE.Color('#c7d4e0');
    const fogDusk = new THREE.Color('#d9a784');
    const fogNight = new THREE.Color('#0d141f');
    const fc = fogNight.clone().lerp(fogDay, d);
    fc.lerp(fogDusk, THREE.MathUtils.clamp(dusk, 0, 1) * 0.45);
    this.fog.color.copy(fc);
    // El cielo físico es muy luminoso: exposición contenida de día, más alta de noche.
    renderer.toneMappingExposure = 0.5 + 0.1 * d + (1 - d) * 0.35;
    (this.stars.material as THREE.PointsMaterial).opacity =
      THREE.MathUtils.clamp(1 - d * 1.6, 0, 1) * (1 - clouds);
    this.stars.position.copy(focus);
    // Luces de la ciudad: ventanas y farolas.
    const night = 1 - d;
    const windows = THREE.MathUtils.smoothstep(night, 0.15, 0.85);
    for (const m of facades) m.emissiveIntensity = windows * 1.4;
    (lampHeads.material as THREE.MeshStandardMaterial).emissiveIntensity = windows * 6;
    // Luces reales en las farolas más cercanas al jugador (la búsqueda se hace cada pocos fotogramas).
    if (this.lampLights.length) {
      if (lampPositions.length)
        this.lampTargets = nearest(lampPositions, focus, this.lampLights.length);
      this.lampLights.forEach((l, i) => {
        const p = this.lampTargets[i];
        if (!p || windows < 0.05) {
          l.intensity = 0;
          return;
        }
        l.position.copy(p);
        l.intensity = 40 * windows;
      });
    }
  }
}

function nearest(points: THREE.Vector3[], p: THREE.Vector3, n: number): THREE.Vector3[] {
  const best: { d: number; v: THREE.Vector3 }[] = [];
  for (const v of points) {
    const dx = v.x - p.x;
    const dz = v.z - p.z;
    const d = dx * dx + dz * dz;
    if (d > 90 * 90) continue;
    if (best.length < n) best.push({ d, v });
    else {
      let worst = 0;
      for (let i = 1; i < best.length; i++) if (best[i]!.d > best[worst]!.d) worst = i;
      if (d < best[worst]!.d) best[worst] = { d, v };
    }
  }
  return best.map((b) => b.v);
}
