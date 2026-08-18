import { OrbitMark } from "@/components/Logo"

/**
 * Firma de Orbixel: un escáner orbital. El negocio en el centro; un nodo
 * recorre la órbita y un barrido de radar detecta los "puntos débiles"
 * (los puntos azules marcados sobre los anillos).
 */
export function OrbitScanner() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px]">
      {/* Anillos concéntricos */}
      {[100, 74, 48].map((s) => (
        <div
          key={s}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line"
          style={{ width: `${s}%`, height: `${s}%` }}
        />
      ))}

      {/* Barrido de radar (conic gradient enmascarado a disco) */}
      <div
        className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 animate-sweep rounded-full"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(47,91,255,0.20), rgba(47,91,255,0) 55deg)",
          WebkitMask: "radial-gradient(circle, #000 0 50%, transparent 50%)",
          mask: "radial-gradient(circle, #000 0 50%, transparent 50%)",
        }}
        aria-hidden="true"
      />

      {/* Cruz central de referencia */}
      <div className="absolute left-1/2 top-1/2 h-px w-full -translate-x-1/2 -translate-y-1/2 bg-line" />
      <div className="absolute left-1/2 top-1/2 h-full w-px -translate-x-1/2 -translate-y-1/2 bg-line" />

      {/* Nodo que orbita en el anillo exterior */}
      <div className="absolute left-1/2 top-1/2 h-full w-full -translate-x-1/2 -translate-y-1/2 animate-orbit-spin">
        <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 rounded-full bg-orbit shadow-[0_0_0_4px_rgba(47,91,255,0.18)]" />
      </div>

      {/* Puntos débiles detectados (posicionados sobre los anillos) */}
      <ScanPoint x="78%" y="30%" label="VENTAS" />
      <ScanPoint x="20%" y="46%" label="WHATSAPP" />
      <ScanPoint x="64%" y="80%" label="WEB" />
      <ScanPoint x="36%" y="20%" label="PROCESOS" muted />

      {/* Núcleo: el negocio */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="relative">
          <span className="absolute inset-0 -z-10 animate-[pulse_3s_ease-out_infinite] rounded-2xl bg-orbit/30" />
          <div className="flex h-24 w-24 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-surface shadow-soft">
            <OrbitMark className="h-7 w-7 text-ink" />
            <span className="datum text-[0.55rem] uppercase tracking-[0.18em] text-mute">
              Tu negocio
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function ScanPoint({
  x,
  y,
  label,
  muted = false,
}: {
  x: string
  y: string
  label: string
  muted?: boolean
}) {
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{ left: x, top: y }}
    >
      <div className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${
            muted ? "bg-mute/50" : "bg-orbit"
          }`}
        />
        <span className="datum whitespace-nowrap rounded-full border border-line bg-surface/90 px-2 py-0.5 text-[0.55rem] uppercase tracking-[0.14em] text-mute backdrop-blur">
          {label}
        </span>
      </div>
    </div>
  )
}
