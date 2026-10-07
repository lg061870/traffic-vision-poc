import { useState } from 'react'
import { thresholds } from '../config/operatorSettings'
import { shortName } from '../hooks/useRoutes'
import { bunching, inService, routeOf } from '../kpis'
import type { VehicleState } from '../types/occupancy'
import { HelpButton } from './HelpButton'

interface AlertsProps {
  vehicles: VehicleState[]
  routeNames: Map<string, string>
  registry: Map<string, string | null>
  onOpenBus: (vehicleId: string) => void
}

interface AlertGroup {
  key: string
  label: string
  tone: 'bad' | 'warn' | 'neutral'
  items: { vehicleId: string; detail: string }[]
}

// Counts first; tapping a count lists its buses, and tapping a bus opens its detail.
export function Alerts({ vehicles, routeNames, registry, onOpenBus }: AlertsProps) {
  const [open, setOpen] = useState<string | null>(null)
  const running = vehicles.filter(inService)
  const percentOf = (v: VehicleState) => v.occupancy?.percent ?? 0
  const routeLabel = (v: VehicleState) => shortName(routeNames.get(routeOf(v, registry) ?? '') ?? '')

  const groups: AlertGroup[] = [
    {
      key: 'crowded',
      label: `Saturados (≥ ${thresholds.crowdedPercent} %)`,
      tone: 'bad',
      items: running.filter((v) => percentOf(v) >= thresholds.crowdedPercent).sort((a, b) => percentOf(b) - percentOf(a))
        .map((v) => ({ vehicleId: v.vehicleId, detail: `${percentOf(v)} % · ${routeLabel(v)}` })),
    },
    {
      key: 'empty',
      label: `Casi vacíos (< ${thresholds.nearlyEmptyPercent} %)`,
      tone: 'warn',
      items: running.filter((v) => percentOf(v) < thresholds.nearlyEmptyPercent).sort((a, b) => percentOf(a) - percentOf(b))
        .map((v) => ({ vehicleId: v.vehicleId, detail: `${percentOf(v)} % · ${routeLabel(v)}` })),
    },
    {
      key: 'bunched',
      label: `Agrupados (< ${thresholds.bunchingMeters} m)`,
      tone: 'warn',
      items: bunching(vehicles).map((b) => ({ vehicleId: b.first, detail: `con ${b.second} · ${Math.round(b.meters)} m` })),
    },
    {
      key: 'silent',
      label: 'Sin reporte',
      tone: 'neutral',
      items: vehicles.filter((v) => v.stale).map((v) => ({ vehicleId: v.vehicleId, detail: 'sin señal' })),
    },
  ]

  return (
    <section className="panel alerts">
      <HelpButton topic="alerts" />
      <h3>Alertas</h3>
      <div className="alert-list">
        {groups.map((group) => (
          <div key={group.key} className={`alert ${group.items.length ? `alert-${group.tone}` : ''}`}>
            <button type="button" className="alert-head" disabled={group.items.length === 0}
              onClick={() => setOpen(open === group.key ? null : group.key)} aria-expanded={open === group.key}>
              <span>{group.label}</span>
              <strong>{group.items.length}</strong>
            </button>
            {open === group.key && (
              <div className="chips">
                {group.items.map((item) => (
                  <button key={`${group.key}-${item.vehicleId}`} type="button" className="chip" onClick={() => onOpenBus(item.vehicleId)}>
                    {item.vehicleId} <span>{item.detail}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
