import React, { useEffect, useMemo, useState } from 'react'
import type { Assumptions } from '../config/operatorSettings'
import { fareOf } from '../config/operatorSettings'
import { shortName } from '../hooks/useRoutes'
import {
  costaRicaHour,
  formatColones,
  formatColonesShort,
  formatOne,
  formatPercent,
  formatWhole,
  groupBy,
  totals,
  type UsageRow,
} from '../kpis'

export interface HourDetailModalProps {
  hour: number
  routeId: string | null
  allRows: UsageRow[]
  assumptions: Assumptions
  routeNames?: Map<string, string>
  routeIds?: string[]
  onChangeRoute?: (routeId: string | null) => void
  onSelectRoute?: (routeId: string) => void
  onClose: () => void
}

export function HourDetailModal({
  hour,
  routeId,
  allRows,
  assumptions,
  routeNames,
  routeIds,
  onChangeRoute,
  onSelectRoute,
  onClose,
}: HourDetailModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const [branchFilter, setBranchFilter] = useState<'all' | 'loss' | 'profit'>('all')

  // Filter rows for this specific hour and route (or all routes if routeId is null)
  const hourRows = useMemo(() => {
    return allRows.filter((r) => {
      const h = costaRicaHour(r.usage.hour)
      if (h !== hour) return false
      if (routeId && r.routeId !== routeId) return false
      return true
    })
  }, [allRows, hour, routeId])

  // All fleet rows for this hour (used for branch breakdown and switching)
  const allFleetHourRows = useMemo(() => {
    return allRows.filter((r) => costaRicaHour(r.usage.hour) === hour)
  }, [allRows, hour])

  const t = totals(hourRows, assumptions)
  const isProfitable = t.ridersPerBusHour >= t.breakEven
  const paxDelta = t.ridersPerBusHour - t.breakEven
  const marginNeto = t.revenue - t.cost

  // Estimate fuel: serviceHours * ~17.5 km/h / 2.8 km/L
  const estimatedKm = t.serviceHours * 17.5
  const estimatedDieselLiters = Math.round(estimatedKm / 2.8)
  const intervalMinutes = Math.round(60 / Math.max(1, t.buses))

  // Branch breakdown for the hour (when viewing all routes)
  const branchBreakdown = useMemo(() => {
    if (routeId) return []
    const groups = groupBy(allFleetHourRows, (r) => r.routeId ?? 'R142')
    return [...groups.entries()]
      .map(([bRouteId, rRows]) => {
        const rTotals = totals(rRows, assumptions)
        const name = routeNames?.get(bRouteId) ?? bRouteId
        const pct = t.boardings > 0 ? (rTotals.boardings / t.boardings) * 100 : 0
        const revenue = rTotals.revenue
        const cost = rTotals.cost
        const margin = revenue - cost
        return {
          routeId: bRouteId,
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
      .sort((a, b) => a.margin - b.margin) // Deficit branches first
  }, [allFleetHourRows, assumptions, routeId, routeNames, t.boardings])

  const lossCount = useMemo(() => branchBreakdown.filter((b) => !b.isProfitable).length, [branchBreakdown])
  const profitCount = useMemo(() => branchBreakdown.filter((b) => b.isProfitable).length, [branchBreakdown])

  const visibleBranches = useMemo(() => {
    if (branchFilter === 'loss') return branchBreakdown.filter((b) => !b.isProfitable)
    if (branchFilter === 'profit') return branchBreakdown.filter((b) => b.isProfitable)
    return branchBreakdown
  }, [branchBreakdown, branchFilter])

  // Individual bus list if viewing a specific route
  const vehicleList = useMemo(() => {
    if (!routeId) return []
    const fare = fareOf(routeId)
    const payingShare = 1 - assumptions.seniorShare

    return hourRows
      .map((r) => {
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
      })
      .sort((a, b) => a.margin - b.margin)
  }, [hourRows, routeId, assumptions])

  const isPeakAm = hour >= 6 && hour < 9
  const isPeakPm = hour >= 16 && hour < 19
  const periodName = isPeakAm ? 'Hora Pico Mañana' : isPeakPm ? 'Hora Pico Tarde' : 'Hora Valle'

  const statusLabel = isProfitable
    ? `✓ Cubre Costo (+${formatColonesShort(marginNeto)})`
    : `⚠ Déficit ${periodName} (${formatColonesShort(marginNeto)})`

  const currentRouteName = routeId ? (routeNames?.get(routeId) ?? routeId) : 'Toda la flota (Ruta 142 y 11 Ramales)'

  return (
    <div className="hour-modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="hour-modal-window" onClick={(e) => e.stopPropagation()}>
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

              {/* Scope Switcher: All Fleet vs Specific Route */}
              <div className="hour-detail-scope-bar">
                <span className="scope-lbl">Ámbito:</span>
                <select
                  className="hour-route-select"
                  value={routeId ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : e.target.value
                    if (onChangeRoute) onChangeRoute(val)
                  }}
                  title="Cambiar entre Toda la Flota o un ramal específico en esta hora"
                >
                  <option value="">🌐 Toda la flota (Ruta 142 y todos los ramales)</option>
                  {(routeIds ?? []).map((rId) => (
                    <option key={rId} value={rId}>
                      🚌 {routeNames?.get(rId) ?? rId}
                    </option>
                  ))}
                </select>

                {routeId ? (
                  <button
                    type="button"
                    className="scope-toggle-btn"
                    onClick={() => onChangeRoute && onChangeRoute(null)}
                    title="Ver balance consolidado de toda la flota en esta hora"
                  >
                    🌐 Ver Toda la Flota
                  </button>
                ) : (
                  <span className="scope-hint-text">
                    Haga clic en un ramal abajo para inspeccionar sus buses
                  </span>
                )}
              </div>
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
                {isProfitable ? 'Operativo positivo' : 'Subvencionado por la empresa'}
              </span>
            </div>
          </div>

          {/* Breakdown: By Branch (if all routes) or By Bus (if single route filtered) */}
          {!routeId && branchBreakdown.length > 0 && (
            <div className="hour-detail-breakdown">
              <div className="breakdown-header">
                <div className="breakdown-header-title">
                  <span>Balance Financiero por Ramal ({hour}:00)</span>
                  <small>Haga clic en un ramal para inspeccionar sus buses individuales</small>
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
                <span className="col-lbl-branch">Ramal & Flota Asignada (Haga clic para ver buses)</span>
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
                    onClick={() => {
                      if (onChangeRoute) {
                        onChangeRoute(b.routeId)
                      }
                    }}
                    title={`Haga clic para ver el detalle de los buses en ${b.name}`}
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
                            ? `Ganancia neta: +₡${formatWhole(b.margin)}`
                            : `Déficit aportado: -₡${formatWhole(Math.abs(b.margin))}`
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

          {routeId && (
            <div className="hour-detail-breakdown">
              <div className="breakdown-header">
                <div className="breakdown-header-title">
                  <span>Buses Asignados a {currentRouteName} ({hour}:00)</span>
                  <small>{vehicleList.length} unidades activas en este ramal</small>
                </div>
                {onSelectRoute && (
                  <button
                    type="button"
                    className="breakdown-tab-btn"
                    onClick={() => onSelectRoute(routeId)}
                    title={`Filtrar todo el tablero por ${currentRouteName}`}
                  >
                    🎯 Filtrar Tablero Principal
                  </button>
                )}
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
                {vehicleList.length > 0 ? (
                  vehicleList.map((v) => (
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
                  ))
                ) : (
                  <div className="breakdown-empty-state">
                    <span className="empty-icon">🚌</span>
                    <strong className="empty-title">Sin flota despachada en esta franja</strong>
                    <span className="empty-sub">
                      No hay unidades programadas en {currentRouteName} para las {hour}:00 hrs.
                    </span>
                  </div>
                )}
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
      </div>
    </div>
  )
}
