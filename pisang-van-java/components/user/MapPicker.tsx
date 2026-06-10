'use client'

import { useEffect, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix missing marker icons in react-leaflet
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

interface MapPickerProps {
  position: [number, number] | null
  setPosition: (pos: [number, number]) => void
  setAddressName?: (addr: string) => void
}

function LocationMarker({ position, setPosition, setAddressName }: MapPickerProps) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng])

      // Reverse geocode via Nominatim OSM
      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&zoom=18&addressdetails=1`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data && data.display_name && setAddressName) {
            setAddressName(data.display_name)
          }
        })
        .catch((err) => console.error('Reverse Geocode Error:', err))
    }
  })

  return position === null ? null : <Marker position={position} icon={customIcon}></Marker>
}

export default function MapPicker({ position, setPosition, setAddressName }: MapPickerProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="w-full h-[300px] bg-zinc-100 dark:bg-zinc-800 animate-pulse rounded-xl flex items-center justify-center text-zinc-400">
        Loading Map...
      </div>
    )
  }

  const defaultCenter: [number, number] = [-6.914744, 107.60981] // Bandung center

  return (
    <div className="w-full h-[300px] rounded-xl overflow-hidden shadow-sm z-0 relative">
      <MapContainer
        center={position || defaultCenter}
        zoom={13}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker
          position={position}
          setPosition={setPosition}
          setAddressName={setAddressName}
        />
      </MapContainer>
      <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur dark:bg-zinc-900/90 px-4 py-2 rounded-full text-xs font-semibold shadow z-[400] pointer-events-none text-zinc-700 dark:text-zinc-200">
        Klik peta untuk memilih lokasi
      </div>
    </div>
  )
}
