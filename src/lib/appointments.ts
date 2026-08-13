/**
 * Almacén de citas de Oblivion.
 *
 * Persistencia en localStorage con un pequeño pub/sub para que la web de
 * reserva y la "central" del equipo se mantengan sincronizadas (incluso entre
 * pestañas). En producción, este módulo se sustituiría por llamadas a un
 * backend real (p. ej. Supabase) manteniendo la misma interfaz.
 */

export type AppointmentStatus = "pendiente" | "confirmada" | "completada" | "cancelada"

export interface Appointment {
  id: string
  createdAt: number
  localId: string
  serviceId: string
  barberId: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  name: string
  phone: string
  email?: string
  notes?: string
  status: AppointmentStatus
}

const KEY = "oblivion.appointments.v1"
const EVENT = "oblivion:appointments"

function read(): Appointment[] {
  if (typeof localStorage === "undefined") return []
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Appointment[]) : []
  } catch {
    return []
  }
}

function write(list: Appointment[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
  window.dispatchEvent(new CustomEvent(EVENT))
}

export function getAppointments(): Appointment[] {
  return read().sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
}

export function createAppointment(
  data: Omit<Appointment, "id" | "createdAt" | "status"> &
    Partial<Pick<Appointment, "status">>
): Appointment {
  const appt: Appointment = {
    ...data,
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `a_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
    status: data.status ?? "pendiente",
  }
  const list = read()
  list.push(appt)
  write(list)
  return appt
}

export function updateStatus(id: string, status: AppointmentStatus) {
  const list = read().map((a) => (a.id === id ? { ...a, status } : a))
  write(list)
}

export function removeAppointment(id: string) {
  write(read().filter((a) => a.id !== id))
}

/** ¿Está ocupada esa franja en ese local/fecha? (ignora canceladas) */
export function isSlotTaken(localId: string, date: string, time: string): boolean {
  return read().some(
    (a) =>
      a.localId === localId &&
      a.date === date &&
      a.time === time &&
      a.status !== "cancelada"
  )
}

/** Suscripción a cambios (misma pestaña vía CustomEvent, otras vía storage). */
export function subscribe(cb: () => void): () => void {
  const onEvent = () => cb()
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) cb()
  }
  window.addEventListener(EVENT, onEvent)
  window.addEventListener("storage", onStorage)
  return () => {
    window.removeEventListener(EVENT, onEvent)
    window.removeEventListener("storage", onStorage)
  }
}
