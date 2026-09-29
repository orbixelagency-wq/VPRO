import { useRef, useState } from "react"
import { Download, Upload } from "lucide-react"
import { useNav } from "../App"
import { RM_LABELS, type RmKey } from "../data/plan"
import { mondayOf, todayISO, type MatchDay } from "../lib/schedule"
import { initialState, useStore, type State } from "../lib/store"
import { saveFile } from "../lib/cloud"
import { NumField, Seg, Sheet } from "../components/ui"

type Theme = "auto" | "light" | "dark"

function readTheme(): Theme {
  try {
    const t = localStorage.getItem("matchday-theme")
    return t === "light" || t === "dark" ? t : "auto"
  } catch {
    return "auto"
  }
}

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { state, update, replace, sync } = useStore()
  const { toast } = useNav()
  const [theme, setTheme] = useState<Theme>(readTheme)
  const [confirmReset, setConfirmReset] = useState(false)
  const file = useRef<HTMLInputElement>(null)
  const s = state.settings
  const set = (patch: Partial<State["settings"]>) => update((st) => ({ ...st, settings: { ...st.settings, ...patch } }))

  const applyTheme = (t: Theme) => {
    setTheme(t)
    if (t === "auto") delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = t
    try {
      if (t === "auto") localStorage.removeItem("matchday-theme")
      else localStorage.setItem("matchday-theme", t)
    } catch {
      /* sin almacenamiento */
    }
  }

  const exportData = async () => {
    const r = await saveFile(`matchday-${todayISO()}.json`, JSON.stringify(state, null, 2))
    if (r === "saved") toast("Copia exportada")
    else if (r === "failed") toast("No se pudo exportar la copia")
  }

  const importData = async (f: File) => {
    try {
      const parsed = JSON.parse(await f.text()) as State
      if (parsed.version !== 1 || !parsed.settings) throw new Error()
      const base = initialState()
      replace({ ...base, ...parsed, settings: { ...base.settings, ...parsed.settings } })
      toast("Copia importada")
      onClose()
    } catch {
      toast("Ese archivo no es una copia de Matchday")
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="Ajustes">
      <div className="stack" style={{ gap: 16 }}>
        <section className="card stack" style={{ gap: 14 }}>
          <h3 className="h-card">Plan</h3>
          <div className="field">
            <label>Inicio de la semana 1</label>
            <input className="input" type="date" value={s.startDate} onChange={(e) => e.target.value && set({ startDate: mondayOf(e.target.value) })} />
            <span className="tiny muted">Se ajusta al lunes de esa semana. Las semanas 1–2 son de adaptación.</span>
          </div>
          <div className="field">
            <label>Día de partido</label>
            <Seg<MatchDay>
              label="Día de partido"
              value={s.matchDay}
              onChange={(v) => set({ matchDay: v })}
              options={[
                { value: "sat", label: "Sábado" },
                { value: "sun", label: "Domingo" },
              ]}
            />
            <span className="tiny muted">Si juegas en domingo, toda la semana se desplaza un día.</span>
          </div>
          <NumField label="Peso de partida" suffix="kg" value={s.bodyweight} onChange={(v) => v && set({ bodyweight: v })} />
        </section>

        <section className="card stack" style={{ gap: 14 }}>
          <h3 className="h-card">1RM de referencia</h3>
          <div className="grid-2">
            {(Object.keys(RM_LABELS) as RmKey[]).map((k) => (
              <NumField key={k} label={RM_LABELS[k]} suffix="kg" value={s.rm[k]} onChange={(v) => v && set({ rm: { ...s.rm, [k]: v } })} />
            ))}
          </div>
        </section>

        <section className="card stack">
          <h3 className="h-card">Apariencia</h3>
          <Seg<Theme>
            label="Tema"
            value={theme}
            onChange={applyTheme}
            options={[
              { value: "auto", label: "Automático" },
              { value: "light", label: "Claro" },
              { value: "dark", label: "Oscuro" },
            ]}
          />
        </section>

        <section className="card stack">
          <h3 className="h-card">Tus datos</h3>
          <p className="small muted">
            {sync === "synced"
              ? "Guardado en este dispositivo y en tu cuenta de Claude (espacio privado): lo verás igual en cualquier móvil donde abras la app con tu cuenta."
              : sync === "connecting"
                ? "Conectando con tu cuenta…"
                : sync === "error"
                  ? "No se pudo sincronizar con tu cuenta. Tus datos siguen guardados en este dispositivo; exporta una copia por si acaso."
                  : "Todo se guarda en este dispositivo. Exporta una copia de vez en cuando para no perder tu progreso o pasarlo a otro móvil."}
          </p>
          <div className="grid-2">
            <button className="btn" onClick={exportData}>
              <Download size={16} /> Exportar
            </button>
            <button className="btn" onClick={() => file.current?.click()}>
              <Upload size={16} /> Importar
            </button>
          </div>
          <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importData(e.target.files[0])} />
          {confirmReset ? (
            <div className="grid-2">
              <button
                className="btn"
                style={{ background: "var(--bad)", borderColor: "var(--bad)", color: "#fff" }}
                onClick={() => {
                  replace(initialState())
                  setConfirmReset(false)
                  toast("Datos borrados")
                }}
              >
                Sí, borrar todo
              </button>
              <button className="btn" onClick={() => setConfirmReset(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button className="btn btn-ghost" style={{ color: "var(--bad)" }} onClick={() => setConfirmReset(true)}>
              Borrar todos los datos
            </button>
          )}
        </section>
        <p className="tiny muted" style={{ textAlign: "center" }}>
          Basado en tu «Plan integral de rendimiento — Extremo». Enséñaselo a tu preparador físico: te ve entrenar en persona.
        </p>
      </div>
    </Sheet>
  )
}
