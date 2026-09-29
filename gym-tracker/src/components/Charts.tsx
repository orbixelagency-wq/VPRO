import { useState } from "react"
import { formatDate } from "../lib/schedule"
import { fmt } from "../lib/calc"

type Point = { date: string; value: number }

const W = 320
const H = 150
const PAD = { l: 34, r: 10, t: 12, b: 22 }

function niceRange(values: number[], target?: number): [number, number] {
  const all = target != null ? [...values, target] : values
  let lo = Math.min(...all)
  let hi = Math.max(...all)
  if (lo === hi) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.15
  return [lo - pad, hi + pad]
}

/** Línea de una sola serie con cruz + tooltip al pasar/tocar. */
export function LineChart({ points, unit, decimals = 1, target, targetLabel, invert = false }: { points: Point[]; unit: string; decimals?: number; target?: number; targetLabel?: string; invert?: boolean }) {
  const [active, setActive] = useState<number | null>(null)
  if (points.length === 0) return <p className="empty">Sin datos todavía.</p>

  const values = points.map((p) => p.value)
  const [lo, hi] = niceRange(values, target)
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const x = (i: number) => PAD.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw)
  const y = (v: number) => {
    const t = (v - lo) / (hi - lo)
    return PAD.t + (invert ? t : 1 - t) * ih
  }
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ")
  const area = `${path} L${x(points.length - 1)},${PAD.t + ih} L${x(0)},${PAD.t + ih} Z`
  const ticks = [lo + (hi - lo) * 0.15, (lo + hi) / 2, hi - (hi - lo) * 0.15]

  const onMove = (e: React.PointerEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = ((e.clientX - rect.left) / rect.width) * iw
    const i = points.length === 1 ? 0 : Math.round((rel / iw) * (points.length - 1))
    setActive(Math.max(0, Math.min(points.length - 1, i)))
  }

  const a = active != null ? points[active] : null
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Evolución en ${unit}`}>
        {ticks.map((t, i) => (
          <g key={i}>
            <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} />
            <text className="axis-label" x={PAD.l - 6} y={y(t) + 3} textAnchor="end">
              {fmt(t, hi - lo < 0.5 ? 2 : hi - lo < 5 ? 1 : 0)}
            </text>
          </g>
        ))}
        {target != null && (
          <g>
            <line className="target" x1={PAD.l} x2={W - PAD.r} y1={y(target)} y2={y(target)} />
            {targetLabel && (
              <text className="axis-label" x={W - PAD.r} y={y(target) - 5} textAnchor="end" style={{ fill: "var(--gate)" }}>
                {targetLabel}
              </text>
            )}
          </g>
        )}
        {points.length > 1 && <path className="area" d={area} />}
        <path className="series" d={path} />
        <text className="axis-label" x={PAD.l} y={H - 4}>
          {formatDate(points[0].date)}
        </text>
        {points.length > 1 && (
          <text className="axis-label" x={W - PAD.r} y={H - 4} textAnchor="end">
            {formatDate(points[points.length - 1].date)}
          </text>
        )}
        {points.map((p, i) => (
          <circle key={p.date + i} className={i === active ? "pt-active" : "pt"} cx={x(i)} cy={y(p.value)} r={i === active ? 5 : points.length > 16 ? 0 : 3.5} />
        ))}
        {a && <line className="grid" x1={x(active!)} x2={x(active!)} y1={PAD.t} y2={PAD.t + ih} style={{ stroke: "var(--faint)" }} />}
        <rect x={PAD.l} y={0} width={iw} height={H} fill="transparent" onPointerMove={onMove} onPointerDown={onMove} onPointerLeave={() => setActive(null)} style={{ touchAction: "pan-y" }} />
      </svg>
      {a && (
        <div className="tooltip" style={{ left: `${(x(active!) / W) * 100}%`, top: `${(y(a.value) / H) * 100}%` }}>
          {formatDate(a.date)} · <span className="num">{fmt(a.value, decimals)}</span> {unit}
        </div>
      )}
    </div>
  )
}

/** Barras semanales de carga; la barra se marca en ámbar si sube >15% respecto a la anterior. */
export function LoadBars({ weeks }: { weeks: { start: string; load: number }[] }) {
  const [active, setActive] = useState<number | null>(null)
  const max = Math.max(1, ...weeks.map((w) => w.load))
  const iw = W - PAD.l - PAD.r
  const ih = H - PAD.t - PAD.b
  const bw = iw / weeks.length
  const barW = Math.min(26, bw - 6)
  const a = active != null ? weeks[active] : null
  return (
    <div className="chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Carga semanal">
        {[0.5, 1].map((t) => (
          <g key={t}>
            <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={PAD.t + ih * (1 - t)} y2={PAD.t + ih * (1 - t)} />
            <text className="axis-label" x={PAD.l - 6} y={PAD.t + ih * (1 - t) + 3} textAnchor="end">
              {fmt(max * t)}
            </text>
          </g>
        ))}
        <line className="grid" x1={PAD.l} x2={W - PAD.r} y1={PAD.t + ih} y2={PAD.t + ih} />
        {weeks.map((w, i) => {
          const prev = weeks[i - 1]?.load ?? 0
          const spike = prev > 0 && w.load > prev * 1.15
          const h = (w.load / max) * ih
          const cx = PAD.l + bw * i + bw / 2
          const r = Math.min(4, h / 2)
          const x0 = cx - barW / 2
          const y0 = PAD.t + ih - h
          const d = h > 0 ? `M${x0},${PAD.t + ih} V${y0 + r} Q${x0},${y0} ${x0 + r},${y0} H${x0 + barW - r} Q${x0 + barW},${y0} ${x0 + barW},${y0 + r} V${PAD.t + ih} Z` : ""
          return (
            <g key={w.start} onPointerEnter={() => setActive(i)} onPointerDown={() => setActive(i)} onPointerLeave={() => setActive(null)}>
              <rect x={PAD.l + bw * i} y={PAD.t} width={bw} height={ih} fill="transparent" />
              {d && <path d={d} className={spike ? "bar-warn" : i === weeks.length - 1 ? "bar-now" : "bar"} opacity={active == null || active === i ? 1 : 0.55} />}
              <text className="axis-label" x={cx} y={H - 4} textAnchor="middle">
                {formatDate(w.start).split(" ")[0]}
              </text>
            </g>
          )
        })}
      </svg>
      {a && (
        <div className="tooltip" style={{ left: `${((PAD.l + bw * active! + bw / 2) / W) * 100}%`, top: `${((PAD.t + ih - (a.load / max) * ih) / H) * 100}%` }}>
          Semana del {formatDate(a.start)} · <span className="num">{fmt(a.load)}</span> UA
        </div>
      )}
    </div>
  )
}
