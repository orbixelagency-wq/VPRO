import { NOTEBOOK } from '../../data/notebook';
import { useGame } from '../store';

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const dismiss = useGame((s) => s.dismissToast);
  const openNotebook = useGame((s) => s.openNotebook);
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => {
        const entry = t.kind === 'notebook' ? NOTEBOOK.find((e) => e.id === t.body) : undefined;
        return (
          <div
            key={t.id}
            className={`toast ${t.kind}`}
            onClick={() => {
              if (entry) openNotebook(entry.id);
              dismiss(t.id);
            }}
          >
            <div className="t">{entry ? `Cuaderno · ${entry.title}` : t.title}</div>
            <div className="b">
              {entry ? 'Nuevo concepto aprendido. Pulsa para leerlo.' : t.body}
            </div>
          </div>
        );
      })}
    </div>
  );
}
