/** Contenido del negocio — una sola fuente de verdad. */

export const NAV = [
  { id: "servicios", label: "Servicios" },
  { id: "nosotros", label: "Nosotros" },
  { id: "locales", label: "Locales" },
  { id: "contacto", label: "Contacto" },
]

export type Service = { name: string; alias?: string; note?: string }

export const SERVICE_GROUPS: {
  key: string
  title: string
  caption: string
  items: Service[]
}[] = [
  {
    key: "cabello",
    title: "Cabello",
    caption: "El corte, a tu medida",
    items: [
      { name: "Corte Normal", alias: "Gentleman" },
      { name: "Adolescente", alias: "The Junior", note: "10 a 14 años" },
      { name: "Rapado", alias: "Total Machine" },
      { name: "Jubilado", alias: "Retired Man" },
      { name: "Niños", alias: "The Kids" },
    ],
  },
  {
    key: "barba",
    title: "Barba & Afeitado",
    caption: "Perfilar, apurar, cuidar",
    items: [
      { name: "Barba", alias: "Spartan Beard" },
      { name: "Rapado barba", alias: "Short Beard" },
      { name: "Afeitado Clásico", alias: "Classic Shave" },
    ],
  },
  {
    key: "estilo",
    title: "Estilo & Color",
    caption: "Para los que se atreven",
    items: [
      { name: "Decoloración" },
      { name: "Desrizado" },
      { name: "Tinte" },
      { name: "Diseño de Cejas" },
    ],
  },
]

export type Location = {
  city: string
  address: string[]
  phone: string
  phoneHref: string
  hours: { days: string; time: string }[]
  /** Horario por día de la semana [Dom, Lun, Mar, Mié, Jue, Vie, Sáb], en minutos desde medianoche. */
  weekly: ({ open: number; close: number } | null)[]
  mapsQuery: string
}

export const LOCATIONS: Location[] = [
  {
    city: "Girona",
    address: ["Carrer de Sant Joan Bta. la Salle, 28", "17002 Girona"],
    phone: "872 08 15 57",
    phoneHref: "tel:+34872081557",
    hours: [
      { days: "Martes – Viernes", time: "9:30 – 20:30" },
      { days: "Sábados", time: "9:00 – 17:00" },
      { days: "Domingos & Lunes", time: "Cerrado" },
    ],
    weekly: [
      null, // Dom
      null, // Lun
      { open: 570, close: 1230 }, // Mar 9:30–20:30
      { open: 570, close: 1230 }, // Mié
      { open: 570, close: 1230 }, // Jue
      { open: 570, close: 1230 }, // Vie
      { open: 540, close: 1020 }, // Sáb 9:00–17:00
    ],
    mapsQuery:
      "Scoundrels Barbers, Carrer de Sant Joan Bta. la Salle 28, 17002 Girona",
  },
  {
    city: "Figueres",
    address: ["C/ Portella, 5", "17600 Figueres"],
    phone: "872 019 629",
    phoneHref: "tel:+34872019629",
    hours: [
      { days: "Martes – Viernes", time: "10:00 – 20:00" },
      { days: "Sábados", time: "9:00 – 17:00" },
      { days: "Domingos & Lunes", time: "Cerrado" },
    ],
    weekly: [
      null, // Dom
      null, // Lun
      { open: 600, close: 1200 }, // Mar 10:00–20:00
      { open: 600, close: 1200 }, // Mié
      { open: 600, close: 1200 }, // Jue
      { open: 600, close: 1200 }, // Vie
      { open: 540, close: 1020 }, // Sáb 9:00–17:00
    ],
    mapsQuery: "Scoundrels Barbers, Carrer de la Portella 5, 17600 Figueres",
  },
]

export const CONTACT = {
  email: "hola@scoundrelsbarbers.com",
  instagram: "https://www.instagram.com/scoundrelsbarbers/",
}
