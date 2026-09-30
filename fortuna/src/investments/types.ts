import type { Cents } from '../economy/ledger';
import type { RngState } from '../economy/rng';

/** Clases de activo del catálogo (acciones y bonos viven en el mercado de la Fase 1). */
export type AssetClassId =
  | 'etf'
  | 'fund'
  | 'pension'
  | 'insurance'
  | 'crypto'
  | 'commodity'
  | 'forex'
  | 'option'
  | 'future'
  | 'cfd'
  | 'realestate'
  | 'distressed'
  | 'business'
  | 'franchise'
  | 'startup'
  | 'farmland'
  | 'energy'
  | 'collectible'
  | 'entertainment'
  | 'p2p'
  | 'philanthropy';

/**
 * Factores comunes que mueven los precios. Todos son niveles aditivos: logaritmos de
 * índices (bolsa, materias primas, cripto, inmuebles…) o niveles de tipos de interés.
 * `eq` bolsa local · `eqg` bolsa mundial · `sec:<sector>` · `rate` bono 10 años local ·
 * `cpi` · `fx:<país>` · `cmd:<materia>` · `crypto` · `re:<distrito>` · `lux` · `vc` ·
 * `power` · `fear` (miedo / 100).
 */
export type FactorId = string;

export type Liquidity =
  /** Se compra y se vende al instante (en horario de mercado si cotiza en bolsa). */
  | 'instant'
  /** Se vende en la subasta semanal. */
  | 'auction'
  /** Se anuncia la venta y tarda semanas en encontrar comprador (o venta rápida con descuento). */
  | 'listing'
  /** Solo hay mercado secundario con descuento. */
  | 'secondary'
  /** No se puede vender (donaciones, primas de seguro). */
  | 'none';

export type InstrumentStatus = 'open' | 'closed' | 'failed' | 'expired' | 'matured';

export interface Instrument {
  id: string;
  cls: AssetClassId;
  /** Subtipo dentro de la clase (piso, arte, memecoin…). */
  sub: string;
  name: string;
  /** País (divisa, fiscalidad) o distrito de Puerto Valmera. */
  region: string;
  /** País cuya divisa usa el precio. */
  ccy: string;
  /** Precio de mercado / tasación por unidad en la divisa del instrumento. */
  price: number;
  /** Precio de referencia en el anclaje. */
  base: number;
  /** Sensibilidad a cada factor. */
  load: Record<FactorId, number>;
  /** Nivel de cada factor en el anclaje. */
  f0: Record<FactorId, number>;
  /** Desviación logarítmica propia (paseo aleatorio). */
  idio: number;
  /** Volatilidad propia anual. */
  vol: number;
  /** Deriva propia anual (incluye comisiones del producto y calidad oculta). */
  drift: number;
  /** Renta anual esperada como fracción del valor (alquiler, cupón, royalties, staking). */
  yield: number;
  status: InstrumentStatus;
  /** Activo único: una sola unidad, un solo dueño (un piso, un cuadro). */
  unique: boolean;
  /** Unidad mínima de compra. */
  lot: number;
  /** Tick de creación. */
  born: number;
  /** Oportunidad temporal: desaparece si nadie la compra antes de este tick. */
  expires?: number;
  /** Atributos visibles (claves definidas por la clase). */
  attrs: Record<string, string | number | boolean>;
  /** Verdad oculta: se descubre investigando o con el tiempo. */
  hidden: Record<string, number | boolean>;
  /** Histórico de valoraciones (semanal los líquidos, mensual los ilíquidos). */
  hist: number[];
}

export interface Position {
  /** Unidades (negativas = posición corta, solo productos con margen). */
  qty: number;
  /** Coste total de adquisición en céntimos de ₳ (incluye comisiones e impuestos de compra). */
  cost: Cents;
  opened: number;
  /** Margen depositado (productos apalancados). */
  margin?: Cents;
  /** Precio al que se liquidó la última variación diaria (productos con margen). */
  mark?: number;
  /** Hipoteca asociada (id de préstamo). */
  mortgageId?: number;
  /** Aportaciones acumuladas en el año (planes de pensiones). */
  contribYtd?: Cents;
  /** Meses sin inquilino / estado del inquilino. */
  vacantMonths?: number;
  /** Resultado acumulado de las liquidaciones diarias (productos con margen). */
  pnl?: Cents;
  /** Venta en curso. */
  selling?: { mode: 'listing' | 'auction' | 'quick'; readyTick: number; asking: number };
}

export interface ResearchJob {
  id: string;
  level: number;
  readyTick: number;
}

export interface CommodityState {
  price: number;
  /** Precio de equilibrio (sube con la inflación). */
  anchor: number;
}

export interface CryptoMarket {
  regime: 'bull' | 'bear' | 'winter';
  daysInRegime: number;
}

export interface CatalogOrder {
  id: number;
  instId: string;
  side: 'buy' | 'sell' | 'long' | 'short' | 'close';
  qty: number;
  placedTick: number;
  mortgage?: { ltv: number; years: number };
}

export interface InvestmentsState {
  instruments: Instrument[];
  /** Órdenes que se ejecutan al precio de las 18:00. */
  orders: CatalogOrder[];
  factors: Record<FactorId, number>;
  commodities: Record<string, CommodityState>;
  crypto: CryptoMarket;
  /** Anomalía climática (−1 sequía extrema … +1 lluvias abundantes). */
  weather: number;
  positions: Record<string, Position>;
  /** Nivel de investigación del jugador por instrumento (0–3). */
  research: Record<string, number>;
  researchQueue: ResearchJob[];
  unlocks: { derivatives: boolean; accredited: boolean };
  pensionYtd: Cents;
  donationsYtd: Cents;
  reputation: Record<string, number>;
  serial: number;
  rng: RngState;
}
