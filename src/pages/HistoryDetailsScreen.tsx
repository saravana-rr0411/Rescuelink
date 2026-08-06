import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { supabase } from '../lib/supabase';
import { getStoredHospital, cleanDescriptionText } from '../utils/routing';
import { MapWidget } from '../components/common/MapWidget';
import {
  Clock,
  MapPin,
  Loader2,
  UserCheck,
  Hospital as HospitalIcon,
  CheckCircle2,
  AlertCircle,
  PhoneCall,
  ShieldCheck,
  FileText,
} from 'lucide-react';

interface AccidentDetailsRecord {
  id: string;
  reporter_id: string;
  volunteer_id?: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string;
  photo_url?: string | null;
  severity: string;
  description: string | null;
  status: string;
  created_at: string;
  accepted_at?: string | null;
  arrived_at?: string | null;
  transported_at?: string | null;
  hospital_reached_at?: string | null;
  completed_at?: string | null;
}

export const HistoryDetailsScreen: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();

  const [accident, setAccident] = useState<AccidentDetailsRecord | null>(null);
  const [volunteerProfile, setVolunteerProfile] = useState<{ full_name: string; phone_number: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchAccidentDetails() {
      if (!id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('accidents')
          .select('*')
          .eq('id', id)
          .single();

        if (error || !data) {
          console.warn('[RescueLink History Details] Error fetching accident record:', error);
          setAccident(null);
        } else {
          setAccident(data);

          if (data.volunteer_id) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, phone_number')
              .eq('auth_user_id', data.volunteer_id)
              .maybeSingle();

            if (profile) {
              setVolunteerProfile(profile);
            }
          }
        }
      } catch (err) {
        console.error('[RescueLink History Details] Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchAccidentDetails();
  }, [id]);

  const formatTimestamp = (isoString?: string | null): string => {
    if (!isoString) return 'Not Available';
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return 'Not Available';

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const storedHosp = accident ? getStoredHospital(accident.id) : null;

  const timelineSteps = [
    {
      title: 'Accident Reported',
      timestamp: accident?.created_at,
      icon: AlertCircle,
    },
    {
      title: 'Volunteer Accepted',
      timestamp: accident?.accepted_at,
      icon: UserCheck,
    },
    {
      title: 'Volunteer Arrived',
      timestamp: accident?.arrived_at,
      icon: MapPin,
    },
    {
      title: 'Transport Started',
      timestamp: accident?.transported_at,
      icon: HospitalIcon,
    },
    {
      title: 'Hospital Reached',
      timestamp: accident?.hospital_reached_at,
      icon: CheckCircle2,
    },
    {
      title: 'Completed',
      timestamp: accident?.completed_at,
      icon: ShieldCheck,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      <Navbar title="Accident History Details" showBack />

      <main className="flex-1 px-4 py-4 space-y-4">
        {loading ? (
          <div className="p-8 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-secondary animate-spin mx-auto" />
            <p className="text-xs font-semibold text-on-surface-variant">
              Loading accident details...
            </p>
          </div>
        ) : !accident ? (
          <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/50 shadow-level-1 text-center space-y-4 my-6">
            <div className="w-16 h-16 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto">
              <FileText className="w-8 h-8 text-outline" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-on-surface">Record Not Found</h2>
              <p className="text-xs text-on-surface-variant max-w-xs mx-auto">
                The requested accident history record could not be loaded or was removed.
              </p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-primary text-white font-extrabold text-xs rounded-xl shadow-level-1 transition-colors"
            >
              Go Back
            </button>
          </div>
        ) : (
          <>
            {/* Header Hero Card */}
            <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-5 rounded-3xl shadow-level-2 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-500/20 border border-rose-400/40 text-rose-200 px-3 py-1 rounded-full">
                  {accident.severity} SEVERITY
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 px-3 py-1 rounded-full">
                  {accident.status}
                </span>
              </div>

              <div>
                <h1 className="text-base font-black text-white leading-snug">
                  {accident.address}
                </h1>
                {accident.latitude && accident.longitude && (
                  <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>GPS Coordinates: {accident.latitude.toFixed(4)}, {accident.longitude.toFixed(4)}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Interactive Map Component */}
            {accident.latitude && accident.longitude && (
              <div className="bg-surface-container-lowest rounded-3xl border border-outline-variant/50 p-4 shadow-level-1 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-on-surface">
                  <span className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    Incident Map Radar
                  </span>
                </div>
                <MapWidget
                  accidentId={accident.id}
                  latitude={accident.latitude}
                  longitude={accident.longitude}
                  address={accident.address}
                  severity={accident.severity}
                  height="h-48"
                  showNavigateBtn={false}
                  mode="citizen"
                />
              </div>
            )}

            {/* Description Card */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-1.5">
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
                Accident Description
              </span>
              <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                {cleanDescriptionText(accident.description) ||
                  'Emergency incident reported via RescueLink network.'}
              </p>
            </div>

            {/* Volunteer Details Card */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-3">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-secondary" />
                <span>Volunteer Responder Details</span>
              </h3>

              {accident.volunteer_id ? (
                <div className="flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <h4 className="font-extrabold text-on-surface">
                      {volunteerProfile?.full_name || 'Assigned Responder'}
                    </h4>
                    <p className="text-[11px] text-on-surface-variant">
                      Phone: {volunteerProfile?.phone_number || 'Not Disclosed'}
                    </p>
                  </div>
                  {volunteerProfile?.phone_number && (
                    <a
                      href={`tel:${volunteerProfile.phone_number}`}
                      className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-xs hover:bg-emerald-700 transition-colors"
                      aria-label="Call Volunteer"
                    >
                      <PhoneCall className="w-4 h-4" />
                    </a>
                  )}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant font-medium">
                  No volunteer was assigned to this incident.
                </p>
              )}
            </div>

            {/* Hospital Details Card */}
            <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-3">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <HospitalIcon className="w-4 h-4 text-tertiary" />
                <span>Hospital Destination Details</span>
              </h3>

              {storedHosp ? (
                <div className="space-y-1 text-xs">
                  <h4 className="font-extrabold text-on-surface flex items-center gap-1">
                    <span>🏥</span>
                    <span>{storedHosp.name}</span>
                  </h4>
                  <p className="text-[11px] text-on-surface-variant pl-5">
                    {storedHosp.address}
                  </p>
                  {storedHosp.phone && (
                    <p className="text-[11px] text-emerald-700 font-bold pl-5 pt-0.5">
                      Phone: {storedHosp.phone}
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-xs text-on-surface-variant font-medium">
                  No hospital destination was assigned for this record.
                </p>
              )}
            </div>

            {/* Timeline Breakdown Card */}
            <div className="bg-surface-container-lowest p-5 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-4">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-primary" />
                <span>Incident Response Timeline</span>
              </h3>

              <div className="space-y-4 pt-1">
                {timelineSteps.map((step, idx) => {
                  const hasTime = !!step.timestamp;
                  const IconComp = step.icon;

                  return (
                    <div key={idx} className="flex items-start gap-3.5 relative">
                      {idx !== timelineSteps.length - 1 && (
                        <div
                          className={`absolute left-3 top-6 bottom-0 w-0.5 transition-colors ${
                            hasTime ? 'bg-emerald-500' : 'bg-surface-container-high'
                          }`}
                        ></div>
                      )}

                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 z-10 font-bold ${
                          hasTime
                            ? 'bg-emerald-600 text-white'
                            : 'bg-surface-container-high text-on-surface-variant/50'
                        }`}
                      >
                        <IconComp className="w-3.5 h-3.5" />
                      </div>

                      <div className="flex-1 flex justify-between items-center text-xs py-0.5 min-w-0">
                        <span
                          className={`font-bold transition-colors ${
                            hasTime ? 'text-on-surface' : 'text-on-surface-variant/50'
                          }`}
                        >
                          {step.title}
                        </span>
                        <span
                          className={`text-[11px] font-semibold ${
                            hasTime ? 'text-emerald-700 font-bold' : 'text-on-surface-variant/40'
                          }`}
                        >
                          {formatTimestamp(step.timestamp)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
};

export default HistoryDetailsScreen;
