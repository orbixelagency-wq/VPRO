import type { Cents, LedgerState } from './ledger';
import type { InvestmentsState } from '../investments/types';
import type { RngState } from './rng';

export type CyclePhase = 'expansion' | 'overheating' | 'recession' | 'recovery';

export interface Country {
  id: string;
  gdpGrowth: number; // anualizada
  inflation: number; // interanual
  unemployment: number;
  policyRate: number;
  debtToGdp: number;
  gdp: number;
  /** AUR por unidad de divisa local. */
  fx: number;
  /** Índice de precios al consumo (base 1 al inicio). */
  cpi: number;
  /** Índice de gestores de compras adelantado (50 = neutral). */
  pmi: number;
  /** Próxima reunión del banco central (tick). */
  nextMeeting: number;
  /** Diferencia de rentabilidad sobre el bono sin riesgo. */
  spread: number;
  history: {
    day: number;
    gdpGrowth: number;
    inflation: number;
    rate: number;
    unemployment: number;
  }[];
}

export interface GlobalMacro {
  phase: CyclePhase;
  monthsInPhase: number;
  /** Fase siguiente ya decidida (señales adelantadas) y meses hasta el cambio. */
  nextPhase: CyclePhase | null;
  monthsToNext: number;
  /** Índice de miedo del mercado (≈ volatilidad implícita anualizada, 10–80). */
  fear: number;
  /** Prima de riesgo de la renta variable (varía con el miedo). */
  equityPremium: number;
  /** Nivel de burbuja especulativa acumulada (0 = ninguna). */
  froth: number;
  /** Precio del crudo de referencia (Brent ficticio: "Qaravel Light"). */
  oil: number;
  /** Choque sistémico activo. */
  shock: SystemicShock | null;
}

export interface SystemicShock {
  kind: 'banking_crisis' | 'pandemic' | 'trade_war' | 'oil_shock' | 'tech_crash';
  startedTick: number;
  monthsLeft: number;
  severity: number; // 0..1
}

export interface Company {
  id: string; // ticker
  name: string;
  sector: string;
  country: string;
  ceo: { name: string; style: string };
  founded: number;
  sharesOutstanding: number;
  // Fundamentales (moneda local, millones)
  revenueTtm: number;
  quarterlyRevenue: number[]; // últimos 4 trimestres
  quarterlyEarnings: number[]; // últimos 4 trimestres
  margin: number;
  /** Margen estructural al que tiende (calidad del negocio). */
  targetMargin: number;
  growth: number; // crecimiento estructural esperado
  cash: number;
  debt: number;
  dividendPerShare: number; // trimestral, moneda local
  /** Estimación de consenso del BPA del próximo trimestre. */
  consensusEps: number;
  // Mercado
  price: number;
  prevClose: number;
  open: number;
  dayHigh: number;
  dayLow: number;
  fairValue: number;
  /** Sentimiento: desviación logarítmica del precio objetivo respecto al valor razonable. */
  sentiment: number;
  /** Objetivo logarítmico en la última apertura (para descontar noticias de golpe). */
  anchor: number;
  /** Impacto temporal de órdenes grandes (log), se disipa. */
  tempImpact: number;
  /** Volumen medio diario (acciones). */
  adv: number;
  volumeToday: number;
  beta: number;
  idioVol: number;
  // Estado oculto (descubrible con investigación)
  hidden: { fraud: boolean; fraudSeverity: number; quality: number };
  status: 'listed' | 'bankrupt' | 'acquired';
  /** Día (índice) de su próxima presentación de resultados. */
  nextEarningsDay: number;
  /** OPA en curso: precio ofrecido y día de liquidación. */
  takeover: { price: number; closeDay: number; bidder: string } | null;
  splitCount: number;
  closes: number[]; // cierre diario completo (moneda local)
  intraday: number[]; // precios del día actual
}

export interface Bond {
  id: string;
  name: string;
  issuer: string; // country id o company id
  issuerType: 'government' | 'corporate';
  country: string;
  coupon: number; // anual
  /** Tick de vencimiento. */
  maturityTick: number;
  /** Frecuencia de cupón por año. */
  frequency: number;
  rating: Rating;
  /** Precio sucio por 100 de nominal, en divisa local. */
  price: number;
  yield: number;
  status: 'active' | 'matured' | 'defaulted';
  recovery: number;
  closes: number[];
}

export type Rating = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC' | 'D';

export interface Holding {
  qty: number;
  /** Coste medio por unidad en céntimos de AUR (incluye comisiones). */
  avgCost: number;
}

export interface PendingOrder {
  id: number;
  kind: 'buy' | 'sell';
  asset: 'stock' | 'bond';
  assetId: string;
  qty: number;
  placedTick: number;
  /** Límite de precio en divisa del activo (opcional). */
  limit?: number;
}

export interface TermDeposit {
  id: number;
  principal: Cents;
  rate: number;
  startTick: number;
  maturityTick: number;
}

export interface Loan {
  id: number;
  kind: 'personal' | 'mortgage';
  /** Inmueble que garantiza la hipoteca. */
  collateral?: string;
  principal: Cents;
  outstanding: Cents;
  rate: number;
  monthlyPayment: Cents;
  monthsLeft: number;
  missedPayments: number;
}

export interface TradeRecord {
  tick: number;
  kind: 'buy' | 'sell';
  asset: 'stock' | 'bond';
  assetId: string;
  qty: number;
  /** Precio de ejecución en divisa del activo. */
  price: number;
  /** Importe neto en céntimos de AUR (positivo = cobro). */
  cashFlow: Cents;
  fees: Cents;
  realizedPnl: Cents;
}

export interface PlayerState {
  name: string;
  job: { title: string; netMonthly: Cents; employer: string } | null;
  monthlyExpenses: Cents;
  stocks: Record<string, Holding>;
  bonds: Record<string, Holding>;
  deposits: TermDeposit[];
  loans: Loan[];
  orders: PendingOrder[];
  trades: TradeRecord[];
  tax: {
    realizedGainsYtd: Cents;
    lossCarryForward: Cents;
    dividendsYtd: Cents;
    interestYtd: Cents;
    withheldYtd: Cents;
    paidTotal: Cents;
  };
  /** Patrimonio neto diario en céntimos (para gráficas). */
  netWorthHistory: number[];
  bankrupt: boolean;
  /** Meses consecutivos cerrados por debajo del límite de descubierto. */
  overdraftMonths: number;
  /** Conceptos ya descubiertos del Cuaderno del inversor. */
  notebook: string[];
  creditScore: number; // 300..850
}

export type NewsCategory =
  | 'earnings'
  | 'macro'
  | 'central_bank'
  | 'rumor'
  | 'scandal'
  | 'corporate'
  | 'market'
  | 'systemic'
  | 'analyst';

export interface NewsItem {
  id: number;
  tick: number;
  category: NewsCategory;
  headline: string;
  body: string;
  /** Activos o países afectados. */
  tags: string[];
  /** -1 (muy negativo) .. 1 (muy positivo), como lo percibe el mercado. */
  tone: number;
  importance: 1 | 2 | 3;
  /** Verdad oculta: los rumores falsos se desmienten más tarde. */
  hidden?: { isFalse: boolean; resolveTick: number; resolved: boolean; effect: number };
}

export interface MarketIndex {
  id: string;
  name: string;
  value: number;
  prevClose: number;
  closes: number[];
  members: string[];
  /** Divisor para que el índice empiece en su valor base. */
  divisor: number;
}

export interface SimEvent {
  type: 'news' | 'trade' | 'notebook' | 'bankruptcy' | 'phase' | 'dividend' | 'warning';
  tick: number;
  message: string;
  ref?: string;
}

export interface SimSettings {
  /** Multiplicador de volatilidad (dificultad). */
  volatility: number;
  /** Multiplicador de frecuencia de crisis. */
  crisisFrequency: number;
  /** Modo sandbox: el jugador recibe crédito ilimitado para experimentar. */
  sandbox: boolean;
}

export interface RngStreams {
  macro: RngState;
  market: RngState;
  corporate: RngState;
  news: RngState;
  events: RngState;
}

export interface SimState {
  schemaVersion: number;
  seed: number;
  tick: number;
  settings: SimSettings;
  rng: RngStreams;
  ledger: LedgerState;
  global: GlobalMacro;
  countries: Country[];
  companies: Company[];
  bonds: Bond[];
  indices: MarketIndex[];
  player: PlayerState;
  news: NewsItem[];
  nextId: number;
  /** Catálogo de inversiones alternativas (Fase 2). */
  inv: InvestmentsState;
  /** Salidas a bolsa programadas para reponer empresas excluidas. */
  ipoQueue: Array<{ day: number; country: string }>;
  /** Eventos emitidos desde el último drenado por el anfitrión. */
  outbox: SimEvent[];
}
