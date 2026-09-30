/**
 * Física con Rapier (WASM): colisiones estáticas de la ciudad y controlador de personaje.
 */
import RAPIER from '@dimforge/rapier3d-compat';
import type { CityLayout } from '../world/cityGen';

let ready: Promise<void> | null = null;

export function initPhysics(): Promise<void> {
  if (!ready) ready = RAPIER.init();
  return ready;
}

export interface PhysicsWorld {
  world: RAPIER.World;
  rapier: typeof RAPIER;
  dispose(): void;
}

const SIDEWALK_H = 0.15;

/** Crea el mundo físico con suelo, aceras, edificios, troncos, farolas y el muelle. */
export function buildPhysics(city: CityLayout): PhysicsWorld {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  const fixed = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
  const box = (cx: number, cy: number, cz: number, hx: number, hy: number, hz: number) =>
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(hx, hy, hz).setTranslation(cx, cy, cz).setFriction(0.8),
      fixed,
    );
  // Suelo en losas de 200 m: las formas enormes hacen perder precisión al controlador.
  const T = 100;
  for (let x = city.coastX + T; x < city.bounds.x1 + 400; x += 2 * T)
    for (let z = city.bounds.z0 - 400; z < city.bounds.z1 + 400; z += 2 * T)
      box(x, -0.5, z, T, 0.5, T);
  // Aceras (se suben con el paso automático del controlador).
  for (const b of city.blocks)
    box(
      (b.rect.x0 + b.rect.x1) / 2,
      SIDEWALK_H / 2,
      (b.rect.z0 + b.rect.z1) / 2,
      (b.rect.x1 - b.rect.x0) / 2,
      SIDEWALK_H / 2,
      (b.rect.z1 - b.rect.z0) / 2,
    );
  for (const b of city.buildings) {
    const h = b.h + (b.roof === 'dos-aguas' ? Math.min(b.w, b.d) * 0.32 : 0);
    box(b.x, SIDEWALK_H + h / 2, b.z, b.w / 2, h / 2, b.d / 2);
  }
  for (const p of city.props) {
    if (p.kind === 'farola')
      world.createCollider(
        RAPIER.ColliderDesc.cylinder(3, 0.12).setTranslation(p.x, 3, p.z),
        fixed,
      );
    else if (p.kind === 'arbol') {
      world.createCollider(
        RAPIER.ColliderDesc.cylinder(1.6, 0.25 * p.scale).setTranslation(p.x, 1.6, p.z),
        fixed,
      );
      // Copa: sensor que el jugador no nota pero que frena la cámara (no se mete dentro del follaje).
      world.createCollider(
        RAPIER.ColliderDesc.ball(2 * p.scale)
          .setTranslation(p.x, SIDEWALK_H + 4.4 * p.scale, p.z)
          .setSensor(true),
        fixed,
      );
    } else if (p.kind === 'fuente')
      world.createCollider(
        RAPIER.ColliderDesc.cylinder(0.4, 4.1).setTranslation(p.x, 0.4, p.z),
        fixed,
      );
    else if (p.kind === 'banco')
      world.createCollider(
        RAPIER.ColliderDesc.cylinder(0.3, 0.7).setTranslation(p.x, 0.45, p.z),
        fixed,
      );
  }
  // Muelle: una pared invisible impide caer al mar.
  for (let z = city.bounds.z0 - 400; z < city.bounds.z1 + 400; z += 200)
    box(city.coastX - 1, 2, z, 1, 4, 100);
  return { world, rapier: RAPIER, dispose: () => world.free() };
}
