import React, { useEffect, useState, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Compass,
  Square,
  Clock,
  CheckCircle2,
  Ambulance,
  Hospital as HospitalIcon,
  Navigation as NavigationIcon,
} from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import { fetchOSRMRoute, formatETA } from '../../utils/routing';
import { formatDistance, calculateHaversineDistance } from '../../utils/distance';

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

// Custom Google Maps-style Navigation Arrow Pin (Pulsing navigation beacon)
// When isHeadingUp is true, container is rotated by -heading. Inside container, rotating chevron by +heading
// keeps the arrow pointing 100% straight UP to the TOP of the screen always!
const createNavigationUserIcon = (heading: number, isHeadingUp: boolean) => {
  const displayHeading = isHeadingUp ? heading : heading;
  return L.divIcon({
    className: 'custom-nav-user-pin',
    html: `
      <div class="relative flex items-center justify-center w-14 h-14">
        <!-- Outer pulsating radar ring -->
        <span class="absolute w-14 h-14 rounded-full bg-blue-500/35 animate-ping"></span>
        <!-- Inner aura ring -->
        <span class="absolute w-10 h-10 rounded-full bg-blue-600/40 border-2 border-white/60"></span>
        <!-- Directional vehicle navigation chevron -->
        <div 
          class="relative w-9 h-9 rounded-full bg-blue-600 border-2 border-white shadow-2xl flex items-center justify-center text-white transition-transform duration-300 ease-out"
          style="transform: rotate(${Math.round(displayHeading)}deg);"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <polygon points="12 2 19 21 12 17 5 21 12 2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [56, 56],
    iconAnchor: [28, 28],
    popupAnchor: [0, -28],
  });
};

// Destination Pin (Hospital / Accident / Location)
const createDestinationIcon = (type: 'accident' | 'hospital' | 'location') => {
  if (type === 'hospital') {
    return L.divIcon({
      className: 'custom-nav-hospital-pin',
      html: `
        <div class="relative flex items-center justify-center w-12 h-12">
          <span class="absolute w-12 h-12 rounded-full bg-blue-500/40 animate-ping"></span>
          <div class="relative w-11 h-11 rounded-full bg-indigo-700 border-2 border-white shadow-2xl flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 6v12"/><path d="M6 12h12"/></svg>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
    });
  }

  if (type === 'accident') {
    return L.divIcon({
      className: 'custom-nav-accident-pin',
      html: `
        <div class="relative flex items-center justify-center w-12 h-12">
          <span class="absolute w-12 h-12 rounded-full bg-red-500/50 animate-ping"></span>
          <div class="relative w-11 h-11 rounded-full bg-red-600 border-2 border-white shadow-2xl flex items-center justify-center text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
        </div>
      `,
      iconSize: [48, 48],
      iconAnchor: [24, 24],
      popupAnchor: [0, -24],
    });
  }

  return L.divIcon({
    className: 'custom-nav-target-pin',
    html: `
      <div class="relative flex items-center justify-center w-10 h-10">
        <div class="relative w-10 h-10 rounded-full bg-emerald-600 border-2 border-white shadow-xl flex items-center justify-center text-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" x2="4" y1="22" y2="15"/></svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

/**
 * Calculates the exact map target center required to position `userCoords`
 * near the LOWER CENTER of the screen (~72% down from top) along the user's heading vector.
 */
function getLowerCenterMapTarget(
  userCoords: [number, number],
  heading: number,
  zoom: number,
  isHeadingUp: boolean
): [number, number] {
  const [lat, lng] = userCoords;
  const rad = Math.PI / 180;

  // Offset distance in meters ahead of user along heading vector.
  // When isHeadingUp is false (North-Up), offset is straight North.
  const activeHeading = isHeadingUp ? heading : 0;
  const offsetMeters = 160 * Math.pow(2, 16 - zoom);

  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos(lat * rad);

  const deltaLat = (offsetMeters * Math.cos(activeHeading * rad)) / metersPerDegreeLat;
  const deltaLng = (offsetMeters * Math.sin(activeHeading * rad)) / metersPerDegreeLng;

  return [lat + deltaLat, lng + deltaLng];
}

interface NavigationMapControllerProps {
  userCoords: [number, number];
  heading: number;
  isFollowing: boolean;
  isHeadingUp: boolean;
  isMoving: boolean;
  onManualDrag: () => void;
  recenterTrigger: number;
}

const NavigationMapController: React.FC<NavigationMapControllerProps> = ({
  userCoords,
  heading,
  isFollowing,
  isHeadingUp,
  isMoving,
  onManualDrag,
  recenterTrigger,
}) => {
  const map = useMap();

  // Attach manual drag listener to detect user touch/drag
  useEffect(() => {
    const handleDragStart = () => {
      onManualDrag();
    };

    map.on('dragstart', handleDragStart);
    return () => {
      map.off('dragstart', handleDragStart);
    };
  }, [map, onManualDrag]);

  // Dynamic Camera Follow & Lower-Center Panning Engine
  const updateCameraView = useCallback(
    (forceRecenter = false) => {
      if (!isFollowing && !forceRecenter) return;

      map.invalidateSize();
      const targetZoom = isMoving ? 18 : 16;
      const currentZoom = map.getZoom();

      const targetCenter = getLowerCenterMapTarget(userCoords, heading, targetZoom, isHeadingUp);

      if (forceRecenter || Math.abs(currentZoom - targetZoom) >= 1) {
        map.flyTo(targetCenter, targetZoom, { duration: 0.8, easeLinearity: 0.25 });
      } else {
        map.panTo(targetCenter, { animate: true, duration: 0.35, easeLinearity: 0.25 });
      }
    },
    [map, userCoords, heading, isFollowing, isHeadingUp, isMoving]
  );

  // Trigger continuous camera update whenever user position, heading, or motion changes
  useEffect(() => {
    updateCameraView();
  }, [updateCameraView, userCoords, heading, isHeadingUp]);

  // Recenter signal trigger from floating Recenter button
  useEffect(() => {
    if (recenterTrigger > 0) {
      updateCameraView(true);
    }
  }, [recenterTrigger, updateCameraView]);

  return null;
};

export interface GoogleMapsNavigationModeProps {
  destinationName: string;
  destinationAddress: string;
  destinationCoords: [number, number];
  destinationType?: 'accident' | 'hospital' | 'location';
  initialUserCoords?: [number, number] | null;
  accidentId?: string;
  navigationStatus?: string;
  onStopNavigation: () => void;
  onArrival?: () => void;
}

export const GoogleMapsNavigationMode: React.FC<GoogleMapsNavigationModeProps> = ({
  destinationName,
  destinationAddress,
  destinationCoords,
  destinationType = 'hospital',
  initialUserCoords = null,
  navigationStatus = 'Navigation Active',
  onStopNavigation,
  onArrival,
}) => {
  // 1. User Position State (smoothly lerped)
  const [userPos, setUserPos] = useState<[number, number]>(
    initialUserCoords || [destinationCoords[0] - 0.006, destinationCoords[1] - 0.005]
  );
  const [renderedPos, setRenderedPos] = useState<[number, number]>(userPos);

  // 2. Navigation Camera & Motion Controls
  const [isNavModeActive, setIsNavModeActive] = useState<boolean>(true);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const [isMoving, setIsMoving] = useState<boolean>(false);
  const [heading, setHeading] = useState<number>(0);
  const [isHeadingUp, setIsHeadingUp] = useState<boolean>(true);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [hasArrived, setHasArrived] = useState<boolean>(false);

  // 3. Route & Navigation Metrics
  const [routePolyline, setRoutePolyline] = useState<[number, number][]>([]);
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [currentRoad, setCurrentRoad] = useState<string>('');
  const [loadingRoute, setLoadingRoute] = useState<boolean>(true);

  const prevPosRef = useRef<[number, number] | null>(null);

  // Utility: Shortest angular difference lerp for smooth 360 map rotation
  const getShortestAngleDelta = (from: number, to: number) => {
    const diff = (to - from) % 360;
    return ((diff + 540) % 360) - 180;
  };

  // Real GPS Geolocation Watcher (High-frequency update GPS Navigation)
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const speed = pos.coords.speed || 0; // m/s

        setIsMoving(speed > 0.5);

        // Update heading if provided by device GPS
        if (pos.coords.heading !== null && !isNaN(pos.coords.heading)) {
          setHeading((prev) => prev + getShortestAngleDelta(prev, pos.coords.heading!));
        } else if (prevPosRef.current) {
          const moveDist = calculateHaversineDistance(
            prevPosRef.current[0],
            prevPosRef.current[1],
            newLat,
            newLng
          );
          if (moveDist > 1.2) {
            // Immediate bearing update on >= 1.2m movement
            const rad = Math.PI / 180;
            const dLng = (newLng - prevPosRef.current[1]) * rad;
            const y = Math.sin(dLng) * Math.cos(newLat * rad);
            const x =
              Math.cos(prevPosRef.current[0] * rad) * Math.sin(newLat * rad) -
              Math.sin(prevPosRef.current[0] * rad) * Math.cos(newLat * rad) * Math.cos(dLng);
            const calcBearing = (Math.atan2(y, x) * 180) / Math.PI;
            const normalized = (calcBearing + 360) % 360;
            setHeading((prev) => prev + getShortestAngleDelta(prev, normalized));
          }
        }

        prevPosRef.current = [newLat, newLng];
        setUserPos([newLat, newLng]);
      },
      (err) => {
        console.warn('[GoogleMapsNav] Geolocation watch warning:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  // Smooth position lerp frame loop (60fps continuous marker & camera animation)
  useEffect(() => {
    let animFrame: number;
    const lerp = () => {
      setRenderedPos((prev) => {
        const dLat = userPos[0] - prev[0];
        const dLng = userPos[1] - prev[1];
        if (Math.abs(dLat) < 0.000001 && Math.abs(dLng) < 0.000001) {
          return userPos;
        }
        return [prev[0] + dLat * 0.25, prev[1] + dLng * 0.25];
      });
      animFrame = requestAnimationFrame(lerp);
    };
    animFrame = requestAnimationFrame(lerp);
    return () => cancelAnimationFrame(animFrame);
  }, [userPos]);

  // Fetch OSRM Route & Road Name dynamically
  const prevRoutePosRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    const loadRoute = async () => {
      if (prevRoutePosRef.current) {
        const moveDist = calculateHaversineDistance(
          prevRoutePosRef.current[0],
          prevRoutePosRef.current[1],
          userPos[0],
          userPos[1]
        );
        if (moveDist < 10 && routePolyline.length > 0) return;
      }

      prevRoutePosRef.current = userPos;
      setLoadingRoute(true);

      const route = await fetchOSRMRoute(userPos, destinationCoords);
      setRoutePolyline(route.coordinates);
      setDistanceMeters(route.distanceMeters);
      setDurationSeconds(route.durationSeconds);
      setLoadingRoute(false);

      // Check arrival (within ~30 meters of destination)
      const directDist = calculateHaversineDistance(
        userPos[0],
        userPos[1],
        destinationCoords[0],
        destinationCoords[1]
      );

      if ((route.distanceMeters > 0 && route.distanceMeters <= 30) || directDist <= 30) {
        setHasArrived(true);
        if (onArrival) onArrival();
      }

      // Reverse geocode current road if missing
      if (!currentRoad && userPos[0] && userPos[1]) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${userPos[0]}&lon=${userPos[1]}`,
            { headers: { 'User-Agent': 'RescueLink/1.0' } }
          );
          if (res.ok) {
            const data = await res.json();
            const road =
              data.address?.road ||
              data.address?.suburb ||
              data.address?.neighbourhood ||
              'Main Route';
            setCurrentRoad(road);
          }
        } catch {
          setCurrentRoad('Main Route');
        }
      }
    };

    loadRoute();
  }, [userPos, destinationCoords, routePolyline.length, currentRoad, onArrival]);

  const handleRecenter = () => {
    setIsFollowing(true);
    setIsHeadingUp(true);
    setIsNavModeActive(true);
    setRecenterTrigger((prev) => prev + 1);
  };

  // Toggle Navigation Mode (ON: Camera Follow + Auto Rotate, OFF: Static North-Up Manual Map)
  const handleToggleNavMode = () => {
    if (isNavModeActive) {
      setIsNavModeActive(false);
      setIsFollowing(false);
      setIsHeadingUp(false);
    } else {
      setIsNavModeActive(true);
      setIsFollowing(true);
      setIsHeadingUp(true);
      setRecenterTrigger((prev) => prev + 1);
    }
  };

  const getArrivalTimeString = (secs: number) => {
    const now = new Date();
    const arrival = new Date(now.getTime() + secs * 1000);
    return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  return (
    <div className="relative w-full h-full min-h-screen overflow-hidden flex flex-col select-none font-sans bg-slate-100">
      {/* ========================================================================= */}
      {/* ARRIVAL NOTIFICATION MODAL BANNER */}
      {/* ========================================================================= */}
      {hasArrived && (
        <div className="absolute top-4 left-4 right-4 z-[600] bg-emerald-900/95 backdrop-blur-xl text-white p-4.5 rounded-3xl shadow-2xl border border-emerald-500/60 flex items-center justify-between animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[3]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                ✅ You have arrived at the hospital.
              </h3>
              <p className="text-xs text-emerald-200 font-medium">{destinationName}</p>
            </div>
          </div>
          <button
            onClick={() => setHasArrived(false)}
            className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-md transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MATERIAL DESIGN 3 TOP FLOATING NAVIGATION CARD */}
      {/* ========================================================================= */}
      <div className="absolute top-3 left-3 right-3 z-[500] bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-4 shadow-2xl border border-slate-700/60 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-slate-950 flex items-center justify-center font-black shadow-lg shrink-0">
              {destinationType === 'hospital' ? (
                <HospitalIcon className="w-6 h-6 stroke-[2.5]" />
              ) : (
                <NavigationIcon className="w-6 h-6 stroke-[2.5]" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                🏥 Destination Hospital
              </span>
              <h2 className="text-base font-black text-white truncate leading-tight">
                {destinationName}
              </h2>
              <p className="text-xs text-slate-300 truncate font-medium flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">
                  {currentRoad ? `On ${currentRoad}` : destinationAddress}
                </span>
              </p>
            </div>
          </div>

          <div className="text-right shrink-0 pl-3 border-l border-slate-700/60">
            <div className="flex items-center justify-end gap-1 text-emerald-400">
              <span className="text-xs">📏</span>
              <span className="text-base font-black">{formatDistance(distanceMeters)}</span>
            </div>
            <div className="flex items-center justify-end gap-1 text-slate-300 text-[11px] font-bold">
              <span>⏱</span>
              <span>{loadingRoute ? '...' : formatETA(durationSeconds)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. FULL-SCREEN HEADING-UP MAP CANVAS (OVERSIZED TO PREVENT BLACK CORNERS) */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-100">
        <div
          className="w-[160%] h-[160%] -top-[30%] -left-[30%] absolute transition-transform duration-500 ease-out origin-center"
          style={{
            transform: isHeadingUp ? `rotate(-${Math.round(heading)}deg)` : 'none',
          }}
        >
          <MapContainer
            center={renderedPos}
            zoom={16}
            zoomControl={false}
            scrollWheelZoom={true}
            className="w-full h-full"
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <NavigationMapController
              userCoords={renderedPos}
              heading={heading}
              isFollowing={isFollowing}
              isHeadingUp={isHeadingUp}
              isMoving={isMoving}
              onManualDrag={() => {
                setIsFollowing(false);
              }}
              recenterTrigger={recenterTrigger}
            />

            {/* OSRM Navigation Route Line */}
            {routePolyline.length > 0 && (
              <>
                <Polyline
                  positions={routePolyline}
                  pathOptions={{ color: '#2563eb', weight: 10, opacity: 0.4, lineCap: 'round' }}
                />
                <Polyline
                  positions={routePolyline}
                  pathOptions={{ color: '#3b82f6', weight: 6, opacity: 0.95, lineCap: 'round' }}
                />
              </>
            )}

            {/* User Navigation Chevron Marker */}
            <Marker position={renderedPos} icon={createNavigationUserIcon(heading, isHeadingUp)}>
              <Popup>
                <div className="p-1 text-xs font-sans">
                  <strong className="text-blue-600 block font-bold uppercase">
                    Your Live Location
                  </strong>
                  <span>Speed: {isMoving ? 'Moving' : 'Stationary'}</span>
                </div>
              </Popup>
            </Marker>

            {/* Destination Target Marker */}
            <Marker position={destinationCoords} icon={createDestinationIcon(destinationType)}>
              <Popup>
                <div className="p-1 text-xs font-sans">
                  <strong className="text-red-600 block font-bold uppercase">{destinationName}</strong>
                  <span>{destinationAddress}</span>
                </div>
              </Popup>
            </Marker>
          </MapContainer>
        </div>

        {/* ========================================================================= */}
        {/* 3. FLOATING MAP OVERLAY CONTROLS (NAVIGATION MODE TOGGLE) */}
        {/* ========================================================================= */}
        <div className="absolute right-4 top-28 z-[500] flex flex-col gap-3">
          {/* Navigation Mode Toggle Button (ON: Follow + Auto-Rotate, OFF: Static North-Up) */}
          <button
            onClick={handleToggleNavMode}
            className={`p-3.5 rounded-2xl shadow-2xl border transition-all active:scale-95 flex items-center justify-center ${
              isNavModeActive
                ? 'bg-blue-600 text-white border-blue-400 ring-4 ring-blue-500/30'
                : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-900'
            }`}
            title={isNavModeActive ? 'Navigation Mode ON (Follow + Auto Rotate Active)' : 'Navigation Mode OFF (Static Map View)'}
          >
            <Compass
              className="w-6 h-6 transition-transform duration-500"
              style={{ transform: isHeadingUp ? `rotate(${Math.round(heading)}deg)` : 'none' }}
            />
          </button>
        </div>

        {/* Floating 📍 Recenter Button (Always visible above bottom card when user manually drags map) */}
        {!isFollowing && (
          <button
            onClick={handleRecenter}
            className="absolute bottom-36 right-4 z-[500] bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-3 rounded-2xl shadow-2xl border border-blue-400 flex items-center gap-2 transition-all active:scale-95 animate-in fade-in zoom-in-95 duration-200"
            aria-label="Recenter navigation camera"
          >
            <span className="text-base">📍</span>
            <span>Recenter</span>
          </button>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. MATERIAL DESIGN 3 BOTTOM FLOATING NAVIGATION DASHBOARD CARD */}
      {/* ========================================================================= */}
      <div className="absolute bottom-3 left-3 right-3 z-[500] bg-white/95 backdrop-blur-xl text-slate-900 rounded-3xl p-4 shadow-2xl border border-slate-200/80 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between gap-3">
          {/* Arrival Metrics */}
          <div className="min-w-0 flex-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                <Ambulance className="w-4 h-4 text-emerald-600" />
                <span>🚑 {navigationStatus}</span>
              </span>
            </div>

            <div className="flex items-baseline gap-2 pt-0.5">
              <span className="text-xl font-black text-slate-900">
                {loadingRoute ? '...' : formatETA(durationSeconds)}
              </span>
              <span className="text-xs font-extrabold text-slate-500">
                • {formatDistance(distanceMeters)}
              </span>
            </div>

            <p className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Estimated Arrival around {getArrivalTimeString(durationSeconds)}</span>
            </p>
          </div>

          {/* Stop Navigation Action Button */}
          <button
            onClick={onStopNavigation}
            className="px-5 py-3.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2 shrink-0 border border-red-500"
          >
            <Square className="w-4 h-4 fill-white" />
            <span>Stop Navigation</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsNavigationMode;
