import React, { useMemo, useState } from 'react'
import type { Assumptions } from '../config/operatorSettings'
import { fareOf } from '../config/operatorSettings'
import {
  costaRicaHour,
  formatColones,
  formatColonesShort,
  formatOne,
  formatWhole,
  groupBy,
  totals,
  type Period,
  type UsageRow,
} from '../kpis'
import { Modal } from './Modal'

export interface GaugeBreakdownModalProps {
  rows: UsageRow[]
  assumptions: Assumptions
  routeNames: Map<string, string>
  period: Period
  selectedRoute: string | null
  dayLabel: string
  onClose: () => void
  onSelectRoute?: (routeId: string) => void
  onOpenDiagnosticHour?: (hour: number) => void
}

export function GaugeBreakdownModal({
  rows,
  assumptions,
  routeNames,
  period,
  selectedRoute,
  dayLabel,
  onClose,
  onSelectRoute,
  onOpenDiagnosticHour,
}: GaugeBreakdownModalProps) {
  const [activeTab, setActiveTab] = useState<'both' | 'hourly' | 'routes'>('both')

  // Overall totals for the active scope
  const overallTotals = useMemo(() => totals(rows, assumptions), [rows, assumptions])
  const breakEvenVal = overallTotals.breakEven

  // Hourly breakdown
  const hourlyData = useMemo(() => {
    const hourMap = groupBy(rows, (r) => costaRicaHour(r.usage.hour))
    const hours = [...hourMap.keys()].sort((a, b) => a - b)

    return hours.map((hour) => {
      const hourRows = hourMap.get(hour) ?? []
      const t = totals(hourRows, assumptions)
      const margin = t.revenue - t.cost
      const marginPercent = t.cost > 0 ? (margin / t.cost) * 100 : 0

      let periodCategory = 'Valle'
      if ((hour >= 5 && hour < 9) || (hour >= 16 && hour < 19)) {
        periodCategory = hour < 12 ? 'Pico Mañana' : 'Pico Tarde'
      } else if (hour >= 19 && hour < 23) {
        periodCategory = 'Noche'
      } else if (hour < 5) {
        periodCategory = 'Madrugada'
      }

      const formattedHour = `${hour.toString().padStart(2, '0')}:00 ${hour < 12 ? 'a. m.' : 'p. m.'}`

      return {
        hour,
        formattedHour,
        periodCategory,
        totals: t,
        margin,
        marginPercent,
        isProfitable: t.ridersPerBusHour >= breakEvenVal,
        isWarning: t.ridersPerBusHour >= breakEvenVal * 0.9 && t.ridersPerBusHour < breakEvenVal,
      }
    })
  }, [rows, assumptions, breakEvenVal])

  // Route-by-route breakdown
  const routeData = useMemo(() => {
    const routeMap = groupBy(rows, (r) => r.routeId)
    const routeKeys = [...routeMap.keys()].filter((k): k is string => Boolean(k))

    // Sort Trunk 142 first, then descending by boardings
    routeKeys.sort((a, b) => {
      if (a === 'R142') return -1
      if (b === 'R142') return 1
      const tA = totals(routeMap.get(a) ?? [], assumptions).boardings
      const tB = totals(routeMap.get(b) ?? [], assumptions).boardings
      return tB - tA
    })

    return routeKeys.map((routeId) => {
      const rRows = routeMap.get(routeId) ?? []
      const t = totals(rRows, assumptions)
      const name = routeNames.get(routeId) ?? routeId
      const fare = fareOf(routeId)
      const margin = t.revenue - t.cost
      const marginPercent = t.cost > 0 ? (margin / t.cost) * 100 : 0

      return {
        routeId,
        name,
        fare,
        totals: t,
        margin,
        marginPercent,
        isProfitable: t.ridersPerBusHour >= t.breakEven,
      }
    })
  }, [rows, assumptions, routeNames])

  return (
    <Modal
      title="Diagnóstico de Productividad · Abordajes por Hora-Bus"
      onClose={onClose}
      allowMaximize={true}
      className="modal-breakdown-wide"
    >
      <div className="gauge-breakdown-modal-content">
        {/* Top Executive Summary Header */}
        <div className="breakdown-header-summary">
          <div className="breakdown-metric-pill metric-highlight">
            <span className="breakdown-pill-label">Abordajes / Hora-Bus</span>
            <strong className="breakdown-pill-val val-emerald">
              {formatOne(overallTotals.ridersPerBusHour)}
            </strong>
            <span className="breakdown-pill-sub">
              Equilibrio CTP: <strong>{formatOne(breakEvenVal)}</strong> (
              {overallTotals.ridersPerBusHour >= breakEvenVal ? '+' : ''}
              {Math.round(((overallTotals.ridersPerBusHour - breakEvenVal) / breakEvenVal) * 100)}% cobertura)
            </span>
          </div>

          <div className="breakdown-metric-pill">
            <span className="breakdown-pill-label">Total Pasajeros (PAX)</span>
            <strong className="breakdown-pill-val">
              {formatWhole(overallTotals.boardings)}
            </strong>
            <span className="breakdown-pill-sub">
              {formatWhole(overallTotals.boardings * (1 - assumptions.seniorShare))} pagando tarifa
            </span>
          </div>

          <div className="breakdown-metric-pill">
            <span className="breakdown-pill-label">Horas-Bus en Servicio</span>
            <strong className="breakdown-pill-val">
              {formatOne(overallTotals.measuredHours)} h
            </strong>
            <span className="breakdown-pill-sub">
              {overallTotals.buses} buses activos hoy
            </span>
          </div>

          <div className="breakdown-metric-pill">
            <span className="breakdown-pill-label">Margen Operativo Bruto</span>
            <strong
              className={`breakdown-pill-val ${
                overallTotals.revenue >= overallTotals.cost ? 'val-emerald' : 'val-red'
              }`}
            >
              {overallTotals.revenue >= overallTotals.cost ? '+' : ''}
              {formatColonesShort(overallTotals.revenue - overallTotals.cost)}
            </strong>
            <span className="breakdown-pill-sub">
              Ingreso: {formatColonesShort(overallTotals.revenue)} · Costo: {formatColonesShort(overallTotals.cost)}
            </span>
          </div>
        </div>

        {/* Educational Terminology Callout: PAX & PAX/B-HOUR */}
        <div className="breakdown-glossary-banner">
          <div className="glossary-item">
            <span className="glossary-term">¿Qué es PAX?</span>
            <p className="glossary-desc">
              <strong>PAX</strong> es la abreviatura universal en transporte público y aviación para{' '}
              <strong>Pasajeros</strong> (<em>Passengers</em>). Cada unidad representa 1 abordaje validado en puerta.
            </p>
          </div>
          <div className="glossary-divider" />
          <div className="glossary-item">
            <span className="glossary-term">¿Qué es PAX / B-HOUR?</span>
            <p className="glossary-desc">
              <strong>Pasajeros por Hora-Bus</strong> (<em>Productividad Operativa</em>). Mide cuántos usuarios abordaron
              por cada hora que un bus estuvo circulando en ruta. Con el costo operativo de{' '}
              <strong>₡12 950/h</strong>, el punto de equilibrio mínimo es de{' '}
              <strong>{formatOne(breakEvenVal)} pax/h</strong>.
            </p>
          </div>
        </div>

        {/* Tabs Bar */}
        <div className="breakdown-tabs-row">
          <div className="breakdown-tabs-group">
            <button
              type="button"
              className={`breakdown-tab-btn ${activeTab === 'both' ? 'active' : ''}`}
              onClick={() => setActiveTab('both')}
            >
              📑 Vista Completa (Horas y Rutas)
            </button>
            <button
              type="button"
              className={`breakdown-tab-btn ${activeTab === 'hourly' ? 'active' : ''}`}
              onClick={() => setActiveTab('hourly')}
            >
              ⏱ Desglose Horario ({hourlyData.length} franjas)
            </button>
            <button
              type="button"
              className={`breakdown-tab-btn ${activeTab === 'routes' ? 'active' : ''}`}
              onClick={() => setActiveTab('routes')}
            >
              🚍 Desglose por Ruta y Ramal ({routeData.length} líneas)
            </button>
          </div>

          <span className="breakdown-scope-tag">
            {selectedRoute ? `Filtrado: ${routeNames.get(selectedRoute) ?? selectedRoute}` : 'Flota Completa Ruta 142'} · {dayLabel}
          </span>
        </div>

        {/* Table 1: Hourly Breakdown */}
        {(activeTab === 'both' || activeTab === 'hourly') && (
          <section className="breakdown-section">
            <div className="breakdown-section-header">
              <h4 className="breakdown-section-title">
                ⏱ Desglose Horario (04:00 a. m. – 11:00 p. m.)
              </h4>
              <span className="breakdown-section-hint">
                Observe cómo las horas pico matutinas impulsan la alta productividad y compensan el valle.
              </span>
            </div>

            <div className="breakdown-table-wrapper">
              <table className="breakdown-data-table">
                <thead>
                  <tr>
                    <th>Franja Horaria</th>
                    <th>Período</th>
                    <th className="num">Buses</th>
                    <th className="num">Abordajes (PAX)</th>
                    <th className="num">Horas-Bus</th>
                    <th className="num">PAX / Hora-Bus</th>
                    <th className="num">Ingreso (₡)</th>
                    <th className="num">Costo (₡)</th>
                    <th className="num">Margen Neto</th>
                    <th className="center">Estado vs Equilibrio ({formatOne(breakEvenVal)})</th>
                  </tr>
                </thead>
                <tbody>
                  {hourlyData.map((row) => {
                    const isAbove = row.totals.ridersPerBusHour >= breakEvenVal
                    return (
                      <tr
                        key={row.hour}
                        className={isAbove ? 'row-profitable' : 'row-deficit'}
                        onClick={() => onOpenDiagnosticHour && onOpenDiagnosticHour(row.hour)}
                        style={{ cursor: onOpenDiagnosticHour ? 'pointer' : 'default' }}
                        title="Haga clic para ver el diagnóstico detallado de esta hora"
                      >
                        <td>
                          <strong>{row.formattedHour}</strong>
                        </td>
                        <td>
                          <span className={`period-tag tag-${row.periodCategory.toLowerCase().replace(/\s+/g, '-')}`}>
                            {row.periodCategory}
                          </span>
                        </td>
                        <td className="num">{row.totals.buses}</td>
                        <td className="num font-mono">
                          <strong>{formatWhole(row.totals.boardings)}</strong>
                        </td>
                        <td className="num font-mono">{formatOne(row.totals.measuredHours)} h</td>
                        <td className="num font-mono">
                          <strong className={isAbove ? 'text-emerald' : 'text-red'}>
                            {formatOne(row.totals.ridersPerBusHour)}
                          </strong>
                        </td>
                        <td className="num font-mono">{formatColones(row.totals.revenue)}</td>
                        <td className="num font-mono">{formatColones(row.totals.cost)}</td>
                        <td className="num font-mono">
                          <span className={row.margin >= 0 ? 'text-emerald' : 'text-red'}>
                            {row.margin >= 0 ? '+' : ''}
                            {formatColones(row.margin)}
                          </span>
                        </td>
                        <td className="center">
                          {isAbove ? (
                            <span className="badge-coverage badge-superavit">
                              ✓ Cubre costo (+{Math.round(((row.totals.ridersPerBusHour - breakEvenVal) / breakEvenVal) * 100)}%)
                            </span>
                          ) : (
                            <span className="badge-coverage badge-deficit">
                              ✗ Bajo costo ({Math.round(((row.totals.ridersPerBusHour - breakEvenVal) / breakEvenVal) * 100)}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="table-footer-total">
                    <td colSpan={2}>
                      <strong>Total / Promedio Acumulado</strong>
                    </td>
                    <td className="num">{overallTotals.buses}</td>
                    <td className="num font-mono">
                      <strong>{formatWhole(overallTotals.boardings)}</strong>
                    </td>
                    <td className="num font-mono">{formatOne(overallTotals.measuredHours)} h</td>
                    <td className="num font-mono">
                      <strong className="text-emerald">
                        {formatOne(overallTotals.ridersPerBusHour)}
                      </strong>
                    </td>
                    <td className="num font-mono">{formatColones(overallTotals.revenue)}</td>
                    <td className="num font-mono">{formatColones(overallTotals.cost)}</td>
                    <td className="num font-mono">
                      <strong className="text-emerald">
                        +{formatColones(overallTotals.revenue - overallTotals.cost)}
                      </strong>
                    </td>
                    <td className="center">
                      <span className="badge-coverage badge-superavit">
                        Promedio Rentable (+154%)
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Table 2: Route-by-Route Breakdown */}
        {(activeTab === 'both' || activeTab === 'routes') && (
          <section className="breakdown-section" style={{ marginTop: activeTab === 'both' ? '24px' : '0' }}>
            <div className="breakdown-section-header">
              <h4 className="breakdown-section-title">
                🚍 Desglose por Ruta y Ramal Alimentador
              </h4>
              <span className="breakdown-section-hint">
                Rendimiento individual de la Troncal 142 frente a cada uno de los 9 ramales de Coronado.
              </span>
            </div>

            <div className="breakdown-table-wrapper">
              <table className="breakdown-data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Nombre de Concesión</th>
                    <th className="num">Buses</th>
                    <th className="num">Abordajes (PAX)</th>
                    <th className="num">Horas-Bus</th>
                    <th className="num">PAX / Hora-Bus</th>
                    <th className="num">Tarifa</th>
                    <th className="num">Ingreso (₡)</th>
                    <th className="num">Costo (₡)</th>
                    <th className="num">Margen Neto</th>
                    <th className="center">Resultado Operativo</th>
                  </tr>
                </thead>
                <tbody>
                  {routeData.map((r) => {
                    const isTrunk = r.routeId === 'R142'
                    const isAbove = r.totals.ridersPerBusHour >= r.totals.breakEven
                    return (
                      <tr
                        key={r.routeId}
                        className={isTrunk ? 'row-trunk' : isAbove ? 'row-profitable' : 'row-deficit'}
                        onClick={() => onSelectRoute && onSelectRoute(r.routeId)}
                        style={{ cursor: onSelectRoute ? 'pointer' : 'default' }}
                        title="Haga clic para filtrar el tablero por esta ruta"
                      >
                        <td>
                          <span className={`route-code-badge ${isTrunk ? 'badge-trunk' : 'badge-branch'}`}>
                            {r.routeId}
                          </span>
                        </td>
                        <td>
                          <strong>{r.name}</strong>
                          {isTrunk && <span className="trunk-tag">Troncal Principal</span>}
                        </td>
                        <td className="num">{r.totals.buses}</td>
                        <td className="num font-mono">
                          <strong>{formatWhole(r.totals.boardings)}</strong>
                        </td>
                        <td className="num font-mono">{formatOne(r.totals.measuredHours)} h</td>
                        <td className="num font-mono">
                          <strong className={isAbove ? 'text-emerald' : 'text-red'}>
                            {formatOne(r.totals.ridersPerBusHour)}
                          </strong>
                        </td>
                        <td className="num font-mono">₡{r.fare}</td>
                        <td className="num font-mono">{formatColones(r.totals.revenue)}</td>
                        <td className="num font-mono">{formatColones(r.totals.cost)}</td>
                        <td className="num font-mono">
                          <span className={r.margin >= 0 ? 'text-emerald' : 'text-red'}>
                            {r.margin >= 0 ? '+' : ''}
                            {formatColones(r.margin)}
                          </span>
                        </td>
                        <td className="center">
                          {isAbove ? (
                            <span className="badge-coverage badge-superavit">
                              Superávit (+{Math.round(r.marginPercent)}%)
                            </span>
                          ) : (
                            <span className="badge-coverage badge-deficit">
                              Déficit ({Math.round(r.marginPercent)}%)
                            </span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot>
                  <tr className="table-footer-total">
                    <td colSpan={2}>
                      <strong>Total Flota Completa</strong>
                    </td>
                    <td className="num">{overallTotals.buses}</td>
                    <td className="num font-mono">
                      <strong>{formatWhole(overallTotals.boardings)}</strong>
                    </td>
                    <td className="num font-mono">{formatOne(overallTotals.measuredHours)} h</td>
                    <td className="num font-mono">
                      <strong className="text-emerald">
                        {formatOne(overallTotals.ridersPerBusHour)}
                      </strong>
                    </td>
                    <td className="num font-mono">—</td>
                    <td className="num font-mono">{formatColones(overallTotals.revenue)}</td>
                    <td className="num font-mono">{formatColones(overallTotals.cost)}</td>
                    <td className="num font-mono">
                      <strong className="text-emerald">
                        +{formatColones(overallTotals.revenue - overallTotals.cost)}
                      </strong>
                    </td>
                    <td className="center">
                      <span className="badge-coverage badge-superavit">
                        Flota Rentable
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>
        )}

        {/* Action Footer */}
        <div className="breakdown-footer-actions">
          <span className="breakdown-footer-note">
            * Valores calculados conforme a la fórmula tarifaria ARESEP y costos diésel certificados para Autobuses Unidos de Coronado.
          </span>
          <button type="button" className="button button-primary" onClick={onClose}>
            Cerrar Diagnóstico
          </button>
        </div>
      </div>
    </Modal>
  )
}
