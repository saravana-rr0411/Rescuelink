import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  Ambulance,
  Hospital as HospitalIcon,
  Bandage,
  Share2,
  Camera,
  ShieldAlert,
  Flame,
  PhoneCall,
  X,
  MapPin,
  CheckCircle2,
  ArrowLeft,
  Navigation,
  Clock,
  Star,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import type { Hospital as HospitalType } from '../../utils/routing';
import { fetchNearbyHospitalsOverpass, fetchOSRMRoute, formatETA } from '../../utils/routing';
import { formatDistance } from '../../utils/distance';
import { fetchGoogleRoute } from '../../services/googleRoutes';

interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  failed: boolean;
}
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

// Custom User GPS Pin (Blue Pulse)
const userGpsPin = L.divIcon({
  className: 'custom-user-gps-pin',
  html: `
    <div class="relative flex items-center justify-center w-9 h-9">
      <span class="absolute w-9 h-9 rounded-full bg-blue-500/50 animate-ping"></span>
      <div class="relative w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-lg flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

// Custom Hospital Destination Pin (Red Emergency Beacon)
const hospitalDestinationPin = L.divIcon({
  className: 'custom-hospital-dest-pin',
  html: `
    <div class="relative flex items-center justify-center w-10 h-10">
      <span class="absolute w-10 h-10 rounded-full bg-red-500/50 animate-ping"></span>
      <div class="relative w-10 h-10 rounded-full bg-red-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12M6 12h12"/></svg>
      </div>
    </div>
  `,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
  popupAnchor: [0, -20],
});

// Helper component to auto-fit Leaflet bounds dynamically
const MapController: React.FC<{
  userCoords: [number, number] | null;
  hospitalCoords: [number, number] | null;
}> = ({ userCoords, hospitalCoords }) => {
  const map = useMap();

  useEffect(() => {
    map.invalidateSize();
    if (userCoords && hospitalCoords) {
      const bounds = L.latLngBounds([userCoords, hospitalCoords]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else if (userCoords) {
      map.setView(userCoords, 15);
    }
  }, [map, userCoords, hospitalCoords]);

  return null;
};

interface EmergencyActionCenterSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyActionCenterSheet: React.FC<EmergencyActionCenterSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();

  // State Management
  const [viewMode, setViewMode] = useState<'actions' | 'hospitals' | 'navigating'>('actions');
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  // Hospital state
  const [hospitals, setHospitals] = useState<HospitalType[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<HospitalType | null>(null);

  // Route state (matching Volunteer Hospital Selector)
  const [routeMap, setRouteMap] = useState<Record<string, RouteInfo>>({});
  const routeFetchedRef = useRef<Set<string>>(new Set());

  // Calculate routes whenever hospitals or userLocation changes
  useEffect(() => {
    if (viewMode !== 'hospitals' || hospitals.length === 0 || !userLocation) return;

    let isMounted = true;
    const { lat, lng } = userLocation;

    hospitals.forEach(async (hosp) => {
      if (routeFetchedRef.current.has(hosp.id)) return;
      routeFetchedRef.current.add(hosp.id);

      const googleRes = await fetchGoogleRoute(
        { lat, lng },
        { lat: hosp.latitude, lng: hosp.longitude }
      );

      if (!isMounted) return;

      if (!googleRes.error && googleRes.distanceMeters > 0) {
        setRouteMap((prev) => ({
          ...prev,
          [hosp.id]: {
            distanceMeters: googleRes.distanceMeters,
            durationSeconds: googleRes.durationSeconds,
            failed: false,
          }
        }));
        return;
      }

      try {
        const osrmRes = await fetchOSRMRoute(
          [lat, lng],
          [hosp.latitude, hosp.longitude]
        );
        if (!isMounted) return;
        if (osrmRes.distanceMeters > 0) {
          setRouteMap((prev) => ({
            ...prev,
            [hosp.id]: {
              distanceMeters: osrmRes.distanceMeters,
              durationSeconds: osrmRes.durationSeconds,
              failed: false,
            }
          }));
          return;
        }
      } catch {
        // fall through
      }

      if (!isMounted) return;
      setRouteMap((prev) => ({
        ...prev,
        [hosp.id]: { distanceMeters: 0, durationSeconds: 0, failed: true }
      }));
    });

    return () => {
      isMounted = false;
    };
  }, [viewMode, hospitals, userLocation]);

  // Navigation state
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [routeDistanceMeters, setRouteDistanceMeters] = useState<number>(0);
  const [routeDurationSeconds, setRouteDurationSeconds] = useState<number>(0);
  const [loadingRoute, setLoadingRoute] = useState(false);

  // Fetch initial GPS location when component opens
  useEffect(() => {
    if (isOpen && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('[Emergency Action Center] GPS permission denied:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, [isOpen]);

  // Reset state when closing sheet
  useEffect(() => {
    if (!isOpen) {
      setViewMode('actions');
      setSelectedHospital(null);
      setRoutePolyline([]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  // Open Nearby Hospitals list
  const handleOpenHospitals = () => {
    // Reset route mapping state before opening
    routeFetchedRef.current = new Set();
    setRouteMap({});

    if (userLocation) {
      setViewMode('hospitals');
      fetchHospitals(userLocation.lat, userLocation.lng);
      return;
    }

    if (!('geolocation' in navigator)) {
      alert('Unable to get your current location. Please enable location access to find nearby hospitals.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const freshCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(freshCoords);
        setViewMode('hospitals');
        fetchHospitals(freshCoords.lat, freshCoords.lng);
      },
      (err) => {
        console.warn('[Emergency Action Center] Fresh GPS request failed:', err.message);
        alert('Unable to get your current location. Please enable location access to find nearby hospitals.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const fetchHospitals = async (lat: number, lng: number) => {
    setLoadingHospitals(true);
    try {
      const list = await fetchNearbyHospitalsOverpass(lat, lng);
      setHospitals(list);
    } catch (err) {
      console.error('[Emergency Action Center] Error fetching hospitals:', err);
    } finally {
      setLoadingHospitals(false);
    }
  };

  // Start in-app navigation to selected hospital
  const handleStartNavigation = async (hospital: HospitalType) => {
    setSelectedHospital(hospital);
    setViewMode('navigating');
    setLoadingRoute(true);

    const startCoords = userLocation
      ? [userLocation.lat, userLocation.lng] as [number, number]
      : [hospital.latitude - 0.02, hospital.longitude - 0.02] as [number, number];
    const endCoords = [hospital.latitude, hospital.longitude] as [number, number];

    try {
      const result = await fetchOSRMRoute(startCoords, endCoords);
      setRoutePolyline(result.coordinates);
      setRouteDistanceMeters(result.distanceMeters);
      setRouteDurationSeconds(result.durationSeconds);
    } catch (err) {
      console.error('[Emergency Action Center] Error calculating route:', err);
    } finally {
      setLoadingRoute(false);
    }
  };

  const handleCancelNavigation = () => {
    setSelectedHospital(null);
    setRoutePolyline([]);
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
              setShareSuccess('Location shared successfully!');
            } catch (e) {
              console.warn('[Share Location] Share cancelled:', e);
            }
          } else {
            try {
              await navigator.clipboard.writeText(shareText);
              setShareSuccess('GPS location link copied to clipboard!');
            } catch (e) {
              setShareSuccess(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          }
          setTimeout(() => setShareSuccess(null), 3000);
        },
        () => {
          setShareSuccess('Location permission required.');
          setTimeout(() => setShareSuccess(null), 3000);
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

  // Calculate arrival clock time string (e.g. "12:45 PM")
  const getEstimatedArrivalTime = (seconds: number): string => {
    const arrivalDate = new Date(Date.now() + (seconds || 300) * 1000);
    return arrivalDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] flex justify-center pointer-events-none p-0 sm:pb-2">
      {/* Integrated Modern Bottom Sheet Container */}
      <div className="w-full max-w-md bg-surface border-t border-x sm:border border-outline-variant/60 rounded-t-3xl sm:rounded-3xl shadow-level-3 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[80vh] pointer-events-auto animate-in slide-in-from-bottom duration-300">
        
        {/* Drag Handle Bar */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0 cursor-grab bg-surface">
          <div className="w-12 h-1.5 bg-outline-variant/60 rounded-full"></div>
        </div>

        {/* Dynamic Header */}
        <div className="px-4 py-3 border-b border-surface-container-high flex items-center justify-between bg-gradient-to-r from-red-950/40 via-red-900/10 to-surface shrink-0">
          <div className="flex items-center gap-2.5">
            {viewMode !== 'actions' ? (
              <button
                onClick={() => {
                  if (viewMode === 'navigating') {
                    setViewMode('hospitals');
                  } else {
                    setViewMode('actions');
                  }
                }}
                className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-9 h-9 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shrink-0">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
              </div>
            )}

            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-on-surface leading-tight">
                {viewMode === 'actions' && '🚨 Emergency Action Center'}
                {viewMode === 'hospitals' && '🏥 Nearby Hospitals'}
                {viewMode === 'navigating' && '🚨 Live In-App Navigation'}
              </h2>
              <p className="text-[11px] text-on-surface-variant font-medium leading-tight">
                {viewMode === 'actions' && 'Select an emergency action below.'}
                {viewMode === 'hospitals' && 'Trauma centers & emergency rooms nearby'}
                {viewMode === 'navigating' && (selectedHospital?.name || 'Navigating to destination')}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors shrink-0"
            aria-label="Close Emergency Action Center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {shareSuccess && (
          <div className="mx-4 mt-2 p-2.5 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in shrink-0">
            <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>{shareSuccess}</span>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          
          {/* ========================================================================= */}
          {/* VIEW 1: MATERIAL DESIGN 3 UNIFORM ACTION CARDS */}
          {/* ========================================================================= */}
          {viewMode === 'actions' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                {/* 1. 🚑 Call Ambulance (108) */}
                <button
                  onClick={() => handleCall('108')}
                  className="h-24 rounded-2xl p-3 bg-gradient-to-br from-red-600 to-rose-700 text-white shadow-level-1 hover:shadow-level-2 transition-all flex flex-col justify-between text-left group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                      <Ambulance className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-black bg-white text-red-700 px-2 py-0.5 rounded-full">
                      108
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black leading-tight group-hover:translate-x-0.5 transition-transform">
                      🚑 Call Ambulance
                    </h3>
                    <p className="text-[10px] text-red-100 font-medium">Emergency Dispatch</p>
                  </div>
                </button>

                {/* 2. 🏥 Nearby Hospitals */}
                <button
                  onClick={handleOpenHospitals}
                  className="h-24 rounded-2xl p-3 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-level-1 hover:shadow-level-2 transition-all flex flex-col justify-between text-left group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center">
                      <HospitalIcon className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-[10px] font-bold bg-white/20 text-white px-2 py-0.5 rounded-full">
                      Live GPS
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-black leading-tight group-hover:translate-x-0.5 transition-transform">
                      🏥 Nearby Hospitals
                    </h3>
                    <p className="text-[10px] text-blue-100 font-medium">ER Trauma Centers</p>
                  </div>
                </button>

                {/* 3. 🩹 First Aid Guide */}
                <button
                  onClick={() => {
                    onClose();
                    navigate('/first-aid');
                  }}
                  className="h-24 rounded-2xl p-3 bg-surface-container-lowest border border-emerald-300 text-emerald-950 shadow-xs hover:bg-emerald-50/60 transition-all flex flex-col justify-between text-left group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                      <Bandage className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-on-surface leading-tight group-hover:translate-x-0.5 transition-transform">
                      🩹 First Aid Guide
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">CPR & Trauma steps</p>
                  </div>
                </button>

                {/* 4. 📍 Share Live Location */}
                <button
                  onClick={handleShareLocation}
                  className="h-24 rounded-2xl p-3 bg-surface-container-lowest border border-amber-300 text-amber-950 shadow-xs hover:bg-amber-50/60 transition-all flex flex-col justify-between text-left group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Share2 className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-on-surface leading-tight group-hover:translate-x-0.5 transition-transform">
                      📍 Share Location
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">Send GPS link</p>
                  </div>
                </button>

                {/* 5. 📸 Report Accident */}
                <button
                  onClick={() => {
                    onClose();
                    navigate('/report');
                  }}
                  className="h-24 rounded-2xl p-3 bg-surface-container-lowest border border-rose-300 text-rose-950 shadow-xs hover:bg-rose-50/60 transition-all flex flex-col justify-between text-left group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-8 h-8 rounded-xl bg-rose-100 text-rose-800 flex items-center justify-center">
                      <Camera className="w-5 h-5" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-on-surface leading-tight group-hover:translate-x-0.5 transition-transform">
                      📸 Report Accident
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">Photo SOS report</p>
                  </div>
                </button>

                {/* 6. 🚓 Call Police (100) */}
                <button
                  onClick={() => handleCall('100')}
                  className="h-24 rounded-2xl p-3 bg-surface-container-lowest border border-indigo-300 text-indigo-950 shadow-xs hover:bg-indigo-50/60 transition-all flex flex-col justify-between text-left group active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold bg-indigo-100 text-indigo-900 px-2 py-0.5 rounded-full">
                      100
                    </span>
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-on-surface leading-tight group-hover:translate-x-0.5 transition-transform">
                      🚓 Call Police
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">100 / 112 Patrol</p>
                  </div>
                </button>
              </div>

              {/* 7. 🚒 Call Fire Service (101) - Full Width Uniform Card */}
              <button
                onClick={() => handleCall('101')}
                className="w-full h-20 rounded-2xl p-3.5 bg-surface-container-lowest border border-orange-300 text-orange-950 shadow-xs hover:bg-orange-50/60 transition-all flex items-center justify-between text-left group active:scale-[0.98]"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center shrink-0">
                    <Flame className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xs font-extrabold text-on-surface flex items-center gap-2">
                      <span>🚒 Call Fire Service</span>
                      <span className="bg-orange-100 text-orange-900 text-[10px] px-2 py-0.5 rounded-full font-bold">101</span>
                    </h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">Direct line to fire & rescue squads</p>
                  </div>
                </div>
                <PhoneCall className="w-5 h-5 text-orange-700 shrink-0 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: NEARBY HOSPITALS LIST WITH MAP PREVIEW */}
          {/* ========================================================================= */}
          {viewMode === 'hospitals' && (
            <div className="space-y-3">
              {/* Interactive Map Preview */}
              {userCoords && (
                <div className="w-full h-44 rounded-2xl overflow-hidden border border-outline-variant/60 shadow-xs bg-slate-100 relative z-0">
                  <MapContainer
                    center={userCoords}
                    zoom={14}
                    scrollWheelZoom={false}
                    zoomControl={false}
                    className="w-full h-full"
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; OpenStreetMap'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MapController userCoords={userCoords} hospitalCoords={null} />
                    <Marker position={userCoords} icon={userGpsPin}>
                      <Popup>Your Location</Popup>
                    </Marker>
                  </MapContainer>
                </div>
              )}

              {loadingHospitals ? (
                <div className="py-8 text-center space-y-2">
                  <Loader2 className="w-7 h-7 text-primary animate-spin mx-auto" />
                  <p className="text-xs font-bold text-on-surface">Discovering Nearby Emergency Hospitals...</p>
                  <p className="text-[11px] text-on-surface-variant">Searching facilities within 5 km radius</p>
                </div>
              ) : hospitals.length === 0 ? (
                <div className="py-6 text-center space-y-2">
                  <HospitalIcon className="w-8 h-8 text-outline mx-auto" />
                  <p className="text-xs font-bold text-on-surface">No hospitals found nearby.</p>
                  <p className="text-[11px] text-on-surface-variant">Try enabling high-accuracy GPS or checking connection.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {hospitals.map((hosp) => {
                    const routeInfo = routeMap[hosp.id];
                    const isCalculating = routeInfo === undefined;
                    return (
                      <div
                        key={hosp.id}
                        className="p-3.5 rounded-2xl border border-outline-variant/60 bg-surface-container-lowest shadow-xs space-y-2.5 hover:border-primary/50 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1 min-w-0 flex-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                                4.8 ★
                              </span>
                              <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                ER Ready
                              </span>
                            </div>
                            <h3 className="text-xs font-extrabold text-on-surface">{hosp.name}</h3>
                            <p className="text-[11px] text-on-surface-variant flex items-start gap-1 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                              <span className="break-words">{hosp.address}</span>
                            </p>
                          </div>

                          <div className="text-right shrink-0 min-w-[80px]">
                            {isCalculating ? (
                              <span className="text-[11px] font-bold text-on-surface-variant flex items-center justify-end gap-1">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Calc...
                              </span>
                            ) : routeInfo!.failed ? (
                              <span className="text-[11px] font-bold text-on-surface-variant">Route error</span>
                            ) : (
                              <>
                                <span className="text-xs font-extrabold text-primary block text-right">
                                  {formatDistance(routeInfo!.distanceMeters)}
                                </span>
                                <span className="text-[10px] font-semibold text-on-surface-variant flex items-center justify-end gap-1 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  {formatETA(routeInfo!.durationSeconds)}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-surface-container-high">
                          {hosp.phone ? (
                            <a
                              href={`tel:${hosp.phone}`}
                              className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container text-on-surface rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Call</span>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-surface-container-high/50 text-on-surface-variant/50 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-not-allowed"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Phone unavailable</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleStartNavigation(hosp)}
                            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                          >
                            <Navigation className="w-3.5 h-3.5" />
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
          {/* VIEW 3: IN-APP LIVE NAVIGATION PANEL (Route Polyline + Live Markers) */}
          {/* ========================================================================= */}
          {viewMode === 'navigating' && selectedHospital && (
            <div className="space-y-3">
              {/* Live Navigation Map View with Polyline */}
              <div className="w-full h-56 rounded-2xl overflow-hidden border border-outline-variant/60 shadow-sm bg-slate-100 relative z-0">
                <MapContainer
                  center={hospitalCoords || userCoords || [12.9716, 77.5946]}
                  zoom={14}
                  scrollWheelZoom={false}
                  zoomControl={false}
                  className="w-full h-full"
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapController userCoords={userCoords} hospitalCoords={hospitalCoords} />
                  
                  {/* User Location Marker */}
                  {userCoords && (
                    <Marker position={userCoords} icon={userGpsPin}>
                      <Popup>Current Location</Popup>
                    </Marker>
                  )}

                  {/* Destination Hospital Marker */}
                  {hospitalCoords && (
                    <Marker position={hospitalCoords} icon={hospitalDestinationPin}>
                      <Popup>
                        <strong className="text-red-700 block">{selectedHospital.name}</strong>
                        <span>{selectedHospital.address}</span>
                      </Popup>
                    </Marker>
                  )}

                  {/* Route Polyline */}
                  {routePolyline.length > 0 && (
                    <Polyline positions={routePolyline} color="#2563eb" weight={5} opacity={0.85} />
                  )}
                </MapContainer>
              </div>

              {/* Navigation Status Card */}
              <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/60 shadow-level-1 space-y-3">
                <div className="flex items-start justify-between gap-2 border-b border-surface-container-high pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-2xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <HospitalIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-primary uppercase tracking-wider">Destination</p>
                      <h3 className="text-xs font-extrabold text-on-surface truncate">{selectedHospital.name}</h3>
                      <p className="text-[10px] text-on-surface-variant truncate">{selectedHospital.address}</p>
                    </div>
                  </div>
                </div>

                {/* Live Stats Grid */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="bg-surface-container-low p-2.5 rounded-xl">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase">Distance</p>
                    <p className="text-xs font-extrabold text-primary">
                      {formatDistance(routeDistanceMeters || selectedHospital.distanceMeters)}
                    </p>
                  </div>

                  <div className="bg-surface-container-low p-2.5 rounded-xl">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase">Live ETA</p>
                    <p className="text-xs font-extrabold text-secondary">
                      {loadingRoute ? '...' : formatETA(routeDurationSeconds || 300)}
                    </p>
                  </div>

                  <div className="bg-surface-container-low p-2.5 rounded-xl">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase">Arrival</p>
                    <p className="text-xs font-extrabold text-emerald-700">
                      {getEstimatedArrivalTime(routeDurationSeconds)}
                    </p>
                  </div>
                </div>

                {/* Guidance Status */}
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold rounded-xl flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping shrink-0"></span>
                  <span className="text-[11px]">Active In-App Live Navigation Route Guidance</span>
                </div>

                {/* Cancel Navigation Button */}
                <button
                  onClick={handleCancelNavigation}
                  className="w-full py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-1.5"
                >
                  <X className="w-4 h-4" />
                  <span>Cancel Navigation</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

