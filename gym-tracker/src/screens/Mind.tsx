import { useEffect, useRef, useState } from "react"
import { Check, Plus, Trash2 } from "lucide-react"
import { useNav } from "../App"
import { PROCESS_GOALS, RESET_STEPS, SEASON_GOALS } from "../data/plan"
import { formatDate } from "../lib/schedule"
import { useStore, uid, type MatchLog, type SelfTalk } from "../lib/store"
import { BreathTimer } from "../components/Timers"
import { Sheet, Stepper } from "../components/ui"

const emptyMatch = (date: string): MatchLog => ({ id: "", date, opponent: "", goals: 0, dribbles: 0, runs: 0, shots: 0, reset: false, good: ["", "", ""], improve: "", enjoyed: "", minutes: 90, rpe: 7 })

export function Mind({ today }: { today: string }) {
  const { state, update } = useStore()
  const nav = useNav()
  const [editing, setEditing] = useState<MatchLog | null>(null)
  const [talk, setTalk] = useState<SelfTalk>({ id: "", harsh: "", friend: "", cue: "" })
  const breathRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (nav.intent === "match") setEditing(state.matches.find((m) => m.date === today) ?? emptyMatch(today))
    if (nav.intent === "breath") breathRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    if (nav.intent) nav.setIntent(null)
  }, [])

  const matches = [...state.matches].sort((a, b) => b.date.localeCompare(a.date))
  const goals = matches.reduce((a, m) => a + m.goals, 0)
  const avg = (k: "dribbles" | "runs" | "shots") => (matches.length ? matches.reduce((a, m) => a + m[k], 0) / matches.length : 0)

  const saveMatch = () => {
    if (!editing) return
    const m = { ...editing, id: editing.id || uid() }
    update((s) => ({ ...s, matches: [...s.matches.filter((x) => x.id !== m.id), m] }))
    setEditing(null)
    nav.toast("Partido guardado")
  }

  const addTalk = () => {
    if (!talk.harsh.trim() || !talk.cue.trim()) return
    update((s) => ({ ...s, selfTalk: [...s.selfTalk, { ...talk, id: uid() }] }))
    setTalk({ id: "", harsh: "", friend: "", cue: "" })
  }

  return (
    <div className="screen">
      <div>
        <p className="eyebrow">Dejar de castigarte y volver a disfrutar</p>
        <h1 className="h-screen" style={{ marginTop: 6 }}>
          Mente
        </h1>
      </div>

      <section className="pitch stack" style={{ gap: 14 }}>
        <div className="row between">
          <p className="eyebrow">Goles de la temporada</p>
          <p className="eyebrow num">objetivo {SEASON_GOALS}</p>
        </div>
        <p className="md-big" style={{ fontSize: 96 }}>
          {goals}
          <span style={{ fontSize: 40, color: "var(--on-turf-muted)", marginLeft: 8, alignSelf: "flex-end", paddingBottom: 8 }}>/{SEASON_GOALS}</span>
        </p>
        <div className="goal-track" aria-hidden="true" style={{ ["--line" as string]: "rgba(238,243,238,.25)", ["--surface-2" as string]: "transparent", ["--turf" as string]: "var(--on-turf)" }}>
          {Array.from({ length: SEASON_GOALS }, (_, i) => (
            <span key={i} data-on={i < goals} />
          ))}
        </div>
        <p className="small" style={{ color: "var(--on-turf-muted)" }}>
          Motiva, pero no lo controlas del todo. Lo que sí controlas son los objetivos de proceso.
        </p>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="h-card">Objetivos de proceso</h2>
          <span className="tiny muted">media por partido</span>
        </div>
        <div className="grid-2" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
          {PROCESS_GOALS.map((g) => {
            const v = avg(g.id)
            return (
              <div key={g.id} className="stat" style={{ justifyContent: "space-between" }}>
                <span className="tiny muted">{g.label}</span>
                <span className="v" style={{ color: matches.length && v >= g.target ? "var(--good)" : undefined }}>
                  {matches.length ? v.toLocaleString("es-ES", { maximumFractionDigits: 1 }) : "—"}
                  <small>/{g.target}+</small>
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <button className="btn btn-primary btn-block" onClick={() => setEditing(state.matches.find((m) => m.date === today) ?? emptyMatch(today))}>
        <Plus size={18} /> Registrar partido y diario
      </button>

      {matches.length > 0 && (
        <section className="card">
          <div className="card-head">
            <h2 className="h-card">Partidos</h2>
          </div>
          <div className="list">
            {matches.map((m) => (
              <button key={m.id} className="list-item" style={{ border: 0, borderTop: "1px solid var(--line)", background: "none", width: "100%", textAlign: "left" }} onClick={() => setEditing(m)}>
                <span className="session-code" style={{ width: 44, height: 44, fontSize: 22, borderRadius: 12 }}>
                  {m.goals}
                </span>
                <span className="stack" style={{ gap: 0, flex: 1 }}>
                  <span style={{ fontWeight: 650 }}>{m.opponent || "Partido"}</span>
                  <span className="small muted">
                    {formatDate(m.date, true)} · {m.dribbles} regates · {m.runs} desmarques · {m.shots} disparos
                  </span>
                  {m.enjoyed && <span className="small" style={{ marginTop: 2 }}>Disfruté: {m.enjoyed}</span>}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="card stack">
        <div className="card-head" style={{ marginBottom: 0 }}>
          <h2 className="h-card">Reseteo tras un error</h2>
          <span className="tiny muted">5 segundos</span>
        </div>
        <div className="steps">
          {RESET_STEPS.map((st, i) => (
            <div key={st.title} className="step">
              <p className="tiny muted num">{i + 1}</p>
              <p className="step-t">{st.title}</p>
              <p className="tiny">{st.text}</p>
            </div>
          ))}
        </div>
        <p className="small muted">Practícalo en cada fallo del entreno para que en el partido salga solo.</p>
      </section>

      <section className="card" ref={breathRef}>
        <div className="card-head">
          <h2 className="h-card">Respiración lenta</h2>
          <span className="tiny muted">4 s inhalar · 6 s exhalar</span>
        </div>
        <BreathTimer minutes={5} />
        <p className="small muted" style={{ marginTop: 12 }}>
          Por la mañana del partido y 1 h antes. Si notas nervios: «estoy activado, mi cuerpo se prepara».
        </p>
      </section>

      <section className="card stack">
        <div className="card-head" style={{ marginBottom: 0 }}>
          <h2 className="h-card">Diálogo interno</h2>
          <span className="tiny muted">10 min · 2 veces por semana</span>
        </div>
        {state.selfTalk.map((t) => (
          <div key={t.id} className="step stack" style={{ gap: 4 }}>
            <div className="row between">
              <p className="small" style={{ textDecoration: "line-through", opacity: 0.6 }}>
                {t.harsh}
              </p>
              <button className="icon-btn" style={{ width: 30, height: 30 }} aria-label="Borrar frase" onClick={() => update((s) => ({ ...s, selfTalk: s.selfTalk.filter((x) => x.id !== t.id) }))}>
                <Trash2 size={13} />
              </button>
            </div>
            {t.friend && <p className="small muted">A un compañero: {t.friend}</p>}
            <p className="step-t" style={{ color: "var(--gate)" }}>
              {t.cue}
            </p>
          </div>
        ))}
        <div className="field">
          <label>1 · La frase dura que te dices</label>
          <input className="input" value={talk.harsh} onChange={(e) => setTalk({ ...talk, harsh: e.target.value })} placeholder="«Eres malísimo»" />
        </div>
        <div className="field">
          <label>2 · Lo que le dirías a un compañero</label>
          <input className="input" value={talk.friend} onChange={(e) => setTalk({ ...talk, friend: e.target.value })} placeholder="«Tranquilo, la siguiente la tienes»" />
        </div>
        <div className="field">
          <label>3 · Frase instruccional o motivacional</label>
          <input className="input" value={talk.cue} onChange={(e) => setTalk({ ...talk, cue: e.target.value })} placeholder="«Ataca el espacio» · «Tú desbordas»" />
        </div>
        <button className="btn" onClick={addTalk} disabled={!talk.harsh.trim() || !talk.cue.trim()}>
          Añadir frase
        </button>
        <div className="field">
          <label>Palabras clave para el partido</label>
          <input className="input" value={state.settings.cueWords} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, cueWords: e.target.value } }))} />
        </div>
      </section>

      <section className="card stack">
        <h2 className="h-card">Visualización (PETTLEP)</h2>
        <p className="small">5–10 min, 3 veces por semana y la noche antes del partido. En primera persona y con la equipación puesta: el 1 contra 1, el desmarque a la espalda, el disparo. Incluye también un error y cómo te reseteas.</p>
      </section>

      <p className="tiny muted" style={{ textAlign: "center", padding: "0 12px" }}>
        Un psicólogo deportivo puede acelerar mucho este trabajo. Si la presión se extiende a tu día a día, coméntalo con tu familia o con alguien de confianza.
      </p>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title="Partido">
        {editing && (
          <div className="stack" style={{ gap: 14 }}>
            <div className="grid-2">
              <div className="field">
                <label>Fecha</label>
                <input className="input" type="date" value={editing.date} onChange={(e) => setEditing({ ...editing, date: e.target.value })} />
              </div>
              <div className="field">
                <label>Rival</label>
                <input className="input" value={editing.opponent} onChange={(e) => setEditing({ ...editing, opponent: e.target.value })} placeholder="Nombre" />
              </div>
            </div>
            <div className="card stack">
              {(
                [
                  ["goals", "Goles", null],
                  ["dribbles", "Regates 1c1 intentados", 4],
                  ["runs", "Desmarques a la espalda", 3],
                  ["shots", "Disparos", 3],
                ] as const
              ).map(([k, label, target]) => (
                <div key={k} className="row between">
                  <span className="small" style={{ fontWeight: 600 }}>
                    {label}
                    {target && <span className="muted"> · {target}+</span>}
                  </span>
                  <Stepper value={editing[k]} onChange={(v) => setEditing({ ...editing, [k]: v })} label={label} />
                </div>
              ))}
              <div className="row between">
                <span className="small" style={{ fontWeight: 600 }}>Usé la rutina de reseteo en cada error</span>
                <button className="check" aria-pressed={editing.reset} aria-label="Usé la rutina de reseteo" onClick={() => setEditing({ ...editing, reset: !editing.reset })}>
                  <Check size={15} />
                </button>
              </div>
            </div>
            <div className="grid-2">
              <div className="field">
                <label>Minutos jugados</label>
                <Stepper value={editing.minutes ?? 0} onChange={(v) => setEditing({ ...editing, minutes: v })} step={5} label="minutos" />
              </div>
              <div className="field">
                <label>RPE {editing.rpe}/10</label>
                <input type="range" min={1} max={10} value={editing.rpe ?? 7} onChange={(e) => setEditing({ ...editing, rpe: Number(e.target.value) })} style={{ accentColor: "var(--gate)", marginTop: 12 }} aria-label="RPE del partido" />
              </div>
            </div>
            <div className="divider" />
            <p className="h-card">Diario post-partido · 5 min</p>
            {[0, 1, 2].map((i) => (
              <div key={i} className="field">
                <label>Algo que hice bien #{i + 1}</label>
                <input
                  className="input"
                  value={editing.good[i]}
                  onChange={(e) => {
                    const good = [...editing.good] as MatchLog["good"]
                    good[i] = e.target.value
                    setEditing({ ...editing, good })
                  }}
                />
              </div>
            ))}
            <div className="field">
              <label>Una cosa a mejorar (como instrucción, no como insulto)</label>
              <input className="input" value={editing.improve} onChange={(e) => setEditing({ ...editing, improve: e.target.value })} placeholder="«Mirar antes de recibir»" />
            </div>
            <div className="field">
              <label>Un momento que disfruté</label>
              <input className="input" value={editing.enjoyed} onChange={(e) => setEditing({ ...editing, enjoyed: e.target.value })} />
            </div>
            <button className="btn btn-primary btn-block" onClick={saveMatch}>
              Guardar partido
            </button>
            {editing.id && (
              <button
                className="btn btn-ghost btn-block"
                style={{ color: "var(--bad)" }}
                onClick={() => {
                  update((s) => ({ ...s, matches: s.matches.filter((x) => x.id !== editing.id) }))
                  setEditing(null)
                }}
              >
                Borrar partido
              </button>
            )}
          </div>
        )}
      </Sheet>
    </div>
  )
}
