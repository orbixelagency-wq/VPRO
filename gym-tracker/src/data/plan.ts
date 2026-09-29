// Contenido del "Plan integral de rendimiento — Extremo Juvenil Preferente".
// Todo lo que la app prescribe sale de aquí: si el plan cambia, se edita este archivo.

export type SessionId = "G1" | "G2" | "G3" | "G4"

export type Exercise = {
  id: string
  name: string
  block?: string
  sets: number
  /** Texto de repeticiones / distancia tal y como aparece en el plan */
  reps: string
  /** Repeticiones numéricas por defecto para el registro (si aplica) */
  repsDefault?: number
  load?: string
  /** Descanso en segundos (para el temporizador) */
  rest: number
  why?: string
  /** Se registra con kg + reps + RIR (fuerza) o solo como hecho (sprints, saltos) */
  kind: "strength" | "done"
  /** Clave de 1RM de referencia para calcular la carga */
  rmKey?: RmKey
  /** Serie de sentadilla que depende de la semana de periodización */
  periodized?: boolean
  /** El volumen se escala en semanas de adaptación/descarga */
  scales?: "strength" | "speed" | "plyo"
  unilateral?: boolean
}

export type RmKey = "squat" | "hipThrust" | "deadlift" | "bench"

export const RM_LABELS: Record<RmKey, string> = {
  squat: "Sentadilla completa",
  hipThrust: "Hip thrust",
  deadlift: "Peso muerto",
  bench: "Press banca",
}

export const DEFAULT_RM: Record<RmKey, number> = {
  squat: 115,
  hipThrust: 125,
  deadlift: 125,
  bench: 80,
}

export type GymSession = {
  id: SessionId
  title: string
  short: string
  minutes: number
  focus: string
  note?: string
  warmupExtra: string
  exercises: Exercise[]
}

export const WARMUP = [
  "5 min de movilidad dinámica y activación (glúteo, aductor, tobillo)",
  "Técnica de carrera: 2×20 m A-skip, 2×20 m B-skip, 2×20 m rebotes de tobillo",
]

export const SESSIONS: Record<SessionId, GymSession> = {
  G1: {
    id: "G1",
    title: "Fuerza máxima tren inferior",
    short: "Fuerza piernas",
    minutes: 60,
    focus: "Lejos del partido y con 48 h de margen.",
    warmupExtra: "3 series de aproximación de la sentadilla",
    exercises: [
      { id: "squat", name: "Sentadilla completa", sets: 4, reps: "según semana", rest: 210, kind: "strength", rmKey: "squat", periodized: true, why: "Fuerza máxima: la base de la aceleración." },
      { id: "hip-thrust", name: "Hip thrust", sets: 4, reps: "5", repsDefault: 5, load: "~105–110 kg, RIR 2", rest: 150, kind: "strength", rmKey: "hipThrust", scales: "strength", why: "Extensión de cadera, motor del sprint." },
      { id: "rdl", name: "Peso muerto rumano", sets: 3, reps: "6", repsDefault: 6, load: "~75–85 kg, RIR 2", rest: 120, kind: "strength", rmKey: "deadlift", scales: "strength", why: "Isquiotibiales fuertes en longitud larga." },
      { id: "bulgarian", name: "Split squat búlgaro", sets: 3, reps: "5/pierna", repsDefault: 5, load: "RIR 2", rest: 120, kind: "strength", scales: "strength", unilateral: true, why: "Fuerza unilateral: corres y cambias de dirección sobre una pierna." },
      { id: "nordic", name: "Nordic hamstring", sets: 3, reps: "4", repsDefault: 4, load: "Excéntrico lento, 3–4 s", rest: 120, kind: "done", why: "Reduce ~50% las lesiones de isquiotibiales (van Dyk 2019)." },
      { id: "copenhagen", name: "Copenhagen (aductores)", sets: 2, reps: "8/lado", load: "Palanca larga", rest: 90, kind: "done", unilateral: true, why: "Reduce ~40% los problemas de ingle (Harøy 2019)." },
    ],
  },
  G2: {
    id: "G2",
    title: "Pliometría + potencia + fuerza superior",
    short: "Pliometría y potencia",
    minutes: 65,
    focus: "Acaba antes de las 18:15 para llegar recuperado al entreno de las 20:30.",
    warmupExtra: "3 series de aproximación del primer salto",
    exercises: [
      { id: "drop-jump", block: "Pliometría", name: "Drop jump desde 30–40 cm", sets: 4, reps: "4", rest: 120, kind: "done", scales: "plyo", why: "Índice de fuerza reactiva (RSI): cambios de ritmo explosivos." },
      { id: "hurdle-hops", block: "Pliometría", name: "Saltos de valla continuos", sets: 3, reps: "5", rest: 120, kind: "done", scales: "plyo", why: "Rigidez del tobillo y contacto corto." },
      { id: "bounds", block: "Pliometría", name: "Bounds (zancadas saltadas)", sets: 3, reps: "5 contactos", rest: 120, kind: "done", scales: "plyo", why: "Potencia horizontal, directamente ligada al sprint." },
      { id: "skater", block: "Pliometría", name: "Skater bounds", sets: 3, reps: "4/lado", rest: 90, kind: "done", scales: "plyo", unilateral: true, why: "Potencia lateral para regates y cambios de dirección." },
      { id: "trap-jump", block: "Potencia", name: "Jump squat con trap bar", sets: 4, reps: "4", repsDefault: 4, load: "30% 1RM (~35–40 kg), máxima velocidad", rest: 120, kind: "strength", scales: "strength" },
      { id: "med-ball", block: "Potencia", name: "Lanzamiento rotacional de balón medicinal", sets: 3, reps: "5/lado", load: "3–4 kg", rest: 90, kind: "done", unilateral: true, why: "La potencia rotacional se transfiere al disparo." },
      { id: "bench", block: "Fuerza superior", name: "Press banca", sets: 4, reps: "4", repsDefault: 4, load: "70–72,5 kg, RIR 2", rest: 180, kind: "strength", rmKey: "bench", scales: "strength" },
      { id: "weighted-pullup", block: "Fuerza superior", name: "Dominadas lastradas", sets: 4, reps: "5", repsDefault: 5, load: "RIR 2", rest: 150, kind: "strength", scales: "strength" },
      { id: "ohp", block: "Fuerza superior", name: "Press militar con barra", sets: 3, reps: "6", repsDefault: 6, load: "RIR 2", rest: 120, kind: "strength", scales: "strength" },
    ],
  },
  G3: {
    id: "G3",
    title: "Día completo de velocidad",
    short: "Velocidad",
    minutes: 70,
    focus: "Cada sprint al máximo. Si uno sale claramente más lento, termina ese bloque.",
    note: "Volumen total de sprint: unos 350–450 m de alta intensidad.",
    warmupExtra: "3 progresivos de 30 m al 70, 80 y 90%",
    exercises: [
      { id: "accel", block: "Aceleración", name: "Sprint con salidas variadas", sets: 6, reps: "15 m", load: "Parado, lateral, de espaldas, reacción", rest: 120, kind: "done", scales: "speed", why: "Tus acciones decisivas están en los primeros 5–20 m." },
      { id: "sled", block: "Aceleración", name: "Sprint con trineo pesado", sets: 4, reps: "15 m", load: "Que reduzca tu velocidad a la mitad (25–40 kg)", rest: 180, kind: "done", scales: "speed", why: "Mejora la fuerza horizontal (Petrakos 2016)." },
      { id: "flying", block: "Velocidad máxima", name: "Sprint lanzado", sets: 5, reps: "20 m + 20–30 m al máximo", rest: 240, kind: "done", scales: "speed", why: "Exposición semanal a >90–95% de tu velocidad máxima." },
      { id: "curve", block: "Específico de extremo", name: "Sprint en curva (arco ~20 m)", sets: 3, reps: "por lado", rest: 180, kind: "done", scales: "speed", unilateral: true, why: "La mayoría de sprints de un extremo son curvos." },
      { id: "cut", block: "Específico de extremo", name: "Sprint 10 m → corte 45° → 10 m", sets: 3, reps: "por lado", rest: 120, kind: "done", scales: "speed", unilateral: true, why: "Desborde y ataque al espacio." },
      { id: "nordic-2", block: "Prevención", name: "Nordic", sets: 2, reps: "4", rest: 120, kind: "done" },
      { id: "copenhagen-2", block: "Prevención", name: "Copenhagen", sets: 2, reps: "6/lado", rest: 90, kind: "done", unilateral: true },
      { id: "soleus", block: "Prevención", name: "Gemelo isométrico, rodilla flexionada", sets: 3, reps: "30 s pesado", rest: 90, kind: "done", why: "El sóleo soporta hasta ~8 veces tu peso al esprintar." },
    ],
  },
  G4: {
    id: "G4",
    title: "Tren superior hipertrofia + core",
    short: "Superior + core",
    minutes: 50,
    focus: "Sin trabajo pesado de piernas: quedan 48 h para el partido.",
    warmupExtra: "Series de aproximación del press inclinado",
    exercises: [
      { id: "incline-db", name: "Press inclinado con mancuernas", sets: 3, reps: "8–10", repsDefault: 9, load: "RIR 1–2", rest: 120, kind: "strength" },
      { id: "chest-row", name: "Remo con pecho apoyado", sets: 3, reps: "10", repsDefault: 10, load: "RIR 1–2", rest: 120, kind: "strength" },
      { id: "dips", name: "Fondos lastrados", sets: 3, reps: "8", repsDefault: 8, load: "RIR 1–2", rest: 120, kind: "strength" },
      { id: "chinup", name: "Dominadas supinas o jalón", sets: 3, reps: "8–10", repsDefault: 9, load: "RIR 1–2", rest: 120, kind: "strength" },
      { id: "lateral", name: "Elevaciones laterales", sets: 3, reps: "12–15", repsDefault: 13, load: "RIR 1", rest: 60, kind: "strength" },
      { id: "pallof", name: "Pallof press", sets: 3, reps: "10/lado", load: "Controlado", rest: 60, kind: "done", unilateral: true },
      { id: "side-plank", name: "Plancha lateral con carga", sets: 3, reps: "30 s/lado", rest: 60, kind: "done", unilateral: true },
      { id: "ab-wheel", name: "Rueda abdominal", sets: 3, reps: "8", rest: 60, kind: "done" },
    ],
  },
}

// ——— Periodización de 12 semanas ———

export type WeekPlan = {
  week: number
  block: string
  squat: { sets: number; reps: number; pct: [number, number] } | null
  speed: string
  plyo: string
  /** Multiplicador de volumen (series) para el resto de ejercicios */
  volume: number
  deload: boolean
  tests: boolean
}

const wk = (week: number, p: Omit<WeekPlan, "week">): WeekPlan => ({ week, ...p })

export const PERIODIZATION: WeekPlan[] = [
  wk(1, { block: "Adaptación", squat: { sets: 4, reps: 4, pct: [80, 80] }, speed: "80% del volumen", plyo: "~60 contactos", volume: 0.8, deload: false, tests: false }),
  wk(2, { block: "Adaptación", squat: { sets: 4, reps: 4, pct: [80, 80] }, speed: "80% del volumen", plyo: "~60 contactos", volume: 0.8, deload: false, tests: false }),
  wk(3, { block: "Fuerza base", squat: { sets: 4, reps: 4, pct: [82, 85] }, speed: "Volumen completo", plyo: "~70 contactos", volume: 1, deload: false, tests: false }),
  wk(4, { block: "Descarga + tests", squat: { sets: 2, reps: 4, pct: [82, 85] }, speed: "Mitad", plyo: "Mitad", volume: 0.6, deload: true, tests: true }),
  wk(5, { block: "Fuerza máxima", squat: { sets: 5, reps: 3, pct: [85, 90] }, speed: "+1 sprint lanzado", plyo: "~80 contactos", volume: 1, deload: false, tests: false }),
  wk(6, { block: "Fuerza máxima", squat: { sets: 5, reps: 3, pct: [85, 90] }, speed: "+1 sprint lanzado", plyo: "~80 contactos", volume: 1, deload: false, tests: false }),
  wk(7, { block: "Fuerza máxima", squat: { sets: 5, reps: 3, pct: [85, 90] }, speed: "+1 sprint lanzado", plyo: "~80 contactos", volume: 1, deload: false, tests: false }),
  wk(8, { block: "Descarga + tests", squat: { sets: 3, reps: 3, pct: [85, 90] }, speed: "Mitad", plyo: "Mitad", volume: 0.6, deload: true, tests: true }),
  wk(9, { block: "Potencia y velocidad", squat: { sets: 4, reps: 2, pct: [88, 92] }, speed: "Lanzados de 30 m", plyo: "~80–90 contactos", volume: 1, deload: false, tests: false }),
  wk(10, { block: "Potencia y velocidad", squat: { sets: 4, reps: 2, pct: [88, 92] }, speed: "Lanzados de 30 m", plyo: "~80–90 contactos", volume: 1, deload: false, tests: false }),
  wk(11, { block: "Potencia y velocidad", squat: { sets: 4, reps: 2, pct: [88, 92] }, speed: "Lanzados de 30 m", plyo: "~80–90 contactos", volume: 1, deload: false, tests: false }),
  wk(12, { block: "Descarga + reevaluación", squat: null, speed: "—", plyo: "—", volume: 0.5, deload: true, tests: true }),
]

export const TEST_WEEKS = [0, 4, 8, 12]

// ——— Nutrición ———

export type DayType = "rest" | "team" | "gym" | "md1" | "match"

export const DAY_TYPES: Record<DayType, { label: string; carbsPerKg: number; note: string }> = {
  rest: { label: "Descanso / MD+1", carbsPerKg: 5.5, note: "Proteína alta, hidratos moderados." },
  team: { label: "Entreno de equipo", carbsPerKg: 6.5, note: "Pre-entreno 1–1,5 h antes: ~60 g de hidratos." },
  gym: { label: "Gimnasio", carbsPerKg: 6.9, note: "Con 4 días de gimnasio: ~100 kcal más de hidratos (un plátano o una rebanada de pan)." },
  md1: { label: "MD-1 · carga", carbsPerKg: 7.5, note: "Ración extra de hidratos en comida y cena (arroz, pasta, pan, zumo)." },
  match: { label: "Partido", carbsPerKg: 8, note: "Sigue el protocolo de partido." },
}

export const PROTEIN_PER_KG = 2
export const FAT_PER_KG = 1.5

export type Meal = { id: string; time: string; name: string; example: string; restDay?: boolean; optional?: boolean }

export const MEALS: Meal[] = [
  { id: "breakfast", time: "7:15", name: "Desayuno", example: "80 g de avena con 300 ml de leche, 1 plátano, 2 huevos revueltos y 1 tostada con aceite" },
  { id: "mid", time: "11:00", name: "Media mañana", example: "Bocadillo (100 g de pan) de pavo o atún + 1 pieza de fruta + yogur" },
  { id: "lunch", time: "14:30", name: "Comida", example: "120 g de arroz o pasta (en crudo) + 150 g de pollo, ternera o pescado + verdura + aceite de oliva + pan + fruta" },
  { id: "snack", time: "17:00", name: "Merienda / post-gimnasio", example: "250 g de yogur griego o skyr + 50 g de cereales + fruta, o batido de proteína con leche y plátano" },
  { id: "pre", time: "19:00", name: "Pre-entreno", example: "~60 g de hidratos: plátano + pan con miel o membrillo. Poca grasa y poca fibra.", restDay: false },
  { id: "dinner", time: "22:00", name: "Cena post-entreno", example: "150 g de patata o 100 g de arroz + 150 g de proteína (salmón, huevos, carne) + verdura + pan" },
  { id: "bed", time: "Noche", name: "Antes de dormir", example: "Si te quedas con hambre: 250 g de requesón o yogur griego", optional: true },
]

export const MATCH_PROTOCOL = [
  { when: "3–4 h antes", what: "1–3 g/kg de hidratos (130–190 g): 150 g de pasta o arroz en crudo con pollo o pavo y poca salsa." },
  { when: "60–90 min antes", what: "30–60 g de hidratos: plátano, barrita o pan con miel." },
  { when: "Descanso", what: "30–60 g de hidratos: bebida isotónica, gel o plátano." },
  { when: "Después (1–2 h)", what: "~70 g de hidratos + 30–40 g de proteína: batido de leche con cacao y bocadillo de pavo. Luego cena completa." },
]

export const HYDRATION = [
  "5–7 ml/kg (~400 ml) de agua 2–4 h antes de entrenar o jugar.",
  "Por cada kg perdido en un entreno, bebe 1,25–1,5 L en las horas siguientes.",
  "Con calor o mucho sudor, bebida isotónica durante el partido.",
]

export const SUPPLEMENTS = [
  { tier: "Recomendado", name: "Proteína whey", dose: "25–35 g solo si no llegas a la proteína del día con comida" },
  { tier: "Con médico", name: "Creatina monohidrato", dose: "3 g/día, sin fase de carga — solo con el visto bueno de tu familia y tu médico" },
  { tier: "Con analítica", name: "Vitamina D, hierro, magnesio", dose: "Solo si una analítica muestra déficit. Nunca por tu cuenta." },
  { tier: "Condicional", name: "Omega-3", dose: "1–2 g EPA+DHA si comes menos de 2 raciones de pescado azul a la semana" },
  { tier: "No", name: "Cafeína, pre-entrenos, energéticas, BCAA, quemadores", dose: "No aconsejados en menores; empeoran el sueño o no aportan." },
]

// ——— Recuperación y sueño ———

export const RECOVERY_BY_DAY: Record<string, string[]> = {
  "MD+1": ["20–30 min de bici suave o piscina + movilidad", "Masaje o foam roller 5–10 min", "Diario post-partido"],
  MD: ["Agua fría 10–15 min a 10–15 °C tras el partido", "Nutrición post-partido en las primeras 2 h", "Respiración lenta si cuesta dormir"],
  default: ["Sueño de 8,5–9 h", "Sin agua fría tras el gimnasio: frena las ganancias", "Foam roller 5–10 min opcional"],
}

export const SLEEP_HABITS = [
  "Hora de levantarte fija (±1 h también el fin de semana)",
  "10 min de luz natural al levantarte",
  "Días de entreno tardío: ducha templada, luz tenue y dormido a las 23:30",
  "Siesta opcional de 20–30 min antes de las 16:00 en días de mucha carga",
  "Nada de alcohol ni energéticas",
]

// ——— Mente ———

export const RESET_STEPS = [
  { title: "Ancla", text: "Una palmada o tocarte la media." },
  { title: "Respira", text: "Una exhalación lenta." },
  { title: "Palabra", text: "“Siguiente” o “Otra vez”." },
  { title: "Ojos", text: "Dónde está el balón y dónde tienes que estar." },
]

export const PROCESS_GOALS = [
  { id: "dribbles", label: "Regates 1c1", target: 4 },
  { id: "runs", label: "Desmarques a la espalda", target: 3 },
  { id: "shots", label: "Disparos", target: 3 },
] as const

export const SEASON_GOALS = 15

export const MIND_BY_DAY: Record<string, string> = {
  "MD+1": "Diario post-partido",
  "MD+2": "Diálogo interno (10 min)",
  "MD-5": "Diálogo interno (10 min)",
  "MD-4": "Reseteo tras errores en el entreno",
  "MD-3": "Visualización",
  "MD-2": "Diálogo interno (10 min)",
  "MD-1": "Visualización + objetivos de proceso",
  MD: "Respiración + reencuadre + reseteo",
}

// ——— Monitorización ———

export const WELLNESS_ITEMS = [
  { id: "sleep", label: "Sueño", low: "Fatal", high: "Genial" },
  { id: "fatigue", label: "Fatiga", low: "Agotado", high: "Fresco" },
  { id: "soreness", label: "Agujetas", low: "Muchas", high: "Ninguna" },
  { id: "stress", label: "Estrés", low: "Mucho", high: "Tranquilo" },
  { id: "mood", label: "Ánimo", low: "Bajo", high: "Alto" },
] as const

export type WellnessKey = (typeof WELLNESS_ITEMS)[number]["id"]
