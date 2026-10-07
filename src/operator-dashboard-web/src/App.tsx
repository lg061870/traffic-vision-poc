import { useCallback, useMemo, useState } from 'react'
import { cameraDemo, fareSource } from './config/operatorSettings'
import { AssumptionsPanel } from './components/AssumptionsPanel'
import { BusPanel } from './components/BusPanel'
import { ExplainPanel } from './components/ExplainPanel'
import { AssumptionsContext } from './components/HelpButton'
import { LiveView } from './components/LiveView'
import { Modal } from './components/Modal'
import { ProfitView } from './components/ProfitView'
import { RouteRail } from './components/RouteRail'
import { useAssumptions } from './hooks/useAssumptions'
import { hrefOf, useHashRoute, type Tab } from './hooks/useHashRoute'
import { useNow, usePolling } from './hooks/usePolling'
import { useRoutes } from './hooks/useRoutes'
import { periodLabels, routeOf, rowsInPeriod, serviceDay, usageRows } from './kpis'
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
  const vehiclesFeed = usePolling((signal) => getVehicles(signal), 5000)
  const day = serviceDay(now)
  const hourlyFeed = usePolling((signal) => getFleetHourly(day.range, signal), 60000, day.label)
  const { geojson, names } = useRoutes()
  const { assumptions, setAssumptions, reset, isDefault } = useAssumptions()
  const [showAssumptions, setShowAssumptions] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)

  const vehicles = vehiclesFeed.data?.vehicles ?? []
  const rows = useMemo(() => usageRows(hourlyFeed.data), [hourlyFeed.data])
  // Raw device data does not say which route a bus runs; the API reports each bus's registered route.
  const registry = useMemo(
    () => new Map((hourlyFeed.data?.buses ?? []).map((bus) => [bus.vehicleId, bus.routeId])),
    [hourlyFeed.data],
  )
  const routeIds = useMemo(() => [...names.keys()].sort(byRouteOrder), [names])
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

  return (
    <AssumptionsContext.Provider value={assumptions}>
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Panel del operador</h1>
          <p className="subtitle">{operatorName} · Ruta 142 y ramales</p>
        </div>
        <nav className="tabs" aria-label="Pestañas">
          {([['profit', `Rentabilidad de ${day.label}`], ['live', 'En vivo']] as [Tab, string][]).map(([tab, label]) => (
            <a key={tab} href={hrefOf({ ...state, tab, vehicleId: null })} className={state.tab === tab ? 'active' : ''}>{label}</a>
          ))}
        </nav>
        <div className="topbar-right">
          <span className="pill-warning"
            title={`Los buses, la ocupación y los abordajes son simulados, salvo el bus ${cameraDemo.vehicleId}, cuyo conteo sale del modelo de visión. Las cifras en colones usan tarifas oficiales y un costo estimado.`}>
            Datos simulados · {cameraDemo.vehicleId} con cámara IA
          </span>
          {state.tab === 'profit' && (
            <button type="button" className="button button-primary" onClick={() => setShowExplanation(true)}>
              Explicar resultado
            </button>
          )}
          <button type="button" className="button" onClick={() => setShowAssumptions(true)}>
            Supuestos{isDefault ? '' : ' •'}
          </button>
          <span className={`feed ${error ? 'feed-error' : ''}`} title={error ?? undefined}>
            {error ? 'Sin conexión con la API' : vehiclesFeed.updatedAt ? 'En vivo' : 'Conectando…'}
          </span>
        </div>
      </header>

      <div className="workspace">
        <RouteRail tab={state.tab} routeIds={routeIds} routeNames={names} rows={rowsInPeriod(rows, state.period)} vehicles={vehicles}
          registry={registry} assumptions={assumptions} selectedRoute={state.routeId} period={state.period}
          onSelectRoute={selectRoute} onSelectPeriod={(period) => navigate({ period })} />

        <main className="content">
          {state.tab === 'profit' ? (
            <ProfitView rows={rows} dayLabel={day.label} routeIds={routeIds} routeNames={names} assumptions={assumptions}
              selectedRoute={state.routeId} period={state.period} onSelectRoute={toggleRoute} />
          ) : (
            <LiveView vehicles={routeVehicles} allVehicles={vehicles} routes={geojson} routeNames={names} registry={registry}
              selectedRoute={state.routeId} openBusId={state.vehicleId} onOpenBus={openBus} />
          )}
        </main>
      </div>

      <footer className="footer">
        {fareSource} · Costo por hora-bus {isDefault ? 'estimado, por confirmar con el operador' : 'ingresado en este navegador'} · Mapa ©
        colaboradores de OpenStreetMap
      </footer>

      {state.vehicleId && (
        <BusPanel vehicleId={state.vehicleId} vehicle={openVehicle} routeId={openRoute}
          routeName={openRoute ? names.get(openRoute) ?? null : null} rows={rows} routes={geojson} assumptions={assumptions}
          now={now} onClose={closeBus} />
      )}

      {showExplanation && state.tab === 'profit' && (
        <Modal title="El resultado en palabras" onClose={() => setShowExplanation(false)}>
          <ExplainPanel
            scope={`${state.routeId ? names.get(state.routeId) ?? state.routeId : 'Toda la flota'} · ${periodLabels[state.period].toLowerCase()} · ${day.label}`}
            paragraphs={buildNarrative({
              rows: state.routeId ? rows.filter((row) => row.routeId === state.routeId) : rows,
              routeName: state.routeId ? names.get(state.routeId) ?? state.routeId : null,
              period: state.period,
              dayLabel: day.label,
              assumptions,
            })}
          />
        </Modal>
      )}

      {showAssumptions && (
        <Modal title="Supuestos de cálculo" onClose={() => setShowAssumptions(false)}>
          <AssumptionsPanel assumptions={assumptions} onChange={setAssumptions} onReset={reset} isDefault={isDefault} />
        </Modal>
      )}
    </div>
    </AssumptionsContext.Provider>
  )
}
