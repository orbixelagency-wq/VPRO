/**
 * Libro contable de partida doble en céntimos enteros de la divisa local (áureo, AUR).
 * Todo movimiento de dinero es una transferencia entre cuentas: la suma de todos los
 * saldos es siempre 0. El "mundo" (resto de la economía) es la contrapartida general.
 */
export type Cents = number;

export type AccountId =
  | 'world' // empleadores, comercios, resto de la economía real
  | 'market' // resto de inversores, emisores y cámara de compensación
  | 'broker' // comisiones de intermediación
  | 'bank' // el banco del jugador (intereses, comisiones, préstamos)
  | 'gov' // hacienda del país de residencia
  | 'player:cash' // cuenta corriente (puede ir a descubierto)
  | 'player:savings' // cuenta remunerada
  | 'player:deposits' // depósitos a plazo
  | 'player:margin'; // garantías de derivados y productos apalancados

export const ACCOUNT_IDS: readonly AccountId[] = [
  'world',
  'market',
  'broker',
  'bank',
  'gov',
  'player:cash',
  'player:savings',
  'player:deposits',
  'player:margin',
];

export interface LedgerEntry {
  tick: number;
  from: AccountId;
  to: AccountId;
  amount: Cents;
  memo: string;
}

export interface LedgerState {
  balances: Record<AccountId, Cents>;
  /** Últimos movimientos del jugador (para el extracto bancario). */
  journal: LedgerEntry[];
}

const JOURNAL_LIMIT = 400;

export function createLedger(): LedgerState {
  const balances = {} as Record<AccountId, Cents>;
  for (const id of ACCOUNT_IDS) balances[id] = 0;
  return { balances, journal: [] };
}

export function toCents(amount: number): Cents {
  return Math.round(amount * 100);
}

export function fromCents(c: Cents): number {
  return c / 100;
}

export function transfer(
  ledger: LedgerState,
  tick: number,
  from: AccountId,
  to: AccountId,
  amount: Cents,
  memo: string,
): void {
  if (!Number.isInteger(amount)) throw new Error(`Importe no entero: ${amount} (${memo})`);
  if (amount < 0) throw new Error(`Importe negativo: ${amount} (${memo})`);
  if (amount === 0 || from === to) return;
  ledger.balances[from] -= amount;
  ledger.balances[to] += amount;
  if (from.startsWith('player') || to.startsWith('player')) {
    ledger.journal.push({ tick, from, to, amount, memo });
    if (ledger.journal.length > JOURNAL_LIMIT)
      ledger.journal.splice(0, ledger.journal.length - JOURNAL_LIMIT);
  }
}

export function ledgerSum(ledger: LedgerState): Cents {
  let s = 0;
  for (const id of ACCOUNT_IDS) s += ledger.balances[id];
  return s;
}
