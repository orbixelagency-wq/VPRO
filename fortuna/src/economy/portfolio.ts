import { findCompany } from './generate';
import type { Cents } from './ledger';
import type { SimState } from './types';
import { getCountry } from './valuation';

export interface PortfolioSummary {
  cash: Cents;
  savings: Cents;
  deposits: Cents;
  stocks: Cents;
  bonds: Cents;
  debt: Cents;
  netWorth: Cents;
}

/** Valoración a precio de mercado (medio) de todo lo que posee el jugador. */
export function portfolioSummary(state: SimState): PortfolioSummary {
  const L = state.ledger.balances;
  const p = state.player;
  let stocks = 0;
  for (const [id, h] of Object.entries(p.stocks)) {
    const c = findCompany(state, id);
    if (!c) continue;
    const value = c.status === 'acquired' ? 0 : c.price * getCountry(state, c.country).fx * h.qty;
    stocks += value * 100;
  }
  let bonds = 0;
  for (const [id, h] of Object.entries(p.bonds)) {
    const b = state.bonds.find((x) => x.id === id);
    if (!b) continue;
    bonds += b.price * getCountry(state, b.country).fx * h.qty * 100;
  }
  const debt = p.loans.reduce((a, l) => a + l.outstanding, 0);
  const cash = L['player:cash'];
  const savings = L['player:savings'];
  const deposits = L['player:deposits'];
  const s = Math.round(stocks);
  const bd = Math.round(bonds);
  return {
    cash,
    savings,
    deposits,
    stocks: s,
    bonds: bd,
    debt,
    netWorth: cash + savings + deposits + s + bd - debt,
  };
}

export function netWorth(state: SimState): Cents {
  return portfolioSummary(state).netWorth;
}
