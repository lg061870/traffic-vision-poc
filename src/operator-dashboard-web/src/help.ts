// What each card and panel means and how its number is calculated, shown by its "?" button.
// The formulas follow kpis.ts; where a text quotes a value (cost, senior share, thresholds) it is
// the one in use, so it stays right when the operator changes it under Supuestos.
import { defaultFare, fares, thresholds, type Assumptions } from './config/operatorSettings'
import { formatColones, loadGroups } from './kpis'

export interface HelpTopic {
  title: string
  /** What the number or chart tells the operator. */
  what: string
  /** How it is calculated, one step per line. */
  how: string[]
  /** Caveats: estimates, simulated data. */
  note?: string
}

export type HelpKey =
  | 'boardings'
  | 'revenue'
  | 'cost'
  | 'loss'
  | 'gauge'
  | 'hourly'
  | 'heatmap'
  | 'load'
  | 'routes'
  | 'period'
  | 'band'
  | 'inService'
  | 'onBoard'
  | 'occupancy'
  | 'source'
  | 'camera'
  | 'alerts'
  | 'busNow'

const percent = (share: number) => `${Math.round(share * 100)} %`

const fareList = () => {
  const values = [...new Set(Object.values(fares))].sort((a, b) => b - a)
  return values.map(formatColones).join(' o ') || formatColones(defaultFare)
}

export function helpTopic(key: HelpKey, assumptions: Assumptions): HelpTopic {
  const cost = formatColones(assumptions.costPerBusHour)
  const seniors = percent(assumptions.seniorShare)
  const breakEven = `costo por hora-bus (${cost}) ÷ (tarifa × (1 − ${seniors} de adultos mayores))`

  switch (key) {
    case 'boardings':
      return {
        title: 'Abordajes',
        what: 'Cuántas personas subieron a los buses en el día, con la ruta y la franja elegidas.',
        how: [
          'Suma de las personas que entraron por las puertas de cada bus, hora por hora.',
          'Horas-bus: el tiempo total que los buses estuvieron en servicio. Un bus durante una hora es una hora-bus; el tiempo estacionado no cuenta.',
          'Los buses que cuentan solo con la cámara de cabina no tienen contador de puertas: se sabe cuántos van a bordo, pero no cuántos subieron, así que no entran en esta suma.',
        ],
        note: 'Hoy los abordajes son simulados.',
      }
    case 'revenue':
      return {
        title: 'Ingreso estimado',
        what: 'Lo que pagaron, en teoría, las personas que abordaron.',
        how: [
          'Ingreso = abordajes × tarifa de su ruta × (1 − proporción de adultos mayores).',
          `Tarifas oficiales de ARESEP (RE-0115-IT-2026): ${fareList()} según la ruta.`,
          `Los adultos mayores viajan gratis; se supone que son el ${seniors} de los abordajes (se cambia en Supuestos).`,
        ],
        note: 'Es una estimación, no el recaudo real: no considera evasión ni otros pagos.',
      }
    case 'cost':
      return {
        title: 'Costo de operación',
        what: 'Lo que cuesta tener los buses en la calle durante el tiempo que estuvieron en servicio.',
        how: [
          `Costo = horas-bus en servicio × ${cost} por hora-bus.`,
          'El costo por hora-bus incluye combustible, chofer, mantenimiento y llantas, compra del bus, seguros y permisos, y administración.',
        ],
        note: 'El costo por hora-bus es una estimación del equipo (rango ₡10 500–16 550) hasta que el operador dé su cifra; se cambia en Supuestos.',
      }
    case 'loss':
      return {
        title: 'Pérdida en horas bajo equilibrio',
        what: 'Cuánto se perdió en las horas en que un bus no llevó suficientes pasajeros para pagar su costo.',
        how: [
          'Para cada bus y cada hora: ingreso estimado de esa hora contra su costo de operación.',
          'Si el ingreso no cubrió el costo, la diferencia se suma aquí. Las horas que sí cubrieron su costo no restan.',
          'Horas-bus: cuántas de esas horas no cubrieron su costo.',
        ],
        note: 'No es el ahorro de recortar esos viajes: recortar ahorra combustible y mantenimiento, pero no necesariamente el chofer ni el bus. Usa el ingreso y el costo estimados.',
      }
    case 'gauge':
      return {
        title: 'Abordajes por hora-bus',
        what: 'Cuántas personas sube un bus, en promedio, por cada hora en servicio, y si alcanza para pagar su costo.',
        how: [
          'Abordajes por hora-bus = abordajes ÷ horas-bus en servicio.',
          `Equilibrio = ${breakEven}: los abordajes por hora que un bus necesita para cubrir su costo.`,
          'Con varias rutas se usa la tarifa promedio de los abordajes.',
          'Rojo: debajo del equilibrio. Amarillo: hasta 15 % por encima. Verde: más arriba.',
        ],
      }
    case 'hourly':
      return {
        title: '¿Qué horas pagan su costo?',
        what: 'Para cada hora del día, si los buses en servicio llevaron suficientes pasajeros para cubrir su costo.',
        how: [
          'Cada barra: abordajes ÷ horas-bus de esa hora (con la ruta elegida).',
          'Línea punteada: el equilibrio del día.',
          'Verde: la hora cubrió su costo. Rojo: no lo cubrió.',
          'Las horas fuera de la franja elegida se ven tenues.',
        ],
      }
    case 'heatmap':
      return {
        title: 'Ruta × hora',
        what: 'Dónde y cuándo se gana o se pierde dinero: cada fila es una ruta y cada columna una hora del día.',
        how: [
          'Cada celda: abordajes por hora-bus de esa ruta en esa hora, comparados con el equilibrio de la ruta (que depende de su tarifa).',
          'Rojo fuerte: menos del 70 % del equilibrio. Rojo claro: entre 70 % y 100 %. Verde claro: entre 100 % y 140 %. Verde: más del 140 %.',
          'Gris: la ruta no tuvo buses en servicio a esa hora.',
          'Toque una ruta para filtrar todo el panel.',
        ],
      }
    case 'load':
      return {
        title: 'Tiempo por nivel de ocupación',
        what: 'Qué tan llenos anduvieron los buses de cada ruta durante su tiempo en servicio.',
        how: [
          'Ocupación = pasajeros a bordo ÷ capacidad del bus, medida cada pocos segundos.',
          `Cada barra reparte el tiempo en servicio de la ruta en: ${loadGroups.map((g) => `${g.label.toLowerCase()} (${g.range})`).join(', ')}.`,
          'Mucho tiempo casi vacío sugiere exceso de buses; mucho tiempo saturado, falta de buses.',
        ],
      }
    case 'routes':
      return {
        title: 'Rutas',
        what: 'Filtra todo el panel a una ruta. "Toda la flota" quita el filtro.',
        how: [
          'En Rentabilidad, el número de cada ruta son sus abordajes por hora-bus en la franja elegida: verde si supera el equilibrio de la ruta, rojo si no. Sirve de ranking.',
          'En En vivo, el número son los buses de la ruta en servicio en este momento.',
        ],
      }
    case 'period':
      return {
        title: 'Franja',
        what: 'Limita los indicadores de Rentabilidad a una parte del día.',
        how: ['Hora pico: de 6:00 a 9:00 y de 16:00 a 19:00.', 'Valle: el resto de las horas de servicio.'],
      }
    case 'band':
      return {
        title: 'Buses por nivel de ocupación',
        what: 'Cuántos buses en servicio van en cada nivel de ocupación en este momento.',
        how: [
          'Ocupación = pasajeros a bordo ÷ capacidad, del último reporte de cada bus (cada 5 s).',
          'Niveles del estándar GTFS-Realtime: vacío (0 pasajeros), muchos asientos (< 50 %), pocos asientos (50–79 %), solo de pie (80–94 %), muy lleno (95–99 %) y lleno (100 % o más).',
          'Los colores son los mismos de los buses en el mapa.',
        ],
      }
    case 'inService':
      return {
        title: 'Buses en servicio',
        what: 'Cuántos buses están haciendo un viaje ahora, del total de la flota.',
        how: [
          'En servicio: tiene un viaje asignado y reportó en el último minuto.',
          'Estacionados: reportan, pero no tienen viaje.',
          'Sin reporte: más de 60 segundos sin enviar datos.',
        ],
      }
    case 'onBoard':
      return {
        title: 'Pasajeros a bordo',
        what: 'Cuántas personas van en los buses en servicio en este momento.',
        how: ['Suma de los pasajeros a bordo del último reporte de cada bus en servicio.'],
      }
    case 'occupancy':
      return {
        title: 'Ocupación',
        what: 'Qué tan llena va la flota en servicio en este momento.',
        how: ['Ocupación = pasajeros a bordo ÷ capacidad total de los buses en servicio.'],
      }
    case 'source':
      return {
        title: 'Fuente del conteo',
        what: 'De dónde sale el número de pasajeros de cada bus en servicio.',
        how: [
          'Cámara IA: el modelo de visión cuenta a las personas en la cámara de cabina.',
          'Contador de puerta: un sensor cuenta quién sube y quién baja.',
          'Simulado: el simulador de la demostración.',
        ],
        note: 'Hoy solo SJB-10662 cuenta con la cámara; el resto de la flota es simulada.',
      }
    case 'camera':
      return {
        title: 'Cámara a bordo',
        what: 'Lo que ve la cámara de cabina y lo que el modelo de visión detecta en ella.',
        how: [
          'Cajas rosadas: personas sentadas. Cajas moradas: personas de pie. Las detecta el modelo RF-DETR.',
          'En SJB-10662, la computadora a bordo envía solo esas detecciones (nunca el video) y la API cuenta la mediana de cada 10 segundos.',
          'Por eso el conteo enviado puede ir hasta 10 segundos detrás de las cajas.',
        ],
        note: 'Es una grabación ya analizada que se repite, no video en vivo; en un bus real el modelo corre en vivo. La cámara frontal cubre parte de la cabina.',
      }
    case 'alerts':
      return {
        title: 'Alertas',
        what: 'Buses que necesitan atención en este momento. Toque una alerta para ver sus buses.',
        how: [
          `Saturados: ocupación de ${thresholds.crowdedPercent} % o más.`,
          `Casi vacíos: en servicio con menos de ${thresholds.nearlyEmptyPercent} % de ocupación.`,
          `Agrupados: dos buses de la misma ruta y sentido a menos de ${thresholds.bunchingMeters} m; después de ellos suele venir un hueco largo sin bus.`,
          'Sin reporte: más de 60 segundos sin enviar datos.',
        ],
      }
    case 'busNow':
      return {
        title: 'Ocupación ahora',
        what: 'Cuántas personas lleva este bus en este momento.',
        how: [
          'Pasajeros a bordo ÷ capacidad del bus, de su último reporte.',
          `El equilibrio de este bus: ${breakEven}, con la tarifa de su ruta.`,
        ],
      }
  }
}
