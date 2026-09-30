/**
 * Cámara en tercera persona: órbita con ratón o mando, zoom con la rueda, suavizado y
 * colisión con los edificios para no atravesar paredes.
 */
import type RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three/webgpu';
import type { InputFrame } from './input';
import type { PhysicsWorld } from './physics';

export class ThirdPersonCamera {
  yaw = Math.PI * 0.75;
  pitch = 0.32;
  distance = 5.5;
  private current = new THREE.Vector3();
  private initialized = false;
  sensitivity = 0.0028;

  constructor(
    readonly camera: THREE.PerspectiveCamera,
    private phys: PhysicsWorld,
    private exclude: RAPIER.Collider,
  ) {}

  update(dt: number, input: InputFrame, target: THREE.Vector3, invertY = false): void {
    this.yaw -= input.lookX * this.sensitivity;
    this.pitch += input.lookY * this.sensitivity * (invertY ? -1 : 1);
    this.pitch = THREE.MathUtils.clamp(this.pitch, -0.45, 1.25);
    this.distance = THREE.MathUtils.clamp(this.distance + input.zoom * 0.6, 2.2, 16);
    const focus = target.clone().add(new THREE.Vector3(0, 1.55, 0));
    const dir = new THREE.Vector3(
      Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      Math.cos(this.yaw) * Math.cos(this.pitch),
    );
    // Colisión: acorta la distancia si hay un edificio entre el jugador y la cámara.
    let dist = this.distance;
    const R = this.phys.rapier;
    const ray = new R.Ray({ x: focus.x, y: focus.y, z: focus.z }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = this.phys.world.castRay(ray, dist + 0.3, true, undefined, undefined, this.exclude);
    if (hit) dist = Math.max(0.6, hit.timeOfImpact - 0.3);
    const desired = focus.clone().addScaledVector(dir, dist);
    if (desired.y < 0.4) desired.y = 0.4;
    if (!this.initialized) {
      this.current.copy(desired);
      this.initialized = true;
    } else this.current.lerp(desired, 1 - Math.exp(-14 * dt));
    this.camera.position.copy(this.current);
    this.camera.lookAt(focus);
  }
}
