import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  BARBERS,
  LOCALES,
  SERVICES,
  formatDate,
  localById,
  serviceById,
  barberById,
  slotsForDate,
  upcomingDates,
} from "@/lib/booking-data"
import { createAppointment, isSlotTaken } from "@/lib/appointments"
import {
  Check,
  ChevronLeft,
  Clock,
  MapPin,
  Scissors,
  User,
  X,
  CalendarCheck,
} from "lucide-react"

interface Prefill {
  localId?: string
  serviceId?: string
}

interface BookingContextValue {
  openBooking: (prefill?: Prefill) => void
  closeBooking: () => void
}

const BookingContext = createContext<BookingContextValue | null>(null)

export function useBooking() {
  const ctx = useContext(BookingContext)
  if (!ctx) throw new Error("useBooking debe usarse dentro de <BookingProvider>")
  return ctx
}

interface FormState {
  localId: string
  serviceId: string
  barberId: string
  date: string
  time: string
  name: string
  phone: string
  email: string
  notes: string
}

const EMPTY: FormState = {
  localId: "",
  serviceId: "",
  barberId: "any",
  date: "",
  time: "",
  name: "",
  phone: "",
  email: "",
  notes: "",
}

const STEPS = ["Local", "Servicio", "Barbero", "Fecha", "Datos"]

export function BookingProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY)

  const openBooking = useCallback((prefill?: Prefill) => {
    setForm({ ...EMPTY, ...prefill })
    setDone(false)
    setStep(prefill?.serviceId ? 2 : prefill?.localId ? 1 : 0)
    setOpen(true)
  }, [])

  const closeBooking = useCallback(() => setOpen(false), [])

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = "hidden"
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false)
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = ""
      window.removeEventListener("keydown", onKey)
    }
  }, [open])

  const set = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }))
  const dates = useMemo(() => upcomingDates(14), [])
  const slots = useMemo(
    () => (form.date ? slotsForDate(form.date) : []),
    [form.date]
  )

  const canConfirm =
    form.localId &&
    form.serviceId &&
    form.date &&
    form.time &&
    form.name.trim().length > 1 &&
    form.phone.trim().length >= 6

  const confirm = () => {
    if (!canConfirm) return
    createAppointment({
      localId: form.localId,
      serviceId: form.serviceId,
      barberId: form.barberId || "any",
      date: form.date,
      time: form.time,
      name: form.name.trim(),
      phone: form.phone.trim(),
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
    })
    setDone(true)
  }

  const ctx = useMemo(() => ({ openBooking, closeBooking }), [openBooking, closeBooking])

  return (
    <BookingContext.Provider value={ctx}>
      {children}
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
          <div
            className="absolute inset-0 bg-carbon/85 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden border border-line bg-graphite shadow-2xl sm:rounded-sm">
            {/* Cabecera */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div>
                <p className="font-sans text-[0.6rem] font-semibold uppercase tracking-[0.24em] text-ember">
                  Reserva
                </p>
                <h3 className="font-display text-xl uppercase tracking-[0.02em] text-chalk">
                  {done ? "Cita confirmada" : "Pide tu cita"}
                </h3>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="grid h-9 w-9 place-items-center border border-line text-ash transition-colors hover:border-ember hover:text-ember"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {done ? (
              <Confirmation form={form} onClose={() => setOpen(false)} />
            ) : (
              <>
                {/* Progreso de pasos */}
                <div className="flex gap-2 px-6 pt-4">
                  {STEPS.map((label, i) => (
                    <div key={label} className="flex-1">
                      <div
                        className={cn(
                          "h-1 w-full rounded-full transition-colors",
                          i <= step ? "bg-ember" : "bg-line"
                        )}
                      />
                      <span
                        className={cn(
                          "mt-1.5 block text-[0.55rem] font-semibold uppercase tracking-[0.14em]",
                          i === step ? "text-chalk" : "text-steel"
                        )}
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Contenido del paso */}
                <div className="min-h-[280px] flex-1 overflow-y-auto px-6 py-6">
                  {step === 0 && (
                    <StepGrid
                      icon={MapPin}
                      title="¿En qué local?"
                      items={LOCALES.map((l) => ({
                        id: l.id,
                        title: l.name,
                        sub: l.address,
                      }))}
                      selected={form.localId}
                      onSelect={(id) => {
                        set({ localId: id, time: "" })
                        setStep(1)
                      }}
                    />
                  )}
                  {step === 1 && (
                    <StepGrid
                      icon={Scissors}
                      title="Elige tu servicio"
                      items={SERVICES.map((s) => ({
                        id: s.id,
                        title: s.name,
                        sub: `${s.duration} min · ${s.price} €`,
                      }))}
                      selected={form.serviceId}
                      onSelect={(id) => {
                        set({ serviceId: id })
                        setStep(2)
                      }}
                    />
                  )}
                  {step === 2 && (
                    <StepGrid
                      icon={User}
                      title="¿Con quién?"
                      items={BARBERS.map((b) => ({ id: b.id, title: b.name }))}
                      selected={form.barberId}
                      onSelect={(id) => {
                        set({ barberId: id })
                        setStep(3)
                      }}
                    />
                  )}
                  {step === 3 && (
                    <div>
                      <StepTitle icon={Clock} title="Fecha y hora" />
                      <div className="-mx-1 mb-5 flex gap-2 overflow-x-auto pb-2">
                        {dates.map((d) => (
                          <button
                            key={d}
                            onClick={() => set({ date: d, time: "" })}
                            className={cn(
                              "shrink-0 border px-3 py-2 text-center transition-colors",
                              form.date === d
                                ? "border-ember bg-ember/10 text-chalk"
                                : "border-line text-ash hover:border-ember/60"
                            )}
                          >
                            <span className="block text-[0.7rem] font-semibold uppercase tracking-wide">
                              {formatDate(d)}
                            </span>
                          </button>
                        ))}
                      </div>
                      {form.date ? (
                        slots.length ? (
                          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                            {slots.map((t) => {
                              const taken = isSlotTaken(form.localId, form.date, t)
                              return (
                                <button
                                  key={t}
                                  disabled={taken}
                                  onClick={() => set({ time: t })}
                                  className={cn(
                                    "border py-2 text-sm transition-colors",
                                    taken
                                      ? "cursor-not-allowed border-line/60 text-steel/40 line-through"
                                      : form.time === t
                                        ? "border-ember bg-ember text-carbon"
                                        : "border-line text-ash hover:border-ember/60 hover:text-chalk"
                                  )}
                                >
                                  {t}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <p className="text-sm text-ash">
                            Ese día está cerrado. Elige otra fecha.
                          </p>
                        )
                      ) : (
                        <p className="text-sm text-steel">Selecciona primero un día.</p>
                      )}
                      <div className="mt-6 flex justify-end">
                        <Button
                          size="sm"
                          disabled={!form.date || !form.time}
                          onClick={() => setStep(4)}
                        >
                          Continuar
                        </Button>
                      </div>
                    </div>
                  )}
                  {step === 4 && (
                    <div>
                      <StepTitle icon={CalendarCheck} title="Tus datos" />
                      <Summary form={form} />
                      <div className="mt-5 grid gap-4 sm:grid-cols-2">
                        <Field label="Nombre y apellidos*">
                          <input
                            className="vp-input"
                            value={form.name}
                            onChange={(e) => set({ name: e.target.value })}
                            placeholder="Tu nombre"
                          />
                        </Field>
                        <Field label="Teléfono*">
                          <input
                            className="vp-input"
                            value={form.phone}
                            onChange={(e) => set({ phone: e.target.value })}
                            placeholder="+34 ..."
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            className="vp-input"
                            type="email"
                            value={form.email}
                            onChange={(e) => set({ email: e.target.value })}
                            placeholder="correo@ejemplo.com"
                          />
                        </Field>
                        <Field label="Notas">
                          <input
                            className="vp-input"
                            value={form.notes}
                            onChange={(e) => set({ notes: e.target.value })}
                            placeholder="Opcional"
                          />
                        </Field>
                      </div>
                    </div>
                  )}
                </div>

                {/* Pie: navegación */}
                <div className="flex items-center justify-between border-t border-line px-6 py-4">
                  <button
                    onClick={() => setStep((s) => Math.max(0, s - 1))}
                    disabled={step === 0}
                    className={cn(
                      "inline-flex items-center gap-1.5 font-sans text-[0.7rem] font-semibold uppercase tracking-[0.16em] transition-colors",
                      step === 0
                        ? "cursor-not-allowed text-steel/40"
                        : "text-ash hover:text-ember"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" /> Atrás
                  </button>
                  {step === 4 && (
                    <Button size="sm" disabled={!canConfirm} onClick={confirm}>
                      <Check className="h-4 w-4" /> Confirmar cita
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </BookingContext.Provider>
  )
}

function StepTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <Icon className="h-4 w-4 text-ember" />
      <h4 className="font-display text-lg uppercase tracking-[0.02em] text-chalk">
        {title}
      </h4>
    </div>
  )
}

function StepGrid({
  icon,
  title,
  items,
  selected,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  items: { id: string; title: string; sub?: string }[]
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <StepTitle icon={icon} title={title} />
      <div className="grid gap-2.5 sm:grid-cols-2">
        {items.map((it) => (
          <button
            key={it.id}
            onClick={() => onSelect(it.id)}
            className={cn(
              "group flex items-center justify-between border px-4 py-3.5 text-left transition-colors",
              selected === it.id
                ? "border-ember bg-ember/10"
                : "border-line hover:border-ember/60 hover:bg-graphite-2"
            )}
          >
            <span>
              <span className="block text-sm font-medium text-chalk">{it.title}</span>
              {it.sub && <span className="text-xs text-steel">{it.sub}</span>}
            </span>
            <span
              className={cn(
                "grid h-5 w-5 place-items-center rounded-full border transition-colors",
                selected === it.id
                  ? "border-ember bg-ember text-carbon"
                  : "border-line text-transparent group-hover:border-ember/60"
              )}
            >
              <Check className="h-3 w-3" />
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

function Summary({ form }: { form: FormState }) {
  const l = localById(form.localId)
  const s = serviceById(form.serviceId)
  const b = barberById(form.barberId)
  return (
    <div className="grid gap-x-6 gap-y-2 border border-line bg-carbon p-4 text-sm sm:grid-cols-2">
      <Row k="Local" v={l ? `${l.name} · ${l.address}` : "—"} />
      <Row k="Servicio" v={s ? `${s.name} (${s.price} €)` : "—"} />
      <Row k="Barbero" v={b?.name ?? "—"} />
      <Row k="Cuándo" v={form.date ? `${formatDate(form.date)} · ${form.time}` : "—"} />
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <span className="block text-[0.6rem] font-semibold uppercase tracking-[0.16em] text-steel">
        {k}
      </span>
      <span className="text-chalk">{v}</span>
    </div>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-sans text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-steel">
        {label}
      </span>
      {children}
    </label>
  )
}

function Confirmation({ form, onClose }: { form: FormState; onClose: () => void }) {
  const l = localById(form.localId)
  const s = serviceById(form.serviceId)
  return (
    <div className="flex flex-col items-center px-6 py-10 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-full border border-ember text-ember">
        <Check className="h-7 w-7" />
      </span>
      <h4 className="mt-5 font-display text-2xl uppercase text-chalk">¡Nos vemos pronto!</h4>
      <p className="mt-2 max-w-sm text-sm text-ash">
        Hemos registrado tu cita de <b className="text-chalk">{s?.name}</b> en{" "}
        <b className="text-chalk">{l?.name}</b> el{" "}
        <b className="text-chalk">
          {form.date && formatDate(form.date)} a las {form.time}
        </b>
        . El equipo la revisará y te confirmará por teléfono.
      </p>
      <div className="mt-6 flex gap-3">
        <Button onClick={onClose}>Hecho</Button>
      </div>
      <p className="mt-4 text-[0.62rem] text-steel">
        Guardado en esta central. Recibirás confirmación del equipo de Oblivion.
      </p>
    </div>
  )
}
