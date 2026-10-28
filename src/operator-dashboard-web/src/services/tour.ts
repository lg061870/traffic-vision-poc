import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function startProductTour(force = false) {
  if (!force) return

  const driverObj = driver({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayColor: '#000000',
    overlayOpacity: 0.55,
    stagePadding: 5,
    stageRadius: 7,
    nextBtnText: 'Siguiente →',
    prevBtnText: '← Anterior',
    doneBtnText: '¡Listo para operar!',
    progressText: 'Paso {{current}} de {{total}}',
    popoverClass: 'innobus-tour-popover',
    onDestroyed: () => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('innobus_tour_seen', '1')
      }
    },
    steps: [
      {
        element: '.brand',
        popover: {
          title: '🚍 INNOBUS Operator Suite',
          description:
            'Bienvenido a la suite de control de <strong>Autobuses Unidos de Coronado</strong>. Aquí supervisa la Troncal 142 y los 9 ramales alimentadores con datos en tiempo real.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.tour-tab-profit',
        popover: {
          title: '📊 Rentabilidad de Hoy',
          description:
            'Monitoree los ingresos recaudados en colones (₡), costo de combustible y choferes por hora-bus, margen operativo y punto de equilibrio por franja horaria.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.tour-tab-live',
        popover: {
          title: '📡 Radar en Vivo',
          description:
            'Mapa satelital interactivo en tiempo real con telemetría 5G, ubicación GPS de los 39 buses, paradas autorizadas CTP y niveles de ocupación de pasajeros.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.tour-tab-bunching',
        popover: {
          title: '📈 Diagrama de Pelotonamiento',
          description:
            'Esquema unificado del corredor troncal y ramales. Detecta pegas de buses con alertas en <strong>amarillo (2.1–3.0 min)</strong> y <strong>rojo crítico (≤ 2.0 min)</strong>.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.tour-btn-simulator',
        popover: {
          title: '⚙️ Simulador de Flota',
          description:
            'Gemelo digital interactivo: modele cambios de frecuencia autorizadas por CTP, reasigne buses entre ramales y troncal, y proyecte el impacto financiero al instante.',
          side: 'bottom',
          align: 'start',
        },
      },
      {
        element: '.tour-btn-video',
        popover: {
          title: '📱 Video App de Pasajeros',
          description:
            'Demostración de las pantallas de la aplicación móvil de pasajeros: tiempos de espera en parada, ocupación proyectada y alertas de servicio.',
          side: 'bottom',
          align: 'center',
        },
      },
      {
        element: '.tour-feed-indicator',
        popover: {
          title: '● Telemetría 5G Activa',
          description:
            'Estado de transmisión en tiempo real de los sensores IoT y aforo vehicular de la flota completa hacia la nube.',
          side: 'bottom',
          align: 'end',
        },
      },
    ],
  })

  driverObj.drive()
}
