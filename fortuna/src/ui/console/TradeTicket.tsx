import { useEffect, useState } from 'react';
import type { QuoteView } from '../../worker/protocol';
import { money, num, pct } from '../format';
import { getClient, useGame } from '../store';

interface Props {
  asset: 'stock' | 'bond';
  id: string;
  held: number;
  unitLabel: string;
  /** Precio actual en divisa del activo (para estimar cantidad máxima). */
  priceAur: number;
}

export function TradeTicket({ asset, id, held, unitLabel, priceAur }: Props) {
  const view = useGame((s) => s.view!);
  const pushToast = useGame((s) => s.pushToast);
  const [side, setSide] = useState<'buy' | 'sell'>('buy');
  const [qty, setQty] = useState(1);
  const [limit, setLimit] = useState('');
  const [quote, setQuote] = useState<QuoteView | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    if (qty > 0)
      getClient()
        .quote(asset, id, side, qty)
        .then((q) => alive && setQuote(q));
    return () => {
      alive = false;
    };
  }, [asset, id, side, qty, view.tick]);

  const maxBuy = Math.max(
    0,
    Math.floor((view.player.cash * 0.995 - 10) / Math.max(0.0001, priceAur)),
  );
  const submit = async () => {
    setBusy(true);
    const lim = limit.trim() ? Number(limit.replace(',', '.')) : undefined;
    const r = await getClient().command({
      type: 'order',
      side,
      asset,
      id,
      qty,
      ...(lim && lim > 0 ? { limit: lim } : {}),
    });
    setBusy(false);
    pushToast({
      kind: r.ok ? 'info' : 'bad',
      title: r.ok ? 'Orden enviada' : 'Orden rechazada',
      body: r.message,
    });
  };

  return (
    <div className="ticket">
      <div className="ticket-sides">
        <button
          className={`side ${side === 'buy' ? 'active buy' : ''}`}
          onClick={() => setSide('buy')}
        >
          Comprar
        </button>
        <button
          className={`side ${side === 'sell' ? 'active sell' : ''}`}
          onClick={() => setSide('sell')}
          disabled={held <= 0}
        >
          Vender {held > 0 ? `(${num(held, 0)})` : ''}
        </button>
      </div>
      <div className="ticket-row">
        <label>
          <span className="muted small">Cantidad ({unitLabel})</span>
          <input
            type="number"
            min={1}
            step={1}
            className="mono"
            value={qty}
            onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
          />
        </label>
        <div className="qty-presets">
          {side === 'buy'
            ? [0.1, 0.25, 0.5, 1].map((f) => (
                <button
                  key={f}
                  className="btn sm"
                  onClick={() => setQty(Math.max(1, Math.floor(maxBuy * f)))}
                  disabled={maxBuy < 1}
                >
                  {f === 1 ? 'Máx' : `${f * 100}%`}
                </button>
              ))
            : [0.25, 0.5, 1].map((f) => (
                <button
                  key={f}
                  className="btn sm"
                  onClick={() => setQty(Math.max(1, Math.floor(held * f)))}
                >
                  {f === 1 ? 'Todo' : `${f * 100}%`}
                </button>
              ))}
        </div>
      </div>
      <label className="ticket-limit">
        <span className="muted small">Precio límite (opcional, divisa del valor)</span>
        <input
          className="mono"
          placeholder="A mercado"
          value={limit}
          onChange={(e) => setLimit(e.target.value)}
        />
      </label>
      {quote && (
        <div className="quote-box">
          {quote.ok ? (
            <>
              <div>
                <span className="muted">Precio estimado</span>
                <span className="mono">{num(quote.price, 3)}</span>
              </div>
              <div>
                <span className="muted">Diferencial + impacto</span>
                <span className="mono">{pct(quote.spreadPct / 2 + quote.impactPct * 0.6, 2)}</span>
              </div>
              <div>
                <span className="muted">
                  Comisión{quote.fxFee > 0 ? ' + cambio de divisa' : ''}
                </span>
                <span className="mono">{money(quote.commission + quote.fxFee)}</span>
              </div>
              <div className="total">
                <span>{side === 'buy' ? 'Total a pagar' : 'Total a cobrar'}</span>
                <span className="mono">{money(quote.total)}</span>
              </div>
            </>
          ) : (
            <div className="down">{quote.reason}</div>
          )}
        </div>
      )}
      <button
        className={`btn ${side === 'buy' ? 'buy' : 'sell'} ticket-go`}
        onClick={submit}
        disabled={busy || !quote?.ok || view.player.bankrupt}
      >
        {side === 'buy' ? 'Comprar' : 'Vender'} {num(qty, 0)} {unitLabel}
      </button>
      {!view.marketOpen && (
        <p className="faint small">
          La bolsa está cerrada: la orden se ejecutará en la próxima apertura (9:00).
        </p>
      )}
    </div>
  );
}
