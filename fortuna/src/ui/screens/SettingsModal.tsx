import { useEffect } from 'react';
import { QUALITY, type Quality } from '../../engine/quality';
import { useGame } from '../store';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const s = useGame((st) => st.settings);
  const set = useGame((st) => st.setSettings);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal settings"
        role="dialog"
        aria-modal
        aria-label="Ajustes"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <span className="panel-title">Ajustes</span>
          <button className="btn ghost sm" onClick={onClose}>
            Cerrar
          </button>
        </div>
        <div className="panel-body settings-body">
          <div className="eyebrow">Gráficos</div>
          <div className="setting">
            <span>
              <b>Calidad</b>
              <small className="muted">
                Sombras, distancia de dibujado, resolución máxima y efectos
              </small>
            </span>
            <div className="tabs small-tabs">
              {(Object.keys(QUALITY) as Quality[]).map((q) => (
                <button
                  key={q}
                  className={`tab ${s.quality === q ? 'active' : ''}`}
                  onClick={() => set({ quality: q })}
                >
                  {QUALITY[q].label}
                </button>
              ))}
            </div>
          </div>
          <label className="setting">
            <span>
              <b>Forzar WebGL2</b>
              <small className="muted">
                Si tu navegador tiene problemas con WebGPU (se aplica en la próxima partida)
              </small>
            </span>
            <input
              type="checkbox"
              checked={s.forceWebGL}
              onChange={(e) => set({ forceWebGL: e.target.checked })}
            />
          </label>
          <label className="setting">
            <span>
              <b>Panel de rendimiento</b>
              <small className="muted">
                FPS, milisegundos, llamadas de dibujo y resolución (F3)
              </small>
            </span>
            <input
              type="checkbox"
              checked={s.showStats}
              onChange={(e) => set({ showStats: e.target.checked })}
            />
          </label>
          <div className="eyebrow">Sonido</div>
          {(
            [
              ['volMaster', 'Volumen general', 'Todo el sonido del juego'],
              ['volAmbient', 'Ambiente', 'Ciudad, tráfico, lluvia, viento, gente'],
              ['volEffects', 'Efectos', 'Pasos, truenos, campana de la Bolsa, interfaz'],
            ] as const
          ).map(([key, label, hint]) => (
            <label className="setting" key={key}>
              <span>
                <b>{label}</b>
                <small className="muted">{hint}</small>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={s[key]}
                onChange={(e) => set({ [key]: Number(e.target.value) })}
              />
              <span className="mono">{Math.round(s[key] * 100)} %</span>
            </label>
          ))}
          <div className="eyebrow">Controles</div>
          <label className="setting">
            <span>
              <b>Invertir eje vertical de la cámara</b>
            </span>
            <input
              type="checkbox"
              checked={s.invertY}
              onChange={(e) => set({ invertY: e.target.checked })}
            />
          </label>
          <div className="eyebrow">Accesibilidad</div>
          <label className="setting">
            <span>
              <b>Tamaño del texto</b>
              <small className="muted">Escala toda la interfaz</small>
            </span>
            <input
              type="range"
              min={0.85}
              max={1.35}
              step={0.05}
              value={s.textScale}
              onChange={(e) => set({ textScale: Number(e.target.value) })}
            />
            <span className="mono">{Math.round(s.textScale * 100)} %</span>
          </label>
          <label className="setting">
            <span>
              <b>Modo daltónico</b>
              <small className="muted">Subidas en azul y bajadas en naranja</small>
            </span>
            <input
              type="checkbox"
              checked={s.colorblind}
              onChange={(e) => set({ colorblind: e.target.checked })}
            />
          </label>
        </div>
      </div>
    </div>
  );
}
