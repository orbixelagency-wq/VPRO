// Motor de reservas: el "cerebro" que orquesta catálogo + disponibilidad + agenda.
//
// Estas tres funciones son exactamente las que el agente de voz (Claude) llama
// como herramientas durante la llamada. No dependen del canal: sirven igual para
// el teléfono, para la web o para un chatbot de WhatsApp.

import { servicioPorId, detectarServicio, NEGOCIO } from "./catalogo.mjs";
import { huecosLibres, hhmmAMin, diaSemana, tramosDelDia } from "./disponibilidad.mjs";

export class MotorReservas {
  constructor(agenda) {
    this.agenda = agenda; // cualquier AdaptadorAgenda (memoria o Google)
  }

  /**
   * HERRAMIENTA 1 — comprobar_disponibilidad
   * Devuelve las horas libres para un servicio en una fecha.
   */
  async comprobarDisponibilidad(servicioRef, fechaISO, ahoraMin = null) {
    const servicio = this._resolverServicio(servicioRef);
    if (!servicio) {
      return { ok: false, motivo: "servicio_no_reconocido" };
    }
    if (tramosDelDia(fechaISO).length === 0) {
      return { ok: false, motivo: "cerrado", servicio };
    }
    const citas = await this.agenda.citasDelDia(fechaISO);
    const huecos = huecosLibres(fechaISO, servicio.duracionMin, citas, ahoraMin);
    return { ok: true, servicio, fechaISO, huecos };
  }

  /**
   * HERRAMIENTA 2 — proponer_alternativas
   * Si el día pedido no tiene hueco, busca en los siguientes días abiertos.
   */
  async proponerAlternativas(servicioRef, fechaISO, diasVista = 7) {
    const servicio = this._resolverServicio(servicioRef);
    if (!servicio) return { ok: false, motivo: "servicio_no_reconocido" };

    const alternativas = [];
    let fecha = fechaISO;
    for (let i = 0; i < diasVista && alternativas.length < 3; i++) {
      fecha = this._sumarDias(fecha, 1);
      if (tramosDelDia(fecha).length === 0) continue; // día cerrado
      const citas = await this.agenda.citasDelDia(fecha);
      const huecos = huecosLibres(fecha, servicio.duracionMin, citas);
      if (huecos.length > 0) {
        alternativas.push({ fechaISO: fecha, primeras: huecos.slice(0, 3) });
      }
    }
    return { ok: true, servicio, alternativas };
  }

  /**
   * HERRAMIENTA 3 — crear_reserva
   * Reserva de forma segura: vuelve a comprobar el hueco JUSTO antes de escribir
   * (evita que dos clientes cojan la misma hora a la vez).
   */
  async crearReserva({ servicioRef, fechaISO, hora, cliente, telefono }) {
    const servicio = this._resolverServicio(servicioRef);
    if (!servicio) return { ok: false, motivo: "servicio_no_reconocido" };

    const inicioMin = hhmmAMin(hora);
    const finMin = inicioMin + servicio.duracionMin;

    const citas = await this.agenda.citasDelDia(fechaISO);
    const chocaCon = citas.find((c) => inicioMin < c.finMin && finMin > c.inicioMin);
    if (chocaCon) return { ok: false, motivo: "hueco_ya_ocupado", servicio };

    const { id } = await this.agenda.crearCita({
      fechaISO,
      inicioMin,
      finMin,
      titulo: `✂️ ${servicio.nombre} — ${cliente}`,
      descripcion:
        `Reserva creada por el agente telefónico.\n\n` +
        `Servicio: ${servicio.nombre} (${servicio.duracionMin} min · ${servicio.precioEur} €)\n` +
        `Cliente: ${cliente}\n` +
        `Teléfono: ${telefono ?? "—"}\n` +
        `Canal: Llamada telefónica`,
    });

    return {
      ok: true,
      reserva: { id, servicio: servicio.nombre, fechaISO, hora, cliente, precioEur: servicio.precioEur },
    };
  }

  // ---- utilidades internas ----

  _resolverServicio(ref) {
    if (!ref) return null;
    return servicioPorId(ref) ?? detectarServicio(ref);
  }

  _sumarDias(fechaISO, n) {
    const d = new Date(`${fechaISO}T12:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
  }
}

export { NEGOCIO, diaSemana };
