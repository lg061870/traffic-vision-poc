// The day's profitability explained in plain Spanish, for the fleet or the selected route and time
// of day: built from the same totals the cards and charts show, so the words always match them.
import type { Assumptions } from './config/operatorSettings'
import { shortName } from './hooks/useRoutes'
import { costaRicaHour, formatColones, formatColonesShort, formatOne, groupBy, inPeriod, rowsInPeriod, totals, type Period, type UsageRow } from './kpis'

interface NarrativeInput {
  /** The selected route's rows (or the whole fleet's), every hour of the day. */
  rows: UsageRow[]
  /** Null for the whole fleet. */
  routeName: string | null
  period: Period
  dayLabel: 'hoy' | 'ayer'
  assumptions: Assumptions
}

/** "la Ruta 142", "el Ramal Cascajal", "la flota". */
function subject(routeName: string | null) {
  if (!routeName) return 'la flota'
  const name = shortName(routeName)
  return name.startsWith('Ruta') ? `la ${name}` : name.startsWith('Ramal') ? `el ${name}` : name
}

/** "de" + subject, with the contraction: "del Ramal Cascajal", "de la flota". */
const ofSubject = (who: string) => (who.startsWith('el ') ? `del ${who.slice(3)}` : `de ${who}`)

const periodPhrase: Record<Period, string> = { all: '', peak: ' en hora pico', offpeak: ' en las horas valle' }

const clock = (hour: number) => `${hour % 24}:00`

/**
 * Consecutive hours of one kind as "entre las 5:00 y las 9:00"; a run that reaches the latest hour
 * of today reads "a partir de las 9:00".
 */
function ranges(hours: number[], lastHour: number, ongoing: boolean) {
  const runs: [number, number][] = []
  for (const hour of hours) {
    const run = runs[runs.length - 1]
    if (run && hour === run[1] + 1) run[1] = hour
    else runs.push([hour, hour])
  }
  const parts = runs.map(([first, last]) =>
    ongoing && last === lastHour ? `a partir de las ${clock(first)}` : `entre las ${clock(first)} y las ${clock(last + 1)}`)
  return parts.length <= 1 ? parts.join('') : `${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`
}

export function buildNarrative({ rows, routeName, period, dayLabel, assumptions }: NarrativeInput): string[] {
  const scoped = rowsInPeriod(rows, period)
  const t = totals(scoped, assumptions)
  const who = subject(routeName)
  const ongoing = dayLabel === 'hoy'
  const day = ongoing ? 'Hoy' : 'Ayer'
  const inFavor = ongoing ? 'opera con saldo a favor' : 'operó con saldo a favor'
  const inRed = ongoing ? 'está en números rojos' : 'cerró en números rojos'

  if (t.measuredHours < 0.05) {
    return [`${day} ${who}${periodPhrase[period]} todavía no tiene horas en servicio con abordajes contados.`]
  }

  // Each hour of the day, judged against the day's break-even, like the "¿Qué horas pagan su costo?" chart.
  const byHour = [...groupBy(scoped, (row) => costaRicaHour(row.usage.hour)).entries()]
    .map(([hour, hourRows]) => ({ hour, ...totals(hourRows, assumptions) }))
    .filter((h) => h.measuredHours >= 0.05 && inPeriod(h.hour, period))
    .sort((a, b) => a.hour - b.hour)
  const lastHour = byHour[byHour.length - 1].hour
  const goodHours = byHour.filter((h) => h.ridersPerBusHour >= t.breakEven).map((h) => h.hour)
  const badHours = byHour.filter((h) => h.ridersPerBusHour < t.breakEven).map((h) => h.hour)
  const good = ranges(goodHours, lastHour, ongoing)
  const bad = ranges(badHours, lastHour, ongoing)

  const above = t.ridersPerBusHour >= t.breakEven
  let streak = 0
  for (let i = byHour.length - 1; i >= 0 && byHour[i].ridersPerBusHour < t.breakEven; i--) streak++
  const trend = ongoing && above && streak >= 2
    ? ' Si esta tendencia continúa, el promedio diario irá bajando hasta acercarse al punto de equilibrio.'
    : ''

  const net = t.revenue - t.cost
  const money = formatColonesShort
  const paragraphs: string[] = []

  // 1. The result: revenue against cost.
  paragraphs.push(net >= 0
    ? `${day} ${who}${periodPhrase[period]} ${inFavor}: los ingresos estimados (${money(t.revenue)}) superan los costos de operación (${money(t.cost)}) por ${money(net)}.`
    : `${day} ${who}${periodPhrase[period]} ${inRed}: los costos (${money(t.cost)}) superan los ingresos (${money(t.revenue)}) por ${money(-net)}.`)

  // 2. What the result hides: what the profitable bus-hours added and the others took away, and
  // which hours of the day held up.
  let contrast: string
  if (t.loss <= 0) {
    contrast = 'Todas las horas-bus lograron cubrir sus costos.'
  } else if (t.gain <= 0) {
    contrast = 'Ninguna hora-bus logró cubrir sus costos: en todas, los buses llevaron menos pasajeros de los necesarios para pagar su operación.'
  } else if (net >= 0) {
    contrast = `Sin embargo, ese balance esconde un contraste: las horas-bus rentables sumaron ${money(t.gain)}, mientras que las deficitarias restaron ${money(t.loss)}.`
  } else {
    contrast = `Las horas-bus que lograron cubrir costos apenas aportaron ${money(t.gain)}, insuficiente para cubrir los ${money(t.loss)} que se perdieron en las horas con baja demanda.`
  }
  if (goodHours.length && badHours.length) {
    contrast += ` Al ver el detalle por hora, los buses mantuvieron un promedio sostenible ${good}, pero cayeron en rojo ${bad}.${trend}`
  }
  paragraphs.push(contrast)

  // 3. The average against break-even.
  const lead: Record<Period, string> = {
    all: ongoing ? 'En lo que va del día' : 'En el día',
    peak: 'En hora pico',
    offpeak: 'En las horas valle',
  }
  const clearly = t.ridersPerBusHour >= t.breakEven * 1.25 ? 'con claridad ' : ''
  paragraphs.push(above
    ? `${lead[period]}, el rendimiento ${ofSubject(who)} es positivo: el promedio de ${formatOne(t.ridersPerBusHour)} abordajes por hora-bus supera ${clearly}el punto de equilibrio fijado en ${formatOne(t.breakEven)}.`
    : `${lead[period]}, el rendimiento ${ofSubject(who)} es negativo: el promedio de ${formatOne(t.ridersPerBusHour)} abordajes por hora-bus no alcanza el punto de equilibrio fijado en ${formatOne(t.breakEven)}.`)

  // 4. Where the opportunity is.
  if (t.loss > 0 && badHours.length) {
    paragraphs.push(`La oportunidad está ${bad}: hay más buses de los que piden los pasajeros. Con menos buses en esas horas, los mismos pasajeros llenan mejor cada bus y se recupera parte de los ${money(t.loss)} perdidos.`)
  }

  paragraphs.push(`Cifras estimadas con las tarifas de ARESEP y un costo de ${formatColones(assumptions.costPerBusHour)} por hora-bus (ver Supuestos). Datos simulados.`)
  return paragraphs
}
