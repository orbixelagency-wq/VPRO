import { HOME_COUNTRY_ID } from '../data/countries';
import {
  breakDeposit,
  moveToSavings,
  openDeposit,
  repayLoan,
  stepBankDaily,
  stepBankMonthly,
  stepTaxYearly,
  takeLoan,
  withdrawSavings,
} from './bank';
import {
  DAYS_PER_YEAR,
  HOURS_PER_DAY,
  MARKET_CLOSE_HOUR,
  MARKET_OPEN_HOUR,
  dateFromTick,
  isTradingDay,
} from './calendar';
import { stepCorporateDaily } from './companies';
import { createPlayer, createWorld, DEFAULT_SETTINGS } from './generate';
import { toCents, transfer, type Cents } from './ledger';
import { maybeStartShock, stepCentralBanks, stepFearDaily, stepMacroMonthly } from './macro';
import { marketClose, marketOpen, marketTick } from './market';
import { dailyCorporateNews, resolveRumors } from './news';
import { discoverConcept } from './notebook';
import { netWorth } from './portfolio';
import type { SimEvent, SimSettings, SimState } from './types';
import { cancelOrder, placeOrder, processOrders } from './trading';

/** Tick en el que empieza la partida: tras un año de historia simulada. */
export const GAME_START_TICK = DAYS_PER_YEAR * HOURS_PER_DAY;

export interface NewGameOptions {
  seed: number;
  playerName?: string;
  settings?: Partial<SimSettings>;
  /** Dinero inicial en ₳. */
  startingCash?: number;
  netSalary?: number;
  monthlyExpenses?: number;
}

/** Crea una partida nueva: genera el mundo, simula un año de historia y crea al jugador. */
export function newGame(opts: NewGameOptions): SimState {
  const state = createWorld(opts.seed, { ...DEFAULT_SETTINGS, ...opts.settings });
  // Año de historia previa (sin jugador) para que haya gráficos y noticias.
  while (state.tick < GAME_START_TICK) step(state);
  state.outbox = [];
  state.news = state.news.slice(-40);
  state.player = createPlayer(opts.playerName ?? 'Jugador');
  state.player.job = {
    title: 'Mozo de almacén',
    netMonthly: toCents(opts.netSalary ?? 1_180),
    employer: 'Logística Rumbo',
  };
  state.player.monthlyExpenses = toCents(opts.monthlyExpenses ?? 890);
  transfer(
    state.ledger,
    state.tick,
    'world',
    'player:cash',
    toCents(opts.startingCash ?? 600),
    'Ahorros iniciales',
  );
  state.player.netWorthHistory.push(netWorth(state));
  return state;
}

/** Avanza la simulación una hora. Todo es determinista respecto a la semilla y los comandos. */
export function step(state: SimState): void {
  state.tick++;
  const d = dateFromTick(state.tick);
  const trading = isTradingDay(d);

  if (d.hour === 0) {
    if (d.day === 1) {
      if (d.month === 0 && d.dayOfYear === 0) stepTaxYearly(state);
      stepMacroMonthly(state);
      stepBankMonthly(state);
    }
    stepCentralBanks(state);
    maybeStartShock(state);
    stepBankDaily(state);
  }
  if (d.hour === 8) {
    const rumors = resolveRumors(state);
    stepCorporateDaily(state, d.dayIndex, trading, rumors);
    dailyCorporateNews(state);
  }
  if (trading && d.hour === MARKET_OPEN_HOUR) {
    marketOpen(state);
    processOrders(state);
  } else if (trading && d.hour > MARKET_OPEN_HOUR && d.hour <= MARKET_CLOSE_HOUR) {
    marketTick(state);
    processOrders(state);
    if (d.hour === MARKET_CLOSE_HOUR) {
      const ret = marketClose(state);
      stepFearDaily(state, ret);
    }
  }
  if (!trading && d.hour === MARKET_CLOSE_HOUR) stepFearDaily(state, 0);
  if (d.hour === 23 && state.tick > GAME_START_TICK) {
    state.player.netWorthHistory.push(netWorth(state));
    if (state.player.netWorthHistory.length === 365 * 2) discoverConcept(state, 'ciclo');
  }
}

export function stepHours(state: SimState, hours: number): void {
  for (let i = 0; i < hours; i++) step(state);
}

export function drainEvents(state: SimState): SimEvent[] {
  const out = state.outbox;
  state.outbox = [];
  return out;
}

/** Comandos del jugador. Son la única vía por la que el jugador altera la simulación. */
export type PlayerCommand =
  | {
      type: 'order';
      side: 'buy' | 'sell';
      asset: 'stock' | 'bond';
      id: string;
      qty: number;
      limit?: number;
    }
  | { type: 'cancelOrder'; orderId: number }
  | { type: 'toSavings'; amount: number }
  | { type: 'fromSavings'; amount: number }
  | { type: 'openDeposit'; amount: number; months: number }
  | { type: 'breakDeposit'; depositId: number }
  | { type: 'takeLoan'; amount: number; months: number }
  | { type: 'repayLoan'; loanId: number; amount: number };

export interface CommandResult {
  ok: boolean;
  message: string;
}

/** Los importes de los comandos llegan en ₳ y se convierten a céntimos. */
export function applyCommand(state: SimState, cmd: PlayerCommand): CommandResult {
  const c = (x: number): Cents => toCents(x);
  switch (cmd.type) {
    case 'order':
      return placeOrder(state, {
        kind: cmd.side,
        asset: cmd.asset,
        assetId: cmd.id,
        qty: cmd.qty,
        limit: cmd.limit,
      });
    case 'cancelOrder':
      return cancelOrder(state, cmd.orderId)
        ? { ok: true, message: 'Orden cancelada' }
        : { ok: false, message: 'Orden no encontrada' };
    case 'toSavings':
      return moveToSavings(state, c(cmd.amount));
    case 'fromSavings':
      return withdrawSavings(state, c(cmd.amount));
    case 'openDeposit':
      return openDeposit(state, c(cmd.amount), cmd.months);
    case 'breakDeposit':
      return breakDeposit(state, cmd.depositId);
    case 'takeLoan':
      return takeLoan(state, c(cmd.amount), cmd.months);
    case 'repayLoan':
      return repayLoan(state, cmd.loanId, c(cmd.amount));
  }
}

export function homeIndex(state: SimState) {
  return state.indices.find((i) => i.id === 'AUR20');
}

export const HOME = HOME_COUNTRY_ID;
