'use client'

import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix default icon issue with Leaflet in React Next.js
const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

type LatLng = { lat: number; lng: number }

function LocationMarker({ position, setPosition }: { position: LatLng | null, setPosition: (p: LatLng) => void }) {
  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng)
      map.flyTo(e.latlng, map.getZoom())
    },
  })

  return position === null ? null : (
    <Marker 
      position={position} 
      icon={customIcon} 
      draggable={true} 
      eventHandlers={{
        dragend: (e) => {
          const marker = e.target
          setPosition(marker.getLatLng())
        }
      }} 
    />
  )
}

interface MapPickerProps {
  initialPosition?: LatLng | null
  onPositionChange: (pos: LatLng) => void
}

export default function MapPicker({ initialPosition, onPositionChange }: MapPickerProps) {
  // Default to Bandung center if no initial position
  const [position, setPosition] = useState<LatLng>(
    initialPosition || { lat: -6.914744, lng: 107.609810 }
  )

  useEffect(() => {
    onPositionChange(position)
  }, [position, onPositionChange])

  return (
    <div className="h-64 w-full rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 relative z-0">
      <MapContainer center={position} zoom={15} scrollWheelZoom={true} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker position={position} setPosition={setPosition} />
      </MapContainer>
    </div>
  )
}
