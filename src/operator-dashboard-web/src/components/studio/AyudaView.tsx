import { fareSource } from '../../config/operatorSettings'
import { ViewHeader } from './ViewHeader'

export function AyudaView() {
  return (
    <main className="sv-stage">
      <ViewHeader title="Ayuda" subtitle="Cómo leer cada pantalla del estudio" />

      <div className="sv-grid-2">
        <div className="sv-card">
          <div className="sv-card-title">Pestañas</div>
          <div className="sv-prose">
            <h4>Inicio</h4>
            <p>Resumen del escenario activo: flota, pasajeros, horas rentables y margen del día.</p>
            <h4>Rutas y Ramales</h4>
            <p>La troncal 142 y sus ramales, con kilómetros, paradas, buses asignados y tarifa. Haga clic en una ruta para ver sus paradas.</p>
            <h4>Despacho Horario</h4>
            <p>Qué horas y qué ramales pagan su costo. Rojo es déficit, verde es margen positivo.</p>
            <h4>Nivel de Demanda</h4>
            <p>Pasajeros por hora contra buses en servicio, para Lunes a Viernes, Sábado o Domingo.</p>
            <h4>Costos</h4>
            <p>Costo de operar un bus una hora, por rubro, y cuántos abordajes por hora lo pagan. Puede cambiar los valores; Resultados se recalcula.</p>
            <h4>Resultados</h4>
            <p>Ingresos, costos y margen hora por hora con los supuestos actuales.</p>
          </div>
        </div>

        <div className="sv-card">
          <div className="sv-card-title">Conceptos y fuentes</div>
          <div className="sv-prose">
            <h4>Abordajes por hora-bus</h4>
            <p>Pasajeros que suben a un bus durante una hora de servicio. Es la medida que compara cada hora con su costo.</p>
            <h4>Punto de equilibrio</h4>
            <p>Abordajes por hora-bus que pagan el costo de esa hora: costo por hora-bus ÷ (tarifa × parte que paga pasaje).</p>
            <h4>Adulto mayor</h4>
            <p>Viaja gratis, así que sus abordajes ocupan el bus sin generar ingreso.</p>
            <h4>Fuentes</h4>
            <ul>
              <li>{fareSource}</li>
              <li>Red, paradas y flota autorizada: CTP-DT-DAC-INF-0557-2023 y ARESEP RE-0025-IT-2024</li>
              <li>Costo por hora-bus: estimación propia con el modelo de costos de ARESEP</li>
            </ul>
            <h4>Datos simulados</h4>
            <p>La demanda y los resultados son simulados. No son datos reales del operador.</p>
          </div>
        </div>
      </div>
    </main>
  )
}
