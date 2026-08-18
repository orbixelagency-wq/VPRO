import { useEffect, useState } from "react"
import { Reveal } from "@/components/Reveal"
import { Button } from "@/components/ui/button"
import { OrbitMark } from "@/components/Logo"
import { ArrowUpRight, Check } from "lucide-react"

export function Contacto() {
  const [sent, setSent] = useState(false)
  const [mensaje, setMensaje] = useState("")

  // Preselección de plan desde la sección de Planes.
  useEffect(() => {
    const onSelectPlan = (e: Event) => {
      const { name, billing } = (e as CustomEvent).detail ?? {}
      if (name)
        setMensaje(
          `Quiero contratar el plan ${name} (facturación ${billing}). Cuéntame los siguientes pasos.`
        )
    }
    window.addEventListener("orbixel:selectPlan", onSelectPlan)
    return () => window.removeEventListener("orbixel:selectPlan", onSelectPlan)
  }, [])

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setSent(true)
  }

  return (
    <section id="contacto" className="py-24 sm:py-28">
      <div className="container">
        <div className="overflow-hidden rounded-[28px] border border-line bg-void text-paper shadow-float">
          <div className="dotgrid-dark grid gap-10 p-8 sm:p-12 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
            {/* Copy */}
            <Reveal>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-line-dark">
                <OrbitMark className="h-6 w-6 text-paper" />
              </span>
              <h2 className="mt-6 text-3xl text-paper sm:text-[2.4rem] sm:leading-[1.06]">
                Empecemos por tu auditoría.
              </h2>
              <p className="mt-4 max-w-md text-paper/60">
                Cuéntanos sobre tu negocio y detectaremos dónde la IA puede
                ahorrarte tiempo y ganar ventas. Sin compromiso — el análisis ya
                aporta valor por sí solo.
              </p>

              <ul className="mt-8 space-y-3">
                {[
                  "Respuesta en menos de 48 h",
                  "Diagnóstico claro de puntos débiles",
                  "Sin compromiso de implementación",
                ].map((t) => (
                  <li key={t} className="flex items-center gap-3 text-sm text-paper/80">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-orbit text-white">
                      <Check className="h-3 w-3" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>

            {/* Form */}
            <Reveal delay={100}>
              <div className="rounded-card border border-line-dark bg-white/[0.03] p-6 sm:p-7">
                {sent ? (
                  <div className="flex h-full min-h-[320px] flex-col items-center justify-center text-center">
                    <span className="flex h-14 w-14 items-center justify-center rounded-full bg-orbit text-white">
                      <Check className="h-6 w-6" />
                    </span>
                    <h3 className="mt-5 text-xl text-paper">Solicitud recibida</h3>
                    <p className="mt-2 max-w-xs text-sm text-paper/60">
                      Gracias. Revisaremos tu negocio y te escribiremos muy
                      pronto para agendar la auditoría.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={onSubmit} className="space-y-4">
                    <Field label="Nombre" name="nombre" placeholder="Tu nombre" required />
                    <Field
                      label="Email"
                      name="email"
                      type="email"
                      placeholder="tu@empresa.com"
                      required
                    />
                    <Field
                      label="Negocio / web"
                      name="negocio"
                      placeholder="Nombre o URL de tu negocio"
                    />
                    <div>
                      <label className="datum mb-1.5 block text-[0.65rem] uppercase tracking-[0.16em] text-paper/50">
                        ¿Qué te gustaría mejorar?
                      </label>
                      <textarea
                        name="mensaje"
                        rows={3}
                        value={mensaje}
                        onChange={(e) => setMensaje(e.target.value)}
                        placeholder="Atención al cliente, ventas, procesos manuales…"
                        className="field resize-none border-line-dark bg-white/[0.02] text-paper placeholder:text-paper/40"
                      />
                    </div>
                    <Button type="submit" className="w-full" size="lg">
                      Solicitar auditoría
                      <ArrowUpRight />
                    </Button>
                    <p className="datum text-center text-[0.62rem] uppercase tracking-[0.14em] text-paper/35">
                      También en orbixel.agency@gmail.com
                    </p>
                  </form>
                )}
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  )
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label
        htmlFor={name}
        className="datum mb-1.5 block text-[0.65rem] uppercase tracking-[0.16em] text-paper/50"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="field border-line-dark bg-white/[0.02] text-paper placeholder:text-paper/40"
      />
    </div>
  )
}
