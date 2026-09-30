/** Presets de calidad gráfica (sin dependencias de Three.js para no inflar el paquete de la UI). */
export type Quality = 'bajo' | 'medio' | 'alto' | 'ultra';

export interface QualityPreset {
  label: string;
  /** Tamaño del mapa de sombras del sol. */
  shadowMap: number;
  /** Radio del área con sombras alrededor del jugador (m). */
  shadowRange: number;
  /** Máxima relación de píxeles (Ultra = nativa, p. ej. 4K). */
  pixelCap: number;
  /** Distancia de dibujado (niebla lejana). */
  far: number;
  bloom: boolean;
  /** Luces puntuales reales cerca del jugador por la noche. */
  lampLights: number;
  antialias: boolean;
  /** Radio con edificios detallados (streaming). */
  detailRadius: number;
  /** Vehículos y peatones simulados cerca del jugador (en hora punta). */
  cars: number;
  peds: number;
  /** Densidad de partículas de lluvia y nieve (0–1,5). */
  weatherFx: number;
}

export const QUALITY: Record<Quality, QualityPreset> = {
  bajo: {
    label: 'Bajo',
    shadowMap: 1024,
    shadowRange: 45,
    pixelCap: 0.75,
    far: 650,
    bloom: false,
    lampLights: 0,
    antialias: false,
    detailRadius: 260,
    cars: 24,
    peds: 45,
    weatherFx: 0.3,
  },
  medio: {
    label: 'Medio',
    shadowMap: 2048,
    shadowRange: 60,
    pixelCap: 1,
    far: 900,
    bloom: false,
    lampLights: 4,
    antialias: true,
    detailRadius: 380,
    cars: 42,
    peds: 85,
    weatherFx: 0.7,
  },
  alto: {
    label: 'Alto',
    shadowMap: 2048,
    shadowRange: 80,
    pixelCap: 1.5,
    far: 1300,
    bloom: true,
    lampLights: 6,
    antialias: true,
    detailRadius: 520,
    cars: 62,
    peds: 130,
    weatherFx: 1,
  },
  ultra: {
    label: 'Ultra',
    shadowMap: 4096,
    shadowRange: 110,
    pixelCap: 3,
    far: 1800,
    bloom: true,
    lampLights: 8,
    antialias: true,
    detailRadius: 720,
    cars: 85,
    peds: 180,
    weatherFx: 1.5,
  },
};
