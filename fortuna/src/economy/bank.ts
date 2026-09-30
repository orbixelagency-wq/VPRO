import { HOURS_PER_DAY } from './calendar';
import { toCents, transfer, type Cents } from './ledger';
import { esNum } from './news';
import { discoverConcept } from './notebook';
import type { Loan, SimState, TermDeposit } from './types';
import { getCountry, homeCountry, riskFreeYield, TICKS_PER_YEAR } from './valuation';

export const OVERDRAFT_LIMIT: Cents = -50_000; // -500 ₳
export const OVERDRAFT_RATE = 0.18;
export const OVERDRAFT_FEE: Cents = 1_500;
export const INTEREST_WITHHOLDING = 0.19;

export function savingsRate(state: SimState): number {
  return Math.max(0, homeCountry(state).policyRate - 0.012);
}

export function depositRate(state: SimState, months: number): number {
  const home = homeCountry(state);
  return Math.max(0, riskFreeYield(home, months / 12, state.global) - 0.005);
}

export function loanRate(state: SimState): number {
  const home = homeCountry(state);
  const credit = state.player.creditScore;
  return home.policyRate + 0.045 + Math.max(0, (720 - credit) / 100) * 0.03;
}

/** Préstamo máximo concedible según ingresos y deudas actuales. */
export function maxLoan(state: SimState): Cents {
  const p = state.player;
  const income = p.job?.netMonthly ?? 0;
  const currentPayments = p.loans.reduce((a, l) => a + l.monthlyPayment, 0);
  // Regla del 35 %: la suma de cuotas no puede superar el 35 % de los ingresos.
  const capacity = Math.max(0, income * 0.35 - currentPayments);
  const r = loanRate(state) / 12;
  const n = 60;
  const principal = (capacity * (1 - Math.pow(1 + r, -n))) / r;
  return Math.max(0, Math.floor(principal / 10_000) * 10_000);
}

function annuity(principal: Cents, annualRate: number, months: number): Cents {
  const r = annualRate / 12;
  if (r === 0) return Math.ceil(principal / months);
  return Math.ceil((principal * r) / (1 - Math.pow(1 + r, -months)));
}

export interface BankResult {
  ok: boolean;
  message: string;
}

export function takeLoan(state: SimState, amount: Cents, months: number): BankResult {
  if (!Number.isInteger(amount) || amount <= 0) return { ok: false, message: 'Importe no válido' };
  if (months < 6 || months > 96) return { ok: false, message: 'Plazo entre 6 y 96 meses' };
  const limit = maxLoan(state);
  if (amount > limit && !state.settings.sandbox)
    return { ok: false, message: `El banco solo te concede hasta ${esNum(limit / 100, 0)} ₳` };
  const rate = loanRate(state);
  const loan: Loan = {
    id: state.nextId++,
    kind: 'personal',
    principal: amount,
    outstanding: amount,
    rate,
    monthlyPayment: annuity(amount, rate, months),
    monthsLeft: months,
    missedPayments: 0,
  };
  state.player.loans.push(loan);
  transfer(
    state.ledger,
    state.tick,
    'bank',
    'player:cash',
    amount,
    `Préstamo personal #${loan.id}`,
  );
  discoverConcept(state, 'prestamo');
  return { ok: true, message: `Préstamo concedido al ${esNum(rate * 100)} %` };
}

export function repayLoan(state: SimState, loanId: number, amount: Cents): BankResult {
  const loan = state.player.loans.find((l) => l.id === loanId);
  if (!loan) return { ok: false, message: 'Préstamo no encontrado' };
  const pay = Math.min(amount, loan.outstanding);
  if (pay <= 0) return { ok: false, message: 'Importe no válido' };
  if (state.ledger.balances['player:cash'] < pay)
    return { ok: false, message: 'Saldo insuficiente' };
  transfer(
    state.ledger,
    state.tick,
    'player:cash',
    'bank',
    pay,
    `Amortización anticipada #${loan.id}`,
  );
  loan.outstanding -= pay;
  if (loan.outstanding <= 0) state.player.loans = state.player.loans.filter((l) => l.id !== loanId);
  else loan.monthlyPayment = annuity(loan.outstanding, loan.rate, Math.max(1, loan.monthsLeft));
  return { ok: true, message: 'Amortización realizada' };
}

export function moveToSavings(state: SimState, amount: Cents): BankResult {
  if (amount <= 0 || state.ledger.balances['player:cash'] < amount)
    return { ok: false, message: 'Saldo insuficiente' };
  transfer(
    state.ledger,
    state.tick,
    'player:cash',
    'player:savings',
    amount,
    'Traspaso a cuenta remunerada',
  );
  discoverConcept(state, 'interes_compuesto');
  return { ok: true, message: 'Traspaso realizado' };
}

export function withdrawSavings(state: SimState, amount: Cents): BankResult {
  if (amount <= 0 || state.ledger.balances['player:savings'] < amount)
    return { ok: false, message: 'Saldo insuficiente' };
  transfer(
    state.ledger,
    state.tick,
    'player:savings',
    'player:cash',
    amount,
    'Retirada de cuenta remunerada',
  );
  return { ok: true, message: 'Retirada realizada' };
}

export function openDeposit(state: SimState, amount: Cents, months: number): BankResult {
  if (![3, 6, 12, 24, 36].includes(months)) return { ok: false, message: 'Plazo no disponible' };
  if (amount < 50_000) return { ok: false, message: 'Importe mínimo: 500 ₳' };
  if (state.ledger.balances['player:cash'] < amount)
    return { ok: false, message: 'Saldo insuficiente' };
  const dep: TermDeposit = {
    id: state.nextId++,
    principal: amount,
    rate: depositRate(state, months),
    startTick: state.tick,
    maturityTick: state.tick + Math.round((months / 12) * TICKS_PER_YEAR),
  };
  state.player.deposits.push(dep);
  transfer(
    state.ledger,
    state.tick,
    'player:cash',
    'player:deposits',
    amount,
    `Depósito a ${months} meses`,
  );
  discoverConcept(state, 'deposito');
  return { ok: true, message: `Depósito contratado al ${esNum(dep.rate * 100)} % TAE` };
}

/** Cancelación anticipada: se pierde el interés y se paga un 0,5 % de penalización. */
export function breakDeposit(state: SimState, id: number): BankResult {
  const dep = state.player.deposits.find((d) => d.id === id);
  if (!dep) return { ok: false, message: 'Depósito no encontrado' };
  const penalty = Math.round(dep.principal * 0.005);
  transfer(
    state.ledger,
    state.tick,
    'player:deposits',
    'player:cash',
    dep.principal,
    `Cancelación depósito #${id}`,
  );
  transfer(
    state.ledger,
    state.tick,
    'player:cash',
    'bank',
    penalty,
    `Penalización depósito #${id}`,
  );
  state.player.deposits = state.player.deposits.filter((d) => d.id !== id);
  return { ok: true, message: 'Depósito cancelado con penalización' };
}

function payInterest(state: SimState, gross: Cents, memo: string): void {
  if (gross <= 0) return;
  const withheld = Math.round(gross * INTEREST_WITHHOLDING);
  transfer(state.ledger, state.tick, 'bank', 'player:cash', gross, memo);
  transfer(
    state.ledger,
    state.tick,
    'player:cash',
    'gov',
    withheld,
    `Retención ${memo.toLowerCase()}`,
  );
  state.player.tax.interestYtd += gross;
  state.player.tax.withheldYtd += withheld;
}

/** Vencimientos diarios: depósitos, cupones y amortizaciones de bonos. */
export function stepBankDaily(state: SimState): void {
  const p = state.player;
  const matured = p.deposits.filter((d) => d.maturityTick <= state.tick);
  for (const d of matured) {
    const years = (d.maturityTick - d.startTick) / TICKS_PER_YEAR;
    const interest = Math.round(d.principal * (Math.pow(1 + d.rate, years) - 1));
    transfer(
      state.ledger,
      state.tick,
      'player:deposits',
      'player:cash',
      d.principal,
      `Vencimiento depósito #${d.id}`,
    );
    payInterest(state, interest, `Intereses depósito #${d.id}`);
  }
  if (matured.length) p.deposits = p.deposits.filter((d) => d.maturityTick > state.tick);

  for (const b of state.bonds) {
    if (b.status !== 'active') continue;
    const step = TICKS_PER_YEAR / b.frequency;
    // ¿Cae un cupón hoy? (fechas contadas hacia atrás desde el vencimiento)
    const since = (b.maturityTick - state.tick) % step;
    const couponToday = since >= 0 && since < HOURS_PER_DAY;
    const h = p.bonds[b.id];
    const fx = getCountry(state, b.country).fx;
    if (couponToday && h) {
      const gross = toCents(h.qty * ((b.coupon * 100) / b.frequency) * fx);
      if (gross > 0) {
        const withheld = Math.round(gross * INTEREST_WITHHOLDING);
        transfer(state.ledger, state.tick, 'market', 'player:cash', gross, `Cupón ${b.id}`);
        transfer(
          state.ledger,
          state.tick,
          'player:cash',
          'gov',
          withheld,
          `Retención cupón ${b.id}`,
        );
        p.tax.interestYtd += gross;
        p.tax.withheldYtd += withheld;
      }
    }
    if (b.maturityTick <= state.tick + HOURS_PER_DAY) {
      b.status = 'matured';
      b.price = 100;
      if (h) {
        const redemption = toCents(h.qty * 100 * fx);
        transfer(
          state.ledger,
          state.tick,
          'market',
          'player:cash',
          redemption,
          `Amortización ${b.id}`,
        );
        p.tax.realizedGainsYtd += Math.round(redemption - h.avgCost * h.qty);
        delete p.bonds[b.id];
      }
    }
  }
}

/** Nómina, gastos de vida, intereses, cuotas de préstamos y descubierto. */
export function stepBankMonthly(state: SimState): void {
  const p = state.player;
  const L = state.ledger;
  const home = homeCountry(state);
  if (p.job)
    transfer(L, state.tick, 'world', 'player:cash', p.job.netMonthly, `Nómina ${p.job.employer}`);
  if (p.monthlyExpenses > 0) {
    transfer(
      L,
      state.tick,
      'player:cash',
      'world',
      p.monthlyExpenses,
      'Alquiler, comida y facturas',
    );
    // Los gastos de vida siguen a la inflación.
    p.monthlyExpenses = Math.round(p.monthlyExpenses * Math.pow(1 + home.inflation, 1 / 12));
    if (home.inflation > 0.01) discoverConcept(state, 'inflacion');
  }
  const savings = L.balances['player:savings'];
  if (savings > 0)
    payInterest(
      state,
      Math.round((savings * savingsRate(state)) / 12),
      'Intereses cuenta remunerada',
    );

  for (const loan of p.loans) {
    const interest = Math.round((loan.outstanding * loan.rate) / 12);
    const payment = Math.min(loan.monthlyPayment, loan.outstanding + interest);
    if (L.balances['player:cash'] - payment < OVERDRAFT_LIMIT && !state.settings.sandbox) {
      // Impago de cuota: intereses de demora y castigo al historial crediticio.
      loan.outstanding += interest + 3_000;
      loan.missedPayments++;
      p.creditScore = Math.max(300, p.creditScore - 45);
      state.outbox.push({
        type: 'warning',
        tick: state.tick,
        message: `Cuota impagada del préstamo #${loan.id} (${loan.missedPayments}/3)`,
      });
      continue;
    }
    transfer(L, state.tick, 'player:cash', 'bank', payment, `Cuota préstamo #${loan.id}`);
    loan.outstanding = Math.max(0, loan.outstanding + interest - payment);
    loan.monthsLeft = Math.max(0, loan.monthsLeft - 1);
    if (loan.missedPayments === 0) p.creditScore = Math.min(850, p.creditScore + 2);
  }
  p.loans = p.loans.filter((l) => l.outstanding > 0);

  const cash = L.balances['player:cash'];
  if (cash < 0) {
    const interest = Math.round((-cash * OVERDRAFT_RATE) / 12);
    transfer(
      L,
      state.tick,
      'player:cash',
      'bank',
      interest + OVERDRAFT_FEE,
      'Intereses y comisión de descubierto',
    );
    p.creditScore = Math.max(300, p.creditScore - 8);
    discoverConcept(state, 'descubierto');
  }
  checkPersonalBankruptcy(state);
}

/** Bancarrota personal: impagos reiterados o descubierto fuera de control. */
export function checkPersonalBankruptcy(state: SimState): void {
  const p = state.player;
  if (p.bankrupt || state.settings.sandbox) return;
  // Las hipotecas impagadas se resuelven ejecutando el inmueble, no con la bancarrota.
  const defaulted = p.loans.some((l) => l.kind !== 'mortgage' && l.missedPayments >= 3);
  if (state.ledger.balances['player:cash'] < OVERDRAFT_LIMIT) {
    p.overdraftMonths++;
    state.outbox.push({
      type: 'warning',
      tick: state.tick,
      message: `Descubierto por encima del límite (${p.overdraftMonths}/3): el banco exige que regularices tu cuenta`,
    });
  } else p.overdraftMonths = 0;
  if (defaulted || p.overdraftMonths >= 3) {
    p.bankrupt = true;
    state.outbox.push({
      type: 'warning',
      tick: state.tick,
      message: 'Bancarrota personal: el banco ejecuta tus deudas',
    });
  }
}

const TAX_BRACKETS: ReadonlyArray<readonly [number, number]> = [
  [600_000, 0.19],
  [5_000_000, 0.21],
  [20_000_000, 0.23],
  [Number.POSITIVE_INFINITY, 0.27],
];

export function capitalGainsTax(base: Cents): Cents {
  let remaining = base;
  let prev = 0;
  let tax = 0;
  for (const [limit, rate] of TAX_BRACKETS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, limit - prev);
    tax += slice * rate;
    remaining -= slice;
    prev = limit;
  }
  return Math.round(tax);
}

/** Liquidación anual (1 de enero): ganancias patrimoniales del año anterior. */
export function stepTaxYearly(state: SimState): void {
  const t = state.player.tax;
  const net = t.realizedGainsYtd - t.lossCarryForward;
  if (net > 0) {
    const due = capitalGainsTax(net);
    transfer(
      state.ledger,
      state.tick,
      'player:cash',
      'gov',
      due,
      'Impuesto sobre ganancias patrimoniales',
    );
    t.paidTotal += due;
    t.lossCarryForward = 0;
    state.outbox.push({
      type: 'warning',
      tick: state.tick,
      message: `Hacienda: pagas ${esNum(due / 100)} ₳ por tus ganancias del año`,
    });
    discoverConcept(state, 'impuestos');
  } else {
    t.lossCarryForward = -net;
  }
  t.paidTotal += t.withheldYtd;
  t.realizedGainsYtd = 0;
  t.dividendsYtd = 0;
  t.interestYtd = 0;
  t.withheldYtd = 0;
  // Revisión salarial parcial con la inflación.
  const p = state.player;
  if (p.job)
    p.job.netMonthly = Math.round(
      p.job.netMonthly * (1 + Math.max(0, homeCountry(state).inflation) * 0.7),
    );
}
