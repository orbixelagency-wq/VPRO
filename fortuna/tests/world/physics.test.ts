import { beforeAll, describe, expect, it } from 'vitest';
import { buildPhysics, initPhysics, type PhysicsWorld } from '../../src/engine/physics';
import { PlayerController } from '../../src/gameplay/playerController';
import { generateCity, type CityLayout } from '../../src/world/cityGen';

const idle = {
  moveX: 0,
  moveZ: 0,
  run: false,
  jump: false,
  lookX: 0,
  lookY: 0,
  zoom: 0,
  interact: false,
};

describe('Física del jugador', () => {
  let city: CityLayout;
  let phys: PhysicsWorld;
  beforeAll(async () => {
    await initPhysics();
    city = generateCity(42);
    phys = buildPhysics(city);
  });

  const run = (pc: PlayerController, frames: number, input = idle, yaw = 0) => {
    for (let i = 0; i < frames; i++) {
      pc.update(1 / 60, input, yaw);
      phys.world.step();
    }
  };

  /** Punto en mitad de una avenida larga (espacio libre para caminar). */
  const openRoad = () => {
    const r = city.roads.find((x) => x.axis === 'x' && x.avenue)!;
    return { x: (r.rect.x0 + r.rect.x1) / 2 + 3, z: (r.rect.z0 + r.rect.z1) / 2 };
  };

  it('aterriza en la acera y no se hunde al caminar ni al bajar el bordillo', () => {
    const pc = new PlayerController(phys, { x: city.spawn.x, y: 1, z: city.spawn.z });
    run(pc, 60);
    expect(pc.grounded).toBe(true);
    expect(pc.position.y).toBeGreaterThan(0.1);
    // Desde el portal hacia la calle: baja de la acera a la calzada.
    const home = city.landmarks.find((l) => l.id === 'casa')!;
    const yaw = Math.atan2(-home.door.nx, -home.door.nz);
    run(pc, 180, { ...idle, moveZ: 1 }, yaw);
    expect(pc.position.y).toBeGreaterThan(-0.02);
    expect(pc.position.y).toBeLessThan(0.1);
  });

  it('camina a la velocidad esperada y corre más', () => {
    const o = openRoad();
    const pc = new PlayerController(phys, { x: o.x, y: 0.1, z: o.z });
    run(pc, 30);
    const a = pc.position.clone();
    // Hacia el este (a lo largo de la avenida).
    run(pc, 60, { ...idle, moveZ: 1 }, -Math.PI / 2);
    const walk = pc.position.distanceTo(a);
    const b = pc.position.clone();
    run(pc, 60, { ...idle, moveZ: 1, run: true }, -Math.PI / 2);
    const sprint = pc.position.distanceTo(b);
    expect(walk).toBeGreaterThan(1);
    expect(sprint).toBeGreaterThan(walk * 2);
  });

  it('no atraviesa los edificios', () => {
    const b = city.buildings.find((x) => x.w > 12 && x.d > 12 && x.kind === 'bloque')!;
    const pc = new PlayerController(phys, { x: b.x - b.w / 2 - 3, y: 0.3, z: b.z });
    run(pc, 30);
    // Corre hacia el este (contra la fachada oeste) durante 3 segundos.
    run(pc, 180, { ...idle, moveZ: 1, run: true }, -Math.PI / 2);
    expect(pc.position.x).toBeLessThan(b.x - b.w / 2);
  });

  it('salta y vuelve a caer', () => {
    const o = openRoad();
    const pc = new PlayerController(phys, { x: o.x, y: 0.1, z: o.z });
    run(pc, 30);
    const y0 = pc.position.y;
    run(pc, 1, { ...idle, jump: true });
    run(pc, 12);
    expect(pc.position.y).toBeGreaterThan(y0 + 0.3);
    run(pc, 90);
    expect(Math.abs(pc.position.y - y0)).toBeLessThan(0.05);
  });

  it('pasa bajo las copas de los árboles y la cámara choca con ellas', () => {
    const tree = city.props.find((p) => p.kind === 'arbol')!;
    const pc = new PlayerController(phys, { x: tree.x + 1.2, y: 0.3, z: tree.z });
    run(pc, 30);
    run(pc, 1, { ...idle, jump: true });
    run(pc, 40);
    // El salto no se corta contra el sensor de la copa: vuelve al suelo sin quedarse enganchado.
    expect(pc.grounded).toBe(true);
    const { rapier, world } = phys;
    const ray = new rapier.Ray({ x: tree.x + 6, y: 4.6, z: tree.z }, { x: -1, y: 0, z: 0 });
    expect(world.castRay(ray, 10, true)).not.toBeNull();
  });
});
