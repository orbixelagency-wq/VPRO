import { useMemo, useState } from 'react';
import { COUNTRIES } from '../../data/countries';
import { Sparkline } from '../components/Sparkline';
import { num, pct } from '../format';
import { useGame } from '../store';
import { TradeTicket } from './TradeTicket';

export function BondsTable() {
  const bonds = useGame((s) => s.view!.bonds);
  const countries = useGame((s) => s.view!.countries);
  const [kind, setKind] = useState<'all' | 'government' | 'corporate'>('all');
  const [country, setCountry] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const rows = useMemo(
    () =>
      bonds
        .filter(
          (b) => (kind === 'all' || b.issuerType === kind) && (!country || b.country === country),
        )
        .sort((a, b) => a.country.localeCompare(b.country) || a.years - b.years),
    [bonds, kind, country],
  );
  const selected = bonds.find((b) => b.id === sel);
  const fx = selected ? (countries.find((c) => c.id === selected.country)?.fx ?? 1) : 1;
  return (
    <div className="table-wrap">
      <div className="filters">
        <div className="tabs small-tabs">
          {(
            [
              ['all', 'Todos'],
              ['government', 'Deuda pública'],
              ['corporate', 'Empresas'],
            ] as const
          ).map(([k, l]) => (
            <button
              key={k}
              className={`tab ${kind === k ? 'active' : ''}`}
              onClick={() => setKind(k)}
            >
              {l}
            </button>
          ))}
        </div>
        <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="País">
          <option value="">Todos los países</option>
          {COUNTRIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <span className="faint small">
          Precio por 100 de nominal · cada título = 100 de nominal
        </span>
      </div>
      <div className="split">
        <div className="scroll">
          <table className="data">
            <thead>
              <tr>
                <th>Bono</th>
                <th className="r">Rating</th>
                <th className="r">Cupón</th>
                <th className="r">TIR</th>
                <th className="r">Precio</th>
                <th className="r">Vence</th>
                <th className="r">Duración</th>
                <th>60 días</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.id} className={sel === b.id ? 'sel' : ''} onClick={() => setSel(b.id)}>
                  <td>
                    <span className="ticker">{b.id}</span>
                    {b.held > 0 && <span className="pill-held" />}
                    <br />
                    <span className="co-name">{b.name}</span>
                  </td>
                  <td className={`r mono rating-${b.rating}`}>{b.rating}</td>
                  <td className="r mono">{pct(b.coupon)}</td>
                  <td className="r mono">{pct(b.yield)}</td>
                  <td className="r mono">
                    {num(b.price)} <span className="faint">{b.currency}</span>
                  </td>
                  <td className="r mono">{num(b.years, 1)} a</td>
                  <td className="r mono">{num(b.duration, 1)}</td>
                  <td>
                    <Sparkline data={b.spark} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {selected && (
          <aside className="side-ticket">
            <div className="eyebrow">
              {selected.issuerType === 'government' ? 'Deuda pública' : 'Deuda corporativa'}
            </div>
            <h3 className="side-title">{selected.name}</h3>
            <p className="muted small">
              Cobras un cupón del {pct(selected.coupon)} anual sobre el nominal y recuperas 100 al
              vencimiento si el emisor no quiebra. Con duración {num(selected.duration, 1)}, si los
              tipos suben un 1 %, el precio cae aprox. un {num(selected.duration, 1)} %.
            </p>
            <TradeTicket
              asset="bond"
              id={selected.id}
              held={selected.held}
              unitLabel="títulos"
              priceAur={selected.price * fx}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
