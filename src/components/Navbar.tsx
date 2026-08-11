import { useEffect, useState } from "react"
import { Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { NAV, LOCATIONS } from "@/lib/content"
import { Wordmark } from "@/components/Brand"

const scrollTo = (id: string) => {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const go = (id: string) => {
    setOpen(false)
    scrollTo(id)
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "bg-ink/95 backdrop-blur-md border-b border-line"
          : "bg-transparent"
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-6">
        <button
          onClick={() => go("top")}
          className="shrink-0"
          aria-label="Scoundrels Barbers — inicio"
        >
          <Wordmark />
        </button>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Principal">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className="font-cond text-[0.95rem] font-600 uppercase tracking-[0.14em] text-bone-dim transition-colors hover:text-bone"
            >
              {n.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <a
            href={LOCATIONS[0].phoneHref}
            className="font-cond text-sm font-600 uppercase tracking-[0.12em] text-bone-dim transition-colors hover:text-neon"
          >
            {LOCATIONS[0].phone}
          </a>
          <button className="btn btn-neon" onClick={() => go("contacto")}>
            Reserva
          </button>
        </div>

        <button
          className="text-bone md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={open}
        >
          {open ? <X size={26} /> : <Menu size={26} />}
        </button>
      </div>

      {/* menú móvil */}
      <div
        className={cn(
          "overflow-hidden border-line bg-ink/95 backdrop-blur-md transition-[max-height] duration-300 md:hidden",
          open ? "max-h-96 border-b" : "max-h-0"
        )}
      >
        <nav className="flex flex-col px-6 py-4" aria-label="Móvil">
          {NAV.map((n) => (
            <button
              key={n.id}
              onClick={() => go(n.id)}
              className="border-b border-line py-3 text-left font-cond text-lg font-600 uppercase tracking-[0.12em] text-bone"
            >
              {n.label}
            </button>
          ))}
          <button
            className="btn btn-neon mt-4 w-full"
            onClick={() => go("contacto")}
          >
            Reserva tu cita
          </button>
        </nav>
      </div>
    </header>
  )
}
