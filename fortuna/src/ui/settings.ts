/** Preferencias de interfaz por jugador (se guardan en este navegador). */
const KEY = 'fortuna:settings';

export interface UiSettings {
  textScale: number;
  colorblind: boolean;
}

export function loadUiSettings(): UiSettings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { textScale: 1, colorblind: false, ...JSON.parse(raw) };
  } catch {
    /* almacenamiento no disponible */
  }
  return { textScale: 1, colorblind: false };
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
