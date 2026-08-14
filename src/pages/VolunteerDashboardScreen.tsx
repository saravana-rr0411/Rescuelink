import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { Button } from '../components/ui/Button';

import { MapPin, Radio, CheckCircle, Navigation, Clock, Loader2, Camera, AlertCircle, Hospital as HospitalIcon, Ambulance, PhoneCall, CheckSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';
import { GoogleMap } from '../components/maps/GoogleMap';
import { HospitalSelectorSheet } from '../components/common/HospitalSelectorSheet';
import type { Hospital as HospitalType } from '../utils/routing';
import { saveStoredHospital, getStoredHospital, cleanDescriptionText } from '../utils/routing';
import { calculateHaversineDistance } from '../utils/distance';
import { SpinnerLoader, EmptyState, CardSkeleton } from '../components/common/SkeletonLoader';
import { Inbox } from 'lucide-react';
import { useTranslation } from 'react-i18next';

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
  blood_group?: string | null;
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

export const VolunteerDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, avatarUrl } = useProfile();
  const { t } = useTranslation();
  const [isOnDuty, setIsOnDuty] = useState(true);

  // Data States
  const [rawIncidents, setRawIncidents] = useState<AccidentRecord[]>([]);
  const [assignedMissions, setAssignedMissions] = useState<AccidentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Volunteer Live GPS State for 10km Filtering
  const [volunteerLocation, setVolunteerLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setVolunteerLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        console.warn('[RescueLink GPS Dashboard] Volunteer location tracking error:', err.message);
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 5000 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const incidents = useMemo(() => {
    if (!volunteerLocation) return [];
    return rawIncidents.filter((inc) => {
      if (inc.latitude == null || inc.longitude == null) return false;
      const dist = calculateHaversineDistance(
        volunteerLocation.lat,
        volunteerLocation.lng,
        inc.latitude,
        inc.longitude
      );
      return dist <= 10000;
    });
  }, [rawIncidents, volunteerLocation]);

  // Action States
  const [respondingId, setRespondingId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hospitalSheetMission, setHospitalSheetMission] = useState<AccidentRecord | null>(null);

  // Helper to request and obtain current volunteer GPS coordinates
  const getVolunteerPosition = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!('geolocation' in navigator)) {
        console.warn('[RescueLink GPS] Geolocation API not supported by browser.');
        resolve(null);
        return;
      }
      console.log('[RescueLink GPS] Requesting volunteer GPS location permission...');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          console.log('[RescueLink GPS] Volunteer GPS permission granted. Current coordinates:', coords);
          resolve(coords);
        },
        (err) => {
          console.warn('[RescueLink GPS] Volunteer GPS permission declined or failed:', err.message);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  };

  const isFinishedStatus = (status?: string | null): boolean => {
    if (!status) return false;
    const s = status.trim();
    return (
      s === 'Emergency Completed' ||
      s === 'Emergency Resolved' ||
      s === 'Completed' ||
      s === 'Problem Resolved' ||
      s === 'Resolved'
    );
  };

  // 1. Fetch both unassigned reported accidents and assigned volunteer missions on open
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        console.log('[RescueLink Volunteer] Fetching active accident feeds from Supabase...');

        // Fetch only active non-completed reported accidents directly from Supabase
        const { data: reportedData, error: reportedError } = await supabase
          .from('accidents')
          .select('*')
          .not('status', 'in', '("Emergency Completed","Emergency Resolved","Completed","Problem Resolved","Resolved")')
          .order('created_at', { ascending: false });

        if (reportedError) {
          console.error('[RescueLink Volunteer] Error fetching reported accidents:', reportedError.code, reportedError.message, reportedError.details);
          console.error('[RescueLink Volunteer] ⚠️ If code=42501 (insufficient_privilege) the RLS SELECT policy is blocking volunteers. Run the updated accidents_schema.sql in Supabase SQL Editor.');
        } else if (reportedData) {
          console.log('[RescueLink Volunteer] Raw records returned from Supabase:', reportedData.length, reportedData.map(r => ({ id: r.id, status: r.status, volunteer_id: r.volunteer_id })));
          const activeOnly = reportedData.filter((item) => !isFinishedStatus(item.status));
          console.log('[RescueLink Volunteer] Active (non-finished) records after filter:', activeOnly.length);

          const unassigned = activeOnly.filter((item) => !item.volunteer_id || item.volunteer_id !== user?.id);
          console.log('[RescueLink Volunteer] Incidents (unassigned feed):', unassigned.length);
          setRawIncidents(unassigned);

          if (user) {
            const myMissions = activeOnly.filter((item) => item.volunteer_id === user.id);
            console.log('[RescueLink Volunteer] My assigned missions:', myMissions.length);
            setAssignedMissions(myMissions);
          }
        }
      } catch (err) {
        console.error('[RescueLink Volunteer] Unexpected error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [user]);

  // 2. Supabase Realtime Channel Subscription for Volunteer Dashboard
  useEffect(() => {
    console.log('[RescueLink Realtime] Subscribing to volunteer dashboard realtime accidents channel...');

    const channel = supabase
      .channel('volunteer_dashboard_feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accidents',
        },
        (payload) => {
          console.log('[RescueLink Realtime] Volunteer dashboard received event:', payload.eventType, payload);

          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setRawIncidents((prev) => prev.filter((item) => item.id !== deletedId));
              setAssignedMissions((prev) => prev.filter((m) => m.id !== deletedId));
            }
            return;
          }

          const newRecord = payload.new as AccidentRecord;
          if (!newRecord) return;

          if (payload.eventType === 'INSERT') {
            console.log('[RescueLink Realtime] New accident INSERT received:', { id: newRecord.id, status: newRecord.status, volunteer_id: newRecord.volunteer_id, latitude: newRecord.latitude, longitude: newRecord.longitude });
            if (!isFinishedStatus(newRecord.status)) {
              // Show in feed if unassigned or assigned to someone else (not this volunteer)
              if (!newRecord.volunteer_id || newRecord.volunteer_id !== user?.id) {
                setRawIncidents((prev) => {
                  if (prev.some((item) => item.id === newRecord.id)) {
                    console.log('[RescueLink Realtime] INSERT ignored – already in incidents list:', newRecord.id);
                    return prev;
                  }
                  console.log('[RescueLink Realtime] ✅ Adding new incident to dashboard feed:', newRecord.id, newRecord.status);
                  return [newRecord, ...prev];
                });
              }
            } else {
              console.warn('[RescueLink Realtime] INSERT ignored – status is finished:', newRecord.status);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (isFinishedStatus(newRecord.status)) {
              // Immediately remove completed/resolved incident across all connected dashboards
              setRawIncidents((prev) => prev.filter((item) => item.id !== newRecord.id));
              setAssignedMissions((prev) => prev.filter((m) => m.id !== newRecord.id));
              return;
            }

            // Realtime update for nearby alerts feed
            setRawIncidents((prev) => {
              if (newRecord.volunteer_id) {
                return prev.filter((item) => item.id !== newRecord.id);
              }
              const exists = prev.some((item) => item.id === newRecord.id);
              if (exists) {
                return prev.map((item) => (item.id === newRecord.id ? newRecord : item));
              }
              return [newRecord, ...prev];
            });

            // Realtime update for current logged-in volunteer's assigned missions
            if (user && newRecord.volunteer_id === user.id) {
              setAssignedMissions((prev) => {
                const exists = prev.some((m) => m.id === newRecord.id);
                if (exists) {
                  return prev.map((m) => (m.id === newRecord.id ? newRecord : m));
                }
                return [newRecord, ...prev];
              });
            } else if (user && newRecord.volunteer_id && newRecord.volunteer_id !== user.id) {
              setAssignedMissions((prev) => prev.filter((m) => m.id !== newRecord.id));
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[RescueLink Realtime] Volunteer dashboard channel subscription status:', status);
        if (err) {
          console.warn('[RescueLink Realtime] Volunteer dashboard subscription error:', err);
        }
      });

    return () => {
      console.log('[RescueLink Realtime] Unsubscribing from volunteer dashboard channel...');
      supabase.removeChannel(channel);
    };
  }, [user]);

  // 3. Continuous Live Volunteer Location Tracking while responding to active missions
  useEffect(() => {
    if (!user || assignedMissions.length === 0) return;

    console.log('[RescueLink GPS Tracking] Starting continuous live GPS updates for active responder missions...');

    const trackingInterval = setInterval(async () => {
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const currentLat = pos.coords.latitude;
            const currentLng = pos.coords.longitude;
            console.log('[RescueLink GPS Live] Current volunteer coordinates:', { latitude: currentLat, longitude: currentLng });

            // Update volunteer_latitude & volunteer_longitude in public.accidents for all active assigned missions
            for (const mission of assignedMissions) {
              const { error: updateErr } = await supabase
                .from('accidents')
                .update({
                  volunteer_latitude: currentLat,
                  volunteer_longitude: currentLng,
                })
                .eq('id', mission.id);

              if (updateErr) {
                console.error(`[RescueLink GPS Live] Supabase location update error for accident ID ${mission.id}:`, updateErr);
              } else {
                console.log(`[RescueLink GPS Live] Supabase location update succeeded for accident ID ${mission.id}:`, {
                  volunteer_latitude: currentLat,
                  volunteer_longitude: currentLng,
                });
              }
            }
          },
          (err) => {
            console.warn('[RescueLink GPS Live] Geolocation error:', err.message);
          },
          { enableHighAccuracy: true }
        );
      }
    }, 6000);

    // Stop tracking automatically when Emergency Resolved or volunteer unmounts/leaves
    return () => {
      console.log('[RescueLink GPS Tracking] Stopping volunteer live location tracking (Missions resolved or screen unmounted).');
      clearInterval(trackingInterval);
    };
  }, [user, assignedMissions]);

  // Helper to format ISO timestamp into user-friendly time
  const formatReportedTime = (isoString: string): string => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // 1. Accept Emergency Request with Exclusive Volunteer Check & Atomic Lock
  const handleAcceptMission = async (accidentId: string) => {
    if (!user) {
      setErrorMessage(t('volunteerDashboard.mustBeLoggedInToAccept'));
      return;
    }

    setRespondingId(accidentId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      console.log('[RescueLink Volunteer] Accepting emergency request for accident ID:', accidentId);

      // AVOID REDUNDANT PRE-CHECK: The atomic UPDATE below safely handles race conditions.

      // Use existing volunteerLocation if available to avoid blocking on GPS hardware
      let pos = volunteerLocation;
      if (!pos) {
        console.log('[RescueLink Volunteer] Cached location unavailable, requesting fallback GPS...');
        pos = await getVolunteerPosition();
      }

      if (!pos) {
        setRespondingId(null);
        setErrorMessage(t('volunteerDashboard.gpsPermissionRequired'));
        return;
      }

      const updatePayload: any = {
        status: 'Volunteer Assigned',
        volunteer_id: user.id,
        volunteer_latitude: pos.lat,
        volunteer_longitude: pos.lng,
        accepted_at: new Date().toISOString(),
      };

      // Atomic Update: Only update if volunteer_id IS NULL
      const { data, error } = await supabase
        .from('accidents')
        .update(updatePayload)
        .eq('id', accidentId)
        .is('volunteer_id', null)
        .select()
        .single();

      setRespondingId(null);

      if (error || !data) {
        console.warn('[RescueLink Volunteer] Request already accepted by another volunteer.');
        setErrorMessage(t('volunteerDashboard.alreadyAccepted'));

        const { data: fresh } = await supabase.from('accidents').select('*').eq('id', accidentId).single();
        if (fresh) {
          setRawIncidents((prev) => prev.map((item) => (item.id === accidentId ? fresh : item)));
        }
        return;
      }

      console.log('[RescueLink Volunteer] Successfully assigned volunteer & saved status:', data);
      setSuccessMessage(t('volunteerDashboard.missionAccepted'));

      setRawIncidents((prev) => prev.filter((item) => item.id !== accidentId));
      setAssignedMissions((prev) => [data, ...prev]);

      setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);

      // Automatically launch Live Navigation
      navigate(`/navigation/${accidentId}`, {
        state: {
          accidentId: data.id,
          latitude: data.latitude,
          longitude: data.longitude,
          address: data.address,
          severity: data.severity,
          mode: 'volunteer',
        },
      });
    } catch (err: any) {
      console.error('[RescueLink Volunteer] Unexpected error during assignment:', err);
      setErrorMessage(t('volunteerDashboard.unexpectedErrorAccepting'));
      setRespondingId(null);
    }
  };



  const handleCompleteEmergency = async (accidentId: string) => {
    setUpdatingStatusId(accidentId);
    setErrorMessage(null);
    try {
      console.log(`[RescueLink Volunteer] Marking accident ${accidentId} as completed`);
      const { error } = await supabase
        .from('accidents')
        .update({ status: 'Emergency Completed', completed_at: new Date().toISOString() })
        .eq('id', accidentId);
      
      if (error) throw error;
      
      setSuccessMessage(t('volunteerDashboard.emergencyMarkedCompleted'));
      setAssignedMissions((prev) => prev.filter(m => m.id !== accidentId));
      
      setTimeout(() => setSuccessMessage(null), 2500);
    } catch (err: any) {
      console.error('[RescueLink Workflow] Failed to complete emergency:', err);
      setErrorMessage(err.message || t('volunteerDashboard.failedToComplete'));
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleConfirmHospitalSelection = async (hospital: HospitalType) => {
    if (!hospitalSheetMission) return;
    const missionId = hospitalSheetMission.id;

    console.log('[RescueLink Workflow] Hospital selected:', hospital.name, 'for accident ID:', missionId);


    try {
      // 1. Save stored hospital locally
      saveStoredHospital(missionId, {
        id: hospital.id,
        name: hospital.name,
        address: hospital.address,
        latitude: hospital.latitude,
        longitude: hospital.longitude,
        phone: hospital.phone,
        distanceMeters: hospital.distanceMeters,
      });

      const cleanDesc = cleanDescriptionText(hospitalSheetMission.description);
      const phoneNum = hospital.phone || (hospital as any).internationalPhone || null;

      // 2. Save hospital details into public.accidents row without automatically changing status
      const { data, error } = await supabase
        .from('accidents')
        .update({
          hospital_name: hospital.name,
          hospital_address: hospital.address,
          hospital_phone: phoneNum,
          hospital_latitude: hospital.latitude,
          hospital_longitude: hospital.longitude,
          description: cleanDesc,
        })
        .eq('id', missionId)
        .select()
        .single();

      console.log('VOLUNTEER missionId =', missionId);
      console.log('[VOLUNTEER UPDATE RETURNED DATA]:', {
        missionId,
        'data.id': data?.id,
        'data.status': data?.status,
        'data.hospital_name': data?.hospital_name,
        'data.hospital_address': data?.hospital_address,
        'data.hospital_phone': data?.hospital_phone,
        'data.hospital_latitude': data?.hospital_latitude,
        'data.hospital_longitude': data?.hospital_longitude,
        error: error ? { code: error.code, message: error.message, details: error.details } : null,
      });

      if (!error && data) {
        // Fresh SELECT immediately after UPDATE succeeds using the SAME missionId
        const { data: verifyData, error: verifyError } = await supabase
          .from('accidents')
          .select('id,status,hospital_name,hospital_address,hospital_phone,hospital_latitude,hospital_longitude')
          .eq('id', missionId)
          .single();

        console.log('[VOLUNTEER FRESH SELECT RESULT]:', {
          verifyData,
          verifyError: verifyError ? { code: verifyError.code, message: verifyError.message } : null,
        });

        setAssignedMissions((prev) =>
          prev.map((m) =>
            m.id === missionId
              ? {
                ...m,
                hospital_name: hospital.name,
                hospital_address: hospital.address,
                hospital_phone: phoneNum,
                hospital_latitude: hospital.latitude,
                hospital_longitude: hospital.longitude,
                description: cleanDesc,
              }
              : m
          )
        );
        setSuccessMessage(`${t('volunteerDashboard.hospitalSelectedPrefix')} ${hospital.name}${t('volunteerDashboard.clickEnRoute')}`);
      } else if (error) {
        console.error('[RescueLink Volunteer] Error saving hospital selection:', error.message);
        setErrorMessage(`Error: ${error.message}`);
      }
    } catch (err: any) {
      console.error('[RescueLink Volunteer] Failed to save hospital choice:', err);
      setErrorMessage(t('volunteerDashboard.failedToUpdateHospital'));
    } finally {

      setHospitalSheetMission(null);
      setTimeout(() => {
        setSuccessMessage(null);
        setErrorMessage(null);
      }, 3000);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50">
      <Navbar
        title={t('volunteerDashboard.volunteerHq')}
        showBack
        rightAction={
          <button
            onClick={() => navigate('/volunteer/history')}
            className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container text-primary font-black text-xs rounded-full border border-outline-variant/60 shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            aria-label="View Volunteer History"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{t('volunteerDashboard.history')}</span>
          </button>
        }
      />

      <main className="flex-1 px-4 py-4 space-y-5">
        {/* On Duty Toggle Banner */}
        <div className={`p-4 sm:p-5 rounded-3xl text-white shadow-sm transition-all flex items-center justify-between gap-3 ${isOnDuty ? 'bg-gradient-to-r from-red-800 to-rose-900' : 'bg-white text-slate-800 border border-slate-200/80'
          }`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white/40 shadow-xs flex items-center justify-center bg-rose-700 text-white font-extrabold text-lg aspect-square">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={profile?.full_name || 'Volunteer Avatar'}
                  className="w-full h-full object-cover shrink-0 rounded-full aspect-square"
                />
              ) : (
                <span>{profile?.full_name?.charAt(0) || 'V'}</span>
              )}
            </div>

            <div className="space-y-0.5 min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <Radio className={`w-3.5 h-3.5 shrink-0 ${isOnDuty ? 'animate-pulse text-rose-200' : 'text-slate-400'}`} />
                <span className={`text-[10px] font-extrabold uppercase tracking-wider truncate ${isOnDuty ? 'text-rose-100' : 'text-slate-500'}`}>
                  {isOnDuty ? t('volunteerDashboard.onDutyActive') : t('volunteerDashboard.offDuty')}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold truncate leading-tight">
                {profile?.full_name || (isOnDuty ? t('volunteerDashboard.readyToAccept') : t('volunteerDashboard.standbyMode'))}
              </h2>
              <p className={`text-[11px] font-medium truncate ${isOnDuty ? 'text-rose-100' : 'text-slate-500'}`}>
                {t('volunteerDashboard.responseRadius')} <span className="font-bold">10 km</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOnDuty(!isOnDuty)}
            className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs shadow-xs transition-all active:scale-95 shrink-0 ${isOnDuty ? 'bg-white text-red-900 hover:bg-rose-50' : 'bg-red-800 text-white hover:bg-red-900'
              }`}
          >
            {isOnDuty ? t('volunteerDashboard.goOffDuty') : t('volunteerDashboard.goOnDuty')}
          </button>
        </div>

        {/* Quick Emergency Communications Card */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-red-700 flex items-center justify-center shrink-0">
              <Ambulance className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">{t('volunteerDashboard.callAmbulance108')}</h3>
              <p className="text-[11px] text-slate-500 font-medium">{t('volunteerDashboard.open108Dialer')}</p>
            </div>
          </div>

          <a
            href="tel:108"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 active:scale-95 shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
            <span>{t('volunteerDashboard.call108')}</span>
          </a>
        </div>



        {errorMessage && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold rounded-2xl flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* SECTION 1: Active Assigned Missions (Volunteer Status Updates & Google Map) */}
        {assignedMissions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                <span>{t('volunteerDashboard.activeAssignedMissions')} ({assignedMissions.length})</span>
              </h2>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                {t('volunteerDashboard.liveGpsActive')}
              </span>
            </div>

            <div className="space-y-4">
              {assignedMissions.map((mission) => (
                <div key={mission.id} className="bg-white border border-emerald-500/40 rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5 w-fit">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        {t('volunteerDashboard.missionAcceptedLabel')}
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-900 mt-2">{mission.address}</h3>
                      <div className="mt-1.5 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5 w-fit">
                        <span>{t('volunteerDashboard.patientBloodGroup')}</span>
                        <span className="font-black text-rose-900">{mission.blood_group || t('volunteerDashboard.notProvided')}</span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-rose-50 text-red-700 border border-rose-200 px-2.5 py-0.5 rounded-full font-bold uppercase shrink-0">
                      {mission.severity}
                    </span>
                  </div>

                  {/* Google Map with Marker & Navigation */}
                  {mission.latitude !== null && mission.longitude !== null && (
                    <div className="w-full h-48 rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs relative">
                      <GoogleMap
                        center={{ lat: mission.latitude, lng: mission.longitude }}
                        zoom={15}
                        markers={[
                          {
                            id: mission.id,
                            lat: mission.latitude,
                            lng: mission.longitude,
                            title: `${mission.severity} ACCIDENT: ${mission.address}`,
                            type: 'accident' as const,
                          },
                        ]}
                        className="w-full h-full"
                      />
                    </div>
                  )}

                  {mission.description && (
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {cleanDescriptionText(mission.description)}
                    </p>
                  )}

                  {/* Dedicated Selected Hospital Section */}
                  {(() => {
                    const hosp = getStoredHospital(mission.id);
                    if (!hosp && mission.status !== 'Transporting to Hospital') return null;

                    const name = hosp?.name || t('volunteerDashboard.nearestRegionalCenter');
                    const address = hosp?.address || mission.address;
                    const phoneNum = hosp?.phone || hosp?.internationalPhone;

                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white space-y-2.5 border border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700 flex items-center gap-1">
                            <HospitalIcon className="w-3.5 h-3.5 text-emerald-300" />
                            {t('volunteerDashboard.selectedHospital')}
                          </span>
                          {hosp?.rating && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                              ★ {hosp.rating}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 pt-0.5">
                          <HospitalIcon className="w-4 h-4 text-emerald-300 shrink-0" />
                          <span>{name}</span>
                        </h4>
                        <p className="text-xs text-slate-300 font-medium truncate">
                          📍 {address}
                        </p>
                        <p className="text-xs font-bold text-emerald-300 flex items-center gap-1 pt-1 border-t border-slate-800">
                          <span>{t('volunteerDashboard.hospitalPhone')}</span>
                          <span className="font-extrabold text-white">{phoneNum || t('volunteerDashboard.unavailable')}</span>
                        </p>
                      </div>
                    );
                  })()}

                  {/* Mission Communication Actions Panel */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      {t('volunteerDashboard.missionActions')}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* 1. Call Ambulance (108) */}
                      <a
                        href="tel:108"
                        className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors active:scale-95"
                      >
                        <Ambulance className="w-4 h-4 text-red-600 shrink-0" />
                        <span>{t('volunteerDashboard.callAmbulance108')}</span>
                      </a>

                      {/* 2. Call Selected Hospital (Displayed ONLY after hospital is selected) */}
                      {(() => {
                        const hosp = getStoredHospital(mission.id);
                        const isHospitalSelected = !!hosp || mission.status === 'Transporting to Hospital';
                        if (!isHospitalSelected) return null;

                        const phoneNum = hosp?.phone || hosp?.internationalPhone;

                        return phoneNum ? (
                          <a
                            href={`tel:${phoneNum}`}
                            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-sm transition-colors active:scale-95 border border-blue-600"
                          >
                            <PhoneCall className="w-4 h-4 text-white shrink-0" />
                            <span>{t('volunteerDashboard.callHospital')}</span>
                          </a>
                        ) : (
                          <button
                            disabled
                            className="py-2.5 px-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                          >
                            <PhoneCall className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>{t('volunteerDashboard.hospitalPhoneUnavailable')}</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Scene Photo Preview if present */}
                  {mission.photo_url && (
                    <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-32">
                      <img src={mission.photo_url} alt="Scene Evidence" loading="lazy" decoding="async" className="w-full h-28 object-cover" />
                    </div>
                  )}

                  {/* Status Action Buttons & Resume Navigation */}
                  <div className="pt-3 border-t border-slate-100 space-y-2.5">
                    {mission.status !== 'Hospital Reached' ? (
                      <Button
                        type="button"
                        onClick={() => {
                          navigate(`/navigation/${mission.id}`, {
                            state: {
                              accidentId: mission.id,
                              latitude: mission.latitude,
                              longitude: mission.longitude,
                              address: mission.address,
                              severity: mission.severity,
                              mode: 'volunteer',
                            },
                          });
                        }}
                        variant="primary"
                        fullWidth
                        leftIcon={<Navigation className="w-4 h-4" />}
                      >
                        {t('volunteerDashboard.resumeNavigation')}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        disabled={updatingStatusId === mission.id}
                        onClick={() => handleCompleteEmergency(mission.id)}
                        variant="success"
                        fullWidth
                        leftIcon={
                          updatingStatusId === mission.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckSquare className="w-4 h-4" />
                          )
                        }
                      >
                        {t('volunteerDashboard.completeEmergency')}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 2: Active Emergency Broadcast List (Unassigned Reported Incidents with Google Maps) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
              {t('volunteerDashboard.nearbyActiveAlerts')} ({incidents.length})
            </h2>
            <span className="text-[11px] font-bold text-red-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              {t('volunteerDashboard.liveBroadcastFeed')}
            </span>
          </div>

          {!isOnDuty ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 text-center space-y-2 shadow-xs">
              <Radio className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-800">{t('volunteerDashboard.currentlyOffDuty')}</p>
              <p className="text-[11px] text-slate-500">{t('volunteerDashboard.toggleDutySwitch')}</p>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              <SpinnerLoader message={t('volunteerDashboard.fetchingIncidents')} />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : incidents.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title={t('volunteerDashboard.noActiveIncidents')}
              description={t('volunteerDashboard.noActiveIncidentsDesc')}
            />
          ) : (
            <div className="space-y-4">
              {incidents.map((inc) => {
                const isAccepting = respondingId === inc.id;
                const isAssignedToOther = !!inc.volunteer_id && inc.volunteer_id !== user?.id;

                return (
                  <div
                    key={inc.id}
                    className={`bg-white border rounded-2xl p-5 shadow-sm space-y-3.5 transition-all ${isAssignedToOther ? 'border-amber-200 bg-amber-50/30 opacity-90' : 'border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold bg-rose-50 text-red-700 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                          {inc.severity} {t('volunteerDashboard.priority')}
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900 mt-1.5">
                          {t('volunteerDashboard.emergencySosIncident')}
                        </h3>
                        <div className="mt-1.5 text-[11px] font-bold text-rose-800 bg-rose-50 border border-rose-200/80 px-2.5 py-1 rounded-xl flex items-center gap-1.5 w-fit">
                          <span>{t('volunteerDashboard.patientBloodGroup')}</span>
                          <span className="font-black text-rose-900">{inc.blood_group || t('volunteerDashboard.notProvided')}</span>
                        </div>
                      </div>
                      <span className="text-xs text-slate-500 font-medium flex items-center gap-1 shrink-0">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {formatReportedTime(inc.created_at)}
                      </span>
                    </div>

                    {/* Interactive Google Map Preview */}
                    {inc.latitude !== null && inc.longitude !== null && (
                      <div className="w-full h-44 rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs relative">
                        <GoogleMap
                          center={{ lat: inc.latitude, lng: inc.longitude }}
                          zoom={15}
                          markers={[
                            {
                              id: inc.id,
                              lat: inc.latitude,
                              lng: inc.longitude,
                              title: `${inc.severity} ACCIDENT: ${inc.address}`,
                              type: 'accident' as const,
                            },
                          ]}
                          className="w-full h-full"
                        />
                      </div>
                    )}

                    {inc.description && cleanDescriptionText(inc.description) && (
                      <p className="text-xs text-slate-600 font-medium leading-relaxed">
                        {cleanDescriptionText(inc.description)}
                      </p>
                    )}

                    {/* Accident Photo if available */}
                    {inc.photo_url && (
                      <div className="space-y-1 pt-1">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5 text-slate-400" />
                          {t('volunteerDashboard.incidentScenePhoto')}
                        </span>
                        <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 max-h-40">
                          <img src={inc.photo_url} alt="Accident Evidence" loading="lazy" decoding="async" className="w-full h-36 object-cover" />
                        </div>
                      </div>
                    )}

                    <div className="space-y-3 pt-2.5 border-t border-slate-100">
                      {/* Full Accident Address (up to 2 lines, never truncated) */}
                      <div className="flex items-start gap-1.5 text-xs text-slate-700 font-semibold leading-relaxed">
                        <MapPin className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{inc.address}</span>
                      </div>

                      {/* Action Buttons placed below location */}
                      {isAssignedToOther ? (
                        <div className="px-3 py-2 rounded-xl font-bold text-xs bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1.5 w-full">
                          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{t('volunteerDashboard.alreadyAccepted')}</span>
                        </div>
                      ) : (
                        <div className="pt-0.5">

                          <Button
                            type="button"
                            onClick={() => handleAcceptMission(inc.id)}
                            disabled={isAccepting}
                            variant="primary"
                            fullWidth
                            leftIcon={
                              isAccepting ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Navigation className="w-4 h-4" />
                              )
                            }
                          >
                            {isAccepting ? t('volunteerDashboard.accepting') : t('volunteerDashboard.acceptMission')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {hospitalSheetMission && (
        <HospitalSelectorSheet
          isOpen={!!hospitalSheetMission}
          onClose={() => setHospitalSheetMission(null)}
          accidentLatitude={hospitalSheetMission.latitude ?? 0}
          accidentLongitude={hospitalSheetMission.longitude ?? 0}
          onSelectHospital={handleConfirmHospitalSelection}
        />
      )}
    </div>
  );
};
