import { ArrowRight, Check } from "lucide-react"
import { useNav } from "../App"
import { PERIODIZATION, SESSIONS, type SessionId } from "../data/plan"
import { fmt, squatTarget } from "../lib/calc"
import { formatDate, microcycle, planWeek, WEEKDAYS, weekPlan } from "../lib/schedule"
import { useStore } from "../lib/store"

export function Train({ today }: { today: string }) {
  const { state } = useStore()
  const nav = useNav()
  const s = state.settings
  const week = planWeek(today, s.startDate)
  const wp = weekPlan(week)
  const cycle = microcycle(today, s.matchDay)
  const history = [...state.gym].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8)

  return (
    <div className="screen">
      <div>
        <p className="eyebrow">{wp ? `Semana ${week} · ${wp.block}` : week === 0 ? "El plan aún no ha empezado" : "Plan completado"}</p>
        <h1 className="h-screen" style={{ marginTop: 6 }}>
          Entreno
        </h1>
      </div>

      <section className="stack">
        {(["G1", "G2", "G3", "G4"] as SessionId[]).map((id) => {
          const day = cycle.find((d) => d.gym === id)!
          const log = state.gym.find((g) => g.date === day.date && g.session === id)
          const sq = id === "G1" ? squatTarget(wp, s.rm.squat) : null
          return (
            <button key={id} className="session-card" data-today={day.date === today} onClick={() => nav.openSession(day.date, id)}>
              <span className="session-code">{id}</span>
              <span className="stack" style={{ gap: 2, flex: 1, minWidth: 0 }}>
                <span className="eyebrow">
                  {WEEKDAYS[day.weekday]} {formatDate(day.date)} · {day.md}
                  {day.gymTime ? ` · ${day.gymTime}` : ""}
                </span>
                <span className="h-card">{SESSIONS[id].title}</span>
                <span className="small muted">
                  {sq ? `Sentadilla ${sq.sets}×${sq.reps} al ${sq.pctLabel} · ${sq.kgLabel}` : id === "G2" && wp ? `Pliometría ${wp.plyo}` : id === "G3" && wp ? `Velocidad: ${wp.speed}` : `~${SESSIONS[id].minutes} min`}
                </span>
              </span>
              {log?.finished ? (
                <span className="check" aria-checked="true" role="img" aria-label="Completada">
                  <Check size={16} />
                </span>
              ) : (
                <ArrowRight size={20} />
              )}
            </button>
          )
        })}
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="h-card">Periodización</h2>
          <span className="tiny muted">Sube 2,5–5 kg si todo sale con RIR 2 y en verde</span>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table className="table">
            <thead>
              <tr>
                <th>Sem</th>
                <th>Bloque</th>
                <th>Sentadilla</th>
                <th>Pliometría</th>
              </tr>
            </thead>
            <tbody>
              {PERIODIZATION.map((w) => {
                const sq = squatTarget(w, s.rm.squat)
                return (
                  <tr key={w.week} data-now={w.week === week}>
                    <td className="num">{w.week}</td>
                    <td>{w.block}</td>
                    <td className="num" style={{ whiteSpace: "nowrap" }}>{sq ? `${sq.sets}×${sq.reps} · ${sq.kgLabel.replace(" kg", "")}` : "—"}</td>
                    <td>{w.plyo}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="h-card">1RM de referencia</h2>
          <span className="tiny muted">Se recalculan en los tests</span>
        </div>
        <div className="grid-2">
          {(
            [
              ["Sentadilla", s.rm.squat],
              ["Hip thrust", s.rm.hipThrust],
              ["Peso muerto", s.rm.deadlift],
              ["Press banca", s.rm.bench],
            ] as const
          ).map(([label, v]) => (
            <div key={label} className="stat">
              <span className="tiny muted">{label}</span>
              <span className="v">
                {fmt(v, v % 1 ? 1 : 0)}
                <small>kg</small>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2 className="h-card">Historial</h2>
        </div>
        {history.length === 0 ? (
          <p className="empty">Tus sesiones aparecerán aquí. Empieza por la de hoy.</p>
        ) : (
          <div className="list">
            {history.map((g) => {
              const sets = Object.values(g.sets).flat().filter((x) => x.done).length
              return (
                <button key={g.id} className="list-item" style={{ border: 0, borderTop: "1px solid var(--line)", background: "none", textAlign: "left", width: "100%" }} onClick={() => nav.openSession(g.date, g.session)}>
                  <span className="session-code" style={{ width: 40, height: 40, fontSize: 18, borderRadius: 12 }}>
                    {g.session}
                  </span>
                  <span className="stack" style={{ gap: 0, flex: 1 }}>
                    <span style={{ fontWeight: 600 }}>{SESSIONS[g.session].short}</span>
                    <span className="small muted">
                      {formatDate(g.date, true)} · {sets} series{g.rpe ? ` · RPE ${g.rpe}` : ""}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
