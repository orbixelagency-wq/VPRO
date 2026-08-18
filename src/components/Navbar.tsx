import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

const LINKS = [
  { href: "#modelo", label: "Modelo" },
  { href: "#servicios", label: "Servicios" },
  { href: "#planes", label: "Planes" },
  { href: "#valor", label: "Por qué Orbixel" },
  { href: "#proceso", label: "Proceso" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
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
          ? "border-b border-line bg-paper/80 backdrop-blur-md"
          : "border-b border-transparent"
      )}
    >
      <nav className="container flex h-16 items-center justify-between">
        <button onClick={() => go("#inicio")} aria-label="Orbixel — inicio">
          <Logo />
        </button>

        <div className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => go(l.href)}
              className="text-sm text-mute transition-colors hover:text-ink"
            >
              {l.label}
            </button>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          <Button size="sm" onClick={() => go("#contacto")}>
            Solicitar auditoría
          </Button>
        </div>

        <button
          className="text-ink md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menú"
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-line bg-paper/95 px-6 py-5 backdrop-blur md:hidden">
          <div className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => go(l.href)}
                className="text-left text-sm text-mute"
              >
                {l.label}
              </button>
            ))}
            <Button size="sm" onClick={() => go("#contacto")}>
              Solicitar auditoría
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
