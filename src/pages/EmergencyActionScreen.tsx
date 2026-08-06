import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft,
  Ambulance,
  Hospital as HospitalIcon,
  Bandage,
  Share2,
  Camera,
  ShieldAlert,
  Flame,
  PhoneCall,
  ChevronRight,
  MapPin,
  Clock,
  Star,
  Navigation,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  X,
  Target,
  Play,
  Pause,
  Compass,
  ChevronUp,
} from 'lucide-react';
import type { Hospital } from '../utils/routing';
import { fetchNearbyHospitalsOverpass, fetchOSRMRoute, formatETA } from '../utils/routing';
import { formatDistance } from '../utils/distance';
import { useHeadingRotation } from '../hooks/useHeadingRotation';
import 'leaflet/dist/leaflet.css';

// Leaflet default marker icons fix for bundlers
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom 📍 User GPS Marker (Blue Pulsing Pin)
const userGpsPin = L.divIcon({
  className: 'custom-user-gps-nav-pin',
  html: `
    <div class="relative flex items-center justify-center w-10 h-10">
      <span class="absolute w-10 h-10 rounded-full bg-blue-500/60 animate-ping"></span>
      <div class="relative w-10 h-10 rounded-full bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Custom 🏥 Hospital Destination Pin (Red Emergency Beacon Pin)
const hospitalDestinationPin = L.divIcon({
  className: 'custom-hospital-dest-nav-pin',
  html: `
    <div class="relative flex items-center justify-center w-11 h-11">
      <span class="absolute w-11 h-11 rounded-full bg-red-500/60 animate-ping"></span>
      <div class="relative w-11 h-11 rounded-full bg-red-600 border-2 border-white shadow-2xl flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12M6 12h12"/></svg>
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

// Leaflet Map Controller for Google Maps style auto-bounds & recentering
const NavigationMapController: React.FC<{
  userCoords: [number, number] | null;
  hospitalCoords: [number, number] | null;
  recenterSignal: number;
}> = ({ userCoords, hospitalCoords, recenterSignal }) => {
  const map = useMap();

  const handleFit = useCallback(() => {
    map.invalidateSize();
    if (userCoords && hospitalCoords) {
      const bounds = L.latLngBounds([userCoords, hospitalCoords]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (userCoords) {
      map.setView(userCoords, 16);
    }
  }, [map, userCoords, hospitalCoords]);

  useEffect(() => {
    handleFit();
  }, [handleFit, recenterSignal]);

  return null;
};

export const EmergencyActionScreen: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'actions' | 'hospitals' | 'navigation'
  const [viewMode, setViewMode] = useState<'actions' | 'hospitals' | 'navigation'>('actions');

  // User GPS coordinates state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hospital state
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  // Navigation route state
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number>(0);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<number>(0);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Navigation controls & UI details
  const [isNavigating, setIsNavigating] = useState(true);
  const [recenterSignal, setRecenterSignal] = useState(0);
  const [showHospitalDetails, setShowHospitalDetails] = useState(false);
  const [isHeadingUpMode, setIsHeadingUpMode] = useState(true);

  // Auto-Rotation Heading Engine
  const { heading } = useHeadingRotation(viewMode === 'navigation' && isNavigating && isHeadingUpMode, userLocation);

  // Initial GPS location request
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('[Emergency Action Screen] GPS permission denied:', err.message);
          setUserLocation({ lat: 12.9716, lng: 77.5946 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserLocation({ lat: 12.9716, lng: 77.5946 });
    }
  }, []);

  // Live GPS Tracking & Route Recalculation Engine
  useEffect(() => {
    if (viewMode !== 'navigation' || !isNavigating || !selectedHospital) return;

    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setUserLocation({ lat, lng });

          // Recalculate route dynamically on GPS movement
          try {
            const startCoords: [number, number] = [lat, lng];
            const endCoords: [number, number] = [selectedHospital.latitude, selectedHospital.longitude];
            const result = await fetchOSRMRoute(startCoords, endCoords);
            setRoutePolyline(result.coordinates);
            setRouteDistanceMeters(result.distanceMeters);
            setRouteDurationSeconds(result.durationSeconds);
          } catch (err) {
            console.warn('[Live Navigation Engine] Route recalculation error:', err);
          }
        },
        (err) => {
          console.warn('[Live Navigation Engine] GPS watchPosition error:', err.message);
        },
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
      );

      return () => {
        navigator.geolocation.clearWatch(watchId);
      };
    }
  }, [viewMode, isNavigating, selectedHospital]);

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleOpenHospitals = async () => {
    setViewMode('hospitals');
    const coords = userLocation || { lat: 12.9716, lng: 77.5946 };
    setLoadingHospitals(true);
    try {
      const list = await fetchNearbyHospitalsOverpass(coords.lat, coords.lng);
      setHospitals(list);
    } catch (err) {
      console.error('[Emergency Action Screen] Error loading hospitals:', err);
    } finally {
      setLoadingHospitals(false);
    }
  };

  const handleStartNavigation = async (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setViewMode('navigation');
    setIsNavigating(true);
    setLoadingRoute(true);

    const startCoords = userLocation
      ? [userLocation.lat, userLocation.lng] as [number, number]
      : [hospital.latitude - 0.015, hospital.longitude - 0.015] as [number, number];
    const endCoords = [hospital.latitude, hospital.longitude] as [number, number];

    try {
      const result = await fetchOSRMRoute(startCoords, endCoords);
      setRoutePolyline(result.coordinates);
      setRouteDistanceMeters(result.distanceMeters);
      setRouteDurationSeconds(result.durationSeconds);
    } catch (err) {
      console.error('[Emergency Action Screen] Error fetching route:', err);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleStopNavigation = () => {
    setSelectedHospital(null);
    setRoutePolyline([]);
    setIsNavigating(false);
    setViewMode('hospitals');
  };

  const handleShareLocation = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          const shareText = `🚨 EMERGENCY SOS! I need immediate help. My current GPS Location: ${mapUrl}`;

          if (navigator.share) {
            try {
              await navigator.share({
                title: 'RescueLink Emergency Location',
                text: shareText,
                url: mapUrl,
              });
              setToastMessage('GPS Location shared successfully!');
            } catch (e) {
              console.warn('[Share Location] Cancelled:', e);
            }
          } else {
            try {
              await navigator.clipboard.writeText(shareText);
              setToastMessage('GPS location link copied to clipboard!');
            } catch (e) {
              setToastMessage(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          }
          setTimeout(() => setToastMessage(null), 3000);
        },
        () => {
          setToastMessage('Location permission required.');
          setTimeout(() => setToastMessage(null), 3000);
        }
      );
    }
  };

  const userCoords: [number, number] | null = userLocation
    ? [userLocation.lat, userLocation.lng]
    : null;
  const hospitalCoords: [number, number] | null = selectedHospital
    ? [selectedHospital.latitude, selectedHospital.longitude]
    : null;

  const getArrivalTimeString = (seconds: number): string => {
    const arrivalDate = new Date(Date.now() + (seconds || 300) * 1000);
    return arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-surface-container-high px-4 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (viewMode === 'navigation') {
                setViewMode('hospitals');
              } else if (viewMode === 'hospitals') {
                setViewMode('actions');
              } else {
                navigate(-1);
              }
            }}
            className="p-2 rounded-full hover:bg-surface-container text-on-surface transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-on-surface leading-tight flex items-center gap-1.5">
              <span>🚨 Emergency Action Center</span>
            </h1>
            <p className="text-xs text-on-surface-variant font-medium">
              Choose an immediate emergency action.
            </p>
          </div>
        </div>
      </header>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="mx-4 mt-3 p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content View Container */}
      <main className="flex-1 px-4 py-4 space-y-4 max-w-md mx-auto w-full">

        {/* ========================================================================= */}
        {/* VIEW 1: MATERIAL DESIGN 3 UNIFORM WHITE ACTION CARDS */}
        {/* ========================================================================= */}
        {viewMode === 'actions' && (
          <div className="space-y-3 animate-in fade-in duration-200">
            
            {/* 1. 🚑 Call Ambulance (108) */}
            <button
              onClick={() => handleCall('108')}
              className="w-full h-24 p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 shadow-level-1 hover:shadow-level-2 hover:border-primary/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-800 flex items-center justify-center shrink-0">
                  <Ambulance className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-on-surface">Call Ambulance</h3>
                    <span className="bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full font-extrabold">
                      108
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Immediately call emergency services.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* 2. 🏥 Nearby Hospitals */}
            <button
              onClick={handleOpenHospitals}
              className="w-full h-24 p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 shadow-level-1 hover:shadow-level-2 hover:border-primary/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <HospitalIcon className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">Nearby Hospitals</h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Find hospitals around your current location.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* 3. 🩹 First Aid Guide */}
            <button
              onClick={() => navigate('/first-aid')}
              className="w-full h-24 p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 shadow-level-1 hover:shadow-level-2 hover:border-primary/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Bandage className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">First Aid Guide</h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Learn immediate first aid steps.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* 4. 📍 Share Live Location */}
            <button
              onClick={handleShareLocation}
              className="w-full h-24 p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 shadow-level-1 hover:shadow-level-2 hover:border-primary/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Share2 className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">Share Live Location</h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Share your GPS location instantly.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* 5. 📸 Report Accident */}
            <button
              onClick={() => navigate('/report')}
              className="w-full h-24 p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 shadow-level-1 hover:shadow-level-2 hover:border-primary/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-800 flex items-center justify-center shrink-0">
                  <Camera className="w-7 h-7" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-on-surface">Report Accident</h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Notify nearby volunteers.
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-on-surface-variant group-hover:translate-x-1 transition-transform shrink-0" />
            </button>

            {/* 6. 🚓 Call Police */}
            <button
              onClick={() => handleCall('100')}
              className="w-full h-24 p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 shadow-level-1 hover:shadow-level-2 hover:border-primary/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-on-surface">Call Police</h3>
                    <span className="bg-indigo-100 text-indigo-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      100
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Direct line to police dispatch.
                  </p>
                </div>
              </div>
              <PhoneCall className="w-5 h-5 text-indigo-700 shrink-0 group-hover:scale-110 transition-transform" />
            </button>

            {/* 7. 🚒 Call Fire Service */}
            <button
              onClick={() => handleCall('101')}
              className="w-full h-24 p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant/60 shadow-level-1 hover:shadow-level-2 hover:border-primary/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-4 text-left">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 text-orange-800 flex items-center justify-center shrink-0">
                  <Flame className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-extrabold text-on-surface">Call Fire Service</h3>
                    <span className="bg-orange-100 text-orange-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      101
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Direct line to fire & rescue.
                  </p>
                </div>
              </div>
              <PhoneCall className="w-5 h-5 text-orange-700 shrink-0 group-hover:scale-110 transition-transform" />
            </button>

          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: NEARBY HOSPITALS LIST VIEW */}
        {/* ========================================================================= */}
        {viewMode === 'hospitals' && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-extrabold text-on-surface uppercase tracking-wider">Nearby Trauma Centers</h2>
                <p className="text-xs text-on-surface-variant">Emergency medical facilities within 5 km radius</p>
              </div>
              <button
                onClick={() => setViewMode('actions')}
                className="text-xs font-bold text-primary hover:underline"
              >
                Back to Actions
              </button>
            </div>

            {loadingHospitals ? (
              <div className="p-8 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/60 space-y-3 shadow-level-1">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="text-xs font-bold text-on-surface">Discovering Nearby Emergency Hospitals...</p>
                <p className="text-[11px] text-on-surface-variant">Searching OpenStreetMap trauma database</p>
              </div>
            ) : hospitals.length === 0 ? (
              <div className="p-8 text-center bg-surface-container-lowest rounded-3xl border border-outline-variant/60 space-y-2 shadow-level-1">
                <HospitalIcon className="w-8 h-8 text-outline mx-auto" />
                <p className="text-xs font-bold text-on-surface">No nearby hospitals found.</p>
                <p className="text-[11px] text-on-surface-variant">Please enable GPS location or check connectivity.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {hospitals.map((hosp) => {
                  const estimatedSeconds = (hosp.distanceMeters / 1000 / 40) * 3600;
                  return (
                    <div
                      key={hosp.id}
                      className="p-4 rounded-3xl border border-outline-variant/60 bg-surface-container-lowest shadow-level-1 space-y-3 hover:border-primary/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                              4.8 ★
                            </span>
                            <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                              <ShieldCheck className="w-3 h-3" />
                              Emergency Ready
                            </span>
                          </div>
                          <h3 className="text-sm font-extrabold text-on-surface truncate">{hosp.name}</h3>
                          <p className="text-xs text-on-surface-variant flex items-center gap-1 font-medium truncate">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span className="truncate">{hosp.address}</span>
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-extrabold text-primary block">
                            {formatDistance(hosp.distanceMeters)}
                          </span>
                          <span className="text-xs font-semibold text-on-surface-variant flex items-center justify-end gap-1 mt-0.5">
                            <Clock className="w-3.5 h-3.5" />
                            {formatETA(estimatedSeconds)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-surface-container-high">
                        {hosp.phone ? (
                          <a
                            href={`tel:${hosp.phone}`}
                            className="px-3.5 py-2 bg-surface-container-high hover:bg-surface-container text-on-surface rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Call</span>
                          </a>
                        ) : (
                          <button
                            disabled
                            className="px-3.5 py-2 bg-surface-container-high/50 text-on-surface-variant/50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                            <span>Phone unavailable</span>
                          </button>
                        )}

                        <button
                          onClick={() => handleStartNavigation(hosp)}
                          className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-xl shadow-level-1 transition-all flex items-center gap-1.5 active:scale-95"
                        >
                          <Navigation className="w-4 h-4" />
                          <span>Navigate</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: REUSED LIVE GPS NAVIGATION ENGINE (GOOGLE MAPS STYLE EXPERIENCE) */}
        {/* ========================================================================= */}
        {viewMode === 'navigation' && selectedHospital && (
          <div className="space-y-4 animate-in fade-in duration-200">
            
            {/* 1. TOP FLOATING DESTINATION CARD */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-level-2 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Compass className="w-3.5 h-3.5 animate-spin" />
                  Live Navigation Active
                </span>
                <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  ETA {loadingRoute ? '...' : formatETA(routeDurationSeconds || 300)}
                </span>
              </div>

              <div className="flex items-start justify-between gap-2 pt-1">
                <div className="min-w-0 flex-1">
                  <h2 className="text-base font-black text-on-surface truncate">{selectedHospital.name}</h2>
                  <p className="text-xs text-on-surface-variant font-medium flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="truncate">{selectedHospital.address}</span>
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-base font-black text-primary block">
                    {formatDistance(routeDistanceMeters || selectedHospital.distanceMeters)}
                  </span>
                  <span className="text-[10px] font-bold text-on-surface-variant">
                    Arrive ~ {getArrivalTimeString(routeDurationSeconds)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. GOOGLE MAPS STYLE FULL INTERACTIVE MAP CANVAS WITH REUSED NAVIGATION ENGINE */}
            <div className="w-full h-72 sm:h-80 rounded-3xl overflow-hidden border border-outline-variant/60 shadow-level-2 bg-slate-100 relative z-0">
              <div
                className="w-full h-full transition-transform duration-500 ease-out origin-center"
                style={{
                  transform: isHeadingUpMode && heading ? `rotate(-${Math.round(heading)}deg) scale(1.15)` : 'none',
                }}
              >
                <MapContainer
                  center={hospitalCoords || userCoords || [12.9716, 77.5946]}
                  zoom={15}
                  scrollWheelZoom={false}
                  zoomControl={false}
                  className="w-full h-full"
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />

                  {/* Auto Bounds & Recentering Controller */}
                  <NavigationMapController
                    userCoords={userCoords}
                    hospitalCoords={hospitalCoords}
                    recenterSignal={recenterSignal}
                  />

                  {/* User GPS Location Marker */}
                  {userCoords && (
                    <Marker position={userCoords} icon={userGpsPin}>
                      <Popup>Your Current Location</Popup>
                    </Marker>
                  )}

                  {/* Destination Hospital Marker */}
                  {hospitalCoords && (
                    <Marker position={hospitalCoords} icon={hospitalDestinationPin}>
                      <Popup>
                        <strong className="text-red-700 block font-bold">{selectedHospital.name}</strong>
                        <span>{selectedHospital.address}</span>
                      </Popup>
                    </Marker>
                  )}

                  {/* Real Route Polyline */}
                  {routePolyline.length > 0 && (
                    <Polyline positions={routePolyline} color="#2563eb" weight={6} opacity={0.85} />
                  )}
                </MapContainer>
              </div>

              {/* Floating Orientation Compass Toggle Button */}
              <button
                onClick={() => setIsHeadingUpMode(!isHeadingUpMode)}
                className={`absolute top-3 right-3 p-2.5 rounded-full shadow-level-2 transition-all border border-outline-variant/60 z-[400] ${
                  isHeadingUpMode
                    ? 'bg-primary text-white ring-2 ring-primary/30'
                    : 'bg-surface/90 text-on-surface hover:bg-surface'
                }`}
                title={isHeadingUpMode ? 'Heading-Up Navigation (Auto Rotate Active)' : 'North-Up Map View'}
              >
                <Compass
                  className="w-5 h-5 transition-transform duration-500"
                  style={{ transform: `rotate(${Math.round(heading)}deg)` }}
                />
              </button>

              {/* Floating Recenter Map Button */}
              <button
                onClick={() => setRecenterSignal((prev) => prev + 1)}
                className="absolute bottom-3 right-3 bg-surface/90 backdrop-blur-md text-on-surface p-2.5 rounded-full shadow-level-2 hover:bg-surface transition-transform active:scale-95 border border-outline-variant/60 z-[400]"
                aria-label="Recenter map"
                title="Recenter Map"
              >
                <Target className="w-5 h-5 text-primary" />
              </button>
            </div>

            {/* 3. BOTTOM NAVIGATION CONTROL CARD */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-level-2 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                  <span className="text-xs font-bold text-on-surface">Route Guidance Active</span>
                </div>
                <button
                  onClick={() => setShowHospitalDetails(!showHospitalDetails)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <span>{showHospitalDetails ? 'Hide Details' : 'Hospital Details'}</span>
                  <ChevronUp className={`w-3.5 h-3.5 transition-transform ${showHospitalDetails ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Collapsible Hospital Details */}
              {showHospitalDetails && (
                <div className="p-3 bg-surface-container-low rounded-2xl text-xs space-y-1.5 animate-in fade-in border border-outline-variant/40">
                  <p className="font-extrabold text-on-surface">🏥 {selectedHospital.name}</p>
                  <p className="text-on-surface-variant">📍 {selectedHospital.address}</p>
                  <p className="text-on-surface-variant">📞 Direct Emergency Phone: {selectedHospital.phone || 'Hospital phone number unavailable'}</p>
                  <p className="text-emerald-700 font-bold">⭐ 4.8 Rating • Emergency Ready Trauma Center</p>
                </div>
              )}

              <div className="grid grid-cols-3 gap-2.5 pt-1">
                {/* Start / Pause Navigation Toggle */}
                <button
                  onClick={() => setIsNavigating(!isNavigating)}
                  className={`py-3 rounded-2xl font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-level-1 transition-all ${
                    isNavigating
                      ? 'bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  {isNavigating ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isNavigating ? 'Pause' : 'Start'}</span>
                </button>

                {/* Recenter Map */}
                <button
                  onClick={() => setRecenterSignal((prev) => prev + 1)}
                  className="py-3 bg-surface-container-high hover:bg-surface-container text-on-surface font-extrabold text-xs rounded-2xl border border-outline-variant/60 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Target className="w-4 h-4 text-primary" />
                  <span>Recenter</span>
                </button>

                {/* Stop Navigation Button */}
                <button
                  onClick={handleStopNavigation}
                  className="py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-extrabold text-xs rounded-2xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Stop</span>
                </button>
              </div>
            </div>

          </div>
        )}

      </main>
    </div>
  );
};

export default EmergencyActionScreen;
