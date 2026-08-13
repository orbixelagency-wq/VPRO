import { Logo } from "@/components/Logo"
import { Instagram, Facebook } from "lucide-react"

const LOCALES = [
  { ciudad: "Es Castell", dir: "Ctra. de Sant Felip, 1" },
  { ciudad: "Mahón", dir: "Av. de Fort de l'Eau, 167" },
  { ciudad: "Ciutadella", dir: "Carrer d'Eivissa, 25" },
]

const NAV = [
  { href: "#filosofia", label: "Filosofía" },
  { href: "#servicios", label: "Servicios" },
  { href: "#experiencia", label: "Experiencia" },
  { href: "#locales", label: "Locales" },
  { href: "#reservas", label: "Reservas" },
]

export function Footer() {
  const go = (href: string) =>
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })

  return (
    <footer className="relative border-t border-line bg-carbon">
      <div className="container py-16">
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-ash">
              Barbería y centro de estética masculina en Menorca. Cortes de tendencia,
              barba con vapor de ozono y bienestar masculino.
            </p>
            <div className="mt-6 flex gap-3">
              <a
                href="https://www.instagram.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className="grid h-10 w-10 place-items-center border border-line text-ash transition-colors hover:border-ember hover:text-ember"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://www.facebook.com/"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="grid h-10 w-10 place-items-center border border-line text-ash transition-colors hover:border-ember hover:text-ember"
              >
                <Facebook className="h-4 w-4" />
              </a>
            </div>
          </div>

          <div>
            <p className="channel">Locales</p>
            <ul className="mt-5 space-y-3 text-sm text-ash">
              {LOCALES.map((l) => (
                <li key={l.ciudad}>
                  <span className="block font-medium text-chalk">{l.ciudad}</span>
                  <span className="text-xs text-steel">{l.dir}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="channel">Navegación</p>
            <ul className="mt-5 space-y-2.5 text-sm">
              {NAV.map((n) => (
                <li key={n.href}>
                  <button
                    onClick={() => go(n.href)}
                    className="text-ash transition-colors hover:text-ember"
                  >
                    {n.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 font-sans text-[0.62rem] uppercase tracking-[0.16em] text-steel sm:flex-row sm:items-center">
          <p>© {new Date().getFullYear()} Oblivion Barbers &amp; Care</p>
          <p>Es Castell · Mahón · Ciutadella — Menorca</p>
        </div>
      </div>
    </footer>
  )
}
