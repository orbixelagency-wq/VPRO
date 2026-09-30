import { useEffect, useState } from 'react';
import { DERIVATIVES_QUIZ } from '../../data/quiz';
import { getClient, useGame } from '../store';

export function QuizModal() {
  const open = useGame((s) => s.quizOpen);
  const setOpen = useGame((s) => s.setQuizOpen);
  const pushToast = useGame((s) => s.pushToast);
  const [answers, setAnswers] = useState<number[]>([]);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (!open) return;
    setAnswers([]);
    setChecked(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);
  if (!open) return null;
  const submit = async () => {
    setChecked(true);
    const r = await getClient().command({ type: 'unlockDerivatives', answers });
    pushToast({
      kind: r.ok ? 'good' : 'bad',
      title: r.ok ? 'Derivados desbloqueados' : 'Test no superado',
      body: r.message,
    });
    if (r.ok) setOpen(false);
  };
  return (
    <div className="modal-backdrop" onClick={() => setOpen(false)}>
      <div
        className="modal quiz"
        role="dialog"
        aria-modal
        aria-label="Test de conveniencia"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <div>
            <div className="eyebrow">Obligatorio antes de operar con derivados</div>
            <span className="panel-title notebook-title">Test de conveniencia</span>
          </div>
          <button className="btn ghost sm" onClick={() => setOpen(false)}>
            Cerrar
          </button>
        </div>
        <div className="panel-body">
          <p className="muted small">
            Los derivados pueden hacerte perder más de lo que inviertes en muy poco tiempo. Además
            del test, necesitas un patrimonio de al menos 5.000 ₳.
          </p>
          {DERIVATIVES_QUIZ.map((q, i) => (
            <fieldset key={i} className="quiz-q">
              <legend>
                {i + 1}. {q.q}
              </legend>
              {q.options.map((o, j) => (
                <label
                  key={j}
                  className={`quiz-opt ${checked && answers[i] === j ? (j === q.answer ? 'right' : 'wrong') : ''}`}
                >
                  <input
                    type="radio"
                    name={`q${i}`}
                    checked={answers[i] === j}
                    onChange={() => setAnswers((a) => Object.assign([...a], { [i]: j }))}
                  />{' '}
                  {o}
                </label>
              ))}
              {checked && answers[i] !== q.answer && <p className="small gold">{q.why}</p>}
            </fieldset>
          ))}
          <button
            className="btn gold"
            disabled={answers.filter((a) => a !== undefined).length < DERIVATIVES_QUIZ.length}
            onClick={submit}
          >
            Enviar respuestas
          </button>
        </div>
      </div>
    </div>
  );
}
