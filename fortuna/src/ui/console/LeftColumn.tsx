import { useCallback } from 'react';
import { formatShortDate } from '../../economy/calendar';
import { Chart } from '../components/Chart';
import { Sparkline } from '../components/Sparkline';
import { compact, money, num, pct, toneClass } from '../format';
import { useGame } from '../store';

export function WealthCard() {
  const p = useGame((s) => s.view!.player);
  const tick = useGame((s) => s.view!.tick);
  const hist = p.netWorthHistory;
  const today = Math.floor(tick / 24);
  const labelAt = useCallback(
    (i: number) => formatShortDate(today - (hist.length - 1 - i)),
    [today, hist.length],
  );
  const parts = [
    { k: 'Efectivo', v: p.cash, c: 'var(--paper-2)' },
    { k: 'Ahorro', v: p.savings + p.deposits, c: 'var(--blue)' },
    { k: 'Acciones', v: p.stocks, c: 'var(--gold)' },
    { k: 'Bonos', v: p.bonds, c: 'var(--up)' },
    { k: 'Alternativos', v: p.alternatives + p.margin, c: '#c69cf0' },
  ];
  const gross = parts.reduce((a, x) => a + Math.max(0, x.v), 0) || 1;
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Tu patrimonio</span>
        {p.bankrupt ? (
          <span className="chip down">Bancarrota</span>
        ) : (
          <span className="chip">Solvencia {p.creditScore}</span>
        )}
      </div>
      <div className="panel-body">
        <div className="wealth-big mono">{money(p.netWorth)}</div>
        <div className="alloc-bar" aria-label="Reparto del patrimonio">
          {parts.map((x) => (
            <span
              key={x.k}
              style={{ width: `${(Math.max(0, x.v) / gross) * 100}%`, background: x.c }}
            />
          ))}
        </div>
        <div className="alloc-legend">
          {parts.map((x) => (
            <div key={x.k}>
              <i style={{ background: x.c }} />
              <span className="muted">{x.k}</span>
              <span className="mono">{compact(x.v)}</span>
            </div>
          ))}
          {p.debt > 0 && (
            <div>
              <i style={{ background: 'var(--down)' }} />
              <span className="muted">Deuda</span>
              <span className="mono down">−{compact(p.debt)}</span>
            </div>
          )}
        </div>
        {hist.length > 2 ? (
          <Chart
            data={hist}
            height={120}
            format={(v) => compact(v)}
            labelAt={labelAt}
            tone="gold"
          />
        ) : (
          <p className="muted small">La evolución de tu patrimonio aparecerá aquí día a día.</p>
        )}
        <div className="stat-grid" style={{ marginTop: 10 }}>
          <div className="stat">
            <div className="k">Nómina neta</div>
            <div className="v">{p.job ? money(p.job.netMonthly, 0) : '—'}</div>
          </div>
          <div className="stat">
            <div className="k">Gastos al mes</div>
            <div className="v">{money(p.monthlyExpenses, 0)}</div>
          </div>
        </div>
        {p.job && (
          <p className="faint small" style={{ marginTop: 8 }}>
            {p.job.title} · {p.job.employer}
          </p>
        )}
      </div>
    </section>
  );
}

export function IndicesCard() {
  const indices = useGame((s) => s.view!.indices);
  const countries = useGame((s) => s.view!.countries);
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Mercados</span>
      </div>
      <div className="panel-body tight">
        {indices.map((i) => (
          <div key={i.id} className="quote-row">
            <div>
              <div className="ticker">{i.name}</div>
              <div className="faint small mono">{i.id}</div>
            </div>
            <Sparkline data={i.closes.slice(-60)} width={70} />
            <div className="r">
              <div className="mono">{num(i.value, 0)}</div>
              <div className={`mono small ${toneClass(i.changePct)}`}>
                {pct(i.changePct, 2, true)}
              </div>
            </div>
          </div>
        ))}
        {countries
          .filter((c) => c.id !== 'castelia')
          .slice(0, 3)
          .map((c) => (
            <div key={c.id} className="quote-row">
              <div>
                <div className="ticker">{c.currency}/AUR</div>
                <div className="faint small">{c.name}</div>
              </div>
              <span />
              <div className="r mono">{num(c.fx, 4)}</div>
            </div>
          ))}
      </div>
    </section>
  );
}

export function PulseCard() {
  const v = useGame((s) => s.view!);
  const home = v.countries.find((c) => c.id === 'castelia')!;
  const fearPct = Math.min(1, (v.fear - 9) / 60);
  const fearLabel =
    v.fear < 14
      ? 'Complacencia'
      : v.fear < 20
        ? 'Calma'
        : v.fear < 30
          ? 'Nerviosismo'
          : v.fear < 45
            ? 'Miedo'
            : 'Pánico';
  const inverted = home.y2 > home.y10;
  return (
    <section className="panel">
      <div className="panel-head">
        <span className="panel-title">Pulso económico</span>
        <span className="chip gold">{v.phaseLabel}</span>
      </div>
      <div className="panel-body">
        <div className="fear">
          <div className="fear-head">
            <span className="muted small">Índice de miedo</span>
            <span className="mono">
              {num(v.fear, 1)} · {fearLabel}
            </span>
          </div>
          <div className="fear-track">
            <span style={{ left: `${fearPct * 100}%` }} />
          </div>
        </div>
        <div className="stat-grid">
          <div className="stat">
            <div className="k">Tipo oficial</div>
            <div className="v">{pct(home.policyRate)}</div>
          </div>
          <div className="stat">
            <div className="k">Inflación</div>
            <div className="v">{pct(home.inflation, 1)}</div>
          </div>
          <div className="stat">
            <div className="k">PIB (anual.)</div>
            <div className={`v ${toneClass(home.gdpGrowth)}`}>{pct(home.gdpGrowth, 1)}</div>
          </div>
          <div className="stat">
            <div className="k">Paro</div>
            <div className="v">{pct(home.unemployment, 1)}</div>
          </div>
          <div className="stat">
            <div className="k">Bono 2 / 10 años</div>
            <div className="v">
              {pct(home.y2)} / {pct(home.y10)}
            </div>
          </div>
          <div className="stat">
            <div className="k">Crudo Qaravel</div>
            <div className="v">{num(v.oil, 1)} 𝔇</div>
          </div>
        </div>
        {inverted && (
          <p className="signal small">
            Curva de tipos invertida: históricamente, un aviso de recesión.
          </p>
        )}
        {v.shock && <p className="signal bad small">Crisis sistémica en curso.</p>}
        {v.debug && (
          <p className="debug small mono">
            próxima fase: {v.debug.nextPhase ?? '—'} ({v.debug.monthsToNext} m) · burbuja{' '}
            {num(v.debug.froth, 2)} · prima riesgo {pct(v.debug.equityPremium)}
          </p>
        )}
      </div>
    </section>
  );
}
