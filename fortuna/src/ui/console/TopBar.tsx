import { money, signed } from '../format';
import { SPEED_LABELS, useGame } from '../store';

export function TopBar() {
  const view = useGame((s) => s.view)!;
  const speed = useGame((s) => s.speedIndex);
  const setSpeed = useGame((s) => s.setSpeed);
  const saveNow = useGame((s) => s.saveNow);
  const openNotebook = useGame((s) => s.openNotebook);
  const toggleDebug = useGame((s) => s.toggleDebug);
  const debug = useGame((s) => s.debug);
  const setScreen = useGame((s) => s.setScreen);
  const lastSavedAt = useGame((s) => s.lastSavedAt);
  const hist = view.player.netWorthHistory;
  const dayChange = hist.length > 1 ? view.player.netWorth - hist[hist.length - 2]! : 0;

  return (
    <header className="topbar">
      <div className="brand">
        <button className="brand-mark" onClick={() => setScreen('boot')} title="Menú principal">
          F
        </button>
        <div className="brand-text">
          <span className="brand-name">Fortuna</span>
          <span className="brand-sub faint">Terminal del inversor</span>
        </div>
      </div>

      <div className="clock">
        <span className="clock-date mono">{view.date}</span>
        <span className={`chip ${view.marketOpen ? 'up' : ''}`}>
          <span
            className={`dot ${view.marketOpen ? 'live' : ''}`}
            style={{ color: view.marketOpen ? 'var(--up)' : 'var(--faint)' }}
          />
          {view.marketOpen ? 'Bolsa abierta' : 'Bolsa cerrada'}
        </span>
        <span className="chip">Día {view.gameDay + 1}</span>
      </div>

      <div className="speeds" role="group" aria-label="Velocidad del tiempo">
        {SPEED_LABELS.map((l, i) => (
          <button
            key={l}
            className={`speed ${speed === i ? 'active' : ''}`}
            onClick={() => setSpeed(i)}
            aria-pressed={speed === i}
            title={`${l} (tecla ${i === 0 ? 'Espacio' : i})`}
          >
            {i === 0 ? (
              <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden>
                <rect x="0" y="0" width="3.5" height="12" rx="1" fill="currentColor" />
                <rect x="6.5" y="0" width="3.5" height="12" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <span>{'›'.repeat(Math.min(i, 3))}</span>
            )}
            <span className="speed-label">{l}</span>
          </button>
        ))}
      </div>

      <div className="topbar-right">
        <div className="nw">
          <span className="eyebrow">Patrimonio neto</span>
          <span className="nw-value mono">{money(view.player.netWorth)}</span>
          <span className={`mono nw-delta ${dayChange >= 0 ? 'up' : 'down'}`}>
            {signed(dayChange)} hoy
          </span>
        </div>
        <button className="btn sm" onClick={() => openNotebook()} title="Cuaderno del inversor (N)">
          Cuaderno <span className="chip gold">{view.player.notebook.length}</span>
        </button>
        <button
          className={`btn sm ${debug ? 'gold' : ''}`}
          onClick={toggleDebug}
          title="Mostrar información oculta de la simulación (tecla º)"
        >
          Depuración
        </button>
        <button
          className="btn sm"
          onClick={() => saveNow('manual')}
          title={
            lastSavedAt
              ? `Guardado a las ${new Date(lastSavedAt).toLocaleTimeString()}`
              : 'Guardar partida'
          }
        >
          Guardar
        </button>
      </div>
    </header>
  );
}
