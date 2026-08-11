import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { X, Check, Phone, ArrowRight, ArrowLeft } from "lucide-react"
import { LOCATIONS, SERVICE_GROUPS, CONTACT, type Location } from "@/lib/content"

/* ---------- contexto ---------- */
const BookingCtx = createContext<(preset?: string) => void>(() => {})
export const useBooking = () => useContext(BookingCtx)

const ALL_SERVICES = SERVICE_GROUPS.flatMap((g) =>
  g.items.map((s) => (s.alias ? `${s.name} · ${s.alias}` : s.name))
)

/* ---------- utilidades de horario ---------- */
const pad = (n: number) => String(n).padStart(2, "0")
const toLabel = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

/** Genera franjas de 30 min según el horario del local y el día elegido. */
function slotsFor(loc: Location, dateStr: string): string[] {
  if (!dateStr) return []
  const day = new Date(`${dateStr}T00:00:00`).getDay()
  const win = loc.weekly[day]
  if (!win) return []
  const out: string[] = []
  for (let m = win.open; m <= win.close - 30; m += 30) out.push(toLabel(m))
  return out
}

const todayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/* ---------- proveedor + modal ---------- */
export function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const openBooking = (preset?: string) => {
    if (preset) setForm((f) => ({ ...f, service: preset }))
    setStep(1)
    setDone(false)
    setOpen(true)
  }

  const [step, setStep] = useState(1)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState({
    place: "Girona",
    service: ALL_SERVICES[0],
    date: "",
    time: "",
    name: "",
    phone: "",
  })

  const loc = useMemo(
    () => LOCATIONS.find((l) => l.city === form.place) ?? LOCATIONS[0],
    [form.place]
  )
  const slots = useMemo(() => slotsFor(loc, form.date), [loc, form.date])

  // cerrar con Esc + bloquear scroll de fondo
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    document.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    dialogRef.current?.focus()
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [open])

  const canNext =
    step === 1
      ? !!form.place && !!form.service
      : step === 2
      ? !!form.date && !!form.time
      : !!form.name && !!form.phone

  const submit = () => {
    const subject = `Reserva ${form.place} — ${form.service}`
    const body = [
      "Hola Scoundrels, quiero reservar cita:",
      "",
      `Local: ${form.place}`,
      `Servicio: ${form.service}`,
      `Día: ${form.date}`,
      `Hora: ${form.time}`,
      `Nombre: ${form.name}`,
      `Teléfono: ${form.phone}`,
    ].join("\n")
    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`
    setDone(true)
  }

  const set =
    (k: keyof typeof form) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement
      >
    ) => {
      const v = e.target.value
      setForm((f) => ({
        ...f,
        [k]: v,
        // si cambia local o fecha, resetea la hora
        ...(k === "place" || k === "date" ? { time: "" } : {}),
      }))
    }

  return (
    <BookingCtx.Provider value={openBooking}>
      {children}

      {open && (
        <div
          className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Reserva online"
        >
          <button
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            aria-label="Cerrar"
            onClick={() => setOpen(false)}
          />
          <div
            ref={dialogRef}
            tabIndex={-1}
            className="relative z-10 max-h-[92vh] w-full overflow-y-auto rounded-t-lg border border-line bg-ink-2 outline-none sm:max-w-lg sm:rounded-lg"
          >
            {/* cabecera */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <p className="font-cond text-[0.72rem] uppercase tracking-ticket text-neon">
                  Reserva online
                </p>
                <p className="font-script text-2xl leading-none text-bone">
                  Tu #momentoscoundrels
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="grid h-9 w-9 place-items-center rounded-sm border border-line text-bone-dim transition-colors hover:border-neon hover:text-neon"
              >
                <X size={18} />
              </button>
            </div>

            {done ? (
              <Done place={form.place} onClose={() => setOpen(false)} loc={loc} />
            ) : (
              <div className="px-6 py-6">
                {/* pasos */}
                <Steps step={step} />

                {step === 1 && (
                  <div className="space-y-5">
                    <Field label="Local">
                      <div className="grid grid-cols-2 gap-3">
                        {LOCATIONS.map((l) => (
                          <button
                            key={l.city}
                            onClick={() =>
                              setForm((f) => ({ ...f, place: l.city, time: "" }))
                            }
                            className={
                              "rounded-sm border px-4 py-3 text-left font-cond font-700 uppercase tracking-wide transition-colors " +
                              (form.place === l.city
                                ? "border-neon bg-neon/10 text-bone"
                                : "border-line text-bone-dim hover:border-bone-dim")
                            }
                          >
                            {l.city}
                          </button>
                        ))}
                      </div>
                    </Field>
                    <Field label="Servicio">
                      <select
                        className="field appearance-none"
                        value={form.service}
                        onChange={set("service")}
                      >
                        {ALL_SERVICES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-5">
                    <Field label="Día">
                      <input
                        type="date"
                        className="field"
                        min={todayStr()}
                        value={form.date}
                        onChange={set("date")}
                      />
                    </Field>
                    <Field label="Hora">
                      {form.date && slots.length === 0 ? (
                        <p className="rounded-sm border border-line bg-ink px-4 py-3 text-sm text-bone-dim">
                          Ese día está cerrado. Prueba de martes a sábado.
                        </p>
                      ) : (
                        <div className="grid grid-cols-4 gap-2">
                          {!form.date && (
                            <p className="col-span-4 text-sm text-bone-dim">
                              Elige primero un día.
                            </p>
                          )}
                          {slots.map((t) => (
                            <button
                              key={t}
                              onClick={() => setForm((f) => ({ ...f, time: t }))}
                              className={
                                "rounded-sm border py-2 text-center font-cond text-sm font-600 transition-colors " +
                                (form.time === t
                                  ? "border-neon bg-neon/10 text-bone"
                                  : "border-line text-bone-dim hover:border-bone-dim")
                              }
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </Field>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-5">
                    <div className="rounded-sm border border-line bg-ink p-4">
                      <Summary form={form} />
                    </div>
                    <Field label="Nombre">
                      <input
                        className="field"
                        placeholder="Tu nombre"
                        value={form.name}
                        onChange={set("name")}
                      />
                    </Field>
                    <Field label="Teléfono">
                      <input
                        className="field"
                        placeholder="Para confirmarte la cita"
                        value={form.phone}
                        onChange={set("phone")}
                      />
                    </Field>
                  </div>
                )}

                {/* navegación */}
                <div className="mt-7 flex items-center gap-3">
                  {step > 1 && (
                    <button
                      className="btn btn-ghost"
                      onClick={() => setStep((s) => s - 1)}
                    >
                      <ArrowLeft size={16} /> Atrás
                    </button>
                  )}
                  {step < 3 ? (
                    <button
                      className="btn btn-neon ml-auto disabled:opacity-40"
                      disabled={!canNext}
                      onClick={() => setStep((s) => s + 1)}
                    >
                      Siguiente <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button
                      className="btn btn-neon ml-auto disabled:opacity-40"
                      disabled={!canNext}
                      onClick={submit}
                    >
                      Confirmar reserva <Check size={16} />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </BookingCtx.Provider>
  )
}

/* ---------- piezas ---------- */
function Steps({ step }: { step: number }) {
  const labels = ["Servicio", "Día y hora", "Tus datos"]
  return (
    <ol className="mb-7 flex items-center gap-2">
      {labels.map((l, i) => {
        const n = i + 1
        const active = n === step
        const done = n < step
        return (
          <li key={l} className="flex flex-1 items-center gap-2">
            <span
              className={
                "grid h-7 w-7 shrink-0 place-items-center rounded-full border font-cond text-sm font-700 " +
                (active
                  ? "border-neon text-neon"
                  : done
                  ? "border-neon bg-neon text-ink"
                  : "border-line text-bone-dim")
              }
            >
              {done ? <Check size={14} /> : n}
            </span>
            <span
              className={
                "hidden font-cond text-[0.72rem] uppercase tracking-wide sm:block " +
                (active ? "text-bone" : "text-bone-dim")
              }
            >
              {l}
            </span>
            {n < 3 && <span className="h-px flex-1 bg-line" />}
          </li>
        )
      })}
    </ol>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-cond text-[0.75rem] uppercase tracking-[0.14em] text-neon">
        {label}
      </span>
      {children}
    </label>
  )
}

function Summary({ form }: { form: Record<string, string> }) {
  const rows = [
    ["Local", form.place],
    ["Servicio", form.service],
    ["Día", form.date],
    ["Hora", form.time],
  ]
  return (
    <dl className="space-y-1.5">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 text-sm">
          <dt className="text-bone-dim">{k}</dt>
          <dd className="text-right font-600 text-bone">{v || "—"}</dd>
        </div>
      ))}
    </dl>
  )
}

function Done({
  place,
  loc,
  onClose,
}: {
  place: string
  loc: Location
  onClose: () => void
}) {
  return (
    <div className="px-6 py-10 text-center">
      <div className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-neon text-neon">
        <Check size={26} />
      </div>
      <h3 className="mt-5 font-slab text-2xl text-bone">¡Casi listo!</h3>
      <p className="mx-auto mt-3 max-w-sm text-bone-dim">
        Hemos abierto tu correo con la solicitud para{" "}
        <span className="text-bone">{place}</span>. Envíalo y te confirmamos el
        hueco. ¿Prefieres llamar?
      </p>
      <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
        <a href={loc.phoneHref} className="btn btn-neon">
          <Phone size={16} /> Llamar a {place}
        </a>
        <button className="btn btn-ghost" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </div>
  )
}
