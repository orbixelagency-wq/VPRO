import { Logo } from "@/components/Logo"
import { Instagram, Youtube, Mail } from "lucide-react"

export function Footer() {
  return (
    <footer className="relative border-t border-line bg-carbon">
      <div className="container py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ash">
              Centro de tecnificación y alto rendimiento de fútbol. Cada detalle suma.
            </p>
          </div>

          <div>
            <p className="channel">Sedes</p>
            <ul className="mt-4 space-y-2 text-sm text-ash">
              <li>
                Girona{" "}
                <span className="datum text-[0.62rem] text-steel">41.98° N · 2.82° E</span>
              </li>
              <li>
                Olot <span className="datum text-[0.62rem] text-steel">42.18° N · 2.49° E</span>
              </li>
            </ul>
          </div>

          <div>
            <p className="channel">Contacto</p>
            <div className="mt-4 flex gap-3">
              {[
                { icon: Instagram, label: "Instagram" },
                { icon: Youtube, label: "YouTube" },
                { icon: Mail, label: "Email" },
              ].map((s) => (
                <a
                  key={s.label}
                  href="#contacto"
                  aria-label={s.label}
                  className="grid h-10 w-10 place-items-center border border-line text-ash transition-colors hover:border-ember hover:text-ember"
                >
                  <s.icon className="h-5 w-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 font-mono text-[0.62rem] uppercase tracking-[0.14em] text-steel sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} V Pro Total Training</p>
          <p>Girona · Olot — Alto rendimiento de fútbol</p>
        </div>
      </div>
    </footer>
  )
}
