/**
 * Horarios de apertura de los lugares visitables. Puro y testeable: depende solo del tick.
 */
import { dateFromTick, isHoliday, isTradingDay } from '../economy/calendar';
import type { LandmarkId } from './landmarks';

export interface OpenState {
  open: boolean;
  /** Texto para el aviso: "Abre a las 9:00", "Cerrado hasta el lunes"… */
  note: string;
}

interface Schedule {
  /** Horas [apertura, cierre) por día laborable, sábado y domingo/festivo. null = cerrado. */
  weekday: [number, number] | null;
  saturday: [number, number] | null;
  sunday: [number, number] | null;
  /** Solo abre los días de mercado. */
  trading?: boolean;
}

const SCHEDULES: Partial<Record<LandmarkId, Schedule>> = {
  tienda: { weekday: [8, 22], saturday: [8, 22], sunday: [9, 14] },
  banco: { weekday: [8, 15], saturday: null, sunday: null },
  bolsa: { weekday: [8, 18], saturday: null, sunday: null, trading: true },
};

const fmt = (h: number) => `${h}:00`;

export function openState(id: LandmarkId, tick: number): OpenState {
  const s = SCHEDULES[id];
  if (!s) return { open: true, note: '' };
  const d = dateFromTick(tick);
  const holiday = isHoliday(d);
  const today = (date: typeof d) => {
    const hol = isHoliday(date);
    if (s.trading && !isTradingDay(date)) return null;
    if (hol || date.weekday === 6) return s.sunday;
    if (date.weekday === 5) return s.saturday;
    return s.weekday;
  };
  const range = today(d);
  if (range && d.hour >= range[0] && d.hour < range[1])
    return { open: true, note: `Cierra a las ${fmt(range[1])}` };
  if (range && d.hour < range[0]) return { open: false, note: `Abre a las ${fmt(range[0])}` };
  // Busca el próximo día con horario.
  for (let k = 1; k <= 7; k++) {
    const next = dateFromTick(tick + k * 24);
    const r = today(next);
    if (r) {
      const when =
        k === 1
          ? 'mañana'
          : [
              'el lunes',
              'el martes',
              'el miércoles',
              'el jueves',
              'el viernes',
              'el sábado',
              'el domingo',
            ][next.weekday]!;
      return {
        open: false,
        note: `Cerrado · abre ${when} a las ${fmt(r[0])}${holiday ? ' (hoy es festivo)' : ''}`,
      };
    }
  }
  return { open: false, note: 'Cerrado' };
}
