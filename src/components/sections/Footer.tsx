import { Logo } from "@/components/Logo"
import { Instagram, Youtube, Mail, MapPin } from "lucide-react"

export function Footer() {
  return (
    <footer id="contacto" className="relative border-t border-white/5 bg-ink-soft">
      <div className="container py-16">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Tecnificacion y alto rendimiento de futbol personalizado. Cada detalle suma.
            </p>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Sedes</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-flame" /> Girona, Cataluna
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-flame" /> Olot, Cataluna
              </li>
            </ul>
          </div>

          <div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-wide text-white">Contacto</p>
            <div className="flex gap-3">
              {[
                { icon: Instagram, label: "Instagram" },
                { icon: Youtube, label: "YouTube" },
                { icon: Mail, label: "Email" },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#"
                  aria-label={s.label}
                  className="grid h-10 w-10 place-items-center rounded-[5px] border border-white/10 bg-ink-card text-white/70 transition-colors hover:border-flame/50 hover:text-flame"
                >
                  <s.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-white/5 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} V Pro Training. Todos los derechos reservados.</p>
          <p>Girona · Olot — Alto rendimiento de futbol</p>
        </div>
      </div>
    </footer>
  )
}
