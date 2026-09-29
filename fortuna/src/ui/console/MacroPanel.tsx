import { useMemo, useState } from 'react';
import { Chart } from '../components/Chart';
import { num, pct, toneClass } from '../format';
import { useGame } from '../store';

const SERIES = [
  { id: 'gdpGrowth', label: 'Crecimiento PIB' },
  { id: 'inflation', label: 'Inflación' },
  { id: 'rate', label: 'Tipo oficial' },
  { id: 'unemployment', label: 'Paro' },
] as const;

export function MacroPanel() {
  const countries = useGame((s) => s.view!.countries);
  const [sel, setSel] = useState('castelia');
  const [series, setSeries] = useState<(typeof SERIES)[number]['id']>('inflation');
  const c = countries.find((x) => x.id === sel) ?? countries[0]!;
  const data = useMemo(() => c.history.map((h) => h[series]), [c, series]);
  return (
    <div className="macro">
      <table className="data">
        <thead>
          <tr>
            <th>País</th>
            <th className="r">PIB</th>
            <th className="r">IPC</th>
            <th className="r">Paro</th>
            <th className="r">Tipo</th>
            <th className="r">Bono 2a</th>
            <th className="r">Bono 10a</th>
            <th className="r">Deuda/PIB</th>
            <th className="r">PMI</th>
            <th className="r">Divisa/₳</th>
          </tr>
        </thead>
        <tbody>
          {countries.map((x) => (
            <tr key={x.id} className={x.id === sel ? 'sel' : ''} onClick={() => setSel(x.id)}>
              <td>
                <b>{x.name}</b> <span className="faint mono small">{x.currency}</span>
              </td>
              <td className={`r mono ${toneClass(x.gdpGrowth)}`}>{pct(x.gdpGrowth, 1)}</td>
              <td className="r mono">{pct(x.inflation, 1)}</td>
              <td className="r mono">{pct(x.unemployment, 1)}</td>
              <td className="r mono">{pct(x.policyRate)}</td>
              <td className="r mono">{pct(x.y2)}</td>
              <td className={`r mono ${x.y2 > x.y10 ? 'down' : ''}`}>{pct(x.y10)}</td>
              <td className="r mono">{pct(x.debtToGdp, 0)}</td>
              <td className={`r mono ${x.pmi >= 50 ? 'up' : 'down'}`}>{num(x.pmi, 1)}</td>
              <td className="r mono">{num(x.fx, 4)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="range-row section-gap">
        <div className="tabs small-tabs">
          {SERIES.map((s) => (
            <button
              key={s.id}
              className={`tab ${series === s.id ? 'active' : ''}`}
              onClick={() => setSeries(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="muted small">{c.name} · últimos meses</span>
      </div>
      <Chart data={data} height={180} format={(v) => pct(v, 1)} tone="gold" />
    </div>
  );
}
