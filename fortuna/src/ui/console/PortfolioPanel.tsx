import { money, num, pct, toneClass } from '../format';
import { getClient, useGame } from '../store';

export function PortfolioPanel() {
  const p = useGame((s) => s.view!.player);
  const alt = useGame((s) => s.view!.catalogHoldings);
  const altOrders = useGame((s) => s.view!.catalogOrders);
  const selectInstrument = useGame((s) => s.selectInstrument);
  const select = useGame((s) => s.select);
  const setTab = useGame((s) => s.setTab);
  const totalValue =
    p.holdings.reduce((a, h) => a + h.value, 0) + alt.reduce((a, h) => a + h.value, 0);
  const totalCost =
    p.holdings.reduce((a, h) => a + h.cost, 0) +
    alt.reduce((a, h) => a + (h.cls === 'future' || h.cls === 'cfd' ? h.value : h.cost), 0);
  const t = p.tax;
  return (
    <div className="portfolio">
      <div className="stat-grid four">
        <div className="stat">
          <div className="k">Invertido</div>
          <div className="v">{money(totalValue)}</div>
        </div>
        <div className="stat">
          <div className="k">Plusvalía latente</div>
          <div className={`v ${toneClass(totalValue - totalCost)}`}>
            {money(totalValue - totalCost)}
          </div>
        </div>
        <div className="stat">
          <div className="k">Ganancias realizadas (año)</div>
          <div className={`v ${toneClass(t.realizedGainsYtd)}`}>{money(t.realizedGainsYtd)}</div>
        </div>
        <div className="stat">
          <div className="k">Dividendos + intereses (año)</div>
          <div className="v">{money(t.dividendsYtd + t.interestYtd)}</div>
        </div>
      </div>
      {alt.length > 0 && (
        <>
          <div className="eyebrow section-gap">Inversiones alternativas</div>
          <table className="data">
            <thead>
              <tr>
                <th>Activo</th>
                <th className="r">Cantidad</th>
                <th className="r">Valor</th>
                <th className="r">Coste</th>
                <th className="r">Resultado</th>
              </tr>
            </thead>
            <tbody>
              {alt.map((h) => (
                <tr key={h.id} onClick={() => selectInstrument(h.id)}>
                  <td>
                    <span className="inst-name">{h.name}</span>{' '}
                    {h.selling && <span className="chip tiny gold">en venta</span>}
                    <br />
                    <span className="faint small">{h.id}</span>
                  </td>
                  <td className="r mono">{num(h.qty, 0)}</td>
                  <td className="r mono">{money(h.value)}</td>
                  <td className="r mono faint">{money(h.cost)}</td>
                  <td className={`r mono ${toneClass(h.pnl)}`}>{money(h.pnl)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {altOrders.length > 0 && (
        <>
          <div className="eyebrow section-gap">Órdenes del catálogo (se ejecutan a las 18:00)</div>
          {altOrders.map((o) => (
            <div key={o.id} className="line-item">
              <span className={o.side === 'buy' || o.side === 'long' ? 'up' : 'down'}>
                {
                  { buy: 'Compra', sell: 'Venta', long: 'Largo', short: 'Corto', close: 'Cierre' }[
                    o.side
                  ]
                }
              </span>
              <span>{o.name}</span>
              <span className="faint small">{o.date}</span>
              <button
                className="btn ghost sm"
                onClick={() => getClient().command({ type: 'invCancelOrder', orderId: o.id })}
              >
                Cancelar
              </button>
            </div>
          ))}
        </>
      )}
      <div className="eyebrow section-gap">Bolsa y bonos</div>
      {p.holdings.length === 0 ? (
        <div className="empty-state">
          <p>Todavía no tienes inversiones.</p>
          <p className="muted small">
            Elige una empresa en la pestaña Acciones, o empieza por algo seguro en el Banco.
          </p>
          <button className="btn sm" onClick={() => setTab('stocks')}>
            Ver acciones
          </button>
        </div>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>Activo</th>
              <th className="r">Cantidad</th>
              <th className="r">Precio ₳</th>
              <th className="r">Valor</th>
              <th className="r">Peso</th>
              <th className="r">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {p.holdings.map((h) => (
              <tr key={h.kind + h.id} onClick={() => h.kind === 'stock' && select(h.id)}>
                <td>
                  <span className="ticker">{h.id}</span>{' '}
                  <span className="chip tiny">{h.kind === 'stock' ? 'acción' : 'bono'}</span>
                  <br />
                  <span className="co-name">{h.name}</span>
                </td>
                <td className="r mono">{num(h.qty, 0)}</td>
                <td className="r mono">{num(h.price)}</td>
                <td className="r mono">{money(h.value)}</td>
                <td className="r mono">{pct(h.weight / 100, 1)}</td>
                <td className={`r mono ${toneClass(h.pnl)}`}>
                  {money(h.pnl)}
                  <br />
                  <small>{pct(h.pnlPct, 1, true)}</small>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {p.orders.length > 0 && (
        <>
          <div className="eyebrow section-gap">Órdenes pendientes</div>
          {p.orders.map((o) => (
            <div key={o.id} className="line-item">
              <span className={o.kind === 'buy' ? 'up' : 'down'}>
                {o.kind === 'buy' ? 'Compra' : 'Venta'}
              </span>
              <span className="mono">
                {num(o.qty, 0)} × {o.assetId}
                {o.limit ? ` · límite ${num(o.limit)}` : ' · a mercado'}
              </span>
              <span className="faint small">{o.date}</span>
              <button
                className="btn ghost sm"
                onClick={() => getClient().command({ type: 'cancelOrder', orderId: o.id })}
              >
                Cancelar
              </button>
            </div>
          ))}
        </>
      )}

      <div className="eyebrow section-gap">Fiscalidad</div>
      <p className="muted small">
        Retenido este año: <b className="mono">{money(t.withheldYtd)}</b> · Pérdidas a compensar:{' '}
        <b className="mono">{money(t.lossCarryForward)}</b> · Impuestos pagados en total:{' '}
        <b className="mono">{money(t.paidTotal)}</b>. Las ganancias realizadas se liquidan el 1 de
        enero (19 %–27 %).
      </p>

      <div className="eyebrow section-gap">Historial de operaciones</div>
      {p.trades.length === 0 ? (
        <p className="faint small">Sin operaciones.</p>
      ) : (
        <table className="data">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Operación</th>
              <th className="r">Precio</th>
              <th className="r">Importe</th>
              <th className="r">Comisiones</th>
              <th className="r">Resultado</th>
            </tr>
          </thead>
          <tbody>
            {p.trades.map((tr, i) => (
              <tr key={i}>
                <td className="faint mono small">{tr.date}</td>
                <td>
                  <span className={tr.kind === 'buy' ? 'up' : 'down'}>
                    {tr.kind === 'buy' ? 'Compra' : 'Venta'}
                  </span>{' '}
                  {num(tr.qty, 0)} × <span className="ticker">{tr.id}</span>
                </td>
                <td className="r mono">{num(tr.price, 3)}</td>
                <td className={`r mono ${toneClass(tr.cashFlow)}`}>{money(tr.cashFlow)}</td>
                <td className="r mono faint">{money(tr.fees)}</td>
                <td className={`r mono ${tr.kind === 'sell' ? toneClass(tr.pnl) : 'faint'}`}>
                  {tr.kind === 'sell' ? money(tr.pnl) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
