import { useEffect, type ReactNode } from "react"
import { AlertTriangle, CheckCircle2, CircleDashed, OctagonAlert } from "lucide-react"
import type { Status } from "../lib/calc"

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose()
    document.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-grip" />
        <div className="row between" style={{ marginBottom: 14 }}>
          <h2 className="h-screen" style={{ fontSize: 30 }}>
            {title}
          </h2>
          <button className="btn btn-sm btn-ghost" onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </>
  )
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string }) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Scale({ value, onChange, label, low, high }: { value?: number; onChange: (v: number) => void; label: string; low: string; high: string }) {
  return (
    <div className="field">
      <div className="row between">
        <span className="label" style={{ color: "var(--ink)" }}>
          {label}
        </span>
        <span className="tiny muted">
          1 {low} · 5 {high}
        </span>
      </div>
      <div className="scale" role="group" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} aria-pressed={value === n} onClick={() => onChange(n)} aria-label={`${label} ${n}`}>
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

export function Stepper({ value, onChange, step = 1, min = 0, max = 9999, label }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; label: string }) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100))
  return (
    <div className="stepper">
      <button onClick={() => onChange(clamp(value - step))} aria-label={`Restar ${label}`}>
        −
      </button>
      <input type="number" inputMode="decimal" value={value} aria-label={label} onChange={(e) => onChange(clamp(Number(e.target.value) || 0))} />
      <button onClick={() => onChange(clamp(value + step))} aria-label={`Sumar ${label}`}>
        +
      </button>
    </div>
  )
}

const STATUS_ICON = { green: CheckCircle2, yellow: AlertTriangle, red: OctagonAlert, none: CircleDashed }
export const STATUS_LABEL: Record<Status, string> = { green: "Verde", yellow: "Amarillo", red: "Rojo", none: "Sin datos" }

export function StatusBox({ status, title, children }: { status: Status; title: string; children?: ReactNode }) {
  const Icon = STATUS_ICON[status]
  return (
    <div className="status" data-s={status}>
      <Icon size={20} className="status-icon" aria-label={STATUS_LABEL[status]} />
      <div className="stack" style={{ gap: 2 }}>
        <p className="status-title">{title}</p>
        {children && <p className="small muted" style={{ color: "var(--ink)", opacity: 0.8 }}>{children}</p>}
      </div>
    </div>
  )
}

export function NumField({ label, value, onChange, suffix, step = "any", placeholder }: { label: string; value?: number; onChange: (v?: number) => void; suffix?: string; step?: string; placeholder?: string }) {
  return (
    <div className="field">
      <label>
        {label}
        {suffix && <span className="muted"> ({suffix})</span>}
      </label>
      <input
        className="input num"
        type="number"
        inputMode="decimal"
        step={step}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value.replace(",", ".")))}
      />
    </div>
  )
}

/** Líneas de campo (medio campo + círculo central) para el fondo del hero. */
export function PitchLines() {
  return (
    <svg className="pitch-lines" viewBox="0 0 400 260" preserveAspectRatio="xMaxYMid slice" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="300" y1="0" x2="300" y2="260" />
        <circle cx="300" cy="130" r="70" />
        <circle cx="300" cy="130" r="3" fill="currentColor" />
        <rect x="-10" y="60" width="60" height="140" />
      </g>
    </svg>
  )
}
