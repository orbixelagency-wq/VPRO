import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { gsap } from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import { Button } from "@/components/ui/button"
import { MapPin } from "lucide-react"

gsap.registerPlugin(ScrollTrigger)

/**
 * Hero cinematográfico de Oblivion con transiciones dirigidas por scroll.
 *
 * Técnica adaptada de un hero "scroll-driven" (Three.js + GSAP ScrollTrigger)
 * a la identidad de la barbería: fondo oscuro con partículas doradas tipo
 * brasas / polvo de luz, niebla cálida y un ligero bloom. Al hacer scroll la
 * cámara avanza por el campo de partículas y las escenas de texto se funden
 * (OBLIVION → BARBERS → & CARE). El ratón añade un parallax sutil.
 *
 * Es robusto: si WebGL no está disponible o el usuario prefiere movimiento
 * reducido, se degrada a un hero estático perfectamente legible.
 */

interface Scene {
  title: string
  line1: string
  line2: string
}

const SCENES: Scene[] = [
  {
    title: "OBLIVION",
    line1: "Barbería & cuidado masculino",
    line2: "en el corazón de Menorca",
  },
  {
    title: "BARBERS",
    line1: "Cortes de tendencia y afeitado a navaja,",
    line2: "barba con vapor de ozono",
  },
  {
    title: "& CARE",
    line1: "Bienestar masculino, ambiente actual",
    line2: "y bebida de cortesía",
  },
]

// Posiciones de cámara por escena (dolly hacia el interior del campo).
const CAMERA_Z = [120, 45, -35]
const CAMERA_Y = [18, 26, 34]

interface ThreeRefs {
  scene?: THREE.Scene
  camera?: THREE.PerspectiveCamera
  renderer?: THREE.WebGLRenderer
  composer?: EffectComposer
  layers: THREE.Points[]
  animationId?: number
  targetZ: number
  targetY: number
}

interface OblivionHeroScrollProps {
  onReservar?: () => void
  onLocales?: () => void
}

export const Component = ({ onReservar, onLocales }: OblivionHeroScrollProps) => {
  const rootRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const titleRef = useRef<HTMLHeadingElement>(null)

  const progressRef = useRef(0)
  const mouseRef = useRef({ x: 0, y: 0 })
  const smoothCam = useRef({ x: 0, y: CAMERA_Y[0], z: CAMERA_Z[0] })

  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeScene, setActiveScene] = useState(0)
  const [webglOk, setWebglOk] = useState(true)

  const threeRefs = useRef<ThreeRefs>({
    layers: [],
    targetZ: CAMERA_Z[0],
    targetY: CAMERA_Y[0],
  })

  const prefersReduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches

  // ---- Three.js ----
  useEffect(() => {
    const refs = threeRefs.current
    const canvas = canvasRef.current
    if (!canvas) return

    const isMobile = window.innerWidth < 768
    const particlesPerLayer = isMobile ? 1400 : 3200

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: !isMobile, alpha: true })
    } catch {
      setWebglOk(false)
      return
    }
    refs.renderer = renderer
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1 : 2))
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 0.7

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x0c0b0a, 0.0016)
    refs.scene = scene

    const camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      2000
    )
    camera.position.set(0, CAMERA_Y[0], CAMERA_Z[0])
    refs.camera = camera

    // Campo de brasas / polvo de luz, en dos capas de profundidad.
    const goldTones: [number, number, number][] = [
      [0.82, 0.62, 0.29],
      [0.91, 0.79, 0.47],
      [0.7, 0.42, 0.2],
    ]

    const buildLayer = (count: number, spread: number, base: number) => {
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(count * 3)
      const colors = new Float32Array(count * 3)
      const sizes = new Float32Array(count)
      const seeds = new Float32Array(count)
      const c = new THREE.Color()

      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * spread
        positions[i * 3 + 1] = (Math.random() - 0.5) * spread * 0.6
        positions[i * 3 + 2] = base - Math.random() * spread
        const [h, s, l] = goldTones[Math.floor(Math.random() * goldTones.length)]
        c.setRGB(h, s, l)
        colors[i * 3] = c.r
        colors[i * 3 + 1] = c.g
        colors[i * 3 + 2] = c.b
        sizes[i] = Math.random() * 2.2 + 0.6
        seeds[i] = Math.random()
      }

      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1))
      geometry.setAttribute("seed", new THREE.BufferAttribute(seeds, 1))

      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `
          attribute float size;
          attribute float seed;
          attribute vec3 color;
          uniform float time;
          varying vec3 vColor;
          varying float vTwinkle;
          void main() {
            vColor = color;
            vec3 pos = position;
            // deriva ascendente tipo brasa + vaivén lateral
            pos.y += mod(time * (2.0 + seed * 3.0) + seed * 200.0, 300.0) - 150.0;
            pos.x += sin(time * 0.3 + seed * 6.2831) * 3.0;
            vec4 mv = modelViewMatrix * vec4(pos, 1.0);
            gl_PointSize = size * (320.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
            vTwinkle = 0.55 + 0.45 * sin(time * 1.6 + seed * 25.0);
          }
        `,
        fragmentShader: `
          varying vec3 vColor;
          varying float vTwinkle;
          void main() {
            float d = length(gl_PointCoord - vec2(0.5));
            if (d > 0.5) discard;
            float o = smoothstep(0.5, 0.0, d) * vTwinkle;
            gl_FragColor = vec4(vColor, o);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })

      const points = new THREE.Points(geometry, material)
      scene.add(points)
      refs.layers.push(points)
    }

    buildLayer(particlesPerLayer, 600, 60)
    buildLayer(Math.floor(particlesPerLayer * 0.6), 1100, -100)

    // Post-proceso: bloom sutil para el brillo de las brasas (opcional).
    try {
      const composer = new EffectComposer(renderer)
      composer.addPass(new RenderPass(scene, camera))
      if (!isMobile) {
        composer.addPass(
          new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.6,
            0.5,
            0.2
          )
        )
      }
      refs.composer = composer
    } catch {
      refs.composer = undefined
    }

    const clock = new THREE.Clock()
    const animate = () => {
      refs.animationId = requestAnimationFrame(animate)
      const t = clock.getElapsedTime()

      refs.layers.forEach((layer) => {
        const mat = layer.material as THREE.ShaderMaterial
        if (mat.uniforms) mat.uniforms.time.value = t
      })

      if (refs.camera) {
        const ease = 0.06
        smoothCam.current.z += (refs.targetZ - smoothCam.current.z) * ease
        smoothCam.current.y += (refs.targetY - smoothCam.current.y) * ease
        const floatX = Math.sin(t * 0.15) * 2
        const floatY = Math.cos(t * 0.2) * 1.2
        // parallax de ratón
        const mx = mouseRef.current.x * 12
        const my = mouseRef.current.y * 8
        refs.camera.position.x += (mx + floatX - refs.camera.position.x) * ease
        refs.camera.position.y = smoothCam.current.y + floatY - my
        refs.camera.position.z = smoothCam.current.z
        refs.camera.lookAt(0, refs.camera.position.y * 0.3, -400)
      }

      if (refs.composer) refs.composer.render()
      else if (refs.renderer && refs.scene && refs.camera)
        refs.renderer.render(refs.scene, refs.camera)
    }
    animate()

    const onResize = () => {
      if (!refs.camera || !refs.renderer) return
      refs.camera.aspect = window.innerWidth / window.innerHeight
      refs.camera.updateProjectionMatrix()
      refs.renderer.setSize(window.innerWidth, window.innerHeight)
      refs.composer?.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener("resize", onResize)

    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseRef.current.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener("mousemove", onMouse)

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId)
      window.removeEventListener("resize", onResize)
      window.removeEventListener("mousemove", onMouse)
      refs.layers.forEach((l) => {
        l.geometry.dispose()
        ;(l.material as THREE.Material).dispose()
      })
      refs.layers = []
      refs.renderer?.dispose()
    }
  }, [])

  // ---- Scroll: ScrollTrigger dirige la cámara y las escenas ----
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const applyProgress = (p: number) => {
      progressRef.current = p
      setScrollProgress(p)
      const seg = Math.min(SCENES.length - 1, Math.floor(p * SCENES.length))
      setActiveScene(seg)

      // interpolación continua de la posición objetivo de cámara
      const f = p * (CAMERA_Z.length - 1)
      const i = Math.min(CAMERA_Z.length - 2, Math.floor(f))
      const local = f - i
      threeRefs.current.targetZ = CAMERA_Z[i] + (CAMERA_Z[i + 1] - CAMERA_Z[i]) * local
      threeRefs.current.targetY = CAMERA_Y[i] + (CAMERA_Y[i + 1] - CAMERA_Y[i]) * local
    }

    if (prefersReduced) {
      applyProgress(0)
      return
    }

    const st = ScrollTrigger.create({
      trigger: root,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => applyProgress(self.progress),
    })
    // posición inicial
    applyProgress(0)
    ScrollTrigger.refresh()

    return () => st.kill()
  }, [prefersReduced])

  // ---- Animación de entrada del título ----
  useEffect(() => {
    if (prefersReduced || !titleRef.current) return
    const chars = titleRef.current.querySelectorAll(".oh-char")
    const tl = gsap.timeline()
    tl.from(chars, {
      yPercent: 120,
      opacity: 0,
      duration: 1.1,
      stagger: 0.04,
      ease: "power4.out",
    })
    return () => {
      tl.kill()
    }
  }, [prefersReduced])

  const splitTitle = (text: string) =>
    text.split("").map((ch, i) => (
      <span key={i} className="oh-char">
        {ch === " " ? " " : ch}
      </span>
    ))

  return (
    <section ref={rootRef} id="inicio" className="oh-root">
      <div className="oh-sticky">
        <canvas ref={canvasRef} className="oh-canvas" />
        {/* Veladuras atmosféricas y viñeta */}
        <div className="oh-veil" />
        {!webglOk && <div className="oh-fallback-bg" />}

        {/* Menú lateral vertical */}
        <div className="oh-side">
          <span className="oh-side-line" />
          <span className="oh-side-text">MENORCA</span>
        </div>

        {/* Escenas de contenido (crossfade) */}
        <div className="oh-content">
          {SCENES.map((s, i) => (
            <div
              key={s.title}
              className="oh-scene"
              style={{ opacity: activeScene === i ? 1 : 0 }}
              aria-hidden={activeScene !== i}
            >
              <p className="oh-eyebrow">
                {i === 0 ? "Oblivion Barbers & Care" : `0${i + 1} — ${s.title}`}
              </p>
              <h1 ref={i === 0 ? titleRef : undefined} className="oh-title">
                {i === 0 ? splitTitle(s.title) : s.title}
              </h1>
              <p className="oh-sub">
                <span>{s.line1}</span>
                <span>{s.line2}</span>
              </p>
              {i === SCENES.length - 1 && (
                <div className="oh-cta">
                  <Button size="lg" onClick={onReservar}>
                    Reservar cita
                  </Button>
                  <Button size="lg" variant="outline" onClick={onLocales}>
                    <MapPin className="h-4 w-4" /> Ver locales
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Indicador de progreso */}
        <div className="oh-progress">
          <span className="oh-progress-label">SCROLL</span>
          <span className="oh-progress-track">
            <span
              className="oh-progress-fill"
              style={{ width: `${scrollProgress * 100}%` }}
            />
          </span>
          <span className="oh-progress-count">
            {String(activeScene + 1).padStart(2, "0")} /{" "}
            {String(SCENES.length).padStart(2, "0")}
          </span>
        </div>
      </div>
    </section>
  )
}

export default Component
