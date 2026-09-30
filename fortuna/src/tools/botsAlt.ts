/**
 * Bots que invierten en el catálogo de la Fase 2. Sirven para detectar atajos de dinero
 * infinito y comprobar que el riesgo se paga (o se cobra) como en la vida real.
 */
import { fromCents } from '../economy/ledger';
import { netWorth } from '../economy/portfolio';
import { applyCommand } from '../economy/sim';
import type { SimState } from '../economy/types';
import { DERIVATIVES_QUIZ } from '../data/quiz';
import { maxMortgage } from '../investments/engine';
import type { Instrument } from '../investments/types';
import type { Strategy } from './bots';

const cash = (s: SimState) =>
  fromCents(
    s.ledger.balances['player:cash'] -
      Math.max(0, s.player.tax.realizedGainsYtd - s.player.tax.lossCarryForward) * 0.25,
  );
const expenses = (s: SimState) => fromCents(s.player.monthlyExpenses);
const open = (s: SimState, cls: Instrument['cls']) =>
  s.inv.instruments.filter((i) => i.cls === cls && i.status === 'open' && !s.inv.positions[i.id]);
const aur = (s: SimState, i: Instrument) =>
  i.price * (s.countries.find((c) => c.id === i.ccy)?.fx ?? 1);

export const ALT_STRATEGIES: Strategy[] = [
  {
    id: 'casero',
    name: 'Casero con hipoteca (ahorra la entrada y alquila)',
    onMonth(s) {
      const spare = cash(s) - expenses(s) * 2;
      if (spare < 3000) return;
      // El piso más rentable que pueda pagar con un 80 % de hipoteca.
      const candidates = open(s, 'realestate')
        .filter((i) => i.yield > 0.05 && aur(s, i) * 0.3 < spare)
        .sort((a, b) => b.yield - a.yield);
      for (const c of candidates.slice(0, 5)) {
        if (maxMortgage(s, c, 25) >= Math.round(aur(s, c) * 0.8 * 100)) {
          applyCommand(s, { type: 'invBuy', id: c.id, qty: 1, mortgage: { ltv: 0.8, years: 25 } });
          return;
        }
      }
    },
  },
  {
    id: 'cripto',
    name: 'Especulador cripto (todo a los tokens de moda)',
    onMonth(s, rng) {
      const spare = cash(s) - expenses(s) * 1.1;
      if (spare < 100) return;
      const tokens = open(s, 'crypto').filter(
        (i) => i.sub === 'memecoin' || i.attrs['launched'] === 'Nuevo lanzamiento',
      );
      for (let k = 0; k < 3 && tokens.length; k++) {
        const t = rng.pick(tokens);
        const qty = Math.floor(spare / 3 / (aur(s, t) * 1.05));
        if (qty > 0) applyCommand(s, { type: 'invBuy', id: t.id, qty });
      }
    },
  },
  {
    id: 'futuros',
    name: 'Apalancado en futuros (largo en el índice a 12x)',
    onMonth(s) {
      if (!s.inv.unlocks.derivatives && netWorth(s) >= 500_000)
        applyCommand(s, {
          type: 'unlockDerivatives',
          answers: DERIVATIVES_QUIZ.map((q) => q.answer),
        });
      if (!s.inv.unlocks.derivatives) {
        // Mientras tanto ahorra.
        return;
      }
      const fut = s.inv.instruments.find(
        (i) => i.cls === 'future' && i.attrs['underlying'] === 'AUR20',
      );
      if (!fut || s.inv.positions[fut.id]) return;
      const perContract = aur(s, fut) * 0.08;
      const qty = Math.floor((cash(s) - expenses(s)) / perContract);
      if (qty > 0) applyCommand(s, { type: 'invOpen', id: fut.id, direction: 'long', qty });
    },
  },
  {
    id: 'p2p',
    name: 'Prestamista P2P diversificado',
    onMonth(s, rng) {
      const spare = cash(s) - expenses(s) * 1.5;
      if (spare < 100) return;
      const loans = open(s, 'p2p').filter(
        (i) => i.attrs['rating'] === 'B' || i.attrs['rating'] === 'C',
      );
      const n = Math.min(loans.length, Math.floor(spare / 50));
      for (let k = 0; k < n; k++)
        applyCommand(s, { type: 'invBuy', id: rng.pick(loans).id, qty: 2 });
    },
  },
  {
    id: 'coleccionista',
    name: 'Coleccionista impulsivo (compra lo que le gusta)',
    onMonth(s, rng) {
      const spare = cash(s) - expenses(s) * 1.5;
      if (spare < 500) return;
      const items = open(s, 'collectible').filter((i) => aur(s, i) * 1.2 < spare);
      if (items.length) applyCommand(s, { type: 'invBuy', id: rng.pick(items).id, qty: 1 });
      // Vende en subasta lo que más se ha revalorizado.
      for (const [id, pos] of Object.entries(s.inv.positions)) {
        const inst = s.inv.instruments.find((i) => i.id === id);
        if (inst?.cls === 'collectible' && !pos.selling && inst.price * 100 > pos.cost * 1.5)
          applyCommand(s, { type: 'invSell', id, qty: 1 });
      }
    },
  },
];
