// Demo ejecutable: simula una llamada de principio a fin usando el motor real.
//
//   node barberia-reservas-voz/demo.mjs
//
// Usa la agenda EN MEMORIA (no toca ningún calendario real). En producción se
// cambiaría AgendaEnMemoria por AgendaGoogleCalendar y NADA MÁS del código cambia.

import { MotorReservas, NEGOCIO } from "./motor.mjs";
import { AgendaEnMemoria } from "./agenda.mjs";
import { detectarServicio } from "./catalogo.mjs";

// Pintura de la "conversación" para que se lea como una llamada.
const bot = (t) => console.log(`\n  💈 Agente:  ${t}`);
const cli = (t) => console.log(`\n  🗣️  Cliente: ${t}`);
const sys = (t) => console.log(`      · ${t}`);

// Arrancamos con la agenda medio llena para que se note que comprueba de verdad.
const agenda = new AgendaEnMemoria([
  { fechaISO: "2026-08-17", inicioMin: 10 * 60, finMin: 10 * 60 + 30, titulo: "Corte — Marc" },
  { fechaISO: "2026-08-17", inicioMin: 10 * 60 + 30, finMin: 11 * 60 + 15, titulo: "Corte+barba — Pau" },
  { fechaISO: "2026-08-17", inicioMin: 17 * 60, finMin: 17 * 60 + 30, titulo: "Corte — Nil" },
]);
const motor = new MotorReservas(agenda);

console.log("═".repeat(64));
console.log(`  📞  LLAMADA ENTRANTE — ${NEGOCIO.nombre} (${NEGOCIO.ciudad})`);
console.log("═".repeat(64));

// 1) El cliente dice lo que quiere, en lenguaje natural.
bot(`Barbería ${NEGOCIO.nombre}, ¿en qué puedo ayudarte?`);
cli("Hola, quería cortarme el pelo y arreglarme la barba el lunes.");

const servicio = detectarServicio("cortarme el pelo y arreglarme la barba");
sys(`Claude entiende el servicio → "${servicio.nombre}" (${servicio.duracionMin} min, ${servicio.precioEur} €)`);

// 2) Comprobar disponibilidad real para ese día (lunes 17).
const fecha = "2026-08-17";
const disp = await motor.comprobarDisponibilidad(servicio.id, fecha);
sys(`Herramienta comprobar_disponibilidad("${servicio.id}", "${fecha}") → ${disp.huecos.length} huecos`);

const manana = disp.huecos.filter((h) => h < "14:00");
const tarde = disp.huecos.filter((h) => h >= "16:00");
bot(
  `El lunes tengo hueco para corte + barba. Por la mañana desde las ` +
  `${manana[0]}, y por la tarde tengo ${tarde.slice(0, 3).join(", ")}. ¿Qué te viene mejor?`
);

// 3) El cliente elige una hora.
cli("Perfecto, a las seis y media de la tarde.");
const horaElegida = "18:30";
sys(`El cliente elige ${horaElegida}`);

// 4) Confirmar datos y CREAR la reserva (con re-comprobación anti-solape).
bot("Genial. ¿Me dices tu nombre para la reserva?");
cli("Javier Ruiz.");

const res = await motor.crearReserva({
  servicioRef: servicio.id,
  fechaISO: fecha,
  hora: horaElegida,
  cliente: "Javier Ruiz",
  telefono: "+34 6XX XXX XXX",
});

if (res.ok) {
  sys(`Herramienta crear_reserva(...) → OK · id=${res.reserva.id}`);
  bot(
    `Hecho, Javier. Te confirmo: ${res.reserva.servicio} el lunes 17 a las ` +
    `${res.reserva.hora}, son ${res.reserva.precioEur} €. Te esperamos. ¡Hasta el lunes!`
  );
} else {
  bot("Uy, justo me acaban de coger esa hora. Te propongo otra…");
  sys(`crear_reserva falló: ${res.motivo}`);
}

// 5) Demostración del caso "día lleno" → propone alternativas automáticamente.
console.log("\n" + "─".repeat(64));
console.log("  Segundo escenario: piden un día ya completo\n");
cli("¿Tenéis algo para un afeitado el domingo?");
const dom = await motor.comprobarDisponibilidad("afeitado", "2026-08-16");
if (!dom.ok && dom.motivo === "cerrado") {
  sys('comprobar_disponibilidad("afeitado","2026-08-16") → cerrado');
  const alt = await motor.proponerAlternativas("afeitado", "2026-08-16");
  const a = alt.alternativas[0];
  bot(
    `Los domingos cerramos. Lo más próximo que tengo es el ` +
    `${a.fechaISO} a las ${a.primeras[0]}. ¿Te lo reservo?`
  );
}

// 6) Estado final de la agenda: la cita quedó grabada.
console.log("\n" + "─".repeat(64));
console.log("  📅  Agenda del lunes 17 tras la llamada:\n");
for (const c of await agenda.citasDelDia("2026-08-17")) {
  const hh = (m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  console.log(`      ${hh(c.inicioMin)}–${hh(c.finMin)}  ${c.titulo}`);
}
console.log("\n  ✅ La reserva de Javier (18:30) aparece en la agenda central.\n");
