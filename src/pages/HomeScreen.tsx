import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { SOSButton } from '../components/ui/SOSButton';
import { Stethoscope, Car, Flame, ShieldAlert, BookOpen, Scale, PhoneCall, MapPin, Clock, ChevronRight, Loader2, Radio, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { CardSkeleton } from '../components/common/SkeletonLoader';
import { GoogleMap } from '../components/maps/GoogleMap';

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

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [emergencyContact, setEmergencyContact] = useState<{
    name: string;
    phone: string;
    relation: string;
  } | null>(null);
  const [loadingContact, setLoadingContact] = useState(true);

  const categories = [
    { id: 'medical', title: 'Medical Alert', icon: Stethoscope, color: 'bg-red-100 text-red-700 border-red-200' },
    { id: 'accident', title: 'Car Accident', icon: Car, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'fire', title: 'Fire Alert', icon: Flame, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { id: 'crime', title: 'Safety Hazard', icon: ShieldAlert, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ];

  // Fetch logged-in user's emergency contact from Supabase
  useEffect(() => {
    async function fetchUserEmergencyContact() {
      if (!user) {
        setEmergencyContact(null);
        setLoadingContact(false);
        return;
      }
      try {
        const { data } = await supabase
          .from('profiles')
          .select('emergency_contact_name, emergency_contact_phone, emergency_contact_relation')
          .eq('auth_user_id', user.id)
          .maybeSingle();

        if (
          data &&
          data.emergency_contact_name &&
          data.emergency_contact_phone &&
          data.emergency_contact_name.trim() !== '' &&
          data.emergency_contact_phone.trim() !== ''
        ) {
          setEmergencyContact({
            name: data.emergency_contact_name.trim(),
            phone: data.emergency_contact_phone.trim(),
            relation: data.emergency_contact_relation ? data.emergency_contact_relation.trim() : '',
          });
        } else {
          setEmergencyContact(null);
        }
      } catch (err) {
        console.error('[RescueLink Home] Error fetching emergency contact:', err);
        setEmergencyContact(null);
      } finally {
        setLoadingContact(false);
      }
    }

    fetchUserEmergencyContact();
  }, [user]);

  // Helper to format ISO timestamp into relative time ("2 mins ago")
  const formatReportedTime = (isoString: string): string => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} ${diffMins === 1 ? 'min' : 'mins'} ago`;
    if (diffHours < 24) return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  // 1. Fetch initial active accidents where status is not completed
  useEffect(() => {
    async function fetchActiveAccidents() {
      setLoading(true);
      try {
        console.log('[RescueLink Home] Fetching active accidents from public.accidents table...');
        const { data, error } = await supabase
          .from('accidents')
          .select('*')
          .neq('status', 'Emergency Resolved')
          .neq('status', 'Emergency Completed')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('[RescueLink Home] Error fetching active accidents:', error.message);
        } else if (data) {
          console.log('[RescueLink Home] Active accidents loaded from Supabase:', data);
          setAccidents(data);
        }
      } catch (err) {
        console.error('[RescueLink Home] Unexpected error:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchActiveAccidents();
  }, []);

  // 2. Supabase Realtime Subscription for live updates, new reports & resolution removal
  useEffect(() => {
    console.log('[RescueLink Home Realtime] Subscribing to public.accidents live events...');

    const channel = supabase
      .channel('home_accidents_feed')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'accidents',
        },
        (payload) => {
          console.log('[RescueLink Home Realtime] Event payload received:', payload.eventType, payload);
          const newRecord = payload.new as AccidentRecord;
          const isFinished = newRecord?.status === 'Emergency Completed' || newRecord?.status === 'Emergency Resolved' || newRecord?.status === 'Completed';

          if (payload.eventType === 'INSERT') {
            if (newRecord && !isFinished) {
              setAccidents((prev) => {
                if (prev.some((a) => a.id === newRecord.id)) return prev;
                return [newRecord, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            if (!newRecord) return;
            if (isFinished) {
              // Resolved accidents disappear automatically
              setAccidents((prev) => prev.filter((a) => a.id !== newRecord.id));
            } else {
              // Status changes update automatically
              setAccidents((prev) => {
                const exists = prev.some((a) => a.id === newRecord.id);
                if (exists) {
                  return prev.map((a) => (a.id === newRecord.id ? newRecord : a));
                }
                return [newRecord, ...prev];
              });
            }
          } else if (payload.eventType === 'DELETE') {
            const oldRecord = payload.old as { id: string };
            if (oldRecord?.id) {
              setAccidents((prev) => prev.filter((a) => a.id !== oldRecord.id));
            }
          }
        }
      )
      .subscribe((status, err) => {
        console.log('[RescueLink Home Realtime] Subscription status:', status);
        if (err) {
          console.warn('[RescueLink Home Realtime] Subscription error:', err);
        }
      });

    return () => {
      console.log('[RescueLink Home Realtime] Unsubscribing from home accidents channel...');
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="flex flex-col min-h-full">
      <Navbar />

      <main className="flex-1 px-4 py-4 space-y-6">
        {/* SOS Central Trigger */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/40 shadow-level-1 text-center">
          <h2 className="text-base font-bold text-on-surface mb-1">In an Immediate Emergency?</h2>
          <p className="text-xs text-on-surface-variant mb-2">Tap SOS for immediate emergency response.</p>
          <SOSButton onTrigger={() => navigate('/emergency')} />
        </div>

        {/* Quick Emergency Category Dispatch */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Quick Category Dispatch</h2>
            <span className="text-xs text-on-surface-variant font-medium">Select type</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate('/report', { state: { category: cat.id } })}
                  className="bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/40 flex items-center gap-3 hover:border-primary/50 transition-all text-left group"
                >
                  <div className={`p-2.5 rounded-xl ${cat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">{cat.title}</h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">1-Tap Report</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Local Incidents (Live Supabase Data & Realtime Feed) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Active Nearby Alerts</h2>
            <button 
              onClick={() => navigate('/status')}
              className="text-xs font-bold text-primary hover:underline"
            >
              View Status
            </button>
          </div>

          {loading ? (
            <div className="space-y-3">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : accidents.length === 0 ? (
            /* Friendly empty state */
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/50 text-center space-y-2">
              <Radio className="w-8 h-8 text-outline mx-auto" />
              <p className="text-xs font-bold text-on-surface">No Active Nearby Alerts</p>
              <p className="text-[11px] text-on-surface-variant">Monitoring live emergency channel for new incidents.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Live Google Map for Active Alerts */}
              {accidents.some((a) => a.latitude !== null && a.longitude !== null) && (
                <div className="w-full h-48 rounded-2xl overflow-hidden border border-outline-variant/50 shadow-xs mb-1">
                  <GoogleMap
                    center={
                      accidents.find((a) => a.latitude !== null && a.longitude !== null)
                        ? {
                            lat: accidents.find((a) => a.latitude !== null && a.longitude !== null)!.latitude!,
                            lng: accidents.find((a) => a.latitude !== null && a.longitude !== null)!.longitude!,
                          }
                        : { lat: 12.9716, lng: 77.5946 }
                    }
                    zoom={13}
                    markers={accidents
                      .filter((a) => a.latitude !== null && a.longitude !== null)
                      .map((a) => ({
                        id: a.id,
                        lat: a.latitude!,
                        lng: a.longitude!,
                        title: `${a.severity}: ${a.address}`,
                        type: 'accident' as const,
                      }))}
                    className="w-full h-full"
                  />
                </div>
              )}
              {accidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => navigate('/status', { state: { accidentId: incident.id, mode: 'citizen' } })}
                  className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-4 shadow-level-1 hover:shadow-level-2 transition-all cursor-pointer group animate-card-enter"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-0.5 rounded-full uppercase">
                        {incident.severity}
                      </span>
                      <h3 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors mt-1">
                        {incident.address}
                      </h3>
                    </div>
                    <span
                      key={incident.status}
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase animate-badge-pop ${
                      incident.status === 'Reported' || !incident.volunteer_id
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-blue-100 text-blue-900'
                    }`}>
                      {incident.status === 'Reported' || !incident.volunteer_id ? 'Waiting for Volunteer' : incident.status}
                    </span>
                  </div>

                  {incident.description && (
                    <p className="text-xs text-on-surface-variant line-clamp-2 mb-3">
                      {incident.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs text-on-surface-variant/80 pt-2 border-t border-surface-container-high">
                    <div className="flex items-center gap-1.5 font-medium truncate max-w-[55%]">
                      <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="truncate">{incident.address}</span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-secondary" />
                        <span>{formatReportedTime(incident.created_at)}</span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate('/status', { state: { accidentId: incident.id, mode: 'citizen' } });
                        }}
                        className="text-xs font-bold text-primary flex items-center gap-0.5 hover:underline"
                      >
                        <span>View Details</span>
                        <ChevronRight className="w-4 h-4 text-primary group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Knowledge & Protection Shortcuts */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Essential Resources</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/first-aid')}
              className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 hover:shadow-level-2 transition-all text-left flex flex-col justify-between h-28"
            >
              <div className="w-8 h-8 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-on-surface">First Aid Guide</h3>
                <p className="text-[10px] text-on-surface-variant font-medium">CPR & Trauma steps</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/good-samaritan')}
              className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 hover:shadow-level-2 transition-all text-left flex flex-col justify-between h-28"
            >
              <div className="w-8 h-8 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-on-surface">Samaritan Rights</h3>
                <p className="text-[10px] text-on-surface-variant font-medium">Legal protections</p>
              </div>
            </button>
          </div>

          {/* Emergency Response Training Entry Point */}
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 shadow-sm flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-bold text-sm text-on-surface">Emergency Response Training</h3>
              <p className="text-xs text-on-surface-variant mt-1 max-w-sm">
                Learn CPR awareness and practical road accident response.
              </p>
            </div>
            <button
              onClick={() => navigate('/training')}
              className="bg-primary text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs hover:bg-primary-hover transition-colors shrink-0 self-start sm:self-auto"
            >
              Start Learning
            </button>
          </div>
        </div>

        {/* Emergency Contacts Section */}
        <div className="bg-surface-container-high p-4 rounded-2xl border border-outline-variant/60">
          {loadingContact ? (
            <div className="flex items-center gap-3 py-1">
              <Loader2 className="w-5 h-5 animate-spin text-primary shrink-0" />
              <p className="text-xs text-on-surface-variant font-medium">Loading emergency contact...</p>
            </div>
          ) : emergencyContact ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">Emergency Contact</p>
                  <p className="text-[11px] font-semibold text-on-surface">
                    {emergencyContact.name}{' '}
                    {emergencyContact.relation ? `(${emergencyContact.relation})` : ''}
                  </p>
                  <p className="text-[10px] text-on-surface-variant">{emergencyContact.phone}</p>
                </div>
              </div>
              <a
                href={`tel:${emergencyContact.phone}`}
                className="bg-primary text-white text-xs font-bold px-3.5 py-2 rounded-xl shadow-xs hover:bg-primary-hover transition-colors shrink-0"
              >
                Call
              </a>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-surface-container text-on-surface-variant flex items-center justify-center shrink-0">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">Emergency Contact</p>
                  <p className="text-[11px] text-on-surface-variant">No emergency contacts added.</p>
                </div>
              </div>
              <button
                onClick={() => navigate('/profile', { state: { edit: true } })}
                className="bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs hover:bg-primary-hover transition-colors flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Emergency Contact</span>
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

