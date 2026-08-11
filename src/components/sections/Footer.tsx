import { Instagram, Mail } from "lucide-react"
import { NAV, LOCATIONS, CONTACT } from "@/lib/content"
import { RazorRose } from "@/components/Brand"

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 100%, rgba(245,54,31,0.12), transparent 60%)",
        }}
      />
      <div className="relative mx-auto max-w-[1280px] px-6 py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          {/* Marca */}
          <div>
            <div className="flex items-center gap-3">
              <RazorRose className="w-11 text-neon" />
              <span className="font-script text-3xl text-neon">Scoundrels</span>
            </div>
            <p className="mt-4 max-w-xs font-sans text-bone-dim">
              Barbería de referencia en Girona y Figueres. Ven a por tu{" "}
              <span className="text-bone">#momentoscoundrels</span>.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href={CONTACT.instagram}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center rounded-sm border border-line text-bone-dim transition-colors hover:border-neon hover:text-neon"
              >
                <Instagram size={18} />
              </a>
              <a
                href={`mailto:${CONTACT.email}`}
                aria-label="Email"
                className="grid h-10 w-10 place-items-center rounded-sm border border-line text-bone-dim transition-colors hover:border-neon hover:text-neon"
              >
                <Mail size={18} />
              </a>
            </div>
          </div>

          {/* Navegación */}
          <nav aria-label="Pie">
            <p className="mb-4 font-cond text-[0.75rem] uppercase tracking-ticket text-neon">
              Navega
            </p>
            <ul className="space-y-2.5">
              {NAV.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => scrollTo(n.id)}
                    className="font-cond text-bone-dim transition-colors hover:text-bone"
                  >
                    {n.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Locales */}
          <div>
            <p className="mb-4 font-cond text-[0.75rem] uppercase tracking-ticket text-neon">
              Locales
            </p>
            <ul className="space-y-4">
              {LOCATIONS.map((l) => (
                <li key={l.city}>
                  <p className="font-cond font-700 uppercase tracking-wide text-bone">
                    {l.city}
                  </p>
                  <p className="text-sm text-bone-dim">{l.address[0]}</p>
                  <a
                    href={l.phoneHref}
                    className="text-sm text-bone-dim transition-colors hover:text-neon"
                  >
                    {l.phone}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-line pt-6 sm:flex-row">
          <p className="font-cond text-[0.78rem] uppercase tracking-[0.1em] text-bone-dim">
            © {new Date().getFullYear()} Scoundrels Barbers — Girona & Figueres
          </p>
          <p className="font-cond text-[0.78rem] uppercase tracking-[0.1em] text-bone-dim">
            Hecho con navaja y buen rollo
          </p>
        </div>
      </div>
    </footer>
  )
}
