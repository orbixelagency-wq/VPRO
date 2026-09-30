/** Materias primas negociables. Precios en dólares atlánticos (divisa de Columbria). */
export interface CommodityDef {
  id: string;
  name: string;
  unit: string;
  price: number;
  /** Volatilidad anual. */
  vol: number;
  /** Velocidad de reversión anual al precio de equilibrio. */
  reversion: number;
  /** Sensibilidades: inflación, crecimiento (PMI), miedo, tipos reales, petróleo, clima. */
  drivers: {
    inflation?: number;
    growth?: number;
    fear?: number;
    realRate?: number;
    oil?: number;
    weather?: number;
  };
  /** Estacionalidad: amplitud del ciclo anual y mes de máximo. */
  season?: { amp: number; peakMonth: number };
  description: string;
}

export const COMMODITIES: readonly CommodityDef[] = [
  {
    id: 'oro',
    name: 'Oro',
    unit: 'onza',
    price: 2150,
    vol: 0.15,
    reversion: 0.08,
    drivers: { inflation: 1.2, fear: 0.9, realRate: -6 },
    description:
      'El refugio clásico. Sube con el miedo y con la inflación; sufre cuando los tipos reales suben.',
  },
  {
    id: 'plata',
    name: 'Plata',
    unit: 'onza',
    price: 25,
    vol: 0.26,
    reversion: 0.1,
    drivers: { inflation: 1, fear: 0.4, growth: 0.8, realRate: -5 },
    description: 'Medio metal precioso, medio metal industrial. Más volátil que el oro.',
  },
  {
    id: 'crudo',
    name: 'Crudo Qaravel Light',
    unit: 'barril',
    price: 78,
    vol: 0.32,
    reversion: 0.3,
    drivers: { oil: 1 },
    description:
      'El petróleo de referencia. Lo mueven el ciclo y los caprichos del Emirato de Qaravel.',
  },
  {
    id: 'gas',
    name: 'Gas natural',
    unit: 'MMBtu',
    price: 3.2,
    vol: 0.45,
    reversion: 0.5,
    drivers: { oil: 0.5, weather: 0.6 },
    season: { amp: 0.18, peakMonth: 0 },
    description: 'Muy estacional: los inviernos fríos lo disparan.',
  },
  {
    id: 'cobre',
    name: 'Cobre',
    unit: 'tonelada',
    price: 8600,
    vol: 0.22,
    reversion: 0.15,
    drivers: { growth: 2.2 },
    description: 'El "doctor cobre" anticipa el ciclo económico mejor que muchos economistas.',
  },
  {
    id: 'litio',
    name: 'Litio',
    unit: 'tonelada',
    price: 16000,
    vol: 0.5,
    reversion: 0.25,
    drivers: { growth: 1.5 },
    description: 'La fiebre de las baterías: ciclos brutales de euforia y exceso de oferta.',
  },
  {
    id: 'cafe',
    name: 'Café arábica',
    unit: 'libra',
    price: 1.9,
    vol: 0.32,
    reversion: 0.35,
    drivers: { weather: 1.2 },
    season: { amp: 0.05, peakMonth: 6 },
    description: 'Una helada en las plantaciones y el precio se duplica.',
  },
  {
    id: 'trigo',
    name: 'Trigo',
    unit: 'bushel',
    price: 6.1,
    vol: 0.28,
    reversion: 0.4,
    drivers: { weather: 1, oil: 0.2 },
    season: { amp: 0.06, peakMonth: 5 },
    description: 'Sequías, cosechas récord y guerras comerciales.',
  },
  {
    id: 'madera',
    name: 'Madera',
    unit: '1.000 pies',
    price: 540,
    vol: 0.35,
    reversion: 0.4,
    drivers: { growth: 1.4 },
    description: 'Sigue a la construcción de viviendas.',
  },
  {
    id: 'agua',
    name: 'Derechos de agua',
    unit: 'acre-pie',
    price: 820,
    vol: 0.18,
    reversion: 0.05,
    drivers: { weather: 0.8, inflation: 0.5 },
    description: 'El activo del futuro, según unos; una aberración, según otros.',
  },
  {
    id: 'aceite',
    name: 'Aceite de oliva',
    unit: 'tonelada',
    price: 6200,
    vol: 0.3,
    reversion: 0.3,
    drivers: { weather: 1.3 },
    season: { amp: 0.04, peakMonth: 9 },
    description: 'Oro líquido de La Vega. Dos años de sequía y se convierte en lujo.',
  },
  {
    id: 'cacao',
    name: 'Cacao',
    unit: 'tonelada',
    price: 4100,
    vol: 0.38,
    reversion: 0.3,
    drivers: { weather: 1.1 },
    description: 'Plagas y clima en los trópicos lo convierten en montaña rusa.',
  },
];
