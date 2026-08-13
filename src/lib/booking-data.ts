/** Datos de negocio para el sistema de reservas de Oblivion. */

export interface Local {
  id: string
  name: string
  zone: string
  address: string
}

export interface Service {
  id: string
  name: string
  duration: number // minutos
  price: number // euros
}

export interface Barber {
  id: string
  name: string
}

export const LOCALES: Local[] = [
  { id: "es-castell", name: "Es Castell", zone: "Villacarlos", address: "Ctra. de Sant Felip, 1" },
  { id: "mahon", name: "Mahón", zone: "Maó", address: "Av. de Fort de l'Eau, 167" },
  { id: "ciutadella", name: "Ciutadella", zone: "Ciutadella", address: "Carrer d'Eivissa, 25" },
]

export const SERVICES: Service[] = [
  { id: "corte", name: "Corte de tendencia", duration: 30, price: 18 },
  { id: "barba-ozono", name: "Barba con vapor de ozono", duration: 30, price: 16 },
  { id: "afeitado", name: "Afeitado a navaja", duration: 30, price: 17 },
  { id: "estetica", name: "Estética masculina", duration: 45, price: 25 },
  { id: "junior", name: "Corte júnior", duration: 30, price: 14 },
  { id: "ritual", name: "Ritual completo (corte + barba + tratamiento)", duration: 75, price: 39 },
]

export const BARBERS: Barber[] = [
  { id: "any", name: "Cualquier barbero disponible" },
  { id: "marc", name: "Marc" },
  { id: "toni", name: "Toni" },
  { id: "biel", name: "Biel" },
  { id: "nacho", name: "Nacho" },
]

export const localById = (id: string) => LOCALES.find((l) => l.id === id)
export const serviceById = (id: string) => SERVICES.find((s) => s.id === id)
export const barberById = (id: string) => BARBERS.find((b) => b.id === id)

export const STATUS_LABELS: Record<string, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  completada: "Completada",
  cancelada: "Cancelada",
}

/** Devuelve las próximas N fechas (YYYY-MM-DD) a partir de hoy. */
export function upcomingDates(days = 14): string[] {
  const out: string[] = []
  const now = new Date()
  for (let i = 0; i < days; i++) {
    const d = new Date(now)
    d.setDate(now.getDate() + i)
    out.push(d.toISOString().slice(0, 10))
  }
  return out
}

/** Franjas horarias base (cada 30 min). Los sábados cierran antes; domingo cerrado. */
export function slotsForDate(dateStr: string): string[] {
  const d = new Date(dateStr + "T00:00:00")
  const day = d.getDay() // 0 domingo, 6 sábado
  if (day === 0) return [] // domingo cerrado
  const end = day === 6 ? 14 : 20 // sábado hasta 14:00, resto hasta 20:00
  const slots: string[] = []
  for (let h = 9; h < end; h++) {
    for (const m of [0, 30]) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`)
    }
  }
  return slots
}

/** Formatea una fecha YYYY-MM-DD en español legible. */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("es-ES", {
    weekday: "short",
    day: "numeric",
    month: "short",
  })
}
