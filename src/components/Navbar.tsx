import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

const LINKS = [
  { href: "#filosofia", label: "Filosofía" },
  { href: "#servicios", label: "Servicios" },
  { href: "#experiencia", label: "Experiencia" },
  { href: "#locales", label: "Locales" },
  { href: "#reservas", label: "Reservas" },
]

export function Navbar({ onReservar }: { onReservar?: () => void }) {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  const reservar = () => {
    setOpen(false)
    if (onReservar) onReservar()
    else document.querySelector("#reservas")?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener("scroll", onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  const go = (href: string) => {
    setOpen(false)
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth" })
  }

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-300",
        scrolled
          ? "border-b border-line bg-carbon/85 backdrop-blur-md"
          : "border-b border-transparent"
      )}
    >
      <nav className="container flex h-16 items-center justify-between sm:h-[4.5rem]">
        <button onClick={() => go("#inicio")} aria-label="Oblivion Barbers & Care — inicio">
          <Logo />
        </button>

        <div className="hidden items-center gap-8 lg:flex">
          {LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => go(l.href)}
              className="group relative font-sans text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ash transition-colors hover:text-chalk"
            >
              {l.label}
              <span className="absolute -bottom-1.5 left-0 h-px w-full origin-left scale-x-0 bg-ember transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-x-100" />
            </button>
          ))}
          <Button size="sm" onClick={reservar}>
            Reservar
          </Button>
        </div>

        <button
          className="text-chalk lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menú"
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-carbon/95 px-6 py-5 backdrop-blur-md lg:hidden">
          <div className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => go(l.href)}
                className="text-left font-sans text-xs font-semibold uppercase tracking-[0.2em] text-ash"
              >
                {l.label}
              </button>
            ))}
            <Button size="sm" onClick={() => go("#reservas")}>
              Reservar
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
