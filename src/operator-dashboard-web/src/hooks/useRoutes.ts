import { useEffect, useState } from 'react'
import type { FeatureCollection } from 'geojson'
// Static reference data: the Occupancy API does not serve routes.
import routesUrl from '../../../../data/routes/coronado-routes-osm.geojson?url'

export interface RouteInfo {
  routeId: string
  name: string
}

export function useRoutes() {
  const [geojson, setGeojson] = useState<FeatureCollection | null>(null)
  useEffect(() => {
    fetch(routesUrl)
      .then((response) => response.json())
      .then(setGeojson)
      .catch(() => setGeojson(null))
  }, [])

  const names = new Map<string, string>()
  for (const feature of geojson?.features ?? []) {
    const { routeId, name } = feature.properties ?? {}
    if (routeId) names.set(routeId, name ?? routeId)
  }
  return { geojson, names }
}

/** "Ruta 142 · San José – San Isidro de Coronado" → "Ruta 142"; feeder names are already short. */
export function shortName(name: string) {
  return name.split(' · ')[0]
}
