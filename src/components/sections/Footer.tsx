import { Logo } from "@/components/Logo"

const NAV = [
  { href: "#modelo", label: "Modelo" },
  { href: "#servicios", label: "Servicios" },
  { href: "#planes", label: "Planes" },
  { href: "#valor", label: "Por qué Orbixel" },
  { href: "#proceso", label: "Proceso" },
]

const go = (href: string) =>
  document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })

export function Footer() {
  return (
    <footer className="border-t border-line bg-paper">
      <div className="container py-14">
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-xs">
            <Logo />
            <p className="mt-4 text-sm text-mute">
              Agencia de inteligencia artificial. Auditamos tu negocio y lo
              potenciamos con IA — de la eficiencia a las ventas.
            </p>
          </div>

          <div className="flex flex-wrap gap-12">
            <nav className="flex flex-col gap-3">
              <span className="datum text-[0.62rem] uppercase tracking-[0.18em] text-mute">
                Navegar
              </span>
              {NAV.map((n) => (
                <button
                  key={n.href}
                  onClick={() => go(n.href)}
                  className="text-left text-sm text-ink transition-colors hover:text-orbit"
                >
                  {n.label}
                </button>
              ))}
            </nav>

            <div className="flex flex-col gap-3">
              <span className="datum text-[0.62rem] uppercase tracking-[0.18em] text-mute">
                Contacto
              </span>
              <a
                href="mailto:orbixel.agency@gmail.com"
                className="text-sm text-ink transition-colors hover:text-orbit"
              >
                orbixel.agency@gmail.com
              </a>
              <button
                onClick={() => go("#contacto")}
                className="text-left text-sm text-ink transition-colors hover:text-orbit"
              >
                Solicitar auditoría
              </button>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-line pt-6 text-xs text-mute sm:flex-row sm:items-center">
          <span className="datum uppercase tracking-[0.14em]">
            © {new Date().getFullYear()} Orbixel · Agencia de IA
          </span>
          <span className="datum uppercase tracking-[0.14em]">
            Auditoría + Implementación
          </span>
        </div>
      </div>
    </footer>
  )
}
