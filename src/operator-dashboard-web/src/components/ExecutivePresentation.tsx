import { useEffect, useState } from 'react'

interface ExecutivePresentationProps {
  isOpen: boolean
  onClose: () => void
  onOpenAppVideo: () => void
  onNavigateToTab: (tab: 'live' | 'profit') => void
}

export function ExecutivePresentation({
  isOpen,
  onClose,
  onOpenAppVideo,
  onNavigateToTab,
}: ExecutivePresentationProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [secondsRemaining, setSecondsRemaining] = useState(600) // 10 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [showNotes, setShowNotes] = useState(false)

  // Timer countdown
  useEffect(() => {
    if (!isOpen || !isTimerRunning) return
    const interval = setInterval(() => {
      setSecondsRemaining((s) => (s > 0 ? s - 1 : 0))
    }, 1000)
    return () => clearInterval(interval)
  }, [isOpen, isTimerRunning])

  // Reset timer and slide when opened
  useEffect(() => {
    if (isOpen) {
      setIsTimerRunning(true)
    } else {
      setIsTimerRunning(false)
    }
  }, [isOpen])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        e.preventDefault()
        setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault()
        setCurrentSlide((s) => Math.max(0, s - 1))
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const slides = [
    // Slide 1: Portada
    {
      id: 'portada',
      badge: 'PROPUESTA DE PILOTO · AUTOBUSES UNIDOS DE CORONADO',
      title: 'INNOBUS: Control Total y Rentabilidad de Flota',
      subtitle: 'Visión Artificial en Cabina + App de Pasajeros para la Ruta 142',
      duration: '0:00 - 1:00',
      content: (
        <div className="pres-split-layout">
          <div className="pres-cover-left">
            <div className="pres-cover-metrics-grid">
              <div className="pres-kpi-card">
                <span className="pres-kpi-num">39</span>
                <span className="pres-kpi-label">Buses Autorizados</span>
                <span className="pres-kpi-sub">Ruta regular (CTP / ARESEP)</span>
              </div>
              <div className="pres-kpi-card">
                <span className="pres-kpi-num">395 k</span>
                <span className="pres-kpi-label">Pasajeros / Mes</span>
                <span className="pres-kpi-sub">ARESEP RE-0025-IT-2024</span>
              </div>
              <div className="pres-kpi-card highlight-card">
                <span className="pres-kpi-num">100%</span>
                <span className="pres-kpi-label">Visibilidad con IA</span>
                <span className="pres-kpi-sub">Aforo exacto sin molinetes</span>
              </div>
            </div>

            <div className="pres-card border-blue">
              <p className="pres-text">
                <strong>Objetivo Ejecutivo:</strong> Auditoría de aforo y eficiencia operativa con visión artificial para detectar horas de pérdida en valle, ordenar frecuencias y fidelizar a los usuarios de Coronado.
              </p>
            </div>
          </div>

          <div className="pres-cover-right">
            <div className="pres-photo-card">
              <img src="/assets/real_coronado_bus_r142.png" alt="Autobús Coronado Ruta 142" />
              <div className="pres-photo-badge">
                <span className="pres-photo-tag">🚌 Autobuses Unidos de Coronado</span>
                <span className="pres-photo-route">Ruta 142 · San José - Coronado</span>
              </div>
            </div>
          </div>
        </div>
      ),
      talkingPoints: [
        'Agradecer al gerente/propietario por los 10 minutos.',
        'Citar el dato oficial de 39 unidades autorizadas según RE-0025-IT-2024 / Alcance 82 a La Gaceta 76.',
        'El piloto propuesto no toca molinetes ni sistemas de cobro actuales.',
      ],
    },

    // Slide 2: El Diagnóstico
    {
      id: 'diagnostico',
      badge: 'EL RETO DEL OPERADOR',
      title: '¿Dónde se Escapan las Ganancias en Coronado?',
      subtitle: 'En horas pico los buses van llenos; en horas valle se acumulan pérdidas silenciosas',
      duration: '1:00 - 2:30',
      content: (
        <div className="pres-grid-2">
          <div className="pres-card border-red">
            <div className="pres-card-header">
              <span className="pres-badge red">1. Horas Valle no Rentables (9am - 3pm)</span>
            </div>
            <div className="pres-loss-highlight">
              <div>
                <div className="text-xs text-muted">Aforo Promedio</div>
                <strong className="text-red font-mono text-lg">~14 pax / hora</strong>
              </div>
              <span className="text-muted font-bold">vs</span>
              <div>
                <div className="text-xs text-muted">Punto de Equilibrio</div>
                <strong className="text-dark font-mono text-lg">33.5 pax / hora</strong>
              </div>
            </div>
            <ul className="pres-bullets">
              <li><strong>Pérdida continua:</strong> Cada bus rodando vacío consume ~₡35,000/hora.</li>
              <li><strong>Falta de visibilidad:</strong> El operador no sabe cuántos pasajeros abordaron realmente hasta el corte nocturno.</li>
            </ul>
          </div>

          <div className="pres-card border-amber">
            <div className="pres-card-header">
              <span className="pres-badge amber">2. Agrupamiento de Buses ("Bus Bunching")</span>
            </div>
            <div className="pres-loss-highlight">
              <div>
                <div className="text-xs text-muted">Intervalo Deseado</div>
                <strong className="text-blue font-mono text-lg">8 - 12 min</strong>
              </div>
              <span className="text-muted font-bold">➔</span>
              <div>
                <div className="text-xs text-muted">Separación Real en Presa</div>
                <strong className="text-amber font-mono text-lg">2 min (Pegados)</strong>
              </div>
            </div>
            <ul className="pres-bullets">
              <li><strong>Bus 1:</strong> Sobrecargado, atrasado y quemando frenos.</li>
              <li><strong>Bus 2:</strong> Vacío inmediatamente detrás, quemando combustible en vano.</li>
              <li><strong>Pasajero:</strong> Espera 25 minutos y ve llegar dos buses juntos.</li>
            </ul>
          </div>
        </div>
      ),
      talkingPoints: [
        'Cada hora-bus cuesta ~₡35,000 en diésel, chofer y desgaste mecánico.',
        'Sin aforo en vivo, es imposible reprogramar frecuencias con seguridad.',
        'La solución no es recortar a ciegas, sino ajustar oferta exactamente donde está la demanda.',
      ],
    },

    // Slide 3: La Suite del Operador
    {
      id: 'suite-operador',
      badge: 'SOLUCIÓN PARA LA EMPRESA',
      title: 'Dashboard de Despacho & Gemelo Digital',
      subtitle: 'Convierta datos de aforo en vivo en decisiones de ahorro inmediato',
      duration: '2:30 - 4:30',
      content: (
        <div className="pres-grid-3">
          <div className="pres-feature-box">
            <div className="feature-icon">📊</div>
            <h4>Aforo Continuo por IA</h4>
            <p>Conteo automático de personas sentadas y de pie en cabina sin alterar molinetes ni barras.</p>
            <span className="feature-metric font-mono text-emerald">Precisión {'>'} 95%</span>
          </div>

          <div className="pres-feature-box">
            <div className="feature-icon">📡</div>
            <h4>Radar Anti-Bunching</h4>
            <p>Control de intervalos en tiempo real. Alertas cuando dos buses se acercan a menos de 4 minutos.</p>
            <span className="feature-metric font-mono text-blue">Headway 4.8 min</span>
          </div>

          <div className="pres-feature-box highlight-box">
            <div className="feature-icon">🔄</div>
            <h4>Simulador Digital Twin</h4>
            <p>Simule escenarios al instante: ¿Qué pasa si operamos 30 buses en valle en vez de 42? Calcula el ahorro de inmediato.</p>
            <span className="feature-metric font-mono text-cyan">Ahorro Cuantificable</span>
          </div>
        </div>
      ),
      talkingPoints: [
        'Mostrar cómo el simulador permite probar escenarios de 42 a 30 buses antes de enviar unidades a la calle.',
        'Hacer clic en "Ver Tablero Financiero" para mostrar la pantalla de rentabilidad en vivo.',
      ],
      action: {
        label: '📊 Ver Tablero Financiero en Vivo',
        onClick: () => onNavigateToTab('profit'),
      },
    },

    // Slide 4: La App Móvil y el Pasajero
    {
      id: 'app-pasajero',
      badge: 'IMPACTO EN EL PASAJERO',
      title: 'La App Móvil: Coronado Sabe Cuándo y Cómo Viaja',
      subtitle: 'Certeza en parada, menos filas y fidelización total de los usuarios',
      duration: '4:30 - 6:30',
      content: (
        <div className="pres-app-layout">
          <div className="pres-app-left">
            <div className="pres-app-benefit-item">
              <div className="benefit-icon">🟢</div>
              <div>
                <strong>Semáforo de Asientos Libres (Matriz 6 Puntos)</strong>
                <p>El usuario sabe si el bus viene con asientos vacíos, pasajeros de pie o lleno antes de que llegue a la parada.</p>
              </div>
            </div>

            <div className="pres-app-benefit-item">
              <div className="benefit-icon">⏱️</div>
              <div>
                <strong>Llegada Exacta (ETA en Vivo)</strong>
                <p>Elimina la espera a ciegas en el Parque de Coronado, San José o paradas intermedias de Guadalupe.</p>
              </div>
            </div>

            <div className="pres-app-benefit-item">
              <div className="benefit-icon">🛡️</div>
              <div>
                <strong>Fidelización vs Transporte Informal</strong>
                <p>El pasajero con certeza horaria prefiere siempre el bus formal y no recurre a piratas.</p>
              </div>
            </div>

            <div className="app-video-preview-card" onClick={onOpenAppVideo}>
              <div className="play-icon-circle">▶</div>
              <div>
                <strong>Ver Video Demostrativo de la App</strong>
                <div style={{ fontSize: '11px', opacity: 0.9 }}>Flujo completo de pantallas de pasajero</div>
              </div>
            </div>
          </div>

          <div className="pres-app-right">
            <div className="pres-phone-frame">
              <div className="pres-phone-img-wrap">
                <img src="/assets/app_mockup_preview.png" alt="App Pasajero Coronado R142" />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11.5px', color: '#475569', fontWeight: 600 }}>
                <span>📍 Ruta 142 Troncal</span>
                <span style={{ color: '#16a34a', fontWeight: 700 }}>🟢 Asientos Disponibles</span>
              </div>
            </div>
          </div>
        </div>
      ),
      talkingPoints: [
        'Hacer clic en el botón de video para mostrar el clip de la app.',
        'Enfatizar que la matriz de 6 puntos es simple e intuitiva para cualquier usuario sin curvas de aprendizaje.',
      ],
      action: {
        label: '📱 Reproducir Video de la App',
        onClick: onOpenAppVideo,
      },
    },

    // Slide 5: Propuesta de Piloto
    {
      id: 'piloto-que-se-necesita',
      badge: 'PLAN TÉCNICO SIN RIESGO',
      title: 'Piloto en 5 a 10 Buses: Cero Interrupción Operativa',
      subtitle: 'Instalación limpia, no invasiva y de rápida puesta en marcha',
      duration: '6:30 - 8:00',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="pres-grid-4">
            <div className="pres-spec-box">
              <div className="pres-spec-icon">📷</div>
              <h4>Cámara en Cabina</h4>
              <p>Gran angular hacia el pasillo. Cero invasión de privacidad y sin cables sueltos.</p>
            </div>

            <div className="pres-spec-box">
              <div className="pres-spec-icon">🧠</div>
              <h4>Edge AI a Bordo</h4>
              <p>Detección instantánea en el bus. Cero grabación de rostros, solo métricas de aforo.</p>
            </div>

            <div className="pres-spec-box">
              <div className="pres-spec-icon">📶</div>
              <h4>Módem 4G/5G</h4>
              <p>Telemetría cada 2 seg. Almacenamiento local si entra a zonas sin señal en Coronado.</p>
            </div>

            <div className="pres-spec-box">
              <div className="pres-spec-icon">🛡️</div>
              <h4>Cero Invasivo</h4>
              <p>No toca la computadora del bus ni los sistemas de cobro o molinetes existentes.</p>
            </div>
          </div>

          <div className="pres-pilot-banner">
            <div>
              <strong style={{ fontSize: '14px' }}>Alcance Propuesto:</strong>
              <span style={{ marginLeft: '8px', fontSize: '13px' }}>5 a 10 unidades en Ruta 142 Troncal · 4 semanas de prueba</span>
            </div>
            <span style={{ fontWeight: 800, fontSize: '13px', background: '#dcfce7', padding: '4px 12px', borderRadius: '999px', color: '#15803d' }}>
              ⏱ Instalación: 25 min / bus
            </span>
          </div>
        </div>
      ),
      talkingPoints: [
        'Instalación plug-and-play en el plantel durante la noche o fuera de turno.',
        'La empresa no arriesga nada de su operación actual.',
      ],
    },

    // Slide 6: Cronograma & Entregables
    {
      id: 'cronograma',
      badge: 'HOJA DE RUTA',
      title: 'Cronograma de 4 Semanas: Resultados Concretos',
      subtitle: 'Entregables claros cada semana antes de cualquier decisión a gran escala',
      duration: '8:00 - 9:00',
      content: (
        <div className="pres-timeline-grid">
          <div className="timeline-col">
            <div className="timeline-week-pill">Semana 1</div>
            <h5>Instalación & Red</h5>
            <p>Montaje de cámaras en 5-10 buses y validación de cobertura 4G/5G en el corredor Coronado - San José.</p>
          </div>

          <div className="timeline-col">
            <div className="timeline-week-pill">Semana 2</div>
            <h5>Tablero de Despacho</h5>
            <p>Capacitación al equipo de despacho y visualización de telemetría y aforo en tiempo real.</p>
          </div>

          <div className="timeline-col">
            <div className="timeline-week-pill">Semana 3</div>
            <h5>App con Pasajeros</h5>
            <p>Acceso anticipado a la app móvil para pasajeros de Coronado y medición de tiempos de espera.</p>
          </div>

          <div className="timeline-col highlight-timeline">
            <div className="timeline-week-pill pill-emerald">Semana 4</div>
            <h5>Informe ROI</h5>
            <p>Entrega del informe ejecutivo: Horas valle optimizables, colones ahorrados en diésel y propuesta final.</p>
          </div>
        </div>
      ),
      talkingPoints: [
        'El informe de la Semana 4 entrega datos certificados útiles también para gestiones ante CTP y ARESEP.',
        'ROI visible desde el primer mes.',
      ],
    },

    // Slide 7: Cierre & Siguiente Paso
    {
      id: 'cierre',
      badge: 'SIGUIENTE PASO COLABORATIVO',
      title: 'Exploremos el Piloto en Autobuses Unidos',
      subtitle: 'Validemos la tecnología en sus unidades sin costo de licenciamiento de software',
      duration: '9:00 - 10:00',
      content: (
        <div className="pres-close-layout">
          <div className="pres-close-card">
            <h3>Nuestro Compromiso para el Piloto:</h3>
            <div className="pres-close-points">
              <div className="close-point">
                <span className="close-check">✓</span>
                <div>
                  <strong>Licenciamiento de Software 100% Bonificado</strong>
                  <p>Acceso completo al Dashboard Web de Despacho y Simulador durante el período de prueba.</p>
                </div>
              </div>
              <div className="close-point">
                <span className="close-check">✓</span>
                <div>
                  <strong>Acompañamiento Técnico Llave en Mano</strong>
                  <p>Nos encargamos del montaje de hardware y calibración en su plantel de Coronado sin alterar la operación.</p>
                </div>
              </div>
              <div className="close-point">
                <span className="close-check">✓</span>
                <div>
                  <strong>Definición Conjunta del Alcance</strong>
                  <p>Elijamos juntos cuáles 5 unidades de la Ruta 142 son las más idóneas para comenzar a medir.</p>
                </div>
              </div>
            </div>

            <div className="pres-actions-row">
              <button
                type="button"
                className="pres-btn-primary"
                onClick={() => onNavigateToTab('live')}
              >
                🗺 Ver Tablero en Vivo
              </button>
              <button
                type="button"
                className="pres-btn-secondary"
                onClick={onOpenAppVideo}
              >
                📱 Ver Video de la App
              </button>
            </div>
          </div>
        </div>
      ),
      talkingPoints: [
        'Cerrar en tono de colaboración y aprendizaje mutuo: "¿Cuáles 5 unidades de la Ruta 142 consideran más interesantes para evaluar?".',
        'Abrir espacio a preguntas técnicas o comerciales del gerente o propietarios.',
      ],
    },
  ]

  const current = slides[currentSlide]

  return (
    <div className="presentation-overlay">
      {/* Top Presentation Bar */}
      <div className="pres-top-bar">
        <div className="pres-top-left">
          <div className="brand-title-row">
            <span className="brand-name text-white">INNOBUS</span>
            <span className="brand-tag">Executive Pitch</span>
          </div>
          <span className="pres-divider">|</span>
          <span className="pres-meeting-label">
            Demo para Gerencia de Autobuses Unidos de Coronado
          </span>
        </div>

        <div className="pres-top-right">
          {/* 10-Minute Timer Badge */}
          <div
            className={`pres-timer-pill ${secondsRemaining < 120 ? 'timer-warning' : ''}`}
            title="Temporizador de la presentación (10 min)"
            onClick={() => setIsTimerRunning((r) => !r)}
          >
            <span className="timer-icon">⏱️</span>
            <span className="font-mono font-bold">{formatTimer(secondsRemaining)}</span>
            <span className="timer-status">{isTimerRunning ? 'Pausar' : 'Reanudar'}</span>
          </div>

          <button
            type="button"
            className={`pres-notes-toggle ${showNotes ? 'active' : ''}`}
            onClick={() => setShowNotes((n) => !n)}
            title="Ver notas y puntos clave para el expositor"
          >
            {showNotes ? 'Ocultar Puntos Clave' : '💡 Puntos Clave'}
          </button>

          <button
            type="button"
            className="pres-close-btn"
            onClick={onClose}
            title="Salir de la presentación (Esc)"
          >
            ✕ Salir
          </button>
        </div>
      </div>

      {/* Main Slide Stage */}
      <div className="pres-slide-stage">
        <div className="pres-slide-container">
          <div className="slide-header-box">
            <div className="slide-header-meta">
              <span className="slide-badge-pill">{current.badge}</span>
              <span className="slide-duration-pill font-mono">{current.duration}</span>
            </div>
            <h1 className="slide-title">{current.title}</h1>
            <p className="slide-subtitle">{current.subtitle}</p>
          </div>

          <div className="slide-body-content">{current.content}</div>

          {/* Action button if present */}
          {current.action && (
            <div className="slide-action-bar">
              <button
                type="button"
                className="slide-action-btn"
                onClick={current.action.onClick}
              >
                {current.action.label} ➔
              </button>
            </div>
          )}
        </div>

        {/* Presenter Notes Drawer (if open) */}
        {showNotes && (
          <aside className="pres-notes-sidebar">
            <div className="notes-header">
              <strong className="notes-title">💡 Puntos a Decir (60-90s)</strong>
              <button
                type="button"
                className="notes-close"
                onClick={() => setShowNotes(false)}
              >
                ×
              </button>
            </div>
            <ul className="notes-list">
              {current.talkingPoints.map((pt, i) => (
                <li key={i}>{pt}</li>
              ))}
            </ul>
            <div className="notes-tip">
              <span>Consejo:</span> Mantenga el ritmo ágil para dejar 2 minutos al final para preguntas.
            </div>
          </aside>
        )}
      </div>

      {/* Bottom Navigation Controls */}
      <div className="pres-bottom-bar">
        <div className="pres-progress-dots">
          {slides.map((s, i) => (
            <button
              key={s.id}
              type="button"
              className={`progress-dot ${currentSlide === i ? 'active' : ''}`}
              onClick={() => setCurrentSlide(i)}
              title={`Ir a diapositiva ${i + 1}: ${s.title}`}
            />
          ))}
        </div>

        <div className="pres-nav-buttons">
          <button
            type="button"
            className="nav-arrow-btn"
            disabled={currentSlide === 0}
            onClick={() => setCurrentSlide((s) => Math.max(0, s - 1))}
          >
            ← Anterior
          </button>
          <span className="slide-counter font-mono">
            {currentSlide + 1} / {slides.length}
          </span>
          <button
            type="button"
            className="nav-arrow-btn primary"
            disabled={currentSlide === slides.length - 1}
            onClick={() => setCurrentSlide((s) => Math.min(slides.length - 1, s + 1))}
          >
            Siguiente →
          </button>
        </div>

        <div className="pres-shortcuts-hint">
          <span>Teclas:</span> <kbd>→</kbd> <kbd>←</kbd> o <kbd>Espacio</kbd> para avanzar · <kbd>Esc</kbd> para salir
        </div>
      </div>
    </div>
  )
}
