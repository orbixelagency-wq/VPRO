import { DAY_TYPES, FAT_PER_KG, PROTEIN_PER_KG, SESSIONS, type DayType, type Exercise, type WeekPlan } from "../data/plan"
import { addDays, diffDays, mondayOf } from "./schedule"
import type { CheckIn, GymLog, SetLog, State } from "./store"

export const round25 = (kg: number) => Math.round(kg / 2.5) * 2.5
export const fmt = (n: number, d = 0) => n.toLocaleString("es-ES", { minimumFractionDigits: d, maximumFractionDigits: d })

// ——— Nutrición ———

export function macros(dayType: DayType, kg: number) {
  const protein = Math.round(PROTEIN_PER_KG * kg)
  const carbs = Math.round(DAY_TYPES[dayType].carbsPerKg * kg)
  const fat = Math.round(FAT_PER_KG * kg)
  const kcal = Math.round((protein * 4 + carbs * 4 + fat * 9) / 50) * 50
  return { protein, carbs, fat, kcal }
}

// ——— Fuerza ———

/** 1RM estimado (Epley) contando las repeticiones en reserva. */
export function e1rm(kg: number, reps: number, rir = 0): number {
  const r = reps + rir
  if (r <= 1) return kg
  return kg * (1 + r / 30)
}

export function squatTarget(week: WeekPlan | null, rm: number) {
  if (!week?.squat) return null
  const [lo, hi] = week.squat.pct
  const kgLo = round25((rm * lo) / 100)
  const kgHi = round25((rm * hi) / 100)
  return {
    sets: week.squat.sets,
    reps: week.squat.reps,
    pctLabel: lo === hi ? `${lo}%` : `${lo}–${hi}%`,
    kgLabel: kgLo === kgHi ? `${fmt(kgLo, kgLo % 1 ? 1 : 0)} kg` : `${fmt(kgLo, kgLo % 1 ? 1 : 0)}–${fmt(kgHi, kgHi % 1 ? 1 : 0)} kg`,
    kg: kgLo,
  }
}

/** Series que tocan esta semana para un ejercicio (adaptación y descargas reducen volumen). */
export function setsFor(ex: Exercise, week: WeekPlan | null, reduce30 = false): number {
  let sets = ex.sets
  if (ex.periodized && week?.squat) sets = week.squat.sets
  else if (week && ex.scales) sets = Math.max(1, Math.round(ex.sets * week.volume))
  if (ex.id === "flying" && week && week.week >= 5 && week.week <= 7) sets += 1
  if (reduce30) sets = Math.max(1, Math.round(sets * 0.7))
  return sets
}

/** Última sesión registrada que incluya el ejercicio, anterior a `before`. */
export function lastSetsFor(gym: GymLog[], exerciseId: string, before: string): { date: string; sets: SetLog[] } | null {
  const logs = gym
    .filter((g) => g.date < before && g.sets[exerciseId]?.some((s) => s.done))
    .sort((a, b) => b.date.localeCompare(a.date))
  const l = logs[0]
  return l ? { date: l.date, sets: l.sets[exerciseId].filter((s) => s.done) } : null
}

/** Criterio de progresión del plan: todas las series con RIR ≥ 2 y recuperación en verde → +2,5–5 kg. */
export function progressionHint(prev: SetLog[] | undefined, recovery: Status): string | null {
  if (!prev?.length) return null
  const strength = prev.filter((s) => s.kg != null)
  if (!strength.length) return null
  const allRir2 = strength.every((s) => (s.rir ?? 0) >= 2)
  const top = Math.max(...strength.map((s) => s.kg ?? 0))
  if (allRir2 && recovery === "green") return `Sube a ${fmt(top + 2.5, 1)}–${fmt(top + 5, 1)} kg`
  if (allRir2 && recovery === "none") return `Si hoy estás en verde, sube a ${fmt(top + 2.5, 1)}–${fmt(top + 5, 1)} kg`
  if (allRir2) return `Recuperación no verde: mantén ${fmt(top, 1)} kg`
  return `Mantén ${fmt(top, 1)} kg hasta hacerlo con RIR 2`
}

export function bestE1rm(gym: GymLog[], exerciseId: string) {
  const points: { date: string; value: number }[] = []
  for (const g of gym) {
    const sets = g.sets[exerciseId]?.filter((s) => s.done && s.kg && s.reps)
    if (!sets?.length) continue
    const best = Math.max(...sets.map((s) => e1rm(s.kg!, s.reps!, s.rir ?? 0)))
    points.push({ date: g.date, value: Math.round(best * 10) / 10 })
  }
  return points.sort((a, b) => a.date.localeCompare(b.date))
}

// ——— Tests ———

/** Altura de salto a partir del tiempo de vuelo: h = 9,81 × t² / 8 (en cm). */
export function jumpHeight(flightMs: number): number {
  const t = flightMs / 1000
  return (9.81 * t * t) / 8 * 100
}

export function rsi(flightMs: number, contactMs: number): number {
  return jumpHeight(flightMs) / 100 / (contactMs / 1000)
}

// ——— Recuperación ———

export type Status = "green" | "yellow" | "red" | "none"

export function recoveryStatus(rec?: number): Status {
  if (rec == null) return "none"
  if (rec >= 67) return "green"
  if (rec >= 34) return "yellow"
  return "red"
}

export function wellnessSum(c?: CheckIn): number | null {
  if (!c) return null
  const vals = Object.values(c.wellness).filter((v): v is number => typeof v === "number")
  return vals.length === 5 ? vals.reduce((a, b) => a + b, 0) : null
}

export function wellnessBaseline(checkins: Record<string, CheckIn>, before: string): number | null {
  const sums = Object.entries(checkins)
    .filter(([d]) => d < before && diffDays(before, d) <= 28)
    .map(([, c]) => wellnessSum(c))
    .filter((v): v is number => v != null)
  if (sums.length < 3) return null
  return sums.reduce((a, b) => a + b, 0) / sums.length
}

export type Advice = { status: Status; title: string; detail: string; reduce30: boolean; swapToMobility: boolean }

/** Aplica las reglas de la sección H del plan al check-in del día. */
export function dailyAdvice(state: State, date: string): Advice {
  const c = state.checkins[date]
  const st = recoveryStatus(c?.recovery)
  const yesterday = state.checkins[addDays(date, -1)]
  const twoRed = st === "red" && recoveryStatus(yesterday?.recovery) === "red"
  const sum = wellnessSum(c)
  const base = wellnessBaseline(state.checkins, date)
  const wellnessDrop = sum != null && base != null && base - sum >= 4

  if (twoRed)
    return { status: "red", title: "Cambia el gimnasio por movilidad y técnica", detail: "Dos días seguidos en rojo. Hoy toca movilidad, técnica de carrera suave y dormir bien.", reduce30: true, swapToMobility: true }
  if (st === "red")
    return { status: "red", title: "Recuperación baja", detail: wellnessDrop ? "Rojo y bienestar por debajo de tu media: baja la carga hoy." : "Si mañana sigue en rojo, el gimnasio se cambia por movilidad.", reduce30: true, swapToMobility: false }
  if (st === "yellow" || wellnessDrop)
    return {
      status: "yellow",
      title: "Misma intensidad, 30% menos volumen",
      detail: wellnessDrop ? `Tu bienestar (${sum}/25) está 4 o más puntos por debajo de tu media (${fmt(base!, 1)}).` : "Recuperación en amarillo. Las series ya aparecen recortadas en tu sesión.",
      reduce30: true,
      swapToMobility: false,
    }
  if (st === "green") return { status: "green", title: "Plan normal", detail: "Recuperación en verde. Si todo sale con RIR 2, sube carga la semana que viene.", reduce30: false, swapToMobility: false }
  return { status: "none", title: "Haz el check-in de la mañana", detail: "Un minuto: recuperación de la Whoop y cómo te sientes.", reduce30: false, swapToMobility: false }
}

// ——— Carga semanal (RPE × min) ———

export function sessionLoads(state: State) {
  const items: { date: string; load: number; label: string }[] = []
  for (const g of state.gym) if (g.rpe && g.minutes) items.push({ date: g.date, load: g.rpe * g.minutes, label: SESSIONS[g.session].short })
  for (const l of state.loads) items.push({ date: l.date, load: l.rpe * l.minutes, label: l.kind === "match" ? "Partido" : l.kind === "team" ? "Equipo" : "Otro" })
  for (const m of state.matches) if (m.rpe && m.minutes && !state.loads.some((l) => l.kind === "match" && l.date === m.date)) items.push({ date: m.date, load: m.rpe * m.minutes, label: "Partido" })
  return items
}

export function weeklyLoads(state: State, weeks = 8, today: string) {
  const items = sessionLoads(state)
  const thisMonday = mondayOf(today)
  return Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisMonday, -7 * (weeks - 1 - i))
    const end = addDays(start, 7)
    const load = items.filter((x) => x.date >= start && x.date < end).reduce((a, b) => a + b.load, 0)
    return { start, load }
  })
}
