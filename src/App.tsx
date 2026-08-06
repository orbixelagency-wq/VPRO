import { Navbar } from "@/components/Navbar"
import { VideoHero } from "@/components/ui/video-hero"
import { Philosophy } from "@/components/sections/Philosophy"
import { Offerings } from "@/components/sections/Offerings"
import { Sedes } from "@/components/sections/Sedes"
import { Method } from "@/components/sections/Method"
import { Players } from "@/components/sections/Players"
import { Contact } from "@/components/sections/Contact"
import { Footer } from "@/components/sections/Footer"

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

export default function App() {
  return (
    <div className="relative min-h-screen bg-ink text-foreground">
      <Navbar />

      {/* Hero corporativo con revelado multimedia dirigido por scroll */}
      <VideoHero onContacto={() => scrollTo("contacto")} />

      <main className="relative z-10 bg-ink">
        <Philosophy />
        <Offerings />
        <Sedes />
        <Method />
        <Players />
        <Contact />
      </main>

      <Footer />
    </div>
  )
}
