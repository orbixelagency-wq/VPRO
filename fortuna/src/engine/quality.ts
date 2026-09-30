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
  },
};
