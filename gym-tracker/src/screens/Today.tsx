import { useState } from "react"
import { ArrowRight, Clock, Flag, Moon, Sparkles, Timer, Utensils } from "lucide-react"
import { useNav } from "../App"
import { DAY_TYPES, MEALS, MIND_BY_DAY, RECOVERY_BY_DAY, SESSIONS } from "../data/plan"
import { dailyAdvice, macros, squatTarget, wellnessSum } from "../lib/calc"
import { dayPlan, formatDate, microcycle, planWeek, WEEKDAYS, weekPlan } from "../lib/schedule"
import { currentWeight, useStore } from "../lib/store"
import { PitchLines, StatusBox } from "../components/ui"
import { CheckInSheet, LoadSheet } from "../components/LogSheets"

export function Today({ today }: { today: string }) {
  const { state } = useStore()
  const nav = useNav()
  const [date, setDate] = useState(today)
  const [checkin, setCheckin] = useState(false)
  const [load, setLoad] = useState(false)

  const s = state.settings
  const plan = dayPlan(date, s.matchDay)
  const week = planWeek(date, s.startDate)
  const wp = weekPlan(week)
  const cycle = microcycle(today, s.matchDay)
  const advice = dailyAdvice(state, date)
  const kg = currentWeight(state)
  const m = macros(plan.dayType, kg)
  const nut = state.nutrition[date]
  const mealsDone = nut ? Object.values(nut.meals).filter(Boolean).length : 0
  const mealsTotal = MEALS.filter((x) => !x.optional && !(x.restDay === false && plan.dayType === "rest")).length
  const gymLog = plan.gym ? state.gym.find((g) => g.date === date && g.session === plan.gym) : undefined
  const isToday = date === today
  const ci = state.checkins[date]
  const sum = wellnessSum(ci)
  const [sign, rest] = plan.md === "MD" ? ["", "MD"] : [plan.md.slice(2, 3), plan.md.slice(3)]
  const matchLogged = state.matches.some((x) => x.date === date)
  const teamLogged = state.loads.some((l) => l.date === date && l.kind === "team")
  const squat = plan.gym === "G1" ? squatTarget(wp, s.rm.squat) : null

  return (
    <div className="screen">
      <section className="pitch" aria-label="Día de hoy">
        <PitchLines />
        <div className="row between">
          <p className="eyebrow">{isToday ? "Hoy" : "Vista previa"} · {formatDate(date, true)}</p>
          <p className="eyebrow">{week === 0 ? "Antes de empezar" : week > 12 ? "Plan terminado" : `Semana ${week}/12`}</p>
        </div>
        <h1 className="md-big" aria-label={plan.md} style={{ marginTop: 14 }}>
          <span>MD</span>
          {sign && <span className="sign">{sign === "-" ? "\u2212" : sign}</span>}
          {rest && plan.md !== "MD" && <span>{rest}</span>}
        </h1>
        <p style={{ fontWeight: 650, fontSize: 17, marginTop: 10 }}>
          {plan.match ? "Día de partido" : plan.gym ? SESSIONS[plan.gym].title : plan.dayType === "md1" ? "Sin gimnasio · carga de hidratos" : "Recuperación"}
        </p>
        {wp && <p className="small" style={{ color: "var(--on-turf-muted)" }}>{wp.block}{wp.deload ? " · semana de descarga" : ""}</p>}
        <div className="pitch-meta">
          {plan.gym && (
            <span className="chip">
              <Clock size={14} /> Gimnasio {plan.gymTime ?? "libre"}
            </span>
          )}
          {plan.team && (
            <span className="chip">
              <Flag size={14} /> Equipo {plan.team}
            </span>
          )}
          <span className="chip">
            <Utensils size={14} /> {m.kcal.toLocaleString("es-ES")} kcal
          </span>
        </div>

        <div className="touchline" role="group" aria-label="Microciclo de la semana">
          {cycle.map((d) => {
            const done = d.gym ? state.gym.some((g) => g.date === d.date && g.session === d.gym && g.finished) : d.match ? state.matches.some((x) => x.date === d.date) : false
            return (
              <button
                key={d.date}
                className="tl-day"
                data-today={d.date === date}
                data-gym={!!d.gym}
                data-match={d.match}
                data-done={done}
                onClick={() => setDate(d.date)}
                aria-pressed={d.date === date}
                aria-label={`${WEEKDAYS[d.weekday]} ${d.md}${d.gym ? ` ${d.gym}` : ""}${d.match ? " partido" : ""}`}
              >
                <span className="tl-md">{d.md}</span>
                <span className="tl-mark" />
                <span className="tl-code">{d.match ? "⚽" : d.gym ?? "·"}</span>
                <span className="tl-wd">{WEEKDAYS[d.weekday]}</span>
              </button>
            )
          })}
        </div>
        {!isToday && (
          <button className="btn btn-sm btn-turf" style={{ marginTop: 12 }} onClick={() => setDate(today)}>
            Volver a hoy
          </button>
        )}
      </section>

      {wp?.tests && plan.weekday === 1 && (
        <StatusBox status="none" title={`Semana ${week}: tests`}>
          Sprint 10 y 30 m, CMJ y RSI, sentadilla con RIR 2. Siempre en las mismas condiciones. Regístralos en Progreso.
        </StatusBox>
      )}

      <section className="card stack">
        <div className="row between">
          <h2 className="h-card">Check-in de la mañana</h2>
          <button className="link" onClick={() => setCheckin(true)}>
            {ci ? "Editar" : "Hacer ahora"}
          </button>
        </div>
        <StatusBox status={advice.status} title={advice.title}>
          {advice.detail}
        </StatusBox>
        {ci && (
          <div className="row small muted wrap" style={{ gap: 14 }}>
            {ci.recovery != null && <span>Recuperación <b className="num" style={{ color: "var(--ink)" }}>{ci.recovery}%</b></span>}
            {sum != null && <span>Bienestar <b className="num" style={{ color: "var(--ink)" }}>{sum}/25</b></span>}
            {ci.sleepHours != null && <span>Sueño <b className="num" style={{ color: "var(--ink)" }}>{ci.sleepHours.toLocaleString("es-ES")} h</b></span>}
          </div>
        )}
      </section>

      {plan.gym && (
        advice.swapToMobility ? (
          <StatusBox status="red" title={`Hoy no toca ${plan.gym}`}>
            Movilidad 20 min + técnica de carrera suave (A-skip, B-skip, rebotes de tobillo). La sesión vuelve cuando la recuperación salga del rojo.
          </StatusBox>
        ) : (
          <button className="session-card" data-today={isToday} onClick={() => nav.openSession(date, plan.gym!)}>
            <span className="session-code">{plan.gym}</span>
            <span className="stack" style={{ gap: 2, flex: 1 }}>
              <span className="eyebrow">{gymLog?.finished ? "Completada" : gymLog ? "En curso" : `~${SESSIONS[plan.gym].minutes} min`}</span>
              <span className="h-card">{SESSIONS[plan.gym].title}</span>
              {squat && <span className="small muted">Sentadilla {squat.sets}×{squat.reps} · {squat.kgLabel}</span>}
              {advice.reduce30 && <span className="small" style={{ color: "var(--warn)", fontWeight: 600 }}>Volumen −30% aplicado</span>}
            </span>
            <ArrowRight size={20} />
          </button>
        )
      )}

      {plan.match && (
        <section className="card stack">
          <h2 className="h-card">Partido</h2>
          <p className="small muted">Respiración lenta 5 min por la mañana y 1 h antes. Nervios = «estoy activado, mi cuerpo se prepara».</p>
          <div className="row wrap">
            <button className="btn btn-primary btn-sm" onClick={() => { nav.setIntent("match"); nav.go("mind") }}>
              {matchLogged ? "Ver partido" : "Registrar partido"}
            </button>
            <button className="btn btn-sm" onClick={() => { nav.setIntent("breath"); nav.go("mind") }}>
              <Timer size={15} /> Respiración
            </button>
          </div>
        </section>
      )}

      {plan.team && (
        <section className="card row between">
          <div className="stack" style={{ gap: 2 }}>
            <h2 className="h-card">Entreno de equipo · {plan.team}</h2>
            <p className="small muted">{teamLogged ? "Carga registrada" : "Apunta RPE × minutos al terminar"}</p>
          </div>
          <button className="btn btn-sm" onClick={() => setLoad(true)}>
            {teamLogged ? "Añadir" : "Registrar"}
          </button>
        </section>
      )}

      <button className="card stack" style={{ textAlign: "left", cursor: "pointer" }} onClick={() => nav.go("diet")}>
        <div className="row between">
          <span className="eyebrow">{DAY_TYPES[plan.dayType].label}</span>
          <span className="small muted">
            {mealsDone}/{mealsTotal} comidas
          </span>
        </div>
        <div className="row between" style={{ alignItems: "flex-end" }}>
          <span className="kcal" style={{ fontSize: 46 }}>
            {m.kcal.toLocaleString("es-ES")}
            <span className="small muted" style={{ fontFamily: "var(--f-body)", fontSize: 14, marginLeft: 6 }}>kcal</span>
          </span>
          <span className="num small muted">
            P {m.protein} · H {m.carbs} · G {m.fat}
          </span>
        </div>
      </button>

      <section className="grid-2">
        <div className="card stack" style={{ gap: 8 }}>
          <span className="row eyebrow" style={{ gap: 6 }}>
            <Moon size={13} /> Recuperación
          </span>
          {(RECOVERY_BY_DAY[plan.md] ?? RECOVERY_BY_DAY.default).map((r) => (
            <p key={r} className="small">
              {r}
            </p>
          ))}
        </div>
        <div className="card stack" style={{ gap: 8 }}>
          <span className="row eyebrow" style={{ gap: 6 }}>
            <Sparkles size={13} /> Mente
          </span>
          <p className="small">{MIND_BY_DAY[plan.md] ?? "Reseteo tras cada error"}</p>
          <button className="link" style={{ textAlign: "left" }} onClick={() => nav.go("mind")}>
            Abrir
          </button>
        </div>
      </section>

      {plan.extra && <StatusBox status="none" title={plan.extra} />}

      <CheckInSheet open={checkin} onClose={() => setCheckin(false)} date={date} />
      <LoadSheet open={load} onClose={() => setLoad(false)} date={date} kind="team" />
    </div>
  )
}
