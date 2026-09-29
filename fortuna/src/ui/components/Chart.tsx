import { useEffect, useRef, useState } from 'react';

interface Props {
  data: number[];
  height?: number;
  /** Línea de referencia (p. ej. cierre anterior o coste medio). */
  reference?: number;
  referenceLabel?: string;
  format?: (v: number) => string;
  /** Etiqueta del eje X para el índice i. */
  labelAt?: (i: number) => string;
  /** Fuerza el color (si no, verde/rojo según la tendencia). */
  tone?: 'up' | 'down' | 'gold' | 'auto';
}

function css(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || '#999';
}

/** Gráfico de área en canvas con cruceta. Nítido en pantallas de alta densidad y 4K. */
export function Chart({
  data,
  height = 220,
  reference,
  referenceLabel,
  format = (v) => v.toFixed(2),
  labelAt,
  tone = 'auto',
}: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!wrap.current) return;
    const ro = new ResizeObserver((entries) => setWidth(Math.floor(entries[0]!.contentRect.width)));
    ro.observe(wrap.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const cv = canvas.current;
    if (!cv || width <= 0 || data.length < 2) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    cv.width = width * dpr;
    cv.height = height * dpr;
    const ctx = cv.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const padR = 62;
    const padT = 10;
    const padB = labelAt ? 22 : 8;
    const plotW = width - padR;
    const plotH = height - padT - padB;
    let min = Math.min(...data);
    let max = Math.max(...data);
    if (reference !== undefined) {
      min = Math.min(min, reference);
      max = Math.max(max, reference);
    }
    const span = max - min || Math.abs(max) * 0.01 || 1;
    min -= span * 0.06;
    max += span * 0.06;
    const x = (i: number) => (i / (data.length - 1)) * plotW;
    const y = (v: number) => padT + (1 - (v - min) / (max - min)) * plotH;
    const first = reference ?? data[0]!;
    const last = data[data.length - 1]!;
    const color =
      tone === 'gold'
        ? css('--gold')
        : tone === 'up' || (tone === 'auto' && last >= first)
          ? css('--up')
          : css('--down');

    // Rejilla horizontal con etiquetas.
    ctx.font = `11px ${css('--font-mono')}`;
    ctx.textBaseline = 'middle';
    for (let k = 0; k <= 4; k++) {
      const v = min + ((max - min) * k) / 4;
      const yy = y(v);
      ctx.strokeStyle = 'rgba(236,228,210,0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, Math.round(yy) + 0.5);
      ctx.lineTo(plotW, Math.round(yy) + 0.5);
      ctx.stroke();
      ctx.fillStyle = css('--faint');
      ctx.fillText(format(v), plotW + 8, yy);
    }
    if (labelAt) {
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = css('--faint');
      const ticks = Math.max(2, Math.floor(plotW / 110));
      for (let k = 0; k <= ticks; k++) {
        const i = Math.round(((data.length - 1) * k) / ticks);
        const label = labelAt(i);
        const tw = ctx.measureText(label).width;
        ctx.fillText(label, Math.min(plotW - tw, Math.max(0, x(i) - tw / 2)), height - 6);
      }
    }
    if (reference !== undefined) {
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(236,228,210,0.25)';
      ctx.beginPath();
      ctx.moveTo(0, y(reference));
      ctx.lineTo(plotW, y(reference));
      ctx.stroke();
      ctx.setLineDash([]);
      if (referenceLabel) {
        ctx.fillStyle = css('--muted');
        ctx.textBaseline = 'bottom';
        ctx.fillText(referenceLabel, 4, y(reference) - 3);
      }
    }
    // Área con degradado.
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH);
    grad.addColorStop(0, color + '38');
    grad.addColorStop(1, color + '00');
    ctx.beginPath();
    ctx.moveTo(x(0), y(data[0]!));
    for (let i = 1; i < data.length; i++) ctx.lineTo(x(i), y(data[i]!));
    ctx.lineTo(x(data.length - 1), padT + plotH);
    ctx.lineTo(0, padT + plotH);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x(0), y(data[0]!));
    for (let i = 1; i < data.length; i++) ctx.lineTo(x(i), y(data[i]!));
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = 'round';
    ctx.stroke();
    // Último valor.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x(data.length - 1), y(last), 3, 0, Math.PI * 2);
    ctx.fill();
    // Cruceta.
    if (hover !== null && hover >= 0 && hover < data.length) {
      const hx = x(hover);
      const hy = y(data[hover]!);
      ctx.strokeStyle = 'rgba(236,228,210,0.35)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(hx, padT);
      ctx.lineTo(hx, padT + plotH);
      ctx.stroke();
      ctx.fillStyle = css('--paper');
      ctx.beginPath();
      ctx.arc(hx, hy, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [data, width, height, reference, referenceLabel, format, labelAt, tone, hover]);

  const onMove = (e: React.MouseEvent) => {
    if (!wrap.current || data.length < 2) return;
    const rect = wrap.current.getBoundingClientRect();
    const plotW = rect.width - 62;
    const i = Math.round(((e.clientX - rect.left) / plotW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const hv = hover !== null ? data[hover] : undefined;
  return (
    <div
      ref={wrap}
      className="chart"
      style={{ height }}
      onMouseMove={onMove}
      onMouseLeave={() => setHover(null)}
    >
      <canvas
        ref={canvas}
        style={{ width: '100%', height }}
        role="img"
        aria-label="Gráfico de evolución"
      />
      {hv !== undefined && hover !== null && (
        <div className="chart-tip mono">
          {labelAt ? <span className="muted">{labelAt(hover)} · </span> : null}
          {format(hv)}
          {reference !== undefined && reference !== 0 && (
            <span className={hv >= reference ? 'up' : 'down'}>
              {' '}
              {((hv / reference - 1) * 100).toFixed(2)} %
            </span>
          )}
        </div>
      )}
      {data.length < 2 && <div className="chart-empty muted">Sin datos todavía</div>}
    </div>
  );
}
