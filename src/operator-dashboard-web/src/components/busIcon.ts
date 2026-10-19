import { divIcon, type DivIcon } from 'leaflet'

// A bus glyph on a disc in the status color, plus an arrow on the rim pointing where the bus is
// heading, the plate in a squircle label beside the disc, and the 6-dot occupancy matrix from INNOBUS design.
const cache = new Map<string, DivIcon>()

function renderMiniDots(percent: number): string {
  let active = 0
  if (percent > 0 && percent <= 18) active = 1
  else if (percent > 18 && percent <= 35) active = 2
  else if (percent > 35 && percent <= 52) active = 3
  else if (percent > 52 && percent <= 70) active = 4
  else if (percent > 70 && percent <= 86) active = 5
  else if (percent > 86) active = 6

  const tone = percent < 40 ? '#10b981' : percent < 75 ? '#f59e0b' : '#ef4444'
  let dots = ''
  for (let i = 0; i < 6; i++) {
    const bg = i < active ? tone : '#64748b'
    dots += `<span style="width:3px;height:3px;border-radius:50%;background:${bg};display:block;"></span>`
  }
  return `<span class="bus-matrix" style="display:inline-grid;grid-template-columns:repeat(3,3px);grid-template-rows:repeat(2,3px);gap:1.5px;padding:2px 3px;border-radius:4px;background:rgba(13,27,42,0.9);margin-left:4px;vertical-align:middle;box-shadow:0 1px 3px rgba(0,0,0,0.3);">${dots}</span>`
}

export function busIcon(
  vehicleId: string,
  color: string,
  headingDeg: number | null | undefined,
  selected: boolean,
  percent?: number | null,
): DivIcon {
  // Whole degrees are plenty for an arrow, and keep the cache small.
  const heading = headingDeg == null ? null : Math.round(headingDeg)
  const pct = percent == null ? -1 : Math.round(percent / 10) * 10
  const key = `${vehicleId}|${color}|${heading}|${selected}|${pct}`
  const cached = cache.get(key)
  if (cached) return cached

  const size = selected ? 34 : 26
  const ring = selected ? '#06b6d4' : '#ffffff'
  const strokeWidth = selected ? 2.5 : 1.8
  const radius = selected ? 11 : 9.5
  const arrow =
    heading == null
      ? ''
      : `<g transform="rotate(${heading})"><path d="M0 -21 L5 -11 L-5 -11 Z" fill="#0d1b2a" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></g>`

  const dotsHtml = percent != null && percent >= 0 ? renderMiniDots(percent) : ''

  const icon = divIcon({
    className: selected ? 'bus-icon selected' : 'bus-icon',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    tooltipAnchor: [0, -size / 2],
    html: `<svg viewBox="-20 -20 40 40" width="${size}" height="${size}" aria-hidden="true" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.25));">
      ${arrow}
      <circle r="${radius}" fill="${color}" stroke="${ring}" stroke-width="${strokeWidth}"/>
      <rect x="-4.8" y="-5.5" width="9.6" height="9.6" rx="2" fill="#fff"/>
      <rect x="-3.6" y="-4.3" width="7.2" height="3.6" rx="0.8" fill="${color}"/>
      <circle cx="-2.4" cy="1.8" r="0.9" fill="${color}"/>
      <circle cx="2.4" cy="1.8" r="0.9" fill="${color}"/>
      <rect x="-4" y="4.1" width="2" height="1.8" rx="0.5" fill="#fff"/>
      <rect x="2" y="4.1" width="2" height="1.8" rx="0.5" fill="#fff"/>
    </svg><span class="bus-label">${vehicleId}${dotsHtml}</span>`,
  })
  cache.set(key, icon)
  return icon
}
