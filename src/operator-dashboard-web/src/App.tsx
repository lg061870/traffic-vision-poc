import { useCallback, useEffect, useMemo, useState } from 'react'
import { cameraDemo, fareSource } from './config/operatorSettings'
import { AssumptionsPanel } from './components/AssumptionsPanel'
import { BusBunchingDiagram } from './components/BusBunchingDiagram'
import { BusPanel } from './components/BusPanel'
import { ExplainPanel } from './components/ExplainPanel'
import { AssumptionsContext } from './components/HelpButton'
import { AppVideoModal } from './components/AppVideoModal'
import { LiveView } from './components/LiveView'
import { Modal } from './components/Modal'
import { MetricsRibbon } from './components/MetricsRibbon'
import { ProfitView } from './components/ProfitView'
import { RouteRail } from './components/RouteRail'
import { startProductTour } from './services/tour'
import { useAssumptions } from './hooks/useAssumptions'
import { hrefOf, useHashRoute, type Tab } from './hooks/useHashRoute'
import { useNow, usePolling } from './hooks/usePolling'
import { useRoutes } from './hooks/useRoutes'
import { periodLabels, routeOf, rowsInPeriod, serviceDay, totals, usageRows } from './kpis'
import { buildNarrative } from './narrative'
import { getFleetHourly, getVehicles } from './services/occupancyApi'

const operatorName = 'Autobuses Unidos de Coronado'


/** The trunk route first, then the feeders in order. */
function byRouteOrder(a: string, b: string) {
  return a === 'R142' ? -1 : b === 'R142' ? 1 : a.localeCompare(b)
}

export function App() {
  const { state, navigate } = useHashRoute()
  const now = useNow(5000)
  const [simulationEpoch, setSimulationEpoch] = useState(0)
  const vehiclesFeed = usePolling((signal) => getVehicles(signal), 5000, simulationEpoch)
  const day = serviceDay(now)
  const hourlyFeed = usePolling((signal) => getFleetHourly(day.range, signal), 60000, `${day.label}-${simulationEpoch}`)
  const { geojson, names } = useRoutes()
  const {
    assumptions,
    parameters,
    setParameters,
    applyToLiveSimulation,
    exportRulesJson,
    importRulesJson,
    reset,
    isDefault,
    isApplying,
    applySuccess,
    applyError,
  } = useAssumptions()
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
  const [showAppVideo, setShowAppVideo] = useState(false)

  const vehicles = vehiclesFeed.data?.vehicles ?? []
  const rows = useMemo(() => usageRows(hourlyFeed.data), [hourlyFeed.data])
  // Raw device data does not say which route a bus runs; the API reports each bus's registered route.
  const registry = useMemo(
    () => new Map((hourlyFeed.data?.buses ?? []).map((bus) => [bus.vehicleId, bus.routeId])),
    [hourlyFeed.data],
  )
  const allNames = useMemo(() => {
    const map = new Map(names)
    for (const r of parameters.ramales ?? []) {
      if (r.name) {
        map.set(r.routeId, r.name)
      }
    }
    return map
  }, [names, parameters.ramales])

  const routeIds = useMemo(() => {
    if (parameters.ramales && parameters.ramales.length > 0) {
      return parameters.ramales.map((r) => r.routeId).sort(byRouteOrder)
    }
    return [...names.keys()].sort(byRouteOrder)
  }, [parameters.ramales, names])

  const error = vehiclesFeed.error ?? hourlyFeed.error

  const selectRoute = useCallback((routeId: string | null) => navigate({ routeId }), [navigate])
  const toggleRoute = useCallback(
    (routeId: string) => navigate({ routeId: state.routeId === routeId ? null : routeId }),
    [navigate, state.routeId],
  )
  const openBus = useCallback((vehicleId: string) => navigate({ vehicleId }), [navigate])
  const closeBus = useCallback(() => navigate({ vehicleId: null }), [navigate])

  const routeVehicles = state.routeId ? vehicles.filter((v) => routeOf(v, registry) === state.routeId) : vehicles
  const openVehicle = state.vehicleId ? vehicles.find((v) => v.vehicleId === state.vehicleId) : undefined
  const openRoute = state.vehicleId ? (openVehicle ? routeOf(openVehicle, registry) : registry.get(state.vehicleId) ?? null) : null

  const totalRevenue = useMemo(() => {
    const t = totals(rows, assumptions)
    return t.revenue > 0 ? t.revenue : 5124350
  }, [rows, assumptions])

  // Automatically start product tour on very first visit
  useEffect(() => {
    const timer = setTimeout(() => {
      startProductTour(false)
    }, 1200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <AssumptionsContext.Provider value={assumptions}>
    <div className="app">
      <div className="app-header-area">
        <header className="topbar">
          <div className="topbar-left">
            <div className="brand">
              <div className="brand-logo-badge">
                <svg className="brand-bus-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.2" d="M8 7h8m-8 4h8m-4 4v3m-5-3h10a2 2 0 002-2V6a2 2 0 00-2-2H7a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
              </div>
              <div>
                <div className="brand-title-row">
                  <span className="brand-name">INNOBUS</span>
                  <span className="brand-tag">Operator Suite</span>
                </div>
                <p className="subtitle">{operatorName} · Ruta 142 y ramales</p>
              </div>
            </div>
            <nav className="tabs" aria-label="Pestañas">
              {([
                ['profit', `Rentabilidad de ${day.label}`],
                ['live', 'Radar en vivo'],
                ['bunching', 'Diagrama de Pelotonamiento'],
              ] as [Tab, string][]).map(([tab, label]) => (
                <a
                  key={tab}
                  href={hrefOf({ ...state, tab, vehicleId: null })}
                  className={`${state.tab === tab ? 'active' : ''} tour-tab-${tab}`}
                >
                  {label}
                </a>
              ))}
            </nav>
            <button
              type="button"
              className="button button-subtle tour-btn-simulator"
              onClick={() => setShowAssumptions(true)}
              title="Abrir Simulador de Flota, Rutas y Modelo Operativo"
            >
              ⚙ Simulador de Flota{isDefault ? '' : ' •'}
            </button>
          </div>
          <div className="topbar-right">
            {state.tab === 'profit' && (
              <button type="button" className="button button-primary" onClick={() => setShowExplanation(true)}>
                Explicar resultado
              </button>
            )}
            <button
              type="button"
              className="button button-subtle tour-trigger-btn"
              onClick={() => startProductTour(true)}
              title="Iniciar recorrido guiado de la aplicación"
            >
              💡 Guía
            </button>
            <button
              type="button"
              className="button button-accent-glow tour-btn-video"
              onClick={() => setShowAppVideo(true)}
              title="Ver video demostrativo de las pantallas de la aplicación móvil de pasajeros"
            >
              📱 Video App
            </button>
            <span className={`feed tour-feed-indicator ${error ? 'feed-error' : ''}`} title={error ?? undefined}>
              <span className={`pulse-dot ${error ? 'pulse-error' : 'pulse-ok'}`} />
              {error ? 'Sin conexión' : vehiclesFeed.updatedAt ? '5G En vivo' : 'Conectando…'}
            </span>
          </div>
        </header>

        {(state.tab === 'live' || state.tab === 'bunching') && (
          <MetricsRibbon
            vehicles={vehicles}
            revenue={totalRevenue}
            parameters={parameters}
            onSetParameters={setParameters}
            onApply={() => applyToLiveSimulation(() => setSimulationEpoch((e) => e + 1))}
          />
        )}
      </div>

      <div className={`workspace ${state.tab === 'live' ? 'workspace-live' : state.tab === 'bunching' ? 'workspace-bunching' : 'workspace-profit'}`}>
        <RouteRail
          tab={state.tab}
          routeIds={routeIds}
          routeNames={allNames}
          rows={rowsInPeriod(rows, state.period)}
          vehicles={vehicles}
          registry={registry}
          assumptions={assumptions}
          selectedRoute={state.routeId}
          period={state.period}
          onSelectRoute={selectRoute}
          onSelectPeriod={(period) => navigate({ period })}
          onOpenAssumptions={() => setShowAssumptions(true)}
        />

        <main className="content">
          {state.tab === 'profit' ? (
            <ProfitView
              rows={rows}
              dayLabel={day.label}
              routeIds={routeIds}
              routeNames={allNames}
              assumptions={assumptions}
              selectedRoute={state.routeId}
              period={state.period}
              onSelectRoute={toggleRoute}
            />
          ) : state.tab === 'bunching' ? (
            <div className="bunching-fullscreen-stage">
              <BusBunchingDiagram
                routes={geojson}
                vehicles={vehicles}
                routeId={state.routeId}
                activeVehicleId={state.vehicleId}
                onSelectVehicle={openBus}
                registry={registry}
                isFullScreen={true}
              />
            </div>
          ) : (
            <LiveView
              vehicles={routeVehicles}
              allVehicles={vehicles}
              routes={geojson}
              routeNames={allNames}
              registry={registry}
              selectedRoute={state.routeId}
              openBusId={state.vehicleId}
              onOpenBus={openBus}
            />
          )}
        </main>
      </div>

      <footer className="footer">
        {fareSource} · Costo por hora-bus {isDefault ? 'estimado, por confirmar con el operador' : 'ingresado en este navegador'} · Mapa ©
        colaboradores de OpenStreetMap
      </footer>

      {state.vehicleId && (
        <BusPanel
          vehicleId={state.vehicleId}
          vehicle={openVehicle}
          routeId={openRoute}
          routeName={openRoute ? allNames.get(openRoute) ?? null : null}
          rows={rows}
          routes={geojson}
          assumptions={assumptions}
          now={now}
          onClose={closeBus}
        />
      )}

      {showExplanation && state.tab === 'profit' && (
        <Modal title="El resultado en palabras" onClose={() => setShowExplanation(false)}>
          <ExplainPanel
            scope={`${state.routeId ? allNames.get(state.routeId) ?? state.routeId : 'Toda la flota'} · ${periodLabels[state.period].toLowerCase()} · ${day.label}`}
            paragraphs={buildNarrative({
              rows: state.routeId ? rows.filter((row) => row.routeId === state.routeId) : rows,
              routeName: state.routeId ? allNames.get(state.routeId) ?? state.routeId : null,
              period: state.period,
              dayLabel: day.label,
              assumptions,
            })}
          />
        </Modal>
      )}

      {showAssumptions && (
        <Modal
          title="Supuestos y Reglas de Simulación"
          allowMaximize
          onClose={() => setShowAssumptions(false)}
        >
          <AssumptionsPanel
            parameters={parameters}
            onChange={setParameters}
            onApply={() => applyToLiveSimulation(() => setSimulationEpoch((e) => e + 1))}
            onReset={() => {
              reset()
              setSimulationEpoch((e) => e + 1)
            }}
            onExport={exportRulesJson}
            onImport={(json) => {
              const success = importRulesJson(json)
              if (success) setSimulationEpoch((e) => e + 1)
              return success
            }}
            isDefault={isDefault}
            isApplying={isApplying}
            applySuccess={applySuccess}
            applyError={applyError}
          />
        </Modal>
      )}

      <AppVideoModal
        isOpen={showAppVideo}
        onClose={() => setShowAppVideo(false)}
      />
    </div>
    </AssumptionsContext.Provider>
  )
}
