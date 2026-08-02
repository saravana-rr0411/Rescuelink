import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { MapPin, PhoneCall, AlertCircle, Loader2, Clock, ShieldAlert, Camera, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { GoogleMapWidget } from '../components/common/GoogleMapWidget';

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
  created_at: string;
  updated_at: string;
}

export const EmergencyStatusScreen: React.FC = () => {
  const navigate = useNavigate();
  const locationState = useLocation().state as { accidentId?: string } | undefined;
  const { user } = useAuth();

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
        let query = supabase
          .from('accidents')
          .select('*')
          .eq('reporter_id', user.id);

        if (locationState?.accidentId) {
          const { data: specificData } = await supabase
            .from('accidents')
            .select('*')
            .eq('id', locationState.accidentId)
            .single();

          if (specificData) {
            setAccident(specificData);
            setLoading(false);
            return;
          }
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.warn('[RescueLink Status] Error fetching latest accident report:', error.message);
        } else if (data) {
          console.log('[RescueLink Status] Loaded latest accident report from Supabase:', data);
          setAccident(data);
        } else {
          setAccident(null);
        }
      } catch (err) {
        console.error('[RescueLink Status] Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLatestAccident();
  }, [user, locationState?.accidentId]);

  // 2. Supabase Realtime Subscription for Live Status Updates
  useEffect(() => {
    if (!accident?.id) return;

    console.log(`[RescueLink Realtime] Subscribing to realtime updates for accident ID: ${accident.id}`);

    const channel = supabase
      .channel(`accident_status_${accident.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'accidents',
          filter: `id=eq.${accident.id}`,
        },
        (payload) => {
          console.log('[RescueLink Realtime] Received live accident status update:', payload.new);
          if (payload.new) {
            setAccident(payload.new as AccidentRecord);
          }
        }
      )
      .subscribe((status, err) => {
        console.log(`[RescueLink Realtime] Channel status for accident ${accident.id}:`, status);
        if (err) {
          console.warn('[RescueLink Realtime] Channel subscription error (falling back to initial data):', err);
        }
      });

    return () => {
      console.log(`[RescueLink Realtime] Unsubscribing from accident channel: ${accident.id}`);
      supabase.removeChannel(channel);
    };
  }, [accident?.id]);

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

  const eta = 4;

  const getTimelineSteps = (status: string, createdAt: string) => {
    const isVolunteerAssigned = ['Volunteer Assigned', 'Ambulance Requested', 'Ambulance Dispatched', 'Hospital Notified', 'Emergency Resolved'].includes(status);
    const isAmbulanceRequested = ['Ambulance Requested', 'Ambulance Dispatched', 'Hospital Notified', 'Emergency Resolved'].includes(status);
    const isAmbulanceDispatched = ['Ambulance Dispatched', 'Hospital Notified', 'Emergency Resolved'].includes(status);
    const isHospitalNotified = ['Hospital Notified', 'Emergency Resolved'].includes(status);
    const isResolved = status === 'Emergency Resolved';

    return [
      { title: 'SOS Broadcast Triggered', time: formatReportedTime(createdAt), completed: true },
      { title: 'Volunteer Responder Assigned', time: isVolunteerAssigned ? 'Assigned' : 'Pending', completed: isVolunteerAssigned },
      { title: 'Ambulance Unit Requested', time: isAmbulanceRequested ? 'Requested' : 'Pending', completed: isAmbulanceRequested },
      { title: 'Ambulance En Route', time: isAmbulanceDispatched ? 'Dispatched' : 'Pending', completed: isAmbulanceDispatched },
      { title: isResolved ? 'Emergency Resolved' : isHospitalNotified ? 'Hospital Emergency Room Notified' : 'Arrived at Emergency Scene', time: isResolved ? 'Completed' : `Est. ${eta} mins`, completed: isResolved || isHospitalNotified },
    ];
  };

  const timelineSteps = accident ? getTimelineSteps(accident.status, accident.created_at) : [];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="Emergency Live Status" showBack />

      <main className="flex-1 px-4 py-4 space-y-5">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-secondary animate-spin mx-auto" />
            <p className="text-xs font-semibold text-on-surface-variant">Loading live emergency status...</p>
          </div>
        ) : !accident ? (
          <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/50 shadow-level-1 text-center space-y-4 my-6">
            <div className="w-16 h-16 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto">
              <ShieldAlert className="w-8 h-8 text-outline" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-on-surface">No active emergency reports.</h2>
              <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                You haven't reported any emergency incidents yet. If an incident occurs, tap below to dispatch emergency units.
              </p>
            </div>
            <button
              onClick={() => navigate('/report')}
              className="px-6 py-3 bg-primary text-white font-extrabold text-xs rounded-xl shadow-level-1 hover:bg-primary-hover transition-colors"
            >
              Report Emergency Now
            </button>
          </div>
        ) : (
          <>
            {/* Active Status Hero Banner */}
            <div className={`p-5 rounded-3xl shadow-level-2 space-y-3 relative overflow-hidden text-white transition-all ${
              accident.status === 'Emergency Resolved'
                ? 'bg-gradient-to-br from-emerald-600 to-teal-800'
                : 'bg-gradient-to-br from-secondary to-blue-700'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-xs flex items-center gap-1.5">
                  {accident.status === 'Emergency Resolved' && <CheckCircle2 className="w-3.5 h-3.5" />}
                  Status: {accident.status}
                </span>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-100">
                  <span className={`w-2 h-2 rounded-full ${accident.status === 'Emergency Resolved' ? 'bg-white' : 'bg-emerald-400 animate-ping'}`}></span>
                  <span className="uppercase font-bold bg-red-500 text-white px-2 py-0.5 rounded-full text-[10px]">
                    {accident.severity}
                  </span>
                </div>
              </div>

              <div className="flex items-baseline justify-between pt-1">
                <div>
                  <p className="text-xs text-blue-100 font-medium">Estimated Arrival Time</p>
                  <h2 className="text-3xl font-extrabold tracking-tight mt-0.5">
                    {accident.status === 'Emergency Resolved' ? 'Resolved' : `${eta} Minutes`}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="text-xs text-blue-100">Reported</p>
                  <p className="text-sm font-bold flex items-center gap-1 text-blue-100 justify-end">
                    <Clock className="w-3.5 h-3.5" />
                    {formatReportedTime(accident.created_at)}
                  </p>
                </div>
              </div>

              <div className="w-full bg-blue-900/40 rounded-full h-2 overflow-hidden">
                <div className={`h-full transition-all duration-500 ${
                  accident.status === 'Emergency Resolved' ? 'w-full bg-emerald-300' : 'w-[70%] bg-emerald-400'
                }`}></div>
              </div>
            </div>

            {/* Interactive Google Map Box */}
            <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/50 p-4 shadow-level-1 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  Accident Location Map
                </span>
                <span className="text-secondary font-semibold flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  Google Maps Active
                </span>
              </div>

              <GoogleMapWidget
                latitude={accident.latitude}
                longitude={accident.longitude}
                address={accident.address}
                severity={accident.severity}
                height="h-56"
                showNavigateBtn={true}
              />

              {/* Photo Preview if attached */}
              {accident.photo_url && (
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-secondary" />
                    Attached Scene Photo
                  </span>
                  <div className="rounded-2xl overflow-hidden border border-outline-variant/60 bg-black/5 max-h-48">
                    <img src={accident.photo_url} alt="Scene Evidence" className="w-full h-44 object-cover" />
                  </div>
                </div>
              )}
            </div>

            {/* Assigned Responder Info Card */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-3">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Assigned Paramedic Team</h3>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-secondary-fixed text-secondary flex items-center justify-center font-bold text-base">
                    A
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-on-surface">Unit 402 - City Emergency Medical</h4>
                    <p className="text-[11px] text-on-surface-variant">Status: <span className="font-bold text-secondary">{accident.status}</span></p>
                  </div>
                </div>
                <a
                  href="tel:911"
                  className="p-3 bg-secondary text-white rounded-2xl shadow-xs hover:bg-secondary/90 transition-colors"
                  aria-label="Call Dispatch"
                >
                  <PhoneCall className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Progress Timeline */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-3">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Dispatch Progress Timeline</h3>

              <div className="space-y-4 pt-1">
                {timelineSteps.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative">
                    {idx !== timelineSteps.length - 1 && (
                      <div className={`absolute left-2.5 top-5 bottom-0 w-0.5 ${step.completed ? 'bg-emerald-500' : 'bg-surface-container-high'}`}></div>
                    )}
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs shrink-0 z-10 ${
                      step.completed ? 'bg-emerald-500 text-white' : 'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {step.completed ? '✓' : idx + 1}
                    </div>
                    <div className="flex-1 flex justify-between items-center text-xs">
                      <span className={`font-semibold ${step.completed ? 'text-on-surface' : 'text-on-surface-variant'}`}>{step.title}</span>
                      <span className="text-[10px] text-on-surface-variant/70 font-medium">{step.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Safety Instructions while waiting */}
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-3xl space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                <AlertCircle className="w-4 h-4 text-amber-700" />
                <span>While Waiting for Arrival</span>
              </div>
              <ul className="text-[11px] text-amber-800 space-y-1 list-disc list-inside">
                <li>Keep caller phone line clear for dispatcher callbacks.</li>
                <li>If safe, turn on outdoor porch lights for nighttime visibility.</li>
                <li>Do not move victims with suspected head/neck injury.</li>
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
            Return to RescueLink Dashboard
          </button>
        </div>
      </main>
    </div>
  );
};
