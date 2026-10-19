import React, { useState, useRef, useEffect } from 'react'
import type { Assumptions } from '../config/operatorSettings'
import { fareOf } from '../config/operatorSettings'
import {
  costaRicaHour,
  formatColones,
  formatColonesShort,
  formatOne,
  formatPercent,
  formatWhole,
  groupBy,
  inPeriod,
  totals,
  type Period,
  type UsageRow,
} from '../kpis'

interface HourlyChartProps {
  rows: UsageRow[]
  assumptions: Assumptions
  /** Riders per bus-hour against break-even, or average load when boardings are unknown. */
  mode: 'riders' | 'occupancy'
  /** Hours outside it are drawn faded. */
  period?: Period
  selectedRoute?: string | null
  routeNames?: Map<string, string>
  onSelectRoute?: (routeId: string) => void
  onOpenDiagnostic?: (hour: number) => void
}

/**
 * Interactive Diagnostic Detail Card displayed when clicking a bar in the hourly chart.
 * Adapts automatically to "Toda la flota" or a specifically filtered route.
 */
function HourDetailCard({
  hour,
  hourRows,
  assumptions,
  selectedRoute,
  routeNames,
  onSelectRoute,
  onClose,
}: {
  hour: number
  hourRows: UsageRow[]
  assumptions: Assumptions
  selectedRoute?: string | null
  routeNames?: Map<string, string>
  onSelectRoute?: (routeId: string) => void
  onClose: () => void
}) {
  const t = totals(hourRows, assumptions)
  const isProfitable = t.ridersPerBusHour >= t.breakEven
  const paxDelta = t.ridersPerBusHour - t.breakEven
  const marginNeto = t.revenue - t.cost

  // Estimate fuel: serviceHours * ~18 km/h / 2.8 km/L
  const estimatedKm = t.serviceHours * 17.5
  const estimatedDieselLiters = Math.round(estimatedKm / 2.8)
  const intervalMinutes = Math.round(60 / Math.max(1, t.buses))

  const [branchFilter, setBranchFilter] = useState<'all' | 'loss' | 'profit'>('all')

  // Branch breakdown with individual profit/loss margin
  const branchBreakdown = React.useMemo(() => {
    if (selectedRoute) return []
    const groups = groupBy(hourRows, (r) => r.routeId ?? 'R142')
    return [...groups.entries()]
      .map(([routeId, rRows]) => {
        const rTotals = totals(rRows, assumptions)
        const name = routeNames?.get(routeId) ?? routeId
        const pct = t.boardings > 0 ? (rTotals.boardings / t.boardings) * 100 : 0
        const revenue = rTotals.revenue
        const cost = rTotals.cost
        const margin = revenue - cost
        return {
          routeId,
          name,
          buses: rTotals.buses,
          boardings: rTotals.boardings,
          revenue,
          cost,
          margin,
          isProfitable: margin >= 0,
          pct,
        }
      })
      .sort((a, b) => a.margin - b.margin) // Deficit branches first so the user sees who adds up to the loss
  }, [hourRows, assumptions, selectedRoute, routeNames, t.boardings])

  const lossCount = React.useMemo(() => branchBreakdown.filter((b) => !b.isProfitable).length, [branchBreakdown])
  const profitCount = React.useMemo(() => branchBreakdown.filter((b) => b.isProfitable).length, [branchBreakdown])

  const visibleBranches = React.useMemo(() => {
    if (branchFilter === 'loss') return branchBreakdown.filter((b) => !b.isProfitable)
    if (branchFilter === 'profit') return branchBreakdown.filter((b) => b.isProfitable)
    return branchBreakdown
  }, [branchBreakdown, branchFilter])

  // Individual bus list if viewing a specific route
  const vehicleList = React.useMemo(() => {
    if (!selectedRoute) return []
    const fare = fareOf(selectedRoute)
    const payingShare = 1 - assumptions.seniorShare

    return hourRows.map((r) => {
      const minutesInService = Math.round(r.usage.serviceSeconds / 60)
      const busCost = (r.usage.serviceSeconds / 3600) * assumptions.costPerBusHour
      const busRevenue = r.usage.boardings * fare * payingShare
      const busMargin = busRevenue - busCost

      return {
        vehicleId: r.vehicleId,
        minutesInService,
        boardings: r.usage.boardings,
        cost: busCost,
        revenue: busRevenue,
        margin: busMargin,
        isProfitable: busMargin >= 0,
        source: r.usage.source ?? 'DOOR_COUNTER_3D',
      }
    }).sort((a, b) => a.margin - b.margin)
  }, [hourRows, selectedRoute, assumptions])

  const isPeakAm = hour >= 6 && hour < 9
  const isPeakPm = hour >= 16 && hour < 19
  const periodName = isPeakAm ? 'Hora Pico Mañana' : isPeakPm ? 'Hora Pico Tarde' : 'Hora Valle'

  const statusLabel = isProfitable
    ? `✓ Cubre Costo (+${formatColonesShort(marginNeto)})`
    : `⚠ Déficit ${periodName} (${formatColonesShort(marginNeto)})`

  const routeLabel = selectedRoute
    ? routeNames?.get(selectedRoute) ?? selectedRoute
    : 'Toda la flota (Ruta 142 y 11 Ramales)'

  return (
    <div className={`hour-detail-card ${isProfitable ? 'card-border-good' : 'card-border-bad'}`}>
      {/* Header Row */}
      <div className="hour-detail-header">
        <div className="hour-detail-title-col">
          <div className="hour-detail-title">
            <span>⏰ Diagnóstico Horario · {hour}:00 a {hour + 1}:00 ({periodName})</span>
            <span className={`status-pill ${isProfitable ? 'pill-good' : 'pill-bad'}`}>
              {statusLabel}
            </span>
          </div>
          <span className="hour-detail-scope">
            Filtro activo: <strong>{routeLabel}</strong>
          </span>
        </div>

        <div className="hour-detail-actions">
          <button
            type="button"
            className="hour-close-btn"
            onClick={onClose}
            title="Cerrar diagnóstico de esta hora (Esc)"
          >
            ✕
          </button>
        </div>
      </div>

      {/* 3 Metric Summary Pillars */}
      <div className="hour-detail-grid">
        {/* Pillar 1: Financial Balance */}
        <div className="hour-metric-card">
          <span className="hour-metric-label">1. Balance Financiero</span>
          <span className="hour-metric-val">{formatColones(t.revenue)}</span>
          <span className="hour-metric-sub">{formatWhole(t.boardings)} abordajes tarifados</span>
          <div className="hour-cost-line">
            <span>Costo op: {formatColones(t.cost)}</span>
          </div>
          <span className={`hour-metric-diff ${isProfitable ? 'text-good' : 'text-bad'}`}>
            Margen neto: {marginNeto >= 0 ? '+' : ''}{formatColones(marginNeto)}
          </span>
        </div>

        {/* Pillar 2: Fleet & Operation */}
        <div className="hour-metric-card">
          <span className="hour-metric-label">2. Despacho & Operación</span>
          <span className="hour-metric-val">{t.buses} {t.buses === 1 ? 'unidad' : 'unidades'}</span>
          <span className="hour-metric-sub">
            Intervalo: ~{intervalMinutes} min · {formatOne(t.serviceHours)} h-bus
          </span>
          <span className="hour-metric-sub">
            Ocupación promedio: <strong>{formatPercent(t.averagePercent)}</strong>
          </span>
          <span className="hour-metric-sub">
            Consumo est.: <strong>~{estimatedDieselLiters} L diésel</strong>
          </span>
        </div>

        {/* Pillar 3: Efficiency vs Break-Even */}
        <div className="hour-metric-card">
          <span className="hour-metric-label">3. Eficiencia vs Equilibrio</span>
          <span className="hour-metric-val">{formatOne(t.ridersPerBusHour)} <small>pax/h-bus</small></span>
          <span className="hour-metric-sub">
            Meta equilibrio: <strong>{formatOne(t.breakEven)} pax/h-bus</strong>
          </span>
          <span className={`hour-metric-diff ${isProfitable ? 'text-good' : 'text-bad'}`}>
            Brecha: {paxDelta >= 0 ? '+' : ''}{formatOne(paxDelta)} pax/h-bus
          </span>
          <span className="hour-metric-sub">
            {isProfitable ? 'Genera margen operativo positivo' : 'Subvencionado por la empresa'}
          </span>
        </div>
      </div>

      {/* Breakdown: By Branch (if all routes) or By Bus (if single route filtered) */}
      {!selectedRoute && branchBreakdown.length > 0 && (
        <div className="hour-detail-breakdown">
          <div className="breakdown-header">
            <div className="breakdown-header-title">
              <span>Balance Financiero por Ramal ({hour}:00)</span>
              <small>Vea quién genera ganancia y quién aporta a la pérdida</small>
            </div>
            <div className="breakdown-filter-tabs">
              <button
                type="button"
                className={`breakdown-tab-btn ${branchFilter === 'all' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setBranchFilter('all')
                }}
              >
                Todos ({branchBreakdown.length})
              </button>
              <button
                type="button"
                className={`breakdown-tab-btn tab-btn-bad ${branchFilter === 'loss' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setBranchFilter('loss')
                }}
              >
                En Déficit ({lossCount})
              </button>
              <button
                type="button"
                className={`breakdown-tab-btn tab-btn-good ${branchFilter === 'profit' ? 'active' : ''}`}
                onClick={(e) => {
                  e.stopPropagation()
                  setBranchFilter('profit')
                }}
              >
                Rentables ({profitCount})
              </button>
            </div>
          </div>

          {/* Column Header Legend */}
          <div className="breakdown-columns-bar">
            <span className="col-lbl-branch">Ramal & Flota Asignada</span>
            <div className="col-lbl-financials">
              <span className="col-lbl-in-out">
                <span className="dot-mini dot-green" /> Ingreso / <span className="dot-mini dot-red" /> Costo
              </span>
              <span className="col-lbl-margin">Resultado Neto</span>
            </div>
          </div>

          <div className="breakdown-list">
            {visibleBranches.map((b) => (
              <div
                key={b.routeId}
                className="breakdown-item breakdown-item-interactive"
                onClick={() => onSelectRoute && onSelectRoute(b.routeId)}
                title={`Filtrar vista por ${b.name}`}
              >
                <div className="breakdown-meta">
                  <span className="breakdown-code">{b.routeId}</span>
                  <div className="breakdown-name-col">
                    <strong className="breakdown-name">{b.name}</strong>
                    <span className="breakdown-subtext">
                      {b.buses} {b.buses === 1 ? 'bus' : 'buses'} · {formatWhole(b.boardings)} pax ({formatPercent(b.pct)})
                    </span>
                  </div>
                </div>

                <div className="breakdown-fin-col">
                  <div
                    className="breakdown-fin-amounts"
                    title={`Ingreso tarifario: +₡${formatWhole(b.revenue)} | Costo operativo: -₡${formatWhole(b.cost)}`}
                  >
                    <span className="fin-tag-val fin-rev">
                      <small>Ing:</small> +{formatColonesShort(b.revenue)}
                    </span>
                    <span className="fin-sep">/</span>
                    <span className="fin-tag-val fin-cost">
                      <small>Cos:</small> -{formatColonesShort(b.cost)}
                    </span>
                  </div>

                  <span
                    className={`branch-margin-pill ${b.isProfitable ? 'margin-good' : 'margin-bad'}`}
                    title={
                      b.isProfitable
                        ? `Ganancia neta: +₡${formatWhole(b.margin)} (Rentable)`
                        : `Déficit horario: -₡${formatWhole(Math.abs(b.margin))} (Pérdida subvencionada)`
                    }
                  >
                    <small className="margin-prefix">{b.isProfitable ? 'Ganancia' : 'Pérdida'}</small>
                    <strong className="margin-amount">{b.margin >= 0 ? '+' : ''}{formatColones(b.margin)}</strong>
                  </span>
                </div>

                <div className="breakdown-bar-bg">
                  <div
                    className="breakdown-bar-fill"
                    style={{
                      width: `${Math.min(100, Math.max(3, b.pct))}%`,
                      backgroundColor: b.isProfitable ? '#16a34a' : '#dc2626',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedRoute && vehicleList.length > 0 && (
        <div className="hour-detail-breakdown">
          <div className="breakdown-header">
            <div className="breakdown-header-title">
              <span>Buses Asignados a este Ramal ({hour}:00)</span>
              <small>{vehicleList.length} unidades activas</small>
            </div>
          </div>

          {/* Column Header Legend */}
          <div className="breakdown-columns-bar">
            <span className="col-lbl-branch">Unidad de Flota</span>
            <div className="col-lbl-financials">
              <span className="col-lbl-in-out">
                <span className="dot-mini dot-green" /> Ingreso / <span className="dot-mini dot-red" /> Costo
              </span>
              <span className="col-lbl-margin">Resultado Neto</span>
            </div>
          </div>

          <div className="breakdown-list">
            {vehicleList.map((v) => (
              <div key={v.vehicleId} className="breakdown-item">
                <div className="breakdown-meta">
                  <span className="breakdown-code">🚌 {v.vehicleId}</span>
                  <div className="breakdown-name-col">
                    <strong className="breakdown-name">{v.vehicleId}</strong>
                    <span className="breakdown-subtext">
                      {v.minutesInService} min · {formatWhole(v.boardings)} pax · Sensor: {v.source}
                    </span>
                  </div>
                </div>

                <div className="breakdown-fin-col">
                  <div className="breakdown-fin-amounts">
                    <span className="fin-tag-val fin-rev">
                      <small>Ing:</small> +{formatColonesShort(v.revenue)}
                    </span>
                    <span className="fin-sep">/</span>
                    <span className="fin-tag-val fin-cost">
                      <small>Cos:</small> -{formatColonesShort(v.cost)}
                    </span>
                  </div>

                  <span className={`branch-margin-pill ${v.isProfitable ? 'margin-good' : 'margin-bad'}`}>
                    <small className="margin-prefix">{v.isProfitable ? 'Ganancia' : 'Pérdida'}</small>
                    <strong className="margin-amount">{v.margin >= 0 ? '+' : ''}{formatColones(v.margin)}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Smart Operational Recommendation */}
      <div className={`hour-recommendation-box ${isProfitable ? 'box-good' : 'box-bad'}`}>
        <span className="recommendation-icon">{isProfitable ? '⭐' : '💡'}</span>
        <div className="recommendation-text">
          <strong>
            {isProfitable
              ? `Diagnóstico Operativo: Franja Rentable (${periodName} · ${hour}:00)`
              : `Oportunidad de Ajuste Operativo (${periodName} · ${hour}:00)`}
          </strong>
          <p>
            {isProfitable
              ? `La ocupación promedio (${formatPercent(t.averagePercent)}) y demanda (${formatOne(t.ridersPerBusHour)} pax/h-bus) cubren los costos operativos. Se recomienda sostener la flota de ${t.buses} unidades para garantizar tiempos de espera competitivos y evitar fuga de pasajeros.`
              : `En esta franja la demanda se situó en ${formatOne(t.ridersPerBusHour)} pax/h-bus frente a un punto de equilibrio de ${formatOne(t.breakEven)} pax/h-bus, generando un déficit neto de ${formatColones(Math.abs(marginNeto))}. Ajustar despachos a cada ~${Math.min(20, intervalMinutes + 3)} min permitiría recortar consumo de diésel sin superar los límites de frecuencia del CTP.`}
          </p>
        </div>
      </div>
    </div>
  )
}

// One bar per hour of the day. In riders mode a bar is green when that hour's buses carried
// enough paying riders to cover their cost, red when not; the dashed line is the break-even.
export function HourlyChart({
  rows,
  assumptions,
  mode,
  period = 'all',
  selectedRoute,
  routeNames,
  onSelectRoute,
  onOpenDiagnostic,
}: HourlyChartProps) {
  const [selectedHour, setSelectedHour] = useState<number | null>(null)
  const svgWrapRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: 720, height: 140 })

  useEffect(() => {
    if (!svgWrapRef.current) return
    const el = svgWrapRef.current
    const updateSize = () => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w > 100 && h > 40) {
        setDimensions({ width: Math.round(w), height: Math.round(h) })
      }
    }
    updateSize()
    const ro = new ResizeObserver(updateSize)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedHour(null)
    }
    if (selectedHour !== null) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [selectedHour])

  const hours = [...groupBy(rows, (row) => costaRicaHour(row.usage.hour)).entries()]
    .map(([hour, hourRows]) => ({ hour, ...totals(hourRows, assumptions) }))
    .filter((hour) => hour.serviceHours > 0.01)
    .sort((a, b) => a.hour - b.hour)

  if (hours.length === 0) return <p className="empty">Todavía no hay horas en servicio hoy.</p>

  const width = dimensions.width
  const height = dimensions.height
  const pad = { top: 14, right: 12, bottom: 20, left: 32 }

  // One break-even for the whole chart, at the day's average fare, so bars and line agree.
  const dayBreakEven = totals(rows, assumptions).breakEven
  const value = (h: (typeof hours)[number]) => (mode === 'riders' ? h.ridersPerBusHour : h.averagePercent)
  const line = mode === 'riders' ? dayBreakEven : null
  const yMax = Math.max(mode === 'riders' ? 10 : 100, line ?? 0, ...hours.map(value)) * 1.12
  const first = Math.min(...hours.map((h) => h.hour))
  const last = Math.max(...hours.map((h) => h.hour))
  const slot = (width - pad.left - pad.right) / Math.max(1, last - first + 1)
  const x = (hour: number) => pad.left + (hour - first) * slot
  const y = (v: number) => pad.top + (1 - Math.min(1, Math.max(0, v / yMax))) * (height - pad.top - pad.bottom)
  const ticks = [0, Math.round(yMax / 2), Math.round(yMax / 1.12)]

  // Rows for the selected hour (respecting the route filter already applied to `rows`)
  const selectedHourRows = selectedHour !== null
    ? rows.filter((r) => costaRicaHour(r.usage.hour) === selectedHour)
    : []

  return (
    <div className="hourly-chart-interactive-container">
      <div className="hourly-chart-hint-row">
        <span className="click-hint">💡 Toque una barra para ver el desglose financiero, flota y ramales de esa hora</span>
      </div>

      <div className="hourly-chart-svg-wrap" ref={svgWrapRef}>
        <svg
          className="chart chart-fill"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={
            mode === 'riders'
              ? 'Abordajes por hora-bus en cada hora del día'
              : 'Ocupación promedio en cada hora del día'
          }
        >
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={pad.left} x2={width - pad.right} y1={y(tick)} y2={y(tick)} className="chart-grid" />
              <text x={pad.left - 4} y={y(tick) + 3} textAnchor="end" className="chart-label">{tick}</text>
            </g>
          ))}

          {hours.map((h) => {
            const v = value(h)
            const tone = mode === 'occupancy' ? 'neutral' : v >= dayBreakEven ? 'good' : 'bad'
            const isSelected = selectedHour === h.hour
            const barW = Math.min(84, Math.max(16, slot * 0.70))
            const barX = x(h.hour) + (slot - barW) / 2
            const barY = y(v)
            const barH = Math.max(2, y(0) - y(v))

            return (
              <g
                key={h.hour}
                className="chart-bar-group"
                onClick={() => {
                  if (onOpenDiagnostic) {
                    onOpenDiagnostic(h.hour)
                  } else {
                    setSelectedHour(isSelected ? null : h.hour)
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {/* Highlight background when selected */}
                {isSelected && (
                  <rect
                    x={x(h.hour)}
                    width={slot}
                    y={pad.top}
                    height={height - pad.top - pad.bottom}
                    fill="rgba(59, 130, 246, 0.08)"
                    rx={4}
                  />
                )}

                <rect
                  x={barX}
                  width={barW}
                  y={barY}
                  height={barH}
                  rx={3.5}
                  className={`chart-bar chart-bar-${tone} ${inPeriod(h.hour, period) ? '' : 'faded'} ${
                    isSelected ? 'chart-bar-selected' : ''
                  }`}
                  stroke={isSelected ? '#0f172a' : undefined}
                  strokeWidth={isSelected ? 2 : 0}
                >
                  <title>{`${h.hour}:00 · ${formatOne(v)}${
                    mode === 'riders' ? ' abordajes por hora-bus' : ' % de ocupación'
                  } (Haga clic para diagnosticar)`}</title>
                </rect>

                {/* Indicator arrow above selected bar */}
                {isSelected && (
                  <polygon
                    points={`${barX + barW / 2 - 4},${barY - 3} ${barX + barW / 2 + 4},${barY - 3} ${barX + barW / 2},${barY + 1}`}
                    fill="#0f172a"
                  />
                )}
              </g>
            )
          })}

          {line !== null && (
            <>
              <line x1={pad.left} x2={width - pad.right} y1={y(line)} y2={y(line)} className="chart-breakeven" />
              <text x={width - pad.right} y={y(line) - 4} textAnchor="end" className="chart-label chart-label-strong">
                equilibrio {formatOne(line)}
              </text>
            </>
          )}

          {hours
            .filter((h) => slot > 45 || h.hour % 2 === 0)
            .map((h) => (
              <text
                key={h.hour}
                x={x(h.hour) + slot / 2}
                y={height - 5}
                textAnchor="middle"
                className={`chart-label ${selectedHour === h.hour ? 'chart-label-bold' : ''}`}
              >
                {h.hour}h
              </text>
            ))}
        </svg>
      </div>

      {/* Modal Popup displayed when an hour is clicked */}
      {selectedHour !== null && selectedHourRows.length > 0 && (
        <div
          className="hour-modal-backdrop"
          onClick={() => setSelectedHour(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="hour-modal-window"
            onClick={(e) => e.stopPropagation()}
          >
            <HourDetailCard
              hour={selectedHour}
              hourRows={selectedHourRows}
              assumptions={assumptions}
              selectedRoute={selectedRoute}
              routeNames={routeNames}
              onSelectRoute={(routeId) => {
                if (onSelectRoute) {
                  onSelectRoute(routeId)
                  setSelectedHour(null)
                }
              }}
              onClose={() => setSelectedHour(null)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
