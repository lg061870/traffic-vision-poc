import { useEffect, useState } from 'react'
import type { Period } from '../kpis'

// What is on screen lives in the URL hash (#/rentabilidad?ruta=R142-01&franja=pico&bus=SJB-10662),
// so a link opens exactly the view it was copied from and the browser's back button works.
export type Tab = 'profit' | 'live'

export interface ViewState {
  tab: Tab
  /** Filters both tabs to one route; null is the whole fleet. */
  routeId: string | null
  /** Filters the profitability tab to rush hours or off-peak hours. */
  period: Period
  /** The bus whose detail panel is open. */
  vehicleId: string | null
}

const tabPaths: Record<Tab, string> = { profit: 'rentabilidad', live: 'en-vivo' }
const periodNames: Record<Period, string | null> = { all: null, peak: 'pico', offpeak: 'valle' }

export function parseHash(hash: string): ViewState {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?')
  const params = new URLSearchParams(query)
  const [first, second] = path.split('/')
  // Links from the first version (#/bus/SJB-10662, #/ruta/R142) still open the right view.
  const legacyBus = first === 'bus' && second ? decodeURIComponent(second) : null
  const legacyRoute = first === 'ruta' && second ? decodeURIComponent(second) : null
  const franja = params.get('franja')
  return {
    tab: first === 'en-vivo' || legacyBus ? 'live' : 'profit',
    routeId: params.get('ruta') ?? legacyRoute,
    period: franja === 'pico' ? 'peak' : franja === 'valle' ? 'offpeak' : 'all',
    vehicleId: params.get('bus') ?? legacyBus,
  }
}

export function hrefOf(state: ViewState) {
  const params = new URLSearchParams()
  if (state.routeId) params.set('ruta', state.routeId)
  const franja = periodNames[state.period]
  if (franja) params.set('franja', franja)
  if (state.vehicleId) params.set('bus', state.vehicleId)
  const query = params.toString()
  return `#/${tabPaths[state.tab]}${query ? `?${query}` : ''}`
}

export function useHashRoute() {
  const [state, setState] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const update = () => setState(parseHash(window.location.hash))
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])

  const navigate = (change: Partial<ViewState>) => {
    window.location.hash = hrefOf({ ...parseHash(window.location.hash), ...change })
  }
  return { state, navigate }
}
