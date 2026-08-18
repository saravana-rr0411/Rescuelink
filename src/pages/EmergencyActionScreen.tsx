import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Ambulance,
  Hospital as HospitalIcon,
  Bandage,
  Share2,
  ShieldAlert,
  Flame,
  PhoneCall,
  ChevronRight,
  MapPin,
  Star,
  Navigation,
  Loader2,
  Clock,
} from 'lucide-react';
import type { Hospital } from '../utils/routing';
import { formatETA, fetchOSRMRoute } from '../utils/routing';
import { fetchNearbyHospitals } from '../services/googlePlaces';
import { formatDistance } from '../utils/distance';
import { fetchGoogleRoute } from '../services/googleRoutes';
import { GoogleMapsNavigationMode } from '../components/common/GoogleMapsNavigationMode';
import { useNetworkSync } from '../hooks/useNetworkSync';
import { calculateHaversineDistance, calculateBearing } from '../utils/offlineDistance';
import { useTranslation } from 'react-i18next';

interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
  failed: boolean;
}

export const EmergencyActionScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isOnline } = useNetworkSync();
  const { t } = useTranslation();

  // Mode: 'actions' | 'hospitals' | 'navigation'
  const [viewMode, setViewMode] = useState<'actions' | 'hospitals' | 'navigation'>('actions');

  // User GPS coordinates state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hospital state
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  // Route state (matching Volunteer Hospital Selector)
  const [routeMap, setRouteMap] = useState<Record<string, RouteInfo>>({});
  const routeFetchedRef = useRef<Set<string>>(new Set());

  // Calculate routes whenever hospitals or userLocation changes
  useEffect(() => {
    if (viewMode !== 'hospitals' || hospitals.length === 0 || !userLocation) return;

    let isMounted = true;
    const { lat, lng } = userLocation;

    if (!isOnline) {
      hospitals.forEach((hosp) => {
        const dist = calculateHaversineDistance(lat, lng, hosp.latitude, hosp.longitude);
        setRouteMap((prev) => ({
          ...prev,
          [hosp.id]: {
            distanceMeters: dist,
            durationSeconds: -1, // indicates offline calculation
            failed: false,
          }
        }));
      });
      return;
    }

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

  // Initial GPS location request
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('[Emergency Action Screen] GPS permission denied:', err.message);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  }, []);

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const fetchHospitals = async (lat: number, lng: number) => {
    if (!isOnline) {
      const cached = localStorage.getItem('rescuelink_cached_hospitals');
      if (cached) {
        setHospitals(JSON.parse(cached));
      } else {
        setHospitals([]);
      }
      return;
    }

    try {
      const rawList = await fetchNearbyHospitals({ lat, lng });
      const list = rawList.map(h => ({
        id: h.id,
        name: h.name,
        address: h.address,
        latitude: h.lat,
        longitude: h.lng,
        distanceMeters: h.distanceMeters || Math.round(calculateHaversineDistance(lat, lng, h.lat, h.lng)),
        phone: h.phone || '',
        emergencyDept: true,
        bedsAvailable: 0
      }));
      setHospitals(list);
      localStorage.setItem('rescuelink_cached_hospitals', JSON.stringify(list));
    } catch (err) {
      console.error('[Emergency Action Screen] Error loading hospitals:', err);
    }
  };

  const handleOpenHospitals = async () => {
    // Reset route mapping state before opening
    routeFetchedRef.current = new Set();
    setRouteMap({});
    setToastMessage(null);

    setViewMode('hospitals');

    if (userLocation) {
      setLoadingHospitals(true);
      await fetchHospitals(userLocation.lat, userLocation.lng);
      setLoadingHospitals(false);
      return;
    }

    if (!('geolocation' in navigator)) {
      setLoadingHospitals(true);
      if (!isOnline) await fetchHospitals(0, 0);
      setLoadingHospitals(false);
      return;
    }

    setLoadingHospitals(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const freshCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(freshCoords);
        await fetchHospitals(freshCoords.lat, freshCoords.lng);
        setLoadingHospitals(false);
      },
      async (err) => {
        console.warn('[Emergency Action Screen] Fresh GPS request failed:', err.message);
        if (!isOnline) {
          await fetchHospitals(0, 0);
        }
        setLoadingHospitals(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleStartNavigation = (hospital: Hospital) => {
    if (!isOnline) {
      setToastMessage(t('emergency.navigationRequiresInternet'));
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }
    setSelectedHospital(hospital);
    setViewMode('navigation');
  };

  const handleShareLocation = async () => {
    setToastMessage(null);
    
    const sharePos = async (lat: number, lng: number) => {
      if (!isOnline) {
        localStorage.setItem('rescuelink_offline_share_location', JSON.stringify({ lat, lng, timestamp: Date.now() }));
        return;
      }

      const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
      const shareText = `🚨 EMERGENCY SOS! I need immediate help. My current GPS Location: ${mapUrl}`;

      if (navigator.share) {
        try {
          await navigator.share({
            title: 'RescueLink Emergency Location',
            text: shareText,
            url: mapUrl,
          });
        } catch (e) {
          console.warn('[Share Location] Cancelled:', e);
        }
      } else {
        try {
          await navigator.clipboard.writeText(shareText);
        } catch (e) {
          console.warn('[Share Location] Clipboard failed:', e);
        }
      }
    };

    if (userLocation) {
      sharePos(userLocation.lat, userLocation.lng);
      return;
    }

    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          sharePos(pos.coords.latitude, pos.coords.longitude);
        },
        () => {
          // Silently fail if location is unavailable
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    }
  };

  const userCoords: [number, number] | null = userLocation
    ? [userLocation.lat, userLocation.lng]
    : null;

  const sortedHospitals = useMemo(() => {
    return [...hospitals].sort((a, b) => {
      const routeA = routeMap[a.id];
      const routeB = routeMap[b.id];

      const distA = routeA
        ? (routeA.failed ? Infinity : routeA.distanceMeters)
        : a.distanceMeters;

      const distB = routeB
        ? (routeB.failed ? Infinity : routeB.distanceMeters)
        : b.distanceMeters;

      return distA - distB;
    });
  }, [hospitals, routeMap]);

  // Render SOS Navigation mode inside the mobile app container (Identical layout to LiveNavigationScreen)
  if (viewMode === 'navigation' && selectedHospital) {
    return (
      <div className="relative w-full h-screen overflow-hidden flex flex-col select-none touch-none bg-slate-950">
        <GoogleMapsNavigationMode
          destinationName={selectedHospital.name}
          destinationAddress={selectedHospital.address}
          destinationCoords={[selectedHospital.latitude, selectedHospital.longitude]}
          destinationType="hospital"
          initialUserCoords={userCoords}
          navigationStatus={t('emergency.navigatingToHospital')}
          onArrival={() => {
            setSelectedHospital(null);
            setViewMode('actions');
          }}
          onBackToHospitalSelect={() => setViewMode('hospitals')}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-surface">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-surface-container-high px-4 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setToastMessage(null);
              if (viewMode === 'hospitals') {
                setViewMode('actions');
              } else {
                navigate(-1);
              }
            }}
            className="p-2 rounded-full hover:bg-surface-container-high text-on-surface transition-colors"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-on-surface leading-tight">
              {viewMode === 'actions'
                ? t('emergency.sosServices')
                : t('emergency.nearbyHospitals')}
            </h1>
            <p className="text-xs text-on-surface-variant">
              {viewMode === 'actions'
                ? t('emergency.dispatchHotline')
                : t('emergency.osmDirectory')}
            </p>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-[90vw] max-w-[320px] bg-on-surface text-surface px-4 py-3 rounded-xl text-sm font-bold shadow-level-3 animate-in fade-in zoom-in duration-200 text-center leading-snug break-words">
          {toastMessage}
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {/* ========================================================================= */}
        {/* VIEW 1: SOS ACTION DASHBOARD */}
        {/* ========================================================================= */}
        {viewMode === 'actions' && (
          <div className="space-y-4">
            {/* Primary Hotline Hero Cards */}
            <div className="grid grid-cols-1 gap-3">
              {/* Call Ambulance (108) */}
              <div
                onClick={() => handleCall('108')}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between cursor-pointer group btn-press"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Ambulance className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {t('emergency.tollFreeNational')}
                    </span>
                    <h2 className="text-base font-black text-slate-900 leading-tight mt-0.5">{t('emergency.callAmbulance')}</h2>
                    <p className="text-xs text-slate-500 font-medium">
                      {t('emergency.medicalCasualty')}
                    </p>
                  </div>
                </div>
                <div className="w-12 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                  108
                </div>
              </div>

              {/* Call Police (100) */}
              <div
                onClick={() => handleCall('100')}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all flex items-center justify-between cursor-pointer group btn-press"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <ShieldAlert className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      {t('emergency.lawEnforcement')}
                    </span>
                    <h2 className="text-base font-black text-slate-900 leading-tight mt-0.5">{t('emergency.callPolice')}</h2>
                    <p className="text-xs text-slate-500 font-medium">{t('emergency.trafficCrime')}</p>
                  </div>
                </div>
                <div className="w-12 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-sm">
                  100
                </div>
              </div>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Nearby Hospitals Button */}
              <button
                onClick={handleOpenHospitals}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all text-left flex flex-col justify-between space-y-3 group btn-press"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <HospitalIcon className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center justify-between">
                    <span>{t('emergency.nearbyHospitalsBtn')}</span>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {t('emergency.liveGpsNav')}
                  </p>
                </div>
              </button>

              {/* Share Live Location */}
              <button
                onClick={handleShareLocation}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all text-left flex flex-col justify-between space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Share2 className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center justify-between">
                    <span>{t('emergency.shareLocation')}</span>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {t('emergency.sendGpsCoords')}
                  </p>
                </div>
              </button>

              {/* First Aid Manual */}
              <button
                onClick={() => navigate('/first-aid')}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all text-left flex flex-col justify-between space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Bandage className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center justify-between">
                    <span>{t('emergency.firstAidGuides')}</span>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {t('emergency.cprTrauma')}
                  </p>
                </div>
              </button>

              {/* Fire Brigade (101) */}
              <button
                onClick={() => handleCall('101')}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all text-left flex flex-col justify-between space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Flame className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center justify-between">
                    <span>{t('emergency.fireBrigade')}</span>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    {t('emergency.fireRescue')}
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: REALTIME OPENSTREETMAP NEARBY HOSPITALS LIST */}
        {/* ========================================================================= */}
        {viewMode === 'hospitals' && (
          <div className="space-y-3">
            {!isOnline && hospitals.length > 0 && (
              <div className="bg-amber-100 text-amber-900 px-4 py-2 text-xs font-bold rounded-lg border border-amber-200 animate-fade-in">
                {t('emergency.offlineHospitals')}
              </div>
            )}
            {!isOnline && hospitals.length === 0 && (
              <div className="bg-amber-100 text-amber-900 px-4 py-3 text-xs font-bold rounded-lg border border-amber-200 text-center animate-fade-in">
                {t('emergency.noHospitalsOffline')}
              </div>
            )}
            {!userLocation && !loadingHospitals && hospitals.length > 0 && (
              <div className="bg-slate-100 text-slate-700 px-4 py-2 text-xs font-medium rounded-lg border border-slate-200 text-center animate-fade-in">
                {t('emergency.locationUnavailable')}
              </div>
            )}

            {loadingHospitals ? (
              <div className="py-16 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="text-xs font-bold text-on-surface-variant">
                  {t('emergency.queryingHospitals')}
                </p>
              </div>
            ) : hospitals.length === 0 ? (
              <div className="py-12 text-center text-on-surface-variant space-y-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/60">
                <HospitalIcon className="w-10 h-10 mx-auto text-on-surface-variant/40" />
                <p className="text-xs font-bold">{t('emergency.noHospitalsFound')}</p>
                <p className="text-[11px]">{t('emergency.call108Immediately')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedHospitals.map((hosp) => {
                  const routeInfo = routeMap[hosp.id];
                  const isCalculating = routeInfo === undefined;
                  const isOfflineCalculation = routeInfo && routeInfo.durationSeconds === -1;

                  return (
                    <div
                      key={hosp.id}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1 min-w-0 flex-1">
                          <h3 className="text-sm font-extrabold text-on-surface leading-snug">
                            {hosp.name}
                          </h3>
                          <p className="text-xs text-on-surface-variant flex items-start gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                            <span className="break-words">{hosp.address}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0 min-w-[80px]">
                          {isCalculating ? (
                            <span className="text-[11px] font-bold text-on-surface-variant flex items-center justify-end gap-1">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              {t('common.calc')}
                            </span>
                          ) : routeInfo!.failed ? (
                            <span className="text-[11px] font-bold text-on-surface-variant">{t('common.routeError')}</span>
                          ) : (
                            <>
                              <span className="text-xs font-extrabold text-primary bg-primary-fixed px-2.5 py-1 rounded-full border border-primary/20 block text-center">
                                {isOfflineCalculation ? `${t('common.approx')} ${formatDistance(routeInfo!.distanceMeters)}` : formatDistance(routeInfo!.distanceMeters)}
                              </span>
                              {!isOfflineCalculation ? (
                                <span className="text-[11px] font-bold text-on-surface-variant flex items-center justify-end gap-1 mt-1">
                                  <Clock className="w-3 h-3 text-on-surface-variant/70" />
                                  {formatETA(routeInfo!.durationSeconds)}
                                </span>
                              ) : (
                                <span className="text-[11px] font-bold text-amber-600 flex items-center justify-end gap-1 mt-1">
                                  {t('common.dir')} {calculateBearing(userLocation!.lat, userLocation!.lng, hosp.latitude, hosp.longitude)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/40">
                        <div className="flex items-center space-x-1 text-amber-600">
                          <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                          <span className="text-xs font-extrabold">4.8</span>
                          <span className="text-[11px] text-on-surface-variant font-medium">
                            {t('emergency.emergencyReady')}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          {hosp.phone && (
                            <a
                              href={`tel:${hosp.phone}`}
                              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-sm font-semibold flex items-center gap-1.5 transition-colors border border-slate-200"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>{t('home.call', { defaultValue: 'Call' })}</span>
                            </a>
                          )}

                          <button
                            onClick={() => handleStartNavigation(hosp)}
                            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95 border border-blue-600"
                          >
                            <Navigation className="w-4 h-4" />
                            <span>{t('emergency.navigate')}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default EmergencyActionScreen;
