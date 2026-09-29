import { useCallback, useMemo, useState } from 'react';
import { CEO_STYLES } from '../../data/names';
import { formatShortDate } from '../../economy/calendar';
import { Chart } from '../components/Chart';
import { capMillions, compact, money, num, pct, toneClass } from '../format';
import { useGame } from '../store';
import { NewsItem } from './NewsFeed';
import { TradeTicket } from './TradeTicket';

const RANGES = [
  { id: '1D', label: '1D', days: 0 },
  { id: '1M', label: '1M', days: 22 },
  { id: '6M', label: '6M', days: 126 },
  { id: '1A', label: '1A', days: 252 },
  { id: 'MAX', label: 'Todo', days: 100000 },
] as const;

export function CompanyPanel() {
  const c = useGame((s) => s.view?.selected);
  const tick = useGame((s) => s.view!.tick);
  const debug = useGame((s) => s.debug);
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('6M');
  const r = RANGES.find((x) => x.id === range)!;
  const data = useMemo(() => {
    if (!c) return [];
    if (r.days === 0) return c.intraday.length > 1 ? c.intraday : [c.prevClose, c.price];
    return [...c.closes.slice(-r.days), c.price];
  }, [c, r.days]);
  const today = Math.floor(tick / 24);
  const n = data.length;
  const labelAt = useCallback(
    (i: number) =>
      r.days === 0 ? `${9 + i}:00` : formatShortDate(today - Math.round(((n - 1 - i) * 7) / 5)),
    [r.days, today, n],
  );

  if (!c) {
    return (
      <section className="panel company">
        <div className="panel-body empty-state muted">
          Selecciona una empresa para ver su ficha.
        </div>
      </section>
    );
  }
  const change = c.price / c.prevClose - 1;
  const rangeChange = data.length > 1 ? c.price / data[0]! - 1 : 0;
  const style = CEO_STYLES.find((s) => s.id === c.ceoStyle)?.name ?? c.ceoStyle;

  return (
    <section className="panel company">
      <div className="panel-head company-head">
        <div>
          <div className="eyebrow">
            {c.sectorName} · {c.currency}
          </div>
          <div className="company-name">
            <span className="ticker big">{c.id}</span> {c.name}
          </div>
        </div>
        <div className="r">
          <div className="company-price mono">
            {num(c.price)} <span className="faint small">{c.currency}</span>
          </div>
          <div className={`mono ${toneClass(change)}`}>{pct(change, 2, true)} hoy</div>
        </div>
      </div>
      <div className="panel-body">
        {c.takeoverInfo && (
          <div className="banner gold">
            OPA de <b>{c.takeoverInfo.bidder}</b> a{' '}
            <b className="mono">{num(c.takeoverInfo.price)}</b> por acción. El precio cotiza cerca
            de la oferta hasta su liquidación.
          </div>
        )}
        {c.status === 'bankrupt' && (
          <div className="banner bad">En concurso de acreedores. Dejará de cotizar en breve.</div>
        )}
        <div className="range-row">
          <div className="tabs small-tabs">
            {RANGES.map((x) => (
              <button
                key={x.id}
                className={`tab ${range === x.id ? 'active' : ''}`}
                onClick={() => setRange(x.id)}
              >
                {x.label}
              </button>
            ))}
          </div>
          <span className={`mono small ${toneClass(rangeChange)}`}>
            {pct(rangeChange, 2, true)}
          </span>
        </div>
        <Chart
          data={data}
          height={210}
          reference={r.days === 0 ? c.prevClose : undefined}
          referenceLabel={r.days === 0 ? 'Cierre anterior' : undefined}
          labelAt={labelAt}
        />

        <div className="stat-grid three" style={{ marginTop: 12 }}>
          <Stat k="Capitalización" v={capMillions(c.marketCap)} />
          <Stat k="PER" v={c.pe === null ? 'Pérdidas' : num(c.pe, 1)} />
          <Stat k="Rent. dividendo" v={c.divYield > 0 ? pct(c.divYield, 2) : '—'} />
          <Stat k="Ventas (12 m)" v={compact(c.revenueTtm * 1e6, ' ' + c.currency)} />
          <Stat
            k="Beneficio (12 m)"
            v={compact(c.earningsTtm * 1e6, ' ' + c.currency)}
            tone={c.earningsTtm}
          />
          <Stat k="Margen" v={pct(c.margin, 1)} />
          <Stat k="Deuda" v={compact(c.debt * 1e6, ' ' + c.currency)} />
          <Stat k="Caja" v={compact(c.cash * 1e6, ' ' + c.currency)} />
          <Stat k="Rating" v={c.rating} />
          <Stat k="Rango día" v={`${num(c.dayLow)} – ${num(c.dayHigh)}`} />
          <Stat k="Diferencial" v={pct(c.spreadPct, 2)} />
          <Stat k="Resultados en" v={`${c.nextEarningsInDays} días`} />
        </div>

        {c.holding && (
          <div className="holding-box">
            <div className="eyebrow">Tu posición</div>
            <div className="holding-grid">
              <span>
                <b className="mono">{num(c.holding.qty, 0)}</b>{' '}
                {c.holding.qty === 1 ? 'acción' : 'acciones'}
              </span>
              <span className="muted">
                coste medio <b className="mono">{money(c.holding.avgCost)}</b>
              </span>
              <span className="mono">{money(c.holding.value)}</span>
              <span className={`mono ${toneClass(c.holding.pnl)}`}>{money(c.holding.pnl)}</span>
            </div>
          </div>
        )}

        <TradeTicket
          asset="stock"
          id={c.id}
          held={c.holding?.qty ?? 0}
          unitLabel="acciones"
          priceAur={c.priceAur}
        />

        {debug && c.debug && (
          <div className="debug small mono">
            valor razonable {num(c.debug.fairValue)} · sentimiento {num(c.debug.sentiment, 3)} ·
            calidad {num(c.debug.quality, 2)} {c.debug.fraud ? '· ⚠ FRAUDE CONTABLE' : ''}
          </div>
        )}

        <p className="faint small company-meta">
          Fundada en {c.founded} · Consejero delegado: {c.ceo} (perfil {style}) · {num(c.shares, 1)}{' '}
          M de acciones · volumen medio {compact(c.adv, '')} acciones/día
        </p>

        <div className="eyebrow" style={{ margin: '14px 0 6px' }}>
          Noticias de la empresa
        </div>
        {c.news.length === 0 ? (
          <p className="muted small">Sin noticias recientes.</p>
        ) : (
          c.news.map((n) => <NewsItem key={n.id} n={n} compact />)
        )}
      </div>
    </section>
  );
}

function Stat({ k, v, tone }: { k: string; v: string; tone?: number }) {
  return (
    <div className="stat">
      <div className="k">{k}</div>
      <div className={`v ${tone !== undefined ? toneClass(tone) : ''}`}>{v}</div>
    </div>
  );
}
