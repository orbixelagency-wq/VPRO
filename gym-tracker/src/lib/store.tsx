import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { DEFAULT_RM, type RmKey, type SessionId, type WellnessKey } from "../data/plan"
import { mondayOf, todayISO, type MatchDay } from "./schedule"
import { connectCloud, type Cloud } from "./cloud"

export type SetLog = { kg?: number; reps?: number; rir?: number; done: boolean }

export type GymLog = {
  id: string
  date: string
  session: SessionId
  sets: Record<string, SetLog[]>
  rpe?: number
  minutes?: number
  finished: boolean
}

/** Carga de sesión (RPE × minutos) para entrenos de equipo y partidos */
export type LoadLog = { id: string; date: string; kind: "team" | "match" | "other"; rpe: number; minutes: number }

export type CheckIn = {
  recovery?: number
  wellness: Partial<Record<WellnessKey, number>>
  sleepHours?: number
}

export type NutritionDay = { meals: Record<string, boolean>; water: number; protein?: number }

export type TestLog = {
  id: string
  date: string
  sprint10?: number
  sprint30?: number
  /** Tiempo de vuelo del CMJ en ms */
  cmjFlight?: number
  /** Drop jump: vuelo y contacto en ms (RSI = altura / contacto) */
  djFlight?: number
  djContact?: number
  squatRm?: number
}

export type MatchLog = {
  id: string
  date: string
  opponent: string
  minutes?: number
  rpe?: number
  goals: number
  dribbles: number
  runs: number
  shots: number
  reset: boolean
  good: [string, string, string]
  improve: string
  enjoyed: string
}

export type SelfTalk = { id: string; harsh: string; friend: string; cue: string }

export type Settings = {
  name: string
  startDate: string
  matchDay: MatchDay
  bodyweight: number
  rm: Record<RmKey, number>
  cueWords: string
}

export type State = {
  version: 1
  settings: Settings
  gym: GymLog[]
  loads: LoadLog[]
  checkins: Record<string, CheckIn>
  nutrition: Record<string, NutritionDay>
  weights: { date: string; kg: number }[]
  tests: TestLog[]
  matches: MatchLog[]
  selfTalk: SelfTalk[]
}

const KEY = "matchday-v1"

export function initialState(): State {
  return {
    version: 1,
    settings: {
      name: "",
      startDate: mondayOf(todayISO()),
      matchDay: "sat",
      bodyweight: 64,
      rm: { ...DEFAULT_RM },
      cueWords: "Siguiente · Ataca el espacio · Tú desbordas",
    },
    gym: [],
    loads: [],
    checkins: {},
    nutrition: {},
    weights: [],
    tests: [],
    matches: [],
    selfTalk: [],
  }
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return initialState()
    const parsed = JSON.parse(raw) as Partial<State>
    const base = initialState()
    return { ...base, ...parsed, settings: { ...base.settings, ...parsed.settings, rm: { ...base.settings.rm, ...parsed.settings?.rm } } }
  } catch {
    return initialState()
  }
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

export type SyncStatus = "local" | "connecting" | "synced" | "error"

type Ctx = {
  state: State
  update: (fn: (s: State) => State) => void
  replace: (s: State) => void
  persisted: boolean
  sync: SyncStatus
}

const StoreContext = createContext<Ctx | null>(null)

const SAVED_AT = "matchday-v1-savedAt"
const SYNC_KEYS = ["settings", "gym", "loads", "checkins", "nutrition", "weights", "tests", "matches", "selfTalk"] as const
type SyncKey = (typeof SYNC_KEYS)[number]

function readSavedAt(): number {
  try {
    return Number(localStorage.getItem(SAVED_AT)) || 0
  } catch {
    return 0
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(load)
  const [persisted, setPersisted] = useState(true)
  const [sync, setSync] = useState<SyncStatus>("connecting")
  const first = useRef(true)
  const cloud = useRef<Cloud | null>(null)
  const pushed = useRef<Partial<Record<SyncKey, unknown>>>({})
  const chains = useRef<Partial<Record<SyncKey, Promise<void>>>>({})
  const latest = useRef(state)
  latest.current = state

  const push = useCallback((s: State) => {
    const c = cloud.current
    if (!c) return
    const t = Date.now()
    for (const k of SYNC_KEYS) {
      if (pushed.current[k] === s[k]) continue
      const value = s[k]
      pushed.current[k] = value
      // Una escritura cada vez por documento.
      chains.current[k] = (chains.current[k] ?? Promise.resolve())
        .then(() => c.doc(k).set({ v: value as unknown, t }))
        .then(() => setSync("synced"))
        .catch(() => {
          pushed.current[k] = undefined
          setSync("error")
        })
    }
  }, [])

  // Al abrir: conecta con el espacio privado y trae lo más reciente de cada parte.
  useEffect(() => {
    let cancelled = false
    connectCloud().then(async (c) => {
      if (cancelled) return
      if (!c) return setSync("local")
      try {
        const snaps = await Promise.all(SYNC_KEYS.map((k) => c.doc(k).get()))
        if (cancelled) return
        const localAt = readSavedAt()
        const merged = { ...latest.current } as State
        const fromRemote: Partial<Record<SyncKey, boolean>> = {}
        snaps.forEach((snap, i) => {
          const k = SYNC_KEYS[i]
          const body = snap.exists ? (snap.data() as { v?: unknown; t?: number }) : undefined
          if (body && body.v !== undefined && (body.t ?? 0) >= localAt) {
            ;(merged as Record<SyncKey, unknown>)[k] = body.v
            fromRemote[k] = true
          }
        })
        merged.settings = { ...initialState().settings, ...merged.settings }
        cloud.current = c
        for (const k of SYNC_KEYS) if (fromRemote[k]) pushed.current[k] = merged[k]
        setState(merged)
        setSync("synced")
        push(merged)
      } catch {
        setSync("error")
      }
    })
    return () => {
      cancelled = true
    }
  }, [push])

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
      localStorage.setItem(SAVED_AT, String(Date.now()))
      setPersisted(true)
    } catch {
      setPersisted(false)
    }
    if (!cloud.current) return
    const id = setTimeout(() => push(latest.current), 900)
    return () => clearTimeout(id)
  }, [state, push])

  const update = useCallback((fn: (s: State) => State) => setState((s) => fn(s)), [])
  const replace = useCallback((s: State) => setState(s), [])

  return <StoreContext.Provider value={{ state, update, replace, persisted, sync }}>{children}</StoreContext.Provider>
}

export function useStore(): Ctx {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore fuera de StoreProvider")
  return ctx
}

/** Peso corporal actual: última pesada o el del perfil. */
export function currentWeight(s: State): number {
  const w = [...s.weights].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
  return w?.kg ?? s.settings.bodyweight
}
