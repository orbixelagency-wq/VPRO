import { useEffect, useRef, useState } from 'react';
import { exportSave, listSaves, type SaveRecord } from '../../save/saveStore';
import { Skyline } from '../boot/skyline';
import { money } from '../format';
import { useGame } from '../store';
import { SettingsModal } from './SettingsModal';

const TAPE = [
  ['NEXA', 2.41],
  ['BANC', -0.83],
  ['PETR', 1.12],
  ['VITA', 0.37],
  ['ACER', -1.94],
  ['SOLA', 3.05],
  ['MODA', -0.42],
  ['TELE', 0.18],
  ['AGUA', 0.06],
  ['LITI', 4.88],
  ['INMO', -2.31],
  ['KAIJ', 1.47],
  ['ÁUREO 20', 0.64],
  ['ORO', 0.92],
  ['QARAVEL LIGHT', -1.21],
  ['NKR/AUR', 0.11],
] as const;

export function BootScreen() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const setScreen = useGame((s) => s.setScreen);
  const loadGame = useGame((s) => s.loadGame);
  const [saves, setSaves] = useState<SaveRecord[]>([]);
  const [settings, setSettings] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!canvas.current) return;
    const sky = new Skyline(canvas.current);
    sky.start();
    return () => sky.stop();
  }, []);

  useEffect(() => {
    listSaves().then(setSaves);
  }, []);

  const latest = saves[0];

  const importFile = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      if (data.format !== 'fortuna-save' || typeof data.state !== 'string')
        throw new Error('Formato no reconocido');
      loadGame(data.state);
    } catch (e) {
      useGame.getState().pushToast({
        kind: 'bad',
        title: 'No se pudo importar',
        body: e instanceof Error ? e.message : String(e),
      });
    }
  };

  return (
    <div className="boot">
      <canvas ref={canvas} className="boot-canvas" aria-hidden />
      <div className="boot-content">
        <div className="boot-kicker eyebrow">Puerto Valmera · Castelia · Año 2031</div>
        <h1 className="boot-title">
          Fortuna
          <span className="boot-sub">De cero a imperio</span>
        </h1>
        <p className="boot-lede">
          Llegas a la ciudad con 600 áureos, un trabajo en un almacén y ninguna idea de cómo
          funciona el dinero. El resto depende de ti.
        </p>
        <nav className="boot-menu" aria-label="Menú principal">
          <button className="menu-item primary" onClick={() => setScreen('setup')} autoFocus>
            <span className="menu-label">Nueva partida</span>
            <span className="menu-hint">Empieza desde abajo</span>
          </button>
          {latest && (
            <button className="menu-item" onClick={() => loadGame(latest.state)}>
              <span className="menu-label">Continuar</span>
              <span className="menu-hint">
                {latest.meta.playerName} · {latest.meta.date} · {money(latest.meta.netWorth, 0)}
              </span>
            </button>
          )}
          <button className="menu-item" onClick={() => fileInput.current?.click()}>
            <span className="menu-label">Importar partida</span>
            <span className="menu-hint">Desde un archivo .json</span>
          </button>
          {latest && (
            <button className="menu-item" onClick={() => exportSave(latest)}>
              <span className="menu-label">Exportar última partida</span>
              <span className="menu-hint">Copia de seguridad</span>
            </button>
          )}
          <button className="menu-item" onClick={() => setSettings(true)}>
            <span className="menu-label">Ajustes</span>
            <span className="menu-hint">Accesibilidad y texto</span>
          </button>
        </nav>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importFile(f);
          }}
        />
      </div>
      <div className="boot-tape" aria-hidden>
        <div className="tape-track">
          {[...TAPE, ...TAPE].map(([k, v], i) => (
            <span key={i} className="tape-item">
              <b>{k}</b>{' '}
              <span className={v >= 0 ? 'up' : 'down'}>
                {v >= 0 ? '▲' : '▼'} {Math.abs(v).toFixed(2)}%
              </span>
            </span>
          ))}
        </div>
      </div>
      <div className="boot-version faint mono">v0.1 · Fase 1 — motor económico</div>
      {settings && <SettingsModal onClose={() => setSettings(false)} />}
    </div>
  );
}
