import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  ArrowLeft,
  MapPin,
  Play,
  Pause,
  Target,
  Plus,
  Minus,
  Clock,
  Check,
  ChevronUp,
  ChevronDown,
  Siren,
  Hospital as HospitalIcon,
  Compass,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { formatDistance, calculateHaversineDistance } from '../utils/distance';
import { fetchOSRMRoute, formatETA, getStoredHospital, cleanDescriptionText } from '../utils/routing';
import { useHeadingRotation } from '../hooks/useHeadingRotation';
import 'leaflet/dist/leaflet.css';

// Fix default Leaflet icon paths in Vite bundler
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom 🔴 Accident Pin (Red Emergency Beacon)
const accidentIcon = L.divIcon({
  className: 'custom-accident-nav-pin',
  html: `
    <div class="relative flex items-center justify-center w-11 h-11">
      <span class="absolute w-11 h-11 rounded-full bg-red-500/60 animate-ping"></span>
      <div class="relative w-11 h-11 rounded-full bg-red-600 border-2 border-white shadow-2xl flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

// Custom 🟢 Volunteer Pin (Emerald Vehicle / Bike Pin with smooth movement)
const volunteerIcon = L.divIcon({
  className: 'custom-volunteer-nav-pin transition-all duration-700 ease-out',
  html: `
    <div class="relative flex items-center justify-center w-11 h-11">
      <span class="absolute w-11 h-11 rounded-full bg-emerald-400/60 animate-ping"></span>
      <div class="relative w-11 h-11 rounded-full bg-emerald-600 border-2 border-white shadow-2xl flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
      </div>
    </div>
  `,
  iconSize: [44, 44],
  iconAnchor: [22, 22],
  popupAnchor: [0, -22],
});

// Custom 🔵 Destination Target Pin (Blue Flag Pin)
const destinationIcon = L.divIcon({
  className: 'custom-destination-nav-pin',
  html: `
    <div class="relative flex items-center justify-center w-9 h-9">
      <div class="relative w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

// Map Controller for auto-fitting and user recentering & zoom controls
const NavigationMapController: React.FC<{
  accidentCoords: [number, number];
  volunteerCoords: [number, number] | null;
  recenterSignal: number;
  zoomInSignal: number;
  zoomOutSignal: number;
}> = ({ accidentCoords, volunteerCoords, recenterSignal, zoomInSignal, zoomOutSignal }) => {
  const map = useMap();

  const handleFit = useCallback(() => {
    map.invalidateSize();
    const points: [number, number][] = [accidentCoords];
    if (volunteerCoords) points.push(volunteerCoords);

    if (points.length > 1) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else {
      map.setView(accidentCoords, 15);
    }
  }, [map, accidentCoords, volunteerCoords]);

  // Recenter trigger
  useEffect(() => {
    handleFit();
  }, [handleFit, recenterSignal]);

  // Zoom In trigger
  useEffect(() => {
    if (zoomInSignal > 0) {
      map.zoomIn();
    }
  }, [map, zoomInSignal]);

  // Zoom Out trigger
  useEffect(() => {
    if (zoomOutSignal > 0) {
      map.zoomOut();
    }
  }, [map, zoomOutSignal]);

  return null;
};

interface AccidentData {
  id: string;
  address: string;
  severity: string;
  latitude: number;
  longitude: number;
  volunteer_latitude?: number | null;
  volunteer_longitude?: number | null;
  status: string;
  description?: string;
  created_at?: string;
  volunteer_id?: string | null;
  volunteer_name?: string;
  vehicle_type?: string;
}

export type SnapState = 'collapsed' | 'half' | 'full';

const SNAP_HEIGHTS: Record<SnapState, number> = {
  collapsed: 25,
  half: 60,
  full: 90,
};

interface SubNavigationProps {
  activeAccidentId: string;
  locationState: any;
  user: any;
}

// =========================================================================================
// VOLUNTEER NAVIGATION SCREEN (Strictly Mounted ONLY for Volunteer Responders)
// =========================================================================================
const VolunteerNavigationScreen: React.FC<SubNavigationProps> = ({
  activeAccidentId,
  locationState,
  user,
}) => {
  const navigate = useNavigate();

  const [displayAddress, setDisplayAddress] = useState<string>(
    locationState?.address || 'Emergency Incident Location'
  );
  const [displaySubLocality, setDisplaySubLocality] = useState<string>('');

  const [accident, setAccident] = useState<AccidentData>({
    id: activeAccidentId,
    address: locationState?.address || 'Emergency Incident Location',
    severity: locationState?.severity || 'CRITICAL',
    latitude: locationState?.latitude ?? 0,
    longitude: locationState?.longitude ?? 0,
    volunteer_latitude: locationState?.volunteerLatitude ?? null,
    volunteer_longitude: locationState?.volunteerLongitude ?? null,
    status: 'In Progress',
    description: 'Accident reported. Paramedic & volunteer response in progress.',
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
    volunteer_name: 'Emergency Volunteer Responder',
    vehicle_type: 'Rapid Response Unit',
  });

  const [volunteerPos, setVolunteerPos] = useState<[number, number] | null>(
    accident.volunteer_latitude && accident.volunteer_longitude
      ? [accident.volunteer_latitude, accident.volunteer_longitude]
      : null
  );

  const [isHeadingUpMode, setIsHeadingUpMode] = useState(true);

  const volCoords = volunteerPos
    ? { lat: volunteerPos[0], lng: volunteerPos[1] }
    : { lat: accident.latitude, lng: accident.longitude };

  // Heading-Up Auto Rotation Engine
  const { heading } = useHeadingRotation(isHeadingUpMode && accident.status !== 'Emergency Resolved', volCoords);

  // Request real device location for volunteer if not available
  useEffect(() => {
    if (!volunteerPos && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setVolunteerPos([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.warn('[Volunteer Navigation] Geolocation error:', err.message);
        },
        { enableHighAccuracy: true }
      );
    }
  }, []);

  const [volunteerRoute, setVolunteerRoute] = useState<[number, number][]>([]);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(true);

  const [recenterSignal, setRecenterSignal] = useState<number>(0);
  const [zoomInSignal, setZoomInSignal] = useState<number>(0);
  const [zoomOutSignal, setZoomOutSignal] = useState<number>(0);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [snapState, setSnapState] = useState<SnapState>('collapsed');
  const [sheetHeight, setSheetHeight] = useState<number>(25);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const startYRef = useRef<number | null>(null);
  const startHeightRef = useRef<number>(25);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isDragging) {
      setSheetHeight(SNAP_HEIGHTS[snapState]);
    }
  }, [snapState, isDragging]);

  const handleDragStart = (clientY: number) => {
    if (snapState === 'full' && (scrollContainerRef.current?.scrollTop || 0) > 5) {
      return;
    }
    startYRef.current = clientY;
    startHeightRef.current = sheetHeight;
    setIsDragging(true);
  };

  const handleDragMove = (clientY: number) => {
    if (!isDragging || startYRef.current === null) return;
    const windowHeight = window.innerHeight || 800;
    const deltaY = clientY - startYRef.current;
    const deltaPercent = (deltaY / windowHeight) * 100;
    const nextHeight = Math.max(25, Math.min(92, startHeightRef.current - deltaPercent));
    setSheetHeight(nextHeight);
  };

  const handleDragEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    startYRef.current = null;

    if (sheetHeight < 40) {
      setSnapState('collapsed');
      setSheetHeight(25);
    } else if (sheetHeight >= 40 && sheetHeight < 75) {
      setSnapState('half');
      setSheetHeight(60);
    } else {
      setSnapState('full');
      setSheetHeight(90);
    }
  };

  const handleCollapseClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (snapState === 'collapsed') {
      setSnapState('half');
      setSheetHeight(60);
    } else {
      setSnapState('collapsed');
      setSheetHeight(25);
    }
  };

  useEffect(() => {
    const formatLocationDetails = async () => {
      const rawAddress = accident.address || '';
      if (rawAddress && !rawAddress.includes('GPS (')) {
        const parts = rawAddress.split(',');
        if (parts.length >= 2) {
          setDisplayAddress(`📍 Near ${parts[0].trim()}`);
          setDisplaySubLocality(parts.slice(1).join(',').trim());
        } else {
          setDisplayAddress(`📍 ${rawAddress}`);
          setDisplaySubLocality('');
        }
      } else if (accident.latitude && accident.longitude) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${accident.latitude}&lon=${accident.longitude}`,
            { headers: { 'User-Agent': 'RescueLink/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const road = data.address?.road || data.address?.suburb || data.address?.neighbourhood || 'Emergency Location';
            const city = data.address?.city || data.address?.town || data.address?.county || '';
            const state = data.address?.state || '';

            setDisplayAddress(`📍 Near ${road}`);
            setDisplaySubLocality(city && state ? `${city}, ${state}` : city || state);
            return;
          }
        } catch {
          // Fallback
        }
        setDisplayAddress(`📍 GPS (${accident.latitude.toFixed(4)}, ${accident.longitude.toFixed(4)})`);
        setDisplaySubLocality('');
      } else {
        setDisplayAddress('📍 Emergency Incident Location');
        setDisplaySubLocality('');
      }
    };

    formatLocationDetails();
  }, [accident.address, accident.latitude, accident.longitude]);

  useEffect(() => {
    const fetchAccidentDetails = async () => {
      if (activeAccidentId && activeAccidentId !== 'default-accident') {
        const { data, error } = await supabase
          .from('accidents')
          .select('*')
          .eq('id', activeAccidentId)
          .single();

        if (data && !error) {
          setAccident((prev) => ({
            ...prev,
            id: data.id,
            address: data.address || prev.address,
            severity: data.severity || prev.severity,
            latitude: data.latitude || prev.latitude,
            longitude: data.longitude || prev.longitude,
            volunteer_latitude: data.volunteer_latitude ?? prev.volunteer_latitude,
            volunteer_longitude: data.volunteer_longitude ?? prev.volunteer_longitude,
            status: data.status || prev.status,
            description: data.description || prev.description,
            created_at: data.created_at || prev.created_at,
          }));

          if (data.volunteer_latitude && data.volunteer_longitude) {
            setVolunteerPos([data.volunteer_latitude, data.volunteer_longitude]);
          }
        }
      }
    };
    fetchAccidentDetails();
  }, [activeAccidentId]);

  useEffect(() => {
    if (!activeAccidentId || activeAccidentId === 'default-accident') return;

    const channel = supabase
      .channel(`volunteer_nav_${activeAccidentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'accidents',
          filter: `id=eq.${activeAccidentId}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as any;
            setAccident((prev) => ({
              ...prev,
              status: updated.status || prev.status,
              description: updated.description || prev.description,
              volunteer_latitude: updated.volunteer_latitude ?? prev.volunteer_latitude,
              volunteer_longitude: updated.volunteer_longitude ?? prev.volunteer_longitude,
            }));

            if (updated.volunteer_latitude && updated.volunteer_longitude) {
              setVolunteerPos([updated.volunteer_latitude, updated.volunteer_longitude]);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeAccidentId]);

  const volLat = volunteerPos ? volunteerPos[0] : null;
  const volLng = volunteerPos ? volunteerPos[1] : null;

  const volStoredHosp = getStoredHospital(activeAccidentId);
  const isVolTransporting = accident.status === 'Transporting to Hospital' || !!volStoredHosp;

  const volTargetLat = volStoredHosp?.latitude ?? (isVolTransporting ? accident.latitude + 0.0085 : accident.latitude);
  const volTargetLng = volStoredHosp?.longitude ?? (isVolTransporting ? accident.longitude - 0.0062 : accident.longitude);

  const volPrevPosRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    const loadVolunteerRoute = async () => {
      if (volLat === null || volLng === null) {
        setLoadingRoute(false);
        return;
      }

      if (volPrevPosRef.current) {
        const moveDist = calculateHaversineDistance(
          volPrevPosRef.current[0],
          volPrevPosRef.current[1],
          volLat,
          volLng
        );
        if (moveDist < 5 && volunteerRoute.length > 0) {
          return;
        }
      }

      volPrevPosRef.current = [volLat, volLng];
      setLoadingRoute(true);
      const res = await fetchOSRMRoute([volLat, volLng], [volTargetLat, volTargetLng]);
      setVolunteerRoute(res.coordinates);
      setDistanceMeters(res.distanceMeters < 30 ? 0 : res.distanceMeters);
      setDurationSeconds(res.distanceMeters < 30 ? 0 : res.durationSeconds);
      setLoadingRoute(false);
    };

    loadVolunteerRoute();
  }, [volLat, volLng, volTargetLat, volTargetLng]);



  const toggleSimulation = () => {
    if (isSimulating) {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      setIsSimulating(false);
    } else {
      setIsSimulating(true);

      const startLat = volunteerPos ? volunteerPos[0] : accident.latitude + 0.008;
      const startLng = volunteerPos ? volunteerPos[1] : accident.longitude + 0.008;
      let step = 0;
      const totalSteps = 20;

      simulationIntervalRef.current = setInterval(() => {
        step++;
        if (step >= totalSteps) {
          clearInterval(simulationIntervalRef.current!);
          setIsSimulating(false);
          setCopiedToast('Arrived at Destination Point');
          setTimeout(() => setCopiedToast(null), 3000);
          return;
        }

        const progress = step / totalSteps;
        const currentLat = startLat + (accident.latitude - startLat) * progress;
        const currentLng = startLng + (accident.longitude - startLng) * progress;

        const newPos: [number, number] = [currentLat, currentLng];
        setVolunteerPos(newPos);

        if (user && activeAccidentId && activeAccidentId !== 'default-accident') {
          supabase
            .from('accidents')
            .update({
              volunteer_latitude: currentLat,
              volunteer_longitude: currentLng,
            })
            .eq('id', activeAccidentId)
            .then(({ error }) => {
              if (error) console.warn('[RescueLink Sim] Sync warn:', error.message);
            });
        }
      }, 2000);
    }
  };

  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, []);

  const formatReportedTime = (isoString?: string): string => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const diffMins = Math.round((Date.now() - date.getTime()) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} mins ago`;
    const hours = Math.floor(diffMins / 60);
    return `${hours} hr${hours > 1 ? 's' : ''} ago`;
  };

  const accidentPos: [number, number] = [accident.latitude, accident.longitude];

  return (
    <div
      onPointerMove={(e) => isDragging && handleDragMove(e.clientY)}
      onPointerUp={handleDragEnd}
      onTouchMove={(e) => isDragging && handleDragMove(e.touches[0].clientY)}
      onTouchEnd={handleDragEnd}
      className="relative w-full h-[calc(100vh-64px)] max-h-screen overflow-hidden flex flex-col select-none font-sans bg-slate-50"
    >
      {/* Volunteer Header */}
      <div className="absolute top-3 left-3 right-3 z-[500] p-3.5 rounded-2xl border border-slate-200/80 shadow-md flex items-center justify-between bg-white/95 backdrop-blur-md text-slate-900">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95 shrink-0"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full animate-ping bg-red-600"></span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-red-700">
                ⚡ RESCUE MISSION IN PROGRESS
              </span>
            </div>
            <h1 className="text-sm font-extrabold text-slate-900 truncate">
              {displayAddress}
            </h1>
            <p className="text-[11px] text-slate-500 truncate font-medium">
              {displaySubLocality}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 pl-2">
          <span className="text-[10px] font-extrabold bg-rose-50 text-red-700 border border-rose-200 px-2.5 py-1 rounded-full uppercase shadow-xs flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
            {accident.severity}
          </span>

          <button
            onClick={toggleSimulation}
            className={`p-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-xs active:scale-95 ${
              isSimulating
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-red-800 hover:bg-red-900 text-white'
            }`}
            title="Toggle simulated volunteer live GPS movement"
          >
            {isSimulating ? <Pause className="w-4 h-4 text-amber-800" /> : <Play className="w-4 h-4" />}
            <span className="hidden md:inline text-[11px]">
              {isSimulating ? 'Pause GPS' : 'Simulate GPS'}
            </span>
          </button>
        </div>
      </div>

      {copiedToast && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[600] bg-slate-900 text-emerald-400 text-xs font-bold px-4 py-2.5 rounded-full shadow-2xl border border-emerald-500/50 flex items-center gap-2 animate-bounce">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Volunteer Map */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden">
        <div
          className="w-full h-full transition-transform duration-500 ease-out origin-center"
          style={{
            transform: isHeadingUpMode && heading ? `rotate(-${Math.round(heading)}deg) scale(1.15)` : 'none',
          }}
        >
          <MapContainer
            center={accidentPos}
            zoom={15}
            zoomControl={false}
            scrollWheelZoom={true}
            className="w-full h-full z-0"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <NavigationMapController
              accidentCoords={accidentPos}
              volunteerCoords={volunteerPos}
              recenterSignal={recenterSignal}
              zoomInSignal={zoomInSignal}
              zoomOutSignal={zoomOutSignal}
            />

            {volunteerRoute.length > 0 && (
              <>
                <Polyline
                  positions={volunteerRoute}
                  pathOptions={{ color: '#f59e0b', weight: 9, opacity: 0.35, lineCap: 'round' }}
                />
                <Polyline
                  positions={volunteerRoute}
                  pathOptions={{ color: '#d97706', weight: 5, opacity: 0.95, lineCap: 'round' }}
                />
              </>
            )}

            <Marker position={accidentPos} icon={accidentIcon}>
              <Popup>
                <div className="p-1 text-xs font-sans">
                  <strong className="text-red-600 block font-bold uppercase">
                    {accident.severity} ACCIDENT LOCATION
                  </strong>
                  <span>{displayAddress}</span>
                </div>
              </Popup>
            </Marker>

            {volunteerPos && (
              <Marker position={volunteerPos} icon={volunteerIcon}>
                <Popup>
                  <div className="p-1 text-xs font-sans">
                    <strong className="text-emerald-600 block font-bold">
                      Responder: {accident.volunteer_name}
                    </strong>
                    <span>Vehicle: {accident.vehicle_type}</span>
                  </div>
                </Popup>
              </Marker>
            )}

            <Marker position={[volTargetLat, volTargetLng]} icon={destinationIcon}>
              <Popup>
                <div className="p-1 text-xs font-sans">
                  <strong className="text-blue-600 block font-bold">
                    {volStoredHosp ? `🏥 Hospital: ${volStoredHosp.name}` : 'Destination Incident Point'}
                  </strong>
                  <span>{volStoredHosp ? volStoredHosp.address : displayAddress}</span>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        <div
          style={{
            bottom: `calc(${sheetHeight}% + 12px)`,
            transition: isDragging ? 'none' : 'bottom 300ms cubic-bezier(0.4,0,0.2,1)',
          }}
          className="absolute right-3 z-[450] flex flex-col gap-2"
        >
          {/* Compass Orientation Button */}
          <button
            onClick={() => setIsHeadingUpMode(!isHeadingUpMode)}
            className={`p-3 rounded-2xl border shadow-md transition-all active:scale-90 flex items-center justify-center ${
              isHeadingUpMode
                ? 'bg-emerald-600 text-white border-emerald-500 ring-2 ring-emerald-400/30'
                : 'bg-white/95 text-slate-700 border-slate-200/80 hover:bg-white'
            }`}
            title={isHeadingUpMode ? 'Heading-Up Navigation (Auto Rotate Active)' : 'North-Up Map View'}
          >
            <Compass
              className="w-5 h-5 transition-transform duration-500"
              style={{ transform: `rotate(${Math.round(heading)}deg)` }}
            />
          </button>

          <button
            onClick={() => setRecenterSignal((prev) => prev + 1)}
            className="p-3 bg-white/95 hover:bg-white text-slate-700 rounded-2xl border border-slate-200/80 shadow-md transition-all active:scale-90 flex items-center justify-center group"
            title="📍 Recenter Map Camera"
            aria-label="Recenter Map"
          >
            <Target className="w-5 h-5 text-emerald-600 group-hover:rotate-45 transition-transform duration-300" />
          </button>

          <button
            onClick={() => setZoomInSignal((prev) => prev + 1)}
            className="p-3 bg-white/95 hover:bg-white text-slate-700 rounded-2xl border border-slate-200/80 shadow-md transition-all active:scale-90 flex items-center justify-center"
            title="➕ Zoom In"
            aria-label="Zoom In"
          >
            <Plus className="w-5 h-5 text-slate-700" />
          </button>

          <button
            onClick={() => setZoomOutSignal((prev) => prev + 1)}
            className="p-3 bg-white/95 hover:bg-white text-slate-700 rounded-2xl border border-slate-200/80 shadow-md transition-all active:scale-90 flex items-center justify-center"
            title="➖ Zoom Out"
            aria-label="Zoom Out"
          >
            <Minus className="w-5 h-5 text-slate-700" />
          </button>
        </div>
      </div>

      {/* Volunteer Bottom Sheet */}
      <div
        onPointerDown={(e) => handleDragStart(e.clientY)}
        onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
        style={{
          height: `${sheetHeight}%`,
          transition: isDragging ? 'none' : 'height 300ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        className="absolute bottom-0 left-0 right-0 z-[500] border-t rounded-t-3xl shadow-xl flex flex-col cursor-grab active:cursor-grabbing transition-colors bg-white border-slate-200/80 text-slate-900"
      >
        <div
          onClick={handleCollapseClick}
          className="w-full pt-3 pb-2 px-4 cursor-pointer hover:bg-slate-50 rounded-t-3xl transition-colors shrink-0 flex flex-col items-center justify-center group"
          title={`Click or swipe to change sheet height (Current: ${snapState.toUpperCase()})`}
        >
          <div className="w-12 h-1.5 bg-slate-200 group-hover:bg-red-700 rounded-full transition-colors"></div>

          <div className="w-full flex items-center justify-between mt-2 px-1">
            <div className="flex items-center gap-2 truncate">
              <span className="text-[10px] font-extrabold uppercase text-red-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 shrink-0">
                {accident.severity} PRIORITY
              </span>
              <span className="text-xs font-bold text-slate-800 truncate">
                Victim Incident • {formatReportedTime(accident.created_at)}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-extrabold text-red-700">
                {formatDistance(distanceMeters)} • {loadingRoute ? '...' : formatETA(durationSeconds)}
              </span>
              {snapState === 'full' || snapState === 'half' ? (
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-red-700 transition-transform" />
              ) : (
                <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-red-700 transition-transform" />
              )}
            </div>
          </div>
        </div>

        <div
          ref={scrollContainerRef}
          style={{
            overflowY: snapState === 'full' ? 'auto' : 'hidden',
            touchAction: snapState === 'full' ? 'pan-y' : 'none',
          }}
          className="flex-1 px-4 sm:px-5 pb-5 space-y-4"
        >
          {/* Volunteer Rescue Banner */}
          <div className="bg-gradient-to-r from-red-800 to-rose-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 text-white flex items-center justify-center font-bold shadow-xs shrink-0 backdrop-blur-xs">
                <Siren className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-100 bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20">
                  {volStoredHosp ? '🏥 Hospital Transport' : 'Active Rescue Mission'}
                </span>
                <h2 className="text-xs font-extrabold text-white mt-1">
                  {volStoredHosp ? `Hospital: ${volStoredHosp.name}` : `Target Victim Location: ${displayAddress}`}
                </h2>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-xs font-extrabold text-white block">
                {formatDistance(distanceMeters)}
              </span>
              <span className="text-[10px] font-bold text-rose-100">Distance</span>
            </div>
          </div>

          {/* Volunteer Victim Info Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-extrabold bg-rose-50 text-red-700 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                {accident.severity} SEVERITY
              </span>
              <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                Reported {formatReportedTime(accident.created_at)}
              </span>
            </div>

            <p className="text-xs font-medium text-slate-700 leading-relaxed">
              {cleanDescriptionText(accident.description) ||
                'Two vehicles collided near traffic signal. Victim requires immediate first aid and transport.'}
            </p>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold pt-1 border-t border-slate-200/60">
              <MapPin className="w-4 h-4 text-red-700 shrink-0" />
              <span className="truncate">{accident.address}</span>
            </div>
          </div>

          {/* Volunteer Rescue Metrics */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-center">
              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                Distance to Scene
              </span>
              <span className="text-base font-extrabold text-slate-900 mt-1 block">
                {formatDistance(distanceMeters)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-center">
              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                Fastest ETA
              </span>
              <span className="text-base font-extrabold text-red-700 mt-1 block">
                {formatETA(durationSeconds, distanceMeters)}
              </span>
            </div>

            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs text-center">
              <span className="text-[10px] font-bold text-slate-500 block uppercase tracking-wider">
                Current Status
              </span>
              <span className="text-xs font-extrabold text-emerald-700 mt-1.5 block truncate">
                {accident.status}
              </span>
            </div>
          </div>

          {/* Dedicated Selected Hospital Card */}
          {(() => {
            const hosp = getStoredHospital(activeAccidentId);
            if (!hosp && accident.status !== 'Transporting to Hospital') return null;

            const name = hosp?.name || 'Nearest Regional Emergency Center';
            const address = hosp?.address || displayAddress;
            const distMeters = distanceMeters;
            const etaSecs = durationSeconds;

            return (
              <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl border border-slate-800 shadow-sm space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase text-blue-200 bg-blue-900/80 px-2.5 py-0.5 rounded-full border border-blue-700 flex items-center gap-1">
                    <HospitalIcon className="w-3.5 h-3.5 text-blue-300" />
                    Selected Hospital
                  </span>
                  <span className="text-[11px] font-bold text-slate-300">Destination</span>
                </div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 pt-0.5">
                  <span>🏥</span>
                  <span>{name}</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 text-xs text-slate-200 font-semibold pt-2 border-t border-slate-800">
                  <span className="truncate">📍 {address}</span>
                  <span>📏 {formatDistance(distMeters)}</span>
                  <span>⏱ {formatETA(etaSecs)}</span>
                </div>
              </div>
            );
          })()}

        </div>
      </div>
    </div>
  );
};

// =========================================================================================
// COMPONENT 3: TOP-LEVEL ROUTER WRAPPER
// =========================================================================================
export const LiveNavigationScreen: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const locationState = location.state as any;
  const { accidentId: routeAccidentId } = useParams<{ accidentId?: string }>();
  const activeAccidentId = routeAccidentId || locationState?.accidentId || 'default-accident';

  const { user } = useAuth();
  const mode = locationState?.mode || 'citizen';

  useEffect(() => {
    if (mode === 'citizen') {
      // Citizen should NEVER enter navigation mode. Redirect to Emergency Status Screen.
      console.log('[RescueLink Navigation] Citizen user attempted to enter navigation mode. Redirecting to SOS Status Screen...');
      navigate('/status', { state: { accidentId: activeAccidentId }, replace: true });
    }
  }, [mode, navigate, activeAccidentId]);

  if (mode === 'citizen') {
    return null;
  }

  return (
    <VolunteerNavigationScreen
      activeAccidentId={activeAccidentId}
      locationState={locationState}
      user={user}
    />
  );
};

export default LiveNavigationScreen;
