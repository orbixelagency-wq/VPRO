/**
 * Movimiento del jugador con el controlador de personaje de Rapier: sube bordillos,
 * se pega al suelo, choca con edificios y farolas, salta y cae con gravedad.
 */
import type RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three/webgpu';
import type { InputFrame } from '../engine/input';
import type { PhysicsWorld } from '../engine/physics';

export const WALK_SPEED = 1.9;
export const RUN_SPEED = 6.2;
const JUMP_SPEED = 4.6;
const GRAVITY = 18;
const HALF_HEIGHT = 0.55;
const RADIUS = 0.32;

export class PlayerController {
  readonly position = new THREE.Vector3();
  readonly velocity = new THREE.Vector3();
  facing = 0;
  grounded = false;
  readonly collider: RAPIER.Collider;
  private body: RAPIER.RigidBody;
  private controller: RAPIER.KinematicCharacterController;
  private sensorsOff: number;

  constructor(phys: PhysicsWorld, spawn: { x: number; y: number; z: number }) {
    const R = phys.rapier;
    this.body = phys.world.createRigidBody(
      R.RigidBodyDesc.kinematicPositionBased().setTranslation(
        spawn.x,
        spawn.y + HALF_HEIGHT + RADIUS,
        spawn.z,
      ),
    );
    this.collider = phys.world.createCollider(
      R.ColliderDesc.capsule(HALF_HEIGHT, RADIUS),
      this.body,
    );
    this.controller = phys.world.createCharacterController(0.02);
    this.controller.enableAutostep(0.35, 0.15, true);
    this.controller.enableSnapToGround(0.35);
    this.controller.setMaxSlopeClimbAngle((50 * Math.PI) / 180);
    this.controller.setSlideEnabled(true);
    this.sensorsOff = R.QueryFilterFlags.EXCLUDE_SENSORS;
    this.position.set(spawn.x, spawn.y, spawn.z);
  }

  /** Aplica la entrada relativa a la orientación de la cámara (yaw). */
  update(dt: number, input: InputFrame, cameraYaw: number): void {
    const target = input.run ? RUN_SPEED : WALK_SPEED;
    const fwd = new THREE.Vector3(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
    const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
    const wish = new THREE.Vector3()
      .addScaledVector(fwd, input.moveZ)
      .addScaledVector(right, input.moveX);
    if (wish.lengthSq() > 1) wish.normalize();
    wish.multiplyScalar(target);
    // Aceleración suave (más rápida en el suelo que en el aire).
    const accel = this.grounded ? 12 : 3;
    const k = 1 - Math.exp(-accel * dt);
    this.velocity.x += (wish.x - this.velocity.x) * k;
    this.velocity.z += (wish.z - this.velocity.z) * k;
    if (this.grounded && input.jump) this.velocity.y = JUMP_SPEED;
    this.velocity.y -= GRAVITY * dt;

    const desired = { x: this.velocity.x * dt, y: this.velocity.y * dt, z: this.velocity.z * dt };
    this.controller.computeColliderMovement(this.collider, desired, this.sensorsOff);
    const m = this.controller.computedMovement();
    const t = this.body.translation();
    const next = { x: t.x + m.x, y: t.y + m.y, z: t.z + m.z };
    this.body.setNextKinematicTranslation(next);
    this.grounded = this.controller.computedGrounded();
    if (this.grounded && this.velocity.y < 0) this.velocity.y = 0;
    // Si choca contra una pared, la velocidad se ajusta a lo que realmente se movió.
    if (dt > 0) {
      this.velocity.x = m.x / dt;
      this.velocity.z = m.z / dt;
    }
    this.position.set(next.x, next.y - HALF_HEIGHT - RADIUS, next.z);
    const hs = Math.hypot(this.velocity.x, this.velocity.z);
    if (hs > 0.2) {
      const want = Math.atan2(this.velocity.x, this.velocity.z);
      let d = want - this.facing;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.facing += d * (1 - Math.exp(-12 * dt));
    }
  }

  get speed(): number {
    return Math.hypot(this.velocity.x, this.velocity.z);
  }

  teleport(x: number, y: number, z: number): void {
    this.body.setTranslation({ x, y: y + HALF_HEIGHT + RADIUS, z }, true);
    this.position.set(x, y, z);
    this.velocity.set(0, 0, 0);
  }
}
