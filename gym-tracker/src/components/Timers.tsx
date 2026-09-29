import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { Pause, Play, RotateCcw } from "lucide-react"

// ——— Temporizador de descanso (global, sobrevive al cambiar de pantalla) ———

type RestCtx = { start: (seconds: number, label: string) => void }
const Ctx = createContext<RestCtx>({ start: () => {} })
export const useRestTimer = () => useContext(Ctx)

const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.max(0, s % 60)).padStart(2, "0")}`

function beep() {
  try {
    const ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    const o = ac.createOscillator()
    const g = ac.createGain()
    o.frequency.value = 880
    g.gain.setValueAtTime(0.2, ac.currentTime)
    g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.5)
    o.connect(g).connect(ac.destination)
    o.start()
    o.stop(ac.currentTime + 0.5)
  } catch {
    /* sin audio */
  }
  navigator.vibrate?.([180, 80, 180])
}

export function RestTimerProvider({ children }: { children: ReactNode }) {
  const [timer, setTimer] = useState<{ end: number; total: number; label: string } | null>(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [timer])

  const left = timer ? Math.ceil((timer.end - now) / 1000) : 0
  const fired = useRef(false)
  useEffect(() => {
    if (!timer) return
    if (left <= 0 && !fired.current) {
      fired.current = true
      beep()
      const id = setTimeout(() => setTimer(null), 2500)
      return () => clearTimeout(id)
    }
  }, [left, timer])

  const start = useCallback((seconds: number, label: string) => {
    fired.current = false
    setNow(Date.now())
    setTimer({ end: Date.now() + seconds * 1000, total: seconds, label })
  }, [])

  return (
    <Ctx.Provider value={{ start }}>
      {children}
      {timer && (
        <div className="timer" role="timer" aria-live="polite">
          <div className="timer-bar" style={{ width: `${Math.max(0, (left / timer.total) * 100)}%` }} />
          <span className="t">{left > 0 ? mmss(left) : "¡Ya!"}</span>
          <span className="small" style={{ flex: 1, opacity: 0.85, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Descanso · {timer.label}
          </span>
          <button onClick={() => setTimer({ ...timer, end: timer.end + 30000, total: timer.total + 30 })}>+30 s</button>
          <button onClick={() => setTimer(null)}>Saltar</button>
        </div>
      )}
    </Ctx.Provider>
  )
}

// ——— Respiración lenta 4 s / 6 s (6 rpm) ———

export function BreathTimer({ minutes = 5 }: { minutes?: number }) {
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // en décimas de segundo
  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setElapsed((e) => e + 1), 100)
    return () => clearInterval(id)
  }, [running])

  const total = minutes * 600
  useEffect(() => {
    if (elapsed >= total) setRunning(false)
  }, [elapsed, total])

  const inCycle = elapsed % 100
  const inhale = inCycle < 40
  const phaseLeft = Math.ceil((inhale ? 40 - inCycle : 100 - inCycle) / 10)
  const leftS = Math.ceil((total - elapsed) / 10)
  const started = elapsed > 0

  return (
    <div className="stack" style={{ alignItems: "center" }}>
      <div className="breath">
        <div className="breath-ring">
          <div className="breath-core" style={{ transform: `scale(${running && inhale ? 1 : 0.55})`, transitionDuration: running ? (inhale ? "4s" : "6s") : "0.6s" }} />
          <div className="breath-text">
            {!started ? "Listo" : !running ? (elapsed >= total ? "Hecho" : "Pausa") : inhale ? "Inhala" : "Exhala"}
            <span className="num">{running ? `${phaseLeft} s` : mmss(leftS)}</span>
          </div>
        </div>
      </div>
      <p className="tiny muted num">{mmss(leftS)} restantes</p>
      <div className="row">
        <button className="btn btn-primary btn-sm" onClick={() => setRunning((r) => !r)} disabled={elapsed >= total}>
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? "Pausar" : started ? "Seguir" : "Empezar"}
        </button>
        {started && (
          <button className="btn btn-sm" onClick={() => { setRunning(false); setElapsed(0) }}>
            <RotateCcw size={16} /> Reiniciar
          </button>
        )}
      </div>
    </div>
  )
}
