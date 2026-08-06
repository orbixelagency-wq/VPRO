import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Logo } from "@/components/Logo"
import { cn } from "@/lib/utils"
import { Menu, X } from "lucide-react"

const LINKS = [
  { href: "#filosofia", label: "Filosofia" },
  { href: "#ofrecemos", label: "Programa" },
  { href: "#sedes", label: "Sedes" },
  { href: "#metodo", label: "Metodo" },
  { href: "#jugadores", label: "Talento" },
]

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

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
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-white/10 bg-ink/85 backdrop-blur-md"
          : "border-b border-transparent bg-transparent"
      )}
    >
      <nav className="container flex h-[68px] items-center justify-between">
        <button onClick={() => go("#inicio")} aria-label="V Pro Total Training - inicio">
          <Logo />
        </button>

        <div className="hidden items-center gap-9 md:flex">
          {LINKS.map((l) => (
            <button
              key={l.href}
              onClick={() => go(l.href)}
              className="text-[13px] font-medium uppercase tracking-wider text-white/70 transition-colors hover:text-flame"
            >
              {l.label}
            </button>
          ))}
          <Button size="sm" onClick={() => go("#contacto")}>
            Contacto
          </Button>
        </div>

        <button
          className="text-white md:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label="Menu"
        >
          {open ? <X /> : <Menu />}
        </button>
      </nav>

      {open && (
        <div className="border-t border-white/10 bg-ink/95 px-6 py-5 md:hidden">
          <div className="flex flex-col gap-4">
            {LINKS.map((l) => (
              <button
                key={l.href}
                onClick={() => go(l.href)}
                className="text-left text-sm font-medium uppercase tracking-wider text-white/80"
              >
                {l.label}
              </button>
            ))}
            <Button size="sm" onClick={() => go("#contacto")}>
              Contacto
            </Button>
          </div>
        </div>
      )}
    </header>
  )
}
