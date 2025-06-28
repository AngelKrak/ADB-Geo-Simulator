'use client'

import { useRef, useState, useCallback, FormEvent, ChangeEvent } from 'react'
import dynamic from 'next/dynamic'
import {
  Upload,
  MapPin,
  List,
  Smartphone,
  MapPinnedIcon,
} from 'lucide-react'
import { Platform, SimType } from '@/types/gpx'
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
})

const defaultPosition = { lat: 25.721314872473577, lon: -100.37379898123986 }

const platformTabs = [
  { key: 'android', label: 'Android', icon: Smartphone },
  { key: 'ios', label: 'iOS', icon: Smartphone },
] as const

const simTabs = [
  { key: 'gpx', label: 'Archivo GPX', icon: Upload },
  { key: 'manual', label: 'Coordenada manual', icon: MapPin },
  { key: 'batch', label: 'Lote de coordenadas', icon: List },
  { key: 'map', label: 'Mapa', icon: MapPinnedIcon },
] as const

export default function Home() {
  const [status, setStatus] = useState<string>('')
  const [manual, setManual] = useState<string>('')
  const [batch, setBatch] = useState<string>('')
  const [mapMode, setMapMode] = useState<'location' | 'route'>('location')
  const [mapCoord, setMapCoord] = useState<{ lat: number, lon: number, label?: string } | null>(defaultPosition)
  const [routeCoords, setRouteCoords] = useState<{
    from: { lat: number; lon: number; label?: string };
    to: { lat: number; lon: number; label?: string };
    route: { lat: number, lng: number }[]
  } | null>(null)
  const [hasError, setHasError] = useState<boolean>(false)
  const [fileName, setFileName] = useState<string>('')

  const [platform, setPlatform] = useState<Platform>('android')
  const [simType, setSimType] = useState<SimType>('gpx')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileClick = useCallback(() => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
      fileInputRef.current.click()
      setFileName('')
    }
  }, [])

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      setFileName(file?.name ?? '')
      setHasError(!file)
    },
    []
  )

  const handleSelectMap = useCallback((lat: number, lon: number, label?: string) => {
    setMapCoord({ lat, lon, label });
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const form = new FormData(e.currentTarget)
      form.set('platform', platform)

      if (simType === 'gpx' && !fileInputRef.current?.files?.length) {
        setHasError(true)
        return
      }

      if (simType === 'manual') form.set('manual', manual)
      if (simType === 'batch') form.set('batch', batch)

      if (simType === 'map' && mapMode === "location" && mapCoord) {
        form.set('manual', `${mapCoord.lat},${mapCoord.lon}`)
      } else if (simType === 'map' && mapMode === "route" && routeCoords) {
        const routeBatchText = routeCoords.route
          .map(coord => `${coord.lat},${coord.lng}`)
          .join('\n');
        form.set('batch', routeBatchText)
      }

      setHasError(false)
      setStatus('⏳ Enviando coordenadas...')

      try {
        const res = await fetch('/api/simulate', {
          method: 'POST',
          body: form,
        })

        const data = await res.json()
        setStatus(
          res.ok
            ? `✅ Simulación iniciada con ${data.total} coordenadas`
            : `❌ Error: ${data.error}`
        )
      } catch {
        setStatus('❌ Error en la conexión con el servidor')
      }
    },
    [platform, simType, manual, batch, mapCoord, mapMode, routeCoords]
  )

  const renderInputSection = () => {
    switch (simType) {
      case 'gpx':
        return (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Selecciona un archivo GPX:
            </label>
            <div
              className={`flex items-center gap-3 px-4 py-2 rounded-lg bg-white border ${hasError
                ? 'border-red-500 ring-1 ring-red-300'
                : 'border-gray-300 focus-within:ring-1 focus-within:ring-blue-300'
                }`}
            >
              <button
                type="button"
                onClick={handleFileClick}
                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg font-medium shadow"
              >
                <Upload className="w-4 h-4 mr-2" />
                Elegir archivo
              </button>
              <span className="text-sm text-gray-600 truncate max-w-[200px]">
                {fileName || 'Ningún archivo seleccionado'}
              </span>
            </div>
            {hasError && (
              <p className="mt-4 text-sm text-red-600">
                Debes seleccionar un archivo GPX.
              </p>
            )}
            <input
              ref={fileInputRef}
              id="gpx-upload"
              type="file"
              name="gpx"
              accept=".gpx"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        )

      case 'manual':
        return (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Coordenada (lat, lon):
            </label>
            <input
              type="text"
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder="Ej: 19.4326,-99.1332"
            />
          </div>
        )

      case 'batch':
        return (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Lote de coordenadas:
            </label>
            <textarea
              value={batch}
              onChange={(e) => setBatch(e.target.value)}
              required
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
              placeholder={`Una coordenada por línea:\n19.4326,-99.1332\n25.72533,-100.37566`}
            />
          </div>
        )

      case 'map':
        return (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Selecciona una ubicación en el mapa:
            </label>
            <MapComponent
              onSelect={handleSelectMap}
              mode={mapMode}
              setMode={setMapMode}
              setRouteCoords={setRouteCoords}
              initial={defaultPosition}
            />
            {(mapCoord && mapMode === "location") && (
              <p className="mt-2 text-sm text-gray-600">
                Coordenadas: {mapCoord.lat.toFixed(5)}, {mapCoord.lon.toFixed(5)}
              </p>
            )}
          </div>
        )


      default:
        return null
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-200 py-16 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-3xl p-10 border border-gray-200 shadow-2xl shadow-black/10">
        <h1 className="text-4xl font-extrabold text-center text-blue-600 mb-8 tracking-tight">
          Simulador de Ubicación
        </h1>

        {/* Plataforma */}
        <div className="flex justify-center mb-6 gap-3">
          {platformTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setPlatform(key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium border transition-all ${platform === key
                ? 'bg-blue-100 text-blue-700 border-blue-300 shadow'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </div>

        {/* Tipo de simulación */}
        <div className="grid grid-cols-2 justify-center mb-8 gap-3">
          {simTabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setSimType(key)}
              className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-lg font-medium border transition-all ${simType === key
                ? 'bg-green-100 text-green-700 border-green-300 shadow'
                : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                }`}
            >
              <span style={{ width: 22 }}>
                <Icon size={22} />
              </span>
              {label}
            </button>
          ))}
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {renderInputSection()}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
          >
            🚀 Simular Ubicación
          </button>
        </form>

        {/* Estado */}
        {status && (
          <p className="mt-6 text-center text-sm font-medium text-gray-700">
            {status}
          </p>
        )}
      </div>

      <footer className="text-center text-xs text-gray-400 mt-10">
        Hecho con 💙 para pruebas de ubicación
      </footer>
    </main>
  )
}