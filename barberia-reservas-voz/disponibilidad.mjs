// Cálculo de huecos libres a partir del horario del negocio y las citas ya
// existentes. Todo el trabajo se hace en "minutos desde medianoche" dentro de
// un día concreto, para no arrastrar complejidad de zonas horarias en la
// lógica: la conversión a fecha/hora real vive en la capa de agenda.

import { NEGOCIO } from "./catalogo.mjs";

/** "14:30" -> 870 (minutos desde medianoche). */
export function hhmmAMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** 870 -> "14:30". */
export function minAHhmm(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Día de la semana (0 domingo … 6 sábado) de una fecha "YYYY-MM-DD". */
export function diaSemana(fechaISO) {
  // Se ancla a mediodía UTC para que el día no baile por el huso horario.
  return new Date(`${fechaISO}T12:00:00Z`).getUTCDay();
}

/**
 * Devuelve los tramos de apertura de un día concreto como pares [inicioMin, finMin].
 */
export function tramosDelDia(fechaISO) {
  const tramos = NEGOCIO.horario[diaSemana(fechaISO)] ?? [];
  return tramos.map(([a, c]) => [hhmmAMin(a), hhmmAMin(c)]);
}

/**
 * Calcula los huecos donde CABE un servicio de `duracionMin` minutos, en el día
 * `fechaISO`, respetando el horario y evitando solaparse con `ocupadas`.
 *
 * @param {string} fechaISO         "YYYY-MM-DD"
 * @param {number} duracionMin      duración del servicio pedido
 * @param {Array<{inicioMin:number, finMin:number}>} ocupadas  citas ya existentes ese día
 * @param {number} [ahoraMin]       minuto actual del día si la fecha es hoy (para no ofrecer pasado)
 * @returns {string[]}              horas de inicio disponibles, p.ej. ["16:00","16:15",...]
 */
export function huecosLibres(fechaISO, duracionMin, ocupadas = [], ahoraMin = null) {
  const paso = NEGOCIO.intervaloMinutos;
  const libres = [];

  for (const [aperturaMin, cierreMin] of tramosDelDia(fechaISO)) {
    // El último inicio posible deja sitio para completar el servicio antes del cierre.
    for (let inicio = aperturaMin; inicio + duracionMin <= cierreMin; inicio += paso) {
      const fin = inicio + duracionMin;

      // No ofrecer horas ya pasadas (o demasiado inmediatas) si es hoy.
      if (ahoraMin !== null && inicio < ahoraMin + NEGOCIO.antelacionMinimaMin) continue;

      const seSolapa = ocupadas.some(
        (o) => inicio < o.finMin && fin > o.inicioMin
      );
      if (!seSolapa) libres.push(minAHhmm(inicio));
    }
  }
  return libres;
}
