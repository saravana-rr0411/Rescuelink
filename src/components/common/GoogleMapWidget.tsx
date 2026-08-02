import React from 'react';
import { MapPin, Navigation, AlertCircle, UserCheck } from 'lucide-react';

interface GoogleMapWidgetProps {
  latitude: number | null;
  longitude: number | null;
  address: string;
  severity?: string;
  height?: string;
  showNavigateBtn?: boolean;
  volunteerLatitude?: number | null;
  volunteerLongitude?: number | null;
}

export const GoogleMapWidget: React.FC<GoogleMapWidgetProps> = ({
  latitude,
  longitude,
  address,
  severity = 'CRITICAL',
  height = 'h-52',
  showNavigateBtn = true,
  volunteerLatitude = null,
  volunteerLongitude = null,
}) => {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
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

  const handleOpenGoogleMapsNavigation = () => {
    if (!hasCoordinates) return;
    const navUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
    window.open(navUrl, '_blank', 'noopener,noreferrer');
  };

  // Friendly Error State if location coordinates are missing or invalid
  if (!hasCoordinates) {
    return (
      <div className={`w-full ${height} rounded-2xl bg-amber-50/60 border border-amber-200 flex flex-col items-center justify-center p-4 text-center space-y-2`}>
        <AlertCircle className="w-6 h-6 text-amber-600" />
        <p className="text-xs font-bold text-amber-900">Location Coordinates Unavailable</p>
        <p className="text-[11px] text-amber-800 max-w-xs">{address || 'No valid GPS coordinates provided for this accident report.'}</p>
      </div>
    );
  }

  // Use directions embed if volunteer coordinates exist & key is provided, or place embed centered on accident
  const mapEmbedUrl = apiKey
    ? hasVolunteerCoordinates
      ? `https://www.google.com/maps/embed/v1/directions?key=${apiKey}&origin=${volunteerLatitude},${volunteerLongitude}&destination=${latitude},${longitude}&mode=driving`
      : `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${latitude},${longitude}&zoom=15`
    : `https://maps.google.com/maps?q=${latitude},${longitude}&z=15&output=embed`;

  return (
    <div className="space-y-2">
      <div className={`relative w-full ${height} rounded-2xl overflow-hidden border border-outline-variant/60 shadow-xs bg-slate-100 group`}>
        {/* Interactive Google Map Iframe */}
        <iframe
          title="Accident Incident Location"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          src={mapEmbedUrl}
          className="w-full h-full"
        />

        {/* Severity Badge Overlay */}
        <div className="absolute top-3 left-3 bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-md z-10">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping"></span>
          <span>{severity} ACCIDENT LOCATION</span>
        </div>

        {/* Live Moving Volunteer Marker Overlay */}
        {hasVolunteerCoordinates && (
          <div className="absolute top-11 left-3 bg-secondary text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1.5 z-10 transition-all duration-500">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
            <UserCheck className="w-3.5 h-3.5" />
            <span>Responder: {volunteerLatitude.toFixed(4)}, {volunteerLongitude.toFixed(4)}</span>
          </div>
        )}

        {/* Floating Navigate Button Overlay */}
        {showNavigateBtn && (
          <button
            onClick={handleOpenGoogleMapsNavigation}
            className="absolute bottom-3 right-3 bg-secondary hover:bg-secondary/90 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-md flex items-center gap-1.5 transition-transform active:scale-95 z-10"
            aria-label="Navigate via Google Maps"
          >
            <Navigation className="w-4 h-4" />
            <span>Navigate</span>
          </button>
        )}
      </div>

      {/* Address Bar */}
      <div className="flex items-center justify-between text-xs bg-surface-container-low p-2.5 rounded-xl border border-outline-variant/40">
        <div className="flex items-center gap-1.5 text-on-surface font-semibold truncate flex-1 pr-2">
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate">{address}</span>
        </div>
        {showNavigateBtn && (
          <button
            onClick={handleOpenGoogleMapsNavigation}
            className="text-xs font-bold text-secondary flex items-center gap-1 hover:underline shrink-0"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Maps</span>
          </button>
        )}
      </div>
    </div>
  );
};
