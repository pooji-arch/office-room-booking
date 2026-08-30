// A stat-tile trend line: thin (2px), drawn in a de-emphasis hue with a
// single accented end-dot for "where we are now" — per the dataviz
// convention of never letting a decorative line compete with the headline
// number beside it. No axes/gridlines — a sparkline's job is shape, not
// precise reading; the exact figures are already the stat-tile's own value.
export function Sparkline({
  values,
  className,
  lineClassName = "text-muted-foreground/60",
  dotClassName = "text-primary",
}: {
  values: number[]
  className?: string
  lineClassName?: string
  dotClassName?: string
}) {
  const width = 100
  const height = 28
  const pad = 3

  if (values.length < 2) return null

  const max = Math.max(...values)
  const min = Math.min(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1)

  const points = values.map((v, i) => {
    const x = i * stepX
    const y = height - pad - ((v - min) / range) * (height - pad * 2)
    return [x, y] as const
  })

  const path = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ")
  const [lastX, lastY] = points[points.length - 1]

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
      role="img"
      aria-label="Trend over the last 7 days"
    >
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={lineClassName}
      />
      <circle cx={lastX} cy={lastY} r={3} fill="currentColor" stroke="var(--card)" strokeWidth={2} className={dotClassName} />
    </svg>
  )
}
