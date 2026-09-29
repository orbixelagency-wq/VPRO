import { useGame } from '../store';

export function LoadingScreen() {
  const label = useGame((s) => s.loadingLabel);
  return (
    <div className="loading" role="status" aria-live="polite">
      <div className="loading-mark">F</div>
      <div className="loading-line">
        <span />
      </div>
      <div className="muted">{label}</div>
      <small className="faint">6 economías · 50 empresas · 48 bonos · un año de historia</small>
    </div>
  );
}
