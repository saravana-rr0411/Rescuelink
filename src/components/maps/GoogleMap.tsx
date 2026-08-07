import React, { useEffect, useRef } from 'react';
import { APIProvider, Map, Marker, useMap, type MapMouseEvent } from '@vis.gl/react-google-maps';
import { decodePolyline } from '../../services/googleRoutes';

export type MarkerType = 'accident' | 'volunteer' | 'citizen' | 'hospital' | 'default';

export interface MapMarker {
  id: string | number;
  lat: number;
  lng: number;
  title?: string;
  type?: MarkerType;
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
  polylinePath?: { lat: number; lng: number }[];
  polylineString?: string;
  heading?: number;
  isNavigationMode?: boolean;
  isFollowing?: boolean;
  onUserDrag?: () => void;
  zoomSignal?: { type: 'in' | 'out'; timestamp: number } | null;
  showTrafficLayer?: boolean;
  recenterTrigger?: number;
}

const GoogleMapTrafficLayer: React.FC = () => {
  const map = useMap();
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);

  useEffect(() => {
    if (!map) return;

    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
    }
    trafficLayerRef.current.setMap(map);

    return () => {
      if (trafficLayerRef.current) {
        trafficLayerRef.current.setMap(null);
        trafficLayerRef.current = null;
      }
    };
  }, [map]);

  return null;
};

const GoogleMapCameraController: React.FC<{
  center: { lat: number; lng: number };
  heading?: number;
  isNavigationMode?: boolean;
  isFollowing?: boolean;
  onUserDrag?: () => void;
  recenterTrigger?: number;
}> = ({ center, heading = 0, isNavigationMode = false, isFollowing = true, onUserDrag, recenterTrigger = 0 }) => {
  const map = useMap();
  const isProgrammaticMoveRef = useRef(false);

  useEffect(() => {
    if (!map) return;

    const dragListener = map.addListener('dragstart', () => {
      if (onUserDrag) {
        onUserDrag();
      }
    });

    return () => {
      google.maps.event.removeListener(dragListener);
    };
  }, [map, onUserDrag]);

  // Explicit recenter trigger effect (centers on volunteer & restores navigation zoom 17.5)
  useEffect(() => {
    if (!map || !recenterTrigger || !center) return;

    isProgrammaticMoveRef.current = true;
    map.panTo({ lat: center.lat, lng: center.lng });
    map.setZoom(17.5);

    if (isNavigationMode) {
      map.setHeading(heading || 0);
      map.setTilt(45);
    } else {
      map.setHeading(0);
      map.setTilt(0);
    }

    const timer = setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 500);

    return () => clearTimeout(timer);
  }, [recenterTrigger]);

  useEffect(() => {
    if (!map || !isFollowing || !center) return;

    isProgrammaticMoveRef.current = true;
    map.panTo({ lat: center.lat, lng: center.lng });

    if (isNavigationMode) {
      map.setHeading(heading || 0);
      map.setTilt(45);
    } else {
      map.setHeading(0);
      map.setTilt(0);
    }

    const timer = setTimeout(() => {
      isProgrammaticMoveRef.current = false;
    }, 500);

    return () => clearTimeout(timer);
  }, [map, center.lat, center.lng, heading, isNavigationMode, isFollowing]);

  return null;
};

const MARKER_ICONS: Record<MarkerType, string> = {
  accident: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="#dc2626" stroke="#ffffff" stroke-width="3"/>
      <path d="M20 10 L28 26 L12 26 Z" fill="#ffffff"/>
      <circle cx="20" cy="22" r="1.5" fill="#dc2626"/>
      <rect x="19" y="15" width="2" height="5" fill="#dc2626"/>
    </svg>
  `)}`,

  volunteer: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="#059669" stroke="#ffffff" stroke-width="3"/>
      <path d="M12 16 h16 v9 h-16 z M14 13 h9 l3 3 h-12 z" fill="#ffffff"/>
      <circle cx="16" cy="26" r="2.5" fill="#ffffff"/>
      <circle cx="24" cy="26" r="2.5" fill="#ffffff"/>
      <path d="M18 19 h4 M20 17 v4" stroke="#059669" stroke-width="1.5" stroke-linecap="round"/>
    </svg>
  `)}`,

  citizen: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="16" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
      <circle cx="18" cy="18" r="6" fill="#ffffff"/>
    </svg>
  `)}`,

  hospital: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
      <circle cx="20" cy="20" r="18" fill="#4f46e5" stroke="#ffffff" stroke-width="3"/>
      <path d="M17 12 h6 v6 h6 v6 h-6 v6 h-6 v-6 h-6 v-6 h6 z" fill="#ffffff"/>
    </svg>
  `)}`,

  default: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 36 36">
      <circle cx="18" cy="18" r="15" fill="#ef4444" stroke="#ffffff" stroke-width="3"/>
      <circle cx="18" cy="18" r="5" fill="#ffffff"/>
    </svg>
  `)}`,
};

const GoogleMapPolyline: React.FC<{ path: { lat: number; lng: number }[] }> = ({ path }) => {
  const map = useMap();
  const polylineRef = useRef<google.maps.Polyline | null>(null);

  useEffect(() => {
    if (!map || path.length === 0) return;

    if (!polylineRef.current) {
      polylineRef.current = new google.maps.Polyline({
        path,
        geodesic: true,
        strokeColor: '#2563eb',
        strokeOpacity: 0.8,
        strokeWeight: 6,
        map,
      });
    } else {
      polylineRef.current.setPath(path);
      polylineRef.current.setMap(map);
    }

    return () => {
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
        polylineRef.current = null;
      }
    };
  }, [map, path]);

  return null;
};

const GoogleMapBoundsFitter: React.FC<{ markers: MapMarker[] }> = ({ markers }) => {
  const map = useMap();
  const hasFittedRef = useRef(false);

  useEffect(() => {
    if (!map || markers.length <= 1 || hasFittedRef.current) return;
    const bounds = new google.maps.LatLngBounds();
    let validCount = 0;
    markers.forEach((m) => {
      if (m.lat && m.lng) {
        bounds.extend({ lat: m.lat, lng: m.lng });
        validCount++;
      }
    });
    if (validCount > 1) {
      map.fitBounds(bounds, { top: 80, bottom: 120, left: 60, right: 60 });
      hasFittedRef.current = true;
    }
  }, [map, markers]);

  return null;
};

const GoogleMapZoomController: React.FC<{ zoomSignal?: { type: 'in' | 'out'; timestamp: number } | null }> = ({ zoomSignal }) => {
  const map = useMap();

  useEffect(() => {
    if (!map || !zoomSignal) return;
    const currentZoom = map.getZoom() || 16;
    if (zoomSignal.type === 'in') {
      map.setZoom(currentZoom + 1);
    } else if (zoomSignal.type === 'out') {
      map.setZoom(currentZoom - 1);
    }
  }, [map, zoomSignal]);

  return null;
};

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
  polylinePath,
  polylineString,
  heading,
  isNavigationMode,
  isFollowing,
  onUserDrag,
  zoomSignal,
  showTrafficLayer = true,
  recenterTrigger,
}) => {
  const apiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim() || 'AIzaSyA79hWKJ8jS6ACxdtb44LT1oWIACZj1upY';
  const mapId = (import.meta.env.VITE_GOOGLE_MAPS_ID || '').trim();

  const finalPolylinePath = React.useMemo(() => {
    if (polylinePath && polylinePath.length > 0) return polylinePath;
    if (polylineString) return decodePolyline(polylineString);
    return [];
  }, [polylinePath, polylineString]);

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
          {showTrafficLayer && <GoogleMapTrafficLayer />}
          <GoogleMapCameraController
            center={center}
            heading={heading}
            isNavigationMode={isNavigationMode}
            isFollowing={isFollowing}
            onUserDrag={onUserDrag}
            recenterTrigger={recenterTrigger}
          />
          <GoogleMapZoomController zoomSignal={zoomSignal} />
          {markers.map((marker) => {
            const iconType = marker.type || 'default';
            const iconUrl = MARKER_ICONS[iconType] || MARKER_ICONS.default;

            return (
              <Marker
                key={marker.id}
                position={{ lat: marker.lat, lng: marker.lng }}
                title={marker.title}
                icon={{
                  url: iconUrl,
                  scaledSize: typeof window !== 'undefined' && window.google?.maps
                    ? new window.google.maps.Size(36, 36)
                    : undefined,
                }}
              />
            );
          })}
          {finalPolylinePath.length > 0 && <GoogleMapPolyline path={finalPolylinePath} />}
          {markers.length > 1 && <GoogleMapBoundsFitter markers={markers} />}
        </Map>
      </APIProvider>
    </div>
  );
};

export default GoogleMap;
