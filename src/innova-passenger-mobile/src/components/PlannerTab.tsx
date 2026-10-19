import React, { useState, useEffect } from 'react'
import {
  TripPlan,
  TripOption,
  GeoPoint,
  PassengerFareType,
  PlaceCatalogItem,
} from '../types'
import {
  fetchTripPlan,
  searchPlaces,
  calculateTotalFare,
  formatCRTime,
} from '../api/client'
import { TripMap } from './TripMap'

interface PlannerTabProps {
  isOffline?: boolean
  onNotifyAlert?: (msg: string) => void
}

export const PlannerTab: React.FC<PlannerTabProps> = ({ isOffline = false }) => {
  // Navigation states
  const [origin, setOrigin] = useState<PlaceCatalogItem>({
    id: 'p-morazan',
    name: 'Parque Morazán, San José',
    aliases: [],
    lat: 9.9352,
    lon: -84.0754,
    category: 'HITO',
  })
  const [destination, setDestination] = useState<PlaceCatalogItem>({
    id: 'term-coronado',
    name: 'Terminal Central de Coronado',
    aliases: [],
    lat: 9.9761,
    lon: -84.0073,
    category: 'PARADA',
  })

  const [queryDest, setQueryDest] = useState('Terminal Central de Coronado')
  const [suggestions, setSuggestions] = useState<PlaceCatalogItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  // Fare profile
  const [fareType, setFareType] = useState<PassengerFareType>('ADULT')

  // Trip planning results
  const [plan, setPlan] = useState<TripPlan | null>(null)
  const [loading, setLoading] = useState(false)
  const [selectedOptionIndex, setSelectedOptionIndex] = useState(0)

  // Guided navigation mode: null | 'WALKING' | 'ONBOARD' | 'ARRIVED'
  const [guidedMode, setGuidedMode] = useState<'WALKING' | 'ONBOARD' | 'ARRIVED' | null>(null)
  const [stopsRemaining, setStopsRemaining] = useState(4)
  const [alarmActive, setAlarmActive] = useState(false)

  // Initial load
  useEffect(() => {
    handlePlanTrip(origin, destination, isOffline)
  }, [fareType, isOffline])

  const handlePlanTrip = async (
    fromPlace: PlaceCatalogItem,
    toPlace: PlaceCatalogItem,
    forceOff = isOffline
  ) => {
    setLoading(true)
    try {
      const res = await fetchTripPlan(
        { lat: fromPlace.lat, lon: fromPlace.lon },
        { lat: toPlace.lat, lon: toPlace.lon },
        forceOff
      )
      setPlan(res.plan)
      setSelectedOptionIndex(0)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectSuggestion = (place: PlaceCatalogItem) => {
    setDestination(place)
    setQueryDest(place.name)
    setShowSuggestions(false)
    handlePlanTrip(origin, place)
  }

  const handleSwap = () => {
    const temp = origin
    setOrigin(destination)
    setDestination(temp)
    setQueryDest(temp.name)
    handlePlanTrip(destination, temp)
  }

  const selectedOption: TripOption | null =
    plan?.options && plan.options.length > 0 ? plan.options[selectedOptionIndex] : null

  const busRide = selectedOption?.legs.find(l => l.bus)?.bus

  return (
    <div style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* 1. GUIDED RUNNING MODE (OVERLAY VIEW) */}
      {guidedMode && (
        <div
          className="card"
          style={{
            background: 'linear-gradient(180deg, #161c26 0%, #0e131a 100%)',
            borderColor: '#2f81f7',
            borderWidth: 2,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span className="badge badge-low">
              {guidedMode === 'WALKING' ? '🚶 Camino a la parada' : guidedMode === 'ONBOARD' ? '🚌 A bordo en ruta' : '🏁 Has llegado'}
            </span>
            <button
              onClick={() => setGuidedMode(null)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8b949e',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Salir de guía ✕
            </button>
          </div>

          {guidedMode === 'WALKING' && (
            <div>
              <h3 style={{ fontSize: '16px', marginBottom: 6 }}>Camine hacia {busRide?.routeName || 'Parada 18'}</h3>
              <p style={{ fontSize: '13px', color: '#8b949e', marginBottom: 12 }}>
                Distancia a pie: <strong>240 metros</strong> · ~3 minutos restantes
              </p>

              <div
                style={{
                  background: '#21262d',
                  borderRadius: 12,
                  padding: 12,
                  marginBottom: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>El bus llega en:</div>
                  <div style={{ fontSize: '18px', fontWeight: 800, color: '#3fb950' }}>⏱️ ~5 minutos</div>
                  <div style={{ fontSize: '11px', color: '#3fb950' }}>Margen holgado (+2 min)</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#8b949e' }}>Unidad:</div>
                  <div style={{ fontSize: '14px', fontWeight: 700 }}>{busRide?.vehicleId || 'SJB-2267'}</div>
                  <span className="badge badge-low">Baja ocupación</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-primary"
                  onClick={() => setGuidedMode('ONBOARD')}
                >
                  ✅ Ya subí al bus
                </button>
                <button
                  className="btn-secondary"
                  onClick={() => alert('Cambiado a la siguiente unidad (SJB-10356, llega en 11 min)')}
                  title="Si el bus viene muy lleno, podés tomar el que viene atrás"
                >
                  Tomar siguiente
                </button>
              </div>
            </div>
          )}

          {guidedMode === 'ONBOARD' && (
            <div>
              <h3 style={{ fontSize: '16px', marginBottom: 4 }}>Unidad {busRide?.vehicleId || 'SJB-2267'}</h3>
              <p style={{ fontSize: '12px', color: '#8b949e', marginBottom: 12 }}>
                Destino: {destination.name}
              </p>

              <div style={{ background: '#21262d', borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '12px', color: '#8b949e' }}>Próxima parada:</span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0f6fc' }}>Super La Violeta</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: '12px', color: '#8b949e' }}>Paradas restantes para bajar:</span>
                  <span style={{ fontSize: '15px', fontWeight: 800, color: '#2f81f7' }}>{stopsRemaining} paradas</span>
                </div>

                {/* Progress dot bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '10px 0' }}>
                  {[1, 2, 3, 4].map(idx => (
                    <div
                      key={idx}
                      style={{
                        flex: 1,
                        height: 6,
                        borderRadius: 3,
                        background: idx <= (4 - stopsRemaining + 1) ? '#2f81f7' : '#30363d',
                      }}
                    />
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#8b949e' }}>
                  <span>Velocidad: 32 km/h</span>
                  <span>Aforo: 38/90 pax (42%)</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn-secondary"
                  style={{
                    borderColor: alarmActive ? '#3fb950' : '#30363d',
                    color: alarmActive ? '#3fb950' : '#f0f6fc',
                  }}
                  onClick={() => setAlarmActive(!alarmActive)}
                >
                  {alarmActive ? '🔔 Alarma de bajada activada' : '🔕 Activar aviso al llegar'}
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (stopsRemaining > 1) {
                      setStopsRemaining(stopsRemaining - 1)
                    } else {
                      setGuidedMode('ARRIVED')
                    }
                  }}
                >
                  {stopsRemaining > 1 ? 'Avanzar parada' : '🏁 Llegar al destino'}
                </button>
              </div>
            </div>
          )}

          {guidedMode === 'ARRIVED' && (
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '36px', marginBottom: 8 }}>🎉</div>
              <h3 style={{ fontSize: '18px', marginBottom: 6 }}>¡Has llegado a tu destino!</h3>
              <p style={{ fontSize: '13px', color: '#8b949e', marginBottom: 14 }}>
                Viaje completado exitosamente con INNOVA.
              </p>
              <button
                className="btn-primary"
                onClick={() => setGuidedMode(null)}
              >
                Finalizar viaje
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. SEARCH ORIGIN ↔ DESTINATION */}
      <div className="card" style={{ marginBottom: 0 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* Origen */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '14px', width: 20 }}>🟢</span>
            <input
              type="text"
              readOnly
              value={origin.name}
              style={{
                flex: 1,
                background: '#21262d',
                border: '1px solid #30363d',
                borderRadius: 8,
                padding: '8px 10px',
                color: '#f0f6fc',
                fontSize: '13px',
              }}
            />
          </div>

          {/* Swap icon */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingRight: 8 }}>
            <button
              onClick={handleSwap}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#2f81f7',
                fontSize: '14px',
                cursor: 'pointer',
                padding: '2px 8px',
                fontWeight: 700,
              }}
              title="Invertir origen y destino"
            >
              ⇅ Invertir
            </button>
          </div>

          {/* Destino */}
          <div style={{ position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '14px', width: 20 }}>🔴</span>
              <input
                type="text"
                value={queryDest}
                placeholder="Escribí tu destino o parada..."
                onChange={e => {
                  setQueryDest(e.target.value)
                  setSuggestions(searchPlaces(e.target.value))
                  setShowSuggestions(true)
                }}
                onFocus={() => {
                  setSuggestions(searchPlaces(queryDest))
                  setShowSuggestions(true)
                }}
                style={{
                  flex: 1,
                  background: '#21262d',
                  border: '1px solid #30363d',
                  borderRadius: 8,
                  padding: '8px 10px',
                  color: '#f0f6fc',
                  fontSize: '13px',
                }}
              />
            </div>

            {/* Suggestions list dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 28,
                  right: 0,
                  background: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: 10,
                  boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
                  zIndex: 2000,
                  maxHeight: 210,
                  overflowY: 'auto',
                  marginTop: 4,
                }}
              >
                {suggestions.map(s => (
                  <div
                    key={s.id}
                    onClick={() => handleSelectSuggestion(s)}
                    style={{
                      padding: '10px 12px',
                      borderBottom: '1px solid #21262d',
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: '10px', color: '#8b949e' }}>
                        {s.category === 'PARADA' ? '🚏 Parada oficial' : '🏛️ Hito popular'}
                      </div>
                    </div>
                    <span style={{ fontSize: '11px', color: '#2f81f7' }}>Elegir</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Landmarks Chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginTop: 12, paddingBottom: 4 }}>
          {searchPlaces('')
            .slice(0, 5)
            .map(item => (
              <button
                key={item.id}
                onClick={() => handleSelectSuggestion(item)}
                style={{
                  whiteSpace: 'nowrap',
                  background: '#21262d',
                  border: '1px solid #30363d',
                  borderRadius: 16,
                  color: '#c9d1d9',
                  fontSize: '11px',
                  padding: '5px 10px',
                  cursor: 'pointer',
                }}
              >
                {item.name.split(',')[0]}
              </button>
            ))}
        </div>

        {/* Fare Profile Selector */}
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid #21262d' }}>
          <div style={{ fontSize: '11px', color: '#8b949e', marginBottom: 6, fontWeight: 600 }}>
            PERFIL DE PASAJERO (DESCUENTO DE TARIFA):
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {(
              [
                { id: 'ADULT', label: 'Adulto (100%)' },
                { id: 'STUDENT', label: 'Estudiante (Reducida)' },
                { id: 'SENIOR', label: 'Adulto Mayor (₡0)' },
              ] as const
            ).map(f => (
              <button
                key={f.id}
                onClick={() => setFareType(f.id)}
                style={{
                  flex: 1,
                  background: fareType === f.id ? 'rgba(47, 129, 247, 0.2)' : '#21262d',
                  borderColor: fareType === f.id ? '#2f81f7' : '#30363d',
                  borderWidth: 1,
                  borderStyle: 'solid',
                  borderRadius: 8,
                  color: fareType === f.id ? '#58a6ff' : '#8b949e',
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '6px 4px',
                  cursor: 'pointer',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. INTERACTIVE MAP */}
      <TripMap
        selectedOption={selectedOption}
        userLocation={{ lat: origin.lat, lon: origin.lon }}
        busPosition={busRide?.vehicle.location}
        busPlate={busRide?.vehicleId}
      />

      {/* 4. TRIP OPTIONS CARDS */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0f6fc' }}>
            Opciones de Viaje {loading && '⏱️ Calculando...'}
          </span>
          <span style={{ fontSize: '11px', color: '#8b949e' }}>
            {plan?.options.length || 0} encontradas
          </span>
        </div>

        {plan?.options.map((opt, idx) => {
          const fare = calculateTotalFare(opt.legs, fareType)
          const primaryBus = opt.legs.find(l => l.bus)?.bus
          const isSelected = selectedOptionIndex === idx
          const isHighOccupancy = primaryBus?.vehicle.status === 'CRUSHED_STANDING_ROOM_ONLY' || (primaryBus?.vehicle.percent ?? 0) > 75

          return (
            <div
              key={idx}
              className="card"
              onClick={() => setSelectedOptionIndex(idx)}
              style={{
                cursor: 'pointer',
                borderColor: isSelected ? '#2f81f7' : '#30363d',
                background: isSelected ? '#161c24' : '#161b22',
              }}
            >
              {/* Option header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#f0f6fc' }}>
                    {Math.round(opt.durationMinutes)} min · Llega {formatCRTime(opt.arriveAt)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#8b949e' }}>
                    {opt.transfers > 0 ? `🔄 ${opt.transfers} Transbordo` : '⚡ Directo sin transbordos'}
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: '#3fb950' }}>
                    {fare === 0 ? 'GRATIS' : `₡${fare}`}
                  </div>
                  <div style={{ fontSize: '10px', color: '#8b949e' }}>Pasaje estimado</div>
                </div>
              </div>

              {/* Legs sequence */}
              <div style={{ fontSize: '12px', color: '#c9d1d9', display: 'flex', flexDirection: 'column', gap: 6, margin: '10px 0' }}>
                {opt.legs.map((leg, legIdx) => (
                  <div key={legIdx} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {leg.type === 'WALK' ? (
                      <>
                        <span>🚶</span>
                        <span>
                          Camine {leg.meters} m ({Math.round(leg.minutes)} min) hasta {leg.to.name}
                        </span>
                      </>
                    ) : (
                      <>
                        <span>🚌</span>
                        <div style={{ flex: 1 }}>
                          <span>
                            <strong>{leg.bus?.routeName}</strong> ({leg.bus?.vehicleId}) · Pasa {formatCRTime(leg.departAt)}
                          </span>
                          <div style={{ marginTop: 2 }}>
                            <span className={`badge ${isHighOccupancy ? 'badge-high' : 'badge-low'}`}>
                              {isHighOccupancy ? 'Alta ocupación' : 'Baja ocupación'} (
                              {leg.bus?.vehicle.passengerCount}/{leg.bus?.vehicle.capacity} pax)
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>

              {/* Later buses tip */}
              {primaryBus && primaryBus.laterBuses && primaryBus.laterBuses.length > 0 && isHighOccupancy && (
                <div
                  style={{
                    background: 'rgba(210, 153, 34, 0.15)',
                    border: '1px solid rgba(210, 153, 34, 0.3)',
                    borderRadius: 8,
                    padding: '8px 10px',
                    fontSize: '11px',
                    color: '#e3b341',
                    marginTop: 8,
                  }}
                >
                  💡 <strong>Tip de comodidad:</strong> Detrás viene la unidad{' '}
                  <strong>{primaryBus.laterBuses[0].vehicleId}</strong> a las{' '}
                  {formatCRTime(primaryBus.laterBuses[0].arriveAt)} con menor aglomeración.
                </div>
              )}

              {/* Warnings */}
              {opt.warnings.map((w, wIdx) => (
                <div
                  key={wIdx}
                  style={{
                    fontSize: '11px',
                    color: '#f85149',
                    background: 'rgba(218, 54, 51, 0.15)',
                    borderRadius: 6,
                    padding: '6px 8px',
                    marginTop: 6,
                  }}
                >
                  ⚠️ {w}
                </div>
              ))}

              {isSelected && (
                <button
                  className="btn-primary"
                  style={{ marginTop: 12 }}
                  onClick={e => {
                    e.stopPropagation()
                    setGuidedMode('WALKING')
                  }}
                >
                  🧭 Iniciar Viaje Guiado
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
