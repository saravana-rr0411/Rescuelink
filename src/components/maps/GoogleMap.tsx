import React from 'react';
import { APIProvider, Map, Marker, type MapMouseEvent } from '@vis.gl/react-google-maps';

export interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  title?: string;
}

export interface GoogleMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarker[];
  className?: string;
  gestureHandling?: 'greedy' | 'cooperative' | 'auto' | 'none';
  zoomControl?: boolean;
  fullscreenControl?: boolean;
  streetViewControl?: boolean;
  mapTypeControl?: boolean;
  disableDefaultUI?: boolean;
  onMapClick?: (coords: { lat: number; lng: number }) => void;
}

export const GoogleMap: React.FC<GoogleMapProps> = ({
  center,
  zoom = 15,
  markers = [],
  className = 'w-full h-full',
  gestureHandling = 'greedy',
  zoomControl = true,
  fullscreenControl = true,
  streetViewControl = true,
  mapTypeControl = true,
  disableDefaultUI = false,
  onMapClick,
}) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim() || 'AIzaSyA79hWKJ8jS6ACxdtb44LT1oWIACZj1upY';
  const mapId = (import.meta.env.VITE_GOOGLE_MAPS_ID || '').trim();

  if (!apiKey) {
    return (
      <div className={`flex flex-col items-center justify-center bg-amber-50 p-4 text-center rounded-2xl border border-amber-200 ${className}`}>
        <p className="text-xs font-bold text-amber-900">Google Maps API Key Missing</p>
        <p className="text-[11px] text-amber-800">
          Please define VITE_GOOGLE_MAPS_API_KEY in environment variables.
        </p>
      </div>
    );
  }

  const handleMapClick = (e: MapMouseEvent) => {
    if (onMapClick && e.detail.latLng) {
      onMapClick({ lat: e.detail.latLng.lat, lng: e.detail.latLng.lng });
    }
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          defaultZoom={zoom}
          mapId={mapId || undefined}
          gestureHandling={gestureHandling}
          zoomControl={zoomControl}
          fullscreenControl={fullscreenControl}
          streetViewControl={streetViewControl}
          mapTypeControl={mapTypeControl}
          disableDefaultUI={disableDefaultUI}
          onClick={handleMapClick}
          className="w-full h-full"
          style={{ width: '100%', height: '100%' }}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.id}
              position={{ lat: marker.lat, lng: marker.lng }}
              title={marker.title}
            />
          ))}
        </Map>
      </APIProvider>
    </div>
  );
};

export default GoogleMap;
