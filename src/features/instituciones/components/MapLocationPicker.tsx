import { useCallback, useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from '@/components/ui/button'
import { Loader2, MapPin, LocateFixed, Check, X } from 'lucide-react'

// Fix default marker icons (Leaflet + bundlers lose the asset path)
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

interface MapLocationPickerProps {
  estado: string
  ciudad: string
  initialLat: number | null
  initialLng: number | null
  onConfirm: (lat: number, lng: number) => void
  onCancel: () => void
}

// Geocode using Nominatim (free, no API key)
async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=mx`
    const res = await fetch(url, {
      headers: { 'Accept-Language': 'es' },
    })
    const data = await res.json()
    if (data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) }
    }
    return null
  } catch {
    return null
  }
}

// Sub-component: click handler on the map
function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

// Sub-component: fly to a new center when props change
function FlyToCenter({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap()
  const prevCenter = useRef<string>('')

  useEffect(() => {
    const key = `${center[0]},${center[1]}`
    if (key !== prevCenter.current) {
      prevCenter.current = key
      map.flyTo(center, zoom, { duration: 1.2 })
    }
  }, [center, zoom, map])

  return null
}

const MEXICO_CENTER: [number, number] = [23.6345, -102.5528]
const DEFAULT_ZOOM = 5
const CITY_ZOOM = 13

export function MapLocationPicker({
  estado,
  ciudad,
  initialLat,
  initialLng,
  onConfirm,
  onCancel,
}: MapLocationPickerProps) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    initialLat != null && initialLng != null ? { lat: initialLat, lng: initialLng } : null,
  )
  const [center, setCenter] = useState<[number, number]>(
    initialLat != null && initialLng != null
      ? [initialLat, initialLng]
      : MEXICO_CENTER,
  )
  const [zoom, setZoom] = useState(initialLat != null ? CITY_ZOOM : DEFAULT_ZOOM)
  const [geocoding, setGeocoding] = useState(false)

  // Geocode estado+ciudad on mount (only if no initial coords)
  useEffect(() => {
    if (initialLat != null && initialLng != null) return
    if (!estado && !ciudad) return

    let cancelled = false
    setGeocoding(true)

    const query = ciudad
      ? `${ciudad}, ${estado}, México`
      : `${estado}, México`

    geocode(query).then((result) => {
      if (cancelled) return
      setGeocoding(false)
      if (result) {
        setCenter([result.lat, result.lng])
        setZoom(CITY_ZOOM)
      }
    })

    return () => { cancelled = true }
  }, [estado, ciudad, initialLat, initialLng])

  const handleClick = useCallback((lat: number, lng: number) => {
    setMarker({ lat, lng })
  }, [])

  const handleConfirm = () => {
    if (marker) {
      onConfirm(marker.lat, marker.lng)
    }
  }

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">
          <LocateFixed className="h-4 w-4 text-primary" />
          Selecciona la ubicación exacta en el mapa
        </div>
        {geocoding && (
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Buscando ubicación…
          </span>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Haz clic en el mapa para colocar el marcador en la ubicación exacta de la institución.
      </p>

      <div className="relative h-[350px] w-full overflow-hidden rounded-md border">
        <MapContainer
          center={center}
          zoom={zoom}
          className="h-full w-full"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onClick={handleClick} />
          <FlyToCenter center={center} zoom={zoom} />
          {marker && <Marker position={[marker.lat, marker.lng]} />}
        </MapContainer>
      </div>

      {marker && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>Lat: {marker.lat.toFixed(6)}, Lng: {marker.lng.toFixed(6)}</span>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          <X className="mr-1 h-3 w-3" />
          Cancelar
        </Button>
        <Button type="button" size="sm" onClick={handleConfirm} disabled={!marker}>
          <Check className="mr-1 h-3 w-3" />
          Confirmar ubicación
        </Button>
      </div>
    </div>
  )
}
