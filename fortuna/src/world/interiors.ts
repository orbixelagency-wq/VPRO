/**
 * Interiores esenciales: tu casa, la tienda del barrio, el Banco de Valmera y la Bolsa.
 * Se construyen lejos de la ciudad (x ≥ 6000) y se entra con un fundido breve, sin pantalla de
 * carga. Datos puros: piezas (mismo formato que los edificios singulares), luces y puntos de
 * interacción.
 */
import type { LandmarkId, Part, PartMat } from './landmarks';
import type { Vec2 } from './roads';

export type SpotAction =
  'exit' | 'terminal:bank' | 'terminal:stocks' | 'terminal:explore' | 'sleep' | 'shop';

export interface Spot {
  id: string;
  label: string;
  x: number;
  z: number;
  radius: number;
  action: SpotAction;
}

export interface Interior {
  id: LandmarkId;
  name: string;
  /** Centro del suelo. */
  origin: Vec2;
  w: number;
  d: number;
  h: number;
  parts: Part[];
  lights: { x: number; y: number; z: number }[];
  /** Dónde aparece el jugador al entrar y hacia dónde mira (radianes, 0 = −z). */
  spawn: { x: number; z: number; facing: number };
  spots: Spot[];
  /** Ambiente sonoro. */
  ambience: 'casa' | 'tienda' | 'banco' | 'bolsa';
}

const ORIGIN_X = 6000;
const FLOOR = 0.2;

function room(
  ox: number,
  oz: number,
  w: number,
  d: number,
  h: number,
  floor: string,
  wall: string,
): Part[] {
  const t = 0.3;
  return [
    {
      shape: 'box',
      x: ox,
      z: oz,
      y: 0,
      w: w + 2 * t,
      h: FLOOR,
      d: d + 2 * t,
      mat: 'floor',
      color: floor,
      solid: true,
    },
    {
      shape: 'box',
      x: ox,
      z: oz,
      y: FLOOR + h,
      w: w + 2 * t,
      h: 0.3,
      d: d + 2 * t,
      mat: 'ceiling',
    },
    {
      shape: 'box',
      x: ox,
      z: oz - d / 2 - t / 2,
      y: 0,
      w: w + 2 * t,
      h: h + FLOOR,
      d: t,
      mat: 'wall',
      color: wall,
      solid: true,
    },
    {
      shape: 'box',
      x: ox,
      z: oz + d / 2 + t / 2,
      y: 0,
      w: w + 2 * t,
      h: h + FLOOR,
      d: t,
      mat: 'wall',
      color: wall,
      solid: true,
    },
    {
      shape: 'box',
      x: ox - w / 2 - t / 2,
      z: oz,
      y: 0,
      w: t,
      h: h + FLOOR,
      d: d,
      mat: 'wall',
      color: wall,
      solid: true,
    },
    {
      shape: 'box',
      x: ox + w / 2 + t / 2,
      z: oz,
      y: 0,
      w: t,
      h: h + FLOOR,
      d: d,
      mat: 'wall',
      color: wall,
      solid: true,
    },
  ];
}

function box(
  x: number,
  z: number,
  y: number,
  w: number,
  h: number,
  d: number,
  mat: PartMat,
  color?: string,
  solid = true,
  extra: Partial<Part> = {},
): Part {
  return { shape: 'box', x, z, y, w, h, d, mat, color, solid, ...extra };
}

/** Figura humana sencilla (empleados, clientes). `face`: hacia dónde mira (±x / ±z). */
function figure(x: number, z: number, shirt: string, pants = '#2b2d42', skin = '#e0ac87'): Part[] {
  return [
    box(x, z, FLOOR, 0.42, 0.86, 0.26, 'dark', pants, true),
    box(x, z, FLOOR + 0.86, 0.5, 0.64, 0.3, 'fabric', shirt, false),
    {
      shape: 'sphere',
      x,
      z,
      y: FLOOR + 1.52,
      w: 0.26,
      h: 0.26,
      d: 0.26,
      mat: 'fabric',
      color: skin,
    },
  ];
}

/** Puerta de salida en la pared sur y su punto de interacción. */
function exitDoor(ox: number, oz: number, d: number): { parts: Part[]; spot: Spot } {
  return {
    parts: [box(ox, oz + d / 2 - 0.02, FLOOR, 1.6, 2.4, 0.12, 'door', undefined, false)],
    spot: {
      id: 'salida',
      label: 'Salir a la calle',
      x: ox,
      z: oz + d / 2 - 0.9,
      radius: 1.3,
      action: 'exit',
    },
  };
}

function casa(ox: number, oz: number): Interior {
  const w = 9;
  const d = 11;
  const h = 2.7;
  const ex = exitDoor(ox, oz, d);
  const y = FLOOR;
  const parts: Part[] = [
    ...room(ox, oz, w, d, h, '#9a7b5b', '#e9e1d3'),
    ...ex.parts,
    // Dormitorio (fondo izquierda).
    box(ox - 3, oz - 4, y, 1.6, 0.45, 2.1, 'bed', '#f2f2f2'),
    box(ox - 3, oz - 3.25, y + 0.45, 1.5, 0.12, 0.55, 'fabric', '#9fb3c8', false),
    box(ox - 3, oz - 4.9, y, 1.7, 1.0, 0.1, 'wood', '#6b4b2a'),
    box(ox - 4.1, oz - 4.6, y, 0.45, 0.55, 0.45, 'wood', '#6b4b2a'),
    box(ox - 4.1, oz - 4.6, y + 0.55, 0.18, 0.35, 0.18, 'accent', '#ffe2a8', false, { glow: true }),
    // Escritorio con ordenador (fondo derecha).
    box(ox + 3, oz - 4.8, y, 2.0, 0.75, 0.7, 'wood', '#c8b79f'),
    box(ox + 3, oz - 5.0, y + 0.75, 0.9, 0.55, 0.06, 'screen', undefined, false, { glow: true }),
    box(ox + 3, oz - 4.4, y, 0.5, 0.48, 0.5, 'fabric', '#3d405b'),
    // Salón: sofá, mesa baja, alfombra y tele.
    box(ox + 2.6, oz + 1.2, y, 2.2, 0.45, 0.9, 'fabric', '#5c6b73'),
    box(ox + 2.6, oz + 1.6, y + 0.45, 2.2, 0.45, 0.2, 'fabric', '#5c6b73', false),
    box(ox + 2.6, oz - 0.2, y, 1.1, 0.4, 0.6, 'wood', '#8a6a4a'),
    box(ox + 2.6, oz - 0.2, y + 0.01, 3.2, 0.02, 2.4, 'fabric', '#b56576', false),
    box(ox + 2.6, oz - 2.1, y, 1.6, 0.5, 0.4, 'wood', '#3a3a3a'),
    box(ox + 2.6, oz - 2.2, y + 0.5, 1.3, 0.75, 0.05, 'screen', '#223', false),
    // Cocina (pared izquierda) y mesa.
    box(ox - w / 2 + 0.35, oz + 1, y, 0.7, 0.9, 3.4, 'stone', '#d9d4cc'),
    box(ox - w / 2 + 0.3, oz + 1, y + 1.5, 0.5, 0.7, 3.4, 'wood', '#efe9df'),
    box(ox - 1.8, oz + 2.4, y, 1.2, 0.75, 0.8, 'wood', '#a07850'),
    {
      shape: 'cyl',
      x: ox + 4,
      z: oz + 4.6,
      y,
      w: 0.5,
      h: 0.5,
      d: 0.5,
      mat: 'wood',
      color: '#8a5a3a',
      solid: true,
    },
    { shape: 'sphere', x: ox + 4, z: oz + 4.6, y: y + 0.5, w: 0.9, h: 0.9, d: 0.9, mat: 'plant' },
  ];
  return {
    id: 'casa',
    name: 'Tu piso',
    origin: { x: ox, z: oz },
    w,
    d,
    h,
    parts,
    lights: [
      { x: ox, y: FLOOR + h - 0.3, z: oz - 2 },
      { x: ox, y: FLOOR + h - 0.3, z: oz + 3 },
    ],
    spawn: { x: ox, z: oz + d / 2 - 2.6, facing: 0 },
    spots: [
      ex.spot,
      {
        id: 'ordenador',
        label: 'Usar el ordenador (terminal del inversor)',
        x: ox + 3,
        z: oz - 3.9,
        radius: 1.3,
        action: 'terminal:explore',
      },
      {
        id: 'cama',
        label: 'Dormir hasta mañana a las 8:00',
        x: ox - 3,
        z: oz - 2.6,
        radius: 1.4,
        action: 'sleep',
      },
    ],
    ambience: 'casa',
  };
}

function tienda(ox: number, oz: number): Interior {
  const w = 9;
  const d = 13;
  const h = 3.2;
  const ex = exitDoor(ox, oz, d);
  const y = FLOOR;
  const parts: Part[] = [...room(ox, oz, w, d, h, '#c9c3b8', '#f1ece2'), ...ex.parts];
  // Estanterías con productos de colores.
  const colors = [
    '#c0392b',
    '#f1c40f',
    '#27ae60',
    '#2980b9',
    '#e67e22',
    '#8e44ad',
    '#ecf0f1',
    '#d35400',
  ];
  let ci = 0;
  for (const sx of [-2.4, 0.6]) {
    parts.push(box(ox + sx, oz - 1, y, 1.0, 1.8, 6, 'wood', '#b89b72'));
    for (let lvl = 0; lvl < 3; lvl++)
      for (let k = 0; k < 8; k++)
        for (const side of [-1, 1])
          parts.push(
            box(
              ox + sx + side * 0.42,
              oz - 3.6 + k * 0.72,
              y + 0.25 + lvl * 0.55,
              0.2,
              0.32,
              0.5,
              'fabric',
              colors[ci++ % colors.length],
              false,
            ),
          );
  }
  // Frigoríficos al fondo y mostrador con caja registradora.
  parts.push(
    box(ox, oz - d / 2 + 0.45, y, 6, 2.1, 0.8, 'glassLit', undefined, true, { glow: true }),
  );
  parts.push(box(ox + 3.2, oz + 3.2, y, 1.6, 1.0, 2.6, 'wood', '#6b4b2a'));
  parts.push(box(ox + 3.2, oz + 3.6, y + 1.0, 0.45, 0.3, 0.4, 'dark', '#222'));
  parts.push(...figure(ox + 3.9, oz + 3.0, '#2f6b4a'));
  parts.push(box(ox - 3.6, oz + 4.6, y, 1.0, 0.8, 1.2, 'wood', '#8a6a4a'));
  return {
    id: 'tienda',
    name: 'Ultramarinos La Esquina',
    origin: { x: ox, z: oz },
    w,
    d,
    h,
    parts,
    lights: [
      { x: ox, y: FLOOR + h - 0.3, z: oz - 3 },
      { x: ox, y: FLOOR + h - 0.3, z: oz + 3 },
    ],
    spawn: { x: ox, z: oz + d / 2 - 2.6, facing: 0 },
    spots: [
      ex.spot,
      {
        id: 'mostrador',
        label: 'Comprar en el mostrador',
        x: ox + 2.1,
        z: oz + 3.2,
        radius: 1.5,
        action: 'shop',
      },
    ],
    ambience: 'tienda',
  };
}

function banco(ox: number, oz: number): Interior {
  const w = 24;
  const d = 18;
  const h = 6;
  const ex = exitDoor(ox, oz, d);
  const y = FLOOR;
  const parts: Part[] = [...room(ox, oz, w, d, h, '#e8e4dc', '#d9d2c4'), ...ex.parts];
  // Mostrador corrido con mamparas y tres cajeros.
  parts.push(box(ox, oz - 4, y, 16, 1.1, 1.0, 'stoneDark', '#3b4450'));
  for (let k = 0; k < 4; k++)
    parts.push(
      box(ox - 8 + k * (16 / 3), oz - 4, y + 1.1, 0.06, 0.9, 1.0, 'glassLit', undefined, false),
    );
  for (let k = 0; k < 3; k++) parts.push(...figure(ox - 5.3 + k * 5.3, oz - 5.2, '#1d3557'));
  // Columnas, bancos de espera, plantas y cajero automático.
  for (const sx of [-9, -3, 3, 9])
    parts.push({
      shape: 'cyl',
      x: ox + sx,
      z: oz + 1.5,
      y,
      w: 0.9,
      h,
      d: 0.9,
      mat: 'stone',
      color: '#efe9df',
      solid: true,
    });
  for (const sx of [-6, 6]) parts.push(box(ox + sx, oz + 4, y, 3.2, 0.45, 0.6, 'wood', '#6b4b2a'));
  for (const sx of [-11, 11])
    parts.push({
      shape: 'sphere',
      x: ox + sx,
      z: oz - 7.8,
      y: y + 0.2,
      w: 1.3,
      h: 1.3,
      d: 1.3,
      mat: 'plant',
    });
  parts.push(box(ox + 10.5, oz + 6, y, 1.0, 1.9, 0.8, 'metal', '#8c9196'));
  parts.push(
    box(ox + 10.5, oz + 5.58, y + 1.1, 0.6, 0.45, 0.04, 'screen', undefined, false, { glow: true }),
  );
  parts.push(
    box(ox, oz - d / 2 + 0.05, y + 3.4, 9, 1.2, 0.08, 'sign', '#0f2a44', false, {
      text: 'BANCO DE VALMERA',
      glow: true,
    }),
  );
  parts.push(...figure(ox - 6, oz + 4.6, '#b56576'));
  parts.push(...figure(ox + 4, oz + 2.4, '#86bbd8'));
  return {
    id: 'banco',
    name: 'Banco de Valmera',
    origin: { x: ox, z: oz },
    w,
    d,
    h,
    parts,
    lights: [
      { x: ox - 6, y: FLOOR + h - 0.5, z: oz - 2 },
      { x: ox + 6, y: FLOOR + h - 0.5, z: oz - 2 },
      { x: ox, y: FLOOR + h - 0.5, z: oz + 5 },
    ],
    spawn: { x: ox, z: oz + d / 2 - 2.6, facing: 0 },
    spots: [
      ex.spot,
      {
        id: 'ventanilla',
        label: 'Hablar con el cajero (banca)',
        x: ox,
        z: oz - 2.8,
        radius: 2.2,
        action: 'terminal:bank',
      },
      {
        id: 'atm',
        label: 'Cajero automático',
        x: ox + 10.5,
        z: oz + 4.8,
        radius: 1.2,
        action: 'terminal:bank',
      },
    ],
    ambience: 'banco',
  };
}

function bolsa(ox: number, oz: number): Interior {
  const w = 36;
  const d = 26;
  const h = 10;
  const ex = exitDoor(ox, oz, d);
  const y = FLOOR;
  const parts: Part[] = [...room(ox, oz, w, d, h, '#8a6e52', '#e3d9c6'), ...ex.parts];
  // Gran panel de cotizaciones en la pared del fondo.
  parts.push(
    box(ox, oz - d / 2 + 0.1, y + 3.2, 26, 5.2, 0.12, 'ticker', undefined, false, { glow: true }),
  );
  parts.push(
    box(ox, oz - d / 2 + 0.25, y + 8.6, 12, 0.9, 0.08, 'sign', '#3a3226', false, {
      text: 'BOLSA DE VALMERA',
    }),
  );
  // Corro central con barandilla y puestos de operadores alrededor.
  parts.push({
    shape: 'cyl',
    x: ox,
    z: oz,
    y,
    w: 7,
    h: 1.05,
    d: 7,
    mat: 'wood',
    color: '#6b4b2a',
    solid: true,
  });
  parts.push({
    shape: 'cyl',
    x: ox,
    z: oz,
    y: y + 1.05,
    w: 7.4,
    h: 0.1,
    d: 7.4,
    mat: 'metal',
    color: '#c9a45c',
  });
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const x = ox + Math.cos(a) * 9.5;
    const z = oz + Math.sin(a) * 7;
    parts.push(box(x, z, y, 1.8, 0.78, 0.9, 'wood', '#5a4636'));
    parts.push(
      box(x, z - 0.2, y + 0.78, 0.8, 0.5, 0.05, 'screen', undefined, false, { glow: true }),
    );
    if (k % 2 === 0)
      parts.push(...figure(x + 1.3, z + 0.6, ['#e5e5e5', '#86bbd8', '#f2cc8f', '#c44536'][k / 2]!));
  }
  for (const sx of [-15, -8, 8, 15])
    parts.push({
      shape: 'cyl',
      x: ox + sx,
      z: oz + 8,
      y,
      w: 1.2,
      h,
      d: 1.2,
      mat: 'stone',
      color: '#efe9df',
      solid: true,
    });
  // Campana de apertura en un balcón.
  parts.push(box(ox - 14, oz - d / 2 + 1.2, y + 3, 5, 0.3, 2, 'stone', '#e3d9c6', false));
  parts.push({
    shape: 'dome',
    x: ox - 14,
    z: oz - d / 2 + 1.2,
    y: y + 3.3,
    w: 0.9,
    h: 0.9,
    d: 0.9,
    mat: 'accent',
    color: '#c9a45c',
  });
  // Mesa de operaciones para el jugador.
  parts.push(box(ox + 10, oz + 3, y, 2.4, 0.78, 1.0, 'wood', '#3b2a20'));
  parts.push(
    box(ox + 10, oz + 2.7, y + 0.78, 1.4, 0.7, 0.05, 'screen', undefined, false, { glow: true }),
  );
  return {
    id: 'bolsa',
    name: 'Bolsa de Valmera',
    origin: { x: ox, z: oz },
    w,
    d,
    h,
    parts,
    lights: [
      { x: ox - 10, y: FLOOR + h - 1, z: oz - 3 },
      { x: ox + 10, y: FLOOR + h - 1, z: oz - 3 },
      { x: ox, y: FLOOR + h - 1, z: oz + 6 },
      { x: ox, y: FLOOR + h - 1, z: oz - 8 },
    ],
    spawn: { x: ox, z: oz + d / 2 - 2.6, facing: 0 },
    spots: [
      ex.spot,
      {
        id: 'mesa',
        label: 'Operar en bolsa',
        x: ox + 10,
        z: oz + 4.1,
        radius: 1.6,
        action: 'terminal:stocks',
      },
      {
        id: 'panel',
        label: 'Mirar el panel de cotizaciones',
        x: ox,
        z: oz - d / 2 + 4,
        radius: 3,
        action: 'terminal:stocks',
      },
    ],
    ambience: 'bolsa',
  };
}

const BUILDERS: Partial<Record<LandmarkId, (ox: number, oz: number) => Interior>> = {
  casa,
  tienda,
  banco,
  bolsa,
};

/** Interiores disponibles, cada uno en su parcela lejos de la ciudad. */
export function buildInteriors(ids: LandmarkId[]): Interior[] {
  const out: Interior[] = [];
  ids.forEach((id, k) => {
    const b = BUILDERS[id];
    if (b) out.push(b(ORIGIN_X + k * 120, 0));
  });
  return out;
}

export function isInterior(x: number): boolean {
  return x > ORIGIN_X - 100;
}
