import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { useBooking } from "@/components/booking/BookingProvider"
import { LOCALES, SERVICES } from "@/lib/booking-data"
import { MessageSquare, X, Send, Scissors } from "lucide-react"

interface Msg {
  from: "bot" | "user"
  text: string
  action?: "book"
}

const QUICK = ["Reservar cita", "Servicios y precios", "Horarios", "Locales"]

const GREETING =
  "¡Hola! Soy Nico, el asistente de Oblivion Barbers & Care 💈 ¿En qué te ayudo? Puedo contarte servicios, precios, horarios y ubicaciones, o abrirte la reserva."

/** Asistente guiado basado en reglas (FAQ + lanzar reserva). */
function respond(input: string): Msg {
  const t = input.toLowerCase()
  const has = (...k: string[]) => k.some((w) => t.includes(w))

  if (has("reserv", "cita", "agendar", "hora", "book")) {
    return {
      from: "bot",
      text: "Perfecto, te abro la reserva. Elige local, servicio, barbero, fecha y hora 👇",
      action: "book",
    }
  }
  if (has("precio", "cuánto", "cuanto", "coste", "cuesta", "servicio", "corte", "tarifa")) {
    const list = SERVICES.map((s) => `• ${s.name} — ${s.price} € (${s.duration} min)`).join(
      "\n"
    )
    return { from: "bot", text: `Estos son nuestros servicios:\n${list}` }
  }
  if (has("ozono", "barba")) {
    return {
      from: "bot",
      text: "El arreglo de barba con vapor de ozono incluye toalla caliente y perfilado, dejando la piel más limpia y cuidada. Dura unos 30 min (16 €).",
    }
  }
  if (has("horario", "abren", "abierto", "cierran", "hora de")) {
    return {
      from: "bot",
      text: "Abrimos de lunes a viernes de 9:00 a 20:00, sábados de 9:00 a 14:00. Domingos cerrado.",
    }
  }
  if (has("local", "donde", "dónde", "direccion", "dirección", "ubica", "sitio")) {
    const list = LOCALES.map((l) => `• ${l.name} — ${l.address}`).join("\n")
    return { from: "bot", text: `Tenemos tres locales en Menorca:\n${list}` }
  }
  if (has("cortesia", "cortesía", "bebida", "café", "cafe")) {
    return {
      from: "bot",
      text: "Sí 🙂 Cada visita incluye una bebida de cortesía. Queremos que el rato sea también para desconectar.",
    }
  }
  if (has("gracias", "genial", "perfecto", "ok")) {
    return { from: "bot", text: "¡A ti! ¿Quieres que te abra la reserva?", action: "book" }
  }
  if (has("hola", "buenas", "hey")) {
    return { from: "bot", text: "¡Hola! ¿Te ayudo con una reserva o tienes alguna duda?" }
  }
  return {
    from: "bot",
    text: "Puedo ayudarte con reservas, servicios y precios, horarios, la barba con ozono o las ubicaciones. ¿Qué necesitas? También puedo abrirte la reserva directamente.",
  }
}

export function ChatWidget() {
  const { openBooking } = useBooking()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([{ from: "bot", text: GREETING }])
  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, open])

  const send = (text: string) => {
    const clean = text.trim()
    if (!clean) return
    setInput("")
    setMessages((m) => [...m, { from: "user", text: clean }])
    const reply = respond(clean)
    setTimeout(() => {
      setMessages((m) => [...m, reply])
      if (reply.action === "book") setTimeout(() => openBooking(), 500)
    }, 350)
  }

  return (
    <>
      {/* Botón flotante */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar chat" : "Abrir chat"}
        className={cn(
          "fixed bottom-5 right-5 z-[90] grid h-14 w-14 place-items-center rounded-full shadow-lg transition-all",
          open ? "bg-graphite-2 text-chalk" : "bg-ember text-carbon hover:bg-ember-2"
        )}
      >
        {open ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
      </button>

      {/* Panel */}
      <div
        className={cn(
          "fixed bottom-24 right-5 z-[90] flex w-[min(92vw,22rem)] flex-col overflow-hidden border border-line bg-graphite shadow-2xl transition-all duration-300",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none translate-y-4 opacity-0"
        )}
        style={{ height: "min(70vh, 32rem)" }}
      >
        {/* Cabecera */}
        <div className="flex items-center gap-3 border-b border-line bg-carbon px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ember text-carbon">
            <Scissors className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-semibold text-chalk">Nico · Oblivion</p>
            <p className="text-[0.6rem] uppercase tracking-[0.16em] text-ember-2">
              En línea
            </p>
          </div>
        </div>

        {/* Mensajes */}
        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "max-w-[85%] whitespace-pre-line rounded-lg px-3 py-2 text-sm leading-relaxed",
                m.from === "bot"
                  ? "bg-graphite-2 text-ash"
                  : "ml-auto bg-ember text-carbon"
              )}
            >
              {m.text}
            </div>
          ))}
        </div>

        {/* Respuestas rápidas */}
        <div className="flex flex-wrap gap-1.5 border-t border-line px-3 py-2.5">
          {QUICK.map((q) => (
            <button
              key={q}
              onClick={() => send(q)}
              className="border border-line px-2.5 py-1 text-[0.68rem] text-ash transition-colors hover:border-ember hover:text-ember"
            >
              {q}
            </button>
          ))}
        </div>

        {/* Entrada */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-center gap-2 border-t border-line px-3 py-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Escribe tu mensaje…"
            className="vp-input"
          />
          <button
            type="submit"
            aria-label="Enviar"
            className="grid h-10 w-10 shrink-0 place-items-center bg-ember text-carbon transition-colors hover:bg-ember-2"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </>
  )
}
