import { create } from 'zustand';
import { SimClient } from '../engine/simClient';
import type { NewGameOptions } from '../economy/sim';
import type { SimEvent } from '../economy/types';
import type { SimView } from '../economy/view';
import { AUTOSAVE_SLOT, writeSave } from '../save/saveStore';

export type Screen = 'boot' | 'setup' | 'loading' | 'console';
export type Tab = 'explore' | 'stocks' | 'bonds' | 'bank' | 'portfolio' | 'macro';

export interface Toast {
  id: number;
  kind: 'info' | 'good' | 'bad' | 'notebook' | 'warning';
  title: string;
  body?: string;
  at: number;
}

interface UiState {
  screen: Screen;
  loadingLabel: string;
  view: SimView | null;
  speedIndex: number;
  tab: Tab;
  selected: string | null;
  selectedInstrument: string | null;
  /** Qué ficha muestra la columna derecha. */
  focus: 'company' | 'instrument';
  quizOpen: boolean;
  debug: boolean;
  notebookOpen: boolean;
  notebookFocus: string | null;
  toasts: Toast[];
  lastSavedAt: number | null;
  error: string | null;
  setScreen(s: Screen): void;
  startNewGame(opts: NewGameOptions): void;
  loadGame(state: string): void;
  setSpeed(i: number): void;
  setTab(t: Tab): void;
  select(id: string | null): void;
  selectInstrument(id: string | null): void;
  setQuizOpen(open: boolean): void;
  toggleDebug(): void;
  openNotebook(focus?: string | null): void;
  closeNotebook(): void;
  pushToast(t: Omit<Toast, 'id' | 'at'>): void;
  dismissToast(id: number): void;
  saveNow(slot?: string): Promise<void>;
}

let toastId = 1;
let client: SimClient | null = null;

export function getClient(): SimClient {
  if (!client) throw new Error('Simulación no iniciada');
  return client;
}

const SPEED_VALUES = [0, 1, 6, 24, 24 * 7, 24 * 30];
export const SPEED_LABELS = ['Pausa', '1 h/s', '6 h/s', '1 día/s', '1 sem/s', '1 mes/s'];

function toastFromEvent(e: SimEvent): Omit<Toast, 'id' | 'at'> | null {
  switch (e.type) {
    case 'trade':
      return { kind: 'info', title: 'Orden ejecutada', body: e.message };
    case 'dividend':
      return { kind: 'good', title: 'Dividendo cobrado', body: e.message };
    case 'warning':
      return { kind: 'warning', title: 'Aviso', body: e.message };
    case 'bankruptcy':
      return { kind: 'bad', title: 'Quiebra', body: e.message };
    case 'phase':
      return { kind: 'warning', title: 'Cambio de ciclo', body: e.message };
    case 'notebook':
      return { kind: 'notebook', title: 'Nuevo concepto en tu Cuaderno', body: e.ref ?? '' };
    default:
      return null;
  }
}

export const useGame = create<UiState>((set, get) => {
  const ensureClient = () => {
    if (client) return client;
    client = new SimClient({
      onReady: (view) => {
        set({ view, screen: 'console', selected: view.selected?.id ?? null, speedIndex: 0 });
      },
      onView: (view, events) => {
        set({ view });
        for (const e of events) {
          const t = toastFromEvent(e);
          if (t) get().pushToast(t);
          if (e.type === 'news') {
            const n = view.news.find((x) => String(x.id) === e.ref);
            if (n && n.importance >= 3)
              get().pushToast({
                kind: n.tone < 0 ? 'bad' : 'good',
                title: 'Última hora',
                body: n.headline,
              });
          }
        }
      },
      onProgress: (label) => set({ loadingLabel: label }),
      onError: (message) => set({ error: message }),
    });
    return client;
  };

  return {
    screen: 'boot',
    loadingLabel: '',
    view: null,
    speedIndex: 0,
    tab: 'explore',
    selected: null,
    selectedInstrument: null,
    focus: 'company',
    quizOpen: false,
    debug: false,
    notebookOpen: false,
    notebookFocus: null,
    toasts: [],
    lastSavedAt: null,
    error: null,
    setScreen: (screen) => set({ screen }),
    startNewGame: (opts) => {
      set({ screen: 'loading', loadingLabel: 'Generando el mundo…' });
      ensureClient().newGame(opts);
    },
    loadGame: (state) => {
      set({ screen: 'loading', loadingLabel: 'Cargando partida…' });
      ensureClient().load(state);
    },
    setSpeed: (i) => {
      set({ speedIndex: i });
      ensureClient().send({ type: 'speed', hoursPerSecond: SPEED_VALUES[i] ?? 0 });
    },
    setTab: (tab) => set({ tab }),
    select: (id) => {
      set({ selected: id, focus: 'company' });
      ensureClient().send({ type: 'select', id });
    },
    selectInstrument: (id) => {
      set({ selectedInstrument: id, focus: id ? 'instrument' : 'company' });
      ensureClient().send({ type: 'selectInstrument', id });
    },
    setQuizOpen: (quizOpen) => set({ quizOpen }),
    toggleDebug: () => {
      const debug = !get().debug;
      set({ debug });
      ensureClient().send({ type: 'debug', enabled: debug });
    },
    openNotebook: (focus = null) => set({ notebookOpen: true, notebookFocus: focus }),
    closeNotebook: () => set({ notebookOpen: false }),
    pushToast: (t) => {
      const toast: Toast = { ...t, id: toastId++, at: Date.now() };
      set({ toasts: [...get().toasts.slice(-2), toast] });
      window.setTimeout(() => get().dismissToast(toast.id), t.kind === 'notebook' ? 9000 : 5000);
    },
    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
    saveNow: async (slot = AUTOSAVE_SLOT) => {
      const { state, meta } = await ensureClient().save();
      await writeSave(slot, state, meta);
      set({ lastSavedAt: Date.now() });
    },
  };
});
