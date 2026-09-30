import { describe, expect, it } from 'vitest';
import { forecastDay, weatherAt } from '../../src/economy/weather';
import { generateCity, insideBuilding } from '../../src/world/cityGen';
import { buildInteriors } from '../../src/world/interiors';
import { Crowd } from '../../src/world/pedestrians';
import { buildRoadGraph, onRoadway, signalAt } from '../../src/world/roads';
import { TrafficSim } from '../../src/world/traffic';

const city = generateCity(42);
const graph = buildRoadGraph(city);

describe('Clima', () => {
  it('es determinista y cambia con la semilla', () => {
    expect(weatherAt(42, 9000)).toEqual(weatherAt(42, 9000));
    const a = [...Array(200).keys()].map((h) => weatherAt(42, 9000 + h).kind).join();
    const b = [...Array(200).keys()].map((h) => weatherAt(43, 9000 + h).kind).join();
    expect(a).not.toBe(b);
  });

  it('tiene un clima mediterráneo: más lluvia en otoño que en verano, veranos calurosos', () => {
    let julyRain = 0;
    let novRain = 0;
    let julyMax = 0;
    let janMax = 0;
    for (let y = 1; y <= 4; y++) {
      for (let d = 0; d < 30; d++) {
        const jul = forecastDay(42, y * 365 + 182 + d);
        const nov = forecastDay(42, y * 365 + 305 + d);
        const jan = forecastDay(42, y * 365 + 5 + d);
        julyRain += jul.rainChance > 0.2 ? 1 : 0;
        novRain += nov.rainChance > 0.2 ? 1 : 0;
        julyMax += jul.max / 120;
        janMax += jan.max / 120;
      }
    }
    expect(novRain).toBeGreaterThan(julyRain * 2);
    expect(julyMax).toBeGreaterThan(28);
    expect(janMax).toBeLessThan(19);
  });

  it('el suelo sigue mojado un rato después de llover', () => {
    let found = false;
    for (let t = 9000; t < 9000 + 24 * 120 && !found; t++) {
      const now = weatherAt(42, t);
      const before = weatherAt(42, t - 1);
      if (before.rain > 0.05 && now.rain === 0) {
        expect(now.wet).toBeGreaterThan(0.05);
        found = true;
      }
    }
    expect(found).toBe(true);
  });
});

describe('Edificios singulares e interiores', () => {
  it('coloca la Bolsa, el Banco, el Ayuntamiento, la casa y la tienda', () => {
    const ids = city.landmarks.map((l) => l.id);
    for (const id of [
      'bolsa',
      'banco',
      'ayuntamiento',
      'universidad',
      'hospital',
      'casa',
      'tienda',
    ])
      expect(ids).toContain(id);
    const lonja = city.landmarks.filter((l) => l.district === 'lonja').map((l) => l.id);
    expect(lonja).toEqual(expect.arrayContaining(['bolsa', 'banco']));
  });

  it('las puertas dan a la calle y el jugador aparece delante de su portal', () => {
    for (const l of city.landmarks) {
      const out = { x: l.door.x + l.door.nx * 2, z: l.door.z + l.door.nz * 2 };
      expect(insideBuilding(city, out.x, out.z), l.id).toBeNull();
      expect(onRoadway(city, l.door.x + l.door.nx * 1, l.door.z + l.door.nz * 1), l.id).toBe(false);
    }
    const home = city.landmarks.find((l) => l.id === 'casa')!;
    expect(Math.hypot(city.spawn.x - home.door.x, city.spawn.z - home.door.z)).toBeLessThan(2);
  });

  it('ninguna pieza sólida de un edificio singular invade la calzada', () => {
    for (const l of city.landmarks)
      for (const p of l.parts.filter((x) => x.solid))
        for (const r of city.roads) {
          const hit =
            p.x + p.w / 2 > r.rect.x0 &&
            p.x - p.w / 2 < r.rect.x1 &&
            p.z + p.d / 2 > r.rect.z0 &&
            p.z - p.d / 2 < r.rect.z1;
          expect(hit, `${l.id}`).toBe(false);
        }
  });

  it('cada interior tiene salida, luces y puntos de uso dentro de sus paredes', () => {
    const interiors = buildInteriors(['casa', 'tienda', 'banco', 'bolsa']);
    expect(interiors).toHaveLength(4);
    for (const it of interiors) {
      expect(it.spots.some((s) => s.action === 'exit')).toBe(true);
      expect(it.lights.length).toBeGreaterThan(0);
      for (const s of it.spots) {
        expect(Math.abs(s.x - it.origin.x)).toBeLessThan(it.w / 2);
        expect(Math.abs(s.z - it.origin.z)).toBeLessThan(it.d / 2);
      }
    }
  });
});

describe('Red viaria y semáforos', () => {
  it('todos los tramos tienen carriles por la derecha sobre la calzada', () => {
    expect(graph.edges.length).toBeGreaterThan(400);
    for (const e of graph.edges) {
      for (const l of e.lanes) {
        const mid = { x: (l.start.x + l.end.x) / 2, z: (l.start.z + l.end.z) / 2 };
        expect(onRoadway(city, mid.x, mid.z)).toBe(true);
        // A la derecha del sentido de la marcha.
        const n = graph.nodes[e.from]!;
        const side = (mid.x - n.x) * -e.dir.z + (mid.z - n.z) * e.dir.x;
        expect(side).toBeGreaterThan(0);
      }
      expect(e.next.length).toBeGreaterThan(0);
    }
  });

  it('nunca da verde a los dos ejes de un cruce a la vez', () => {
    const n = graph.nodes[40]!;
    for (let t = 0; t < 80; t += 0.5) {
      const x = signalAt(n, 'x', t);
      const z = signalAt(n, 'z', t);
      expect(x !== 'red' && z !== 'red').toBe(false);
    }
  });
});

describe('Tráfico', () => {
  const run = (
    sim: TrafficSim,
    seconds: number,
    obstacles: { x: number; z: number; r: number }[] = [],
  ) => {
    let minGap = Infinity;
    for (let t = 0; t < seconds; t += 1 / 30) {
      sim.update(1 / 30, t, {
        focus: city.spawn,
        radius: 260,
        target: 60,
        obstacles,
        speedFactor: 1,
      });
      // Distancia mínima entre coches en el mismo carril.
      const byLane = new Map<string, typeof sim.cars>();
      for (const c of sim.cars) {
        if (c.turn) continue;
        const k = `${c.edge}:${c.lane}`;
        byLane.set(k, [...(byLane.get(k) ?? []), c]);
      }
      for (const cars of byLane.values()) {
        cars.sort((a, b) => a.s - b.s);
        for (let i = 1; i < cars.length; i++)
          minGap = Math.min(
            minGap,
            cars[i]!.s - cars[i - 1]!.s - (cars[i]!.len + cars[i - 1]!.len) / 2,
          );
      }
    }
    return minGap;
  };

  it('los coches circulan sin chocar entre sí durante dos minutos', () => {
    const sim = new TrafficSim(graph, 1);
    const minGap = run(sim, 120);
    expect(sim.cars.length).toBeGreaterThan(40);
    expect(minGap).toBeGreaterThan(-0.3);
    const moving = sim.cars.filter((c) => c.v > 1).length;
    expect(moving).toBeGreaterThan(sim.cars.length * 0.25);
  });

  it('se detienen ante un peatón o el jugador en la calzada', () => {
    const sim = new TrafficSim(graph, 2);
    const e = graph.edges.find((x) => x.lanes[0]!.len > 80)!;
    const lane = e.lanes[0]!;
    const car = sim.spawn(e, 0, 5);
    const block = { x: lane.start.x + e.dir.x * 45, z: lane.start.z + e.dir.z * 45, r: 0.4 };
    sim.cars = [car];
    for (let t = 0; t < 20; t += 1 / 30)
      sim.update(1 / 30, 0, {
        focus: block,
        radius: 30,
        target: 1,
        obstacles: [block],
        speedFactor: 1,
      });
    const dist = (block.x - car.x) * e.dir.x + (block.z - car.z) * e.dir.z;
    expect(car.edge).toBe(e.id);
    expect(dist).toBeGreaterThan(car.len / 2);
    expect(car.v).toBeLessThan(0.2);
  });

  it('respetan el semáforo en rojo', () => {
    const sim = new TrafficSim(graph, 3);
    const e = graph.edges.find((x) => x.axis === 'x' && x.lanes[0]!.len > 60)!;
    const car = sim.spawn(e, 0, 5);
    sim.cars = [car];
    const node = graph.nodes[e.to]!;
    // Instante en que el eje x está en rojo durante un buen rato.
    let t0 = 0;
    while (signalAt(node, 'x', t0) !== 'red' || signalAt(node, 'x', t0 - 1) === 'red') t0 += 0.5;
    for (let t = 0; t < 18; t += 1 / 30)
      sim.update(1 / 30, t0 + t, {
        focus: { x: car.x, z: car.z },
        radius: 400,
        target: 1,
        obstacles: [],
        speedFactor: 1,
      });
    expect(car.edge).toBe(e.id);
    expect(car.turn).toBeNull();
    expect(car.v).toBeLessThan(0.2);
  });
});

describe('Peatones', () => {
  it('caminan por las aceras, cruzan por los pasos y nunca entran en edificios', () => {
    const crowd = new Crowd(city, graph, 5);
    let crossings = 0;
    for (let t = 0; t < 180; t += 1 / 10) {
      crowd.update(1 / 10, t, {
        focus: city.spawn,
        radius: 140,
        target: 80,
        umbrellas: 0,
        player: { x: 1e6, z: 1e6 },
      });
      for (const p of crowd.peds) {
        expect(insideBuilding(city, p.x, p.z, 0.2)).toBeNull();
        if (p.state === 'cross') crossings++;
        else expect(onRoadway(city, p.x, p.z)).toBe(false);
      }
    }
    expect(crowd.peds.length).toBeGreaterThan(50);
    expect(crossings).toBeGreaterThan(0);
  });
});
