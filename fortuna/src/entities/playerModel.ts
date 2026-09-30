/**
 * Personaje del jugador construido con primitivas (sustituible por un modelo glTF con
 * esqueleto, ver ASSETS.md). Animación procedural de reposo, caminar y correr.
 */
import * as THREE from 'three/webgpu';

export interface PlayerLook {
  skin: string;
  shirt: string;
  pants: string;
  hair: string;
  shoes: string;
}

export const DEFAULT_LOOK: PlayerLook = {
  skin: '#c99a7a',
  shirt: '#2f5d7c',
  pants: '#2c2f38',
  hair: '#2b1d15',
  shoes: '#1c1c1c',
};

export class PlayerModel {
  readonly root = new THREE.Group();
  private hips = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private foreL = new THREE.Group();
  private foreR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private shinL = new THREE.Group();
  private shinR = new THREE.Group();
  private phase = 0;
  private t = 0;

  constructor(look: PlayerLook = DEFAULT_LOOK) {
    const mat = (c: string, rough = 0.8) =>
      new THREE.MeshStandardMaterial({ color: c, roughness: rough });
    const skin = mat(look.skin, 0.6);
    const shirt = mat(look.shirt);
    const pants = mat(look.pants);
    const hair = mat(look.hair, 0.9);
    const shoes = mat(look.shoes, 0.5);
    const part = (
      geo: THREE.BufferGeometry,
      m: THREE.Material,
      parent: THREE.Object3D,
      y = 0,
      x = 0,
      z = 0,
    ) => {
      const mesh = new THREE.Mesh(geo, m);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      parent.add(mesh);
      return mesh;
    };
    this.root.add(this.hips);
    this.hips.position.y = 0.94;
    part(new THREE.BoxGeometry(0.34, 0.16, 0.2), pants, this.hips, 0);
    this.hips.add(this.torso);
    this.torso.position.y = 0.08;
    part(new THREE.CapsuleGeometry(0.19, 0.34, 6, 12), shirt, this.torso, 0.3).scale.set(
      1,
      1,
      0.66,
    );
    this.torso.add(this.head);
    this.head.position.y = 0.66;
    part(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), skin, this.head, -0.06);
    part(new THREE.SphereGeometry(0.12, 16, 12), skin, this.head, 0.08).scale.set(0.9, 1.05, 1);
    part(
      new THREE.SphereGeometry(0.125, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      hair,
      this.head,
      0.1,
      0,
      -0.01,
    ).scale.set(0.95, 1, 1.05);
    for (const [arm, fore, side] of [
      [this.armL, this.foreL, -1],
      [this.armR, this.foreR, 1],
    ] as const) {
      this.torso.add(arm);
      arm.position.set(0.25 * side, 0.52, 0);
      part(new THREE.CapsuleGeometry(0.055, 0.22, 4, 8), shirt, arm, -0.15);
      arm.add(fore);
      fore.position.y = -0.3;
      part(new THREE.CapsuleGeometry(0.048, 0.2, 4, 8), skin, fore, -0.13);
    }
    for (const [leg, shin, side] of [
      [this.legL, this.shinL, -1],
      [this.legR, this.shinR, 1],
    ] as const) {
      this.hips.add(leg);
      leg.position.set(0.1 * side, -0.05, 0);
      part(new THREE.CapsuleGeometry(0.075, 0.3, 4, 8), pants, leg, -0.22);
      leg.add(shin);
      shin.position.y = -0.44;
      part(new THREE.CapsuleGeometry(0.06, 0.3, 4, 8), pants, shin, -0.2);
      part(new THREE.BoxGeometry(0.11, 0.07, 0.26), shoes, shin, -0.43, 0, 0.05);
    }
  }

  /** speed en m/s. grounded = pisando el suelo. */
  animate(dt: number, speed: number, grounded: boolean): void {
    this.t += dt;
    const run = THREE.MathUtils.clamp((speed - 2) / 4, 0, 1);
    const moving = THREE.MathUtils.clamp(speed / 1.5, 0, 1);
    this.phase += dt * (4.2 + speed * 1.7) * (moving > 0.05 ? 1 : 0);
    const s = Math.sin(this.phase);
    const amp = 0.45 * moving + 0.35 * run;
    this.legL.rotation.x = s * amp;
    this.legR.rotation.x = -s * amp;
    this.shinL.rotation.x = Math.max(0, -Math.sin(this.phase + 0.9)) * (0.6 * moving + 0.6 * run);
    this.shinR.rotation.x = Math.max(0, Math.sin(this.phase + 0.9)) * (0.6 * moving + 0.6 * run);
    this.armL.rotation.x = -s * amp * 0.8;
    this.armR.rotation.x = s * amp * 0.8;
    this.foreL.rotation.x = -0.2 - 0.6 * run;
    this.foreR.rotation.x = -0.2 - 0.6 * run;
    this.armL.rotation.z = -0.08;
    this.armR.rotation.z = 0.08;
    // Balanceo vertical al pisar y respiración en reposo.
    this.hips.position.y =
      0.94 +
      Math.abs(Math.cos(this.phase)) * 0.04 * moving +
      Math.sin(this.t * 2) * 0.006 * (1 - moving);
    this.torso.rotation.x = 0.06 * moving + 0.14 * run;
    if (!grounded) {
      this.legL.rotation.x = 0.5;
      this.legR.rotation.x = -0.2;
      this.shinL.rotation.x = 0.7;
      this.armL.rotation.x = this.armR.rotation.x = -0.6;
    }
  }
}
