// Capa de "agenda central" (la única fuente de la verdad).
//
// El resto del sistema NO sabe si por debajo hay Google Calendar, una base de
// datos o memoria: solo usa esta interfaz. Así el mismo motor de reservas sirve
// tanto para la demo como para producción, y para el teléfono y la web a la vez.
//
//   interface AdaptadorAgenda {
//     citasDelDia(fechaISO): Promise<Array<{inicioMin, finMin, titulo}>>
//     crearCita({ fechaISO, inicioMin, finMin, titulo, descripcion }): Promise<{id}>
//   }

import { minAHhmm } from "./disponibilidad.mjs";

/**
 * Agenda en memoria: para la demo y los tests. Las citas viven en un array y se
 * pierden al cerrar el proceso. No necesita credenciales ni red.
 */
export class AgendaEnMemoria {
  constructor(citasIniciales = []) {
    this._citas = citasIniciales.map((c, i) => ({ id: `mem-${i + 1}`, ...c }));
  }

  async citasDelDia(fechaISO) {
    return this._citas.filter((c) => c.fechaISO === fechaISO);
  }

  async crearCita(cita) {
    const id = `mem-${this._citas.length + 1}`;
    this._citas.push({ id, ...cita });
    return { id };
  }
}

/**
 * Agenda sobre Google Calendar — la que se usaría en producción.
 *
 * En este prototipo va como esqueleto documentado: para activarla en un
 * servidor real se instala `googleapis`, se crea una cuenta de servicio con
 * acceso al calendario del negocio y se rellenan los dos métodos como se indica.
 * La interfaz es idéntica a AgendaEnMemoria, así que el motor no cambia.
 *
 *   import { google } from "googleapis";
 *   const auth = new google.auth.JWT({ email, key, scopes:
 *     ["https://www.googleapis.com/auth/calendar"] });
 *   const cal = google.calendar({ version: "v3", auth });
 */
export class AgendaGoogleCalendar {
  constructor({ calendarId, zonaHoraria, clienteCalendar }) {
    this.calendarId = calendarId;       // p.ej. "barberia@gmail.com"
    this.zonaHoraria = zonaHoraria;      // p.ej. "Europe/Madrid"
    this.cal = clienteCalendar;          // instancia google.calendar(...)
  }

  async citasDelDia(fechaISO) {
    const res = await this.cal.events.list({
      calendarId: this.calendarId,
      timeMin: `${fechaISO}T00:00:00`,
      timeMax: `${fechaISO}T23:59:59`,
      timeZone: this.zonaHoraria,
      singleEvents: true,
      orderBy: "startTime",
    });
    return (res.data.items ?? [])
      .filter((e) => e.start?.dateTime) // ignora eventos de día completo
      .map((e) => ({
        id: e.id,
        titulo: e.summary,
        inicioMin: this._minLocal(e.start.dateTime),
        finMin: this._minLocal(e.end.dateTime),
      }));
  }

  async crearCita({ fechaISO, inicioMin, finMin, titulo, descripcion }) {
    const res = await this.cal.events.insert({
      calendarId: this.calendarId,
      requestBody: {
        summary: titulo,
        description: descripcion,
        start: { dateTime: `${fechaISO}T${minAHhmm(inicioMin)}:00`, timeZone: this.zonaHoraria },
        end: { dateTime: `${fechaISO}T${minAHhmm(finMin)}:00`, timeZone: this.zonaHoraria },
      },
    });
    return { id: res.data.id };
  }

  _minLocal(dateTime) {
    const d = new Date(dateTime);
    return d.getHours() * 60 + d.getMinutes();
  }
}
