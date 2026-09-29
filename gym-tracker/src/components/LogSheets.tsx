import { useEffect, useState } from "react"
import { WELLNESS_ITEMS, type WellnessKey } from "../data/plan"
import { useStore, uid, type CheckIn, type LoadLog } from "../lib/store"
import { recoveryStatus } from "../lib/calc"
import { formatDate } from "../lib/schedule"
import { NumField, Scale, Seg, Sheet, STATUS_LABEL, Stepper } from "./ui"
import { useNav } from "../App"

export function CheckInSheet({ open, onClose, date }: { open: boolean; onClose: () => void; date: string }) {
  const { state, update } = useStore()
  const { toast } = useNav()
  const [draft, setDraft] = useState<CheckIn>({ wellness: {} })

  useEffect(() => {
    if (open) setDraft(state.checkins[date] ?? { wellness: {} })
  }, [open, date, state.checkins])

  const setW = (k: WellnessKey, v: number) => setDraft((d) => ({ ...d, wellness: { ...d.wellness, [k]: v } }))
  const st = recoveryStatus(draft.recovery)

  const save = () => {
    update((s) => ({ ...s, checkins: { ...s.checkins, [date]: draft } }))
    toast("Check-in guardado")
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Check-in">
      <div className="stack" style={{ gap: 16 }}>
        <p className="small muted">{formatDate(date, true)} · un minuto nada más levantarte.</p>
        <div className="card stack">
          <div className="row between">
            <span className="h-card">Recuperación Whoop</span>
            <span className="chip" data-s={st}>
              {STATUS_LABEL[st]}
            </span>
          </div>
          <div className="row" style={{ gap: 14 }}>
            <input
              type="range"
              min={0}
              max={100}
              value={draft.recovery ?? 50}
              onChange={(e) => setDraft((d) => ({ ...d, recovery: Number(e.target.value) }))}
              aria-label="Recuperación en porcentaje"
              style={{ flex: 1, accentColor: "var(--gate)" }}
            />
            <span className="num" style={{ width: 46, textAlign: "right", fontSize: 18 }}>
              {draft.recovery != null ? `${draft.recovery}%` : "—"}
            </span>
          </div>
          <p className="tiny muted">Verde ≥67% · Amarillo 34–66% · Rojo &lt;34%. Es orientativa: combínala con cómo te sientes.</p>
        </div>
        <div className="card stack" style={{ gap: 14 }}>
          <span className="h-card">Cómo te sientes</span>
          {WELLNESS_ITEMS.map((w) => (
            <Scale key={w.id} label={w.label} low={w.low} high={w.high} value={draft.wellness[w.id]} onChange={(v) => setW(w.id, v)} />
          ))}
        </div>
        <NumField label="Horas de sueño" suffix="h" value={draft.sleepHours} onChange={(v) => setDraft((d) => ({ ...d, sleepHours: v }))} placeholder="8,5" />
        <button className="btn btn-primary btn-block" onClick={save}>
          Guardar check-in
        </button>
      </div>
    </Sheet>
  )
}

export function LoadSheet({ open, onClose, date, kind: initialKind = "team" }: { open: boolean; onClose: () => void; date: string; kind?: LoadLog["kind"] }) {
  const { update } = useStore()
  const { toast } = useNav()
  const [kind, setKind] = useState<LoadLog["kind"]>(initialKind)
  const [rpe, setRpe] = useState(6)
  const [minutes, setMinutes] = useState(90)

  useEffect(() => {
    if (open) setKind(initialKind)
  }, [open, initialKind])

  const save = () => {
    update((s) => ({ ...s, loads: [...s.loads, { id: uid(), date, kind, rpe, minutes }] }))
    toast("Carga registrada")
    onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title="Registrar carga">
      <div className="stack" style={{ gap: 16 }}>
        <Seg
          label="Tipo"
          value={kind}
          onChange={setKind}
          options={[
            { value: "team", label: "Entreno equipo" },
            { value: "match", label: "Partido" },
            { value: "other", label: "Otro" },
          ]}
        />
        <div className="card stack">
          <div className="row between">
            <span className="h-card">RPE de la sesión</span>
            <span className="num">{rpe}/10</span>
          </div>
          <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} aria-label="RPE" style={{ accentColor: "var(--gate)" }} />
          <p className="tiny muted">1 muy suave · 5 duro · 10 máximo absoluto. Responde unos 30 min después de acabar.</p>
        </div>
        <div className="row between card">
          <span className="h-card">Minutos</span>
          <Stepper value={minutes} onChange={setMinutes} step={5} label="minutos" />
        </div>
        <p className="small muted">
          Carga: <span className="num">{rpe * minutes}</span> UA
        </p>
        <button className="btn btn-primary btn-block" onClick={save}>
          Guardar carga
        </button>
      </div>
    </Sheet>
  )
}
