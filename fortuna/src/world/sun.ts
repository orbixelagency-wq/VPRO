/**
 * Posición del sol (matemática pura, testeable sin Three.js). Latitud mediterránea:
 * días largos en verano y cortos en invierno.
 */
export interface SunState {
  /** Dirección hacia el sol (x = este, y = arriba, z = sur), normalizada. */
  x: number;
  y: number;
  z: number;
  /** Elevación sobre el horizonte en radianes. */
  elevation: number;
  /** 0 = noche cerrada, 1 = pleno día. */
  daylight: number;
}

const LAT = (39 * Math.PI) / 180;

function smoothstep(x: number, a: number, b: number): number {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

export function sunState(hour: number, dayOfYear: number): SunState {
  const decl = ((-23.44 * Math.PI) / 180) * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10));
  const ha = ((hour - 13) / 24) * 2 * Math.PI; // mediodía solar a las 13:00 (hora oficial de Castelia)
  const sinEl = Math.sin(LAT) * Math.sin(decl) + Math.cos(LAT) * Math.cos(decl) * Math.cos(ha);
  const el = Math.asin(sinEl);
  const az = Math.atan2(
    Math.sin(ha),
    Math.cos(ha) * Math.sin(LAT) - Math.tan(decl) * Math.cos(LAT),
  );
  const x = -Math.sin(az) * Math.cos(el);
  const y = Math.sin(el);
  const z = Math.cos(az) * Math.cos(el);
  const n = Math.hypot(x, y, z) || 1;
  return { x: x / n, y: y / n, z: z / n, elevation: el, daylight: smoothstep(el, -0.1, 0.12) };
}

/** Horas de luz de un día del año (para pruebas y para la rutina diaria). */
export function daylightHours(dayOfYear: number): number {
  let n = 0;
  for (let m = 0; m < 24 * 60; m += 10) if (sunState(m / 60, dayOfYear).elevation > 0) n += 10;
  return n / 60;
}
