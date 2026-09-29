import { useState } from "react"
import { Check, Droplet, Minus, Plus, Scale as ScaleIcon } from "lucide-react"
import { useNav } from "../App"
import { DAY_TYPES, HYDRATION, MATCH_PROTOCOL, MEALS, SUPPLEMENTS, type DayType } from "../data/plan"
import { fmt, macros, type Status } from "../lib/calc"
import { addDays, dayPlan, diffDays, formatDate } from "../lib/schedule"
import { currentWeight, useStore, type NutritionDay } from "../lib/store"
import { LineChart } from "../components/Charts"
import { NumField, Seg, StatusBox } from "../components/ui"

export function Diet({ today }: { today: string }) {
  const { state, update } = useStore()
  const { toast } = useNav()
  const plan = dayPlan(today, state.settings.matchDay)
  const [dayType, setDayType] = useState<DayType>(plan.dayType)
  const [info, setInfo] = useState<"meals" | "match" | "supps">(plan.match || plan.dayType === "md1" ? "match" : "meals")
  const [weightInput, setWeightInput] = useState<number | undefined>()

  const kg = currentWeight(state)
  const m = macros(dayType, kg)
  const nut: NutritionDay = state.nutrition[today] ?? { meals: {}, water: 0 }
  const meals = MEALS.filter((x) => !(x.restDay === false && dayType === "rest"))
  const setNut = (fn: (n: NutritionDay) => NutritionDay) => update((s) => ({ ...s, nutrition: { ...s.nutrition, [today]: fn(s.nutrition[today] ?? { meals: {}, water: 0 }) } }))

  const weights = [...state.weights].sort((a, b) => a.date.localeCompare(b.date))
  const trend = weightTrend(weights, today)

  const saveWeight = () => {
    if (!weightInput) return
    update((s) => ({ ...s, weights: [...s.weights.filter((w) => w.date !== today), { date: today, kg: weightInput }] }))
    setWeightInput(undefined)
    toast("Peso guardado")
  }

  const total = m.protein * 4 + m.carbs * 4 + m.fat * 9

  return (
    <div className="screen">
      <div>
        <p className="eyebrow">
          {formatDate(today, true)} · {plan.md}
        </p>
        <h1 className="h-screen" style={{ marginTop: 6 }}>
          Dieta
        </h1>
      </div>

      <Seg
        label="Tipo de día"
        value={dayType}
        onChange={setDayType}
        options={(Object.keys(DAY_TYPES) as DayType[]).map((k) => ({ value: k, label: k === plan.dayType ? `${DAY_TYPES[k].label.split(" /")[0]} · hoy` : DAY_TYPES[k].label.split(" /")[0] }))}
      />

      <section className="card stack" style={{ gap: 14 }}>
        <div className="row between" style={{ alignItems: "flex-end" }}>
          <div>
            <p className="eyebrow">Objetivo del día</p>
            <p className="kcal" style={{ marginTop: 8 }}>
              {m.kcal.toLocaleString("es-ES")}
            </p>
          </div>
          <p className="small muted" style={{ textAlign: "right" }}>
            kcal · con <span className="num">{fmt(kg, 1)}</span> kg
          </p>
        </div>
        <div className="macro-bar" aria-hidden="true">
          <span style={{ width: `${((m.protein * 4) / total) * 100}%`, background: "var(--turf)" }} />
          <span style={{ width: `${((m.carbs * 4) / total) * 100}%`, background: "var(--gate)" }} />
          <span style={{ width: `${((m.fat * 9) / total) * 100}%`, background: "var(--faint)" }} />
        </div>
        <div className="macros">
          <Macro label="Proteína" g={m.protein} per="2 g/kg" color="var(--turf)" />
          <Macro label="Hidratos" g={m.carbs} per={`${fmt(DAY_TYPES[dayType].carbsPerKg, 1)} g/kg`} color="var(--gate)" />
          <Macro label="Grasa" g={m.fat} per="1,5 g/kg" color="var(--faint)" />
        </div>
        <p className="small muted">{DAY_TYPES[dayType].note} Proteína en 4–5 tomas de 25–35 g.</p>
      </section>

      <Seg
        label="Guía"
        value={info}
        onChange={setInfo}
        options={[
          { value: "meals", label: "Comidas" },
          { value: "match", label: "Partido e hidratación" },
          { value: "supps", label: "Suplementos" },
        ]}
      />

      {info === "meals" && (
        <section className="card">
          <div className="card-head">
            <h2 className="h-card">Día tipo</h2>
            <span className="small muted num">
              {meals.filter((x) => nut.meals[x.id]).length}/{meals.filter((x) => !x.optional).length}
            </span>
          </div>
          <div className="list">
            {meals.map((meal) => (
              <div key={meal.id} className="list-item">
                <span className="time">{meal.time}</span>
                <div className="stack" style={{ gap: 2, flex: 1 }}>
                  <span style={{ fontWeight: 650 }}>
                    {meal.name}
                    {meal.optional && <span className="tiny muted"> · opcional</span>}
                  </span>
                  <span className="small muted">{meal.example}</span>
                </div>
                <button className="check" aria-pressed={!!nut.meals[meal.id]} aria-label={`${meal.name} hecha`} onClick={() => setNut((n) => ({ ...n, meals: { ...n.meals, [meal.id]: !n.meals[meal.id] } }))}>
                  <Check size={15} />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {info === "match" && (
        <section className="card stack">
          <h2 className="h-card">Protocolo de partido</h2>
          <div className="list">
            {MATCH_PROTOCOL.map((p) => (
              <div key={p.when} className="list-item">
                <span className="time" style={{ width: 84 }}>
                  {p.when}
                </span>
                <span className="small">{p.what}</span>
              </div>
            ))}
          </div>
          <div className="divider" />
          <h3 className="h-card">Hidratación</h3>
          {HYDRATION.map((h) => (
            <p key={h} className="small">
              {h}
            </p>
          ))}
        </section>
      )}

      {info === "supps" && (
        <section className="card stack">
          <h2 className="h-card">Suplementación</h2>
          <div className="list">
            {SUPPLEMENTS.map((sp) => (
              <div key={sp.name} className="list-item">
                <span className="chip" style={{ flex: "none", fontSize: 11 }} data-tier={sp.tier}>
                  {sp.tier}
                </span>
                <div className="stack" style={{ gap: 2 }}>
                  <span style={{ fontWeight: 650 }}>{sp.name}</span>
                  <span className="small muted">{sp.dose}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="tiny muted">Compra solo productos con certificación independiente (Informed Sport o similar). Lo condicional se decide con tu familia y tu médico.</p>
        </section>
      )}

      <section className="card row between">
        <div className="row">
          <Droplet size={20} style={{ color: "var(--gate)" }} />
          <div className="stack" style={{ gap: 0 }}>
            <span className="h-card">Agua <span className="tiny muted" style={{ fontWeight: 400 }}>· vasos de 250 ml</span></span>
            <span className="small muted num">{fmt((nut.water * 250) / 1000, 2)} L</span>
          </div>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn" aria-label="Quitar un vaso" onClick={() => setNut((n) => ({ ...n, water: Math.max(0, n.water - 1) }))}>
            <Minus size={16} />
          </button>
          <span className="num" style={{ width: 28, textAlign: "center", fontSize: 18 }}>
            {nut.water}
          </span>
          <button className="icon-btn" aria-label="Añadir un vaso" onClick={() => setNut((n) => ({ ...n, water: n.water + 1 }))}>
            <Plus size={16} />
          </button>
        </div>
      </section>

      <section className="card stack" style={{ gap: 14 }}>
        <div className="card-head" style={{ marginBottom: 0 }}>
          <h2 className="h-card row" style={{ gap: 8 }}>
            <ScaleIcon size={18} /> Peso en ayunas
          </h2>
          <span className="tiny muted">2 días por semana</span>
        </div>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 1 }}>
            <NumField label="Peso de hoy" suffix="kg" value={weightInput} onChange={setWeightInput} placeholder={fmt(kg, 1)} />
          </div>
          <button className="btn btn-primary" onClick={saveWeight} disabled={!weightInput}>
            Guardar
          </button>
        </div>
        <LineChart points={weights.map((w) => ({ date: w.date, value: w.kg }))} unit="kg" />
        <StatusBox status={trend.status} title={trend.title}>
          {trend.detail}
        </StatusBox>
      </section>
    </div>
  )
}

function Macro({ label, g, per, color }: { label: string; g: number; per: string; color: string }) {
  return (
    <div className="macro stack" style={{ gap: 4 }}>
      <span className="row tiny muted" style={{ gap: 6 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
        {label}
      </span>
      <span className="v">
        {g}
        <small>g</small>
      </span>
      <span className="tiny muted num">{per}</span>
    </div>
  )
}

/** Regla del plan: objetivo +0,5–1 kg/mes. <0,5 en 4 semanas → +200 kcal; >1,5/mes → −200 kcal. */
function weightTrend(weights: { date: string; kg: number }[], today: string): { status: Status; title: string; detail: string } {
  const recent = weights.filter((w) => diffDays(today, w.date) <= 35)
  if (recent.length < 2 || diffDays(recent.at(-1)!.date, recent[0].date) < 14)
    return { status: "none", title: "Objetivo: +0,5–1 kg al mes", detail: "Pésate en ayunas 2 días por semana. Con 2 semanas de datos verás si vas bien." }
  const first = recent[0]
  const last = recent.at(-1)!
  const days = diffDays(last.date, first.date)
  const perMonth = ((last.kg - first.kg) / days) * 30
  const rate = `${perMonth >= 0 ? "+" : ""}${fmt(perMonth, 1)} kg/mes`
  const fourWeeks = diffDays(last.date, first.date) >= 28 || diffDays(today, addDays(first.date, 28)) >= 0
  if (perMonth > 1.5) return { status: "yellow", title: `Subes rápido: ${rate}`, detail: "Reduce unas 200 kcal al día (por ejemplo, menos arroz o pan en la cena)." }
  if (perMonth < 0.5 && fourWeeks) return { status: "yellow", title: `Por debajo del objetivo: ${rate}`, detail: "Añade unas 200 kcal: un bol de avena extra o un puñado de frutos secos." }
  if (perMonth < 0.5) return { status: "none", title: `Ritmo actual: ${rate}`, detail: "Aún pocas semanas de datos. Si en 4 semanas no subes, añade 200 kcal." }
  return { status: "green", title: `En objetivo: ${rate}`, detail: "Ganando masa al ritmo correcto. Mantén el plan." }
}
