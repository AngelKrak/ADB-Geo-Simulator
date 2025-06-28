'use client'

import 'leaflet/dist/leaflet.css'
import 'leaflet-control-geocoder/dist/Control.Geocoder.css'
import 'leaflet-routing-machine/dist/leaflet-routing-machine.css';

import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap, Popup } from 'react-leaflet'
import { geocoder } from 'leaflet-control-geocoder'
import L from 'leaflet'
import 'leaflet-routing-machine'

import { GeocodeEvent } from '@/types/map';

type LatLon = { lat: number; lon: number; label?: string }

type Props = {
  onSelect: (lat: number, lon: number, label?: string) => void
  mode: 'location' | 'route',
  setMode: React.Dispatch<React.SetStateAction<"location" | "route">>,
  setRouteCoords?: React.Dispatch<
    React.SetStateAction<{
      from: LatLon
      to: LatLon
      route: L.LatLngLiteral[]
    } | null>
  >,
  initial?: LatLon
}

type RoutingControlProps = {
  from: LatLon
  to: LatLon
  setFrom: React.Dispatch<React.SetStateAction<LatLon>>
  setTo: React.Dispatch<React.SetStateAction<LatLon>>
  setRouteCoords: Props["setRouteCoords"]
}

type InputCoordinatesProps = {
  from: { lat: number; lon: number }
  to: { lat: number; lon: number }
  onChangeFrom: (lat: number, lon: number) => void
  onChangeTo: (lat: number, lon: number) => void
}

const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowUrl: 'https://unpkg.com/leaflet@1.9.3/dist/images/marker-shadow.png',
  shadowSize: [41, 41],
})

function GeocoderControl({ onSelect }: { onSelect: Props['onSelect'] }) {
  const map = useMap()

  useEffect(() => {
    const _geocoder = geocoder({
      placeholder: 'Buscar dirección...',
      showResultIcons: false,
      defaultMarkGeocode: false,
    })
      .on('markgeocode', function (e: GeocodeEvent) {
        const { center, name } = e.geocode
        map.setView(center)
        onSelect(center.lat, center.lng, name)
      })
      .addTo(map)

    return () => {
      if (map && _geocoder) {
        map.removeControl(_geocoder)
      }
    }
  }, [map, onSelect])

  return null
}

const RoutingControl = ({ from, to, setFrom, setTo, setRouteCoords }: RoutingControlProps) => {
  const map = useMap()

  const isValidLatLon = (point: unknown): point is LatLon =>
    typeof point === 'object' &&
    point !== null &&
    'lat' in point &&
    'lon' in point &&
    typeof (point as Record<string, unknown>).lat === 'number' &&
    typeof (point as Record<string, unknown>).lon === 'number';

  useEffect(() => {
    if (!map || !isValidLatLon(from) || !isValidLatLon(to)) return

    const routingControl = L.Routing.control({
      waypoints: [L.latLng(from.lat, from.lon), L.latLng(to.lat, to.lon)],
      routeWhileDragging: false,
      addWaypoints: false,
      createMarker: (i: number, waypoint: L.Routing.Waypoint) => {
        return L.marker(waypoint.latLng, {
          icon: customIcon,
          draggable: true,
        }).on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng()
          if (i === 0) {
            setFrom({ lat, lon: lng })
          } else {
            setTo({ lat, lon: lng })
          }
        })
      },
    } as L.Routing.RoutingControlOptions) as L.Routing.Control

    if (routingControl && map) routingControl.addTo(map)

    const onRouteFound = (e: L.Routing.RoutingResultEvent) => {
      const coordinates = e.routes?.[0]?.coordinates
      if (setRouteCoords && coordinates) {
        setRouteCoords({
          from,
          to,
          route: coordinates
        });
      }
    }

    routingControl.on('routesfound', onRouteFound)

    return () => {
      routingControl.remove()
    }
  }, [map, from, setFrom, to, setTo, setRouteCoords])

  return null
}

const InputCoordinates: React.FC<InputCoordinatesProps> = ({ from, to, onChangeFrom, onChangeTo }) => {
  return (
    <div className="p-4 bg-gray-50 mx-auto w-full">
      <h3 className="text-lg font-semibold mb-2 text-gray-700">Actualiza tus coordenadas</h3>
      <p className="text-sm text-gray-500 mb-4">
        Elige una ubicación en el mapa o ingresa las coordenadas manualmente para establecer el punto exacto.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* From */}
        <div>
          <label className="block text-gray-500 text-sm mb-1" htmlFor="from-lat">Latitud de origen</label>
          <input
            id="from-lat"
            type="number"
            step="any"
            value={from.lat.toFixed(5)}
            onChange={(e) => onChangeFrom(Number(e.target.value), from.lon)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            placeholder="25.7213"
          />
        </div>
        <div>
          <label className="block text-gray-500 text-sm mb-1" htmlFor="from-lon">Longitud de origen</label>
          <input
            id="from-lon"
            type="number"
            step="any"
            value={from.lon.toFixed(5)}
            onChange={(e) => onChangeFrom(from.lat, Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            placeholder="-100.3737"
          />
        </div>

        {/* To */}
        <div>
          <label className="block text-gray-500 text-sm mb-1" htmlFor="to-lat">Latitud de destino</label>
          <input
            id="to-lat"
            type="number"
            step="any"
            value={to.lat.toFixed(5)}
            onChange={(e) => onChangeTo(Number(e.target.value), to.lon)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            placeholder="25.723"
          />
        </div>
        <div>
          <label className="block text-gray-500 text-sm mb-1" htmlFor="to-lon">Longitud de destino</label>
          <input
            id="to-lon"
            type="number"
            step="any"
            value={to.lon.toFixed(5)}
            onChange={(e) => onChangeTo(to.lat, Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400"
            placeholder="-100.375"
          />
        </div>
      </div>
    </div>
  )
}

const LocationMarker = React.memo(
  ({
    position,
    setPosition,
    onSelect,
  }: {
    position: LatLon
    setPosition: React.Dispatch<React.SetStateAction<LatLon>>
    onSelect: Props['onSelect']
  }) => {
    useMapEvents({
      click(e) {
        const { lat, lng } = e.latlng
        const newPos = { lat, lon: lng }
        setPosition(newPos)
        onSelect(lat, lng)
      },
    })

    return (
      <Marker
        position={[position.lat, position.lon]}
        icon={customIcon}
        draggable={true}
        eventHandlers={{
          dragend: (e) => {
            const { lat, lng } = e.target.getLatLng()
            const newPos = { lat, lon: lng }
            setPosition(newPos)
            onSelect(lat, lng)
          },
        }}
      >
        {position.label && <Popup>{position.label}</Popup>}
      </Marker>
    )
  }
)
LocationMarker.displayName = 'LocationMarker'

function MapComponent({ onSelect, mode, setMode, setRouteCoords, initial }: Props) {
  const [locationPosition, setLocationPosition] = useState<LatLon>(initial ?? { lat: 0, lon: 0 })

  const [routeFrom, setRouteFrom] = useState<LatLon>({ lat: 0, lon: 0 })
  const [routeTo, setRouteTo] = useState<LatLon>({ lat: 0, lon: 0 })
  const [clickCount, setClickCount] = useState(0)

  const isTooClose = (pos1: LatLon, pos2: LatLon) => {
    const distance = Math.sqrt(
      Math.pow(pos1.lat - pos2.lat, 2) + Math.pow(pos1.lon - pos2.lon, 2)
    )
    return distance < 0.0001 // umbral arbitrario para distancia mínima
  }

  function RouteClickHandler({
    setFrom,
    setTo,
    setClickCount,
  }: {
    setFrom: React.Dispatch<React.SetStateAction<LatLon>>
    setTo: React.Dispatch<React.SetStateAction<LatLon>>
    setClickCount: React.Dispatch<React.SetStateAction<number>>
  }) {
    useMapEvents({
      click(e) {
        setClickCount((prev) => {
          const { lat, lng } = e.latlng
          if (prev === 0) {
            setFrom({ lat, lon: lng })
            return 1
          }
          if (prev === 1) {
            setTo({ lat, lon: lng })
            return 2
          }
          // Reiniciar
          setFrom({ lat: 0, lon: 0 })
          setTo({ lat: 0, lon: 0 })
          return 0
        })
      },
    })
    return null
  }

  function handleSelect(lat: number, lon: number, label?: string) {
    if (mode === 'location') {
      setRouteFrom({ lat, lon, label })
      onSelect(lat, lon, label)
    } else if (mode === 'route') {
      if (clickCount % 2 === 0) {
        const newFrom = { lat, lon, label }
        if (!isTooClose(newFrom, routeTo)) {
          setRouteFrom(newFrom)
          setClickCount(clickCount + 1)
        } else {
          alert('El punto "from" no puede estar en la misma ubicación o muy cerca del "to".')
        }
      } else {
        const newTo = { lat, lon, label }
        if (!isTooClose(routeFrom, newTo)) {
          setRouteTo(newTo)
          setClickCount(clickCount + 1)
        } else {
          alert('El punto "to" no puede estar en la misma ubicación o muy cerca del "from".')
        }
      }
    }
  }

  return (
    <div className="w-full rounded-lg overflow-hidden border border-gray-300">
      <div className="flex gap-4 p-2 bg-gray-100 border-b border-gray-300">
        <button
          type='button'
          onClick={() => setMode('location')}
          className={`px-4 py-1.5 rounded-lg ${mode === 'location' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
        >
          Ubicación fija
        </button>
        <button
          type='button'
          onClick={() => setMode('route')}
          className={`text-md px-4 py-1.5 rounded-lg ${mode === 'route' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
        >
          Ruta
        </button>
      </div>

      {/* Inputs para editar coordenadas manualmente */}
      {mode === 'route' && (
        <InputCoordinates
          from={routeFrom}
          to={routeTo}
          onChangeFrom={(lat, lon) => setRouteFrom({ lat, lon })}
          onChangeTo={(lat, lon) => setRouteTo({ lat, lon })}
        />
      )}

      <div style={{ height: 'clamp(180px, 50vh, 400px)' }}>
        <MapContainer center={[locationPosition.lat, locationPosition.lon]} zoom={17} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          />

          <GeocoderControl onSelect={handleSelect} />

          {mode === 'route' ? (
            <>
              <RouteClickHandler
                setFrom={setRouteFrom}
                setTo={setRouteTo}
                setClickCount={setClickCount}
              />
              {clickCount >= 2 ? (
                <RoutingControl
                  from={routeFrom}
                  to={routeTo}
                  setFrom={setRouteFrom}
                  setTo={setRouteTo}
                  setRouteCoords={setRouteCoords}
                />
              ) : (
                <>
                  <Marker position={[routeFrom.lat, routeFrom.lon]} icon={customIcon}>
                    <Popup>Origen</Popup>
                  </Marker>
                  <Marker position={[routeTo.lat, routeTo.lon]} icon={customIcon}>
                    <Popup>Destino</Popup>
                  </Marker>
                </>
              )}
            </>
          ) : (
            <LocationMarker position={locationPosition} setPosition={setLocationPosition} onSelect={onSelect} />
          )}
        </MapContainer>
      </div>
    </div>
  )
}

const MemoizedMapComponent = React.memo(MapComponent)
MemoizedMapComponent.displayName = 'MapComponent'

export default MemoizedMapComponent