import { useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { useNav } from "../App"
import { SESSIONS } from "../data/plan"
import { bestE1rm, fmt, jumpHeight, rsi, sessionLoads, weeklyLoads } from "../lib/calc"
import { formatDate, planWeek } from "../lib/schedule"
import { useStore, uid, type TestLog } from "../lib/store"
import { LineChart, LoadBars } from "../components/Charts"
import { LoadSheet } from "../components/LogSheets"
import { NumField, Seg, Sheet, StatusBox } from "../components/ui"

type View = "tests" | "strength" | "load"
type Metric = "sprint10" | "sprint30" | "cmj" | "rsi" | "squat"

const METRICS: { id: Metric; label: string; unit: string; lowerIsBetter?: boolean; decimals: number }[] = [
  { id: "sprint10", label: "Sprint 10 m", unit: "s", lowerIsBetter: true, decimals: 2 },
  { id: "sprint30", label: "Sprint 30 m", unit: "s", lowerIsBetter: true, decimals: 2 },
  { id: "cmj", label: "CMJ", unit: "cm", decimals: 1 },
  { id: "rsi", label: "RSI", unit: "", decimals: 2 },
  { id: "squat", label: "Sentadilla RM", unit: "kg", decimals: 1 },
]

function metricValue(t: TestLog, m: Metric): number | undefined {
  switch (m) {
    case "sprint10":
      return t.sprint10
    case "sprint30":
      return t.sprint30
    case "cmj":
      return t.cmjFlight ? jumpHeight(t.cmjFlight) : undefined
    case "rsi":
      return t.djFlight && t.djContact ? rsi(t.djFlight, t.djContact) : undefined
    case "squat":
      return t.squatRm
  }
}

const STRENGTH_LIFTS = Object.values(SESSIONS)
  .flatMap((s) => s.exercises)
  .filter((e) => e.kind === "strength")

export function Progress({ today }: { today: string }) {
  const { state, update } = useStore()
  const { toast } = useNav()
  const [view, setView] = useState<View>("tests")
  const [metric, setMetric] = useState<Metric>("sprint10")
  const [lift, setLift] = useState("squat")
  const [addTest, setAddTest] = useState(false)
  const [addLoad, setAddLoad] = useState(false)
  const [draft, setDraft] = useState<TestLog>({ id: "", date: today })

  const tests = [...state.tests].sort((a, b) => a.date.localeCompare(b.date))
  const meta = METRICS.find((m) => m.id === metric)!
  const points = tests.map((t) => ({ date: t.date, value: metricValue(t, metric) })).filter((p): p is { date: string; value: number } => p.value != null)
  const first = points[0]?.value
  const last = points.at(-1)?.value
  const delta = first != null && last != null && points.length > 1 ? last - first : null
  const improved = delta != null && (meta.lowerIsBetter ? delta < 0 : delta > 0)

  const liftPoints = useMemo(() => bestE1rm(state.gym, lift), [state.gym, lift])
  const weeks = weeklyLoads(state, 8, today)
  const thisW = weeks.at(-1)!.load
  const prevW = weeks.at(-2)!.load
  const spike = prevW > 0 && thisW > prevW * 1.15
  const recentLoads = sessionLoads(state).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 6)

  const saveTest = () => {
    update((s) => ({ ...s, tests: [...s.tests, { ...draft, id: uid() }] }))
    if (draft.squatRm) update((s) => ({ ...s, settings: { ...s.settings, rm: { ...s.settings.rm, squat: draft.squatRm! } } }))
    setAddTest(false)
    toast(draft.squatRm ? "Test guardado · 1RM de sentadilla actualizado" : "Test guardado")
  }

  return (
    <div className="screen">
      <div>
        <p className="eyebrow">Tests en semanas 0, 4, 8 y 12</p>
        <h1 className="h-screen" style={{ marginTop: 6 }}>
          Progreso
        </h1>
      </div>

      <Seg
        label="Vista"
        value={view}
        onChange={setView}
        options={[
          { value: "tests", label: "Tests" },
          { value: "strength", label: "Fuerza" },
          { value: "load", label: "Carga" },
        ]}
      />

      {view === "tests" && (
        <>
          <div className="seg" role="group" aria-label="Métrica">
            {METRICS.map((m) => (
              <button key={m.id} aria-pressed={metric === m.id} onClick={() => setMetric(m.id)}>
                {m.label}
              </button>
            ))}
          </div>
          <section className="card stack" style={{ gap: 14 }}>
            <div className="row between" style={{ alignItems: "flex-end" }}>
              <div className="stat">
                <span className="tiny muted">Último registro</span>
                <span className="v">
                  {last != null ? fmt(last, meta.decimals) : "—"}
                  <small>{meta.unit}</small>
                </span>
              </div>
              {delta != null && (
                <span className={`small ${improved ? "delta-up" : "delta-down"}`} style={{ fontWeight: 600, textAlign: "right" }}>
                  {delta > 0 ? "+" : ""}
                  {fmt(delta, meta.decimals)} {meta.unit}
                  <span className="tiny muted" style={{ display: "block", fontWeight: 400 }}>desde el primer test</span>
                </span>
              )}
            </div>
            <LineChart points={points} unit={meta.unit} decimals={meta.decimals} invert={meta.lowerIsBetter} />
            {meta.lowerIsBetter && points.length > 0 && <p className="tiny muted">En sprint, arriba es más rápido (menos tiempo).</p>}
          </section>
          <button
            className="btn btn-primary btn-block"
            onClick={() => {
              setDraft({ id: "", date: today })
              setAddTest(true)
            }}
          >
            <Plus size={18} /> Registrar tests
          </button>

          {tests.length > 0 && (
            <section className="card">
              <div className="card-head">
                <h2 className="h-card">Historial de tests</h2>
              </div>
              <div style={{ overflowX: "auto" }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>10 m</th>
                      <th>30 m</th>
                      <th>CMJ</th>
                      <th>RSI</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {[...tests].reverse().map((t) => (
                      <tr key={t.id}>
                        <td>
                          {formatDate(t.date)}
                          <span className="tiny muted"> · S{planWeek(t.date, state.settings.startDate)}</span>
                        </td>
                        <td className="num">{t.sprint10 != null ? fmt(t.sprint10, 2) : "—"}</td>
                        <td className="num">{t.sprint30 != null ? fmt(t.sprint30, 2) : "—"}</td>
                        <td className="num">{t.cmjFlight ? fmt(jumpHeight(t.cmjFlight), 1) : "—"}</td>
                        <td className="num">{t.djFlight && t.djContact ? fmt(rsi(t.djFlight, t.djContact), 2) : "—"}</td>
                        <td>
                          <button className="icon-btn" style={{ width: 32, height: 32 }} aria-label="Borrar test" onClick={() => update((s) => ({ ...s, tests: s.tests.filter((x) => x.id !== t.id) }))}>
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}

      {view === "strength" && (
        <>
          <label className="field">
            <span className="label">Ejercicio</span>
            <select className="input" value={lift} onChange={(e) => setLift(e.target.value)}>
              {STRENGTH_LIFTS.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <section className="card stack" style={{ gap: 14 }}>
            <div className="stat">
              <span className="tiny muted">1RM estimado (Epley, contando RIR) · mejor serie de cada sesión</span>
              <span className="v">
                {liftPoints.length ? fmt(liftPoints.at(-1)!.value, 1) : "—"}
                <small>kg</small>
              </span>
            </div>
            <LineChart points={liftPoints} unit="kg" target={lift === "squat" ? state.settings.rm.squat : lift === "bench" ? state.settings.rm.bench : undefined} targetLabel="1RM de referencia" />
          </section>
          <p className="small muted">Se calcula solo con las series que marcas como hechas en tus sesiones. Si tu estimado supera la referencia de forma estable, actualízala en Ajustes.</p>
        </>
      )}

      {view === "load" && (
        <>
          <section className="card stack" style={{ gap: 14 }}>
            <div className="row between" style={{ alignItems: "flex-end" }}>
              <div className="stat">
                <span className="tiny muted">Carga esta semana</span>
                <span className="v">
                  {fmt(thisW)}
                  <small>UA</small>
                </span>
              </div>
              {prevW > 0 && thisW > 0 && (
                <span className="num small muted">
                  {thisW >= prevW ? "+" : ""}
                  {fmt(((thisW - prevW) / prevW) * 100)}% vs anterior
                </span>
              )}
            </div>
            <LoadBars weeks={weeks} />
            <p className="tiny muted row" style={{ gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: "var(--warn)" }} /> Subida de más del 15% respecto a la semana anterior
            </p>
          </section>
          <StatusBox status={spike ? "yellow" : "none"} title={spike ? "Subida mayor del 15%" : "Sube como mucho un 10–15% por semana"}>
            {spike ? "Esta semana ya supera la anterior en más de un 15%. Mantén el volumen o recorta la pliometría." : "Carga = RPE de la sesión × minutos. Cuenta gimnasio, equipo y partido."}
          </StatusBox>
          <button className="btn btn-primary btn-block" onClick={() => setAddLoad(true)}>
            <Plus size={18} /> Registrar entreno de equipo u otro
          </button>
          {recentLoads.length > 0 && (
            <section className="card">
              <div className="card-head">
                <h2 className="h-card">Últimas sesiones</h2>
              </div>
              <div className="list">
                {recentLoads.map((l, i) => (
                  <div key={i} className="list-item between">
                    <span>
                      {l.label} <span className="small muted">· {formatDate(l.date, true)}</span>
                    </span>
                    <span className="num small">{fmt(l.load)} UA</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Sheet open={addTest} onClose={() => setAddTest(false)} title="Tests">
        <div className="stack" style={{ gap: 14 }}>
          <div className="field">
            <label>Fecha</label>
            <input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
          </div>
          <p className="small muted">Graba a cámara lenta (240 fps) y mide el tiempo entre la salida y el paso por los conos.</p>
          <div className="grid-2">
            <NumField label="Sprint 10 m" suffix="s" value={draft.sprint10} onChange={(v) => setDraft({ ...draft, sprint10: v })} placeholder="1,78" />
            <NumField label="Sprint 30 m" suffix="s" value={draft.sprint30} onChange={(v) => setDraft({ ...draft, sprint30: v })} placeholder="4,20" />
          </div>
          <NumField label="CMJ · tiempo de vuelo" suffix="ms" value={draft.cmjFlight} onChange={(v) => setDraft({ ...draft, cmjFlight: v })} placeholder="560" />
          {draft.cmjFlight ? <p className="small">Altura: <b className="num">{fmt(jumpHeight(draft.cmjFlight), 1)} cm</b> <span className="muted">(9,81 × t² / 8)</span></p> : null}
          <div className="grid-2">
            <NumField label="Drop jump · vuelo" suffix="ms" value={draft.djFlight} onChange={(v) => setDraft({ ...draft, djFlight: v })} placeholder="480" />
            <NumField label="Drop jump · contacto" suffix="ms" value={draft.djContact} onChange={(v) => setDraft({ ...draft, djContact: v })} placeholder="200" />
          </div>
          {draft.djFlight && draft.djContact ? <p className="small">RSI: <b className="num">{fmt(rsi(draft.djFlight, draft.djContact), 2)}</b></p> : null}
          <NumField label="Sentadilla · RM estimado" suffix="kg" value={draft.squatRm} onChange={(v) => setDraft({ ...draft, squatRm: v })} placeholder={String(state.settings.rm.squat)} />
          <p className="tiny muted">El RM de sentadilla que guardes aquí pasa a ser tu referencia para las cargas de G1.</p>
          <button className="btn btn-primary btn-block" onClick={saveTest}>
            Guardar tests
          </button>
        </div>
      </Sheet>
      <LoadSheet open={addLoad} onClose={() => setAddLoad(false)} date={today} />
    </div>
  )
}
