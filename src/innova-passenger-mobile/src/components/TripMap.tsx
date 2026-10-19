import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { TripOption, GeoPoint } from '../types'

interface TripMapProps {
  selectedOption: TripOption | null
  userLocation: GeoPoint
  busPosition?: GeoPoint
  busHeading?: number
  busPlate?: string
}

export const TripMap: React.FC<TripMapProps> = ({
  selectedOption,
  userLocation,
  busPosition,
  busPlate = 'SJB-2267',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const layerGroupRef = useRef<L.LayerGroup | null>(null)

  useEffect(() => {
    const container = mapContainerRef.current
    if (!container) return

    // Safely cleanup previous map instance
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove()
      mapInstanceRef.current = null
    }
    if ((container as any)._leaflet_id) {
      delete (container as any)._leaflet_id
    }

    try {
      const map = L.map(container, {
        zoomControl: false,
        attributionControl: false,
      }).setView([userLocation.lat, userLocation.lon], 13)

      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
      }).addTo(map)

      const layerGroup = L.layerGroup().addTo(map)
      layerGroupRef.current = layerGroup
      mapInstanceRef.current = map
    } catch (e) {
      console.warn('Map initialization note:', e)
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const map = mapInstanceRef.current
    const layerGroup = layerGroupRef.current
    if (!map || !layerGroup) return

    layerGroup.clearLayers()

    // 1. User current location marker
    const userIcon = L.divIcon({
      className: 'user-marker',
      html: `
        <div style="width: 14px; height: 14px; background: #2f81f7; border: 3px solid #ffffff; border-radius: 50%; box-shadow: 0 0 10px rgba(47,129,247,0.8);"></div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    })
    L.marker([userLocation.lat, userLocation.lon], { icon: userIcon })
      .bindPopup('Tu ubicación')
      .addTo(layerGroup)

    const bounds = L.latLngBounds([L.latLng(userLocation.lat, userLocation.lon)])

    // 2. Draw trip legs if an option is selected
    if (selectedOption) {
      selectedOption.legs.forEach(leg => {
        if (leg.type === 'WALK') {
          const walkLine = L.polyline(
            [
              [leg.from.lat, leg.from.lon],
              [leg.to.lat, leg.to.lon],
            ],
            {
              color: '#8b949e',
              weight: 4,
              dashArray: '6, 8',
              opacity: 0.9,
            }
          )
          walkLine.addTo(layerGroup)
          bounds.extend([leg.from.lat, leg.from.lon])
          bounds.extend([leg.to.lat, leg.to.lon])
        } else if (leg.type === 'BUS' && leg.bus) {
          // Bus path
          const latLngs = leg.bus.path.map(p => [p.lat, p.lon] as [number, number])
          const busLine = L.polyline(latLngs, {
            color: '#1f6feb',
            weight: 5,
            opacity: 0.95,
          })
          busLine.addTo(layerGroup)
          latLngs.forEach(p => bounds.extend(p))

          // Bus stop markers
          const stopIcon = L.divIcon({
            className: 'stop-marker',
            html: `
              <div style="background: #161b22; border: 2px solid #3fb950; border-radius: 6px; padding: 2px 5px; font-size: 9px; font-weight: 700; color: #fff; white-space: nowrap;">
                🚏 ${leg.from.name}
              </div>
            `,
            iconSize: [80, 20],
            iconAnchor: [40, 25],
          })
          L.marker([leg.from.lat, leg.from.lon], { icon: stopIcon }).addTo(layerGroup)
        }
      })
    }

    // 3. Live Bus Marker
    const currentBusPos = busPosition || (selectedOption?.legs.find(l => l.bus)?.bus?.vehicle.location)
    if (currentBusPos) {
      const busIcon = L.divIcon({
        className: 'bus-marker',
        html: `
          <div style="display: flex; flex-direction: column; align-items: center;">
            <div style="background: #238636; border: 2px solid #fff; border-radius: 8px; padding: 3px 6px; font-size: 10px; font-weight: 800; color: #fff; box-shadow: 0 4px 10px rgba(0,0,0,0.6); display: flex; align-items: center; gap: 4px;">
              <span>🚌</span>
              <span>${busPlate}</span>
            </div>
            <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-top: 5px solid #238636;"></div>
          </div>
        `,
        iconSize: [70, 30],
        iconAnchor: [35, 30],
      })

      L.marker([currentBusPos.lat, currentBusPos.lon], { icon: busIcon })
        .bindPopup(`Bus ${busPlate} en circulación`)
        .addTo(layerGroup)

      bounds.extend([currentBusPos.lat, currentBusPos.lon])
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [35, 35], maxZoom: 15 })
    }
  }, [selectedOption, userLocation, busPosition, busPlate])

  return (
    <div className="map-container">
      <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
