import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, MapPin, Navigation, Clock, Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { GoogleMap } from '../components/maps/GoogleMap';
import { fetchGoogleRoute } from '../services/googleRoutes';
import { formatETA } from '../utils/routing';
import { formatDistance } from '../utils/distance';

export interface AccidentRecord {
  id: string;
  address: string;
  latitude: number;
  longitude: number;
  severity: string;
  description?: string;
  photo_url?: string;
  created_at: string;
  status: string;
  volunteer_id?: string | null;
}

export const VolunteerMapPreviewScreen: React.FC = () => {
  const { accidentId } = useParams<{ accidentId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [incident, setIncident] = useState<AccidentRecord | null>(
    (location.state as any)?.incident || null
  );
  const [loadingIncident, setLoadingIncident] = useState<boolean>(!incident);

  // GPS Coordinates
  const [volunteerPos, setVolunteerPos] = useState<{ lat: number; lng: number } | null>(null);

  // Route & Metrics
  const [polylineString, setPolylineString] = useState<string>('');
  const [distanceMeters, setDistanceMeters] = useState<number>(0);
  const [durationSeconds, setDurationSeconds] = useState<number>(0);
  const [loadingRoute, setLoadingRoute] = useState<boolean>(true);

  // Accept Action States
  const [isAccepting, setIsAccepting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch Accident Record if not supplied in location state
  useEffect(() => {
    if (incident || !accidentId) return;

    async function fetchIncident() {
      setLoadingIncident(true);
      try {
        const { data, error } = await supabase
          .from('accidents')
          .select('*')
          .eq('id', accidentId!)
          .single();

        if (error || !data) {
          console.warn('[VolunteerMapPreview] Accident fetch error:', error?.message);
          setErrorMessage('Incident not found or has been removed.');
        } else {
          setIncident(data);
        }
      } catch (err) {
        console.error('[VolunteerMapPreview] Error loading accident:', err);
      } finally {
        setLoadingIncident(false);
      }
    }

    fetchIncident();
  }, [accidentId, incident]);

  // 2. Obtain Volunteer GPS Geolocation
  useEffect(() => {
    if (!('geolocation' in navigator)) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setVolunteerPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.warn('[VolunteerMapPreview] Geolocation error:', err.message);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // 3. Fetch Google Route Preview (Volunteer -> Accident)
  useEffect(() => {
    if (!incident || incident.latitude === null || incident.longitude === null || !volunteerPos) return;

    let isMounted = true;

    const loadRoutePreview = async () => {
      setLoadingRoute(true);

      const origin = { lat: volunteerPos.lat, lng: volunteerPos.lng };
      const destination = { lat: incident.latitude, lng: incident.longitude };

      const routeRes = await fetchGoogleRoute(origin, destination);
      
      if (!isMounted) return;

      if (!routeRes.error && routeRes.polyline) {
        setPolylineString(routeRes.polyline);
        setDistanceMeters(routeRes.distanceMeters);
        setDurationSeconds(routeRes.durationSeconds);
      }

      setLoadingRoute(false);
    };

    loadRoutePreview();

    return () => {
      isMounted = false;
    };
  }, [incident, volunteerPos]);

  // 3. Prevent rendering preview screen for already accepted missions
  useEffect(() => {
    if (incident && user && incident.volunteer_id === user.id) {
      navigate(`/navigation/${incident.id}`, { replace: true });
    }
  }, [incident, user, navigate]);

  // 4. Accept Mission Workflow (Identical to Dashboard Accept)
  const handleAcceptMission = async () => {
    if (!user || !incident) {
      setErrorMessage('You must be logged in as a responder to accept alerts.');
      return;
    }

    setIsAccepting(true);
    setErrorMessage(null);

    try {
      // Pre-check latest status
      const { data: latest } = await supabase
        .from('accidents')
        .select('volunteer_id, status')
        .eq('id', incident.id)
        .single();

      if (latest && latest.volunteer_id && latest.volunteer_id !== user.id) {
        setIsAccepting(false);
        setErrorMessage('Already accepted by another volunteer.');
        return;
      }

      // Get exact GPS coordinates
      let currentLat = volunteerPos?.lat;
      let currentLng = volunteerPos?.lng;

      if (!currentLat || !currentLng) {
        const freshPos = await new Promise<{ lat: number; lng: number } | null>((resolve) => {
          if (!('geolocation' in navigator)) return resolve(null);
          navigator.geolocation.getCurrentPosition(
            (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude }),
            () => resolve(null),
            { enableHighAccuracy: true }
          );
        });

        if (freshPos) {
          currentLat = freshPos.lat;
          currentLng = freshPos.lng;
        } else {
          setIsAccepting(false);
          setErrorMessage('GPS location is required to accept rescue missions. Please enable location access.');
          return;
        }
      }

      const updatePayload: any = {
        status: 'Volunteer Assigned',
        volunteer_id: user.id,
        volunteer_latitude: currentLat,
        volunteer_longitude: currentLng,
        accepted_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('accidents')
        .update(updatePayload)
        .eq('id', incident.id)
        .is('volunteer_id', null)
        .select()
        .single();

      setIsAccepting(false);

      if (error || !data) {
        setErrorMessage('Already accepted by another volunteer.');
        return;
      }

      // Successfully accepted -> Replace preview in history and navigate directly to Live Navigation
      navigate(`/navigation/${incident.id}`, {
        replace: true,
        state: {
          accidentId: incident.id,
          latitude: incident.latitude,
          longitude: incident.longitude,
          address: incident.address,
          severity: incident.severity,
          mode: 'volunteer',
        },
      });
    } catch (err: any) {
      setIsAccepting(false);
      setErrorMessage(err.message || 'Failed to accept mission.');
    }
  };

  if (loadingIncident) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-50 text-slate-700">
        <Loader2 className="w-8 h-8 text-red-700 animate-spin mb-3" />
        <p className="text-sm font-bold">Loading Accident Map Preview...</p>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <AlertCircle className="w-12 h-12 text-amber-600 mb-3" />
        <h2 className="text-base font-black text-slate-900">Incident Not Found</h2>
        <p className="text-xs text-slate-500 mt-1 mb-4">This accident alert may have been resolved or canceled.</p>
        <button
          onClick={() => navigate('/volunteer')}
          className="px-5 py-2.5 bg-blue-600 text-white font-extrabold text-xs rounded-xl shadow-md"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const mapCenter = volunteerPos
    ? {
        lat: (volunteerPos.lat + incident.latitude) / 2,
        lng: (volunteerPos.lng + incident.longitude) / 2,
      }
    : { lat: incident.latitude, lng: incident.longitude };

  const markers = [
    {
      id: `preview-accident-${incident.id}`,
      lat: incident.latitude,
      lng: incident.longitude,
      title: `${incident.severity} ACCIDENT: ${incident.address}`,
      type: 'accident' as const,
    },
    ...(volunteerPos
      ? [
          {
            id: 'preview-volunteer-pos',
            lat: volunteerPos.lat,
            lng: volunteerPos.lng,
            title: 'Your Current Responder Location',
            type: 'volunteer' as const,
          },
        ]
      : []),
  ];

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-100 select-none">
      {/* 1. TOP HEADER & ACCIDENT ADDRESS CARD */}
      <div className="absolute top-3 left-3 right-3 z-[500] bg-white/95 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-slate-200/80 animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/volunteer')}
            className="min-w-[44px] min-h-[44px] rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center shrink-0 transition-all active:scale-95 shadow-xs"
            aria-label="Back to dashboard"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-wide bg-rose-50 text-red-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
                {incident.severity} PRIORITY
              </span>
              <span className="text-xs font-extrabold text-slate-600 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-600 shrink-0" />
                Open Map Preview
              </span>
            </div>

            {/* Full Accident Address (Up to 2 lines, never truncated) */}
            <h2 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">
              {incident.address}
            </h2>
          </div>
        </div>

        {/* ETA & Distance Metric Pill */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs font-extrabold text-slate-700">
          <div className="flex items-center gap-1.5 text-emerald-700">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Route Preview Available</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-slate-900">
              <span>📏</span>
              <span>{formatDistance(distanceMeters)}</span>
            </span>
            <span className="flex items-center gap-1 text-blue-700">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>{loadingRoute ? '...' : formatETA(durationSeconds)}</span>
            </span>
          </div>
        </div>
      </div>

      {/* ERROR BANNER IF ACCEPT FAILS */}
      {errorMessage && (
        <div className="absolute top-36 left-4 right-4 z-[600] bg-rose-900/95 text-white p-3.5 rounded-2xl shadow-xl text-xs font-bold flex items-center justify-between border border-rose-500">
          <span>{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="px-2.5 py-1 bg-white/20 rounded-lg text-white font-extrabold">
            Dismiss
          </button>
        </div>
      )}

      {/* 2. FULL-SCREEN INTERACTIVE GOOGLE MAP */}
      <div className="absolute inset-0 w-full h-full z-0 overflow-hidden bg-slate-100">
        <GoogleMap
          center={mapCenter}
          zoom={14}
          markers={markers}
          polylineString={polylineString}
          className="w-full h-full"
        />
      </div>

      {/* 3. STICKY BOTTOM ACTION BAR */}
      <div className="absolute bottom-0 left-0 right-0 z-[500] bg-white/95 backdrop-blur-xl text-slate-900 rounded-t-3xl p-4 sm:p-5 shadow-2xl border-t border-slate-200/80 animate-in fade-in slide-in-from-bottom-4 duration-300 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate('/volunteer')}
            className="px-5 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs rounded-2xl border border-slate-200/80 transition-all active:scale-95 shrink-0"
          >
            Back
          </button>

          <button
            type="button"
            onClick={handleAcceptMission}
            disabled={isAccepting}
            className="flex-1 py-3.5 bg-red-800 hover:bg-red-900 text-white font-extrabold text-xs sm:text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-70"
          >
            {isAccepting ? (
              <>
                <Loader2 className="w-4.5 h-4.5 animate-spin" />
                <span>Accepting Mission...</span>
              </>
            ) : (
              <>
                <Navigation className="w-4.5 h-4.5" />
                <span>ACCEPT ACCIDENT MISSION</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default VolunteerMapPreviewScreen;
