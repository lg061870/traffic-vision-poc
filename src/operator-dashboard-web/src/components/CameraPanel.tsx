import { useEffect, useRef, useState } from 'react'
import { cameraDemo } from '../config/operatorSettings'
import type { OccupancySnapshot } from '../types/occupancy'

interface Detection {
  trackId: number
  confirmed: boolean
  className: 'sitting' | 'standing'
  score: number
  box: { x1: number; y1: number; x2: number; y2: number }
}

interface ClipResult {
  width: number
  height: number
  durationSeconds: number
  model: string
  frames: { timestampSeconds: number; detections: Detection[] }[]
}

/** The clip's files are not on the server (404), as opposed to a passing network error. */
class ClipMissing extends Error {}

/** Wait before trying again after a network error, so a server restart heals by itself. */
const retryMs = 4000

let resultRequest: Promise<ClipResult> | null = null

function loadResult() {
  resultRequest ??= fetch(cameraDemo.result)
    .then((response) => {
      if (response.status === 404) throw new ClipMissing()
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return response.json() as Promise<ClipResult>
    })
    .catch((error) => {
      // Not cached: the next panel, or the next retry, asks again.
      resultRequest = null
      throw error
    })
  return resultRequest
}

/**
 * Where the clip is now for a bus. The camera bus plays it on the clock the on-board app replays
 * its detections on (Unix time mod the clip's duration), so its boxes and the count the API
 * receives match. Every other bus starts the same clip at its own point, so they do not look alike.
 */
function clipSecond(duration: number, offset: number) {
  return (Date.now() / 1000 + offset) % duration
}

function clipOffset(vehicleId: string | undefined, duration: number) {
  if (!vehicleId || vehicleId === cameraDemo.vehicleId) return 0
  let hash = 0
  for (const char of vehicleId) hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  return hash % Math.floor(duration)
}

function frameAt(result: ClipResult, second: number) {
  const frames = result.frames
  let low = 0
  let high = frames.length - 1
  while (low < high) {
    const mid = Math.ceil((low + high) / 2)
    if (frames[mid].timestampSeconds <= second) low = mid
    else high = mid - 1
  }
  return frames[low]
}

interface CameraPanelProps {
  /** True for the bus whose count the API takes from this camera (it then shows that count). */
  isCameraBus: boolean
  occupancy: OccupancySnapshot | null
  /** Short version for the live tab: no explanation paragraph. */
  compact?: boolean
  /** The bus shown; it sets where the clip starts, and the compact version puts it in the title. */
  vehicleId?: string
  /** Adds a link that opens the bus's detail. */
  onOpen?: () => void
}

export function CameraPanel({ isCameraBus, occupancy, compact = false, vehicleId, onOpen }: CameraPanelProps) {
  const video = useRef<HTMLVideoElement>(null)
  const [result, setResult] = useState<ClipResult | null>(null)
  const [missing, setMissing] = useState(false)
  const [second, setSecond] = useState(0)
  // A failed video load (server restarting, a dropped connection) remounts the video after a pause.
  const [videoAttempt, setVideoAttempt] = useState(0)
  const [videoFailed, setVideoFailed] = useState(false)

  useEffect(() => {
    let timer: number | undefined
    let cancelled = false
    const load = () =>
      loadResult()
        .then((loaded) => !cancelled && setResult(loaded))
        .catch((error) => {
          if (cancelled) return
          if (error instanceof ClipMissing) setMissing(true)
          else timer = window.setTimeout(load, retryMs)
        })
    load()
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    if (!videoFailed) return
    const timer = window.setTimeout(() => {
      setVideoFailed(false)
      setVideoAttempt((attempt) => attempt + 1)
    }, retryMs)
    return () => window.clearTimeout(timer)
  }, [videoFailed])

  // Keeps the video on the shared clock and redraws the boxes about five times a second.
  useEffect(() => {
    if (!result) return
    const duration = result.durationSeconds
    const offset = clipOffset(vehicleId, duration)
    const sync = () => {
      const element = video.current
      if (!element || element.readyState < 1) return
      const target = clipSecond(duration, offset)
      const drift = Math.abs(element.currentTime - target)
      if (drift > 0.75 && drift < duration - 0.75) element.currentTime = target
      if (element.paused) element.play().catch(() => undefined)
    }
    sync()
    const syncTimer = window.setInterval(sync, 2000)
    const drawTimer = window.setInterval(() => setSecond(video.current?.currentTime ?? clipSecond(duration, offset)), 200)
    return () => {
      window.clearInterval(syncTimer)
      window.clearInterval(drawTimer)
    }
  }, [result, vehicleId])

  if (missing) {
    return (
      <section className={`panel camera-panel ${compact ? 'compact' : ''}`}>
        <h3>Cámara a bordo</h3>
        <p className="empty">No se encontró el clip de demostración (ver data/demo/README.md).</p>
      </section>
    )
  }

  const frame = result ? frameAt(result, second) : null
  const detections = frame?.detections.filter((d) => d.confirmed) ?? []
  const sitting = detections.filter((d) => d.className === 'sitting').length
  const standing = detections.length - sitting

  return (
    <section className={`panel camera-panel ${compact ? 'compact' : ''}`}>
      <h3>
        Cámara a bordo{compact && vehicleId ? ` · ${vehicleId}` : ''} <span className="tag">Grabación analizada por IA</span>
        {onOpen && (
          <button type="button" className="link-button panel-link" onClick={onOpen}>Ver bus →</button>
        )}
      </h3>
      <div className="camera-frame" style={result ? { aspectRatio: `${result.width} / ${result.height}` } : undefined}>
        <video
          key={videoAttempt}
          ref={video}
          src={cameraDemo.video}
          muted
          loop
          playsInline
          autoPlay
          preload="auto"
          onLoadedMetadata={(event) => {
            if (result) event.currentTarget.currentTime = clipSecond(result.durationSeconds, clipOffset(vehicleId, result.durationSeconds))
          }}
          onError={() => setVideoFailed(true)}
        />
        {videoFailed && <span className="camera-status">Reconectando el video…</span>}
        {result && (
          <svg viewBox={`0 0 ${result.width} ${result.height}`} preserveAspectRatio="none" aria-hidden="true">
            {detections.map((d) => (
              <rect key={d.trackId} x={d.box.x1} y={d.box.y1} width={d.box.x2 - d.box.x1} height={d.box.y2 - d.box.y1}
                className={`box box-${d.className}`} />
            ))}
          </svg>
        )}
      </div>
      <div className="camera-counts">
        <span className="muted">En este cuadro:</span>
        <span><i className="dot dot-sitting" />Sentados <strong>{sitting}</strong></span>
        <span><i className="dot dot-standing" />De pie <strong>{standing}</strong></span>
        {isCameraBus && occupancy && (
          <span className="camera-sent">
            Conteo enviado a la API: <strong>{occupancy.passengerCount}</strong> <small>(mediana de 10 s)</small>
          </span>
        )}
      </div>
      {!compact && <p className="note">
        {isCameraBus
          ? 'El conteo de este bus sale de esta cámara: el modelo RF-DETR detecta a cada pasajero y la computadora a bordo envía solo los números, nunca el video.'
          : 'El modelo RF-DETR detecta a cada pasajero sentado y de pie; la computadora a bordo envía solo los números, nunca el video.'}
        {' '}Es una grabación ya analizada que se repite; en un bus real el modelo corre en vivo. La cámara frontal cubre parte de la cabina.
      </p>}
    </section>
  )
}
