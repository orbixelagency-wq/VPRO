/** Preferencias de interfaz y gráficos por jugador (se guardan en este navegador). */
import type { Quality } from '../engine/quality';

const KEY = 'fortuna:settings';

export interface UiSettings {
  textScale: number;
  colorblind: boolean;
  quality: Quality;
  forceWebGL: boolean;
  invertY: boolean;
  showStats: boolean;
  /** Volúmenes 0–1. */
  volMaster: number;
  volAmbient: number;
  volEffects: number;
}

export const DEFAULT_SETTINGS: UiSettings = {
  textScale: 1,
  colorblind: false,
  quality: 'medio',
  forceWebGL: false,
  invertY: false,
  showStats: false,
  volMaster: 0.8,
  volAmbient: 0.8,
  volEffects: 0.8,
};

export function loadUiSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    /* almacenamiento no disponible */
  }
  return { ...DEFAULT_SETTINGS };
}

export function applyUiSettings(s: UiSettings): void {
  document.documentElement.style.setProperty('--text-scale', String(s.textScale));
  document.documentElement.dataset.cvd = String(s.colorblind);
}

export function saveUiSettings(s: UiSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* almacenamiento no disponible */
  }
}
