/**
 * Calendario del juego. 1 tick = 1 hora in-game. Año de 365 días (sin bisiestos),
 * el día 0 es lunes 1 de enero del año inicial.
 */
export const HOURS_PER_DAY = 24;
export const DAYS_PER_YEAR = 365;
export const START_YEAR = 2030;
export const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

/** Sesión bursátil: ticks de las 10:00 a las 17:00 (el tick de las 9:00 es la subasta de apertura). */
export const MARKET_OPEN_HOUR = 9;
export const MARKET_CLOSE_HOUR = 17;

export interface GameDate {
  year: number;
  month: number; // 0..11
  day: number; // 1..31
  hour: number;
  weekday: number; // 0 = lunes
  dayIndex: number;
  dayOfYear: number; // 0..364
}

const MONTH_START: number[] = (() => {
  const out: number[] = [];
  let acc = 0;
  for (const len of MONTH_LENGTHS) {
    out.push(acc);
    acc += len;
  }
  return out;
})();

export function dateFromTick(tick: number): GameDate {
  const dayIndex = Math.floor(tick / HOURS_PER_DAY);
  const hour = tick - dayIndex * HOURS_PER_DAY;
  const year = START_YEAR + Math.floor(dayIndex / DAYS_PER_YEAR);
  const dayOfYear = dayIndex % DAYS_PER_YEAR;
  let month = 11;
  for (let m = 0; m < 12; m++) {
    const next = MONTH_START[m + 1] ?? DAYS_PER_YEAR;
    if (dayOfYear < next) {
      month = m;
      break;
    }
  }
  const day = dayOfYear - (MONTH_START[month] ?? 0) + 1;
  return { year, month, day, hour, weekday: dayIndex % 7, dayIndex, dayOfYear };
}

export function tickFromDate(year: number, month: number, day: number, hour = 0): number {
  const dayIndex = (year - START_YEAR) * DAYS_PER_YEAR + (MONTH_START[month] ?? 0) + (day - 1);
  return dayIndex * HOURS_PER_DAY + hour;
}

/** Festivos bursátiles fijos (mes 0-based, día). */
const HOLIDAYS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], // Año nuevo
  [3, 14], // Día de la Fundación de Valmera
  [4, 1], // Día del Trabajo
  [9, 12], // Fiesta de la Travesía
  [11, 25], // Navidad
];

export function isHoliday(d: GameDate): boolean {
  return HOLIDAYS.some(([m, day]) => m === d.month && day === d.day);
}

export function isTradingDay(d: GameDate): boolean {
  return d.weekday < 5 && !isHoliday(d);
}

export function isMarketOpen(tick: number): boolean {
  const d = dateFromTick(tick);
  return isTradingDay(d) && d.hour >= MARKET_OPEN_HOUR && d.hour <= MARKET_CLOSE_HOUR;
}

export function isFirstDayOfMonth(d: GameDate): boolean {
  return d.day === 1;
}

export function daysInMonth(month: number): number {
  return MONTH_LENGTHS[month] ?? 30;
}

const MONTHS_ES = [
  'ene',
  'feb',
  'mar',
  'abr',
  'may',
  'jun',
  'jul',
  'ago',
  'sep',
  'oct',
  'nov',
  'dic',
] as const;
const WEEKDAYS_ES = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'] as const;

export function formatDate(tick: number, withHour = true): string {
  const d = dateFromTick(tick);
  const base = `${WEEKDAYS_ES[d.weekday]} ${d.day} ${MONTHS_ES[d.month]} ${d.year}`;
  return withHour ? `${base} · ${String(d.hour).padStart(2, '0')}:00` : base;
}

export function formatShortDate(dayIndex: number): string {
  const d = dateFromTick(dayIndex * HOURS_PER_DAY);
  return `${d.day} ${MONTHS_ES[d.month]} ${String(d.year).slice(2)}`;
}
