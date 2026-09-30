/**
 * Artículos de la tienda de barrio. En la Fase 6 alimentan las necesidades del personaje;
 * hoy son pequeños gastos reales que pasan por el libro contable.
 */
export interface ShopItem {
  id: string;
  name: string;
  /** Precio en ₳. */
  price: number;
  description: string;
}

export const SHOP_ITEMS: readonly ShopItem[] = [
  { id: 'cafe', name: 'Café con leche', price: 1.4, description: 'Para empezar el día.' },
  {
    id: 'periodico',
    name: 'El Diario de Valmera',
    price: 2,
    description: 'Los titulares económicos de hoy.',
  },
  { id: 'bocadillo', name: 'Bocadillo de tortilla', price: 4.5, description: 'Comida de batalla.' },
  { id: 'fruta', name: 'Bolsa de fruta', price: 3.2, description: 'Naranjas de la Vega.' },
  { id: 'compra', name: 'Compra de la semana', price: 38, description: 'Lo básico para casa.' },
];
