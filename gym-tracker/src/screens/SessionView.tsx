import { useEffect, useMemo, useState } from "react"
import { ArrowLeft, Check, Info, TrendingUp } from "lucide-react"
import { useNav } from "../App"
import { SESSIONS, WARMUP, type Exercise, type SessionId } from "../data/plan"
import { dailyAdvice, fmt, lastSetsFor, progressionHint, recoveryStatus, setsFor, squatTarget } from "../lib/calc"
import { dayPlan, formatDate, planWeek, weekPlan } from "../lib/schedule"
import { useStore, uid, type GymLog, type SetLog } from "../lib/store"
import { useRestTimer } from "../components/Timers"
import { StatusBox, Stepper } from "../components/ui"

export function SessionView({ date, id, onClose }: { date: string; id: SessionId; onClose: () => void }) {
  const { state, update } = useStore()
  const { toast } = useNav()
  const timer = useRestTimer()
  const session = SESSIONS[id]
  const s = state.settings
  const wp = weekPlan(planWeek(date, s.startDate))
  const advice = dailyAdvice(state, date)
  const recovery = recoveryStatus(state.checkins[date]?.recovery)
  const log = state.gym.find((g) => g.date === date && g.session === id)
  const squat = squatTarget(wp, s.rm.squat)
  const md = dayPlan(date, s.matchDay).md

  const [warm, setWarm] = useState<boolean[]>([false, false, false])
  const [rpe, setRpe] = useState(log?.rpe ?? 7)
  const [minutes, setMinutes] = useState(log?.minutes ?? session.minutes)

  const counts = useMemo(() => Object.fromEntries(session.exercises.map((e) => [e.id, setsFor(e, wp, advice.reduce30)])), [session, wp, advice.reduce30])

  const mutate = (fn: (g: GymLog) => GymLog) =>
    update((st) => {
      const existing = st.gym.find((g) => g.date === date && g.session === id)
      const base: GymLog = existing ?? { id: uid(), date, session: id, sets: {}, finished: false }
      const next = fn(base)
      return { ...st, gym: existing ? st.gym.map((g) => (g.id === base.id ? next : g)) : [...st.gym, next] }
    })

  const getSets = (ex: Exercise): SetLog[] => {
    const n = counts[ex.id]
    const cur = log?.sets[ex.id] ?? []
    return Array.from({ length: Math.max(n, cur.length) }, (_, i) => cur[i] ?? { done: false })
  }

  const setSet = (ex: Exercise, i: number, patch: Partial<SetLog>) =>
    mutate((g) => {
      const arr = [...(g.sets[ex.id] ?? [])]
      while (arr.length <= i) arr.push({ done: false })
      arr[i] = { ...arr[i], ...patch }
      return { ...g, sets: { ...g.sets, [ex.id]: arr } }
    })

  const totalSets = session.exercises.reduce((a, e) => a + counts[e.id], 0)
  const doneSets = session.exercises.reduce((a, e) => a + getSets(e).filter((x) => x.done).length, 0)

  const finish = () => {
    mutate((g) => ({ ...g, rpe, minutes, finished: true }))
    toast("Sesión guardada")
    onClose()
  }

  let lastBlock: string | undefined

  return (
    <div className="screen">
      <button className="btn btn-sm btn-ghost" style={{ alignSelf: "flex-start", paddingLeft: 4 }} onClick={onClose}>
        <ArrowLeft size={18} /> Volver
      </button>

      <section className="pitch">
        <div className="row between">
          <p className="eyebrow">
            {formatDate(date, true)} · {md}
          </p>
          <p className="eyebrow num">
            {doneSets}/{totalSets} series
          </p>
        </div>
        <div className="row" style={{ gap: 14, marginTop: 12, alignItems: "flex-end" }}>
          <span className="md-big" style={{ fontSize: 88 }}>{id}</span>
          <div className="stack" style={{ gap: 2, paddingBottom: 6 }}>
            <h1 style={{ fontWeight: 700, fontSize: 18, lineHeight: 1.2 }}>{session.title}</h1>
            <p className="small" style={{ color: "var(--on-turf-muted)" }}>
              ~{session.minutes} min{wp ? ` · ${wp.block}` : ""}
            </p>
          </div>
        </div>
        <div style={{ height: 4, background: "rgba(238,243,238,.15)", borderRadius: 2, marginTop: 16, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${totalSets ? (doneSets / totalSets) * 100 : 0}%`, background: "var(--on-turf)", transition: "width .4s var(--ease)" }} />
        </div>
      </section>

      <p className="small muted">{session.focus}</p>
      {advice.status !== "green" && advice.status !== "none" && <StatusBox status={advice.status} title={advice.title}>{advice.detail}</StatusBox>}
      {session.note && <StatusBox status="none" title={session.note} />}

      <section className="card">
        <div className="card-head">
          <h2 className="h-card">Calentamiento · 12–15 min</h2>
        </div>
        <div className="list">
          {[...WARMUP, session.warmupExtra].map((w, i) => (
            <div key={w} className="list-item" style={{ alignItems: "center" }}>
              <button className="check" aria-pressed={warm[i]} aria-label={w} onClick={() => setWarm((a) => a.map((v, j) => (j === i ? !v : v)))}>
                <Check size={15} />
              </button>
              <span className="small" style={{ opacity: warm[i] ? 0.55 : 1 }}>{w}</span>
            </div>
          ))}
        </div>
      </section>

      {session.exercises.map((ex) => {
        const sets = getSets(ex)
        const prev = lastSetsFor(state.gym, ex.id, date)
        const hint = ex.kind === "strength" && !ex.periodized ? progressionHint(prev?.sets, recovery) : null
        const prevTop = prev?.sets.filter((x) => x.kg).at(-1)
        const suggestedKg = ex.periodized && squat ? squat.kg : prevTop?.kg
        const suggestedReps = ex.periodized && squat ? squat.reps : prevTop?.reps ?? ex.repsDefault
        const header = ex.block && ex.block !== lastBlock ? ex.block : null
        lastBlock = ex.block
        return (
          <div key={ex.id} className="stack" style={{ gap: 10 }}>
            {header && <p className="eyebrow" style={{ marginTop: 6 }}>{header}</p>}
            <article className="ex">
              <div className="row between" style={{ alignItems: "flex-start" }}>
                <h3 className="ex-name">{ex.name}</h3>
                <span className="tiny muted num" style={{ whiteSpace: "nowrap" }}>
                  {Math.round(ex.rest / 60 * 10) / 10} min
                </span>
              </div>
              <div className="presc">
                <span className="chip chip-gate num">
                  {counts[ex.id]} × {ex.periodized && squat ? squat.reps : ex.reps}
                </span>
                {ex.periodized && squat && <span className="chip">{squat.pctLabel} · {squat.kgLabel}</span>}
                {ex.load && <span className="chip">{ex.load}</span>}
                {ex.periodized && <span className="chip">RIR 2</span>}
              </div>
              {ex.why && (
                <p className="tiny muted row" style={{ marginTop: 8, gap: 6, alignItems: "flex-start" }}>
                  <Info size={13} style={{ flex: "none", marginTop: 2 }} /> {ex.why}
                </p>
              )}
              {hint && (
                <p className="hint">
                  <TrendingUp size={14} /> {hint}
                </p>
              )}
              {prev && ex.kind === "strength" && (
                <p className="tiny muted" style={{ marginTop: 6 }}>
                  Última vez ({formatDate(prev.date)}): {prev.sets.map((x) => `${x.kg != null ? fmt(x.kg, x.kg % 1 ? 1 : 0) : "—"}×${x.reps ?? "—"}`).join(" · ")}
                </p>
              )}

              {ex.kind === "strength" ? (
                <div className="set-grid">
                  <span className="h">#</span>
                  <span className="h">kg</span>
                  <span className="h">reps</span>
                  <span className="h">RIR</span>
                  <span className="h">ok</span>
                  {sets.map((st, i) => (
                    <SetRow
                      key={i}
                      n={i + 1}
                      set={st}
                      suggestedKg={suggestedKg}
                      suggestedReps={suggestedReps}
                      onChange={(p) => setSet(ex, i, p)}
                      onDone={() => {
                        const done = !st.done
                        setSet(ex, i, {
                          done,
                          kg: st.kg ?? suggestedKg,
                          reps: st.reps ?? suggestedReps,
                          rir: st.rir ?? 2,
                        })
                        if (done) timer.start(ex.rest, ex.name)
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="dots">
                  {sets.map((st, i) => (
                    <button
                      key={i}
                      className="dot-btn"
                      aria-pressed={st.done}
                      aria-label={`Serie ${i + 1}`}
                      onClick={() => {
                        setSet(ex, i, { done: !st.done })
                        if (!st.done) timer.start(ex.rest, ex.name)
                      }}
                    >
                      {st.done ? <Check size={16} /> : i + 1}
                    </button>
                  ))}
                </div>
              )}
            </article>
          </div>
        )
      })}

      <section className="card stack" style={{ gap: 14 }}>
        <h2 className="h-card">Terminar sesión</h2>
        <div className="stack" style={{ gap: 6 }}>
          <div className="row between">
            <span className="label">RPE de la sesión</span>
            <span className="num">{rpe}/10</span>
          </div>
          <input type="range" min={1} max={10} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} aria-label="RPE de la sesión" style={{ accentColor: "var(--gate)" }} />
        </div>
        <div className="row between">
          <span className="label">Minutos</span>
          <Stepper value={minutes} onChange={setMinutes} step={5} label="minutos" />
        </div>
        <p className="tiny muted">
          Carga de la sesión: <span className="num">{rpe * minutes}</span> UA. Recuerda: nada de agua fría después del gimnasio.
        </p>
        <button className="btn btn-primary btn-block" onClick={finish}>
          {log?.finished ? "Guardar cambios" : "Terminar y guardar"}
        </button>
      </section>
    </div>
  )
}

function SetRow({ n, set, suggestedKg, suggestedReps, onChange, onDone }: { n: number; set: SetLog; suggestedKg?: number; suggestedReps?: number; onChange: (p: Partial<SetLog>) => void; onDone: () => void }) {
  return (
    <>
      <span className="set-n">{n}</span>
      <DecimalInput value={set.kg} placeholder={suggestedKg != null ? String(suggestedKg).replace(".", ",") : "kg"} onChange={(kg) => onChange({ kg })} label={`Serie ${n} kilos`} />
      <DecimalInput value={set.reps} placeholder={suggestedReps != null ? String(suggestedReps) : "reps"} onChange={(reps) => onChange({ reps })} label={`Serie ${n} repeticiones`} numeric />
      <DecimalInput value={set.rir} placeholder="2" onChange={(rir) => onChange({ rir })} label={`Serie ${n} RIR`} numeric />
      <button className="set-done" aria-pressed={set.done} onClick={onDone} aria-label={`Serie ${n} hecha`}>
        <Check size={17} />
      </button>
    </>
  )
}

/** Campo numérico que conserva lo que se teclea ("72," o "72.") hasta que es un número válido. */
function DecimalInput({ value, placeholder, onChange, label, numeric }: { value?: number; placeholder: string; onChange: (v?: number) => void; label: string; numeric?: boolean }) {
  const [text, setText] = useState(value != null ? String(value).replace(".", ",") : "")
  useEffect(() => {
    const parsed = text === "" ? undefined : Number(text.replace(",", "."))
    if (parsed !== value) setText(value != null ? String(value).replace(".", ",") : "")
  }, [value])
  return (
    <input
      className="set-input"
      inputMode={numeric ? "numeric" : "decimal"}
      placeholder={placeholder}
      value={text}
      aria-label={label}
      onChange={(e) => {
        const t = e.target.value.replace(/[^0-9.,]/g, "")
        setText(t)
        const v = t === "" ? undefined : Number(t.replace(",", "."))
        if (v === undefined || !Number.isNaN(v)) onChange(v)
      }}
    />
  )
}
