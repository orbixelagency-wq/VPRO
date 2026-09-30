/**
 * Clima de Puerto Valmera: función pura y determinista de (semilla, tick). No vive en el
 * estado de la simulación: cualquiera (mundo 3D, economía, teléfono) lo recalcula igual.
 * Clima mediterráneo: veranos secos y calurosos con tormentas de tarde, otoños lluviosos,
 * inviernos suaves con alguna helada y nevadas muy raras, nieblas matinales en otoño/invierno.
 */
import { DAYS_PER_YEAR, HOURS_PER_DAY } from './calendar';

export type WeatherKind = 'despejado' | 'nubes' | 'lluvia' | 'tormenta' | 'niebla' | 'nieve';

export interface Weather {
  kind: WeatherKind;
  /** Cobertura de nubes 0–1. */
  clouds: number;
  /** Intensidad de lluvia 0–1 (0 = seco). */
  rain: number;
  /** Intensidad de nieve 0–1. */
  snow: number;
  /** Niebla 0–1. */
  fog: number;
  /** Viento 0–1. */
  wind: number;
  /** Temperatura en °C. */
  temp: number;
  /** Tormenta eléctrica activa. */
  thunder: boolean;
  /** Suelo mojado 0–1 (tarda en secarse tras la lluvia). */
  wet: number;
}

export const WEATHER_LABELS: Record<WeatherKind, string> = {
  despejado: 'Despejado',
  nubes: 'Nuboso',
  lluvia: 'Lluvia',
  tormenta: 'Tormenta',
  niebla: 'Niebla',
  nieve: 'Nieve',
};

/** Hash entero → [0, 1). Rápido y sin estado (no consume flujos de la simulación). */
function hash01(seed: number, a: number, salt: number): number {
  let h = (seed ^ Math.imul(a, 0x9e3779b1) ^ Math.imul(salt, 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x7feb352d);
  h = Math.imul(h ^ (h >>> 15), 0x846ca68b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Ruido de valor suave: nodos cada `period` horas, interpolación cúbica. */
function smoothNoise(seed: number, t: number, period: number, salt: number): number {
  const x = t / period;
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return hash01(seed, i, salt) * (1 - u) + hash01(seed, i + 1, salt) * u;
}

/** Estacionalidad: 1 en pleno invierno (mediados de enero), 0 en pleno verano. */
function winterness(dayOfYear: number): number {
  return 0.5 + 0.5 * Math.cos(((dayOfYear - 15) / DAYS_PER_YEAR) * Math.PI * 2);
}

/** Probabilidad base de "frente húmedo" por mes: otoño y primavera lluviosos, julio seco. */
const WET_BY_MONTH = [0.42, 0.38, 0.36, 0.4, 0.34, 0.2, 0.08, 0.14, 0.34, 0.5, 0.5, 0.44];

function wetness(dayOfYear: number): number {
  const m = (dayOfYear / DAYS_PER_YEAR) * 12;
  const i = Math.floor(m) % 12;
  const f = m - Math.floor(m);
  return WET_BY_MONTH[i]! * (1 - f) + WET_BY_MONTH[(i + 1) % 12]! * f;
}

function rawWeather(seed: number, tick: number): Omit<Weather, 'wet'> {
  const day = Math.floor(tick / HOURS_PER_DAY);
  const hour = tick - day * HOURS_PER_DAY;
  const doy = ((day % DAYS_PER_YEAR) + DAYS_PER_YEAR) % DAYS_PER_YEAR;
  const w = winterness(doy);
  // Frentes: sistemas de ~2–3 días más ruido de pocas horas.
  const front = smoothNoise(seed, tick, 54, 1) * 0.75 + smoothNoise(seed, tick, 9, 2) * 0.25;
  const p = wetness(doy);
  // Humedad relativa al umbral: >0 → llueve.
  const humid = front - (1 - p * 0.62);
  // Nubes: el frente más una capa propia (días nubosos sin lluvia).
  const layer = smoothNoise(seed, tick, 20, 8);
  const clouds = clamp01((front * 0.55 + layer * 0.45 - 0.62 + p * 0.55) * 2.2);
  let rain = clamp01(humid * 4);
  // Tormentas de verano: tarde, con calor y humedad moderada.
  const summer = 1 - w;
  const convective = summer > 0.6 && hour >= 15 && hour <= 20 ? smoothNoise(seed, tick, 4, 3) : 0;
  let thunder = false;
  if (convective > 0.9 && front > 0.55) {
    rain = Math.max(rain, (convective - 0.9) * 9);
    thunder = true;
  } else if (rain > 0.8) thunder = smoothNoise(seed, tick, 3, 4) > 0.72;
  // Temperatura: 11 °C de media en enero, 27 °C en agosto; ciclo diario de ±5 °C.
  const seasonal = 19 - 8 * Math.cos(((doy - 20) / DAYS_PER_YEAR) * Math.PI * 2);
  const diurnal = -Math.cos(((hour - 3) / 24) * Math.PI * 2) * (5.5 - clouds * 2.5);
  const anomaly = (smoothNoise(seed, tick, 120, 5) - 0.5) * 7;
  const temp = seasonal + diurnal + anomaly - rain * 3;
  // Nieve: solo con lluvia y frío de verdad (rarísimo en la costa).
  let snow = 0;
  if (rain > 0 && temp < 1.5) {
    snow = rain;
    rain = 0;
    thunder = false;
  }
  // Niebla: madrugada y mañana de otoño/invierno, con aire en calma y sin lluvia.
  const calm = 1 - smoothNoise(seed, tick, 30, 6);
  const morning = hour >= 4 && hour <= 11 ? 1 - Math.abs(hour - 7.5) / 3.5 : 0;
  const fog = rain > 0.2 ? rain * 0.35 : clamp01((calm - 0.45) * 2.4 * morning * (0.35 + w * 0.8));
  const wind = clamp01(
    0.15 + smoothNoise(seed, tick, 18, 7) * 0.45 + rain * 0.35 + (thunder ? 0.2 : 0),
  );
  let kind: WeatherKind = 'despejado';
  if (snow > 0.05) kind = 'nieve';
  else if (thunder) kind = 'tormenta';
  else if (rain > 0.08) kind = 'lluvia';
  else if (fog > 0.45) kind = 'niebla';
  else if (clouds > 0.55) kind = 'nubes';
  return {
    kind,
    clouds: Math.max(clouds, rain > 0 ? 0.75 : 0),
    rain,
    snow,
    fog,
    wind,
    temp,
    thunder,
  };
}

/** Tiempo en un tick. El suelo mojado depende de la lluvia de las horas anteriores. */
export function weatherAt(seed: number, tick: number): Weather {
  const now = rawWeather(seed, tick);
  let wet = Math.max(now.rain, now.snow);
  // Se seca en ~6 horas (más despacio de noche y en invierno).
  for (let h = 1; h <= 8 && wet < 1; h++) {
    const past = rawWeather(seed, tick - h);
    const r = Math.max(past.rain, past.snow);
    if (r > 0) wet = Math.max(wet, Math.min(1, r * 1.5) * (1 - h / 9));
  }
  return { ...now, wet: clamp01(wet) };
}

/** Interpolación entre dos horas para transiciones suaves en el mundo 3D. */
export function weatherBlend(seed: number, time: number): Weather {
  const t0 = Math.floor(time);
  const f = time - t0;
  const a = weatherAt(seed, t0);
  if (f < 0.001) return a;
  const b = weatherAt(seed, t0 + 1);
  const mix = (x: number, y: number) => x + (y - x) * f;
  return {
    kind: f < 0.5 ? a.kind : b.kind,
    clouds: mix(a.clouds, b.clouds),
    rain: mix(a.rain, b.rain),
    snow: mix(a.snow, b.snow),
    fog: mix(a.fog, b.fog),
    wind: mix(a.wind, b.wind),
    temp: mix(a.temp, b.temp),
    thunder: f < 0.5 ? a.thunder : b.thunder,
    wet: mix(a.wet, b.wet),
  };
}

export interface DayForecast {
  dayIndex: number;
  kind: WeatherKind;
  min: number;
  max: number;
  /** Probabilidad aproximada de precipitación (fracción de horas con lluvia). */
  rainChance: number;
}

/** Previsión diaria: el tiempo dominante de las horas de luz y las temperaturas extremas. */
export function forecastDay(seed: number, dayIndex: number): DayForecast {
  let min = Infinity;
  let max = -Infinity;
  let wetHours = 0;
  const counts: Record<WeatherKind, number> = {
    despejado: 0,
    nubes: 0,
    lluvia: 0,
    tormenta: 0,
    niebla: 0,
    nieve: 0,
  };
  for (let h = 0; h < HOURS_PER_DAY; h++) {
    const w = rawWeather(seed, dayIndex * HOURS_PER_DAY + h);
    min = Math.min(min, w.temp);
    max = Math.max(max, w.temp);
    if (w.rain > 0.05 || w.snow > 0.05) wetHours++;
    if (h >= 7 && h <= 21)
      counts[w.kind] += w.kind === 'despejado' ? 1 : w.kind === 'nubes' ? 1.3 : 2.2;
  }
  let kind: WeatherKind = 'despejado';
  for (const k of Object.keys(counts) as WeatherKind[]) if (counts[k] > counts[kind]) kind = k;
  return { dayIndex, kind, min, max, rainChance: Math.min(1, wetHours / 8) };
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x;
}
