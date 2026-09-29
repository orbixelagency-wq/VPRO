interface Props {
  data: number[];
  width?: number;
  height?: number;
  /** Si se indica, colorea según el último valor frente a esta referencia. */
  base?: number;
}

export function Sparkline({ data, width = 72, height = 22, base }: Props) {
  if (data.length < 2) return <svg width={width} height={height} aria-hidden />;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map(
    (v, i) =>
      `${((i / (data.length - 1)) * width).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`,
  );
  const last = data[data.length - 1]!;
  const ref = base ?? data[0]!;
  const color = last >= ref ? 'var(--up)' : 'var(--down)';
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden>
      <polyline
        points={pts.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={1.3}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
