import React, { useEffect, useState, useRef } from 'react';
import type { Hospital } from '../../utils/routing';
import { fetchNearbyHospitalsOverpass, formatETA, fetchOSRMRoute } from '../../utils/routing';
import { formatDistance } from '../../utils/distance';
import { fetchGoogleRoute } from '../../services/googleRoutes';
import { Hospital as HospitalIcon, MapPin, Clock, X, Navigation, ShieldCheck, Star, Loader2 } from 'lucide-react';

import { SpinnerLoader, EmptyState, HospitalSkeleton } from './SkeletonLoader';

export interface HospitalSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  accidentLatitude: number;
  accidentLongitude: number;
  onSelectHospital: (hospital: Hospital) => void;
}

// Per-hospital route result (driving distance + duration from fetchGoogleRoute)
interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  failed: boolean;
}

export const HospitalSelectorSheet: React.FC<HospitalSelectorSheetProps> = ({
  isOpen,
  onClose,
  accidentLatitude,
  accidentLongitude,
  onSelectHospital,
}) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Map of hospitalId → RouteInfo. undefined = still calculating, null entry = not yet started.
  const [routeMap, setRouteMap] = useState<Map<string, RouteInfo>>(new Map());
  const routeFetchedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    routeFetchedRef.current = new Set();
    setRouteMap(new Map());
    setLocationError(null);

    async function loadHospitals() {
      setLoading(true);
      const list = await fetchNearbyHospitalsOverpass(accidentLatitude, accidentLongitude);
      if (!isMounted) return;
      setHospitals(list);
      setLoading(false);

      if (!('geolocation' in navigator)) {
        if (isMounted) setLocationError('Location unavailable');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (!isMounted) return;
          const vLat = pos.coords.latitude;
          const vLng = pos.coords.longitude;

          // Fetch real driving route for each hospital from the volunteer's current location
          list.forEach(async (hosp) => {
            if (routeFetchedRef.current.has(hosp.id)) return;
            routeFetchedRef.current.add(hosp.id);

            // 1. Primary: Google Routes API
            const googleRes = await fetchGoogleRoute(
              { lat: vLat, lng: vLng },
              { lat: hosp.latitude, lng: hosp.longitude }
            );

            if (!isMounted) return;

            if (!googleRes.error && googleRes.distanceMeters > 0) {
              setRouteMap((prev) => new Map(prev).set(hosp.id, {
                distanceMeters: googleRes.distanceMeters,
                durationSeconds: googleRes.durationSeconds,
                failed: false,
              }));
              return;
            }

            // 2. Fallback: OSRM
            try {
              const osrmRes = await fetchOSRMRoute(
                [vLat, vLng],
                [hosp.latitude, hosp.longitude]
              );
              if (!isMounted) return;
              if (osrmRes.distanceMeters > 0) {
                setRouteMap((prev) => new Map(prev).set(hosp.id, {
                  distanceMeters: osrmRes.distanceMeters,
                  durationSeconds: osrmRes.durationSeconds,
                  failed: false,
                }));
                return;
              }
            } catch {
              // fall through to failed state
            }

            if (!isMounted) return;
            // Route unavailable
            setRouteMap((prev) => new Map(prev).set(hosp.id, {
              distanceMeters: 0,
              durationSeconds: 0,
              failed: true,
            }));
          });
        },
        (err) => {
          console.warn('[HospitalSelectorSheet] GPS error:', err.message);
          if (isMounted) setLocationError('Location unavailable');
        },
        { enableHighAccuracy: true }
      );
    }

    loadHospitals();

    return () => {
      isMounted = false;
    };
  }, [isOpen, accidentLatitude, accidentLongitude]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[1000] flex justify-center pointer-events-none p-0">
      {/* Bottom Sheet Container (Occupies ~75% of screen height, leaving map visible in top ~25%) */}
      <div className="w-full max-w-md bg-white border-t border-x sm:border border-slate-200/80 rounded-t-3xl sm:rounded-t-3xl shadow-2xl overflow-hidden flex flex-col h-[75vh] max-h-[75vh] pointer-events-auto animate-in slide-in-from-bottom duration-300 pb-[env(safe-area-inset-bottom,0px)]">
        
        {/* Drag Handle */}
        <div className="pt-2.5 pb-1 flex justify-center shrink-0 cursor-grab">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
        </div>

        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-rose-50/40 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-red-800 text-white flex items-center justify-center shadow-xs">
              <HospitalIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-slate-900">Select Destination Hospital</h2>
              <p className="text-[11px] text-slate-500 font-medium">Nearby medical &amp; trauma centers sorted by distance</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
            aria-label="Close hospital selector sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="space-y-3">
              <SpinnerLoader message="Loading nearby hospitals..." />
              <HospitalSkeleton />
              <HospitalSkeleton />
              <HospitalSkeleton />
            </div>
          ) : hospitals.length === 0 ? (
            <EmptyState
              icon={HospitalIcon}
              title="No nearby hospitals found."
              description="Could not locate nearby emergency hospitals within 5 km radius of the accident location."
              actionText="Retry"
              onAction={() => {
                setLoading(true);
                fetchNearbyHospitalsOverpass(accidentLatitude, accidentLongitude).then((list) => {
                  setHospitals(list);
                  setLoading(false);
                });
              }}
            />
          ) : (
            hospitals.map((hosp) => {
              const routeInfo = routeMap.get(hosp.id);
              const isCalculating = routeInfo === undefined;
              const isSelected = selectedId === hosp.id;

              return (
                <div
                  key={hosp.id}
                  onClick={() => {
                    setSelectedId(hosp.id);
                    onSelectHospital(hosp);
                  }}
                  className={`p-3.5 rounded-2xl border transition-all space-y-3 animate-card-enter cursor-pointer ${
                    isSelected
                      ? 'bg-rose-50/50 border-red-700 ring-2 ring-red-700/20 shadow-xs'
                      : 'bg-white border-slate-200/80 hover:border-red-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <Star className="w-3 h-3 fill-amber-400 text-amber-500" />
                          4.8 ★
                        </span>
                        <span className="text-[10px] font-extrabold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          Emergency Ready
                        </span>
                        {hosp.bedsAvailable > 0 && (
                          <span className="text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                            {hosp.bedsAvailable} Beds Available
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-slate-900 truncate">{hosp.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-red-700 shrink-0" />
                        <span className="truncate">{hosp.address}</span>
                      </p>
                    </div>

                    {/* Distance + ETA — from real driving route, same as Navigation screen */}
                    <div className="text-right shrink-0 min-w-[72px]">
                      {locationError ? (
                        <span className="text-[11px] font-bold text-slate-400 block">{locationError}</span>
                      ) : isCalculating ? (
                        <span className="text-[11px] font-bold text-slate-400 flex items-center justify-end gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Calculating...
                        </span>
                      ) : routeInfo!.failed ? (
                        <span className="text-[11px] font-bold text-slate-400 block">Route unavailable</span>
                      ) : (
                        <>
                          <span className="text-sm font-extrabold text-red-800 block">
                            {formatDistance(routeInfo!.distanceMeters)}
                          </span>
                          <span className="text-[11px] font-bold text-slate-500 flex items-center justify-end gap-1">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {formatETA(routeInfo!.durationSeconds)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end pt-2.5 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setSelectedId(hosp.id);
                        onSelectHospital(hosp);
                      }}
                      className="px-4 py-2 bg-red-800 hover:bg-red-900 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Select Hospital</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

