/**
 * Puente entre el hilo principal y el worker de simulación.
 * Las peticiones con respuesta (comandos, cotizaciones, guardado) devuelven promesas.
 */
import type { CommandResult, NewGameOptions, PlayerCommand } from '../economy/sim';
import type { SimEvent } from '../economy/types';
import type { SimView } from '../economy/view';
import type { CatalogPage, CatalogQuery } from '../investments/view';
import type { FromWorker, QuoteView, SaveMeta, ToWorker } from '../worker/protocol';

type Listener = {
  onView: (view: SimView, events: SimEvent[]) => void;
  onReady: (view: SimView) => void;
  onProgress: (label: string, pct: number) => void;
  onError: (message: string) => void;
};

export class SimClient {
  private worker: Worker;
  private nextId = 1;
  private waiting = new Map<number, (value: unknown) => void>();

  constructor(private listener: Listener) {
    this.worker = new Worker(new URL('../worker/sim.worker.ts', import.meta.url), {
      type: 'module',
    });
    this.worker.onmessage = (e: MessageEvent<FromWorker>) => this.handle(e.data);
    this.worker.onerror = (e) => listener.onError(e.message);
  }

  private handle(msg: FromWorker): void {
    switch (msg.type) {
      case 'view':
        this.listener.onView(msg.view, msg.events);
        break;
      case 'ready':
        this.listener.onReady(msg.view);
        break;
      case 'progress':
        this.listener.onProgress(msg.label, msg.pct);
        break;
      case 'error':
        this.listener.onError(msg.message);
        break;
      case 'commandResult':
        this.resolve(msg.requestId, msg.result);
        break;
      case 'quote':
        this.resolve(msg.requestId, msg.quote);
        break;
      case 'catalog':
        this.resolve(msg.requestId, msg.page);
        break;
      case 'saved':
        this.resolve(msg.requestId, { state: msg.state, meta: msg.meta });
        break;
    }
  }

  private resolve(id: number, value: unknown): void {
    this.waiting.get(id)?.(value);
    this.waiting.delete(id);
  }

  private request<T>(build: (id: number) => ToWorker): Promise<T> {
    const id = this.nextId++;
    return new Promise<T>((resolve) => {
      this.waiting.set(id, resolve as (v: unknown) => void);
      this.worker.postMessage(build(id));
    });
  }

  send(msg: ToWorker): void {
    this.worker.postMessage(msg);
  }

  newGame(options: NewGameOptions): void {
    this.send({ type: 'new', options });
  }

  load(state: string): void {
    this.send({ type: 'load', state });
  }

  command(command: PlayerCommand): Promise<CommandResult> {
    return this.request((requestId) => ({ type: 'command', requestId, command }));
  }

  quote(
    asset: 'stock' | 'bond',
    id: string,
    side: 'buy' | 'sell',
    qty: number,
  ): Promise<QuoteView> {
    return this.request((requestId) => ({ type: 'quote', requestId, asset, id, side, qty }));
  }

  catalog(query: CatalogQuery): Promise<CatalogPage> {
    return this.request((requestId) => ({ type: 'catalog', requestId, query }));
  }

  save(): Promise<{ state: string; meta: SaveMeta }> {
    return this.request((requestId) => ({ type: 'save', requestId }));
  }
}
