import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { MapPin, Navigation, AlertCircle, UserCheck } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix default Leaflet icon paths in Vite bundler
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Create custom SVG Leaflet marker icons using L.divIcon
const accidentIcon = L.divIcon({
  className: 'custom-accident-pin',
  html: `
    <div class="relative flex items-center justify-center w-8 h-8">
      <span class="absolute w-8 h-8 rounded-full bg-red-500/50 animate-ping"></span>
      <div class="relative w-8 h-8 rounded-full bg-red-600 border-2 border-white shadow-md flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

const volunteerIcon = L.divIcon({
  className: 'custom-volunteer-pin',
  html: `
    <div class="relative flex items-center justify-center w-8 h-8">
      <span class="absolute w-8 h-8 rounded-full bg-emerald-400/50 animate-ping"></span>
      <div class="relative w-8 h-8 rounded-full bg-emerald-600 border-2 border-white shadow-md flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><polyline points="16 11 18 13 22 9"/></svg>
      </div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
  popupAnchor: [0, -16],
});

// Map Controller component to handle auto-centering and bounds fitting dynamically
const MapController: React.FC<{
  accidentCoords: [number, number];
  volunteerCoords: [number, number] | null;
}> = ({ accidentCoords, volunteerCoords }) => {
  const map = useMap();
  const accidentLat = accidentCoords[0];
  const accidentLng = accidentCoords[1];
  const volunteerLat = volunteerCoords ? volunteerCoords[0] : null;
  const volunteerLng = volunteerCoords ? volunteerCoords[1] : null;

  useEffect(() => {
    // Force Leaflet to recalculate container dimensions when rendered inside dynamic containers
    map.invalidateSize();

    if (volunteerLat !== null && volunteerLng !== null) {
      const bounds = L.latLngBounds([
        [accidentLat, accidentLng],
        [volunteerLat, volunteerLng],
      ]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else {
      map.setView([accidentLat, accidentLng], 15);
    }
  }, [map, accidentLat, accidentLng, volunteerLat, volunteerLng]);

  return null;
};

export interface MapWidgetProps {
  accidentId?: string;
  latitude: number | null;
  longitude: number | null;
  address: string;
  severity?: string;
  height?: string;
  showNavigateBtn?: boolean;
  volunteerLatitude?: number | null;
  volunteerLongitude?: number | null;
  mode?: 'citizen' | 'volunteer';
}

export const MapWidget: React.FC<MapWidgetProps> = ({
  accidentId,
  latitude,
  longitude,
  address,
  severity = 'CRITICAL',
  height = 'h-52',
  showNavigateBtn = true,
  volunteerLatitude = null,
  volunteerLongitude = null,
  mode = 'citizen',
}) => {
  const navigate = useNavigate();

  const hasCoordinates =
    latitude !== null &&
    longitude !== null &&
    !isNaN(Number(latitude)) &&
    !isNaN(Number(longitude));

  const hasVolunteerCoordinates =
    volunteerLatitude !== null &&
    volunteerLongitude !== null &&
    !isNaN(Number(volunteerLatitude)) &&
    !isNaN(Number(volunteerLongitude));

  const handleOpenNavigation = () => {
    if (!hasCoordinates) return;
    const targetPath = accidentId ? `/navigation/${accidentId}` : '/navigation';
    navigate(targetPath, {
      state: {
        accidentId,
        latitude: Number(latitude),
        longitude: Number(longitude),
        address,
        severity,
        volunteerLatitude: hasVolunteerCoordinates ? Number(volunteerLatitude) : null,
        volunteerLongitude: hasVolunteerCoordinates ? Number(volunteerLongitude) : null,
        mode,
      },
    });
  };

  // Error State if location coordinates are missing or invalid
  if (!hasCoordinates) {
    return (
      <div
        className={`w-full ${height} rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col items-center justify-center p-4 text-center space-y-2`}
      >
        <AlertCircle className="w-6 h-6 text-amber-600" />
        <p className="text-xs font-bold text-amber-900">Location Coordinates Unavailable</p>
        <p className="text-[11px] text-amber-800 max-w-xs">
          {address || 'No valid GPS coordinates provided for this accident report.'}
        </p>
      </div>
    );
  }

  const accidentPos: [number, number] = [Number(latitude), Number(longitude)];
  const volunteerPos: [number, number] | null = hasVolunteerCoordinates
    ? [Number(volunteerLatitude), Number(volunteerLongitude)]
    : null;

  return (
    <div className="space-y-2">
      <div
        className={`relative w-full ${height} rounded-2xl overflow-hidden border border-outline-variant/60 shadow-xs bg-slate-100 group z-0`}
      >
        {/* React Leaflet Map Container */}
        <MapContainer
          center={accidentPos}
          zoom={15}
          scrollWheelZoom={false}
          zoomControl={false}
          className="w-full h-full z-0"
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Auto centering & bounds management */}
          <MapController accidentCoords={accidentPos} volunteerCoords={volunteerPos} />

          {/* Accident Marker */}
          <Marker position={accidentPos} icon={accidentIcon}>
            <Popup>
              <div className="p-1 text-xs">
                <strong className="text-red-600 block font-bold">{severity} ACCIDENT</strong>
                <span>{address}</span>
              </div>
            </Popup>
          </Marker>

          {/* Responder / Volunteer Marker */}
          {hasVolunteerCoordinates && volunteerPos && (
            <Marker position={volunteerPos} icon={volunteerIcon}>
              <Popup>
                <div className="p-1 text-xs">
                  <strong className="text-emerald-600 block font-bold">Responder Active Location</strong>
                  <span>
                    {volunteerLatitude?.toFixed(4)}, {volunteerLongitude?.toFixed(4)}
                  </span>
                </div>
              </Popup>
            </Marker>
          )}
        </MapContainer>

        {/* Severity Badge Overlay */}
        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md z-[400]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span>{severity} ACCIDENT LOCATION</span>
        </div>

        {/* Live Moving Volunteer Marker Overlay */}
        {hasVolunteerCoordinates && (
          <div className="absolute top-11 left-3 bg-secondary text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 z-[400] transition-all duration-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <UserCheck className="w-3.5 h-3.5" />
            <span>
              Responder: {volunteerLatitude?.toFixed(4)}, {volunteerLongitude?.toFixed(4)}
            </span>
          </div>
        )}

        {/* Floating Navigate Button Overlay */}
        {showNavigateBtn && (
          <button
            onClick={handleOpenNavigation}
            className="absolute bottom-3 right-3 bg-secondary hover:bg-secondary/90 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-transform active:scale-95 z-[400]"
            aria-label="Navigate via OpenStreetMap"
          >
            <Navigation className="w-4 h-4" />
            <span>Navigate</span>
          </button>
        )}
      </div>

      {/* Address Bar */}
      <div className="flex items-center text-xs bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/40">
        <div className="flex items-center gap-1.5 text-on-surface font-semibold truncate flex-1">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">{address}</span>
        </div>
      </div>
    </div>
  );
};

// Backwards compatibility re-export
export const GoogleMapWidget = MapWidget;
