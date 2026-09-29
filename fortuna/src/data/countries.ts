/** Países ficticios del mundo de FORTUNA. Todos los datos son inventados. */
export interface CountryDef {
  id: string;
  name: string;
  nameEn: string;
  adjective: string;
  currency: { code: string; name: string; symbol: string };
  centralBank: string;
  /** Crecimiento potencial anual del PIB. */
  trendGrowth: number;
  inflationTarget: number;
  /** Tipo de interés real neutral. */
  neutralReal: number;
  /** Sensibilidad al ciclo global (1 = media). */
  cycleSensitivity: number;
  initialDebtToGdp: number;
  /** Paro estructural. */
  naturalUnemployment: number;
  initialGdp: number; // miles de millones en moneda local
  /** Unidades de la divisa local (AUR) por 1 unidad de esta divisa. */
  initialFx: number;
  /** Volatilidad macro relativa. */
  macroVol: number;
  /** Prima de riesgo país en bonos (base, sin deuda). */
  baseSpread: number;
  /** Peso en la economía global (para el ciclo y el índice mundial). */
  weight: number;
  isHome?: boolean;
  /** Distintivo del Estado emisor de deuda. */
  treasury: string;
}

export const COUNTRIES: readonly CountryDef[] = [
  {
    id: 'castelia',
    name: 'Castelia',
    nameEn: 'Castelia',
    adjective: 'castelano',
    currency: { code: 'AUR', name: 'áureo', symbol: '₳' },
    centralBank: 'Banco de Castelia',
    trendGrowth: 0.018,
    inflationTarget: 0.02,
    neutralReal: 0.006,
    cycleSensitivity: 1.1,
    initialDebtToGdp: 0.92,
    naturalUnemployment: 0.105,
    initialGdp: 1400,
    initialFx: 1,
    macroVol: 1,
    baseSpread: 0.006,
    weight: 0.14,
    isHome: true,
    treasury: 'Tesoro de Castelia',
  },
  {
    id: 'nordhavn',
    name: 'Federación de Nordhavn',
    nameEn: 'Nordhavn Federation',
    adjective: 'nordhavense',
    currency: { code: 'NKR', name: 'nordcorona', symbol: 'kr' },
    centralBank: 'Riksbank Federal de Nordhavn',
    trendGrowth: 0.015,
    inflationTarget: 0.02,
    neutralReal: 0.005,
    cycleSensitivity: 0.8,
    initialDebtToGdp: 0.41,
    naturalUnemployment: 0.055,
    initialGdp: 620,
    initialFx: 0.094,
    macroVol: 0.7,
    baseSpread: 0,
    weight: 0.1,
    treasury: 'Tesoro Federal de Nordhavn',
  },
  {
    id: 'columbria',
    name: 'Mancomunidad de Columbria',
    nameEn: 'Columbria Commonwealth',
    adjective: 'columbriano',
    currency: { code: 'ATD', name: 'dólar atlántico', symbol: '𝔇' },
    centralBank: 'Reserva Atlántica',
    trendGrowth: 0.021,
    inflationTarget: 0.02,
    neutralReal: 0.008,
    cycleSensitivity: 1,
    initialDebtToGdp: 1.18,
    naturalUnemployment: 0.045,
    initialGdp: 24000,
    initialFx: 0.91,
    macroVol: 0.9,
    baseSpread: 0,
    weight: 0.36,
    treasury: 'Tesoro de Columbria',
  },
  {
    id: 'meridia',
    name: 'Unión Meridiana',
    nameEn: 'Meridian Union',
    adjective: 'meridiano',
    currency: { code: 'MRD', name: 'merid', symbol: 'Ṁ' },
    centralBank: 'Banco Central Meridiano',
    trendGrowth: 0.011,
    inflationTarget: 0.02,
    neutralReal: 0.002,
    cycleSensitivity: 1.05,
    initialDebtToGdp: 1.34,
    naturalUnemployment: 0.075,
    initialGdp: 3900,
    initialFx: 1.12,
    macroVol: 1,
    baseSpread: 0.012,
    weight: 0.16,
    treasury: 'Tesoro de la Unión Meridiana',
  },
  {
    id: 'kaishan',
    name: 'República de Kaishan',
    nameEn: 'Republic of Kaishan',
    adjective: 'kaishanés',
    currency: { code: 'KSH', name: 'shen', symbol: '₭' },
    centralBank: 'Banco Popular de Kaishan',
    trendGrowth: 0.045,
    inflationTarget: 0.03,
    neutralReal: 0.012,
    cycleSensitivity: 1.3,
    initialDebtToGdp: 0.68,
    naturalUnemployment: 0.05,
    initialGdp: 118000,
    initialFx: 0.128,
    macroVol: 1.4,
    baseSpread: 0.011,
    weight: 0.18,
    treasury: 'Ministerio de Finanzas de Kaishan',
  },
  {
    id: 'qaravel',
    name: 'Emirato de Qaravel',
    nameEn: 'Emirate of Qaravel',
    adjective: 'qaravelí',
    currency: { code: 'QDR', name: 'dinar qaravelí', symbol: 'ḋ' },
    centralBank: 'Autoridad Monetaria de Qaravel',
    trendGrowth: 0.032,
    inflationTarget: 0.045,
    neutralReal: 0.02,
    cycleSensitivity: 1.6,
    initialDebtToGdp: 0.55,
    naturalUnemployment: 0.09,
    initialGdp: 2100,
    initialFx: 0.061,
    macroVol: 1.8,
    baseSpread: 0.028,
    weight: 0.06,
    treasury: 'Tesoro del Emirato',
  },
];

export const HOME_COUNTRY_ID = 'castelia';
