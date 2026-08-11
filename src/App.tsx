import { Navbar } from "@/components/Navbar"
import { ScrollProgressBar } from "@/components/telemetry"
import { VideoHero } from "@/components/ui/video-hero"
import { Manifesto } from "@/components/sections/Manifesto"
import { Programa } from "@/components/sections/Programa"
import { Sedes } from "@/components/sections/Sedes"
import { Method } from "@/components/sections/Method"
import { OnceInicial } from "@/components/sections/OnceInicial"
import { Contact } from "@/components/sections/Contact"
import { Footer } from "@/components/sections/Footer"

const scrollTo = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" })

export default function App() {
  return (
    <div className="relative min-h-screen bg-carbon text-chalk">
      <ScrollProgressBar />
      <Navbar />

      <VideoHero onContacto={() => scrollTo("contacto")} />

      <main className="relative z-10 bg-carbon">
        <Manifesto />
        <Programa />
        <Sedes />
        <Method />
        <OnceInicial />
        <Contact />
      </main>

      <Footer />
    </div>
  )
}
