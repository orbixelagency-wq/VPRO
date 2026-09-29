import { useMemo, useState } from 'react';
import { useGame } from '../store';

const DIFFICULTIES = [
  {
    id: 'normal',
    name: 'Normal',
    desc: 'Ciclos y crisis como en la vida real.',
    settings: { volatility: 1, crisisFrequency: 1, sandbox: false },
  },
  {
    id: 'realista',
    name: 'Realista',
    desc: 'Más volatilidad y crisis más frecuentes. Sin piedad.',
    settings: { volatility: 1.2, crisisFrequency: 1.6, sandbox: false },
  },
  {
    id: 'tranquilo',
    name: 'Tranquilo',
    desc: 'Mercados más calmados para aprender.',
    settings: { volatility: 0.75, crisisFrequency: 0.5, sandbox: false },
  },
  {
    id: 'sandbox',
    name: 'Sandbox',
    desc: 'Crédito ilimitado para experimentar sin consecuencias.',
    settings: { volatility: 1, crisisFrequency: 1, sandbox: true },
  },
] as const;

export function SetupScreen() {
  const start = useGame((s) => s.startNewGame);
  const back = useGame((s) => s.setScreen);
  const initialSeed = useMemo(() => Math.floor(Math.random() * 1_000_000), []);
  const [name, setName] = useState('Álex');
  const [seed, setSeed] = useState(String(initialSeed));
  const [diff, setDiff] = useState<(typeof DIFFICULTIES)[number]['id']>('normal');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = DIFFICULTIES.find((x) => x.id === diff)!;
    start({
      seed: Number(seed) || 1,
      playerName: name.trim() || 'Álex',
      settings: { ...d.settings },
    });
  };

  return (
    <div className="setup">
      <form className="setup-card" onSubmit={submit}>
        <div className="eyebrow">Nueva partida</div>
        <h2 className="setup-title">¿Quién llega hoy a Puerto Valmera?</h2>
        <label className="field">
          <span>Nombre</span>
          <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} autoFocus />
        </label>
        <div className="field">
          <span>Dificultad</span>
          <div className="diff-grid">
            {DIFFICULTIES.map((d) => (
              <button
                type="button"
                key={d.id}
                className={`diff ${diff === d.id ? 'active' : ''}`}
                onClick={() => setDiff(d.id)}
                aria-pressed={diff === d.id}
              >
                <b>{d.name}</b>
                <small>{d.desc}</small>
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>
            Semilla del mundo{' '}
            <small className="muted">— la misma semilla genera la misma economía</small>
          </span>
          <input
            className="mono"
            value={seed}
            onChange={(e) => setSeed(e.target.value.replace(/\D/g, '').slice(0, 9))}
          />
        </label>
        <div className="setup-origin">
          <div className="eyebrow">Tu punto de partida</div>
          <p>
            Habitación compartida en el barrio de Las Grúas · Mozo de almacén en Logística Rumbo ·{' '}
            <b className="mono">1.180 ₳</b> netos al mes · <b className="mono">890 ₳</b> de gastos ·{' '}
            <b className="mono">600 ₳</b> ahorrados.
          </p>
          <small className="muted">
            Los orígenes alternativos (deuda heredada, beca, negocio familiar…) llegan en la fase 6.
          </small>
        </div>
        <div className="setup-actions">
          <button type="button" className="btn ghost" onClick={() => back('boot')}>
            Volver
          </button>
          <button type="submit" className="btn gold">
            Empezar
          </button>
        </div>
      </form>
    </div>
  );
}
