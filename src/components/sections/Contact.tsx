import { Reveal, CornerFrame } from "@/components/telemetry"
import { SectionHeading } from "@/components/SectionHeading"
import { Button } from "@/components/ui/button"
import { Mail, Instagram, MapPin, Phone } from "lucide-react"

const CANALES = [
  { icon: Mail, label: "Email", value: "info@vprototaltraining.com" },
  { icon: Phone, label: "Teléfono", value: "+34 000 000 000" },
  { icon: Instagram, label: "Instagram", value: "@vpro.totaltraining" },
  { icon: MapPin, label: "Sedes", value: "Girona · Olot (Cataluña)" },
]

export function Contact() {
  return (
    <section id="contacto" className="relative border-t border-line py-24 sm:py-32">
      <div className="container">
        <SectionHeading
          channel="Contacto"
          index="REQ"
          title="Solicita un análisis de"
          highlight="talento"
          description="El acceso al programa es personalizado. Escríbenos y valoramos el perfil del jugador antes de iniciar el proceso."
        />

        <div className="mt-14 grid gap-px border border-line bg-line lg:grid-cols-[0.85fr_1.15fr]">
          {/* Canales */}
          <Reveal>
            <div className="grid h-full grid-cols-1 gap-px bg-line sm:grid-cols-2 lg:grid-cols-1">
              {CANALES.map((c) => (
                <div key={c.label} className="flex items-center gap-4 bg-carbon p-6">
                  <span className="grid h-10 w-10 shrink-0 place-items-center border border-line text-ember">
                    <c.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="font-mono text-[0.6rem] uppercase tracking-[0.2em] text-steel">
                      {c.label}
                    </p>
                    <p className="text-sm font-medium text-chalk">{c.value}</p>
                  </div>
                </div>
              ))}
            </div>
          </Reveal>

          {/* Formulario */}
          <Reveal delay={120}>
            <form className="relative bg-carbon p-7 sm:p-9" onSubmit={(e) => e.preventDefault()}>
              <div className="absolute inset-4 text-white/10">
                <CornerFrame />
              </div>
              <div className="relative grid gap-5 sm:grid-cols-2">
                <Field label="Nombre y apellidos">
                  <input className="vp-input" type="text" placeholder="Jugador o tutor" />
                </Field>
                <Field label="Email">
                  <input className="vp-input" type="email" placeholder="correo@ejemplo.com" />
                </Field>
                <Field label="Sede de interés">
                  <select className="vp-input">
                    <option>Girona</option>
                    <option>Olot</option>
                    <option>Ambas</option>
                  </select>
                </Field>
                <Field label="Posición / categoría">
                  <input className="vp-input" type="text" placeholder="Ej. Extremo · Juvenil" />
                </Field>
              </div>
              <div className="relative mt-5">
                <Field label="Mensaje">
                  <textarea
                    className="vp-input min-h-[120px] resize-y"
                    placeholder="Cuéntanos el objetivo del jugador…"
                  />
                </Field>
              </div>
              <div className="relative mt-7 flex items-center justify-between gap-4">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.14em] text-steel">
                  Respuesta 24–48h
                </p>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block font-mono text-[0.6rem] uppercase tracking-[0.2em] text-steel">
        {label}
      </span>
      {children}
    </label>
  )
}
