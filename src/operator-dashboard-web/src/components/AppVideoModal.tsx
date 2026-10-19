import { useEffect, useRef, useState } from 'react'

interface AppVideoModalProps {
  isOpen: boolean
  onClose: () => void
}

export function AppVideoModal({ isOpen, onClose }: AppVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isPlaying, setIsPlaying] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const togglePlay = () => {
    if (!videoRef.current) return
    if (videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    } else {
      videoRef.current.pause()
      setIsPlaying(false)
    }
  }

  const restartVideo = () => {
    if (!videoRef.current) return
    videoRef.current.currentTime = 0
    videoRef.current.play()
    setIsPlaying(true)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal app-video-modal"
        role="dialog"
        aria-label="Video demostrativo de la aplicación móvil de pasajeros"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal-header">
          <div className="app-video-title-col">
            <div className="brand-title-row">
              <span className="brand-name">INNOBUS</span>
              <span className="brand-tag">App Pasajero</span>
            </div>
            <h2 className="app-video-subheading">
              Flujo de Pantallas de la Experiencia Móvil
            </h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Cerrar video"
          >
            ×
          </button>
        </header>

        <div className="app-video-body">
          <div className="app-video-player-wrapper">
            <video
              ref={videoRef}
              src="/demo/innobus-app-flow.mp4"
              className="app-video-element"
              autoPlay
              loop
              playsInline
              controls
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
            >
              <source src="/demo/app-flow.mp4" type="video/mp4" />
              Tu navegador no soporta la reproducción de video HTML5.
            </video>

            <div className="app-video-floating-bar">
              <button
                type="button"
                className="app-video-ctrl-btn"
                onClick={togglePlay}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? '⏸ Pausar' : '▶ Reproducir'}
              </button>
              <button
                type="button"
                className="app-video-ctrl-btn"
                onClick={restartVideo}
                title="Reiniciar desde el inicio"
              >
                ↺ Reiniciar
              </button>
              <span className="app-video-duration-tag">
                📱 Formato 100% Pantallas Reales · Ruta 142 Coronado y Ramales
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
