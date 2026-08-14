// Catálogo del negocio: servicios, precios, duraciones y horario de apertura.
// DATOS DE EJEMPLO — se sustituyen por los reales de cada barbería.
//
// Este fichero es el único sitio donde hay que tocar para adaptar el sistema
// a otro negocio (otra barbería, un dentista, una peluquería, etc.).

export const NEGOCIO = {
  nombre: "Oblivion Barbers & Care",
  ciudad: "Girona",
  zonaHoraria: "Europe/Madrid",

  // Granularidad de la agenda: cada cuántos minutos empieza un hueco posible.
  intervaloMinutos: 15,

  // Cuánto margen mínimo desde "ahora" para poder reservar (evita citas en 2 min).
  antelacionMinimaMin: 30,

  // Horario semanal. Clave = día (0 domingo … 6 sábado).
  // Cada día es una lista de tramos [apertura, cierre] en formato "HH:MM".
  // Un día sin tramos = cerrado.
  horario: {
    1: [["10:00", "14:00"], ["16:00", "20:00"]], // lunes
    2: [["10:00", "14:00"], ["16:00", "20:00"]], // martes
    3: [["10:00", "14:00"], ["16:00", "20:00"]], // miércoles
    4: [["10:00", "14:00"], ["16:00", "20:00"]], // jueves
    5: [["10:00", "20:00"]],                     // viernes (jornada continua)
    6: [["10:00", "14:00"]],                     // sábado (solo mañanas)
    0: [],                                        // domingo cerrado
  },
};

// Servicios que ofrece el negocio. La `duracionMin` es la que bloquea la agenda.
export const SERVICIOS = [
  { id: "corte",       nombre: "Corte de pelo",              duracionMin: 30, precioEur: 15 },
  { id: "corte_barba", nombre: "Corte + barba",              duracionMin: 45, precioEur: 22 },
  { id: "barba",       nombre: "Arreglo de barba",           duracionMin: 20, precioEur: 10 },
  { id: "afeitado",    nombre: "Afeitado clásico a navaja",  duracionMin: 30, precioEur: 18 },
  { id: "corte_nino",  nombre: "Corte infantil",             duracionMin: 20, precioEur: 12 },
];

// Palabras que un cliente puede decir por teléfono para cada servicio.
// Permite entender "quiero cortarme el pelo" → servicio "corte".
const SINONIMOS = {
  corte:       ["corte", "cortar", "cortarme", "pelo", "pelado", "rapar"],
  corte_barba: ["corte y barba", "pelo y barba", "todo", "completo"],
  barba:       ["barba", "recortar la barba", "arreglar la barba", "perfilar"],
  afeitado:    ["afeitado", "afeitar", "navaja", "apurado"],
  corte_nino:  ["niño", "nino", "infantil", "crío", "crio", "peque"],
};

/**
 * Intenta adivinar qué servicio pide el cliente a partir de texto libre.
 * Devuelve el servicio o `null` si no lo tiene claro (el agente preguntaría).
 */
export function detectarServicio(texto) {
  const t = (texto || "").toLowerCase();

  // "corte + barba" gana a "corte" si aparecen ambos conceptos.
  if (/(pelo|corte|cortar).*(barba)|(barba).*(pelo|corte|cortar)/.test(t)) {
    return SERVICIOS.find((s) => s.id === "corte_barba") ?? null;
  }
  for (const s of SERVICIOS) {
    const claves = SINONIMOS[s.id] ?? [s.nombre.toLowerCase()];
    if (claves.some((k) => t.includes(k))) return s;
  }
  return null;
}

export function servicioPorId(id) {
  return SERVICIOS.find((s) => s.id === id) ?? null;
}
