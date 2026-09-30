import { useEffect, useMemo, useRef, useState } from 'react';
import type { CatalogPage, CatalogQuery } from '../../investments/view';
import { CLASS_META } from '../../investments/meta';
import type { AssetClassId } from '../../investments/types';
import { Sparkline } from '../components/Sparkline';
import { compact, num, pct, toneClass } from '../format';
import { getClient, useGame } from '../store';

const GROUPS = [
  'Mercados',
  'Derivados',
  'Inmuebles y activos reales',
  'Mercados privados',
  'Alternativos',
  'Ahorro y previsión',
] as const;
const PAGE = 60;

type Sort = NonNullable<CatalogQuery['sort']>;

export function Explorer() {
  const summary = useGame((s) => s.view!.catalog);
  const tick = useGame((s) => s.view!.tick);
  const setTab = useGame((s) => s.setTab);
  const selectInstrument = useGame((s) => s.selectInstrument);
  const selectedInstrument = useGame((s) => s.selectedInstrument);
  const focus = useGame((s) => s.focus);
  const [cls, setCls] = useState<AssetClassId | 'all'>('realestate');
  const [q, setQ] = useState('');
  const [sub, setSub] = useState('');
  const [region, setRegion] = useState('');
  const [sort, setSort] = useState<{ key: Sort; dir: 1 | -1 }>({ key: 'price', dir: 1 });
  const [heldOnly, setHeldOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState('');
  const [limit, setLimit] = useState(PAGE);
  const [page, setPage] = useState<CatalogPage | null>(null);
  const lastFetch = useRef(0);

  const query = useMemo<CatalogQuery>(
    () => ({
      cls,
      q,
      sub: sub || undefined,
      region: region || undefined,
      sort: sort.key,
      dir: sort.dir,
      offset: 0,
      limit,
      heldOnly,
      maxPrice: Number(maxPrice.replace(/\D/g, '')) || undefined,
    }),
    [cls, q, sub, region, sort, limit, heldOnly, maxPrice],
  );

  // Consulta al worker: inmediata al cambiar filtros y, como mucho, cada segundo si avanza el tiempo.
  useEffect(() => {
    let alive = true;
    lastFetch.current = Date.now();
    getClient()
      .catalog(query)
      .then((p) => alive && setPage(p));
    return () => {
      alive = false;
    };
  }, [query]);
  useEffect(() => {
    if (Date.now() - lastFetch.current < 1000) return;
    lastFetch.current = Date.now();
    getClient().catalog(query).then(setPage);
  }, [tick, query]);

  const meta = CLASS_META.find((m) => m.id === cls);
  const pickClass = (id: string) => {
    if (id === 'stock') return setTab('stocks');
    if (id === 'bond') return setTab('bonds');
    setCls(id as AssetClassId);
    setSub('');
    setRegion('');
    setLimit(PAGE);
    setSort({ key: 'price', dir: 1 });
  };
  const header = (key: Sort, label: string, r = true) => (
    <th
      className={`sortable ${r ? 'r' : ''}`}
      onClick={() =>
        setSort((s) => ({
          key,
          dir: s.key === key ? (s.dir === 1 ? -1 : 1) : key === 'name' ? 1 : -1,
        }))
      }
      aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}
    >
      {label} {sort.key === key ? (sort.dir === 1 ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div className="explorer">
      <aside className="class-list scroll" aria-label="Clases de activo">
        <div className="class-total">
          <span className="mono">{summary.total.toLocaleString('es-ES')}</span>
          <span className="muted small">oportunidades</span>
        </div>
        <button
          className={`class-item ${cls === 'all' ? 'active' : ''}`}
          onClick={() => pickClass('all')}
        >
          <span className="glyph">∗</span>
          <span className="cname">Todo el catálogo</span>
        </button>
        {GROUPS.map((g) => (
          <div key={g} className="class-group">
            <div className="eyebrow">{g}</div>
            {summary.classes
              .filter((c) => c.group === g)
              .map((c) => (
                <button
                  key={c.id}
                  className={`class-item ${cls === c.id ? 'active' : ''}`}
                  onClick={() => pickClass(c.id)}
                >
                  <span className="glyph">{c.glyph}</span>
                  <span className="cname">{c.name}</span>
                  {c.held > 0 && <span className="pill-held" title={`${c.held} en cartera`} />}
                  <span className="ccount mono">{c.count.toLocaleString('es-ES')}</span>
                </button>
              ))}
          </div>
        ))}
      </aside>
      <div className="catalog">
        <div className="catalog-head">
          <div>
            <div className="catalog-title">
              {meta ? `${meta.glyph} ${meta.name}` : 'Todo el catálogo'}
            </div>
            <p className="muted small">
              {meta?.description ?? 'Miles de formas de invertir. Filtra, investiga y decide.'}
            </p>
          </div>
          {meta && (
            <div className="risk" title="Riesgo de la clase de activo">
              {[1, 2, 3, 4, 5].map((i) => (
                <span key={i} className={i <= meta.risk ? 'on' : ''} />
              ))}
              <small className="muted">riesgo</small>
            </div>
          )}
        </div>
        <div className="filters">
          <input
            placeholder="Buscar…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Buscar en el catálogo"
          />
          {page && page.subs.length > 1 && (
            <select value={sub} onChange={(e) => setSub(e.target.value)} aria-label="Tipo">
              <option value="">Todos los tipos</option>
              {page.subs.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
          {page && page.regions.length > 1 && (
            <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Zona">
              <option value="">Todas las zonas</option>
              {page.regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
          <input
            className="mono price-cap"
            placeholder="Precio máx. ₳"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
            aria-label="Precio máximo"
          />
          <label className="check">
            <input
              type="checkbox"
              checked={heldOnly}
              onChange={(e) => setHeldOnly(e.target.checked)}
            />{' '}
            Mías
          </label>
          <span className="faint small">
            {page ? `${page.total.toLocaleString('es-ES')} resultados` : 'Cargando…'}
          </span>
        </div>
        <div className="scroll catalog-table">
          <table className="data">
            <thead>
              <tr>
                {header('name', 'Activo', false)}
                {header('price', 'Precio')}
                {header('yield', 'Renta')}
                {header('change', 'Tendencia')}
                <th>Evolución</th>
                <th>Liquidez</th>
                {header('expires', 'Disponible')}
              </tr>
            </thead>
            <tbody>
              {page?.rows.map((r) => (
                <tr
                  key={r.id}
                  className={focus === 'instrument' && selectedInstrument === r.id ? 'sel' : ''}
                  onClick={() => selectInstrument(r.id)}
                >
                  <td className="inst-cell">
                    <span className="inst-name">{r.name}</span>
                    {r.held && <span className="pill-held" title="En tu cartera" />}
                    <br />
                    <span className="faint small">
                      {r.sub} · {r.region}
                      {r.research > 0 ? ` · investigado ${r.research}/3` : ''}
                    </span>
                  </td>
                  <td className="r mono">
                    {r.priceAur >= 10_000 ? compact(r.priceAur) : `${num(r.priceAur)} ₳`}
                  </td>
                  <td className="r mono">
                    {r.yield > 0 ? pct(r.yield, 1) : <span className="faint">—</span>}
                  </td>
                  <td className={`r mono ${toneClass(r.change)}`}>
                    {r.change !== 0 ? pct(r.change, 1, true) : <span className="faint">—</span>}
                  </td>
                  <td>
                    {r.spark.length > 2 ? (
                      <Sparkline data={r.spark} />
                    ) : (
                      <span className="faint small">—</span>
                    )}
                  </td>
                  <td className="small muted">
                    {r.locked ? <span className="chip tiny lock">bloqueado</span> : r.liquidity}
                  </td>
                  <td className="r small muted">
                    {r.expiresInDays !== null ? `${r.expiresInDays} d` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {page && page.total > page.rows.length && (
            <div className="more">
              <button className="btn sm" onClick={() => setLimit((l) => l + PAGE)}>
                Mostrar más ({(page.total - page.rows.length).toLocaleString('es-ES')} restantes)
              </button>
            </div>
          )}
          {page && page.total === 0 && (
            <p className="empty-state muted">No hay nada con esos filtros.</p>
          )}
        </div>
      </div>
    </div>
  );
}
