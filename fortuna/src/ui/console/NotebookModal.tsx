import { useEffect } from 'react';
import { NOTEBOOK } from '../../data/notebook';
import { useGame } from '../store';

export function NotebookModal() {
  const open = useGame((s) => s.notebookOpen);
  const focus = useGame((s) => s.notebookFocus);
  const close = useGame((s) => s.closeNotebook);
  const discovered = useGame((s) => s.view?.player.notebook ?? []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);
  useEffect(() => {
    if (open && focus) document.getElementById(`nb-${focus}`)?.scrollIntoView({ block: 'center' });
  }, [open, focus]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={close}>
      <div
        className="modal notebook"
        role="dialog"
        aria-modal
        aria-label="Cuaderno del inversor"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <div>
            <div className="eyebrow">
              {discovered.length} de {NOTEBOOK.length} conceptos
            </div>
            <span className="panel-title notebook-title">Cuaderno del inversor</span>
          </div>
          <button className="btn ghost sm" onClick={close}>
            Cerrar
          </button>
        </div>
        <div className="panel-body notebook-grid">
          {NOTEBOOK.map((e) => {
            const known = discovered.includes(e.id);
            return (
              <article
                key={e.id}
                id={`nb-${e.id}`}
                className={`nb-entry ${known ? '' : 'locked'} ${focus === e.id ? 'focus' : ''}`}
              >
                <h3>{known ? e.title : '· · ·'}</h3>
                {known ? (
                  <>
                    <p>{e.summary}</p>
                    <p className="nb-lesson">{e.lesson}</p>
                  </>
                ) : (
                  <p className="faint small">Se desbloqueará cuando lo vivas en la partida.</p>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
