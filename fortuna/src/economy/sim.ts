import { HOME_COUNTRY_ID } from '../data/countries';
import { SHOP_ITEMS } from '../data/shop';
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
import {
  cancelCatalogOrder,
  cancelSale,
  closeLeveraged,
  investmentsDaily,
  investmentsMonthly,
  investmentsWeekly,
  investmentsYearly,
  openLeveraged,
  placeCatalogBuy,
  placeCatalogSell,
  startResearch,
} from '../investments/engine';
import { unlockDerivatives } from '../investments/quiz';

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
  // La vida del jugador empieza a las 10 de la mañana del 1 de enero.
  while (dateFromTick(state.tick).hour < 10) step(state);
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
  // Catálogo de inversiones: valor liquidativo diario, semana y mes.
  if (d.hour === 18) investmentsDaily(state, trading);
  if (d.hour === 1 && d.day === 1) investmentsMonthly(state);
  if (d.hour === 2 && d.dayOfYear === 0) investmentsYearly(state);
  if (d.hour === 12 && d.weekday === 5) investmentsWeekly(state);
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
  | { type: 'repayLoan'; loanId: number; amount: number }
  // Catálogo de inversiones (Fase 2)
  | { type: 'invBuy'; id: string; qty: number; mortgage?: { ltv: number; years: number } }
  | { type: 'invSell'; id: string; qty: number; quick?: boolean }
  | { type: 'invCancelSale'; id: string }
  | { type: 'invCancelOrder'; orderId: number }
  | { type: 'invOpen'; id: string; direction: 'long' | 'short'; qty: number }
  | { type: 'invClose'; id: string }
  | { type: 'invResearch'; id: string }
  | { type: 'unlockDerivatives'; answers: number[] }
  // Vida en la ciudad (Fase 4)
  | { type: 'purchase'; item: string }
  /** Deja pasar el tiempo (dormir, esperar) hasta la próxima hora dada del reloj. */
  | { type: 'waitUntil'; hour: number };

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
    case 'invBuy':
      return placeCatalogBuy(state, cmd.id, cmd.qty, cmd.mortgage);
    case 'invSell':
      return placeCatalogSell(state, cmd.id, cmd.qty, cmd.quick ? 'quick' : 'normal');
    case 'invCancelSale':
      return cancelSale(state, cmd.id);
    case 'invCancelOrder':
      return cancelCatalogOrder(state, cmd.orderId);
    case 'invOpen':
      return openLeveraged(state, cmd.id, cmd.direction, cmd.qty);
    case 'invClose':
      return closeLeveraged(state, cmd.id);
    case 'invResearch':
      return startResearch(state, cmd.id);
    case 'unlockDerivatives':
      return unlockDerivatives(state, cmd.answers);
    case 'purchase': {
      const item = SHOP_ITEMS.find((i) => i.id === cmd.item);
      if (!item) return { ok: false, message: 'Ese artículo no existe' };
      if (state.player.bankrupt) return { ok: false, message: 'Estás en quiebra' };
      transfer(state.ledger, state.tick, 'player:cash', 'world', c(item.price), item.name);
      return { ok: true, message: `${item.name}: ${item.price.toFixed(2).replace('.', ',')} ₳` };
    }
    case 'waitUntil': {
      const hour = Math.max(0, Math.min(23, Math.floor(cmd.hour)));
      let hours = 0;
      do {
        step(state);
        hours++;
      } while (dateFromTick(state.tick).hour !== hour && hours < 24);
      return { ok: true, message: `Han pasado ${hours} horas` };
    }
  }
}

export function homeIndex(state: SimState) {
  return state.indices.find((i) => i.id === 'AUR20');
}

export const HOME = HOME_COUNTRY_ID;
