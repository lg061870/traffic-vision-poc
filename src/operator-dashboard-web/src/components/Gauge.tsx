import { formatOne } from '../kpis'

const cx = 100
const cy = 76
const radius = 62

function point(fraction: number, r = radius) {
  const angle = Math.PI * (1 - fraction)
  return [cx + r * Math.cos(angle), cy - r * Math.sin(angle)] as const
}

function arc(from: number, to: number) {
  const [x1, y1] = point(from)
  const [x2, y2] = point(to)
  return `M ${x1} ${y1} A ${radius} ${radius} 0 0 1 ${x2} ${y2}`
}

// Boardings per bus-hour on a half dial: red below break-even, amber just above it, green beyond.
export function Gauge({
  value,
  breakEven,
  measured,
  onClick,
}: {
  value: number
  breakEven: number
  measured: boolean
  onClick?: () => void
}) {
  const max = Math.ceil(Math.max(80, breakEven * 2, value * 1.15) / 10) * 10
  const at = (v: number) => Math.min(1, Math.max(0, v / max))
  const [nx, ny] = point(at(value), radius - 14)
  const covers = value >= breakEven

  return (
    <svg
      className={`gauge ${onClick ? 'gauge-interactive' : ''}`}
      viewBox="0 0 200 134"
      role="img"
      aria-label={`Abordajes por hora-bus: ${formatOne(value)}; equilibrio ${formatOne(breakEven)}`}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {onClick && <title>Haga clic para ver el desglose horario y por ruta</title>}
      <path d={arc(0, at(breakEven))} className="gauge-bad" />
      <path d={arc(at(breakEven), at(breakEven * 1.15))} className="gauge-warn" />
      <path d={arc(at(breakEven * 1.15), 1)} className="gauge-good" />
      {measured && (
        <>
          <line x1={cx} y1={cy} x2={nx} y2={ny} className="gauge-needle" />
          <circle cx={cx} cy={cy} r={5} className="gauge-hub" />
        </>
      )}
      <g
        className="gauge-value-group"
        onClick={(e) => {
          if (onClick) {
            e.stopPropagation()
            onClick()
          }
        }}
        style={{ cursor: onClick ? 'pointer' : 'default' }}
      >
        <text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          className={`gauge-value ${measured ? (covers ? 'good' : 'bad') : ''} ${onClick ? 'gauge-value-clickable' : ''}`}
        >
          {measured ? formatOne(value) : '—'}
        </text>
        <text x={cx} y={cy + 39} textAnchor="middle" className="chart-label chart-label-strong">
          equilibrio {formatOne(breakEven)}
        </text>
        {onClick && (
          <text x={cx} y={cy + 49} textAnchor="middle" className="gauge-click-hint">
            (ver desglose 🔍)
          </text>
        )}
      </g>
      <text x={36} y={cy + 13} textAnchor="middle" className="chart-label">0</text>
      <text x={164} y={cy + 13} textAnchor="middle" className="chart-label">{max}</text>
    </svg>
  )
}
