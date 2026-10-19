import type { CSSProperties } from 'react'

interface OccupancyDotMatrixProps {
  percent?: number
  count?: number
  capacity?: number
  size?: 'sm' | 'md' | 'lg'
  className?: string
  style?: CSSProperties
  showLabel?: boolean
}

/**
 * The 6-Dot Occupancy Matrix (2 rows x 3 columns) from the INNOBUS mobile app design.
 * Maps occupancy level (0-100%) to 1-6 illuminated dots:
 *  - <= 18%: 1 dot (green)
 *  - <= 35%: 2 dots (green)
 *  - <= 52%: 3 dots (amber)
 *  - <= 70%: 4 dots (amber)
 *  - <= 86%: 5 dots (red)
 *  - > 86%: 6 dots (red)
 */
export function OccupancyDotMatrix({
  percent: propPercent,
  count,
  capacity,
  size = 'md',
  className = '',
  style,
  showLabel = false,
}: OccupancyDotMatrixProps) {
  const percent =
    propPercent != null
      ? propPercent
      : capacity && capacity > 0 && count != null
        ? Math.round((count * 100) / capacity)
        : 0

  let activeDots = 0
  if (percent > 0 && percent <= 18) activeDots = 1
  else if (percent > 18 && percent <= 35) activeDots = 2
  else if (percent > 35 && percent <= 52) activeDots = 3
  else if (percent > 52 && percent <= 70) activeDots = 4
  else if (percent > 70 && percent <= 86) activeDots = 5
  else if (percent > 86) activeDots = 6

  const tone = percent < 40 ? 'green' : percent < 75 ? 'amber' : 'red'

  const sizeClass = size === 'sm' ? 'dot-matrix-sm' : size === 'lg' ? 'dot-matrix-lg' : 'dot-matrix-md'

  return (
    <span
      className={`dot-matrix ${sizeClass} tone-${tone} ${className}`}
      style={style}
      title={`Aforo: ${percent}% (${activeDots} de 6 puntos)`}
      aria-label={`Aforo al ${percent}%, ${activeDots} de 6 puntos`}
    >
      <span className="dot-matrix-grid">
        {[0, 1, 2, 3, 4, 5].map((index) => (
          <span
            key={index}
            className={`dot ${index < activeDots ? `dot-active dot-${tone}` : 'dot-inactive'}`}
          />
        ))}
      </span>
      {showLabel && <span className="dot-matrix-label">{percent}%</span>}
    </span>
  )
}
