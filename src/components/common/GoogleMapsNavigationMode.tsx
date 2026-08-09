import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Clock,
  CheckCircle2,
  Hospital as HospitalIcon,
  Navigation as NavigationIcon,
  Loader2,
  Ambulance,
  ArrowLeft,
  AlertCircle,
  Compass,
  LocateFixed,
  PhoneCall,
  Phone,
} from 'lucide-react';
import { fetchOSRMRoute, formatETA } from '../../utils/routing';
import { formatDistance, calculateHaversineDistance } from '../../utils/distance';
import { GoogleMap } from '../maps/GoogleMap';
import { fetchGoogleRoute } from '../../services/googleRoutes';
import { supabase } from '../../lib/supabase';

// Fixed Navigation Zoom Level (Google Maps Navigation standard between 17 and 18)
const DEFAULT_FIXED_ZOOM = 17.5;

export interface GoogleMapsNavigationModeProps {
  destinationName: string;
  destinationAddress: string;
  destinationCoords: [number, number];
  destinationType?: 'accident' | 'hospital' | 'location';
  initialUserCoords?: [number, number] | null;
  accidentId?: string;
  navigationStatus?: string;
  ambulancePhone?: string;
  hospitalPhone?: string;
  onArrival?: () => void;
  onBackToHospitalSelect?: () => void;
}

export const GoogleMapsNavigationMode: React.FC<GoogleMapsNavigationModeProps> = ({
  destinationName,
  destinationAddress,
  destinationCoords,
  destinationType = 'accident',
  initialUserCoords,
  accidentId,
  navigationStatus = 'En Route to Scene',
  ambulancePhone,
  hospitalPhone,
  onArrival,
  onBackToHospitalSelect,
}) => {
  const navigate = useNavigate();

  const [hospitalEnRoute, setHospitalEnRoute] = useState(false);
  const [resolvedHospitalPhone, setResolvedHospitalPhone] = useState<string | null>(
    hospitalPhone && hospitalPhone.trim().length > 0 ? hospitalPhone.trim() : null
  );

  useEffect(() => {
    if (hospitalPhone && hospitalPhone.trim().length > 0) {
      setResolvedHospitalPhone(hospitalPhone.trim());
      return;
    }

    if (destinationType !== 'hospital') return;

    let isMounted = true;
    if (window.google && window.google.maps && window.google.maps.places) {
      try {
        const dummyElement = document.createElement('div');
        const service = new google.maps.places.PlacesService(dummyElement);
        const request: google.maps.places.TextSearchRequest = {
          location: new google.maps.LatLng(destinationCoords[0], destinationCoords[1]),
          radius: 2000,
          query: destinationName,
        };

        service.textSearch(request, (results, status) => {
          if (!isMounted) return;
          if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0] && results[0].place_id) {
            service.getDetails(
              { placeId: results[0].place_id, fields: ['formatted_phone_number', 'international_phone_number'] },
              (place, detailStatus) => {
                if (!isMounted) return;
                if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                  const phone = (place.formatted_phone_number || place.international_phone_number || '').trim();
                  if (phone.length > 0) {
                    setResolvedHospitalPhone(phone);
                  }
                }
              }
            );
          }
        });
      } catch (err) {
        console.warn('Google Places phone lookup error:', err);
      }
    }

    return () => {
      isMounted = false;
    };
  }, [destinationType, destinationName, destinationCoords, hospitalPhone]);

  // 1. User Position State (Real GPS Coordinates)
  const [userPos, setUserPos] = useState<[number, number] | null>(() => {
    if (initialUserCoords && initialUserCoords[0] && initialUserCoords[1]) {
      return [initialUserCoords[0], initialUserCoords[1]];
    }
    return null;
  });

  const [renderedPos, setRenderedPos] = useState<[number, number] | null>(userPos);

  // 2. Camera Navigation Mode (Auto Follow + Auto Rotate) & Camera State
  const [isNavigationMode, setIsNavigationMode] = useState<boolean>(false);
  const [isFollowing, setIsFollowing] = useState<boolean>(true);
  const [heading, setHeading] = useState<number>(0);
  const [showLeaveConfirmDialog, setShowLeaveConfirmDialog] = useState<boolean>(false);
  const [zoomSignal, setZoomSignal] = useState<{ type: 'in' | 'out'; timestamp: number } | null>(null);

  const handleBackNavigation = () => {
    if (destinationType === 'hospital' && onBackToHospitalSelect) {
      onBackToHospitalSelect();
    } else {
      setShowLeaveConfirmDialog(true);
    }
  };

  // Arrival & Center Refs
  const firstGpsPosRef = useRef<[number, number] | null>(null);
  const hasReceivedGpsUpdateRef = useRef<boolean>(false);
  const hasUserMovedRef = useRef<boolean>(false);

  // 3. Route & Navigation Metrics
  const [polylineString, setPolylineString] = useState<string>('');
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [currentRoad, setCurrentRoad] = useState<string>('');
  const [loadingRoute, setLoadingRoute] = useState<boolean>(true);

  const prevPosRef = useRef<[number, number] | null>(null);

  // Real GPS Geolocation Watcher (Immediate initial location + continuous watch)
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    // Request immediate real GPS position on mount
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const initialLat = pos.coords.latitude;
        const initialLng = pos.coords.longitude;
        setUserPos([initialLat, initialLng]);
        firstGpsPosRef.current = [initialLat, initialLng];
        hasReceivedGpsUpdateRef.current = true;
      },
      (err) => {
        console.warn('[GoogleMapsNav] Initial GPS error:', err.message);
      },
      { enableHighAccuracy: true }
    );

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;

        if (!firstGpsPosRef.current) {
          firstGpsPosRef.current = [newLat, newLng];
          hasReceivedGpsUpdateRef.current = true;
        } else {
          const distFromStart = calculateHaversineDistance(
            firstGpsPosRef.current[0],
            firstGpsPosRef.current[1],
            newLat,
            newLng
          );
          if (distFromStart > 10) {
            hasUserMovedRef.current = true;
          }
        }

        if (prevPosRef.current && (prevPosRef.current[0] !== newLat || prevPosRef.current[1] !== newLng)) {
          const dLat = newLat - prevPosRef.current[0];
          const dLng = newLng - prevPosRef.current[1];
          if (Math.abs(dLat) > 0.00001 || Math.abs(dLng) > 0.00001) {
            const angle = (Math.atan2(dLng, dLat) * 180) / Math.PI;
            setHeading((angle + 360) % 360);
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

  // Smooth position linear interpolation (lerp) loop for 60fps marker movement
  useEffect(() => {
    if (!userPos) return;
    let animFrame: number;
    let startTime: number | null = null;
    const DURATION = 900; // 900ms smooth gliding transition between GPS updates

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / DURATION, 1);
      // Smooth ease-out quad curve
      const easeProgress = 1 - (1 - progress) * (1 - progress);

      setRenderedPos((prev) => {
        if (!prev) return userPos;
        const lat = prev[0] + (userPos[0] - prev[0]) * easeProgress;
        const lng = prev[1] + (userPos[1] - prev[1]) * easeProgress;
        return [lat, lng];
      });

      if (progress < 1) {
        animFrame = requestAnimationFrame(animate);
      }
    };

    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [userPos]);

  // Reset route state completely whenever destinationCoords changes
  const prevDestinationRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (
      !prevDestinationRef.current ||
      prevDestinationRef.current[0] !== destinationCoords[0] ||
      prevDestinationRef.current[1] !== destinationCoords[1]
    ) {
      prevDestinationRef.current = destinationCoords;
      prevRoutePosRef.current = null;
      setPolylineString('');
      setDistanceMeters(0);
      setDurationSeconds(0);
    }
  }, [destinationCoords]);

  // Fetch Route & Road Name dynamically
  const prevRoutePosRef = useRef<[number, number] | null>(null);

  useEffect(() => {
    if (!userPos) return;

    const loadRoute = async () => {
      const isSameDest =
        prevDestinationRef.current &&
        prevDestinationRef.current[0] === destinationCoords[0] &&
        prevDestinationRef.current[1] === destinationCoords[1];

      if (isSameDest && prevRoutePosRef.current) {
        const moveDist = calculateHaversineDistance(
          prevRoutePosRef.current[0],
          prevRoutePosRef.current[1],
          userPos[0],
          userPos[1]
        );
        if (moveDist < 10 && distanceMeters > 0) return;
      }

      prevRoutePosRef.current = userPos;
      prevDestinationRef.current = destinationCoords;
      setLoadingRoute(true);

      const googleRoute = await fetchGoogleRoute(
        { lat: userPos[0], lng: userPos[1] },
        { lat: destinationCoords[0], lng: destinationCoords[1] }
      );

      if (!googleRoute.error && googleRoute.polyline) {
        setPolylineString(googleRoute.polyline);
        setDistanceMeters(googleRoute.distanceMeters);
        setDurationSeconds(googleRoute.durationSeconds);
      } else {
        const route = await fetchOSRMRoute(userPos, destinationCoords);
        setDistanceMeters(route.distanceMeters);
        setDurationSeconds(route.durationSeconds);
      }
      setLoadingRoute(false);

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
  }, [userPos, destinationCoords, distanceMeters, currentRoad]);

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const autoRestoreTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleUserDrag = () => {
    setIsFollowing(false);

    if (autoRestoreTimerRef.current) {
      clearTimeout(autoRestoreTimerRef.current);
    }

    if (isNavigationMode) {
      autoRestoreTimerRef.current = setTimeout(() => {
        setIsFollowing(true);
      }, 2500);
    }
  };

  useEffect(() => {
    return () => {
      if (autoRestoreTimerRef.current) {
        clearTimeout(autoRestoreTimerRef.current);
      }
    };
  }, []);

  const handleRecenter = () => {
    if (!userPos || !renderedPos) {
      setToastMessage('Current location unavailable.');
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    if (autoRestoreTimerRef.current) {
      clearTimeout(autoRestoreTimerRef.current);
    }

    setRecenterTrigger(Date.now());
    setIsFollowing(true);
  };

  const handleCallAmbulance = () => {
    const targetPhone = ambulancePhone || '108';
    window.location.href = `tel:${targetPhone}`;
  };

  const handleCallHospital = () => {
    if (resolvedHospitalPhone && resolvedHospitalPhone.trim().length > 0) {
      window.location.href = `tel:${resolvedHospitalPhone.trim()}`;
    } else {
      setToastMessage('Hospital phone number unavailable.');
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const getArrivalTimeString = (secs: number) => {
    const now = new Date();
    const arrival = new Date(now.getTime() + secs * 1000);
    return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  if (!userPos || !renderedPos) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center select-none">
        <Loader2 className="w-9 h-9 text-emerald-400 animate-spin mb-3" />
        <h3 className="text-sm font-black text-white">Acquiring Live Responder GPS Location...</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
          Connecting to device GPS positioning. Please ensure location services are enabled.
        </p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden flex flex-col select-none touch-none bg-slate-100">
      {/* TOAST NOTIFICATION POPUP */}
      {toastMessage && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[800] bg-slate-900/95 text-white px-4 py-2.5 rounded-full shadow-2xl border border-slate-700 text-xs font-bold flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ROUTE CALCULATION OVERLAY INDICATOR */}
      {loadingRoute && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-[600] bg-slate-900/90 text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg border border-slate-700/80 flex items-center gap-2 animate-in fade-in zoom-in-95 duration-200">
          <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
          <span>Calculating route...</span>
        </div>
      )}

      {/* LEAVE NAVIGATION CONFIRMATION DIALOG MODAL */}
      {showLeaveConfirmDialog && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl border border-slate-200 text-slate-900 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <AlertCircle className="w-6 h-6 text-amber-700" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900">
                Leave Navigation?
              </h3>
            </div>

            <p className="text-xs font-semibold text-slate-600 leading-relaxed">
              Are you sure you want to leave navigation?
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLeaveConfirmDialog(false)}
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-xl border border-slate-200 transition-all active:scale-95"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLeaveConfirmDialog(false);
                  navigate('/volunteer', { replace: true });
                }}
                className="w-full py-3 bg-red-700 hover:bg-red-800 text-white font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95"
              >
                Leave
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. MATERIAL DESIGN 3 TOP FLOATING NAVIGATION CARD */}
      <div className="absolute top-3 left-3 right-3 z-[500] bg-slate-900/95 backdrop-blur-xl text-white rounded-3xl p-4 shadow-2xl border border-slate-700/60 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-center justify-between gap-3">
          {/* Back App Bar Button (Min 44x44px touch target) */}
          <button
            type="button"
            onClick={handleBackNavigation}
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shrink-0 transition-all active:scale-95 border border-slate-700 shadow-sm"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

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
                {destinationType === 'hospital' ? '🏥 Hospital Navigation' : '🚨 Live Scene Navigation'}
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
              {destinationType === 'hospital' && (
                <p className="text-[11px] text-emerald-300 font-bold flex items-center gap-1 mt-0.5">
                  <span>☎ Phone:</span>
                  <span className="font-extrabold text-white">
                    {resolvedHospitalPhone || 'Unavailable'}
                  </span>
                </p>
              )}
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

      {/* 2. FULL-SCREEN GOOGLE MAP CANVAS */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-100">
        {/* RIGHT SIDE FLOATING CAMERA & MAP CONTROLS STACK (Top to Bottom: Zoom Controls -> Re-center -> Navigation Mode) */}
        <div className="absolute bottom-[calc(8.5rem+env(safe-area-inset-bottom,0px))] right-4 sm:right-6 z-[600] flex flex-col items-end gap-4 pointer-events-auto select-none">
          {/* 1. Zoom Controls (+ / -) */}
          <div className="flex flex-col rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden bg-white/95 backdrop-blur-md shrink-0">
            <button
              type="button"
              onClick={() => {
                setZoomSignal({ type: 'in', timestamp: Date.now() });
                if (isNavigationMode) handleUserDrag();
              }}
              className="w-11 h-11 hover:bg-slate-100 text-slate-900 font-black text-xl flex items-center justify-center transition-colors active:scale-95 border-b border-slate-100 shrink-0"
              aria-label="Zoom in map"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => {
                setZoomSignal({ type: 'out', timestamp: Date.now() });
                if (isNavigationMode) handleUserDrag();
              }}
              className="w-11 h-11 hover:bg-slate-100 text-slate-900 font-black text-xl flex items-center justify-center transition-colors active:scale-95 shrink-0"
              aria-label="Zoom out map"
            >
              −
            </button>
          </div>

          {/* 2. Re-center FAB Button (When camera is un-followed) */}
          {!isFollowing && (
            <button
              type="button"
              onClick={handleRecenter}
              className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl border border-blue-400/90 flex items-center justify-center transition-all active:scale-95 animate-in fade-in zoom-in-95 duration-200 shrink-0"
              aria-label="Re-center camera on volunteer"
              title="Re-center camera on volunteer"
            >
              <LocateFixed className="w-5 h-5 text-white stroke-[2.5]" />
            </button>
          )}

          {/* 3. Compact Circular Navigation Mode Toggle FAB */}
          <button
            type="button"
            onClick={() => {
              const nextMode = !isNavigationMode;
              setIsNavigationMode(nextMode);
              if (nextMode) {
                setIsFollowing(true);
              }
              setToastMessage(nextMode ? 'Navigation Mode ON' : 'Navigation Mode OFF');
              setTimeout(() => setToastMessage(null), 2000);
            }}
            className={`w-12 h-12 rounded-full shadow-2xl flex items-center justify-center transition-all active:scale-95 border shrink-0 ${
              isNavigationMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-400 ring-2 ring-emerald-400/30'
                : 'bg-white/95 hover:bg-white text-slate-700 border-slate-200 shadow-xl'
            }`}
            aria-label={`Navigation Mode: ${isNavigationMode ? 'ON' : 'OFF'}`}
            title={`Navigation Mode: ${isNavigationMode ? 'ON' : 'OFF'}`}
          >
            <Compass className={`w-5 h-5 stroke-[2.2] ${isNavigationMode ? 'animate-spin text-white' : 'text-slate-700'}`} />
          </button>
        </div>

        <GoogleMap
          center={{ lat: renderedPos[0], lng: renderedPos[1] }}
          zoom={DEFAULT_FIXED_ZOOM}
          markers={[
            {
              id: 'user-nav-location',
              lat: renderedPos[0],
              lng: renderedPos[1],
              title: 'Your Live Location',
              type: 'volunteer' as const,
            },
            {
              id: 'destination-target-location',
              lat: destinationCoords[0],
              lng: destinationCoords[1],
              title: destinationName,
              type: destinationType === 'hospital' ? ('hospital' as const) : ('accident' as const),
            },
          ]}
          polylineString={polylineString}
          heading={heading}
          isNavigationMode={isNavigationMode}
          isFollowing={isFollowing}
          onUserDrag={handleUserDrag}
          zoomSignal={zoomSignal}
          recenterTrigger={recenterTrigger}
          className="w-full h-full"
        />

        {/* QUICK EMERGENCY CALL ACTION BUTTONS (Above Bottom Action Bar) */}
        <div className={`absolute bottom-[calc(9.2rem+env(safe-area-inset-bottom,0px))] left-4 z-[550] pointer-events-auto flex flex-col gap-2.5 ${destinationType === 'hospital' ? 'md:flex-row md:items-center' : ''} w-[calc(100vw-8rem)] md:w-auto`}>
          {/* 1. Call Ambulance Button */}
          <button
            type="button"
            onClick={handleCallAmbulance}
            className="w-full md:w-auto px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-2xl shadow-2xl border border-rose-400 flex items-center justify-center gap-2 transition-all active:scale-95"
            aria-label="Call Ambulance"
            title="Call Ambulance"
          >
            <PhoneCall className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
            <span>Call Ambulance</span>
          </button>

          {/* 2. Call Hospital Button (Hospital Navigation Screen only) */}
          {destinationType === 'hospital' && (
            <button
              type="button"
              onClick={handleCallHospital}
              className="w-full md:w-auto px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-2xl border border-blue-400 flex items-center justify-center gap-2 transition-all active:scale-95"
              aria-label="Call Hospital"
              title="Call Hospital"
            >
              <Phone className="w-4 h-4 text-white stroke-[2.5] shrink-0" />
              <span>Call Hospital</span>
            </button>
          )}
        </div>
      </div>

      {/* 3. MATERIAL DESIGN 3 BOTTOM FLOATING NAVIGATION DASHBOARD CARD */}
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

          {/* Always Visible Primary Action Button: Reached Accident or Reached Hospital */}
          {/* TESTING MODE / MANUAL PROGRESSION: Volunteer can manually confirm arrival without physical GPS location validation */}
          {destinationType === 'accident' ? (
            <button
              type="button"
              onClick={() => {
                // Manual confirmation: Immediately triggers scene arrival & hospital selection without GPS distance gate
                if (onArrival) onArrival();
              }}
              className="px-5 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2 shrink-0 border border-emerald-500"
            >
              <CheckCircle2 className="w-4 h-4 text-white stroke-[3]" />
              <span>Reached Accident</span>
            </button>
          ) : !hospitalEnRoute ? (
            <button
              type="button"
              onClick={() => {
                setHospitalEnRoute(true);
                if (accidentId && accidentId !== 'default-accident') {
                  console.log('[RescueLink Nav] Volunteer clicked En Route to Hospital. Updating status to Transporting to Hospital...');
                  supabase
                    .from('accidents')
                    .update({
                      status: 'Transporting to Hospital',
                      transported_at: new Date().toISOString(),
                    })
                    .eq('id', accidentId)
                    .then(({ data, error }) => {
                      if (error) {
                        console.error('[RescueLink Nav] Error updating status to Transporting to Hospital:', error);
                      } else {
                        console.log('[RescueLink Nav] Successfully updated status to Transporting to Hospital:', data);
                      }
                    });
                }
              }}
              className="px-5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2 shrink-0 border border-blue-500"
            >
              <Ambulance className="w-4 h-4 text-white stroke-[2.5]" />
              <span>En Route to Hospital</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (onArrival) onArrival();
              }}
              className="px-5 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-2xl shadow-xl transition-all active:scale-95 flex items-center gap-2 shrink-0 border border-indigo-500"
            >
              <HospitalIcon className="w-4 h-4 text-white stroke-[2.5]" />
              <span>Reached Hospital</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleMapsNavigationMode;
