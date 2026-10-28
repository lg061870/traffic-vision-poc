import { useEffect, useState } from 'react'
import { FleetMap } from '../../FleetMap'
import { BusBunchingDiagram } from '../../BusBunchingDiagram'
import { MaximizeButton } from '../../MaximizeButton'
import { ViewHeader } from '../ViewHeader'
import { useRoutes } from '../../../hooks/useRoutes'
import { fmtTime, mockRouteLines, routeLinesWithFallback, vehiclesAt, type RunOutput } from '../mockRun'
import { runSubtitle } from './shared'

/** Replays the run minute by minute, on the map or on the bunching diagram. */
export function MapaReplayView({ output, mode }: { output: RunOutput; mode: 'mapa' | 'pelotonamiento' }) {
  const [minute, setMinute] = useState(7 * 60)
  const [playing, setPlaying] = useState(false)
  const [selected, setSelected] = useState<string | null>(null)
  // Maximized fills the whole window: top bar, sidebar, ribbon, filters and run tabs all step aside.
  const [maximized, setMaximized] = useState(false)
  // A maximized diagram also hides this view's title and replay bar; a compact replay control moves into its header.
  const showsChrome = mode === 'mapa' || !maximized

  useEffect(() => {
    if (!maximized) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMaximized(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [maximized])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setMinute((m) => (m >= 1380 ? 270 : m + 2)), 250)
    return () => window.clearInterval(timer)
  }, [playing])

  // Road-following OSM lines (the same file the live map uses); straight stop-to-stop lines until it loads.
  const { geojson } = useRoutes()
  const lines = geojson ? routeLinesWithFallback(geojson) : mockRouteLines
  const vehicles = vehiclesAt(output, minute, lines)
  const onRoute = vehicles.filter((v) => v.trip).length

  return (
    <main className={`sv-stage ${maximized ? 'sv-stage-maximized' : ''}`}>
      {showsChrome && (
        <ViewHeader
          title={mode === 'mapa' ? 'Mapa' : 'Pelotonamiento'}
          subtitle={`${runSubtitle(output)} · ${onRoute} buses en ruta, ${vehicles.length - onRoute} en plantel`}
        />
      )}

      {showsChrome && (
        <div className="sv-replay-bar">
          <button type="button" className="sv-btn primary" onClick={() => setPlaying((p) => !p)}>
            {playing ? '❚❚ Pausa' : '▶ Reproducir'}
          </button>
          <strong>{fmtTime(minute)}</strong>
          <input type="range" min={270} max={1380} step={1} value={minute} onChange={(e) => setMinute(e.target.valueAsNumber)} />
          <div className="sv-seg">
            {[
              ['Pico mañana', 390],
              ['Mediodía', 720],
              ['Pico tarde', 1050],
            ].map(([label, m]) => (
              <button key={label} type="button" onClick={() => setMinute(m as number)}>
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="sv-card sv-replay-canvas">
        {mode === 'mapa' ? (
          <>
            <FleetMap key={geojson ? 'osm' : 'stops'} routes={lines} vehicles={vehicles} selectedId={selected} onSelect={setSelected} />
            <MaximizeButton maximized={maximized} onChange={setMaximized} className="sv-map-maximize" />
          </>
        ) : (
          <BusBunchingDiagram
            routes={lines}
            vehicles={vehicles}
            activeVehicleId={selected}
            onSelectVehicle={setSelected}
            maximized={maximized}
            onMaximizedChange={setMaximized}
            headerExtra={
              !showsChrome && (
                <span className="sv-replay-mini">
                  <button
                    type="button"
                    className="sv-btn primary"
                    aria-label={playing ? 'Pausar' : 'Reproducir'}
                    title={playing ? 'Pausar' : 'Reproducir'}
                    onClick={() => setPlaying((p) => !p)}
                  >
                    {playing ? '❚❚' : '▶'}
                  </button>
                  <strong>{fmtTime(minute)}</strong>
                </span>
              )
            }
          />
        )}
      </div>
    </main>
  )
}
