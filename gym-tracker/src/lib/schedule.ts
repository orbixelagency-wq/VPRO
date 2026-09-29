import { PERIODIZATION, type DayType, type SessionId, type WeekPlan } from "../data/plan"

export type MatchDay = "sat" | "sun"

export type DayPlan = {
  date: string
  weekday: number
  md: string
  gym: SessionId | null
  gymTime?: string
  team?: string
  match: boolean
  dayType: DayType
  extra?: string
}

export const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
export const WEEKDAYS_LONG = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const MONTHS = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"]

// Semana tipo según el plan. Índice = día de la semana (0 = domingo).
type Slot = Omit<DayPlan, "date" | "weekday" | "md">

const SATURDAY: Slot[] = [
  { gym: null, match: false, dayType: "rest", extra: "Recuperación activa" },
  { gym: "G1", match: false, dayType: "gym" },
  { gym: "G2", gymTime: "17:00", team: "20:30", match: false, dayType: "gym" },
  { gym: "G3", match: false, dayType: "gym" },
  { gym: "G4", gymTime: "17:00", team: "20:30", match: false, dayType: "gym" },
  { gym: null, team: "20:00", match: false, dayType: "md1" },
  { gym: null, match: true, dayType: "match" },
]

const SUNDAY: Slot[] = [
  { gym: null, match: true, dayType: "match" },
  { gym: null, match: false, dayType: "rest", extra: "Recuperación activa" },
  { gym: "G1", gymTime: "17:00", team: "20:30", match: false, dayType: "gym" },
  { gym: "G3", match: false, dayType: "gym" },
  { gym: "G2", gymTime: "17:00", team: "20:30", match: false, dayType: "gym" },
  { gym: "G4", gymTime: "17:00", team: "20:30", match: false, dayType: "gym" },
  { gym: null, match: false, dayType: "md1", extra: "Activación opcional 20 min: 4 lanzados de 15 m al 90% + 2×3 CMJ" },
]

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function toISO(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

export function todayISO(): string {
  return toISO(new Date())
}

export function addDays(iso: string, n: number): string {
  const d = parseDate(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

export function diffDays(a: string, b: string): number {
  return Math.round((parseDate(a).getTime() - parseDate(b).getTime()) / 86400000)
}

export function formatDate(iso: string, withWeekday = false): string {
  const d = parseDate(iso)
  const base = `${d.getDate()} ${MONTHS[d.getMonth()]}`
  return withWeekday ? `${WEEKDAYS_LONG[d.getDay()]} ${base}` : base
}

export function mdLabel(weekday: number, matchDay: MatchDay): string {
  const matchIdx = matchDay === "sat" ? 6 : 0
  const since = (weekday - matchIdx + 7) % 7
  if (since === 0) return "MD"
  if (since <= 2) return `MD+${since}`
  return `MD-${7 - since}`
}

export function dayPlan(iso: string, matchDay: MatchDay): DayPlan {
  const weekday = parseDate(iso).getDay()
  const slot = (matchDay === "sat" ? SATURDAY : SUNDAY)[weekday]
  return { ...slot, date: iso, weekday, md: mdLabel(weekday, matchDay) }
}

/** Los 7 días del microciclo que contiene `iso`, empezando en MD+1. */
export function microcycle(iso: string, matchDay: MatchDay): DayPlan[] {
  const weekday = parseDate(iso).getDay()
  const firstIdx = matchDay === "sat" ? 0 : 1 // MD+1
  const offset = (weekday - firstIdx + 7) % 7
  const start = addDays(iso, -offset)
  return Array.from({ length: 7 }, (_, i) => dayPlan(addDays(start, i), matchDay))
}

/** Lunes de la semana de `iso`. */
export function mondayOf(iso: string): string {
  const wd = parseDate(iso).getDay()
  return addDays(iso, -((wd + 6) % 7))
}

/** Semana del plan (1–12) a partir de la fecha de inicio. 0 = antes de empezar, 13 = terminado. */
export function planWeek(iso: string, startISO: string): number {
  const d = diffDays(mondayOf(iso), mondayOf(startISO))
  if (d < 0) return 0
  return Math.min(13, Math.floor(d / 7) + 1)
}

export function weekPlan(week: number): WeekPlan | null {
  return PERIODIZATION.find((w) => w.week === week) ?? null
}
