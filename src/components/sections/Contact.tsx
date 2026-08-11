import { useState } from "react"
import { Mail, Phone, Instagram, MapPin } from "lucide-react"
import { CONTACT, LOCATIONS } from "@/lib/content"
import { useReveal } from "@/lib/useReveal"

export function Contact() {
  const ref = useReveal<HTMLDivElement>()
  const [form, setForm] = useState({
    name: "",
    contact: "",
    place: "Girona",
    message: "",
  })

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const subject = `Cita en Scoundrels ${form.place} — ${form.name || "Nuevo mensaje"}`
    const body = [
      `Nombre: ${form.name}`,
      `Contacto: ${form.contact}`,
      `Local preferido: ${form.place}`,
      "",
      form.message,
    ].join("\n")
    window.location.href = `mailto:${CONTACT.email}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(body)}`
  }

  const set =
    (k: keyof typeof form) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value }))

  return (
    <section id="contacto" className="relative bg-ink">
      <div className="mx-auto grid max-w-[1280px] gap-14 px-6 py-24 md:grid-cols-2 md:py-32">
        {/* Columna de datos */}
        <div ref={ref} className="reveal">
          <p className="eyebrow mb-6">Contacta</p>
          <h2 className="max-w-[12ch] text-[clamp(2.1rem,5vw,3.6rem)] text-bone">
            Reserva tu momento
          </h2>
          <p className="mt-6 max-w-md font-sans text-lg leading-relaxed text-bone-dim">
            Escríbenos o llámanos directamente al local. Te confirmamos hueco y
            te esperamos con una cerveza fría.
          </p>

          <div className="mt-10 space-y-6">
            <a
              href={`mailto:${CONTACT.email}`}
              className="group flex items-center gap-4"
            >
              <span className="grid h-11 w-11 place-items-center rounded-sm border border-line text-neon transition-colors group-hover:border-neon">
                <Mail size={18} />
              </span>
              <span className="font-cond text-lg font-600 text-bone transition-colors group-hover:text-neon">
                {CONTACT.email}
              </span>
            </a>

            {LOCATIONS.map((loc) => (
              <div key={loc.city} className="flex items-start gap-4">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-sm border border-line text-neon">
                  <MapPin size={18} />
                </span>
                <div>
                  <p className="font-cond text-[0.75rem] uppercase tracking-[0.14em] text-bone-dim">
                    {loc.city}
                  </p>
                  <a
                    href={loc.phoneHref}
                    className="inline-flex items-center gap-2 font-cond text-lg font-700 text-bone transition-colors hover:text-neon"
                  >
                    <Phone size={15} className="text-neon" />
                    {loc.phone}
                  </a>
                </div>
              </div>
            ))}

            <a
              href={CONTACT.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-4"
            >
              <span className="grid h-11 w-11 place-items-center rounded-sm border border-line text-neon transition-colors group-hover:border-neon">
                <Instagram size={18} />
              </span>
              <span className="font-cond text-lg font-600 text-bone transition-colors group-hover:text-neon">
                @scoundrelsbarbers
              </span>
            </a>
          </div>
        </div>

        {/* Formulario */}
        <form
          onSubmit={onSubmit}
          className="rounded-sm border border-line bg-ink-2 p-7 sm:p-9"
        >
          <p className="mb-6 font-cond text-[0.8rem] uppercase tracking-ticket text-neon">
            Envía un mensaje
          </p>

          <div className="space-y-4">
            <div>
              <label htmlFor="c-name" className="sr-only">
                Nombre
              </label>
              <input
                id="c-name"
                className="field"
                placeholder="Tu nombre"
                value={form.name}
                onChange={set("name")}
                required
              />
            </div>
            <div>
              <label htmlFor="c-contact" className="sr-only">
                Email o teléfono
              </label>
              <input
                id="c-contact"
                className="field"
                placeholder="Email o teléfono"
                value={form.contact}
                onChange={set("contact")}
                required
              />
            </div>
            <div>
              <label htmlFor="c-place" className="sr-only">
                Local preferido
              </label>
              <select
                id="c-place"
                className="field appearance-none"
                value={form.place}
                onChange={set("place")}
              >
                {LOCATIONS.map((l) => (
                  <option key={l.city} value={l.city}>
                    Local: {l.city}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="c-msg" className="sr-only">
                Mensaje
              </label>
              <textarea
                id="c-msg"
                className="field min-h-[120px] resize-y"
                placeholder="¿Qué servicio buscas y cuándo te va bien?"
                value={form.message}
                onChange={set("message")}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-neon mt-6 w-full">
            Enviar mensaje
          </button>
          <p className="mt-4 text-center font-cond text-[0.78rem] uppercase tracking-[0.1em] text-bone-dim">
            Abrimos tu correo con el mensaje listo para enviar
          </p>
        </form>
      </div>
    </section>
  )
}
