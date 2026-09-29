import { useEffect, useState } from 'react';
import { applyUiSettings, loadUiSettings, saveUiSettings, type UiSettings } from '../settings';

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState<UiSettings>(loadUiSettings);
  useEffect(() => {
    applyUiSettings(s);
    saveUiSettings(s);
  }, [s]);
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
              onChange={(e) => setS({ ...s, textScale: Number(e.target.value) })}
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
              onChange={(e) => setS({ ...s, colorblind: e.target.checked })}
            />
          </label>
          <p className="muted small">
            Gráficos, audio, controles y más idiomas llegarán con el mundo 3D (fases 3–11).
          </p>
        </div>
      </div>
    </div>
  );
}
