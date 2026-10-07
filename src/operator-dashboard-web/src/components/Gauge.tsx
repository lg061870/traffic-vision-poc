import { formatOne } from '../kpis'

const cx = 100
const cy = 100
const radius = 78

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
export function Gauge({ value, breakEven, measured }: { value: number; breakEven: number; measured: boolean }) {
  const max = Math.ceil(Math.max(80, breakEven * 2, value * 1.15) / 10) * 10
  const at = (v: number) => Math.min(1, Math.max(0, v / max))
  const [nx, ny] = point(at(value), radius - 16)
  const covers = value >= breakEven

  return (
    <svg className="gauge" viewBox="0 0 200 146" role="img" aria-label={`Abordajes por hora-bus: ${formatOne(value)}; equilibrio ${formatOne(breakEven)}`}>
      <path d={arc(0, at(breakEven))} className="gauge-bad" />
      <path d={arc(at(breakEven), at(breakEven * 1.15))} className="gauge-warn" />
      <path d={arc(at(breakEven * 1.15), 1)} className="gauge-good" />
      {measured && (
        <>
          <line x1={cx} y1={cy} x2={nx} y2={ny} className="gauge-needle" />
          <circle cx={cx} cy={cy} r={6} className="gauge-hub" />
        </>
      )}
      <text x={cx} y={cy + 30} textAnchor="middle" className={`gauge-value ${measured ? (covers ? 'good' : 'bad') : ''}`}>
        {measured ? formatOne(value) : '—'}
      </text>
      <text x={22} y={cy + 14} textAnchor="middle" className="chart-label">0</text>
      <text x={178} y={cy + 14} textAnchor="middle" className="chart-label">{max}</text>
      <text x={cx} y={cy + 44} textAnchor="middle" className="chart-label chart-label-strong">equilibrio {formatOne(breakEven)}</text>
    </svg>
  )
}
