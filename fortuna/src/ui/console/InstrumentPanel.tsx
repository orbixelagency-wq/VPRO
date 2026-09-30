import { useEffect, useState } from 'react';
import type { PlayerCommand } from '../../economy/sim';
import { Chart } from '../components/Chart';
import { compact, money, num, pct, toneClass } from '../format';
import { getClient, useGame } from '../store';

function useRun() {
  const pushToast = useGame((s) => s.pushToast);
  return async (cmd: PlayerCommand, okTitle = 'Hecho') => {
    const r = await getClient().command(cmd);
    pushToast({
      kind: r.ok ? 'info' : 'bad',
      title: r.ok ? okTitle : 'No se pudo',
      body: r.message,
    });
    return r.ok;
  };
}

export function InstrumentPanel() {
  const d = useGame((s) => s.view?.instrument);
  const cash = useGame((s) => s.view!.player.cash);
  const unlocks = useGame((s) => s.view!.unlocks);
  const setQuizOpen = useGame((s) => s.setQuizOpen);
  const debug = useGame((s) => s.debug);
  const run = useRun();
  const [qty, setQty] = useState(1);
  const [mortgage, setMortgage] = useState(false);
  const [ltv, setLtv] = useState(0.7);
  const [years, setYears] = useState(25);
  const [sellQty, setSellQty] = useState(1);

  useEffect(() => {
    setQty(d?.unique ? 1 : Math.max(1, d?.lot ?? 1));
    setMortgage(false);
    setSellQty(d?.position?.qty ?? 1);
    // Solo al cambiar de instrumento.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d?.id]);

  if (!d) {
    return (
      <section className="panel company">
        <div className="panel-body empty-state muted">
          Elige una oportunidad del catálogo para ver su ficha.
        </div>
      </section>
    );
  }
  const unitAur = d.priceAur;
  const lot = d.lot;
  const roundLot = (x: number) => Math.max(lot, Math.floor(x / lot) * lot);
  const maxQty = roundLot(
    (cash * 0.98) / Math.max(0.01, unitAur * (1 + d.fees.spread / 2 + d.fees.buy + d.fees.buyTax)),
  );
  const estTotal =
    unitAur * qty * (1 + d.fees.spread / 2 + d.fees.buy + d.fees.buyTax) -
    (mortgage ? unitAur * ltv : 0);
  const derivLocked = d.margin || d.cls === 'option';

  return (
    <section className="panel company">
      <div className="panel-head company-head">
        <div>
          <div className="eyebrow">
            {d.glyph} {d.className} · {d.sub}
          </div>
          <div className="company-name inst-title">{d.name}</div>
          <div className="faint small">
            {d.region} · {d.id}
          </div>
        </div>
        <div className="r">
          <div className="company-price mono">
            {unitAur >= 100_000 ? compact(unitAur) : money(unitAur)}
          </div>
          {d.ccy !== 'AUR' && (
            <div className="faint small mono">
              {num(d.price)} {d.ccy}
            </div>
          )}
          {d.change !== 0 && (
            <div className={`mono small ${toneClass(d.change)}`}>
              {pct(d.change, 1, true)} (4 per.)
            </div>
          )}
        </div>
      </div>
      <div className="panel-body">
        {d.status !== 'open' && (
          <div className="banner bad">Ya no está disponible ({d.status}).</div>
        )}
        {d.locked && d.status === 'open' && (
          <div className="banner gold">
            {d.locked}
            {derivLocked && !unlocks.derivatives && (
              <button
                className="btn sm gold"
                style={{ marginLeft: 10 }}
                onClick={() => setQuizOpen(true)}
              >
                Hacer el test
              </button>
            )}
          </div>
        )}
        {d.hist.length > 2 ? (
          <Chart data={d.hist} height={160} format={(v) => num(v)} />
        ) : (
          <p className="muted small">
            Sin historial de precios: es una oportunidad nueva o un activo que solo se tasa al
            venderse.
          </p>
        )}

        <div className="stat-grid three" style={{ marginTop: 10 }}>
          <div className="stat">
            <div className="k">Renta esperada</div>
            <div className="v">{d.yield > 0 ? pct(d.yield, 1) : '—'}</div>
          </div>
          <div className="stat">
            <div className="k">Liquidez</div>
            <div className="v small-v">{d.liquidity}</div>
          </div>
          <div className="stat">
            <div className="k">Disponible</div>
            <div className="v">{d.expiresInDays !== null ? `${d.expiresInDays} días` : 'Sí'}</div>
          </div>
        </div>

        <div className="attr-list">
          {d.attrs.map((a) => (
            <div key={a.label}>
              <span className="muted">{a.label}</span>
              <span className="mono">{a.value}</span>
            </div>
          ))}
        </div>

        <p className="faint small">
          Costes: diferencial {pct(d.fees.spread, 1)} · compra {pct(d.fees.buy, 1)}
          {d.fees.buyTax > 0 ? ` · impuesto ${pct(d.fees.buyTax, 0)}` : ''} · venta{' '}
          {pct(d.fees.sell + d.fees.agent, 1)}
          {d.execution === 'close'
            ? ' · se ejecuta al precio de las 18:00'
            : ' · ejecución inmediata en horario de bolsa'}
        </p>

        {d.hidden.length > 0 && (
          <div className="research">
            <div className="research-head">
              <div>
                <div className="eyebrow">Información oculta</div>
                <div className="small">
                  {d.researchLabel} <span className="faint">({d.researchLevel}/3)</span>
                </div>
              </div>
              {d.nextResearch && (
                <button
                  className="btn sm"
                  disabled={d.researchPending}
                  onClick={() => run({ type: 'invResearch', id: d.id }, 'Análisis encargado')}
                >
                  {d.researchPending
                    ? 'En curso…'
                    : `${d.nextResearch.label} · ${money(d.nextResearch.cost, 0)} · ${d.nextResearch.days} d`}
                </button>
              )}
            </div>
            {d.hidden.map((h) => (
              <div key={h.label} className={`hidden-row ${h.tone}`}>
                <span className="muted">{h.label}</span>
                <span className="mono">{h.estimate ?? <span className="faint">? ? ?</span>}</span>
                {debug && h.truth && <span className="debug-inline mono">{h.truth}</span>}
              </div>
            ))}
          </div>
        )}

        {d.position && (
          <div className="holding-box">
            <div className="eyebrow">Tu posición</div>
            <div className="holding-grid">
              <span>
                <b className="mono">{num(d.position.qty, 0)}</b> {d.unique ? 'unidad' : 'unidades'}
              </span>
              <span className="muted">
                coste <b className="mono">{money(d.position.cost, 0)}</b>
              </span>
              {d.margin ? (
                <>
                  <span className="mono">garantía {money(d.position.margin ?? 0)}</span>
                  <span className={`mono ${toneClass(d.position.pnl)}`}>
                    {money(d.position.pnl)}
                  </span>
                </>
              ) : (
                <>
                  <span className="mono">{money(d.position.value)}</span>
                  <span className={`mono ${toneClass(d.position.pnl)}`}>
                    {money(d.position.pnl)}
                  </span>
                </>
              )}
            </div>
            {d.position.mortgage && (
              <p className="small muted" style={{ margin: '6px 0 0' }}>
                Hipoteca pendiente {money(d.position.mortgage.outstanding, 0)} · cuota{' '}
                {money(d.position.mortgage.monthly)} / mes
              </p>
            )}
            {d.position.selling && <p className="small gold">{d.position.selling}</p>}
          </div>
        )}

        {d.status === 'open' && !d.margin && !(d.unique && d.position) && (
          <div className="ticket">
            {!d.unique && (
              <label className="ticket-limit">
                <span className="muted small">Cantidad</span>
                <div className="ticket-row">
                  <input
                    type="number"
                    min={lot}
                    step={lot}
                    className="mono"
                    value={qty}
                    onChange={(e) => setQty(roundLot(Number(e.target.value) || lot))}
                  />
                  <div className="qty-presets">
                    {[0.25, 0.5, 1].map((f) => (
                      <button
                        key={f}
                        className="btn sm"
                        onClick={() => setQty(roundLot(maxQty * f))}
                      >
                        {f === 1 ? 'Máx' : `${f * 100}%`}
                      </button>
                    ))}
                  </div>
                </div>
              </label>
            )}
            {d.mortgageAllowed && (
              <div className="mortgage">
                <label className="check">
                  <input
                    type="checkbox"
                    checked={mortgage}
                    onChange={(e) => setMortgage(e.target.checked)}
                  />{' '}
                  Financiar con hipoteca
                </label>
                {mortgage && (
                  <div className="ticket-row">
                    <label>
                      <span className="muted small">Financiación {Math.round(ltv * 100)} %</span>
                      <input
                        type="range"
                        min={0.1}
                        max={0.8}
                        step={0.05}
                        value={ltv}
                        onChange={(e) => setLtv(Number(e.target.value))}
                      />
                    </label>
                    <label>
                      <span className="muted small">Plazo</span>
                      <select value={years} onChange={(e) => setYears(Number(e.target.value))}>
                        {[10, 15, 20, 25, 30].map((y) => (
                          <option key={y} value={y}>
                            {y} años
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </div>
            )}
            <div className="quote-box">
              <div>
                <span className="muted">Precio + costes de compra</span>
                <span className="mono">
                  {money(unitAur * qty * (1 + d.fees.spread / 2 + d.fees.buy + d.fees.buyTax))}
                </span>
              </div>
              {mortgage && (
                <div>
                  <span className="muted">Hipoteca</span>
                  <span className="mono">−{money(unitAur * ltv)}</span>
                </div>
              )}
              <div className="total">
                <span>Desembolso aproximado</span>
                <span className="mono">{money(estTotal)}</span>
              </div>
            </div>
            <button
              className="btn buy ticket-go"
              disabled={!!d.locked}
              onClick={() =>
                run(
                  {
                    type: 'invBuy',
                    id: d.id,
                    qty: d.unique ? 1 : qty,
                    ...(mortgage ? { mortgage: { ltv, years } } : {}),
                  },
                  d.cls === 'philanthropy' ? 'Donación registrada' : 'Orden enviada',
                )
              }
            >
              {d.cls === 'philanthropy'
                ? `Donar ${money(qty, 0)}`
                : d.unique
                  ? 'Comprar'
                  : `Comprar ${num(qty, 0)}`}
            </button>
          </div>
        )}

        {d.margin && d.status === 'open' && !d.position && (
          <MarginTicket id={d.id} locked={!!d.locked} />
        )}
        {d.margin && d.position && (
          <button
            className="btn sell ticket-go"
            onClick={() => run({ type: 'invClose', id: d.id }, 'Orden de cierre')}
          >
            Cerrar posición
          </button>
        )}

        {d.position && !d.margin && d.sellModes.length > 0 && !d.position.selling && (
          <div className="ticket">
            {!d.unique && d.position.qty > 1 && (
              <label className="ticket-limit">
                <span className="muted small">Unidades a vender</span>
                <input
                  type="number"
                  min={1}
                  max={d.position.qty}
                  className="mono"
                  value={sellQty}
                  onChange={(e) =>
                    setSellQty(
                      Math.min(
                        d.position!.qty,
                        Math.max(1, Math.floor(Number(e.target.value) || 1)),
                      ),
                    )
                  }
                />
              </label>
            )}
            <div className="sell-modes">
              {d.sellModes.map((m) => (
                <button
                  key={m}
                  className="btn sell"
                  onClick={() =>
                    run(
                      {
                        type: 'invSell',
                        id: d.id,
                        qty: d.unique ? 1 : sellQty,
                        quick: m === 'quick',
                      },
                      'Venta en marcha',
                    )
                  }
                >
                  {m === 'listing'
                    ? 'Poner en venta'
                    : m === 'quick'
                      ? 'Venta rápida (−15 %)'
                      : m === 'auction'
                        ? 'Llevar a subasta'
                        : 'Vender'}
                </button>
              ))}
            </div>
            <p className="faint small">
              {d.sellModes.includes('listing')
                ? 'Anunciado, tarda semanas en venderse a precio de tasación (±), con un 3 % de agencia. La venta rápida es inmediata pero con descuento.'
                : d.sellModes.includes('auction')
                  ? 'Se vende en la subasta del sábado siguiente. Comisión del 12 %; puede quedar desierta.'
                  : d.liquidity}
            </p>
          </div>
        )}
        {d.position?.selling && (
          <button
            className="btn ghost sm"
            onClick={() => run({ type: 'invCancelSale', id: d.id }, 'Venta retirada')}
          >
            Retirar de la venta
          </button>
        )}
      </div>
    </section>
  );
}

function MarginTicket({ id, locked }: { id: string; locked: boolean }) {
  const pushToast = useGame((s) => s.pushToast);
  const [qty, setQty] = useState(1);
  const open = async (direction: 'long' | 'short') => {
    const r = await getClient().command({ type: 'invOpen', id, direction, qty });
    pushToast({
      kind: r.ok ? 'info' : 'bad',
      title: r.ok ? 'Posición apalancada' : 'No se pudo',
      body: r.message,
    });
  };
  return (
    <div className="ticket">
      <label className="ticket-limit">
        <span className="muted small">Contratos</span>
        <input
          type="number"
          min={1}
          className="mono"
          value={qty}
          onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
        />
      </label>
      <div className="ticket-sides">
        <button className="side active buy" disabled={locked} onClick={() => open('long')}>
          Largo (sube)
        </button>
        <button className="side active sell" disabled={locked} onClick={() => open('short')}>
          Corto (baja)
        </button>
      </div>
      <p className="faint small">
        Depositas solo la garantía. Las pérdidas se liquidan cada día y, si la garantía no alcanza,
        el bróker cierra la posición.
      </p>
    </div>
  );
}
