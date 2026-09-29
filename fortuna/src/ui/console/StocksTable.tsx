import { useMemo, useState } from 'react';
import { SECTORS } from '../../data/sectors';
import { COUNTRIES } from '../../data/countries';
import type { CompanyRow } from '../../economy/view';
import { Sparkline } from '../components/Sparkline';
import { capMillions, num, pct, toneClass } from '../format';
import { useGame } from '../store';

type SortKey = 'id' | 'price' | 'changePct' | 'marketCap' | 'pe' | 'divYield';

const COLS: { key: SortKey; label: string; r?: boolean }[] = [
  { key: 'id', label: 'Valor' },
  { key: 'price', label: 'Precio', r: true },
  { key: 'changePct', label: 'Hoy', r: true },
  { key: 'marketCap', label: 'Capitaliz.', r: true },
  { key: 'pe', label: 'PER', r: true },
  { key: 'divYield', label: 'Div.', r: true },
];

export function StocksTable() {
  const companies = useGame((s) => s.view!.companies);
  const selected = useGame((s) => s.selected);
  const select = useGame((s) => s.select);
  const debug = useGame((s) => s.debug);
  const [q, setQ] = useState('');
  const [sector, setSector] = useState('');
  const [country, setCountry] = useState('');
  const [onlyHeld, setOnlyHeld] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'marketCap', dir: -1 });

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const filtered = companies.filter(
      (c) =>
        (!needle || c.id.toLowerCase().includes(needle) || c.name.toLowerCase().includes(needle)) &&
        (!sector || c.sector === sector) &&
        (!country || c.country === country) &&
        (!onlyHeld || c.held > 0),
    );
    const val = (c: CompanyRow) => {
      const v = c[sort.key];
      return typeof v === 'string' ? v : (v ?? -Infinity);
    };
    return filtered.sort((a, b) => {
      const va = val(a);
      const vb = val(b);
      return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir;
    });
  }, [companies, q, sector, country, onlyHeld, sort]);

  return (
    <div className="table-wrap">
      <div className="filters">
        <input
          placeholder="Buscar empresa o ticker…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar"
        />
        <select value={sector} onChange={(e) => setSector(e.target.value)} aria-label="Sector">
          <option value="">Todos los sectores</option>
          {SECTORS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select value={country} onChange={(e) => setCountry(e.target.value)} aria-label="País">
          <option value="">Todos los países</option>
          {COUNTRIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <label className="check">
          <input
            type="checkbox"
            checked={onlyHeld}
            onChange={(e) => setOnlyHeld(e.target.checked)}
          />{' '}
          En cartera
        </label>
        <span className="faint small">{rows.length} valores</span>
      </div>
      <div className="scroll">
        <table className="data">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th
                  key={c.key}
                  className={`sortable ${c.r ? 'r' : ''}`}
                  onClick={() =>
                    setSort((s) => ({
                      key: c.key,
                      dir: s.key === c.key ? (s.dir === 1 ? -1 : 1) : c.key === 'id' ? 1 : -1,
                    }))
                  }
                  aria-sort={
                    sort.key === c.key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'
                  }
                >
                  {c.label} {sort.key === c.key ? (sort.dir === 1 ? '↑' : '↓') : ''}
                </th>
              ))}
              <th>40 días</th>
              <th>Sector</th>
              {debug && <th className="r">Valor razonable</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className={selected === c.id ? 'sel' : ''}
                onClick={() => select(c.id)}
              >
                <td>
                  <span className="ticker">{c.id}</span>
                  {c.held > 0 && <span className="pill-held" title="En tu cartera" />}
                  {c.takeover && <span className="chip gold tiny">OPA</span>}
                  <br />
                  <span className="co-name">{c.name}</span>
                </td>
                <td className="r mono">
                  {num(c.price)} <span className="faint">{c.currency}</span>
                </td>
                <td className={`r mono ${toneClass(c.changePct)}`}>{pct(c.changePct, 2, true)}</td>
                <td className="r mono">{capMillions(c.marketCap)}</td>
                <td className="r mono">
                  {c.pe === null ? <span className="faint">pérd.</span> : num(c.pe, 1)}
                </td>
                <td className="r mono">
                  {c.divYield > 0 ? pct(c.divYield, 1) : <span className="faint">—</span>}
                </td>
                <td>
                  <Sparkline data={c.spark} />
                </td>
                <td className="muted small">{c.sectorName}</td>
                {debug && c.debug && (
                  <td className="r mono debug">
                    {num(c.debug.fairValue)} {c.debug.fraud ? '⚠ fraude' : ''}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
