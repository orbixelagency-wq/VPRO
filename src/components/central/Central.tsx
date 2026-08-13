import { useEffect, useMemo, useState } from "react"
import { Logo } from "@/components/Logo"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  getAppointments,
  subscribe,
  updateStatus,
  removeAppointment,
  type Appointment,
  type AppointmentStatus,
} from "@/lib/appointments"
import {
  LOCALES,
  STATUS_LABELS,
  formatDate,
  localById,
  serviceById,
  barberById,
} from "@/lib/booking-data"
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Trash2,
  X,
  LogOut,
  Search,
  CalendarDays,
} from "lucide-react"

/** Código de acceso de la demo. En producción se validaría contra un backend. */
const ACCESS_CODE = "oblivion"
const AUTH_KEY = "oblivion.central.auth"

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  pendiente: "border-gold/50 text-gold",
  confirmada: "border-ember/60 text-ember-2",
  completada: "border-chalk/30 text-chalk/80",
  cancelada: "border-line text-steel line-through",
}

const todayStr = () => new Date().toISOString().slice(0, 10)

export function Central() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem(AUTH_KEY) === "1"
  )

  if (!authed) return <Gate onOk={() => setAuthed(true)} />
  return <Dashboard onLogout={() => setAuthed(false)} />
}

function Gate({ onOk }: { onOk: () => void }) {
  const [code, setCode] = useState("")
  const [error, setError] = useState(false)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (code.trim().toLowerCase() === ACCESS_CODE) {
      sessionStorage.setItem(AUTH_KEY, "1")
      onOk()
    } else {
      setError(true)
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-carbon px-6">
      <form
        onSubmit={submit}
        className="w-full max-w-sm border border-line bg-graphite p-8"
      >
        <Logo />
        <h1 className="mt-6 font-display text-2xl uppercase text-chalk">Central de citas</h1>
        <p className="mt-2 text-sm text-ash">
          Acceso del equipo de Oblivion. Introduce el código.
        </p>
        <input
          autoFocus
          type="password"
          value={code}
          onChange={(e) => {
            setCode(e.target.value)
            setError(false)
          }}
          placeholder="Código de acceso"
          className="vp-input mt-6"
        />
        {error && (
          <p className="mt-2 text-xs text-gold">Código incorrecto. (Pista demo: oblivion)</p>
        )}
        <Button type="submit" className="mt-5 w-full">
          Entrar
        </Button>
        <a
          href="#inicio"
          onClick={() => (window.location.hash = "")}
          className="mt-5 inline-flex items-center gap-2 text-xs text-steel transition-colors hover:text-ember"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Volver a la web
        </a>
      </form>
    </div>
  )
}

function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [items, setItems] = useState<Appointment[]>(() => getAppointments())
  const [localFilter, setLocalFilter] = useState("todos")
  const [statusFilter, setStatusFilter] = useState("todos")
  const [onlyToday, setOnlyToday] = useState(false)
  const [q, setQ] = useState("")

  useEffect(() => subscribe(() => setItems(getAppointments())), [])

  const stats = useMemo(() => {
    const t = todayStr()
    return {
      hoy: items.filter((a) => a.date === t && a.status !== "cancelada").length,
      pendientes: items.filter((a) => a.status === "pendiente").length,
      confirmadas: items.filter((a) => a.status === "confirmada").length,
      total: items.filter((a) => a.status !== "cancelada").length,
    }
  }, [items])

  const filtered = useMemo(() => {
    const t = todayStr()
    const query = q.trim().toLowerCase()
    return items.filter((a) => {
      if (localFilter !== "todos" && a.localId !== localFilter) return false
      if (statusFilter !== "todos" && a.status !== statusFilter) return false
      if (onlyToday && a.date !== t) return false
      if (
        query &&
        !(`${a.name} ${a.phone} ${a.email ?? ""}`.toLowerCase().includes(query))
      )
        return false
      return true
    })
  }, [items, localFilter, statusFilter, onlyToday, q])

  return (
    <div className="min-h-screen bg-carbon text-chalk">
      {/* Cabecera */}
      <header className="sticky top-0 z-20 border-b border-line bg-carbon/85 backdrop-blur-md">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Logo withText={false} />
            <div>
              <p className="font-display text-lg uppercase leading-none text-chalk">
                Central de citas
              </p>
              <p className="text-[0.6rem] uppercase tracking-[0.2em] text-steel">
                Panel del equipo
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="#inicio"
              onClick={() => (window.location.hash = "")}
              className="hidden items-center gap-2 text-xs text-ash transition-colors hover:text-ember sm:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Ver web
            </a>
            <button
              onClick={() => {
                sessionStorage.removeItem(AUTH_KEY)
                onLogout()
              }}
              className="inline-flex items-center gap-2 border border-line px-3 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-ash transition-colors hover:border-ember hover:text-ember"
            >
              <LogOut className="h-3.5 w-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {/* KPIs */}
        <div className="grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-4">
          {[
            { k: "Hoy", v: stats.hoy },
            { k: "Pendientes", v: stats.pendientes },
            { k: "Confirmadas", v: stats.confirmadas },
            { k: "Activas (total)", v: stats.total },
          ].map((s) => (
            <div key={s.k} className="bg-carbon p-5">
              <p className="font-display text-4xl text-brass">{s.v}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-steel">{s.k}</p>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-steel" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar nombre o teléfono"
              className="vp-input pl-9 sm:w-64"
            />
          </div>
          <Select value={localFilter} onChange={setLocalFilter}>
            <option value="todos">Todos los locales</option>
            {LOCALES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </Select>
          <Select value={statusFilter} onChange={setStatusFilter}>
            <option value="todos">Todos los estados</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </Select>
          <button
            onClick={() => setOnlyToday((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 border px-3 py-2.5 text-[0.7rem] font-semibold uppercase tracking-[0.14em] transition-colors",
              onlyToday
                ? "border-ember bg-ember/10 text-ember-2"
                : "border-line text-ash hover:border-ember/60"
            )}
          >
            <CalendarDays className="h-3.5 w-3.5" /> Solo hoy
          </button>
          <span className="ml-auto text-xs text-steel">
            {filtered.length} cita{filtered.length === 1 ? "" : "s"}
          </span>
        </div>

        {/* Lista */}
        <div className="mt-4 border border-line">
          {filtered.length === 0 ? (
            <div className="grid place-items-center px-6 py-20 text-center">
              <p className="font-display text-xl uppercase text-steel">Sin citas</p>
              <p className="mt-2 text-sm text-ash">
                Cuando alguien reserve en la web, aparecerá aquí al instante.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {filtered.map((a) => (
                <AppointmentRow key={a.id} appt={a} />
              ))}
            </ul>
          )}
        </div>

        <p className="mt-6 text-xs text-steel">
          Datos guardados en este navegador (demo). Para acceso multi‑dispositivo en
          tiempo real, se conecta a un backend (p. ej. Supabase) sin cambiar esta interfaz.
        </p>
      </main>
    </div>
  )
}

function AppointmentRow({ appt }: { appt: Appointment }) {
  const l = localById(appt.localId)
  const s = serviceById(appt.serviceId)
  const b = barberById(appt.barberId)
  return (
    <li className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
      {/* Cuándo */}
      <div className="sm:w-40">
        <p className="font-display text-lg uppercase leading-none text-chalk">
          {appt.time}
        </p>
        <p className="text-xs text-steel">{formatDate(appt.date)}</p>
      </div>

      {/* Detalle */}
      <div className="flex-1">
        <p className="font-medium text-chalk">
          {appt.name}{" "}
          <span className="text-steel">· {appt.phone}</span>
        </p>
        <p className="text-sm text-ash">
          {s?.name} · {l?.name} · {b?.name}
        </p>
        {appt.notes && <p className="mt-1 text-xs italic text-steel">“{appt.notes}”</p>}
      </div>

      {/* Estado */}
      <span
        className={cn(
          "shrink-0 border px-2.5 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em]",
          STATUS_STYLES[appt.status]
        )}
      >
        {STATUS_LABELS[appt.status]}
      </span>

      {/* Acciones */}
      <div className="flex shrink-0 items-center gap-1.5">
        <Action
          title="Confirmar"
          onClick={() => updateStatus(appt.id, "confirmada")}
          disabled={appt.status === "confirmada" || appt.status === "completada"}
        >
          <Check className="h-4 w-4" />
        </Action>
        <Action
          title="Completada"
          onClick={() => updateStatus(appt.id, "completada")}
          disabled={appt.status === "completada"}
        >
          <CheckCheck className="h-4 w-4" />
        </Action>
        <Action
          title="Cancelar"
          onClick={() => updateStatus(appt.id, "cancelada")}
          disabled={appt.status === "cancelada"}
        >
          <X className="h-4 w-4" />
        </Action>
        <Action
          title="Eliminar"
          onClick={() => {
            if (confirm("¿Eliminar esta cita definitivamente?")) removeAppointment(appt.id)
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Action>
      </div>
    </li>
  )
}

function Action({
  title,
  onClick,
  disabled,
  children,
}: {
  title: string
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "grid h-9 w-9 place-items-center border transition-colors",
        disabled
          ? "cursor-not-allowed border-line/50 text-steel/30"
          : "border-line text-ash hover:border-ember hover:text-ember"
      )}
    >
      {children}
    </button>
  )
}

function Select({
  value,
  onChange,
  children,
}: {
  value: string
  onChange: (v: string) => void
  children: React.ReactNode
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="vp-input w-auto"
    >
      {children}
    </select>
  )
}
