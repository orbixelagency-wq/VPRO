import type { AccountId } from '../economy/ledger';
import type { SimState } from '../economy/types';
import type { Ctx } from './helpers';
import type { AssetClassId, Instrument, Liquidity, Position } from './types';

export interface Fees {
  /** Diferencial total entre compra y venta (fracción del precio). */
  spread: number;
  /** Comisión de compra y de venta (fracción) y mínimo en ₳. */
  buy: number;
  sell: number;
  min: number;
  /** Impuesto de compra (p. ej. transmisiones patrimoniales del 8 % en inmuebles). */
  buyTax?: number;
  /** Comisión de la agencia o casa de subastas al vender. */
  sellAgent?: number;
}

/**
 * Reglas de una clase de activo. El motor genérico se encarga de la valoración por
 * factores, la operativa y los impuestos; cada clase aporta generación, eventos y rentas.
 */
export interface ClassRules {
  id: AssetClassId;
  /** Frecuencia de revalorización genérica. */
  cadence: 'daily' | 'monthly' | 'none';
  liquidity: Liquidity;
  /** Contrapartida contable de las compras y ventas. */
  counterparty: AccountId;
  fees: Fees;
  /** 'live': se ejecuta al instante con precio en vivo (derivados sobre acciones).
   *  'close': la orden se ejecuta al precio de las 18:00 (valor liquidativo diario). */
  execution: 'live' | 'close';
  /** Solo opera con la bolsa abierta (productos en vivo). */
  exchangeHours?: boolean;
  /** Descuento al vender en el mercado secundario. */
  secondaryDiscount?: number;
  /** Días de comercialización al anunciar una venta [mín, máx]. */
  listingDays?: [number, number];
  /** Descuento de la venta rápida. */
  quickSaleDiscount?: number;
  /** Coste (₳) y días de cada nivel de investigación. */
  research?: (inst: Instrument) => {
    costs: [number, number, number];
    days: [number, number, number];
  };
  /** Motivo de bloqueo o null si está disponible. */
  unlock?: (state: SimState, inst: Instrument) => string | null;
  /** Catálogo inicial. */
  generate(ctx: Ctx): Instrument[];
  /** Nuevas oportunidades cada semana. */
  spawnWeekly?(ctx: Ctx): Instrument[];
  /** Precio propio (si no, se usa el genérico por factores). */
  reprice?(ctx: Ctx, inst: Instrument): void;
  /** Eventos y rentas mensuales (se llama para todos los instrumentos de la clase). */
  monthly?(ctx: Ctx, inst: Instrument, pos: Position | undefined): void;
  /** Tras una compra del jugador. */
  onBuy?(ctx: Ctx, inst: Instrument, pos: Position, qty: number): void;
  /** Tras vender todo. */
  onSold?(ctx: Ctx, inst: Instrument): void;
}
