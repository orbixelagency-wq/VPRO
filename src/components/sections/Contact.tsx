import { Reveal } from "@/components/Reveal"
import { SectionHeading } from "@/components/SectionHeading"
import { Button } from "@/components/ui/button"
import { Mail, Instagram, MapPin, Phone } from "lucide-react"

const CANALES = [
  { icon: Mail, label: "Email", value: "info@vprototaltraining.com" },
  { icon: Phone, label: "Telefono", value: "+34 000 000 000" },
  { icon: Instagram, label: "Instagram", value: "@vpro.totaltraining" },
  { icon: MapPin, label: "Sedes", value: "Girona · Olot (Cataluna)" },
]

export function Contact() {
  return (
    <section id="contacto" className="relative border-t border-white/5 py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          eyebrow="Contacto corporativo"
          title="Solicita un analisis de"
          highlight="talento"
          description="El acceso al programa es personalizado. Escribenos y valoramos el perfil del jugador antes de iniciar el proceso."
        />

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          {/* Canales */}
          <Reveal>
            <div className="grid h-full grid-cols-1 gap-px overflow-hidden rounded-[6px] border border-white/8 bg-white/8 sm:grid-cols-2 lg:grid-cols-1">
              {CANALES.map((c) => (
                <div key={c.label} className="flex items-center gap-4 bg-ink-card p-6">
                  <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[5px] border border-flame/30 text-flame">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
                      {c.label}
                    </p>
                    <p className="text-sm font-medium text-white">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Formulario de contacto (institucional, sin reservas) */}
          <Reveal delay={120}>
            <form
              className="rounded-[6px] border border-white/8 bg-ink-card p-7 sm:p-8"
              onSubmit={(e) => e.preventDefault()}
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <FormField label="Nombre y apellidos">
                  <input className="vp-input" type="text" placeholder="Nombre del jugador o tutor" />
                </FormField>
                <FormField label="Email">
                  <input className="vp-input" type="email" placeholder="correo@ejemplo.com" />
                </FormField>
                <FormField label="Sede de interes">
                  <select className="vp-input">
                    <option>Girona</option>
                    <option>Olot</option>
                    <option>Ambas</option>
                  </select>
                </FormField>
                <FormField label="Posicion / categoria">
                  <input className="vp-input" type="text" placeholder="Ej. Extremo · Juvenil" />
                </FormField>
              </div>
              <FormField label="Mensaje" className="mt-5">
                <textarea
                  className="vp-input min-h-[120px] resize-y"
                  placeholder="Cuentanos el objetivo del jugador..."
                />
              </FormField>

              <div className="mt-6 flex items-center justify-between gap-4">
                <p className="text-xs text-white/40">Respuesta en 24-48h laborables.</p>
                <Button type="submit" size="lg">
                  Enviar solicitud
                </Button>
              </div>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  )
}

function FormField({
  label,
  className,
  children,
}: {
  label: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <label className={className}>
      <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
        {label}
      </span>
      {children}
    </label>
  )
}
