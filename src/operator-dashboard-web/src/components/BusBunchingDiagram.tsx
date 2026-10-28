import { useState, useMemo, useRef, useEffect, useCallback, type ReactNode } from 'react'
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
  /** When set, the host owns maximizing: the diagram fills its box and the maximize button calls this. */
  onMaximizedChange?: (maximized: boolean) => void
  maximized?: boolean
  /** When set, the host owns the "Controles" toggle (it also hides its own title and replay bar). */
  controlsOpen?: boolean
  onControlsOpenChange?: (open: boolean) => void
  /** Shown in the header after the title, e.g. a compact replay control while the host's bar is hidden. */
  headerExtra?: ReactNode
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

interface StopDirectionWait {
  waitMinutes: number | null
  gapKm: number | null
  approachingBus: LiveCorridorBus | null
  status: 'good' | 'warning' | 'gap' | 'no-bus'
}

interface StopWaitInfo {
  stationId: number | string
  name: string
  sub: string
  km: number
  x: number
  y: number
  outbound: StopDirectionWait
  inbound: StopDirectionWait
  nextCoro?: {
    toName: string
    distKm: number
    travelMinutes: number
  }
  nextSJ?: {
    toName: string
    distKm: number
    travelMinutes: number
  }
}

interface InterStopSegment {
  fromId: number | string
  toId: number | string
  fromName: string
  toName: string
  distKm: number
  travelMinutes: number
  midX: number
  y: number
}

type DiagramPreset = 'despacho' | 'pasajeros' | 'minimo' | 'todo'

const PRESET_OPTIONS: { id: DiagramPreset; label: string; title: string }[] = [
  { id: 'despacho', label: 'Despacho', title: 'Enfoque de despacho: arcos de intervalo entre buses, sin paradas' },
  { id: 'pasajeros', label: 'Pasajeros', title: 'Enfoque de pasajeros: espera w(t) en paradas y duración de tramos' },
  { id: 'minimo', label: 'Mínimo', title: 'Vista mínima: solo rieles y buses en movimiento' },
  { id: 'todo', label: 'Todo', title: 'Mostrar todas las capas' },
]

// Remembers per browser whether the user hid the mode/layers/stats area.
const CONTROLS_STORAGE_KEY = 'buslab.bunching.controlsCollapsed'

export function loadControlsOpen(): boolean {
  try {
    return window.localStorage.getItem(CONTROLS_STORAGE_KEY) !== '1'
  } catch {
    return true
  }
}

function saveControlsOpen(open: boolean) {
  try {
    window.localStorage.setItem(CONTROLS_STORAGE_KEY, open ? '0' : '1')
  } catch {
    // Storage blocked (private mode): the toggle still works for this visit.
  }
}

interface DiagramLayers {
  headways: boolean
  stopWaitTimes: boolean
  interStopTimes: boolean
  stopLabels: boolean
  feeders: boolean
  depot: boolean
}

const LAYER_OPTIONS: { key: keyof DiagramLayers; label: string; title: string }[] = [
  { key: 'headways', label: 'Arcos de intervalo', title: 'Arcos de intervalo (headway) entre buses' },
  { key: 'stopWaitTimes', label: 'Espera w(t)', title: 'Tiempo de espera w(t) en cada parada' },
  { key: 'interStopTimes', label: 'Tramos', title: 'Tiempo de viaje entre paradas' },
  { key: 'stopLabels', label: 'Paradas', title: 'Nombres y postes de paradas' },
  { key: 'feeders', label: 'Ramales', title: 'Ramales alimentadores' },
  { key: 'depot', label: 'Plantel', title: 'Patio de maniobras y plantel' },
]

const PRESET_CONFIGS: Record<DiagramPreset, DiagramLayers> = {
  despacho: {
    headways: true,
    stopWaitTimes: false,
    interStopTimes: false,
    stopLabels: true,
    feeders: true,
    depot: true,
  },
  pasajeros: {
    headways: false,
    stopWaitTimes: true,
    interStopTimes: true,
    stopLabels: true,
    feeders: true,
    depot: true,
  },
  minimo: {
    headways: false,
    stopWaitTimes: false,
    interStopTimes: false,
    stopLabels: false,
    feeders: true,
    depot: false,
  },
  todo: {
    headways: true,
    stopWaitTimes: true,
    interStopTimes: true,
    stopLabels: true,
    feeders: true,
    depot: true,
  },
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
  onMaximizedChange,
  maximized = false,
  controlsOpen: controlsOpenProp,
  onControlsOpenChange,
  headerExtra,
}: BusBunchingDiagramProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMaximized, setIsMaximized] = useState(isFullScreen)
  // Embedded in a host that sizes it (studio): fill the box instead of floating over a map.
  const isHosted = onMaximizedChange != null
  const fillsBox = isFullScreen || isHosted
  const showsMaximized = isHosted ? maximized : isMaximized
  const [hoveredVehicleId, setHoveredVehicleId] = useState<string | null>(null)
  const [clickedVehicleId, setClickedVehicleId] = useState<string | null>(null)
  const [hoveredStopId, setHoveredStopId] = useState<number | string | null>(null)
  const [clickedStopId, setClickedStopId] = useState<number | string | null>(null)
  const [layers, setLayers] = useState<DiagramLayers>(PRESET_CONFIGS.todo)
  const [activePreset, setActivePreset] = useState<DiagramPreset | 'custom'>('todo')
  const [ownControlsOpen, setOwnControlsOpen] = useState(loadControlsOpen)
  const controlsOpen = controlsOpenProp ?? ownControlsOpen
  const setControlsOpen = (open: boolean) => {
    saveControlsOpen(open)
    if (onControlsOpenChange) onControlsOpenChange(open)
    else setOwnControlsOpen(open)
  }
  const [layersMenuOpen, setLayersMenuOpen] = useState(false)
  const layersMenuRef = useRef<HTMLDivElement>(null)

  // The layers menu closes on a click outside it or on Escape.
  useEffect(() => {
    if (!layersMenuOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (!layersMenuRef.current?.contains(e.target as Node)) setLayersMenuOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        setLayersMenuOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey, true)
    }
  }, [layersMenuOpen])

  const applyPreset = useCallback((preset: DiagramPreset) => {
    setActivePreset(preset)
    setLayers({ ...PRESET_CONFIGS[preset] })
  }, [])

  const toggleLayer = useCallback((key: keyof DiagramLayers) => {
    setLayers((prev) => {
      const next = { ...prev, [key]: !prev[key] }
      const match = (Object.keys(PRESET_CONFIGS) as DiagramPreset[]).find((p) => {
        const cfg = PRESET_CONFIGS[p]
        return (Object.keys(cfg) as (keyof DiagramLayers)[]).every((k) => cfg[k] === next[k])
      })
      setActivePreset(match ?? 'custom')
      return next
    })
  }, [])

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

  // Calculate headways and detect bus bunching between consecutive units en-route on Trunk AND Ramales in the SAME direction
  const headwayLinks = useMemo(() => {
    const sections = ['trunk', ...feederBranches.map((fb) => fb.id)]
    const links: HeadwayLink[] = []

    sections.forEach((sec) => {
      const secBuses = enRouteBuses.filter((b) => b.section === sec)
      const directions: ('INBOUND' | 'OUTBOUND')[] = ['OUTBOUND', 'INBOUND']
      directions.forEach((dir) => {
        const dirBuses = secBuses
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
    })

    // Feeder branches loop separation when multiple buses are active on the same branch
    feederBranches.forEach((fb) => {
      const branchBuses = enRouteBuses.filter((b) => b.section === fb.id)
      if (branchBuses.length >= 2) {
        const bA = branchBuses[0]
        const bB = branchBuses[1]
        const alreadyLinked = links.some(
          (l) =>
            (l.leadBus.vehicleId === bA.vehicleId && l.trailBus.vehicleId === bB.vehicleId) ||
            (l.leadBus.vehicleId === bB.vehicleId && l.trailBus.vehicleId === bA.vehicleId)
        )
        if (!alreadyLinked) {
          const posA = bA.direction === 'OUTBOUND' ? bA.km : Math.max(0, 2 * fb.km - bA.km)
          const posB = bB.direction === 'OUTBOUND' ? bB.km : Math.max(0, 2 * fb.km - bB.km)
          const rawGap = Math.abs(posA - posB)
          const loopLen = 2 * fb.km
          const loopGapKm = Math.min(rawGap, Math.max(0.2, loopLen - rawGap))
          const headwayMinutes = Number(((loopGapKm / AVG_SPEED_KMH) * 60).toFixed(1))

          let status: 'bunched' | 'warning' | 'gap' | 'regular' = 'regular'
          if (headwayMinutes <= BUNCHING_RED_THRESHOLD) {
            status = 'bunched'
          } else if (headwayMinutes <= BUNCHING_YELLOW_THRESHOLD) {
            status = 'warning'
          } else if (headwayMinutes > 15.0) {
            status = 'gap'
          }

          const cX = Math.round((bA.x + bB.x) / 2)
          links.push({
            leadBus: bA,
            trailBus: bB,
            gapKm: Number(loopGapKm.toFixed(2)),
            headwayMinutes,
            status,
            stationId: bA.stationIdNear,
            centerX: cX,
            centerY: Math.round((bA.y + bB.y) / 2),
            direction: 'OUTBOUND',
            tier: 0,
          })
        }
      }
    })

    return links
  }, [enRouteBuses])

  const feederDispatchMap = useMemo(() => {
    const map = new Map<string, { intervalMin: number; buses: number }>()
    feederBranches.forEach((fb) => {
      const cycleMin = Math.round(((2 * fb.km) / AVG_SPEED_KMH) * 60 + 4)
      const intervalMin = fb.buses > 0 ? Math.round(cycleMin / fb.buses) : 30
      map.set(fb.id, { intervalMin, buses: fb.buses })
    })
    return map
  }, [])

  const bunchedLinks = headwayLinks.filter((l) => l.status === 'bunched')
  const warningLinks = headwayLinks.filter((l) => l.status === 'warning')
  const totalBunched = bunchedLinks.length
  const totalWarning = warningLinks.length

  // Inter-stop segments: distance and travel time between consecutive stops (Troncal + 9 Ramales)
  const interStopSegments = useMemo<InterStopSegment[]>(() => {
    const segs: InterStopSegment[] = []

    // 1. Trunk Stations 1 to 8
    for (let i = 0; i < trunkStations.length - 1; i++) {
      const stA = trunkStations[i]
      const stB = trunkStations[i + 1]
      const distKm = Number((stB.km - stA.km).toFixed(2))
      const travelMinutes = Number(((distKm / AVG_SPEED_KMH) * 60).toFixed(1))
      const midX = Math.round((layout.stationCoords[stA.id].x + layout.stationCoords[stB.id].x) / 2)
      segs.push({
        fromId: stA.id,
        toId: stB.id,
        fromName: stA.name,
        toName: stB.name,
        distKm,
        travelMinutes,
        midX,
        y: layout.trunkY,
      })
    }

    // 2. All 9 Feeder Branches
    layout.branches.forEach((b) => {
      const branchStops = [
        { name: 'Terminal Central', pct: 0, x: layout.hubX + 150 },
        ...b.intermediateStops.map((istop) => ({
          name: istop.name,
          pct: istop.pct,
          x: Math.round(layout.hubX + 150 + istop.pct * (b.scaledEndX - (layout.hubX + 150))),
        })),
        { name: b.dest, pct: 1.0, x: b.scaledEndX },
      ]

      for (let i = 0; i < branchStops.length - 1; i++) {
        const sA = branchStops[i]
        const sB = branchStops[i + 1]
        const distKm = Number((b.km * (sB.pct - sA.pct)).toFixed(2))
        const travelMinutes = Number(((distKm / AVG_SPEED_KMH) * 60).toFixed(1))
        const midX = Math.round((sA.x + sB.x) / 2)
        segs.push({
          fromId: `${b.id}-${i}`,
          toId: `${b.id}-${i + 1}`,
          fromName: sA.name,
          toName: sB.name,
          distKm,
          travelMinutes,
          midX,
          y: b.y,
        })
      }
    })

    return segs
  }, [layout])

  // Real-time passenger wait times w(t) at each bus stop location (Troncal + Ramales)
  const stopWaitMap = useMemo(() => {
    const map = new Map<number | string, StopWaitInfo>()
    const trunkEnRoute = enRouteBuses.filter((b) => b.section === 'trunk')
    const outboundBuses = trunkEnRoute.filter((b) => b.direction === 'OUTBOUND')
    const inboundBuses = trunkEnRoute.filter((b) => b.direction === 'INBOUND')

    // 1. Trunk Stations 1 to 8
    trunkStations.forEach((st, idx) => {
      // Outbound (Ida hacia Coronado): Look for nearest upstream bus (km <= st.km + 0.15)
      const upOut = outboundBuses
        .filter((b) => b.km <= st.km + 0.15)
        .sort((a, b) => b.km - a.km)[0]

      let outGapKm: number | null = null
      let outWaitMin: number | null = null
      let outBus: LiveCorridorBus | null = null
      let outStatus: 'good' | 'warning' | 'gap' | 'no-bus' = 'no-bus'

      if (upOut) {
        outGapKm = Math.max(0.1, Number((st.km - upOut.km).toFixed(2)))
        outWaitMin = Number(((outGapKm / AVG_SPEED_KMH) * 60).toFixed(1))
        outBus = upOut
        outStatus = outWaitMin <= 5.0 ? 'good' : outWaitMin <= 10.0 ? 'warning' : 'gap'
      }

      // Inbound (Retorno hacia San José): Look for nearest upstream bus (km >= st.km - 0.15)
      const upIn = inboundBuses
        .filter((b) => b.km >= st.km - 0.15)
        .sort((a, b) => a.km - b.km)[0]

      let inGapKm: number | null = null
      let inWaitMin: number | null = null
      let inBus: LiveCorridorBus | null = null
      let inStatus: 'good' | 'warning' | 'gap' | 'no-bus' = 'no-bus'

      if (upIn) {
        inGapKm = Math.max(0.1, Number((upIn.km - st.km).toFixed(2)))
        inWaitMin = Number(((inGapKm / AVG_SPEED_KMH) * 60).toFixed(1))
        inBus = upIn
        inStatus = inWaitMin <= 5.0 ? 'good' : inWaitMin <= 10.0 ? 'warning' : 'gap'
      }

      const nextCoro =
        idx < trunkStations.length - 1
          ? {
              toName: trunkStations[idx + 1].name,
              distKm: Number((trunkStations[idx + 1].km - st.km).toFixed(2)),
              travelMinutes: Number((((trunkStations[idx + 1].km - st.km) / AVG_SPEED_KMH) * 60).toFixed(1)),
            }
          : undefined

      const nextSJ =
        idx > 0
          ? {
              toName: trunkStations[idx - 1].name,
              distKm: Number((st.km - trunkStations[idx - 1].km).toFixed(2)),
              travelMinutes: Number((((st.km - trunkStations[idx - 1].km) / AVG_SPEED_KMH) * 60).toFixed(1)),
            }
          : undefined

      map.set(st.id, {
        stationId: st.id,
        name: st.name,
        sub: st.sub,
        km: st.km,
        x: layout.stationCoords[st.id].x,
        y: layout.trunkY,
        outbound: {
          waitMinutes: outWaitMin,
          gapKm: outGapKm,
          approachingBus: outBus,
          status: outStatus,
        },
        inbound: {
          waitMinutes: inWaitMin,
          gapKm: inGapKm,
          approachingBus: inBus,
          status: inStatus,
        },
        nextCoro,
        nextSJ,
      })
    })

    // 2. All 9 Feeder Branches: Intermediate Stops and Terminus
    layout.branches.forEach((b) => {
      const branchBuses = enRouteBuses.filter((bus) => bus.section === b.id)
      const branchOutbound = branchBuses.filter((bus) => bus.direction === 'OUTBOUND')
      const branchInbound = branchBuses.filter((bus) => bus.direction === 'INBOUND')

      const branchStops = [
        ...b.intermediateStops.map((istop, sIdx) => ({
          stopId: `${b.id}-stop-${sIdx}`,
          name: istop.name,
          sub: `Ramal ${b.name} (${b.id})`,
          pct: istop.pct,
          km: Number((b.km * istop.pct).toFixed(2)),
          x: Math.round(layout.hubX + 150 + istop.pct * (b.scaledEndX - (layout.hubX + 150))),
          y: b.y,
          isTerminus: false,
          sIdx,
        })),
        {
          stopId: `${b.id}-term`,
          name: b.dest,
          sub: `Terminal Retorno ↻ · ${b.name}`,
          pct: 1.0,
          km: b.km,
          x: b.scaledEndX,
          y: b.y,
          isTerminus: true,
          sIdx: b.intermediateStops.length,
        },
      ]

      branchStops.forEach((bst, sIdx) => {
        // Outbound wait: nearest upstream outbound bus on branch
        const upOut = branchOutbound
          .filter((bus) => bus.km <= bst.km + 0.15)
          .sort((a, b) => b.km - a.km)[0]

        let outGapKm: number | null = null
        let outWaitMin: number | null = null
        let outBus: LiveCorridorBus | null = null
        let outStatus: 'good' | 'warning' | 'gap' | 'no-bus' = 'no-bus'

        if (upOut) {
          outGapKm = Math.max(0.1, Number((bst.km - upOut.km).toFixed(2)))
          outWaitMin = Number(((outGapKm / AVG_SPEED_KMH) * 60).toFixed(1))
          outBus = upOut
          outStatus = outWaitMin <= 6.0 ? 'good' : outWaitMin <= 12.0 ? 'warning' : 'gap'
        } else if (branchInbound.length > 0) {
          // Inbound bus returning to Terminal Central, then will dispatch out
          const closestIn = branchInbound.sort((a, b) => a.km - b.km)[0]
          outGapKm = Number((closestIn.km + bst.km).toFixed(2))
          outWaitMin = Number(((outGapKm / AVG_SPEED_KMH) * 60 + 2.0).toFixed(1))
          outBus = closestIn
          outStatus = outWaitMin <= 6.0 ? 'good' : outWaitMin <= 12.0 ? 'warning' : 'gap'
        }

        // Inbound wait: nearest inbound bus coming down from above this stop
        const upIn = branchInbound
          .filter((bus) => bus.km >= bst.km - 0.15)
          .sort((a, b) => a.km - b.km)[0]

        let inGapKm: number | null = null
        let inWaitMin: number | null = null
        let inBus: LiveCorridorBus | null = null
        let inStatus: 'good' | 'warning' | 'gap' | 'no-bus' = 'no-bus'

        if (upIn) {
          inGapKm = Math.max(0.1, Number((upIn.km - bst.km).toFixed(2)))
          inWaitMin = Number(((inGapKm / AVG_SPEED_KMH) * 60).toFixed(1))
          inBus = upIn
          inStatus = inWaitMin <= 6.0 ? 'good' : inWaitMin <= 12.0 ? 'warning' : 'gap'
        } else if (branchOutbound.length > 0) {
          // Outbound bus climbing up to terminus, which will turn around
          const highestOut = branchOutbound.sort((a, b) => b.km - a.km)[0]
          inGapKm = Number(((b.km - highestOut.km) + (b.km - bst.km)).toFixed(2))
          inWaitMin = Number(((inGapKm / AVG_SPEED_KMH) * 60 + 1.5).toFixed(1))
          inBus = highestOut
          inStatus = inWaitMin <= 6.0 ? 'good' : inWaitMin <= 12.0 ? 'warning' : 'gap'
        }

        // Next stop info
        const nextCoro =
          sIdx < branchStops.length - 1
            ? {
                toName: branchStops[sIdx + 1].name,
                distKm: Number((branchStops[sIdx + 1].km - bst.km).toFixed(2)),
                travelMinutes: Number((((branchStops[sIdx + 1].km - bst.km) / AVG_SPEED_KMH) * 60).toFixed(1)),
              }
            : undefined

        const nextSJ =
          sIdx > 0
            ? {
                toName: branchStops[sIdx - 1].name,
                distKm: Number((bst.km - branchStops[sIdx - 1].km).toFixed(2)),
                travelMinutes: Number((((bst.km - branchStops[sIdx - 1].km) / AVG_SPEED_KMH) * 60).toFixed(1)),
              }
            : {
                toName: 'Terminal Central',
                distKm: bst.km,
                travelMinutes: Number(((bst.km / AVG_SPEED_KMH) * 60).toFixed(1)),
              }

        map.set(bst.stopId, {
          stationId: bst.stopId,
          name: bst.name,
          sub: bst.sub,
          km: bst.km,
          x: bst.x,
          y: bst.y,
          outbound: {
            waitMinutes: outWaitMin,
            gapKm: outGapKm,
            approachingBus: outBus,
            status: outStatus,
          },
          inbound: {
            waitMinutes: inWaitMin,
            gapKm: inGapKm,
            approachingBus: inBus,
            status: inStatus,
          },
          nextCoro,
          nextSJ,
        })
      })
    })

    return map
  }, [enRouteBuses, layout])

  // Average passenger wait time across corridor
  const waitSummary = useMemo(() => {
    const values: number[] = []
    let maxWait = 0
    let maxStopName = ''

    stopWaitMap.forEach((sw) => {
      if (sw.outbound.waitMinutes !== null && sw.outbound.status !== 'no-bus') {
        values.push(sw.outbound.waitMinutes)
        if (sw.outbound.waitMinutes > maxWait) {
          maxWait = sw.outbound.waitMinutes
          maxStopName = `${sw.name} (Ida)`
        }
      }
      if (sw.inbound.waitMinutes !== null && sw.inbound.status !== 'no-bus') {
        values.push(sw.inbound.waitMinutes)
        if (sw.inbound.waitMinutes > maxWait) {
          maxWait = sw.inbound.waitMinutes
          maxStopName = `${sw.name} (Retorno)`
        }
      }
    })

    const hasActiveService = values.length > 0
    const avg = hasActiveService ? Number((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)) : 0
    return { avg, maxWait, maxStopName, hasActiveService }
  }, [stopWaitMap])

  const activeStop = clickedStopId ? stopWaitMap.get(clickedStopId) : hoveredStopId ? stopWaitMap.get(hoveredStopId) : null

  return (
    <div
      className={`bunching-radar-container ${fillsBox ? 'is-fullscreen-view' : ''} ${isMaximized && isExpanded && !fillsBox ? 'is-maximized' : ''} ${!isExpanded ? 'is-collapsed' : ''}`}
      style={{ userSelect: 'none' }}
    >
      {/* Header: title, platoon alert and the wait figures, always on one line */}
      <div
        className="bunching-header-bar"
        onClick={() => {
          if (fillsBox) return
          if (isMaximized) {
            setIsMaximized(false)
          } else {
            setIsExpanded((v) => !v)
          }
        }}
      >
        <div className="bunching-header-left">
          <strong className="bunching-title">Radar de pelotones</strong>
          {headerExtra}
          {isExpanded && (
            <div className="bunching-head-stats">
              <span className="bunching-head-stat" title="Espera promedio w(t) en las paradas">
                Espera prom. <strong>{waitSummary.hasActiveService ? `${waitSummary.avg} min` : '—'}</strong>
              </span>
              {waitSummary.hasActiveService && waitSummary.maxStopName && (
                <span
                  className="bunching-head-stat bunching-head-stat--long"
                  title={`Mayor espera: ${waitSummary.maxStopName}, ${waitSummary.maxWait} min`}
                >
                  Mayor espera{' '}
                  <strong className={waitSummary.maxWait > 10 ? 'is-bad' : waitSummary.maxWait > 6 ? 'is-warn' : ''}>
                    {waitSummary.maxWait} min
                  </strong>{' '}
                  <span className="bunching-head-stat-place">{waitSummary.maxStopName}</span>
                </span>
              )}
            </div>
          )}
        </div>

        <div className="bunching-header-right" onClick={(e) => e.stopPropagation()}>
          {totalBunched > 0 ? (
            <span className="bunching-badge badge-bad">
              {totalBunched} {totalBunched === 1 ? 'pelotón crítico' : 'pelotones críticos'}
              {isExpanded && <span className="bunching-badge-detail"> (≤ 2 min)</span>}
              {isExpanded && totalWarning > 0 && <span className="bunching-badge-extra"> · {totalWarning} en riesgo</span>}
            </span>
          ) : totalWarning > 0 ? (
            <span className="bunching-badge badge-warn">
              {totalWarning} en riesgo{isExpanded && <span className="bunching-badge-detail"> (2–3 min)</span>}
            </span>
          ) : (
            <span className="bunching-badge badge-good">{isExpanded ? 'Intervalos regulares (> 3 min)' : 'Estable'}</span>
          )}

          {isExpanded && (
            <button
              type="button"
              className="bunching-action-btn bunching-controls-toggle"
              aria-expanded={controlsOpen}
              aria-controls="bunching-controls"
              aria-label={controlsOpen ? 'Ocultar controles y cifras' : 'Mostrar controles y cifras'}
              title={controlsOpen ? 'Ocultar controles y cifras' : 'Mostrar controles y cifras'}
              onClick={() => setControlsOpen(!controlsOpen)}
            >
              <span className="bunching-controls-label">Controles</span>
              <span className={`bunching-chevron ${controlsOpen ? 'is-open' : ''}`} aria-hidden="true">
                ▾
              </span>
            </button>
          )}

          {!isFullScreen && (
            <button
              type="button"
              className="bunching-action-btn"
              aria-label={showsMaximized ? 'Restaurar tamaño' : 'Maximizar vista'}
              title={showsMaximized ? 'Restaurar tamaño (Esc)' : 'Maximizar vista'}
              onClick={() => {
                if (onMaximizedChange) {
                  onMaximizedChange(!maximized)
                } else if (isMaximized) {
                  setIsMaximized(false)
                  setIsExpanded(true)
                } else {
                  setIsMaximized(true)
                  setIsExpanded(true)
                }
              }}
            >
              {showsMaximized ? '❐' : '⛶'}
            </button>
          )}

          {!fillsBox && (
            <button
              type="button"
              className="bunching-toggle-btn"
              aria-label={isExpanded ? 'Colapsar panel' : 'Expandir panel'}
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
          {/* Collapsible controls: mode, layers and the secondary figures in one row */}
          {controlsOpen && (
            <div id="bunching-controls" className="bunching-controls-row">
              <div className="bunching-segmented" role="group" aria-label="Modo de vista">
                {PRESET_OPTIONS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className={`bunching-segment ${activePreset === p.id ? 'active' : ''}`}
                    aria-pressed={activePreset === p.id}
                    title={p.title}
                    onClick={() => applyPreset(p.id)}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="bunching-layers-menu" ref={layersMenuRef}>
                <button
                  type="button"
                  className={`bunching-layers-btn ${layersMenuOpen ? 'is-open' : ''}`}
                  aria-haspopup="true"
                  aria-expanded={layersMenuOpen}
                  aria-controls="bunching-layers-popover"
                  onClick={() => setLayersMenuOpen((v) => !v)}
                >
                  Capas{' '}
                  <span className="bunching-layers-count">
                    {LAYER_OPTIONS.filter((o) => layers[o.key]).length}/{LAYER_OPTIONS.length}
                  </span>{' '}
                  <span aria-hidden="true">▾</span>
                </button>
                {layersMenuOpen && (
                  <div id="bunching-layers-popover" className="bunching-layers-popover" role="group" aria-label="Capas del diagrama">
                    {LAYER_OPTIONS.map((o) => (
                      <label key={o.key} className="bunching-layer-option" title={o.title}>
                        <input type="checkbox" checked={layers[o.key]} onChange={() => toggleLayer(o.key)} />
                        {o.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div className="bunching-row-stats">
                <span>
                  Flota <strong>{mappedBuses.length}</strong> · {enRouteBuses.length} en corredor · {depotBuses.length} en plantel
                </span>
                {layers.interStopTimes && (
                  <span>
                    Corredor <strong>41,3 min</strong> (11,33 km)
                  </span>
                )}
                <span className="bunching-row-hint">
                  {layers.stopLabels ? 'Haga clic en una parada o un bus para ver el detalle.' : 'Use Capas para elegir qué se muestra.'}
                </span>
              </div>
            </div>
          )}

          {/* SVG Diagram Canvas: Symmetrically Centered Horizontally and Vertically with Pan & Zoom */}
          {/* Like the map: working on the drawing tucks the controls away to give it room. */}
          <div
            className="network-svg-wrap"
            onPointerDownCapture={() => {
              if (controlsOpen) setControlsOpen(false)
            }}
          >
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
                setClickedStopId(null)
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
              {layers.feeders && (
                <text x={layout.hubX + 25} y="28" className="svg-section-title" fill="#1e293b" fontWeight="900" fontSize="12">
                  9 RAMALES ALIMENTADORES · RETORNO A TERMINAL CENTRAL (15 buses)
                </text>
              )}

              {/* 2. Depot Facility Container */}
              {layers.depot && (
                <>
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
                </>
              )}

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

              {/* 5. Stacked Bus Stops along Trunk with Live Passenger Wait Times w(t) */}
              {trunkIntermediateStops.map((st) => {
                const pos = layout.stationCoords[st.stationId]
                const waitInfo = stopWaitMap.get(st.stationId)
                const isStopActive = clickedStopId === st.stationId || hoveredStopId === st.stationId

                return (
                  <g key={`stop-group-${st.stationId}`} className="trunk-curb-stops">
                    {/* (a) North Curb Stop: Sentido San José (doors on right, placed on North side) */}
                    <g
                      transform={`translate(${pos.x}, ${layout.trunkY - 14})`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setClickedStopId((prev) => (prev === st.stationId ? null : st.stationId))
                      }}
                      onMouseEnter={() => setHoveredStopId(st.stationId)}
                      onMouseLeave={() => setHoveredStopId(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {layers.stopLabels && (
                        <>
                          <line x1="0" y1="0" x2="0" y2="-7" stroke={isStopActive ? '#0284c7' : '#2563eb'} strokeWidth={isStopActive ? 2.5 : 2} />
                          <circle cx="0" cy="-7" r="3.5" fill={isStopActive ? '#38bdf8' : '#2563eb'} stroke="#ffffff" strokeWidth="1.2" />
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
                        </>
                      )}

                      {/* Real-time Passenger Wait Pill w(t) */}
                      {layers.stopWaitTimes && waitInfo && (
                        <g transform={`translate(0, ${layers.stopLabels ? -46 : -18})`} className="svg-stop-wait-badge">
                          <rect
                            x={waitInfo.inbound.status === 'no-bus' ? -21 : -19}
                            y="-6.5"
                            width={waitInfo.inbound.status === 'no-bus' ? 42 : 38}
                            height="13"
                            rx="3.5"
                            fill={
                              waitInfo.inbound.status === 'no-bus'
                                ? '#f8fafc'
                                : waitInfo.inbound.status === 'good'
                                ? '#dcfce7'
                                : waitInfo.inbound.status === 'warning'
                                ? '#fef3c7'
                                : '#fee2e2'
                            }
                            stroke={
                              waitInfo.inbound.status === 'no-bus'
                                ? '#cbd5e1'
                                : waitInfo.inbound.status === 'good'
                                ? '#16a34a'
                                : waitInfo.inbound.status === 'warning'
                                ? '#d97706'
                                : '#dc2626'
                            }
                            strokeWidth="1.1"
                            filter={activePreset === 'pasajeros' ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' : undefined}
                          />
                          <text
                            x="0"
                            y="3"
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="900"
                            fontFamily="monospace"
                            fill={
                              waitInfo.inbound.status === 'no-bus'
                                ? '#94a3b8'
                                : waitInfo.inbound.status === 'good'
                                ? '#15803d'
                                : waitInfo.inbound.status === 'warning'
                                ? '#b45309'
                                : '#b91c1c'
                            }
                          >
                            {waitInfo.inbound.status === 'no-bus' ? 'Sin bus' : `⏱${waitInfo.inbound.waitMinutes}m`}
                          </text>
                        </g>
                      )}
                    </g>

                    {/* (b) South Curb Stop: Sentido Coronado (doors on right, placed on South side) */}
                    <g
                      transform={`translate(${pos.x}, ${layout.trunkY + 14})`}
                      onClick={(e) => {
                        e.stopPropagation()
                        setClickedStopId((prev) => (prev === st.stationId ? null : st.stationId))
                      }}
                      onMouseEnter={() => setHoveredStopId(st.stationId)}
                      onMouseLeave={() => setHoveredStopId(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      {layers.stopLabels && (
                        <>
                          <line x1="0" y1="0" x2="0" y2="7" stroke={isStopActive ? '#0284c7' : '#1d4ed8'} strokeWidth={isStopActive ? 2.5 : 2} />
                          <circle cx="0" cy="7" r="3.5" fill={isStopActive ? '#38bdf8' : '#1d4ed8'} stroke="#ffffff" strokeWidth="1.2" />
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
                        </>
                      )}

                      {/* Real-time Passenger Wait Pill w(t) */}
                      {layers.stopWaitTimes && waitInfo && (
                        <g transform={`translate(0, ${layers.stopLabels ? 48 : 20})`} className="svg-stop-wait-badge">
                          <rect
                            x={waitInfo.outbound.status === 'no-bus' ? -21 : -19}
                            y="-6.5"
                            width={waitInfo.outbound.status === 'no-bus' ? 42 : 38}
                            height="13"
                            rx="3.5"
                            fill={
                              waitInfo.outbound.status === 'no-bus'
                                ? '#f8fafc'
                                : waitInfo.outbound.status === 'good'
                                ? '#dcfce7'
                                : waitInfo.outbound.status === 'warning'
                                ? '#fef3c7'
                                : '#fee2e2'
                            }
                            stroke={
                              waitInfo.outbound.status === 'no-bus'
                                ? '#cbd5e1'
                                : waitInfo.outbound.status === 'good'
                                ? '#16a34a'
                                : waitInfo.outbound.status === 'warning'
                                ? '#d97706'
                                : '#dc2626'
                            }
                            strokeWidth="1.1"
                            filter={activePreset === 'pasajeros' ? 'drop-shadow(0 1px 3px rgba(0,0,0,0.15))' : undefined}
                          />
                          <text
                            x="0"
                            y="3"
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="900"
                            fontFamily="monospace"
                            fill={
                              waitInfo.outbound.status === 'no-bus'
                                ? '#94a3b8'
                                : waitInfo.outbound.status === 'good'
                                ? '#15803d'
                                : waitInfo.outbound.status === 'warning'
                                ? '#b45309'
                                : '#b91c1c'
                            }
                          >
                            {waitInfo.outbound.status === 'no-bus' ? 'Sin bus' : `⏱${waitInfo.outbound.waitMinutes}m`}
                          </text>
                        </g>
                      )}
                    </g>

                    {/* Station Median Node Dot */}
                    <g
                      onClick={(e) => {
                        e.stopPropagation()
                        setClickedStopId((prev) => (prev === st.stationId ? null : st.stationId))
                      }}
                      onMouseEnter={() => setHoveredStopId(st.stationId)}
                      onMouseLeave={() => setHoveredStopId(null)}
                      style={{ cursor: 'pointer' }}
                    >
                      <circle
                        cx={pos.x}
                        cy={layout.trunkY}
                        r={isStopActive ? 6.5 : 4.8}
                        fill={isStopActive ? '#38bdf8' : '#ffffff'}
                        stroke={isStopActive ? '#0284c7' : '#1d4ed8'}
                        strokeWidth="2"
                      />
                      <text
                        x={pos.x}
                        y={layout.trunkY + 3}
                        textAnchor="middle"
                        fontSize="8"
                        fontWeight="900"
                        fill={isStopActive ? '#0f172a' : '#1d4ed8'}
                      >
                        {st.stationId}
                      </text>
                    </g>
                  </g>
                )
              })}

              {/* Station 1: San José Terminal (Parque Central) */}
              <g
                transform={`translate(${layout.stationCoords[1].x}, ${layout.trunkY})`}
                onClick={(e) => {
                  e.stopPropagation()
                  setClickedStopId((prev) => (prev === 1 ? null : 1))
                }}
                onMouseEnter={() => setHoveredStopId(1)}
                onMouseLeave={() => setHoveredStopId(null)}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x="-48"
                  y="-17"
                  width="96"
                  height="34"
                  rx="5"
                  fill="#0f172a"
                  stroke={clickedStopId === 1 || hoveredStopId === 1 ? '#38bdf8' : '#3b82f6'}
                  strokeWidth="1.8"
                />
                <text x="0" y="-1.5" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="900">
                  Terminal San José
                </text>
                <text x="0" y="10.5" textAnchor="middle" fill="#94a3b8" fontSize="7.8" fontWeight="700">
                  Parque Central · C.3
                </text>
                {/* Outbound Departure wait pill */}
                {layers.stopWaitTimes &&
                  stopWaitMap.get(1)?.outbound.status !== 'no-bus' &&
                  stopWaitMap.get(1)?.outbound.waitMinutes !== null && (
                    <g transform="translate(0, 24)" className="svg-stop-wait-badge">
                      <rect
                        x="-22"
                        y="-5.5"
                        width="44"
                        height="12"
                        rx="3"
                        fill="#dcfce7"
                        stroke="#16a34a"
                        strokeWidth="0.9"
                      />
                      <text
                        x="0"
                        y="3.2"
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="900"
                        fontFamily="monospace"
                        fill="#15803d"
                      >
                        Sal: {stopWaitMap.get(1)?.outbound.waitMinutes}m
                      </text>
                    </g>
                  )}
              </g>

              {/* Station 8: Terminal Central de Coronado (Intercambio Transfer Hub - Clean Solid Node) */}
              <g
                transform={`translate(${layout.hubX}, ${layout.trunkY})`}
                className="svg-hub-station"
                onClick={(e) => {
                  e.stopPropagation()
                  setClickedStopId((prev) => (prev === 8 ? null : 8))
                }}
                onMouseEnter={() => setHoveredStopId(8)}
                onMouseLeave={() => setHoveredStopId(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx="0" cy="0" r="16" fill="none" stroke="#dc2626" strokeWidth="1.6" strokeDasharray="4 2.5" opacity="0.85" />
                <circle cx="0" cy="0" r="9.5" fill="#dc2626" stroke="#ffffff" strokeWidth="2.5" filter="url(#glowRed)" />
                {/* Transfer Hub badge */}
                <g transform="translate(0, 28)">
                  <rect
                    x="-65"
                    y="-10"
                    width="130"
                    height="20"
                    rx="4"
                    fill="#ffffff"
                    stroke={clickedStopId === 8 || hoveredStopId === 8 ? '#38bdf8' : '#dc2626'}
                    strokeWidth="1.5"
                    filter="drop-shadow(0 2px 5px rgba(0,0,0,0.12))"
                  />
                  <text x="0" y="3.5" textAnchor="middle" fontSize="9" fontWeight="900" fill="#b91c1c">
                    Terminal Central (Hub)
                  </text>
                </g>
                {/* Inbound Departure wait pill */}
                {layers.stopWaitTimes &&
                  stopWaitMap.get(8)?.inbound.status !== 'no-bus' &&
                  stopWaitMap.get(8)?.inbound.waitMinutes !== null && (
                    <g transform="translate(0, -22)" className="svg-stop-wait-badge">
                      <rect
                        x="-22"
                        y="-5.5"
                        width="44"
                        height="12"
                        rx="3"
                        fill="#dcfce7"
                        stroke="#16a34a"
                        strokeWidth="0.9"
                      />
                      <text
                        x="0"
                        y="3.2"
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="900"
                        fontFamily="monospace"
                        fill="#15803d"
                      >
                        Sal: {stopWaitMap.get(8)?.inbound.waitMinutes}m
                      </text>
                    </g>
                  )}
              </g>

              {/* 6. All 9 Feeder Routes with DUAL-RAIL GEOMETRY & TURNAROUND LOOPS */}
              {layers.feeders &&
                layout.branches.map((b) => (
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
                    {(() => {
                      const termId = `${b.id}-term`
                      const termWait = stopWaitMap.get(termId)
                      const isTermActive = clickedStopId === termId || hoveredStopId === termId
                      return (
                        <g
                          onClick={(e) => {
                            e.stopPropagation()
                            setClickedStopId((prev) => (prev === termId ? null : termId))
                          }}
                          onMouseEnter={() => setHoveredStopId(termId)}
                          onMouseLeave={() => setHoveredStopId(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          <circle cx={b.scaledEndX} cy={b.y} r={isTermActive ? 8 : 6.5} fill={isTermActive ? '#38bdf8' : b.color} stroke="#ffffff" strokeWidth="2" />
                          <text x={b.scaledEndX} y={b.y + 2.8} textAnchor="middle" fontSize="8" fill="#ffffff" fontWeight="900">
                            ↻
                          </text>

                          {layers.stopWaitTimes && termWait && (
                            <g transform={`translate(${b.scaledEndX}, ${b.y + 15})`} className="svg-stop-wait-badge">
                              <rect
                                x={termWait.inbound.status === 'no-bus' ? -18 : -16}
                                y="-5"
                                width={termWait.inbound.status === 'no-bus' ? 36 : 32}
                                height="10"
                                rx="2.5"
                                fill={
                                  termWait.inbound.status === 'no-bus'
                                    ? '#f8fafc'
                                    : termWait.inbound.status === 'good'
                                    ? '#dcfce7'
                                    : termWait.inbound.status === 'warning'
                                    ? '#fef3c7'
                                    : '#fee2e2'
                                }
                                stroke={
                                  termWait.inbound.status === 'no-bus'
                                    ? '#cbd5e1'
                                    : termWait.inbound.status === 'good'
                                    ? '#16a34a'
                                    : termWait.inbound.status === 'warning'
                                    ? '#d97706'
                                    : '#dc2626'
                                }
                                strokeWidth="0.8"
                              />
                              <text
                                x="0"
                                y="2.5"
                                textAnchor="middle"
                                fontSize="6.8"
                                fontWeight="900"
                                fontFamily="monospace"
                                fill={
                                  termWait.inbound.status === 'no-bus'
                                    ? '#94a3b8'
                                    : termWait.inbound.status === 'good'
                                    ? '#15803d'
                                    : termWait.inbound.status === 'warning'
                                    ? '#b45309'
                                    : '#b91c1c'
                                }
                              >
                                {termWait.inbound.status === 'no-bus' ? 'Sin bus' : `⏱${termWait.inbound.waitMinutes}m`}
                              </text>
                            </g>
                          )}
                        </g>
                      )
                    })()}

                    {/* Intermediate Stops along branch */}
                    {b.intermediateStops.map((istop, sIdx) => {
                      const stopId = `${b.id}-stop-${sIdx}`
                      const waitInfo = stopWaitMap.get(stopId)
                      const isStopActive = clickedStopId === stopId || hoveredStopId === stopId
                      const stopX = layout.hubX + 150 + istop.pct * (b.scaledEndX - (layout.hubX + 150))

                      return (
                        <g
                          key={`feeder-stop-${b.id}-${sIdx}`}
                          transform={`translate(${stopX}, ${b.y})`}
                          onClick={(e) => {
                            e.stopPropagation()
                            setClickedStopId((prev) => (prev === stopId ? null : stopId))
                          }}
                          onMouseEnter={() => setHoveredStopId(stopId)}
                          onMouseLeave={() => setHoveredStopId(null)}
                          style={{ cursor: 'pointer' }}
                        >
                          {layers.stopLabels && (
                            <>
                              <line x1="0" y1="-5.5" x2="0" y2="5.5" stroke={isStopActive ? '#38bdf8' : b.color} strokeWidth={isStopActive ? 2.2 : 1.5} />
                              <circle cx="0" cy="-7.5" r={isStopActive ? 4 : 3} fill={isStopActive ? '#38bdf8' : b.color} stroke="#ffffff" strokeWidth="1" />
                              <text x="0" y="-12.5" textAnchor="middle" fontSize="7.5" fontWeight="800" fill={isStopActive ? '#0284c7' : '#334155'}>
                                🚏 {istop.name}
                              </text>
                            </>
                          )}

                          {/* Real-time Wait Badges w(t) on Feeder Stops */}
                          {layers.stopWaitTimes && waitInfo && (
                            <>
                              {/* Inbound Wait (above upper rail) */}
                              <g transform="translate(0, -22)" className="svg-stop-wait-badge">
                                <rect
                                  x={waitInfo.inbound.status === 'no-bus' ? '-18' : '-15'}
                                  y="-5"
                                  width={waitInfo.inbound.status === 'no-bus' ? '36' : '30'}
                                  height="10"
                                  rx="2.5"
                                  fill={
                                    waitInfo.inbound.status === 'no-bus'
                                      ? '#f8fafc'
                                      : waitInfo.inbound.status === 'good'
                                      ? '#dcfce7'
                                      : waitInfo.inbound.status === 'warning'
                                      ? '#fef3c7'
                                      : '#fee2e2'
                                  }
                                  stroke={
                                    waitInfo.inbound.status === 'no-bus'
                                      ? '#cbd5e1'
                                      : waitInfo.inbound.status === 'good'
                                      ? '#16a34a'
                                      : waitInfo.inbound.status === 'warning'
                                      ? '#d97706'
                                      : '#dc2626'
                                  }
                                  strokeWidth="0.8"
                                />
                                <text
                                  x="0"
                                  y="2.5"
                                  textAnchor="middle"
                                  fontSize="6.8"
                                  fontWeight="900"
                                  fontFamily="monospace"
                                  fill={
                                    waitInfo.inbound.status === 'no-bus'
                                      ? '#94a3b8'
                                      : waitInfo.inbound.status === 'good'
                                      ? '#15803d'
                                      : waitInfo.inbound.status === 'warning'
                                      ? '#b45309'
                                      : '#b91c1c'
                                  }
                                >
                                  {waitInfo.inbound.status === 'no-bus' ? 'Sin bus' : `▲${waitInfo.inbound.waitMinutes}m`}
                                </text>
                              </g>

                              {/* Outbound Wait (below lower rail) */}
                              <g transform="translate(0, 16)" className="svg-stop-wait-badge">
                                <rect
                                  x={waitInfo.outbound.status === 'no-bus' ? '-18' : '-15'}
                                  y="-5"
                                  width={waitInfo.outbound.status === 'no-bus' ? '36' : '30'}
                                  height="10"
                                  rx="2.5"
                                  fill={
                                    waitInfo.outbound.status === 'no-bus'
                                      ? '#f8fafc'
                                      : waitInfo.outbound.status === 'good'
                                      ? '#dcfce7'
                                      : waitInfo.outbound.status === 'warning'
                                      ? '#fef3c7'
                                      : '#fee2e2'
                                  }
                                  stroke={
                                    waitInfo.outbound.status === 'no-bus'
                                      ? '#cbd5e1'
                                      : waitInfo.outbound.status === 'good'
                                      ? '#16a34a'
                                      : waitInfo.outbound.status === 'warning'
                                      ? '#d97706'
                                      : '#dc2626'
                                  }
                                  strokeWidth="0.8"
                                />
                                <text
                                  x="0"
                                  y="2.5"
                                  textAnchor="middle"
                                  fontSize="6.8"
                                  fontWeight="900"
                                  fontFamily="monospace"
                                  fill={
                                    waitInfo.outbound.status === 'no-bus'
                                      ? '#94a3b8'
                                      : waitInfo.outbound.status === 'good'
                                      ? '#15803d'
                                      : waitInfo.outbound.status === 'warning'
                                      ? '#b45309'
                                      : '#b91c1c'
                                  }
                                >
                                  {waitInfo.outbound.status === 'no-bus' ? 'Sin bus' : `▼${waitInfo.outbound.waitMinutes}m`}
                                </text>
                              </g>
                            </>
                          )}
                        </g>
                      )
                    })}

                    {/* Clean, Bold Branch Label */}
                    {layers.stopLabels && (
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
                    )}

                    {/* Dispatch Frequency Badge on Ramales in Despacho / Headway Mode */}
                    {layers.headways && (() => {
                      const disp = feederDispatchMap.get(b.id)
                      return (
                        <g transform={`translate(${b.scaledEndX + 14}, ${b.y + 16})`} className="feeder-dispatch-freq-badge">
                          <rect
                            x="0"
                            y="-8.5"
                            width="68"
                            height="13"
                            rx="3"
                            fill="#0f172a"
                            stroke={b.color}
                            strokeWidth="1"
                          />
                          <text
                            x="34"
                            y="1.2"
                            textAnchor="middle"
                            fontSize="7.5"
                            fontWeight="900"
                            fontFamily="monospace"
                            fill="#38bdf8"
                          >
                            ⏱ c/{disp?.intervalMin ?? 15}m · {b.buses}b
                          </text>
                        </g>
                      )
                    })()}
                  </g>
                ))}

              {/* Inter-Stop Segments: Running & Travel Time between consecutive stops (Troncal + Ramales, drawn on top of rails) */}
              {layers.interStopTimes &&
                interStopSegments.map((seg) => {
                  const isFeeder = typeof seg.fromId === 'string'
                  if (isFeeder && !layers.feeders) return null

                  return (
                    <g
                      key={`interstop-${seg.fromId}-${seg.toId}`}
                      transform={`translate(${seg.midX}, ${seg.y})`}
                      className="svg-interstop-segment"
                    >
                      <rect
                        x="-24"
                        y="-6.5"
                        width="48"
                        height="13"
                        rx="3.5"
                        fill={activePreset === 'pasajeros' ? '#eff6ff' : '#ffffff'}
                        stroke={activePreset === 'pasajeros' ? '#3b82f6' : '#94a3b8'}
                        strokeWidth={activePreset === 'pasajeros' ? 1.2 : 0.8}
                        filter="drop-shadow(0 1px 2px rgba(0,0,0,0.06))"
                      />
                      <text
                        x="0"
                        y="3"
                        textAnchor="middle"
                        fontSize="7.5"
                        fontWeight="800"
                        fill={activePreset === 'pasajeros' ? '#1d4ed8' : '#475569'}
                        fontFamily="monospace"
                      >
                        ⏱ {seg.travelMinutes}m
                      </text>
                    </g>
                  )
                })}

              {/* 7. Headway Intervals on Trunk & Feeder Corridors */}
              {layers.headways &&
                headwayLinks.map((link, idx) => {
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

                  const isTrunk = link.leadBus.section === 'trunk'
                  const isInbound = link.direction === 'INBOUND'

                  // Sentido San José (Inbound / North Track): Arches UPWARD, badges placed ABOVE bus stops
                  // Sentido Coronado (Outbound / South Track): Arches DOWNWARD, badges placed BELOW bus stops
                  const badgeY = isTrunk
                    ? (isInbound ? (link.tier === 1 ? 158 : 176) : (link.tier === 1 ? 336 : 318))
                    : (isInbound ? link.leadBus.y - 18 : link.leadBus.y + 11)

                  const startY = isTrunk
                    ? (isInbound ? link.leadBus.y - 7 : link.leadBus.y + 7)
                    : (isInbound ? link.leadBus.y - 4.5 : link.leadBus.y + 4.5)
                  const endY = isTrunk
                    ? (isInbound ? link.trailBus.y - 7 : link.trailBus.y + 7)
                    : (isInbound ? link.trailBus.y - 4.5 : link.trailBus.y + 4.5)
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
                if (bus.isOvernightDepot && !layers.depot) return null
                if (bus.section.startsWith('R142-') && !layers.feeders) return null

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

              {/* 10. Bus Stop HUD Card: Shown when a bus stop is clicked or hovered */}
              {activeStop && (() => {
                const cardW = 250
                const cardH = 144
                const isFeeder = typeof activeStop.stationId === 'string'
                const cardX = isFeeder
                  ? Math.max(20, Math.min(1240 - cardW, activeStop.x - cardW - 15))
                  : Math.max(20, Math.min(layout.hubX - cardW - 10, activeStop.x - cardW / 2))
                const cardY = isFeeder
                  ? Math.max(20, Math.min(480 - cardH, activeStop.y - cardH / 2))
                  : 52

                return (
                  <g transform={`translate(${cardX}, ${cardY})`} className="svg-stop-hud" style={{ pointerEvents: 'none' }}>
                    <rect
                      width={cardW}
                      height={cardH}
                      rx="8"
                      fill="#0f172a"
                      stroke="#38bdf8"
                      strokeWidth="1.6"
                      filter="drop-shadow(0 8px 24px rgba(0,0,0,0.65))"
                    />
                    {/* Header */}
                    <rect width={cardW} height="28" rx="8" fill="#1e293b" />
                    <rect y="20" width={cardW} height="8" fill="#1e293b" />
                    <text x="12" y="18" fill="#38bdf8" fontSize="10" fontWeight="900">
                      🚏 Parada {activeStop.name}
                    </text>
                    <text x={cardW - 12} y="18" fill="#94a3b8" fontSize="8" fontWeight="800" textAnchor="end">
                      {activeStop.sub}
                    </text>

                    {/* Inbound Row */}
                    <g transform="translate(12, 38)">
                      <circle cx="3" cy="5" r="3" fill={activeStop.inbound.status === 'no-bus' ? '#64748b' : '#3b82f6'} />
                      <text x="10" y="8" fill={activeStop.inbound.status === 'no-bus' ? '#94a3b8' : '#93c5fd'} fontSize="8.5" fontWeight="800">
                        {isFeeder ? '◀ Retorno a Terminal Central:' : '◀ Retorno a San José:'}
                      </text>
                      <text
                        x={cardW - 24}
                        y="8"
                        fill={activeStop.inbound.status === 'no-bus' ? '#94a3b8' : '#ffffff'}
                        fontSize="9"
                        fontWeight="900"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {activeStop.inbound.status === 'no-bus' ? 'Sin bus' : `⏱️ ${activeStop.inbound.waitMinutes} min`}
                      </text>
                      <text x="10" y="21" fill={activeStop.inbound.status === 'no-bus' ? '#64748b' : '#cbd5e1'} fontSize="7.8">
                        {activeStop.inbound.status === 'no-bus'
                          ? 'Sin unidades en aproximación activa'
                          : activeStop.inbound.approachingBus
                          ? `Próx: ${activeStop.inbound.approachingBus.vehicleId} · a ${activeStop.inbound.gapKm} km (${activeStop.inbound.approachingBus.paxCount} pax)`
                          : isFeeder
                          ? `Próx. retorno en ramal (${activeStop.inbound.gapKm} km)`
                          : `Próx. salida en Terminal Central (${activeStop.inbound.gapKm} km)`}
                      </text>
                    </g>

                    {/* Divider */}
                    <line x1="12" y1="70" x2={cardW - 12} y2="70" stroke="#334155" strokeWidth="0.8" />

                    {/* Outbound Row */}
                    <g transform="translate(12, 80)">
                      <circle cx="3" cy="5" r="3" fill={activeStop.outbound.status === 'no-bus' ? '#64748b' : '#1d4ed8'} />
                      <text x="10" y="8" fill={activeStop.outbound.status === 'no-bus' ? '#94a3b8' : '#60a5fa'} fontSize="8.5" fontWeight="800">
                        {isFeeder ? `▶ Ida hacia ${activeStop.name}:` : '▶ Ida a Coronado:'}
                      </text>
                      <text
                        x={cardW - 24}
                        y="8"
                        fill={activeStop.outbound.status === 'no-bus' ? '#94a3b8' : '#ffffff'}
                        fontSize="9"
                        fontWeight="900"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {activeStop.outbound.status === 'no-bus' ? 'Sin bus' : `⏱️ ${activeStop.outbound.waitMinutes} min`}
                      </text>
                      <text x="10" y="21" fill={activeStop.outbound.status === 'no-bus' ? '#64748b' : '#cbd5e1'} fontSize="7.8">
                        {activeStop.outbound.status === 'no-bus'
                          ? 'Sin unidades en aproximación activa'
                          : activeStop.outbound.approachingBus
                          ? `Próx: ${activeStop.outbound.approachingBus.vehicleId} · a ${activeStop.outbound.gapKm} km (${activeStop.outbound.approachingBus.paxCount} pax)`
                          : isFeeder
                          ? `Próx. salida en Terminal Central (${activeStop.outbound.gapKm} km)`
                          : `Próx. salida en Terminal San José (${activeStop.outbound.gapKm} km)`}
                      </text>
                    </g>

                    {/* Divider */}
                    <line x1="12" y1="112" x2={cardW - 12} y2="112" stroke="#334155" strokeWidth="0.8" />

                    {/* Travel time row */}
                    <g transform="translate(12, 122)">
                      <text x="0" y="10" fill="#f8fafc" fontSize="7.8" fontWeight="700">
                        {activeStop.nextCoro
                          ? `⏱️ Tiempo a ${activeStop.nextCoro.toName}: ${activeStop.nextCoro.travelMinutes} min (${activeStop.nextCoro.distKm} km)`
                          : activeStop.nextSJ
                          ? `⏱️ Tiempo a ${activeStop.nextSJ.toName}: ${activeStop.nextSJ.travelMinutes} min (${activeStop.nextSJ.distKm} km)`
                          : 'Punto extremo de ruta · Concesión CTP'}
                      </text>
                    </g>
                  </g>
                )
              })()}
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
            {activePreset === 'pasajeros' || (layers.stopWaitTimes && !layers.headways) ? (
              <div className="advisory-text text-emerald">
                <strong style={{ color: '#0284c7' }}>Intervalos de Espera para el Pasajero w(t):</strong> Tiempo promedio estimado de espera: <strong>{waitSummary.avg} min</strong> en paradas de Troncal 142.
                <span> Frecuencia regular CTP en corredor: cada 5 a 8 minutos. {layers.interStopTimes ? 'Tiempos entre paradas indicados en las etiquetas ⏱ del carril central.' : ''}</span>
                {waitSummary.maxWait > 10 && (
                  <span style={{ color: '#b91c1c', marginLeft: '6px' }}>
                    ⚠️ Se detecta mayor espera en {waitSummary.maxStopName} ({waitSummary.maxWait} min).
                  </span>
                )}
              </div>
            ) : totalBunched > 0 ? (
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
