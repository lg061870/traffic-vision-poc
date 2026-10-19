import { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import type { FeatureCollection, LineString } from 'geojson'
import type { VehicleState } from '../types/occupancy'

interface BusBunchingDiagramProps {
  routes: FeatureCollection | null
  vehicles: VehicleState[]
  routeId?: string | null
  activeVehicleId?: string | null
  onSelectVehicle: (vehicleId: string) => void
  registry?: Map<string, string | null>
  isFullScreen?: boolean
}

interface FeederBranchConfig {
  id: string
  name: string
  dest: string
  km: number
  buses: number
  color: string
  y: number
  endX: number
  intermediateStops: { name: string; pct: number }[]
}

interface LiveCorridorBus {
  vehicle: VehicleState
  vehicleId: string
  lat: number
  lon: number
  section: string
  direction: 'INBOUND' | 'OUTBOUND'
  isInbound: boolean
  stationIdNear: number
  x: number
  y: number
  baseX: number
  baseY: number
  km: number
  progressPct: number
  paxCount: number
  capacity: number
  occupancyPct: number
  inService: boolean
  speedKmh: number
  isOvernightDepot: boolean
}

interface HeadwayLink {
  leadBus: LiveCorridorBus
  trailBus: LiveCorridorBus
  gapKm: number
  headwayMinutes: number
  status: 'bunched' | 'warning' | 'gap' | 'regular'
  stationId: number
  centerX: number
  centerY: number
  direction: 'INBOUND' | 'OUTBOUND'
  tier: number
}

// Official CTP Trunk Stations (San José ➔ Coronado Centro)
const trunkStations = [
  { id: 1, name: 'San José', sub: 'P. Central / C.3', km: 0.0 },
  { id: 2, name: 'Calderón G.', sub: 'Hospital', km: 0.9 },
  { id: 3, name: 'Calle Blancos', sub: 'Montelimar', km: 1.8 },
  { id: 4, name: 'Guadalupe', sub: 'Centro / Parque', km: 3.2 },
  { id: 5, name: 'El Alto', sub: 'Galerón Ofertas', km: 5.8 },
  { id: 6, name: 'Ipís', sub: 'Fátima', km: 7.4 },
  { id: 7, name: 'San Antonio', sub: 'Centro', km: 9.1 },
  { id: 8, name: 'Terminal Central', sub: 'Hub Coronado', km: 11.33, isHub: true },
]

// Intermediate bus stops along Trunk 142 (with stacked 2-line street-side naming)
const trunkIntermediateStops = [
  { stationId: 2, line1SJ: 'Hospital', line2SJ: 'Calderón G.', line1Coro: 'Hospital', line2Coro: 'Calderón G.' },
  { stationId: 3, line1SJ: 'Montelimar', line2SJ: 'Calle Blancos', line1Coro: 'Calle Blancos', line2Coro: 'Centro' },
  { stationId: 4, line1SJ: 'Parque', line2SJ: 'Guadalupe', line1Coro: 'Guadalupe', line2Coro: 'Centro' },
  { stationId: 5, line1SJ: 'El Alto', line2SJ: 'Ofertas', line1Coro: 'Galerón', line2Coro: 'Ofertas' },
  { stationId: 6, line1SJ: 'Fátima', line2SJ: 'Iglesia', line1Coro: 'Entrada', line2Coro: 'Ipís' },
  { stationId: 7, line1SJ: 'San Antonio', line2SJ: 'Norte', line1Coro: 'San Antonio', line2Coro: 'Centro' },
]

// All 9 Official CTP Feeder Routes fanning out symmetrically from Terminal Central
// Evenly spaced at 50px increments centered around trunkY (252)
const feederBranches: FeederBranchConfig[] = [
  {
    id: 'R142-01',
    name: 'Cascajal',
    dest: 'Cascajal Retorno',
    km: 19.12,
    buses: 2,
    color: '#0284c7',
    y: 52,
    endX: 1110,
    intermediateStops: [
      { name: 'S. Jerónimo', pct: 0.35 },
      { name: 'Alto Palma', pct: 0.72 },
    ],
  },
  {
    id: 'R142-02',
    name: 'Las Nubes',
    dest: 'Las Nubes',
    km: 6.51,
    buses: 2,
    color: '#0d9488',
    y: 102,
    endX: 1110,
    intermediateStops: [
      { name: 'S. Isidro Alto', pct: 0.38 },
      { name: 'Montserrat', pct: 0.74 },
    ],
  },
  {
    id: 'R142-04',
    name: 'Patio de Agua',
    dest: 'Patio de Agua',
    km: 6.14,
    buses: 2,
    color: '#ca8a04',
    y: 152,
    endX: 1110,
    intermediateStops: [
      { name: 'Cruce S. Jerónimo', pct: 0.38 },
      { name: 'Quebrada Honda', pct: 0.74 },
    ],
  },
  {
    id: 'R142-07',
    name: 'San Pedro',
    dest: 'San Pedro',
    km: 1.43,
    buses: 1,
    color: '#9333ea',
    y: 202,
    endX: 1110,
    intermediateStops: [{ name: 'S. Pedro Centro', pct: 0.55 }],
  },
  {
    id: 'R142-03',
    name: 'Dulce Nombre',
    dest: 'Dulce Nombre',
    km: 1.83,
    buses: 2,
    color: '#16a34a',
    y: 252,
    endX: 1110,
    intermediateStops: [{ name: 'Los Cedros', pct: 0.55 }],
  },
  {
    id: 'R142-05',
    name: 'San Rafael',
    dest: 'San Rafael Retorno',
    km: 2.34,
    buses: 2,
    color: '#ea580c',
    y: 302,
    endX: 1110,
    intermediateStops: [{ name: 'S. Rafael Centro', pct: 0.55 }],
  },
  {
    id: 'R142-06',
    name: 'Patalillo',
    dest: 'Patalillo',
    km: 2.48,
    buses: 2,
    color: '#e11d48',
    y: 352,
    endX: 1110,
    intermediateStops: [{ name: 'Patalillo Norte', pct: 0.55 }],
  },
  {
    id: 'R142-09',
    name: 'San Francisco',
    dest: 'San Francisco',
    km: 2.57,
    buses: 1,
    color: '#0891b2',
    y: 402,
    endX: 1110,
    intermediateStops: [{ name: 'Corazón de Jesús', pct: 0.55 }],
  },
  {
    id: 'R142-08',
    name: 'El Rodeo',
    dest: 'El Rodeo',
    km: 3.78,
    buses: 1,
    color: '#475569',
    y: 452,
    endX: 1110,
    intermediateStops: [{ name: 'Rodeo Centro', pct: 0.55 }],
  },
]

const AVG_SPEED_KMH = 16.5
const BUNCHING_RED_THRESHOLD = 2.0
const BUNCHING_YELLOW_THRESHOLD = 3.0

function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export function BusBunchingDiagram({
  routes,
  vehicles,
  routeId,
  activeVehicleId,
  onSelectVehicle,
  registry,
  isFullScreen = false,
}: BusBunchingDiagramProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMaximized, setIsMaximized] = useState(isFullScreen)
  const [hoveredVehicleId, setHoveredVehicleId] = useState<string | null>(null)
  const [clickedVehicleId, setClickedVehicleId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'network' | 'approach'>('network')

  // Interactive Pan and Zoom State
  const svgRef = useRef<SVGSVGElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStartRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number; moved: boolean }>({
    clientX: 0,
    clientY: 0,
    panX: 0,
    panY: 0,
    moved: false,
  })

  const handleResetZoom = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const adjustZoom = useCallback((factor: number) => {
    setZoom((prevZoom) => {
      const nextZoom = Math.min(Math.max(Number((prevZoom * factor).toFixed(2)), 0.5), 4.0)
      if (Math.abs(nextZoom - prevZoom) < 0.001) return prevZoom
      const centerX = 630
      const centerY = 247.5
      setPan((prevPan) => {
        const scaleRatio = nextZoom / prevZoom
        return {
          x: centerX - (centerX - prevPan.x) * scaleRatio,
          y: centerY - (centerY - prevPan.y) * scaleRatio,
        }
      })
      return nextZoom
    })
  }, [])

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return

    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.87
    setZoom((prevZoom) => {
      const nextZoom = Math.min(Math.max(Number((prevZoom * zoomFactor).toFixed(2)), 0.5), 4.0)
      if (Math.abs(nextZoom - prevZoom) < 0.001) return prevZoom

      const ctm = svg.getScreenCTM()
      if (ctm) {
        const pt = svg.createSVGPoint()
        pt.x = e.clientX
        pt.y = e.clientY
        const svgP = pt.matrixTransform(ctm.inverse())

        setPan((prevPan) => {
          const scaleRatio = nextZoom / prevZoom
          const newPanX = svgP.x - (svgP.x - prevPan.x) * scaleRatio
          const newPanY = svgP.y - (svgP.y - prevPan.y) * scaleRatio
          return { x: newPanX, y: newPanY }
        })
      }
      return nextZoom
    })
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    svg.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      svg.removeEventListener('wheel', handleWheel)
    }
  }, [handleWheel])

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return // Left mouse button only
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Ignored
    }
    panStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      panX: pan.x,
      panY: pan.y,
      moved: false,
    }
    setIsPanning(true)
  }

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!isPanning) return
    const svg = svgRef.current
    if (!svg) return

    const dxScreen = e.clientX - panStartRef.current.clientX
    const dyScreen = e.clientY - panStartRef.current.clientY

    if (Math.hypot(dxScreen, dyScreen) > 4) {
      panStartRef.current.moved = true
    }

    const ctm = svg.getScreenCTM()
    const a = ctm ? ctm.a : 1
    const d = ctm ? ctm.d : 1

    setPan({
      x: panStartRef.current.panX + dxScreen / a,
      y: panStartRef.current.panY + dyScreen / d,
    })
  }

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (isPanning) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        // Ignored
      }
      setIsPanning(false)
    }
  }

  // Extract all routes polyline coordinates and cumulative km from geojson
  const allRoutesWithDistance = useMemo(() => {
    const map = new Map<string, { points: { lat: number; lon: number; cumKm: number }[]; totalKm: number }>()
    if (!routes) return map

    for (const feat of routes.features) {
      const routeId = feat.properties?.routeId
      if (!routeId || feat.geometry?.type !== 'LineString') continue
      const coords = (feat.geometry as LineString).coordinates.map(([lon, lat]) => ({ lat, lon }))
      if (coords.length < 2) continue

      let cumulative = 0
      const points = [{ ...coords[0], cumKm: 0 }]
      for (let i = 1; i < coords.length; i++) {
        const d = getDistanceKm(coords[i - 1].lat, coords[i - 1].lon, coords[i].lat, coords[i].lon)
        cumulative += d
        points.push({ ...coords[i], cumKm: cumulative })
      }
      map.set(routeId, { points, totalKm: cumulative })
    }
    return map
  }, [routes])

  const routePointsWithDistance = useMemo(() => {
    return allRoutesWithDistance.get('R142')?.points ?? []
  }, [allRoutesWithDistance])

  // Coordinate scales and layout positions: Perfectly centered horizontally and vertically
  const layout = useMemo(() => {
    const trunkY = 252
    const hubX = 720

    // Scale X positions for trunk stations 1 to 8 across the left half
    // Equal 40px left and right margins inside 1260px wide canvas
    const stationXs = [88, 178, 268, 368, 468, 560, 645, 720]

    const stationCoords: Record<number, { x: number; y: number }> = {}
    trunkStations.forEach((st, idx) => {
      stationCoords[st.id] = { x: stationXs[idx], y: trunkY }
    })

    const depot = {
      x: 520,
      y: 36,
      w: 180,
      h: 126,
    }

    // Spur track connects depot exit gate down into Terminal Central (Node 8)
    const spurPath = `M ${depot.x + depot.w - 18} ${depot.y + depot.h} Q ${hubX - 8} ${depot.y + depot.h + 38} ${hubX} ${trunkY - 14}`

    return {
      viewBox: '0 0 1260 495',
      trunkY,
      hubX,
      stationCoords,
      depot,
      spurPath,
      // Dual-rail feeder branch paths with turnaround loop at the end
      branches: feederBranches.map((b) => {
        const inboundPath = `M ${hubX} ${trunkY - 14} C ${hubX + 60} ${trunkY - 14}, ${hubX + 95} ${b.y - 4.5}, ${hubX + 150} ${b.y - 4.5} L ${b.endX} ${b.y - 4.5}`
        const outboundPath = `M ${hubX} ${trunkY + 14} C ${hubX + 60} ${trunkY + 14}, ${hubX + 95} ${b.y + 4.5}, ${hubX + 150} ${b.y + 4.5} L ${b.endX} ${b.y + 4.5}`
        const loopPath = `M ${b.endX} ${b.y + 4.5} A 4.5 4.5 0 0 0 ${b.endX} ${b.y - 4.5}`
        return {
          ...b,
          scaledEndX: b.endX,
          inboundPath,
          outboundPath,
          loopPath,
        }
      }),
    }
  }, [])

  // Map every active vehicle with GPS coordinates to the CTP Trunk + 9 Feeder branches
  const mappedBuses = useMemo(() => {
    const validVehicles = vehicles.filter((v) => v.location != null && !v.stale)
    if (validVehicles.length === 0) return []

    const preliminary: Omit<LiveCorridorBus, 'x' | 'y'>[] = []

    validVehicles.forEach((v) => {
      const lat = v.location!.lat
      const lon = v.location!.lon

      const assignedRoute = v.trip?.routeId ?? (registry ? registry.get(v.vehicleId) : null) ?? ''

      // Direction detection (Costa Rica right-hand traffic):
      // INBOUND: Coronado -> San José (moving leftwards, North lane: trunkY - 14, Feeder: b.y - 4.5)
      // OUTBOUND: San José -> Coronado (moving rightwards, South lane: trunkY + 14, Feeder: b.y + 4.5)
      const rawDir = v.trip?.direction ?? ((v.location?.headingDeg ?? 90) > 180 ? 'INBOUND' : 'OUTBOUND')
      const direction: 'INBOUND' | 'OUTBOUND' = rawDir === 'INBOUND' ? 'INBOUND' : 'OUTBOUND'
      const isInbound = direction === 'INBOUND'
      const isFeeder = assignedRoute.startsWith('R142-') && assignedRoute !== 'R142'

      let trackX = layout.stationCoords[1].x
      let trackY = layout.trunkY
      let nearestStationId = 8
      let section = 'trunk'
      let bestCumKm = 0
      let isOvernightDepot = false

      if (isFeeder) {
        // Feeder branch bus: dual-rail separation (inbound on top rail, outbound on bottom rail)
        section = assignedRoute
        const branchConfig = layout.branches.find((b) => b.id === assignedRoute) ?? layout.branches[0]
        const feederRouteData = allRoutesWithDistance.get(assignedRoute)
        const branchKm = feederRouteData?.totalKm || branchConfig.km || 1

        let bestFeederDist = Infinity
        let feederCumKm = 0

        if (feederRouteData && feederRouteData.points.length > 0) {
          feederRouteData.points.forEach((pt) => {
            const d = getDistanceKm(lat, lon, pt.lat, pt.lon)
            if (d < bestFeederDist) {
              bestFeederDist = d
              feederCumKm = pt.cumKm
            }
          })
        } else {
          // Fallback: straight-line distance from Terminal Central Coronado
          const dFromHub = getDistanceKm(lat, lon, 9.976073, -84.007282)
          feederCumKm = Math.min(branchKm, dFromHub)
        }

        bestCumKm = feederCumKm
        isOvernightDepot = (v.location?.speedKmh ?? 0) < 1.0 && feederCumKm <= 0.15 && v.trip === null

        if (isOvernightDepot) {
          section = 'depot'
          trackX = layout.depot.x + layout.depot.w / 2
          trackY = layout.depot.y + layout.depot.h / 2
        } else {
          const branchProgressPct = Math.min(1, Math.max(0, feederCumKm / branchKm))
          trackX = layout.hubX + 150 + branchProgressPct * (branchConfig.scaledEndX - (layout.hubX + 150))
          trackY = branchConfig.y + (isInbound ? -4.5 : 4.5)
        }
      } else {
        // Check distance along the trunk corridor
        let bestDist = Infinity

        if (routePointsWithDistance.length > 0) {
          routePointsWithDistance.forEach((pt) => {
            const d = getDistanceKm(lat, lon, pt.lat, pt.lon)
            if (d < bestDist) {
              bestDist = d
              bestCumKm = pt.cumKm
            }
          })
        } else {
          bestCumKm = 11.33
          bestDist = 0.1
        }

        // Check if unit is in overnight depot parking at Terminal Coronado
        const isNearCoronadoTerminal =
          Math.abs(lat - 9.976073) < 0.0035 && Math.abs(lon - -84.007282) < 0.0035
        isOvernightDepot =
          (v.location?.speedKmh ?? 0) < 1.0 && (isNearCoronadoTerminal || bestCumKm >= 11.2) && v.trip === null

        if (isOvernightDepot) {
          section = 'depot'
          trackX = layout.depot.x + layout.depot.w / 2
          trackY = layout.depot.y + layout.depot.h / 2
          nearestStationId = 8
        } else {
          // Trunk Route 142 bus: dual-lane separation
          // Sentido San José (North lane, y = trunkY - 14) vs Sentido Coronado (South lane, y = trunkY + 14)
          section = 'trunk'
          const progressPct = Math.max(0, Math.min(100, (bestCumKm / 11.33) * 100))
          const trunkStartX = layout.stationCoords[1].x
          trackX = trunkStartX + (progressPct / 100) * (layout.hubX - trunkStartX)
          trackY = isInbound ? layout.trunkY - 14 : layout.trunkY + 14

          let minDiff = Infinity
          trunkStations.forEach((st) => {
            const diff = Math.abs(st.km - bestCumKm)
            if (diff < minDiff) {
              minDiff = diff
              nearestStationId = st.id
            }
          })
        }
      }

      const branchCfg = isFeeder ? layout.branches.find((b) => b.id === assignedRoute) ?? layout.branches[0] : null
      const routeLength = isFeeder ? branchCfg?.km ?? 1 : 11.33

      preliminary.push({
        vehicle: v,
        vehicleId: v.vehicleId,
        lat,
        lon,
        section,
        direction,
        isInbound,
        stationIdNear: nearestStationId,
        baseX: Math.round(trackX),
        baseY: Math.round(trackY),
        km: Number(bestCumKm.toFixed(2)),
        progressPct: Number(((bestCumKm / routeLength) * 100).toFixed(1)),
        paxCount: v.occupancy?.passengerCount ?? 0,
        capacity: v.occupancy?.capacity ?? (isFeeder ? 50 : 90),
        occupancyPct: v.occupancy?.percent ?? 0,
        inService: v.trip !== null,
        speedKmh: v.location?.speedKmh ?? 0,
        isOvernightDepot,
      })
    })

    // Group buses to apply a clean non-overlapping slot offset
    const result: LiveCorridorBus[] = []
    const clusterMap = new Map<string, typeof preliminary>()

    preliminary.forEach((b) => {
      const clusterKey = `${b.section}-${b.isInbound ? 'in' : 'out'}-${Math.round(b.baseX / 22)}`
      const list = clusterMap.get(clusterKey) ?? []
      list.push(b)
      clusterMap.set(clusterKey, list)
    })

    clusterMap.forEach((cluster) => {
      const count = cluster.length
      cluster.forEach((b, idx) => {
        let slotOffsetX = 0
        let slotOffsetY = 0

        if (b.isOvernightDepot) {
          // Neat grid layout inside the Coronado Depot yard (8 cols x 5 rows)
          const cols = 8
          const row = Math.floor(idx / cols)
          const col = idx % cols
          slotOffsetX = layout.depot.x + 13 + col * 20 - b.baseX
          slotOffsetY = layout.depot.y + 30 + row * 18 - b.baseY
        } else if (count > 1) {
          slotOffsetX = (idx - (count - 1) / 2) * 16
        }

        result.push({
          ...b,
          x: Math.round(b.baseX + slotOffsetX),
          y: Math.round(b.baseY + slotOffsetY),
        })
      })
    })

    return result
  }, [vehicles, routes, allRoutesWithDistance, routePointsWithDistance, registry, layout])

  const enRouteBuses = useMemo(() => mappedBuses.filter((b) => !b.isOvernightDepot), [mappedBuses])
  const depotBuses = useMemo(() => mappedBuses.filter((b) => b.isOvernightDepot), [mappedBuses])

  // Single row when completely empty (or up to 8 buses), expands dynamically as more rows are needed (up to 5 rows for 40 stalls)
  const depotRows = useMemo(() => {
    return Math.max(1, Math.min(5, Math.ceil(depotBuses.length / 8)))
  }, [depotBuses.length])

  const dynamicDepotH = useMemo(() => {
    return 28 + depotRows * 18
  }, [depotRows])

  const dynamicSpurPath = useMemo(() => {
    const depotBottom = layout.depot.y + dynamicDepotH
    return `M ${layout.depot.x + layout.depot.w - 18} ${depotBottom} Q ${layout.hubX - 8} ${depotBottom + 28} ${layout.hubX} ${layout.trunkY - 14}`
  }, [layout, dynamicDepotH])

  // Calculate headways and detect bus bunching between consecutive units en-route on Trunk in the SAME direction
  const headwayLinks = useMemo(() => {
    const trunkEnRoute = enRouteBuses.filter((b) => b.section === 'trunk')
    const links: HeadwayLink[] = []

    const directions: ('INBOUND' | 'OUTBOUND')[] = ['OUTBOUND', 'INBOUND']
    directions.forEach((dir) => {
      const dirBuses = trunkEnRoute
        .filter((b) => b.direction === dir)
        .sort((a, b) => (dir === 'OUTBOUND' ? a.km - b.km : b.km - a.km))

      let lastCenterX = -999
      let lastTier = 0

      for (let i = 0; i < dirBuses.length - 1; i++) {
        const bA = dirBuses[i]
        const bB = dirBuses[i + 1]
        const gapKm = Math.abs(bB.km - bA.km)
        const headwayMinutes = Number(((gapKm / AVG_SPEED_KMH) * 60).toFixed(1))

        let status: 'bunched' | 'warning' | 'gap' | 'regular' = 'regular'
        if (headwayMinutes <= BUNCHING_RED_THRESHOLD) {
          status = 'bunched' // Red: under or equal 2.0 min
        } else if (headwayMinutes <= BUNCHING_YELLOW_THRESHOLD) {
          status = 'warning' // Yellow: between 2.1 and 3.0 min
        } else if (headwayMinutes > 12.0) {
          status = 'gap'
        }

        const cX = Math.round((bA.x + bB.x) / 2)
        let tier = 0
        if (Math.abs(cX - lastCenterX) < 32) {
          tier = lastTier === 0 ? 1 : 0
        }
        lastCenterX = cX
        lastTier = tier

        links.push({
          leadBus: bA,
          trailBus: bB,
          gapKm: Number(gapKm.toFixed(2)),
          headwayMinutes,
          status,
          stationId: bA.stationIdNear,
          centerX: cX,
          centerY: Math.round((bA.y + bB.y) / 2),
          direction: dir,
          tier,
        })
      }
    })

    return links
  }, [enRouteBuses])

  const bunchedLinks = headwayLinks.filter((l) => l.status === 'bunched')
  const warningLinks = headwayLinks.filter((l) => l.status === 'warning')
  const totalBunched = bunchedLinks.length
  const totalWarning = warningLinks.length

  return (
    <div
      className={`bunching-radar-container ${isFullScreen ? 'is-fullscreen-view' : ''} ${isMaximized && isExpanded ? 'is-maximized' : ''} ${!isExpanded ? 'is-collapsed' : ''}`}
      style={{ userSelect: 'none' }}
    >
      {/* Header Bar */}
      <div
        className="bunching-header-bar"
        onClick={() => {
          if (isFullScreen) return
          if (isMaximized) {
            setIsMaximized(false)
          } else {
            setIsExpanded((v) => !v)
          }
        }}
      >
        <div className="bunching-header-left">
          <span className="bunching-radar-icon">📈</span>
          <div className="bunching-title-group">
            <strong>Radar de Confluencia & Bunching</strong>
            {isExpanded && <span className="bunching-title-sub">· Concesión CTP Ruta 142</span>}
            {isExpanded && (
              <span className="bunching-bus-count">
                ({mappedBuses.length} unidades · {enRouteBuses.length} en corredor · {depotBuses.length} en depot)
              </span>
            )}
          </div>
        </div>

        <div className="bunching-header-right" onClick={(e) => e.stopPropagation()}>
          {totalBunched > 0 ? (
            <span
              className="bunching-badge badge-warning"
              style={{ background: '#fee2e2', color: '#b91c1c', borderColor: '#ef4444' }}
            >
              ⚠️ {isExpanded ? `${totalBunched} ${totalBunched === 1 ? 'Pelotón Crítico (≤ 2.0 min)' : 'Pelotones Críticos (≤ 2.0 min)'}` : `${totalBunched} Pelotón`}
            </span>
          ) : totalWarning > 0 ? (
            <span
              className="bunching-badge badge-warning"
              style={{ background: '#fef3c7', color: '#b45309', borderColor: '#f59e0b' }}
            >
              🟡 {isExpanded ? `${totalWarning} ${totalWarning === 1 ? 'En Riesgo (2.1 - 3.0 min)' : 'En Riesgo (2.1 - 3.0 min)'}` : `${totalWarning} en Riesgo`}
            </span>
          ) : (
            <span className="bunching-badge badge-good">
              {isExpanded ? '✓ Intervalo Regular (Estable > 3 min)' : '✓ Estable'}
            </span>
          )}

          {!isFullScreen && (
            <button
              type="button"
              className="bunching-action-btn"
              title={isMaximized ? 'Restaurar tamaño (Minimizar)' : 'Maximizar vista'}
              onClick={() => {
                if (isMaximized) {
                  setIsMaximized(false)
                  setIsExpanded(true)
                } else {
                  setIsMaximized(true)
                  setIsExpanded(true)
                }
              }}
            >
              {isMaximized ? '❐' : '⛶'}
            </button>
          )}

          {!isFullScreen && (
            <button
              type="button"
              className="bunching-toggle-btn"
              title={isExpanded ? 'Colapsar panel' : 'Expandir panel'}
              onClick={() => {
                if (isMaximized) {
                  setIsMaximized(false)
                }
                setIsExpanded((v) => !v)
              }}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="bunching-body">
          {/* Controls Bar */}
          <div className="bunching-viewmode-bar">
            <span className="bunching-dir-label">Estructura Oficial CTP (Troncal 142 + 9 Ramales Alimentadores):</span>
            <div className="bunching-dir-tabs">
              <button
                type="button"
                className={`bunching-tab ${viewMode === 'network' ? 'active' : ''}`}
                onClick={() => setViewMode('network')}
              >
                (a) Red Oficial Concesión & Flota
              </button>
              <button
                type="button"
                className={`bunching-tab ${viewMode === 'approach' ? 'active' : ''}`}
                onClick={() => setViewMode('approach')}
              >
                (b) Intervalos de Espera w(t)
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="bunching-kpi-bar">
            <span className="bunching-kpi-chip">
              <span className="bunching-kpi-dot" style={{ background: '#1d4ed8' }}></span>
              Flota Total Concesión: <strong>{mappedBuses.length} buses</strong>
            </span>
            <span className="bunching-kpi-chip">
              <span className="bunching-kpi-dot" style={{ background: '#10b981' }}></span>
              En Corredor Activo: <strong>{enRouteBuses.length}</strong>
            </span>
            <span className="bunching-kpi-chip">
              <span className="bunching-kpi-dot" style={{ background: '#f59e0b' }}></span>
              En Depot: <strong>{depotBuses.length}</strong>
            </span>
            <span className="bunching-kpi-chip">
              <span
                className="bunching-kpi-dot"
                style={{ background: totalBunched > 0 ? '#ef4444' : totalWarning > 0 ? '#f59e0b' : '#10b981' }}
              ></span>
              Pelotones Troncal: <strong>{totalBunched}</strong>
              {totalWarning > 0 && (
                <span style={{ marginLeft: '4px', fontSize: '10.5px', color: '#b45309' }}>
                  ({totalWarning} en riesgo)
                </span>
              )}
            </span>
            <span style={{ marginLeft: 'auto', fontSize: '10.5px', color: '#64748b' }}>
              Base Operativa: <strong>Depot Coronado (Overnight / Pernocta)</strong>
            </span>
          </div>

          {/* SVG Diagram Canvas: Symmetrically Centered Horizontally and Vertically with Pan & Zoom */}
          <div className="network-svg-wrap">
            <svg
              ref={svgRef}
              viewBox={layout.viewBox}
              className={`network-bunching-svg ${isPanning ? 'is-panning' : ''}`}
              preserveAspectRatio="xMidYMid meet"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onDoubleClick={handleResetZoom}
              onClick={() => {
                if (panStartRef.current.moved) return
                setClickedVehicleId(null)
              }}
              style={{
                cursor: isPanning ? 'grabbing' : 'grab',
                touchAction: 'none',
              }}
            >
              <defs>
                <filter id="glowCyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#06b6d4" floodOpacity="0.95" />
                </filter>
                <filter id="glowRed" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#ef4444" floodOpacity="0.85" />
                </filter>
                <filter id="glowYellow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#f59e0b" floodOpacity="0.85" />
                </filter>
              </defs>

              {/* Pan & Zoom Transformed Container */}
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {/* 1. Header Titles (Aligned symmetrically above left and right corridors) */}
              <text x={layout.stationCoords[1].x} y="28" className="svg-section-title" fill="#1d4ed8" fontWeight="900" fontSize="12">
                TRONCAL 142 · San José (Parque Central) ➔ Coronado Centro (11.33 km · 24 buses)
              </text>
              <text x={layout.hubX + 25} y="28" className="svg-section-title" fill="#1e293b" fontWeight="900" fontSize="12">
                9 RAMALES ALIMENTADORES · RETORNO A TERMINAL CENTRAL (15 buses)
              </text>

              {/* 2. Depot Facility Container */}
              <g className="depot-facility-bay">
                {/* Yard apron background (expands row by row as buses enter, single row when empty) */}
                <rect
                  x={layout.depot.x}
                  y={layout.depot.y}
                  width={layout.depot.w}
                  height={dynamicDepotH}
                  rx="8"
                  fill="#f8fafc"
                  stroke="#94a3b8"
                  strokeWidth="1.4"
                  style={{ transition: 'height 0.35s ease' }}
                />
                {/* Header banner */}
                <rect
                  x={layout.depot.x}
                  y={layout.depot.y}
                  width={layout.depot.w}
                  height="26"
                  rx="8"
                  fill="#0f172a"
                />
                <rect
                  x={layout.depot.x}
                  y={layout.depot.y + 18}
                  width={layout.depot.w}
                  height="8"
                  fill="#0f172a"
                />
                {/* Short, bold Title */}
                <text
                  x={layout.depot.x + 12}
                  y={layout.depot.y + 17.5}
                  fontSize="11"
                  fontWeight="900"
                  fill="#f8fafc"
                >
                  🏢 Depot
                </text>
                {/* Fleet count pill */}
                <rect
                  x={layout.depot.x + layout.depot.w - 56}
                  y={layout.depot.y + 5}
                  width="48"
                  height="16"
                  rx="3.5"
                  fill="#1e293b"
                  stroke="#38bdf8"
                  strokeWidth="1"
                />
                <text
                  x={layout.depot.x + layout.depot.w - 32}
                  y={layout.depot.y + 16}
                  textAnchor="middle"
                  fontSize="8.5"
                  fontWeight="900"
                  fill="#38bdf8"
                >
                  {depotBuses.length} buses
                </text>

                {/* Designated parking stalls (8 cols x depotRows; single row when empty) */}
                {Array.from({ length: depotRows * 8 }).map((_, idx) => {
                  const col = idx % 8
                  const row = Math.floor(idx / 8)
                  const slotX = layout.depot.x + 13 + col * 20
                  const slotY = layout.depot.y + 30 + row * 18
                  return (
                    <rect
                      key={`stall-${idx}`}
                      x={slotX - 9}
                      y={slotY - 7}
                      width="18"
                      height="14"
                      rx="2"
                      fill="#f1f5f9"
                      stroke="#cbd5e1"
                      strokeWidth="0.8"
                      strokeDasharray="2.5 2"
                    />
                  )
                })}
              </g>

              {/* 3. Service Access Spur Track linking Depot to Terminal Central Hub */}
              <g className="depot-spur-connection">
                <path
                  d={dynamicSpurPath}
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2.8"
                  strokeDasharray="5 3.5"
                  style={{ transition: 'd 0.35s ease' }}
                />
                <text
                  x={layout.depot.x + layout.depot.w - 12}
                  y={layout.depot.y + dynamicDepotH + 22}
                  fontSize="8"
                  fontWeight="800"
                  fill="#475569"
                  textAnchor="end"
                  style={{ transition: 'y 0.35s ease' }}
                >
                  Acceso al Depot ➔
                </text>
              </g>

              {/* 4. Dual-Direction Trunk Corridor (Costa Rica Right-Hand Driving) */}
              {/* North Lane: Sentido San José (Retorno, y = trunkY - 14) */}
              <path
                d={`M ${layout.stationCoords[1].x} ${layout.trunkY - 14} L ${layout.hubX} ${layout.trunkY - 14}`}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="4.5"
                strokeLinecap="round"
                opacity="0.92"
              />
              <text x="320" y={layout.trunkY - 19} fontSize="7.8" fontWeight="900" fill="#2563eb" textAnchor="middle">
                ◀ ◀ Sentido San José (Retorno)
              </text>

              {/* Median separator */}
              <path
                d={`M ${layout.stationCoords[1].x} ${layout.trunkY} L ${layout.hubX} ${layout.trunkY}`}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeDasharray="5 5"
              />

              {/* South Lane: Sentido Coronado Centro (Ida, y = trunkY + 14) */}
              <path
                d={`M ${layout.stationCoords[1].x} ${layout.trunkY + 14} L ${layout.hubX} ${layout.trunkY + 14}`}
                fill="none"
                stroke="#1d4ed8"
                strokeWidth="4.5"
                strokeLinecap="round"
                opacity="0.95"
              />
              <text x="320" y={layout.trunkY + 27} fontSize="7.8" fontWeight="900" fill="#1d4ed8" textAnchor="middle">
                Sentido Coronado Centro (Ida) ▶ ▶
              </text>

              {/* 5. Stacked Bus Stops along Trunk (Positioned on the physical street curb side) */}
              {trunkIntermediateStops.map((st) => {
                const pos = layout.stationCoords[st.stationId]
                return (
                  <g key={`stop-group-${st.stationId}`} className="trunk-curb-stops">
                    {/* (a) North Curb Stop: Sentido San José (doors on right, placed on North side) */}
                    <g transform={`translate(${pos.x}, ${layout.trunkY - 14})`}>
                      <line x1="0" y1="0" x2="0" y2="-7" stroke="#2563eb" strokeWidth="2" />
                      <circle cx="0" cy="-7" r="3.5" fill="#2563eb" stroke="#ffffff" strokeWidth="1.2" />
                      <text x="0" y="-14" textAnchor="middle" fontSize="9">🚏</text>
                      {/* Stacked Stop Name (2 compact lines) */}
                      <text
                        x="0"
                        y="-24"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="800"
                        fill="#1e40af"
                        className="svg-stop-label"
                      >
                        <tspan x="0" dy="-8.5">{st.line1SJ}</tspan>
                        <tspan x="0" dy="9">{st.line2SJ}</tspan>
                      </text>
                    </g>

                    {/* (b) South Curb Stop: Sentido Coronado (doors on right, placed on South side) */}
                    <g transform={`translate(${pos.x}, ${layout.trunkY + 14})`}>
                      <line x1="0" y1="0" x2="0" y2="7" stroke="#1d4ed8" strokeWidth="2" />
                      <circle cx="0" cy="7" r="3.5" fill="#1d4ed8" stroke="#ffffff" strokeWidth="1.2" />
                      <text x="0" y="18" textAnchor="middle" fontSize="9">🚏</text>
                      {/* Stacked Stop Name (2 compact lines) */}
                      <text
                        x="0"
                        y="28"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="800"
                        fill="#1e3a8a"
                        className="svg-stop-label"
                      >
                        <tspan x="0" dy="0">{st.line1Coro}</tspan>
                        <tspan x="0" dy="9">{st.line2Coro}</tspan>
                      </text>
                    </g>

                    {/* Station Median Node Dot */}
                    <circle cx={pos.x} cy={layout.trunkY} r="4.8" fill="#ffffff" stroke="#1d4ed8" strokeWidth="2" />
                    <text x={pos.x} y={layout.trunkY + 3} textAnchor="middle" fontSize="8" fontWeight="900" fill="#1d4ed8">
                      {st.stationId}
                    </text>
                  </g>
                )
              })}

              {/* Station 1: San José Terminal (Parque Central) */}
              <g transform={`translate(${layout.stationCoords[1].x}, ${layout.trunkY})`}>
                <rect x="-48" y="-17" width="96" height="34" rx="5" fill="#0f172a" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="0" y="-1.5" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900">
                  Terminal San José
                </text>
                <text x="0" y="10.5" textAnchor="middle" fill="#94a3b8" fontSize="7.8" fontWeight="700">
                  Parque Central · C.3
                </text>
              </g>

              {/* Station 8: Terminal Central de Coronado (Intercambio Transfer Hub - Clean Solid Node) */}
              <g transform={`translate(${layout.hubX}, ${layout.trunkY})`} className="svg-hub-station">
                <circle cx="0" cy="0" r="16" fill="none" stroke="#dc2626" strokeWidth="1.6" strokeDasharray="4 2.5" opacity="0.85" />
                <circle cx="0" cy="0" r="9.5" fill="#dc2626" stroke="#ffffff" strokeWidth="2.5" filter="url(#glowRed)" />
                {/* Transfer Hub badge */}
                <g transform="translate(0, 28)">
                  <rect x="-65" y="-10" width="130" height="20" rx="4" fill="#ffffff" stroke="#dc2626" strokeWidth="1.2" filter="drop-shadow(0 2px 5px rgba(0,0,0,0.12))" />
                  <text x="0" y="3.5" textAnchor="middle" fontSize="9" fontWeight="900" fill="#b91c1c">
                    Terminal Central (Hub)
                  </text>
                </g>
              </g>

              {/* 6. All 9 Feeder Routes with DUAL-RAIL GEOMETRY & TURNAROUND LOOPS */}
              {layout.branches.map((b) => (
                <g key={`branch-path-${b.id}`}>
                  {/* (a) Inbound Rail: Retorno hacia Terminal Central (upper rail at b.y - 4.5) */}
                  <path
                    d={b.inboundPath}
                    fill="none"
                    stroke={b.color}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.88"
                  />
                  {/* (b) Outbound Rail: Ida desde Terminal Central (lower rail at b.y + 4.5) */}
                  <path
                    d={b.outboundPath}
                    fill="none"
                    stroke={b.color}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.88"
                  />
                  {/* (c) Turnaround Loop at Terminus (Retorno ↻ connecting both rails) */}
                  <path
                    d={b.loopPath}
                    fill="none"
                    stroke={b.color}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                  />
                  {/* Terminus Turnaround Loop Dot */}
                  <circle cx={b.scaledEndX} cy={b.y} r="6.5" fill={b.color} stroke="#ffffff" strokeWidth="2" />
                  <text x={b.scaledEndX} y={b.y + 2.8} textAnchor="middle" fontSize="8" fill="#ffffff" fontWeight="900">
                    ↻
                  </text>

                  {/* Intermediate Stops along branch */}
                  {b.intermediateStops.map((istop, sIdx) => {
                    const stopX = layout.hubX + 150 + istop.pct * (b.scaledEndX - (layout.hubX + 150))
                    return (
                      <g key={`feeder-stop-${b.id}-${sIdx}`} transform={`translate(${stopX}, ${b.y})`}>
                        <line x1="0" y1="-4.5" x2="0" y2="4.5" stroke={b.color} strokeWidth="1.5" />
                        <circle cx="0" cy="-7.5" r="3" fill={b.color} stroke="#ffffff" strokeWidth="1" />
                        <text x="0" y="-12.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#334155">
                          🚏 {istop.name}
                        </text>
                      </g>
                    )
                  })}

                  {/* Clean, Bold Branch Label */}
                  <text
                    x={b.scaledEndX + 14}
                    y={b.y + 4}
                    fontSize="11"
                    fontWeight="900"
                    fill={b.color}
                    className="svg-feeder-label"
                  >
                    {b.name}
                  </text>
                </g>
              ))}

              {/* 7. Headway Intervals on Trunk Corridor */}
              {headwayLinks.map((link, idx) => {
                const isBunched = link.status === 'bunched'
                const isWarning = link.status === 'warning'

                const bgBoxColor = isBunched ? '#fee2e2' : isWarning ? '#fef3c7' : '#dcfce7'
                const textColor = isBunched ? '#b91c1c' : isWarning ? '#b45309' : '#15803d'
                const borderColor = isBunched ? '#ef4444' : isWarning ? '#f59e0b' : '#86efac'
                const strokeColor = isBunched ? '#ef4444' : isWarning ? '#f59e0b' : '#64748b'
                const strokeWidth = isBunched ? 2.2 : isWarning ? 1.8 : 1.2
                const strokeDash = isBunched ? undefined : isWarning ? '4 2' : '4 2.5'
                const strokeOpacity = isBunched ? 0.95 : isWarning ? 0.9 : 0.75
                const filter = isBunched ? 'url(#glowRed)' : isWarning ? 'url(#glowYellow)' : undefined

                const badgeWidth = 28
                const badgeHeight = 14

                const isInbound = link.direction === 'INBOUND'

                // Sentido San José (Inbound / North Track): Arches UPWARD, badges placed ABOVE bus stops
                // Sentido Coronado (Outbound / South Track): Arches DOWNWARD, badges placed BELOW bus stops
                const badgeY = isInbound
                  ? (link.tier === 1 ? 158 : 176)
                  : (link.tier === 1 ? 336 : 318)

                const startY = isInbound ? link.leadBus.y - 7 : link.leadBus.y + 7
                const endY = isInbound ? link.trailBus.y - 7 : link.trailBus.y + 7
                const arcApexY = isInbound ? badgeY + badgeHeight + 2 : badgeY - 2

                return (
                  <g key={`link-${idx}`} className="svg-headway-link">
                    <path
                      d={`M ${link.leadBus.x} ${startY} Q ${link.centerX} ${arcApexY} ${link.trailBus.x} ${endY}`}
                      fill="none"
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDash}
                      opacity={strokeOpacity}
                    />

                    <g transform={`translate(${link.centerX - badgeWidth / 2}, ${badgeY})`}>
                      <rect
                        width={badgeWidth}
                        height={badgeHeight}
                        rx="3"
                        fill={bgBoxColor}
                        stroke={borderColor}
                        strokeWidth="1.1"
                        filter={filter}
                      />
                      <text
                        x={badgeWidth / 2}
                        y="10.2"
                        textAnchor="middle"
                        fontSize="8.5"
                        fontWeight="900"
                        fontFamily="monospace"
                        fill={textColor}
                      >
                        {link.headwayMinutes}m
                      </text>
                    </g>
                  </g>
                )
              })}

              {/* 8. Live Fleet Buses (Scaled-Up, High-Visibility Crisp Vector Bus Glyphs) */}
              {mappedBuses.map((bus) => {
                const isSelected = bus.vehicleId === clickedVehicleId
                const isHovered = bus.vehicleId === hoveredVehicleId
                const branchCfg = feederBranches.find((fb) => fb.id === bus.section)
                const busFill = bus.isOvernightDepot
                  ? '#64748b'
                  : bus.section.startsWith('R142-')
                  ? (branchCfg?.color ?? '#0284c7')
                  : '#1d4ed8'

                return (
                  <g
                    key={bus.vehicleId}
                    transform={`translate(${bus.x}, ${bus.y})`}
                    className={`svg-bus-token ${isSelected ? 'is-selected' : ''} ${isHovered ? 'is-hovered' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (panStartRef.current.moved) return
                      setClickedVehicleId((prev) => (prev === bus.vehicleId ? null : bus.vehicleId))
                      onSelectVehicle(bus.vehicleId)
                    }}
                    onMouseEnter={() => setHoveredVehicleId(bus.vehicleId)}
                    onMouseLeave={() => setHoveredVehicleId(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    {/* Glowing highlight indicator only when hovered or clicked */}
                    {(isSelected || isHovered) && (
                      <rect
                        x="-12"
                        y="-9"
                        width="24"
                        height="18"
                        rx="4"
                        fill="none"
                        stroke={isSelected ? '#06b6d4' : '#38bdf8'}
                        strokeWidth="2.5"
                        filter="drop-shadow(0 0 5px #06b6d4)"
                      />
                    )}

                    {/* Crisp Vector Bus Glyph (Scaled to 16px x 10px) - Direction aware */}
                    <g transform={bus.isInbound ? 'translate(8, -5) scale(-1, 1)' : 'translate(-8, -5)'}>
                      {/* Bus body */}
                      <rect
                        x="0"
                        y="0"
                        width="16"
                        height="9.8"
                        rx="2.2"
                        fill={busFill}
                        stroke="#ffffff"
                        strokeWidth="0.9"
                      />
                      {/* Windshield & Windows */}
                      <rect x="10.5" y="1.4" width="4" height="3.2" rx="0.6" fill="#ffffff" opacity="0.95" />
                      <rect x="5.8" y="1.4" width="3.5" height="3.2" rx="0.6" fill="#ffffff" opacity="0.9" />
                      <rect x="1.6" y="1.4" width="3.2" height="3.2" rx="0.6" fill="#ffffff" opacity="0.9" />
                      {/* Wheels */}
                      <circle cx="3.8" cy="9.8" r="1.2" fill="#0f172a" />
                      <circle cx="12.2" cy="9.8" r="1.2" fill="#0f172a" />
                    </g>
                  </g>
                )
              })}

              {/* 9. License Plate Tooltip: ONLY shown when hovered or clicked by user */}
              {mappedBuses
                .filter((bus) => bus.vehicleId === hoveredVehicleId || bus.vehicleId === clickedVehicleId)
                .map((bus) => {
                  const isSelected = bus.vehicleId === clickedVehicleId
                  const plateWidth = 60
                  const plateHeight = 17

                  return (
                    <g
                      key={`tooltip-${bus.vehicleId}`}
                      transform={`translate(${bus.x}, ${bus.y - 17})`}
                      className="svg-bus-plate-tooltip"
                      style={{ pointerEvents: 'none' }}
                    >
                      <rect
                        x={-plateWidth / 2}
                        y={-plateHeight + 3}
                        width={plateWidth}
                        height={plateHeight}
                        rx="4"
                        fill="#0f172a"
                        stroke={isSelected ? '#06b6d4' : '#38bdf8'}
                        strokeWidth="1.8"
                        filter="drop-shadow(0 3px 8px rgba(0,0,0,0.45))"
                      />
                      <text
                        x="0"
                        y="1.5"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="9"
                        fontWeight="900"
                        fontFamily="monospace"
                      >
                        {bus.vehicleId}
                      </text>
                    </g>
                  )
                })}
              </g>
            </svg>

            {/* Floating Pan & Zoom Toolbar */}
            <div className="bunching-zoom-toolbar">
              <button
                type="button"
                className="bunching-zoom-btn"
                onClick={() => adjustZoom(1.25)}
                title="Acercar (+)"
              >
                +
              </button>
              <button
                type="button"
                className="bunching-zoom-btn"
                onClick={() => adjustZoom(0.8)}
                title="Alejar (−)"
              >
                −
              </button>
              <button
                type="button"
                className="bunching-zoom-btn bunching-zoom-badge"
                onClick={handleResetZoom}
                title="Restablecer zoom al 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                className="bunching-zoom-btn"
                onClick={handleResetZoom}
                title="Centrar y restablecer vista (Doble clic en el diagrama)"
              >
                ⟲
              </button>
              <span className="bunching-pan-hint">Arrastrar para mover</span>
            </div>
          </div>

          {/* Operational Advisory Footer */}
          <div className="bunching-advisory-bar">
            {totalBunched > 0 ? (
              <div className="advisory-text text-amber">
                <strong style={{ color: '#ef4444' }}>Pelotón Crítico en Troncal 142 (≤ 2.0 min):</strong> {totalBunched}{' '}
                {totalBunched === 1 ? 'par con intervalo crítico:' : 'pares con intervalo crítico:'}
                {bunchedLinks.map((l, i) => (
                  <span
                    key={i}
                    className="bunching-pair-chip"
                    style={{ background: '#fee2e2', borderColor: '#ef4444', color: '#991b1b' }}
                    onClick={() => {
                      setClickedVehicleId(l.trailBus.vehicleId)
                      onSelectVehicle(l.trailBus.vehicleId)
                    }}
                    title={`Click para inspeccionar ${l.trailBus.vehicleId}`}
                  >
                    {l.leadBus.vehicleId} ↔ {l.trailBus.vehicleId} ({l.headwayMinutes} min · {l.direction === 'INBOUND' ? 'Hacia SJ' : 'Hacia Coronado'})
                  </span>
                ))}
                <span> — Regular salida en Terminal Central de Coronado para restituir intervalo de 5 a 8 min.</span>
              </div>
            ) : totalWarning > 0 ? (
              <div className="advisory-text text-amber">
                <strong style={{ color: '#d97706' }}>Intervalo en Riesgo de Pelotonamiento (2.1 - 3.0 min):</strong> {totalWarning}{' '}
                {totalWarning === 1 ? 'par en seguimiento preventivo:' : 'pares en seguimiento preventivo:'}
                {warningLinks.map((l, i) => (
                  <span
                    key={i}
                    className="bunching-pair-chip"
                    style={{ background: '#fef3c7', borderColor: '#f59e0b', color: '#92400e' }}
                    onClick={() => {
                      setClickedVehicleId(l.trailBus.vehicleId)
                      onSelectVehicle(l.trailBus.vehicleId)
                    }}
                    title={`Click para inspeccionar ${l.trailBus.vehicleId}`}
                  >
                    {l.leadBus.vehicleId} ↔ {l.trailBus.vehicleId} ({l.headwayMinutes} min · {l.direction === 'INBOUND' ? 'Hacia SJ' : 'Hacia Coronado'})
                  </span>
                ))}
                <span> — Mantener espaciamiento preventivo en paradas intermedias.</span>
              </div>
            ) : (
              <div className="advisory-text text-emerald">
                <strong>Operación Estable CTP:</strong> Intervalos regulares (&gt; 3.0 min) a lo largo de la Troncal 142 y los 9 ramales alimentadores de Coronado.
                {depotBuses.length > 0 && (
                  <span style={{ color: '#475569', marginLeft: '6px' }}>
                    ({depotBuses.length} unidades en depot en pernocta y mantenimiento).
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
