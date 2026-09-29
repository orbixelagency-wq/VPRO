import { createContext, useContext, useEffect, useState } from "react"
import { Apple, Brain, CalendarDays, Dumbbell, LineChart, Settings2 } from "lucide-react"
import type { SessionId } from "./data/plan"
import { useStore } from "./lib/store"
import { todayISO } from "./lib/schedule"
import { Today } from "./screens/Today"
import { Train } from "./screens/Train"
import { SessionView } from "./screens/SessionView"
import { Diet } from "./screens/Diet"
import { Progress } from "./screens/Progress"
import { Mind } from "./screens/Mind"
import { SettingsSheet } from "./screens/Settings"

export type Tab = "today" | "train" | "diet" | "progress" | "mind"

type Nav = {
  tab: Tab
  go: (t: Tab) => void
  openSession: (date: string, id: SessionId) => void
  toast: (msg: string) => void
  /** Acción pendiente al cambiar de pestaña (p. ej. abrir el formulario de partido) */
  intent: string | null
  setIntent: (i: string | null) => void
}

const NavCtx = createContext<Nav | null>(null)
export const useNav = () => useContext(NavCtx)!

const TABS: { id: Tab; label: string; Icon: typeof Dumbbell }[] = [
  { id: "today", label: "Hoy", Icon: CalendarDays },
  { id: "train", label: "Entreno", Icon: Dumbbell },
  { id: "diet", label: "Dieta", Icon: Apple },
  { id: "progress", label: "Progreso", Icon: LineChart },
  { id: "mind", label: "Mente", Icon: Brain },
]

export default function App() {
  const { persisted } = useStore()
  const [tab, setTab] = useState<Tab>("today")
  const [session, setSession] = useState<{ date: string; id: SessionId } | null>(null)
  const [settings, setSettings] = useState(false)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [intent, setIntent] = useState<string | null>(null)
  const [today, setToday] = useState(todayISO())

  // Si la app se queda abierta y cambia el día, refresca "hoy".
  useEffect(() => {
    const id = setInterval(() => setToday(todayISO()), 60000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    if (!toastMsg) return
    const id = setTimeout(() => setToastMsg(null), 2200)
    return () => clearTimeout(id)
  }, [toastMsg])

  const go = (t: Tab) => {
    setSession(null)
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  const nav: Nav = {
    tab,
    go,
    openSession: (date, id) => {
      setSession({ date, id })
      window.scrollTo({ top: 0 })
    },
    toast: setToastMsg,
    intent,
    setIntent,
  }

  return (
    <NavCtx.Provider value={nav}>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <span className="brand-dot" aria-hidden="true" />
            Matchday
          </div>
          <button className="icon-btn" onClick={() => setSettings(true)} aria-label="Ajustes">
            <Settings2 size={19} />
          </button>
        </header>

        <main key={session ? `s-${session.id}-${session.date}` : tab}>
          {session ? (
            <SessionView date={session.date} id={session.id} onClose={() => setSession(null)} />
          ) : tab === "today" ? (
            <Today today={today} />
          ) : tab === "train" ? (
            <Train today={today} />
          ) : tab === "diet" ? (
            <Diet today={today} />
          ) : tab === "progress" ? (
            <Progress today={today} />
          ) : (
            <Mind today={today} />
          )}
        </main>

        {!persisted && <p className="tiny muted" style={{ textAlign: "center", marginTop: 16 }}>Este navegador no deja guardar datos: exporta una copia desde Ajustes.</p>}
      </div>

      <nav className="nav" aria-label="Secciones">
        {TABS.map(({ id, label, Icon }) => (
          <button key={id} aria-current={tab === id && !session ? "page" : undefined} onClick={() => go(id)}>
            <Icon size={20} strokeWidth={2} />
            {label}
          </button>
        ))}
      </nav>

      <SettingsSheet open={settings} onClose={() => setSettings(false)} />
      {toastMsg && (
        <div className="toast" role="status">
          {toastMsg}
        </div>
      )}
    </NavCtx.Provider>
  )
}
