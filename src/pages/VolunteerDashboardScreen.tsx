import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { mockUserProfile } from '../data/mockData';
import { ShieldCheck, MapPin, Radio, CheckCircle, Navigation, Award, HeartPulse, Clock, Loader2, Camera, AlertCircle, Hospital as HospitalIcon, CheckSquare, Ambulance, PhoneCall, Maximize2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabase';
import { GoogleMap } from '../components/maps/GoogleMap';
import { HospitalSelectorSheet } from '../components/common/HospitalSelectorSheet';
import type { Hospital as HospitalType } from '../utils/routing';
import { saveStoredHospital, getStoredHospital, cleanDescriptionText, formatETA, getStatusRank } from '../utils/routing';
import { formatDistance } from '../utils/distance';
import { SpinnerLoader, EmptyState, CardSkeleton } from '../components/common/SkeletonLoader';
import { Inbox } from 'lucide-react';

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
  created_at: string;
  updated_at: string;
}

export const VolunteerDashboardScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile, avatarUrl } = useProfile();
  const [isOnDuty, setIsOnDuty] = useState(true);

  // Data States
  const [incidents, setIncidents] = useState<AccidentRecord[]>([]);
  const [assignedMissions, setAssignedMissions] = useState<AccidentRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
          console.warn('[RescueLink Volunteer] Error fetching reported accidents:', reportedError.message);
        } else if (reportedData) {
          const activeOnly = reportedData.filter((item) => !isFinishedStatus(item.status));

          setIncidents(activeOnly.filter((item) => !item.volunteer_id || item.volunteer_id !== user?.id));
          if (user) {
            setAssignedMissions(activeOnly.filter((item) => item.volunteer_id === user.id));
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
              setIncidents((prev) => prev.filter((item) => item.id !== deletedId));
              setAssignedMissions((prev) => prev.filter((m) => m.id !== deletedId));
            }
            return;
          }

          const newRecord = payload.new as AccidentRecord;
          if (!newRecord) return;

          if (payload.eventType === 'INSERT') {
            if (!isFinishedStatus(newRecord.status)) {
              if (!newRecord.volunteer_id || newRecord.volunteer_id !== user?.id) {
                setIncidents((prev) => {
                  if (prev.some((item) => item.id === newRecord.id)) return prev;
                  return [newRecord, ...prev];
                });
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            if (isFinishedStatus(newRecord.status)) {
              // Immediately remove completed/resolved incident across all connected dashboards
              setIncidents((prev) => prev.filter((item) => item.id !== newRecord.id));
              setAssignedMissions((prev) => prev.filter((m) => m.id !== newRecord.id));
              return;
            }

            // Realtime update for nearby alerts feed
            setIncidents((prev) => {
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
      setErrorMessage('You must be logged in as a responder to accept alerts.');
      return;
    }

    setRespondingId(accidentId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      console.log('[RescueLink Volunteer] Accepting emergency request for accident ID:', accidentId);

      // Pre-check: Fetch latest record from database to verify if already assigned
      const { data: latest } = await supabase
        .from('accidents')
        .select('volunteer_id, status')
        .eq('id', accidentId)
        .single();

      if (latest && latest.volunteer_id && latest.volunteer_id !== user.id) {
        setRespondingId(null);
        setErrorMessage('Already accepted by another volunteer.');
        setIncidents((prev) =>
          prev.map((item) => (item.id === accidentId ? { ...item, volunteer_id: latest.volunteer_id, status: latest.status } : item))
        );
        return;
      }

      // Request GPS permission & get volunteer current location
      const pos = await getVolunteerPosition();

      if (!pos) {
        setRespondingId(null);
        setErrorMessage('GPS permission is required to accept emergency rescue missions. Please enable location access in your browser.');
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
        setErrorMessage('Already accepted by another volunteer.');

        const { data: fresh } = await supabase.from('accidents').select('*').eq('id', accidentId).single();
        if (fresh) {
          setIncidents((prev) => prev.map((item) => (item.id === accidentId ? fresh : item)));
        }
        return;
      }

      console.log('[RescueLink Volunteer] Successfully assigned volunteer & saved status:', data);
      setSuccessMessage('You have accepted this emergency request.');

      setIncidents((prev) => prev.filter((item) => item.id !== accidentId));
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
      setErrorMessage('An unexpected error occurred while accepting the alert.');
      setRespondingId(null);
    }
  };

  // 2. Update Emergency Status Actions (Ambulance Requested, Ambulance Dispatched, Hospital Notified, Emergency Resolved)
  const handleUpdateStatus = async (accidentId: string, newStatus: string) => {
    if (!user) return;

    const targetMission = assignedMissions.find((m) => m.id === accidentId);
    if (targetMission) {
      const currentRank = getStatusRank(targetMission.status);
      const targetRank = getStatusRank(newStatus);

      // Programmatic Guard: Enforce strict one-way progression!
      if (targetRank <= currentRank) {
        console.warn(`[RescueLink Workflow Guard] Rejected backward/duplicate transition from "${targetMission.status}" (rank ${currentRank}) to "${newStatus}" (rank ${targetRank}).`);
        setErrorMessage(`Cannot move backward from "${targetMission.status}" to "${newStatus}". Workflow is strictly one-way.`);
        setTimeout(() => setErrorMessage(null), 3000);
        return;
      }
    }

    setUpdatingStatusId(accidentId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      console.log(`[RescueLink Volunteer] Updating accident ${accidentId} status to: ${newStatus}`);

      const nowIso = new Date().toISOString();
      const statusPayload: any = { status: newStatus };

      if (newStatus === 'Volunteer Arrived' || newStatus === 'Arrived at Scene') {
        statusPayload.arrived_at = nowIso;
      } else if (newStatus === 'Hospital Reached') {
        statusPayload.hospital_reached_at = nowIso;
      } else if (newStatus === 'Emergency Completed' || newStatus === 'Emergency Resolved') {
        statusPayload.completed_at = nowIso;
      }

      const { data, error } = await supabase
        .from('accidents')
        .update(statusPayload)
        .eq('id', accidentId)
        .select()
        .single();

      setUpdatingStatusId(null);

      if (error) {
        console.error('[RescueLink Volunteer] Failed to update status. Exact error:', error);
        setErrorMessage(`Failed to update status: ${error.message || 'Database error occurred'}`);
        return;
      }

      console.log('[RescueLink Volunteer] Status updated successfully in public.accidents:', data);
      setSuccessMessage(`Status updated to "${newStatus}".`);

      const targetMission = assignedMissions.find((m) => m.id === accidentId);

      setAssignedMissions((prev) =>
        prev
          .map((m) => (m.id === accidentId ? { ...m, status: newStatus } : m))
          .filter((m) => newStatus !== 'Emergency Resolved' && newStatus !== 'Emergency Completed' || m.id !== accidentId)
      );

      // Automatically trigger Hospital Selector when Arrived at Scene
      if (newStatus === 'Arrived at Scene' && targetMission) {
        setHospitalSheetMission(targetMission);
      }

      setTimeout(() => {
        setSuccessMessage(null);
      }, 2500);
    } catch (err: any) {
      console.error('[RescueLink Volunteer] Unexpected error updating status:', err);
      setErrorMessage('An error occurred while updating status.');
      setUpdatingStatusId(null);
    }
  };

  const handleConfirmHospitalSelection = async (hospital: HospitalType) => {
    if (!hospitalSheetMission) return;
    const missionId = hospitalSheetMission.id;

    setUpdatingStatusId(missionId);
    try {
      // 1. Save hospital separately without appending to description
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

      // 2. Update status in database keeping description clean
      const { data, error } = await supabase
        .from('accidents')
        .update({
          status: 'Transporting to Hospital',
          description: cleanDesc,
          transported_at: new Date().toISOString(),
        })
        .eq('id', missionId)
        .select()
        .single();

      if (!error && data) {
        setAssignedMissions((prev) =>
          prev.map((m) =>
            m.id === missionId
              ? {
                  ...m,
                  status: 'Transporting to Hospital',
                  description: cleanDesc,
                }
              : m
          )
        );
        setSuccessMessage(`Hospital Selected: ${hospital.name}. Status updated to Transporting to Hospital.`);
      } else if (error) {
        console.error('[RescueLink Volunteer] Error updating status:', error.message);
        setErrorMessage(`Error: ${error.message}`);
      }
    } catch (err: any) {
      console.error('[RescueLink Volunteer] Failed to save hospital choice:', err);
      setErrorMessage('Failed to update hospital destination.');
    } finally {
      setUpdatingStatusId(null);
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
        title="Volunteer Responder HQ"
        showBack
        rightAction={
          <button
            onClick={() => navigate('/volunteer/history')}
            className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container text-primary font-black text-xs rounded-full border border-outline-variant/60 shadow-xs transition-all active:scale-95 flex items-center gap-1.5"
            aria-label="View Volunteer History"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        }
      />

      <main className="flex-1 px-4 py-4 space-y-5">
        {/* On Duty Toggle Banner */}
        <div className={`p-4 sm:p-5 rounded-3xl text-white shadow-sm transition-all flex items-center justify-between gap-3 ${
          isOnDuty ? 'bg-gradient-to-r from-red-800 to-rose-900' : 'bg-white text-slate-800 border border-slate-200/80'
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
                  {isOnDuty ? 'ON-DUTY BROADCAST ACTIVE' : 'RESPONDER OFF-DUTY'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold truncate leading-tight">
                {profile?.full_name || (isOnDuty ? 'Ready to Accept Alerts' : 'Standby Mode')}
              </h2>
              <p className={`text-[11px] font-medium truncate ${isOnDuty ? 'text-rose-100' : 'text-slate-500'}`}>
                Response Radius: <span className="font-bold">{mockUserProfile.responseRadiusKm} km</span>
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsOnDuty(!isOnDuty)}
            className={`px-3.5 py-2.5 rounded-2xl font-extrabold text-xs shadow-xs transition-all active:scale-95 shrink-0 ${
              isOnDuty ? 'bg-white text-red-900 hover:bg-rose-50' : 'bg-red-800 text-white hover:bg-red-900'
            }`}
          >
            {isOnDuty ? 'Go Off Duty' : 'Go On Duty'}
          </button>
        </div>

        {/* Quick Emergency Communications Card */}
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-red-700 flex items-center justify-center shrink-0">
              <Ambulance className="w-5 h-5 text-red-700" />
            </div>
            <div>
              <h3 className="text-xs font-extrabold text-slate-900">Call Ambulance (108)</h3>
              <p className="text-[11px] text-slate-500 font-medium">Open 108 emergency phone dialer</p>
            </div>
          </div>

          <a
            href="tel:108"
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 font-extrabold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 active:scale-95 shrink-0"
          >
            <PhoneCall className="w-3.5 h-3.5 text-blue-600" />
            <span>Call 108</span>
          </a>
        </div>

        {/* Impact Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-1">
            <div className="w-8 h-8 rounded-full bg-rose-50 text-red-700 flex items-center justify-center mx-auto">
              <Award className="w-4 h-4" />
            </div>
            <p className="text-base font-extrabold text-slate-900">12</p>
            <p className="text-[10px] text-slate-500 font-medium">Missions</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-1">
            <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto">
              <HeartPulse className="w-4 h-4" />
            </div>
            <p className="text-base font-extrabold text-slate-900">4.1m</p>
            <p className="text-[10px] text-slate-500 font-medium">Avg Response</p>
          </div>

          <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs text-center space-y-1">
            <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <p className="text-base font-extrabold text-slate-900">Lvl 2</p>
            <p className="text-[10px] text-slate-500 font-medium">Certified</p>
          </div>
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
                <span>Your Active Assigned Missions ({assignedMissions.length})</span>
              </h2>
              <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                Live GPS Active
              </span>
            </div>

            <div className="space-y-4">
              {assignedMissions.map((mission) => (
                <div key={mission.id} className="bg-white border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-sm space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-300 px-2.5 py-1 rounded-full uppercase tracking-wide flex items-center gap-1.5 w-fit">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                        Mission Accepted
                      </span>
                      <h3 className="font-extrabold text-sm text-slate-900 mt-2">{mission.address}</h3>
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

                    const name = hosp?.name || 'Nearest Regional Emergency Center';
                    const address = hosp?.address || mission.address;
                    const phoneNum = hosp?.phone || hosp?.internationalPhone;

                    return (
                      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950 text-white space-y-2.5 border border-slate-800 shadow-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-extrabold uppercase text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700 flex items-center gap-1">
                            <HospitalIcon className="w-3.5 h-3.5 text-emerald-300" />
                            Selected Hospital
                          </span>
                          {hosp?.rating && (
                            <span className="text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-500/30">
                              ★ {hosp.rating}
                            </span>
                          )}
                        </div>
                        <h4 className="text-sm font-extrabold text-white flex items-center gap-1.5 pt-0.5">
                          <span>🏥</span>
                          <span>{name}</span>
                        </h4>
                        <p className="text-xs text-slate-300 font-medium truncate">
                          📍 {address}
                        </p>
                        <p className="text-xs font-bold text-emerald-300 flex items-center gap-1 pt-1 border-t border-slate-800">
                          <span>☎ Hospital Phone:</span>
                          <span className="font-extrabold text-white">{phoneNum || 'Unavailable'}</span>
                        </p>
                      </div>
                    );
                  })()}

                  {/* Mission Communication Actions Panel */}
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
                    <p className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                      Mission Actions
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* 1. Call Ambulance (108) */}
                      <a
                        href="tel:108"
                        className="py-2.5 px-3 bg-white hover:bg-slate-100 text-slate-900 border border-slate-200/80 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs transition-colors active:scale-95"
                      >
                        <Ambulance className="w-4 h-4 text-red-600 shrink-0" />
                        <span>🚑 Call Ambulance (108)</span>
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
                            className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-colors active:scale-95 border border-blue-500"
                          >
                            <PhoneCall className="w-4 h-4 text-white shrink-0" />
                            <span>📞 Call Hospital</span>
                          </a>
                        ) : (
                          <button
                            disabled
                            className="py-2.5 px-3 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                          >
                            <PhoneCall className="w-4 h-4 text-slate-400 shrink-0" />
                            <span>Hospital phone number unavailable</span>
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
                    {/* Primary Resume Navigation Button */}
                    <button
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
                      className="w-full p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-2 active:scale-95 border border-emerald-500"
                    >
                      <Navigation className="w-4 h-4 text-white fill-white" />
                      <span>▶ Resume Navigation</span>
                    </button>

                    {/* Stage 2: Volunteer Assigned -> Next is Start Navigation (Volunteer En Route) */}
                    {getStatusRank(mission.status) <= 2 && (
                      <button
                        type="button"
                        disabled={updatingStatusId === mission.id}
                        onClick={() => {
                          handleUpdateStatus(mission.id, 'Volunteer En Route');
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
                        className="w-full p-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {updatingStatusId === mission.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Navigation className="w-4 h-4" />
                        )}
                        <span>Start Navigation (Volunteer En Route)</span>
                      </button>
                    )}

                    {/* Stage 3: Volunteer En Route -> Next is Mark Arrived */}
                    {getStatusRank(mission.status) === 3 && (
                      <button
                        type="button"
                        disabled={updatingStatusId === mission.id}
                        onClick={() => handleUpdateStatus(mission.id, 'Volunteer Arrived')}
                        className="w-full p-3 rounded-2xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {updatingStatusId === mission.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckSquare className="w-4 h-4" />
                        )}
                        <span>Mark Volunteer Arrived at Scene</span>
                      </button>
                    )}

                    {/* Stage 4: Volunteer Arrived -> Next is Select Hospital & Start Transport */}
                    {getStatusRank(mission.status) === 4 && (
                      <button
                        type="button"
                        disabled={updatingStatusId === mission.id}
                        onClick={() => setHospitalSheetMission(mission)}
                        className="w-full p-3 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {updatingStatusId === mission.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <HospitalIcon className="w-4 h-4" />
                        )}
                        <span>Select Hospital & Start Transport</span>
                      </button>
                    )}

                    {/* Stage 5: Transporting to Hospital -> Next is Hospital Reached */}
                    {getStatusRank(mission.status) === 5 && (
                      <button
                        type="button"
                        disabled={updatingStatusId === mission.id}
                        onClick={() => handleUpdateStatus(mission.id, 'Hospital Reached')}
                        className="w-full p-3 rounded-2xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {updatingStatusId === mission.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckSquare className="w-4 h-4" />
                        )}
                        <span>Mark Hospital Reached</span>
                      </button>
                    )}

                    {/* Stage 6: Hospital Reached -> Next is Complete Emergency */}
                    {getStatusRank(mission.status) === 6 && (
                      <button
                        type="button"
                        disabled={updatingStatusId === mission.id}
                        onClick={() => handleUpdateStatus(mission.id, 'Emergency Completed')}
                        className="w-full p-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                        {updatingStatusId === mission.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <CheckSquare className="w-4 h-4" />
                        )}
                        <span>Complete Emergency</span>
                      </button>
                    )}

                    {/* Stage 7: Emergency Completed */}
                    {getStatusRank(mission.status) >= 7 && (
                      <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2">
                        <CheckSquare className="w-4 h-4 text-emerald-600" />
                        <span>Emergency Completed</span>
                      </div>
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
              Nearby Active Alerts ({incidents.length})
            </h2>
            <span className="text-[11px] font-bold text-red-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
              Live Broadcast Feed
            </span>
          </div>

          {!isOnDuty ? (
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 text-center space-y-2 shadow-xs">
              <Radio className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-800">You are currently Off-Duty</p>
              <p className="text-[11px] text-slate-500">Toggle duty switch above to receive emergency alerts.</p>
            </div>
          ) : loading ? (
            <div className="space-y-4">
              <SpinnerLoader message="Fetching incidents..." />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : incidents.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No active incidents."
              description="There are currently no active emergency alerts in your response area. Stand by for broadcasts."
            />
          ) : (
            <div className="space-y-4">
              {incidents.map((inc) => {
                const isAccepting = respondingId === inc.id;
                const isAssignedToOther = !!inc.volunteer_id && inc.volunteer_id !== user?.id;

                return (
                  <div
                    key={inc.id}
                    className={`bg-white border rounded-3xl p-4 sm:p-5 shadow-xs space-y-3.5 transition-all ${
                      isAssignedToOther ? 'border-amber-200 bg-amber-50/30 opacity-90' : 'border-slate-200/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-extrabold bg-rose-50 text-red-700 border border-rose-200 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                          {inc.severity} PRIORITY
                        </span>
                        <h3 className="font-extrabold text-sm text-slate-900 mt-1.5">
                          Emergency SOS Incident
                        </h3>
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
                          Incident Scene Photo
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
                          <span>Already accepted by another volunteer.</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() => navigate(`/volunteer/preview/${inc.id}`, { state: { incident: inc } })}
                            className="w-full py-2.5 px-3 rounded-xl font-extrabold text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 flex items-center justify-center gap-1.5 transition-all active:scale-95"
                          >
                            <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                            <span>Open Map</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleAcceptMission(inc.id)}
                            disabled={isAccepting}
                            className="w-full py-2.5 px-3 rounded-xl font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 bg-red-800 text-white hover:bg-red-900 active:scale-95 disabled:opacity-70"
                          >
                            {isAccepting ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Accepting...</span>
                              </>
                            ) : (
                              <>
                                <Navigation className="w-3.5 h-3.5" />
                                <span>Accept Mission</span>
                              </>
                            )}
                          </button>
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
