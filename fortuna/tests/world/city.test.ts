import { describe, expect, it } from 'vitest';
import { DISTRICTS } from '../../src/data/districts';
import { COAST_X, generateCity, insideBuilding, type Rect } from '../../src/world/cityGen';
import { daylightHours, sunState } from '../../src/world/sun';

const overlap = (a: Rect, b: Rect) => a.x0 < b.x1 && a.x1 > b.x0 && a.z0 < b.z1 && a.z1 > b.z0;

describe('Ciudad procedural', () => {
  const city = generateCity(42);

  it('es determinista con la semilla', () => {
    expect(JSON.stringify(generateCity(42))).toBe(JSON.stringify(city));
    expect(JSON.stringify(generateCity(43).buildings.slice(0, 10))).not.toBe(
      JSON.stringify(city.buildings.slice(0, 10)),
    );
  });

  it('tiene tamaño de ciudad y todos los barrios', () => {
    expect(city.blocks.length).toBeGreaterThan(150);
    expect(city.buildings.length).toBeGreaterThan(800);
    expect(city.props.filter((p) => p.kind === 'farola').length).toBeGreaterThan(500);
    const districts = new Set(city.blocks.map((b) => b.district));
    for (const d of DISTRICTS) expect(districts.has(d.id), d.name).toBe(true);
  });

  it('ningún edificio pisa la calzada ni se sale de su manzana', () => {
    for (const b of city.buildings) {
      const r: Rect = {
        x0: b.x - b.w / 2,
        x1: b.x + b.w / 2,
        z0: b.z - b.d / 2,
        z1: b.z + b.d / 2,
      };
      for (const road of city.roads)
        expect(overlap(r, road.rect), `edificio en ${b.x},${b.z}`).toBe(false);
      expect(r.x0).toBeGreaterThan(COAST_X);
      expect(b.h).toBeGreaterThan(2);
    }
  });

  it('el jugador aparece en una acera libre de Las Grúas', () => {
    expect(insideBuilding(city, city.spawn.x, city.spawn.z, 0.5)).toBeNull();
    const block = city.blocks.find(
      (b) =>
        city.spawn.x >= b.rect.x0 &&
        city.spawn.x <= b.rect.x1 &&
        city.spawn.z >= b.rect.z0 &&
        city.spawn.z <= b.rect.z1,
    );
    expect(block?.district).toBe('gruas');
  });

  it('las farolas no quedan dentro de edificios', () => {
    const bad = city.props.filter((p) => p.kind === 'farola' && insideBuilding(city, p.x, p.z));
    expect(bad).toHaveLength(0);
  });
});

describe('Sol y estaciones', () => {
  it('es de día al mediodía y de noche a medianoche', () => {
    expect(sunState(13, 172).elevation).toBeGreaterThan(1);
    expect(sunState(1, 172).elevation).toBeLessThan(0);
    expect(sunState(13, 0).daylight).toBe(1);
    expect(sunState(0, 0).daylight).toBe(0);
  });

  it('los días de verano son más largos que los de invierno', () => {
    const summer = daylightHours(172);
    const winter = daylightHours(355);
    expect(summer).toBeGreaterThan(14);
    expect(winter).toBeLessThan(10);
  });

  it('el sol sale por el este y se pone por el oeste', () => {
    expect(sunState(9, 80).x).toBeGreaterThan(0);
    expect(sunState(18, 80).x).toBeLessThan(0);
  });
});
