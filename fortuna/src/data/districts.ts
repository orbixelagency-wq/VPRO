/**
 * Distritos de Puerto Valmera. Se reutilizan en el mundo abierto (Fase 4): cada uno tiene
 * identidad, precio del suelo y tendencia propia (la gentrificación es información oculta).
 */
export interface DistrictDef {
  id: string;
  name: string;
  kind: string;
  /** Precio medio del m² residencial en ₳ al empezar. */
  priceM2: number;
  /** Rentabilidad bruta típica del alquiler. */
  grossYield: number;
  /** Tendencia real anual oculta (gentrificación o declive). */
  trend: number;
  /** Volatilidad anual del precio del suelo. */
  vol: number;
  /** Tipos de inmueble que abundan (pesos). */
  mix: Partial<
    Record<
      | 'piso'
      | 'estudio'
      | 'local'
      | 'oficina'
      | 'nave'
      | 'terreno'
      | 'edificio'
      | 'vacacional'
      | 'chalet',
      number
    >
  >;
  description: string;
  /** Centro del barrio en el mapa 3D (metros; x = este, z = sur). */
  pos: [number, number];
}

export const DISTRICTS: readonly DistrictDef[] = [
  {
    id: 'gruas',
    name: 'Las Grúas',
    kind: 'Barrio obrero',
    priceM2: 1450,
    grossYield: 0.068,
    trend: 0.018,
    vol: 0.06,
    mix: { piso: 6, estudio: 3, local: 2, nave: 1 },
    description:
      'Bloques de los años sesenta junto a los astilleros. Barato, ruidoso y con artistas empezando a llegar.',
    pos: [-220, 60],
  },
  {
    id: 'casco',
    name: 'Casco Viejo',
    kind: 'Centro histórico',
    priceM2: 3900,
    grossYield: 0.048,
    trend: 0.012,
    vol: 0.05,
    mix: { piso: 4, estudio: 3, local: 3, vacacional: 4, edificio: 1 },
    description:
      'Callejuelas, turismo y pisos turísticos. La normativa de alquiler vacacional cambia cada pocos años.',
    pos: [40, -200],
  },
  {
    id: 'lonja',
    name: 'La Lonja',
    kind: 'Distrito financiero',
    priceM2: 5200,
    grossYield: 0.042,
    trend: 0.004,
    vol: 0.07,
    mix: { oficina: 6, piso: 2, local: 2, edificio: 1 },
    description: 'Torres de cristal, la Bolsa de Valmera y la sede del Banco de Castelia.',
    pos: [300, -20],
  },
  {
    id: 'campus',
    name: 'Campus Alto',
    kind: 'Zona universitaria',
    priceM2: 2600,
    grossYield: 0.062,
    trend: 0.01,
    vol: 0.045,
    mix: { estudio: 5, piso: 4, local: 2 },
    description:
      'Alquiler por habitaciones, bares baratos y demanda que nunca falta en septiembre.',
    pos: [330, -430],
  },
  {
    id: 'puerto',
    name: 'El Puerto',
    kind: 'Puerto e industria',
    priceM2: 1250,
    grossYield: 0.075,
    trend: 0.0,
    vol: 0.07,
    mix: { nave: 6, terreno: 2, oficina: 1, local: 1 },
    description: 'Grúas, contenedores y naves logísticas. Vive del comercio exterior.',
    pos: [-470, -40],
  },
  {
    id: 'almendros',
    name: 'Colina de los Almendros',
    kind: 'Barrio de lujo',
    priceM2: 7400,
    grossYield: 0.03,
    trend: 0.008,
    vol: 0.05,
    mix: { chalet: 5, piso: 3, terreno: 1 },
    description: 'Villas con vistas a la bahía. Aquí vive quien ya ganó la partida.',
    pos: [430, 430],
  },
  {
    id: 'villanueva',
    name: 'Villanueva',
    kind: 'Suburbios',
    priceM2: 2100,
    grossYield: 0.055,
    trend: 0.006,
    vol: 0.04,
    mix: { piso: 5, chalet: 3, local: 1, terreno: 1 },
    description: 'Adosados, colegios y centros comerciales. Familias y coches.',
    pos: [60, 440],
  },
  {
    id: 'poligono',
    name: 'Polígono Sur',
    kind: 'Polígono industrial',
    priceM2: 900,
    grossYield: 0.08,
    trend: -0.004,
    vol: 0.06,
    mix: { nave: 7, terreno: 3, oficina: 1 },
    description: 'Talleres, almacenes y el mercado central. Rentable si el inquilino paga.',
    pos: [-300, 470],
  },
  {
    id: 'vega',
    name: 'La Vega',
    kind: 'Periferia rural',
    priceM2: 650,
    grossYield: 0.045,
    trend: 0.006,
    vol: 0.05,
    mix: { terreno: 5, chalet: 2, nave: 1 },
    description: 'Huertas, masías y suelo que algún día puede ser urbanizable. O no.',
    pos: [680, 120],
  },
  {
    id: 'costa',
    name: 'Costa Serena',
    kind: 'Costa',
    priceM2: 4300,
    grossYield: 0.052,
    trend: 0.014,
    vol: 0.06,
    mix: { vacacional: 6, piso: 3, chalet: 2, local: 1 },
    description: 'Playa, apartamentos de verano y restaurantes que cierran en invierno.',
    pos: [-330, -470],
  },
];

export function districtName(id: string): string {
  return DISTRICTS.find((d) => d.id === id)?.name ?? id;
}
