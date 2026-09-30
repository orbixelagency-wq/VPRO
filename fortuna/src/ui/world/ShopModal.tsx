import { useEffect, useState } from 'react';
import { SHOP_ITEMS } from '../../data/shop';
import { money } from '../format';
import { getClient, useGame } from '../store';

/** Mostrador de Ultramarinos La Esquina: pequeñas compras que pasan por tu cuenta corriente. */
export function ShopModal({ onClose }: { onClose: () => void }) {
  const cash = useGame((s) => s.view?.player.cash ?? 0);
  const news = useGame((s) => s.view?.news ?? []);
  const pushToast = useGame((s) => s.pushToast);
  const [busy, setBusy] = useState<string | null>(null);
  const [paper, setPaper] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const buy = async (id: string) => {
    setBusy(id);
    const r = await getClient().command({ type: 'purchase', item: id });
    setBusy(null);
    pushToast({
      kind: r.ok ? 'info' : 'bad',
      title: r.ok ? 'Comprado' : 'No se pudo',
      body: r.message,
    });
    if (r.ok && id === 'periodico') setPaper(true);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal shop"
        role="dialog"
        aria-modal
        aria-label="Ultramarinos La Esquina"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="panel-head">
          <div>
            <div className="eyebrow">Las Grúas</div>
            <span className="panel-title shop-title">Ultramarinos La Esquina</span>
          </div>
          <button className="btn ghost sm" onClick={onClose}>
            Salir <kbd>Esc</kbd>
          </button>
        </div>
        {!paper ? (
          <div className="shop-body">
            <p className="muted shop-greeting">
              —¡Buenas! ¿Qué te pongo? <span className="shop-cash">En cuenta: {money(cash)}</span>
            </p>
            <ul className="shop-list">
              {SHOP_ITEMS.map((it) => (
                <li key={it.id} className="shop-item">
                  <div>
                    <b>{it.name}</b>
                    <small className="muted">{it.description}</small>
                  </div>
                  <span className="mono shop-price">{money(it.price)}</span>
                  <button
                    className="btn sm"
                    disabled={busy !== null}
                    onClick={() => void buy(it.id)}
                    aria-label={`Comprar ${it.name}`}
                  >
                    {busy === it.id ? '…' : 'Comprar'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="shop-body newspaper">
            <div className="paper-mast">El Diario de Valmera</div>
            {news.slice(0, 5).map((n) => (
              <article key={n.id} className="paper-item">
                <h4>{n.headline}</h4>
                {n.body && <p>{n.body}</p>}
              </article>
            ))}
            <button className="btn sm ghost" onClick={() => setPaper(false)}>
              Volver al mostrador
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
