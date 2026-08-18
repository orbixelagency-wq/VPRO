import { cn } from "@/lib/utils"

/** Marca Orbixel: un núcleo (pixel) con un nodo en órbita. */
export function OrbitMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      className={cn("h-7 w-7", className)}
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="20"
        cy="20"
        r="12.5"
        stroke="currentColor"
        strokeWidth="1.6"
        opacity="0.35"
      />
      <rect x="16.5" y="16.5" width="7" height="7" rx="1.6" fill="currentColor" />
      <circle cx="32.5" cy="20" r="3.4" className="fill-orbit" />
    </svg>
  )
}

export function Logo({
  className,
  onDark = false,
}: {
  className?: string
  onDark?: boolean
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <OrbitMark className={onDark ? "text-paper" : "text-ink"} />
      <span
        className={cn(
          "font-display text-[1.35rem] font-semibold tracking-[-0.02em]",
          onDark ? "text-paper" : "text-ink"
        )}
      >
        Orbixel
      </span>
    </span>
  )
}
