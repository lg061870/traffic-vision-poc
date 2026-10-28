import React from 'react'
import './BrochureView.css'

interface BrochureViewProps {
  onBackToStudio: () => void
}

export function BrochureView({ onBackToStudio }: BrochureViewProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="br-container">
      {/* Interactive Navigation Toolbar */}
      <div className="br-toolbar">
        <div className="br-toolbar-title">
          <span>🚍</span>
          <span>BusLab / FleetSim v4.2 — Folleto Ejecutivo de Funcionalidades y Resultados</span>
        </div>
        <div className="br-toolbar-actions">
          <button type="button" className="br-btn br-btn-secondary" onClick={onBackToStudio}>
            ← Volver al Estudio
          </button>
          <button type="button" className="br-btn br-btn-primary" onClick={handlePrint}>
            🖨️ Imprimir / Guardar PDF
          </button>
        </div>
      </div>

      {/* SPREAD 1: PÁGINAS 1 & 2 */}
      <div className="br-spread">
        {/* ==================================================================
            PÁGINA 1: PORTADA & ARQUITECTURA OPERATIVA
            ================================================================== */}
        <section className="br-page">
          <header className="br-header">
            <div className="br-header-brand">
              <span className="br-logo-badge">🚍</span>
              <div>
                <div className="br-brand-title">BusLab</div>
                <div className="br-brand-sub">Autobuses Unidos de Coronado S.A. · Concesión CTP N2</div>
              </div>
            </div>
            <span className="br-header-tag">Díptico Técnico · 4 Páginas</span>
          </header>

          <h1 className="br-hero-title">
            Simulación Estocástica y Planificación Operativa de Concesiones de Autobús
          </h1>
          <p className="br-hero-desc">
            Herramienta técnica de despacho, modelado financiero y control regulatorio diseñada
            específicamente para la realidad operativa del transporte público en Costa Rica (CTP y ARESEP).
          </p>

          {/* Quick Metrics KPI Row */}
          <div className="br-kpi-row">
            <div className="br-kpi-block">
              <span className="br-kpi-num">39</span>
              <span className="br-kpi-label">Buses en Red</span>
            </div>
            <div className="br-kpi-block">
              <span className="br-kpi-num">12</span>
              <span className="br-kpi-label">Ramales CTP</span>
            </div>
            <div className="br-kpi-block">
              <span className="br-kpi-num">65,7 km</span>
              <span className="br-kpi-label">Red Total</span>
            </div>
            <div className="br-kpi-block">
              <span className="br-kpi-num">19.747</span>
              <span className="br-kpi-label">Pax / Día</span>
            </div>
            <div className="br-kpi-block">
              <span className="br-kpi-num">16 ms</span>
              <span className="br-kpi-label">Tiempo Corrida</span>
            </div>
          </div>

          {/* Main Hero Screen */}
          <div className="br-card">
            <div className="br-card-header">
              <span className="br-card-title">
                <span>🗺️</span>
                <span>Visualización Geográfica & Control de Intervalos en Vivo</span>
              </span>
              <span className="br-card-badge br-badge-blue">Módulo Resultados</span>
            </div>
            <div className="br-screenshot-frame">
              <img
                src="/brochure_images/19_resultados_mapa.jpg"
                alt="Mapa de Operación en Vivo BusLab"
                className="br-screenshot-img"
              />
            </div>
            <div className="br-callout-grid">
              <div className="br-callout-item">
                <div className="br-callout-label">Línea de Tiempo Dinámica</div>
                <div className="br-callout-value">04:30 – 00:15</div>
                <div className="br-callout-sub">Scrubber interactivo con acceso directo a picos y valles</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Monitoreo de Flota Activa</div>
                <div className="br-callout-value">29 en Ruta / 10 en Plantel</div>
                <div className="br-callout-sub">Control de unidades en servicio simultáneo por franja</div>
              </div>
            </div>
          </div>

          {/* Core Architectural Pillars */}
          <div className="br-card" style={{ marginBottom: 0 }}>
            <div className="br-card-header">
              <span className="br-card-title">
                <span>⚡</span>
                <span>Arquitectura Técnica: Local-First y Nube Privada</span>
              </span>
              <span className="br-card-badge br-badge-green">Sin Servidores</span>
            </div>
            <div className="br-callout-grid">
              <div className="br-callout-item">
                <div className="br-callout-label">Archivos Autónomos (.xlsx)</div>
                <div className="br-callout-sub">
                  Simulaciones guardadas como libros independientes para auditoría y respaldo sin bases de datos ajenas.
                </div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Sincronización Google Drive</div>
                <div className="br-callout-sub">
                  Bóveda de sincronización directa a la cuenta corporativa del concesionario con aislamiento total.
                </div>
              </div>
            </div>
          </div>

          <footer className="br-footer">
            <span className="br-footer-left">BusLab Operator Suite · Concesión Coronado CTP N2</span>
            <span className="br-page-num">Página 1</span>
          </footer>
        </section>

        {/* ==================================================================
            PÁGINA 2: FINANZAS & MODELO DE COSTOS ARESEP
            ================================================================== */}
        <section className="br-page">
          <header className="br-header">
            <div className="br-header-brand">
              <span className="br-logo-badge">💰</span>
              <div>
                <div className="br-brand-title">Pilar 1: Finanzas Operativas y Punto de Equilibrio</div>
                <div className="br-brand-sub">Metodología Regulatoria ARESEP RE-0115-IT-2026</div>
              </div>
            </div>
            <span className="br-header-tag">Auditoría Financiera</span>
          </header>

          <h2 className="br-hero-title">Estado de Resultados Hora por Hora</h2>
          <p className="br-hero-desc">
            Diagnóstico financiero exacto de cada hora de la jornada. Identifique con precisión qué salidas cubren
            sus costos operativos y qué horas valle operan en déficit estructural.
          </p>

          {/* Income Statement Screen */}
          <div className="br-card">
            <div className="br-card-header">
              <span className="br-card-title">
                <span>📊</span>
                <span>Estado de Resultados Diario y Rentabilidad por Franja</span>
              </span>
              <span className="br-card-badge br-badge-green">Flota Eléctrica 142</span>
            </div>
            <div className="br-screenshot-frame">
              <img
                src="/brochure_images/21_resultados_estado_de_resultados.jpg"
                alt="Estado de Resultados Hora por Hora"
                className="br-screenshot-img"
              />
            </div>
            <div className="br-callout-grid">
              <div className="br-callout-item">
                <div className="br-callout-label">Ingresos Diarios (Tarifa Ponderada)</div>
                <div className="br-callout-value">₡7.699.507</div>
                <div className="br-callout-sub">19.747 pasajeros pagos (adulto mayor exento por ley)</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Margen Neto Operativo</div>
                <div className="br-callout-value" style={{ color: '#107c41' }}>+₡525.207 (6,8%)</div>
                <div className="br-callout-sub">554 horas-bus acumuladas a ₡12.950/h-bus</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Horas Rentables vs Déficit</div>
                <div className="br-callout-value">6 de 20 horas</div>
                <div className="br-callout-sub">Pico mañana y pico tarde subsidian las 14 horas valle</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Punto de Equilibrio</div>
                <div className="br-callout-value">33,2 pax / hora-bus</div>
                <div className="br-callout-sub">Umbral mínimo para costear operación del bus</div>
              </div>
            </div>
          </div>

          {/* ARESEP Cost Structure Screen */}
          <div className="br-card" style={{ marginBottom: 0 }}>
            <div className="br-card-header">
              <span className="br-card-title">
                <span>⚙️</span>
                <span>Desglose Paramétrico de Costos (Metodología Oficial ARESEP)</span>
              </span>
              <span className="br-card-badge br-badge-amber">Costos de Operación</span>
            </div>
            <div className="br-screenshot-frame">
              <img
                src="/brochure_images/71_costos.jpg"
                alt="Estructura de Costos ARESEP"
                className="br-screenshot-img"
              />
            </div>
            <div className="br-callout-grid">
              <div className="br-callout-item">
                <div className="br-callout-label">1. Combustible & Energía (37%)</div>
                <div className="br-callout-value">₡4.846 / hora</div>
                <div className="br-callout-sub">RECOPE ₡785/L · Rendimiento 2.8 km/L · 16.5 km/h comercial</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">2. Personal Operativo (45%)</div>
                <div className="br-callout-value">₡5.846 / hora</div>
                <div className="br-callout-sub">Salario chofer ₡3.150/h · Cargas sociales 36% · Relevo 1.22</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">3. Mantenimiento & Flota (10%)</div>
                <div className="br-callout-value">₡1.258 / hora</div>
                <div className="br-callout-sub">Repuestos ₡55/km · Llantas y rodamiento ₡350/h</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">4. Cánones y Fijos (8%)</div>
                <div className="br-callout-value">₡1.000 / hora</div>
                <div className="br-callout-sub">Cánones CTP/ARESEP ₡320/h · Seguros e inspección ₡280/h</div>
              </div>
            </div>
          </div>

          <footer className="br-footer">
            <span className="br-footer-left">BusLab Operator Suite · Concesión Coronado CTP N2</span>
            <span className="br-page-num">Página 2</span>
          </footer>
        </section>
      </div>

      {/* SPREAD 2: PÁGINAS 3 & 4 */}
      <div className="br-spread">
        {/* ==================================================================
            PÁGINA 3: CALIDAD DE SERVICIO & ESPACIO-TIEMPO
            ================================================================== */}
        <section className="br-page">
          <header className="br-header">
            <div className="br-header-brand">
              <span className="br-logo-badge">📈</span>
              <div>
                <div className="br-brand-title">Pilar 2: Regularidad, Intervalos y Física del Pasajero</div>
                <div className="br-brand-sub">Modelado Micro-Estocástico de Trayectorias y Paradas</div>
              </div>
            </div>
            <span className="br-header-tag">Calidad de Servicio</span>
          </header>

          <h2 className="br-hero-title">Diagramas de Marey y Detección de Pelotonamiento</h2>
          <p className="br-hero-desc">
            Visualice el movimiento de cada unidad a lo largo del corredor troncal. Detecte cuándo los buses se
            pegan unos con otros (bunching) y dónde se generan esperas excesivas para los usuarios.
          </p>

          {/* Marey Space-Time Diagram Screen */}
          <div className="br-card">
            <div className="br-card-header">
              <span className="br-card-title">
                <span>⏱️</span>
                <span>Diagrama Espacio-Tiempo (1.043 Viajes Simulados)</span>
              </span>
              <span className="br-card-badge br-badge-blue">Troncal Coronado - San José</span>
            </div>
            <div className="br-screenshot-frame">
              <img
                src="/brochure_images/26_resultados_espacio_tiempo.jpg"
                alt="Diagrama Espacio-Tiempo Marey"
                className="br-screenshot-img"
              />
            </div>
            <div className="br-callout-grid">
              <div className="br-callout-item">
                <div className="br-callout-label">Detección de Buses Pegados</div>
                <div className="br-callout-value" style={{ color: '#c93b3b' }}>16 Viajes en Riesgo</div>
                <div className="br-callout-sub">Convergencia de líneas en horas pico con retrasos de parada</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Tiempo de Espera Promedio</div>
                <div className="br-callout-value" style={{ color: '#107c41' }}>6,5 minutos</div>
                <div className="br-callout-sub">Medición en todas las paradas del corredor troncal</div>
              </div>
            </div>
          </div>

          {/* Passenger Load Profile & Bunching Radar */}
          <div className="br-card" style={{ marginBottom: 0 }}>
            <div className="br-card-header">
              <span className="br-card-title">
                <span>👥</span>
                <span>Perfil de Carga por Parada y Sobrecupo</span>
              </span>
              <span className="br-card-badge br-badge-amber">Capacidad Máx 80 pax</span>
            </div>
            <div className="br-screenshot-frame">
              <img
                src="/brochure_images/28_resultados_perfil_de_carga.jpg"
                alt="Perfil de Carga por Parada"
                className="br-screenshot-img"
              />
            </div>
            <div className="br-callout-grid">
              <div className="br-callout-item">
                <div className="br-callout-label">Punto de Carga Crítico (Ida)</div>
                <div className="br-callout-value">Parada Guadalupe Centro</div>
                <div className="br-callout-sub">66 pasajeros a bordo (83% de capacidad de unidad)</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Radar de Pelotonamiento</div>
                <div className="br-callout-value">1 Pelotón Crítico (≤ 2.0 min)</div>
                <div className="br-callout-sub">Alerta temprana para regulación de despacho en terminal</div>
              </div>
            </div>
          </div>

          <footer className="br-footer">
            <span className="br-footer-left">BusLab Operator Suite · Concesión Coronado CTP N2</span>
            <span className="br-page-num">Página 3</span>
          </footer>
        </section>

        {/* ==================================================================
            PÁGINA 4: RECURSOS HUMANOS, CUMPLIMIENTO CTP & COMPARATIVA
            ================================================================== */}
        <section className="br-page">
          <header className="br-header">
            <div className="br-header-brand">
              <span className="br-logo-badge">🛡️</span>
              <div>
                <div className="br-brand-title">Pilar 3: Choferes, Cumplimiento CTP y Escenarios A/B</div>
                <div className="br-brand-sub">Auditoría Operativa y Justificación Regulatoria</div>
              </div>
            </div>
            <span className="br-header-tag">Regulación & A/B</span>
          </header>

          <h2 className="br-hero-title">Auditoría CTP Oficial y Optimización de Choferes</h2>
          <p className="br-hero-desc">
            Genere evidencia documental para respaldar solicitudes de reestructuración tarifaria y técnica ante el
            Consejo de Transporte Público (CTP) y ARESEP.
          </p>

          {/* CTP Compliance Checklist Screen */}
          <div className="br-card">
            <div className="br-card-header">
              <span className="br-card-title">
                <span>📋</span>
                <span>Lista de Verificación Regulatoria CTP / ARESEP</span>
              </span>
              <span className="br-card-badge br-badge-green">Acuerdo Oficial</span>
            </div>
            <div className="br-screenshot-frame">
              <img
                src="/brochure_images/30_resultados_cumplimiento_ctp.jpg"
                alt="Lista de Verificación CTP"
                className="br-screenshot-img"
              />
            </div>
            <div className="br-callout-grid">
              <div className="br-callout-item">
                <div className="br-callout-label">Flota Autorizada en Servicio</div>
                <div className="br-callout-value" style={{ color: '#107c41' }}>39 / 39 Buses (Cumple)</div>
                <div className="br-callout-sub">Conformidad con acuerdo CTP-DT-DAC-INF-0557-2023</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Horarios Extremos</div>
                <div className="br-callout-value" style={{ color: '#107c41' }}>04:30 – 00:15 (Cumple)</div>
                <div className="br-callout-sub">Cobertura total de la jornada contractual</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Intervalo Troncal en Pico</div>
                <div className="br-callout-value" style={{ color: '#d97706' }}>6,2 min (Revisar)</div>
                <div className="br-callout-sub">Ligeramente superior a la meta CTP de ≤ 6,0 min</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Ley 7935 (Adulto Mayor)</div>
                <div className="br-callout-value" style={{ color: '#107c41' }}>Exención Aplicada</div>
                <div className="br-callout-sub">12% de pasajeros sin cobro contabilizados correctamente</div>
              </div>
            </div>
          </div>

          {/* Driver Shifts & Overtime Control */}
          <div className="br-card" style={{ marginBottom: 0 }}>
            <div className="br-card-header">
              <span className="br-card-title">
                <span>👤</span>
                <span>Turnos de Conducción, Relevos y Control de Horas Extra</span>
              </span>
              <span className="br-card-badge br-badge-blue">106 Choferes</span>
            </div>
            <div className="br-screenshot-frame">
              <img
                src="/brochure_images/25_resultados_turnos_de_choferes.jpg"
                alt="Turnos de Choferes y Horas Extra"
                className="br-screenshot-img"
              />
            </div>
            <div className="br-callout-grid">
              <div className="br-callout-item">
                <div className="br-callout-label">Plantilla de Conductores</div>
                <div className="br-callout-value">106 Choferes (2,72 x bus)</div>
                <div className="br-callout-sub">Corte automático de jornada a 7,5 horas</div>
              </div>
              <div className="br-callout-item">
                <div className="br-callout-label">Impacto de Horas Extra</div>
                <div className="br-callout-value" style={{ color: '#c93b3b' }}>35,1 h (~₡165.611 / día)</div>
                <div className="br-callout-sub">24 conductores asignados a turnos de madrugada (&lt; 05:00)</div>
              </div>
            </div>
          </div>

          {/* System Specs & Technical Footprint */}
          <div className="br-specs-grid">
            <div className="br-spec-group">
              <div className="br-spec-title">Requisitos Técnicos</div>
              <div className="br-spec-row">
                <span className="br-spec-key">Sistema Operativo:</span>
                <span className="br-spec-val">Windows 10 / 11 (64-bit)</span>
              </div>
              <div className="br-spec-row">
                <span className="br-spec-key">Memoria RAM:</span>
                <span className="br-spec-val">4 GB mínimo (8 GB recomendado)</span>
              </div>
              <div className="br-spec-row">
                <span className="br-spec-key">Rendimiento:</span>
                <span className="br-spec-val">Motor RAM Estocástico (16 ms)</span>
              </div>
            </div>
            <div className="br-spec-group">
              <div className="br-spec-title">Despliegue y Datos</div>
              <div className="br-spec-row">
                <span className="br-spec-key">Bases de Datos:</span>
                <span className="br-spec-val">Sin servidor centralizado</span>
              </div>
              <div className="br-spec-row">
                <span className="br-spec-key">Sincronización:</span>
                <span className="br-spec-val">Google Drive / OneDrive B2B</span>
              </div>
              <div className="br-spec-row">
                <span className="br-spec-key">Archivos:</span>
                <span className="br-spec-val">Formato abierto (.xlsx / JSON)</span>
              </div>
            </div>
          </div>

          <footer className="br-footer">
            <span className="br-footer-left">BusLab Operator Suite · Concesión Coronado CTP N2</span>
            <span className="br-page-num">Página 4</span>
          </footer>
        </section>
      </div>
    </div>
  )
}
