import { cn } from "@/lib/utils"

/**
 * Marca Scoundrels: navaja + rosa, inspirada en el logo de tatuaje del local.
 * Trazo neón sobre relleno de tinta; escala con la clase que se le pase.
 */
export function RazorRose({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={cn("block", className)}
      role="img"
      aria-label="Navaja y rosa de Scoundrels"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {/* navaja abierta en diagonal */}
        <path
          d="M18 96 L70 44 a9 9 0 0 1 12 0 L88 50 L36 102 Z"
          fill="rgba(20,16,14,0.55)"
        />
        <path d="M36 102 L98 108" />
        <path d="M94 104 l10 7" />
        <circle cx="33" cy="105" r="3.4" fill="currentColor" stroke="none" />
        {/* rosa */}
        <g transform="translate(60 40)">
          <circle cx="0" cy="0" r="12" fill="rgba(194,42,28,0.35)" />
          <path d="M-6 -2 a6 6 0 0 1 12 0 a6 6 0 0 1 -12 0" />
          <path d="M-11 -1 a11 11 0 0 1 22 0" />
          <path d="M0 -12 v-9" />
          <path d="M0 -17 l7 -4 M0 -17 l-7 -4" />
        </g>
      </g>
    </svg>
  )
}

/** Tijeras minimal para viñetas. */
export function Scissors({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("block", className)}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M8.6 8.6 L20 20 M8.6 15.4 L20 4 M12 12 L15 9" />
    </svg>
  )
}

/** Palabra "Scoundrels" en script + "BARBERS" en slab para navbar/footer. */
export function Wordmark({
  className,
  onDark = true,
}: {
  className?: string
  onDark?: boolean
}) {
  return (
    <span className={cn("inline-flex items-baseline gap-2 leading-none", className)}>
      <span
        className={cn(
          "font-script text-[1.55rem] leading-none",
          onDark ? "text-neon" : "text-rose"
        )}
      >
        Scoundrels
      </span>
      <span
        className={cn(
          "font-cond text-[0.72rem] font-700 uppercase tracking-ticket pb-[3px]",
          onDark ? "text-bone-dim" : "text-ink/70"
        )}
      >
        Barbers
      </span>
    </span>
  )
}
