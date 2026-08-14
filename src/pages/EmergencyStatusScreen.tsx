import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { MapPin, PhoneCall, AlertCircle, Clock, Loader2, Camera, CheckCircle2, Hospital, Ambulance, ClipboardCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { GoogleMap } from '../components/maps/GoogleMap';
import { fetchNearbyHospitals, type HospitalPlace } from '../services/googlePlaces';
import { calculateHaversineDistance, formatDistance } from '../utils/distance';
import { cleanDescriptionText, formatETA, fetchOSRMRoute, getStoredHospital } from '../utils/routing';
import { SpinnerLoader, EmptyState, StatusCardSkeleton } from '../components/common/SkeletonLoader';
import { useTranslation } from 'react-i18next';

const isActiveStatus = (status?: string | null): boolean => {
  if (!status) return false;
  const s = status.trim();
  const inactiveStatuses = [
    'Emergency Completed',
    'Emergency Resolved',
    'Completed',
    'Problem Resolved',
    'Resolved',
  ];
  return !inactiveStatuses.includes(s);
};

interface AccidentRecord {
  id: string;
  reporter_id: string;
  volunteer_id?: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string;
  photo_url: string | null;
  severity: string;
  description: string | null;
  status: string;
  volunteer_latitude?: number | null;
  volunteer_longitude?: number | null;
  hospital_name?: string | null;
  hospital_address?: string | null;
  hospital_phone?: string | null;
  hospital_latitude?: number | null;
  hospital_longitude?: number | null;
  created_at: string;
  updated_at: string;
}

export const EmergencyStatusScreen: React.FC = () => {
  const navigate = useNavigate();
  const locationState = useLocation().state as { accidentId?: string } | undefined;
  const { user } = useAuth();
  const { t } = useTranslation();

  const [accident, setAccident] = useState<AccidentRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Initial Fetch for latest accident report
  useEffect(() => {
    async function fetchLatestAccident() {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const searchParams = new URLSearchParams(location.search);
        const targetAccidentId =
          locationState?.accidentId ||
          searchParams.get('accidentId') ||
          localStorage.getItem('rescuelink_last_active_accident_id');

        let data: AccidentRecord | null = null;
        let error: any = null;

        if (targetAccidentId) {
          const res = await supabase
            .from('accidents')
            .select('*')
            .eq('id', targetAccidentId)
            .single();
          data = res.data;
          error = res.error;
        }

        // Fallback to latest active accident query if targetAccidentId is not set or not found
        if (!data) {
          const res = await supabase
            .from('accidents')
            .select('*')
            .eq('reporter_id', user.id)
            .not('status', 'in', '("Emergency Completed","Emergency Resolved","Completed","Problem Resolved","Resolved")')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          data = res.data;
          error = res.error;
        }

        if (error && !data) {
          console.warn('[RescueLink Status] Error fetching accident report:', error.message);
          setAccident(null);
        } else if (data) {
          // Persist targetAccidentId locally so navigating away and returning preserves the ID
          localStorage.setItem('rescuelink_last_active_accident_id', data.id);

          const storedHosp = getStoredHospital(data.id);
          const fullRecord: AccidentRecord = {
            ...data,
            hospital_name: data.hospital_name || storedHosp?.name || null,
            hospital_address: data.hospital_address || storedHosp?.address || null,
            hospital_phone: data.hospital_phone || storedHosp?.phone || null,
            hospital_latitude: data.hospital_latitude ?? storedHosp?.latitude ?? null,
            hospital_longitude: data.hospital_longitude ?? storedHosp?.longitude ?? null,
          };

          console.log('[Citizen Initial Accident Fetch]:', {
            accidentId: fullRecord.id,
            status: fullRecord.status,
            hospital_name: fullRecord.hospital_name,
            hospital_address: fullRecord.hospital_address,
          });

          setAccident(fullRecord);
        } else {
          setAccident(null);
        }
      } catch (err) {
        console.error('[RescueLink Status] Unexpected error during fetch:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLatestAccident();
  }, [user, locationState?.accidentId, location.search]);

  // 2. Supabase Realtime Subscription for Live Status & Volunteer GPS Location Updates
  useEffect(() => {
    if (!accident?.id) return;

    console.log(`[RescueLink Realtime] Subscribing to realtime updates for accident ID: ${accident.id}`);

    const channel = supabase
      .channel(`accident_status_${accident.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accidents',
          filter: `id=eq.${accident.id}`,
        },
        (payload) => {
          if (payload.new) {
            const updated = payload.new as AccidentRecord;
            console.log('[CITIZEN REALTIME UPDATE PAYLOAD]:', {
              'payload.new.id': updated.id,
              'payload.new.status': updated.status,
              'payload.new.hospital_name': updated.hospital_name,
              'payload.new.hospital_address': updated.hospital_address,
              'payload.new.hospital_phone': updated.hospital_phone,
              'payload.new.hospital_latitude': updated.hospital_latitude,
              'payload.new.hospital_longitude': updated.hospital_longitude,
            });
            setAccident((prev) => {
              if (!prev) return updated;
              return {
                ...prev,
                ...updated,
                hospital_name: updated.hospital_name || prev.hospital_name,
                hospital_address: updated.hospital_address || prev.hospital_address,
                hospital_phone: updated.hospital_phone || prev.hospital_phone,
                hospital_latitude: updated.hospital_latitude || prev.hospital_latitude,
                hospital_longitude: updated.hospital_longitude || prev.hospital_longitude,
              };
            });
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[RescueLink Realtime] Channel subscription status for accident ${accident.id}:`, status);
        if (err) {
          console.warn('[RescueLink Realtime] Channel subscription error:', err);
        }
      });

    return () => {
      console.log(`[RescueLink Realtime] Unsubscribing from accident channel: ${accident.id}`);
      supabase.removeChannel(channel);
    };
  }, [accident?.id]);

  // 3. Fallback Polling Interval to guarantee status updates even if Realtime events are missed
  useEffect(() => {
    if (!user || !accident?.id) return;

    console.log(`[RescueLink Polling] Starting 5s status polling fallback for accident ID: ${accident.id}`);

    const interval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('accidents')
          .select('*')
          .eq('id', accident.id)
          .single();

        if (data && !error) {
          setAccident((prev) => {
            if (!prev) return data;
            if (
              prev.status !== data.status ||
              prev.hospital_name !== data.hospital_name ||
              prev.volunteer_latitude !== data.volunteer_latitude ||
              prev.volunteer_longitude !== data.volunteer_longitude
            ) {
              console.log('[RescueLink Polling Fallback] Updated accident state from polling:', {
                status: data.status,
                hospital_name: data.hospital_name,
              });
              return {
                ...prev,
                ...data,
                hospital_name: data.hospital_name || prev.hospital_name,
                hospital_address: data.hospital_address || prev.hospital_address,
                hospital_phone: data.hospital_phone || prev.hospital_phone,
                hospital_latitude: data.hospital_latitude || prev.hospital_latitude,
                hospital_longitude: data.hospital_longitude || prev.hospital_longitude,
              };
            }
            return prev;
          });
        }
      } catch (e) {
        // Silent background error handling
      }
    }, 5000);

    return () => {
      console.log(`[RescueLink Polling] Stopping 5s status polling fallback for accident ID: ${accident.id}`);
      clearInterval(interval);
    };
  }, [user, accident?.id]);

  // 4. Custom event listener for local hospital selection updates
  useEffect(() => {
    if (!accident?.id) return;
    const handleHospitalUpdate = (e: any) => {
      if (e.detail?.accidentId === accident.id && e.detail?.hospital) {
        const h = e.detail.hospital;
        setAccident((prev) =>
          prev
            ? {
                ...prev,
                hospital_name: h.name || prev.hospital_name,
                hospital_address: h.address || prev.hospital_address,
                hospital_phone: h.phone || prev.hospital_phone,
                hospital_latitude: h.latitude || prev.hospital_latitude,
                hospital_longitude: h.longitude || prev.hospital_longitude,
              }
            : prev
        );
      }
    };
    window.addEventListener('rescuelink_hospital_updated', handleHospitalUpdate);
    return () => {
      window.removeEventListener('rescuelink_hospital_updated', handleHospitalUpdate);
    };
  }, [accident?.id]);

  // Nearby Hospitals via Google Places API
  const [nearbyHospitals, setNearbyHospitals] = useState<HospitalPlace[]>([]);

  useEffect(() => {
    if (!accident?.latitude || !accident?.longitude) {
      setNearbyHospitals([]);
      return;
    }

    fetchNearbyHospitals({ lat: accident.latitude, lng: accident.longitude }, 5000)
      .then((hospitals) => {
        setNearbyHospitals(hospitals);
      })
      .catch((err) => {
        console.warn('Failed to load nearby hospitals:', err);
      });
  }, [accident?.latitude, accident?.longitude]);

  // 3. Fetch Volunteer Profile Info when assigned
  const [volunteerProfile, setVolunteerProfile] = useState<{ full_name: string; phone_number: string } | null>(null);

  useEffect(() => {
    if (!accident?.volunteer_id) {
      setVolunteerProfile(null);
      return;
    }
    async function fetchVolunteerProfileInfo() {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('full_name, phone_number')
          .eq('auth_user_id', accident!.volunteer_id!)
          .maybeSingle();

        if (data && data.full_name) {
          setVolunteerProfile(data);
        } else {
          setVolunteerProfile({ full_name: 'Assigned Responder', phone_number: '' });
        }
      } catch (err) {
        console.warn('Error fetching volunteer profile:', err);
      }
    }
    fetchVolunteerProfileInfo();
  }, [accident?.volunteer_id]);

  const hasVolunteer = !!(accident?.volunteer_id && accident.status !== 'Reported');

  // Helper to format ISO timestamp into user-friendly time
  const formatReportedTime = (isoString: string): string => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return t('common.justNow');
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? t('common.min') : t('common.mins')} ${t('common.ago')}`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? t('common.hour') : t('common.hours')} ${t('common.ago')}`;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusStageIndex = (status: string): number => {
    if (!status) return 0;
    const s = status.trim();
    if (
      s === 'Emergency Completed' ||
      s === 'Emergency Resolved' ||
      s === 'Completed' ||
      s === 'Problem Resolved' ||
      s === 'Resolved'
    )
      return 6;
    if (s === 'Hospital Reached') return 5;
    if (s === 'Transporting to Hospital' || s === 'Hospital Transfer' || s === 'To Hospital') return 4;
    if (s === 'Volunteer Reached' || s === 'Volunteer Arrived' || s === 'Arrived at Scene' || s === 'Volunteer Arrived at Scene') return 3;
    if (s === 'Volunteer En Route' || s === 'En Route') return 2;
    if (s === 'Volunteer Assigned' || s === 'Assigned') return 1;
    return 0; // Stage 0: SOS Sent
  };

  const getProgressPercentage = (status?: string | null): number => {
    if (!status) return 0;
    const s = status.trim();
    if (
      s === 'Emergency Completed' ||
      s === 'Emergency Resolved' ||
      s === 'Completed' ||
      s === 'Problem Resolved' ||
      s === 'Resolved'
    ) {
      return 100;
    }
    const idx = getStatusStageIndex(s);
    if (idx >= 6) return 100;
    return Math.min(100, Math.round(((idx + 1) / 7) * 100));
  };

  const formatCitizenStatusDisplay = (status?: string | null): string => {
    if (!status) return t('emergencyStatus.waitingForVolunteer');
    const s = status.trim();
    if (s === 'Transporting to Hospital' || s === 'Hospital Transfer' || s === 'To Hospital') {
      return t('emergencyStatus.stepEnRouteHospTitle');
    }
    return s;
  };

  const getTimelineSteps = (status: string) => {
    const stages = [
      { title: t('emergencyStatus.stepSosTitle'), desc: t('emergencyStatus.stepSosDesc') },
      { title: t('emergencyStatus.stepVolAssignedTitle'), desc: t('emergencyStatus.stepVolAssignedDesc') },
      { title: t('emergencyStatus.stepVolEnRouteTitle'), desc: t('emergencyStatus.stepVolEnRouteDesc') },
      { title: t('emergencyStatus.stepVolArrivedTitle'), desc: t('emergencyStatus.stepVolArrivedDesc') },
      { title: t('emergencyStatus.stepEnRouteHospTitle'), desc: t('emergencyStatus.stepEnRouteHospDesc') },
      { title: t('emergencyStatus.stepHospReachedTitle'), desc: t('emergencyStatus.stepHospReachedDesc') },
      { title: t('emergencyStatus.stepCompletedTitle'), desc: t('emergencyStatus.stepCompletedDesc') },
    ];

    const currentIdx = getStatusStageIndex(status);

    return stages.map((step, idx) => ({
      title: step.title,
      desc: step.desc,
      completed: idx <= currentIdx,
      isCurrent: idx === currentIdx,
    }));
  };

  const timelineSteps = accident ? getTimelineSteps(accident.status) : [];

  // Realtime ETA calculation via OSRM / Haversine (ONLY active when volunteer assigned)
  const [liveDistanceMeters, setLiveDistanceMeters] = useState<number | null>(null);
  const [liveDurationSeconds, setLiveDurationSeconds] = useState<number | null>(null);
  const citizenPrevPosRef = React.useRef<[number, number] | null>(null);

  // Status Category Guards
  const isEnRoute = accident?.status === 'Assigned' || accident?.status === 'Volunteer Assigned' || accident?.status === 'En Route' || accident?.status === 'Volunteer En Route';
  const isArrivedOnScene = accident?.status === 'Volunteer Arrived' || accident?.status === 'Arrived at Scene' || accident?.status === 'Volunteer Arrived at Scene';
  const isTransporting = accident?.status === 'Transporting to Hospital' || accident?.status === 'Hospital Transfer' || accident?.status === 'To Hospital' || (isArrivedOnScene && !!accident?.hospital_name);
  const isHospitalReached = accident?.status === 'Hospital Reached';
  const isResolved = accident?.status === 'Emergency Completed' || accident?.status === 'Emergency Resolved' || accident?.status === 'Completed';

  const displayedStatus = hasVolunteer ? formatCitizenStatusDisplay(accident?.status) : 'Waiting for Volunteer';
  console.log('[RescueLink Status] Citizen displayed status:', displayedStatus, 'Hospital:', accident?.hospital_name ?? 'None');

  // Determine Target Coordinates for OSRM Route & ETA:
  // If Transporting to Hospital or Hospital Reached -> Destination is the Hospital Coordinates!
  // Else (En Route / Arrived) -> Destination is the Accident Scene Coordinates!
  const targetLat = (isTransporting || isHospitalReached) && accident?.hospital_latitude ? accident.hospital_latitude : (accident?.latitude || 0);
  const targetLng = (isTransporting || isHospitalReached) && accident?.hospital_longitude ? accident.hospital_longitude : (accident?.longitude || 0);

  const volLat = hasVolunteer ? accident?.volunteer_latitude : null;
  const volLng = hasVolunteer ? accident?.volunteer_longitude : null;

  useEffect(() => {
    if (!hasVolunteer || !accident || volLat === null || volLat === undefined || volLng === null || volLng === undefined) {
      setLiveDistanceMeters(null);
      setLiveDurationSeconds(null);
      return;
    }

    if (citizenPrevPosRef.current) {
      const moveDist = calculateHaversineDistance(
        citizenPrevPosRef.current[0],
        citizenPrevPosRef.current[1],
        volLat,
        volLng
      );
      if (moveDist < 5 && liveDistanceMeters !== null) {
        return;
      }
    }

    citizenPrevPosRef.current = [volLat, volLng];

    const updateLiveETA = async () => {
      const res = await fetchOSRMRoute([volLat, volLng], [targetLat, targetLng]);
      if (res.distanceMeters < 30) {
        setLiveDistanceMeters(0);
        setLiveDurationSeconds(0);
      } else {
        setLiveDistanceMeters(res.distanceMeters);
        setLiveDurationSeconds(res.durationSeconds);
      }
    };

    updateLiveETA();
  }, [hasVolunteer, volLat, volLng, targetLat, targetLng, accident?.id]);

  const getEtaDisplay = (): string => {
    if (!accident || !hasVolunteer) return t('emergencyStatus.waitingForVolunteer');
    if (isResolved) return t('emergencyStatus.stepCompletedTitle');
    if (isHospitalReached) return t('emergencyStatus.stepHospReachedTitle');
    if (isArrivedOnScene && !isTransporting) return t('emergencyStatus.stepVolArrivedTitle');

    if (liveDurationSeconds !== null && liveDistanceMeters !== null) {
      return formatETA(liveDurationSeconds, liveDistanceMeters);
    }
    if (volLat !== null && volLat !== undefined && volLng !== null && volLng !== undefined) {
      const dist = calculateHaversineDistance(volLat, volLng, targetLat, targetLng);
      const estSecs = (dist / 1000 / 40) * 3600;
      return formatETA(estSecs, dist);
    }
    return t('emergencyStatus.calculating');
  };

  // Status-driven Distance Display (Volunteer -> Accident BEFORE arrival, Volunteer -> Hospital DURING transport)
  const hasAccidentCoords = accident?.latitude !== null && accident?.latitude !== undefined && accident?.longitude !== null && accident?.longitude !== undefined;
  const hasVolunteerCoords = hasVolunteer && accident?.volunteer_latitude !== null && accident?.volunteer_latitude !== undefined && accident?.volunteer_longitude !== null && accident?.volunteer_longitude !== undefined;

  let calculatedDistanceDisplay: string | null = null;
  let distanceLabel = 'Volunteer Distance to Scene';

  if (hasVolunteer && hasVolunteerCoords && accident) {
    if (isEnRoute && hasAccidentCoords) {
      // Distance: Volunteer Current Location -> Accident Scene
      const distMeters = liveDistanceMeters !== null ? liveDistanceMeters : calculateHaversineDistance(
        Number(accident.volunteer_latitude),
        Number(accident.volunteer_longitude),
        Number(accident.latitude),
        Number(accident.longitude)
      );
      calculatedDistanceDisplay = formatDistance(distMeters);
      distanceLabel = t('emergencyStatus.distanceToAccident');
    } else if (isTransporting && accident.hospital_latitude) {
      // Distance: Volunteer Current Location -> Selected Hospital
      const distMeters = liveDistanceMeters !== null ? liveDistanceMeters : calculateHaversineDistance(
        Number(accident.volunteer_latitude),
        Number(accident.volunteer_longitude),
        targetLat,
        targetLng
      );
      calculatedDistanceDisplay = formatDistance(distMeters);
      distanceLabel = t('emergencyStatus.distanceToHospital');
    } else {
      // Arrived at Scene / Hospital Reached / Emergency Resolved -> Hide numerical distance to accident
      calculatedDistanceDisplay = null;
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      <Navbar
        title={t('emergencyStatus.liveStatus')}
        showBack
        rightAction={
          <button
            onClick={() => navigate('/history')}
            className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container text-primary font-black text-xs rounded-full border border-outline-variant/60 shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            aria-label="View History"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('profile.history')}</span>
          </button>
        }
      />

      <main className="flex-1 px-4 py-4 space-y-5">
        {loading ? (
          <div className="space-y-4">
            <SpinnerLoader message={t('emergencyStatus.loading')} />
            <StatusCardSkeleton />
          </div>
        ) : !accident || !isActiveStatus(accident.status) ? (
          <div className="space-y-4 py-4 animate-card-enter">
            <EmptyState
              icon={ClipboardCheck}
              title={t('emergencyStatus.noActiveComplaints')}
              description={t('emergencyStatus.noActiveComplaintsDesc')}
            />
          </div>
        ) : (
          <>
            {/* Quick Emergency Communications Card */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/60 shadow-level-1 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
                  <Ambulance className="w-5 h-5 text-red-700" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-on-surface">{t('emergencyStatus.callAmbulance108')}</h3>
                  <p className="text-[11px] text-on-surface-variant font-medium">{t('emergencyStatus.open108Dialer')}</p>
                </div>
              </div>

              <a
                href="tel:108"
                className="px-4 py-2 bg-surface-container-high hover:bg-surface-container text-on-surface border border-outline-variant/60 font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 active:scale-95 shrink-0"
              >
                <PhoneCall className="w-4 h-4 text-blue-600" />
                <span>{t('emergencyStatus.call108Btn')}</span>
              </a>
            </div>

            {/* Active Status Hero Banner */}
            <div className={`p-5 rounded-3xl shadow-level-2 space-y-3 relative overflow-hidden text-white transition-all ${
              accident.status === 'Emergency Resolved'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-800'
                : hasVolunteer
                ? 'bg-gradient-to-br from-secondary to-blue-700'
                : 'bg-gradient-to-br from-amber-600 to-red-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-xs flex items-center gap-1.5">
                  {accident.status === 'Emergency Resolved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  {t('emergencyStatus.status')} {displayedStatus}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-100">
                  <span className={`w-2 h-2 rounded-full ${accident.status === 'Emergency Resolved' ? 'bg-white' : 'bg-amber-300 animate-ping'}`}></span>
                  <span className="uppercase font-bold bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">
                    {accident.severity}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <p className="text-xs text-blue-100 font-medium">{t('emergencyStatus.eta')}</p>
                  <h2 className="text-3xl font-extrabold tracking-tight mt-0.5">
                    {getEtaDisplay()}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-100">{t('emergencyStatus.reported')}</p>
                  <p className="text-sm font-bold flex items-center gap-1 text-blue-100 justify-end">
                    <Clock className="w-3.5 h-3.5" />
                    {formatReportedTime(accident.created_at)}
                  </p>
                </div>
              </div>

              {/* Status-Driven Subtext Banner */}
              {!hasVolunteer ? (
                <div className="pt-2 border-t border-white/20 flex items-center gap-2.5 text-xs font-bold text-amber-100">
                  <Loader2 className="w-4 h-4 animate-spin text-amber-200 shrink-0" />
                  <span>{t('emergencyStatus.searchingVolunteer')}</span>
                </div>
              ) : isArrivedOnScene && !isTransporting ? (
                <div className="pt-2 border-t border-white/20 flex items-center gap-2.5 text-xs font-bold text-blue-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>{t('emergencyStatus.volunteerArrivedAssessing')}</span>
                </div>
              ) : isTransporting ? (
                <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                  <span className="text-blue-100 font-bold flex items-center gap-1.5">
                    <span>🏥</span>
                    <span>{accident.hospital_name || 'Selected Hospital'}</span>
                  </span>
                  {calculatedDistanceDisplay && (
                    <span className="font-extrabold text-sm text-white bg-white/20 px-2.5 py-0.5 rounded-full">
                      {calculatedDistanceDisplay} {t('emergencyStatus.remaining')}
                    </span>
                  )}
                </div>
              ) : isHospitalReached ? (
                <div className="pt-2 border-t border-white/20 flex items-center gap-2.5 text-xs font-bold text-emerald-100">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>{t('emergencyStatus.hospitalReached')}</span>
                </div>
              ) : isEnRoute && calculatedDistanceDisplay ? (
                <div className="pt-2 border-t border-white/20 flex items-center justify-between text-xs">
                  <span className="text-blue-100 font-bold flex items-center gap-1.5">
                    <span>🚑</span>
                    <span>{distanceLabel}</span>
                  </span>
                  <span className="font-extrabold text-sm text-white bg-white/20 px-2.5 py-0.5 rounded-full">
                    {calculatedDistanceDisplay}
                  </span>
                </div>
              ) : null}

              <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                <div className={`h-full transition-all duration-500 ${
                  accident.status === 'Emergency Resolved' ? 'w-full bg-emerald-300' : hasVolunteer ? 'w-[70%] bg-emerald-400' : 'w-[25%] bg-amber-300 animate-pulse'
                }`}></div>
              </div>
            </div>

            {/* Incident Description */}
            {accident.description && cleanDescriptionText(accident.description) && (
              <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1">
                <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block mb-1">
                  {t('emergencyStatus.accidentIncidentDetails')}
                </span>
                <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                  {cleanDescriptionText(accident.description)}
                </p>
              </div>
            )}

            {/* Dedicated Selected Hospital Card */}
            {(() => {
              const storedHosp = getStoredHospital(accident.id);
              const hospName = accident.hospital_name || storedHosp?.name;
              const hospAddress = accident.hospital_address || storedHosp?.address || (accident.latitude && accident.longitude ? `GPS (${accident.latitude.toFixed(4)}, ${accident.longitude.toFixed(4)})` : accident.address);
              const hospPhone = accident.hospital_phone || storedHosp?.phone;

              if (!hospName) {
                return null;
              }

              return (
                <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white p-4 rounded-3xl border border-blue-700/80 shadow-level-2 space-y-2.5 animate-card-enter">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-blue-800 text-blue-100 px-2.5 py-0.5 rounded-full border border-blue-600 flex items-center gap-1 animate-badge-pop">
                      <Hospital className="w-3.5 h-3.5" />
                      {t('emergencyStatus.selectedDestinationHospital')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-extrabold text-white flex items-center gap-1.5 pt-0.5">
                      <span>🏥</span>
                      <span>{hospName}</span>
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs text-blue-100 font-semibold pt-2 border-t border-blue-800/60">
                    <span className="truncate">📍 {hospAddress}</span>
                    {hospPhone ? (
                      <a href={`tel:${hospPhone}`} className="text-emerald-300 hover:underline flex items-center gap-1">
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>☎ {hospPhone}</span>
                      </a>
                    ) : (
                      <span className="text-slate-300">☎ {t('emergencyStatus.phoneUnavailable')}</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Interactive Map Box with Live Accident Marker (Volunteer Marker ONLY rendered after acceptance) */}
            <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/50 p-4 shadow-level-1 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  {t('emergencyStatus.accidentLocationRadar')}
                </span>
                <span className="text-secondary font-semibold flex items-center gap-1">
                  <span className={`w-2 h-2 rounded-full ${hasVolunteer ? 'bg-emerald-500 animate-ping' : 'bg-amber-500 animate-pulse'}`}></span>
                  {hasVolunteer ? t('emergencyStatus.realtimeTracking') : t('emergencyStatus.waitingForVolunteer')}
                </span>
              </div>

              {accident.latitude !== null && accident.longitude !== null && (
                <div className="w-full h-56 rounded-2xl overflow-hidden border border-outline-variant/60 shadow-xs relative">
                  <GoogleMap
                    center={{ lat: accident.latitude, lng: accident.longitude }}
                    zoom={14}
                    markers={[
                      {
                        id: `accident-${accident.id}`,
                        lat: accident.latitude,
                        lng: accident.longitude,
                        title: `${accident.severity} ACCIDENT: ${accident.address}`,
                        type: 'accident' as const,
                      },
                      ...(hasVolunteer && accident.volunteer_latitude !== null && accident.volunteer_latitude !== undefined && accident.volunteer_longitude !== null && accident.volunteer_longitude !== undefined
                        ? [
                            {
                              id: `volunteer-${accident.id}`,
                              lat: accident.volunteer_latitude,
                              lng: accident.volunteer_longitude,
                              title: `${t('emergencyStatus.assignedResponder')} ${volunteerProfile?.full_name || 'Volunteer'}`,
                              type: 'volunteer' as const,
                            },
                          ]
                        : []),
                      ...nearbyHospitals.map((hosp) => ({
                        id: `hosp-${hosp.id}`,
                        lat: hosp.lat,
                        lng: hosp.lng,
                        title: `🏥 ${hosp.name}`,
                        type: 'hospital' as const,
                      })),
                    ]}
                    className="w-full h-full"
                  />
                </div>
              )}

              {/* Photo Preview if attached */}
              {accident.photo_url && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-secondary" />
                    {t('emergencyStatus.attachedScenePhoto')}
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-outline-variant/60 bg-black/5 max-h-48">
                    <img src={accident.photo_url} alt="Scene Evidence" loading="lazy" decoding="async" className="w-full h-44 object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Responder Info Card (ONLY rendered after a real volunteer accepts) */}
            {hasVolunteer && (
              <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-3">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">{t('emergencyStatus.assignedVolunteerResponder')}</h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base border border-emerald-300 shrink-0 aspect-square overflow-hidden">
                      {volunteerProfile?.full_name?.charAt(0) || 'V'}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">
                        {volunteerProfile?.full_name || 'Emergency Responder'}
                      </h4>
                      <p className="text-[11px] text-on-surface-variant">
                        {t('emergencyStatus.statusLabel')} <span className="font-bold text-secondary">{accident.status}</span>
                        {calculatedDistanceDisplay && (
                          <span className="ml-1 font-bold text-tertiary">({calculatedDistanceDisplay} {t('emergencyStatus.away')})</span>
                        )}
                      </p>
                    </div>
                  </div>
                  {volunteerProfile?.phone_number ? (
                    <a
                      href={`tel:${volunteerProfile.phone_number}`}
                      className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xs hover:bg-emerald-700 transition-colors"
                      aria-label="Call Volunteer"
                    >
                      <PhoneCall className="w-5 h-5" />
                    </a>
                  ) : (
                    <a
                      href="tel:108"
                      className="p-3 bg-secondary text-white rounded-2xl shadow-xs hover:bg-secondary/90 transition-colors"
                      aria-label="Call Emergency Hotline"
                    >
                      <PhoneCall className="w-5 h-5" />
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Citizen Emergency Progress Timeline */}
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>{t('emergencyStatus.citizenProgressTimeline')}</span>
                </h3>
                <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                  {t('emergencyStatus.realtimeTracking')}
                </span>
              </div>

              {/* Smooth Animated Progress Bar */}
              {(() => {
                const pct = getProgressPercentage(accident.status);
                return (
                  <div className="space-y-1.5 bg-surface-container-low p-3.5 rounded-2xl border border-outline-variant/40">
                    <div className="flex items-center justify-between text-xs font-extrabold text-on-surface">
                      <span className="flex items-center gap-1.5">
                        <span>{t('emergencyStatus.resolutionProgress')}</span>
                        <span className="text-outline-variant">•</span>
                        <span className="text-secondary font-bold">{accident.status}</span>
                      </span>
                      <span className="font-black text-emerald-700 text-sm">{pct}%</span>
                    </div>
                    <div className="w-full h-3 bg-surface-container-high rounded-full overflow-hidden p-0.5 border border-outline-variant/60">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 rounded-full transition-all duration-500 ease-out shadow-xs"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-4 pt-1">
                {timelineSteps.map((step, idx) => {
                  const isCompleted = step.completed;
                  const isCurrent = step.isCurrent;

                  return (
                    <div key={idx} className="flex items-start gap-3.5 relative">
                      {idx !== timelineSteps.length - 1 && (
                        <div
                          className={`absolute left-3 top-6 bottom-0 w-0.5 transition-colors duration-300 ${
                            isCompleted && !isCurrent ? 'bg-emerald-500' : 'bg-surface-container-high'
                          }`}
                        ></div>
                      )}

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 z-10 font-bold transition-all ${
                          isCurrent
                            ? 'bg-emerald-600 text-white ring-4 ring-emerald-400/30 shadow-md animate-pulse'
                            : isCompleted
                            ? 'bg-emerald-500 text-white'
                            : 'bg-surface-container-high text-on-surface-variant/60'
                        }`}
                      >
                        {isCompleted ? '✓' : idx + 1}
                      </div>

                      <div className="flex-1 flex justify-between items-start text-xs py-0.5 min-w-0">
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`transition-colors ${
                                isCurrent
                                  ? 'text-emerald-700 font-black text-xs'
                                  : isCompleted
                                  ? 'text-on-surface font-extrabold'
                                  : 'text-on-surface-variant/60 font-medium'
                              }`}
                            >
                              {step.title}
                            </span>
                            {isCurrent && (
                              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-600 text-white px-2 py-0.5 rounded-full shadow-xs">
                                {t('emergencyStatus.currentStage')}
                              </span>
                            )}
                          </div>
                          <p className={`text-[11px] leading-tight ${
                            isCurrent
                              ? 'text-emerald-800 font-medium'
                              : isCompleted
                              ? 'text-on-surface-variant font-normal'
                              : 'text-on-surface-variant/40 font-normal'
                          }`}>
                            {step.desc}
                          </p>
                        </div>

                        <span
                          className={`text-[10px] font-extrabold shrink-0 ml-2 ${
                            isCurrent
                              ? 'text-emerald-700 font-black'
                              : isCompleted
                              ? 'text-emerald-700'
                              : 'text-on-surface-variant/40'
                          }`}
                        >
                          {isCurrent ? t('emergencyStatus.inProgress') : isCompleted ? t('emergencyStatus.completed') : t('emergencyStatus.pending')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Safety Instructions while waiting */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>{t('emergencyStatus.whileWaiting')}</span>
              </div>
              <ul className="text-[11px] text-amber-800 space-y-1 list-disc list-inside">
                <li>{t('emergencyStatus.safetyInstruction1')}</li>
                <li>{t('emergencyStatus.safetyInstruction2')}</li>
                <li>{t('emergencyStatus.safetyInstruction3')}</li>
              </ul>
            </div>
          </>
        )}

        {/* Return to Dashboard */}
        <div className="pt-2">
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-surface-container-high text-on-surface font-bold text-xs rounded-2xl hover:bg-surface-container-highest transition-colors"
          >
            {t('emergencyStatus.returnToDashboard')}
          </button>
        </div>
      </main>
    </div>
  );
};
