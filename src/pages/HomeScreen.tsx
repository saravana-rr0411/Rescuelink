import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { SOSButton } from '../components/ui/SOSButton';
import { mockUserProfile } from '../data/mockData';
import { Stethoscope, Car, Flame, ShieldAlert, BookOpen, Scale, PhoneCall, ShieldCheck, MapPin, Clock, ChevronRight, Loader2, Radio } from 'lucide-react';
import { supabase } from '../lib/supabase';

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
  const [accidents, setAccidents] = useState<AccidentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const categories = [
    { id: 'medical', title: 'Medical Alert', icon: Stethoscope, color: 'bg-red-100 text-red-700 border-red-200' },
    { id: 'accident', title: 'Car Accident', icon: Car, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'fire', title: 'Fire Alert', icon: Flame, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { id: 'crime', title: 'Safety Hazard', icon: ShieldAlert, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ];

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

  // 1. Fetch initial active accidents where status != 'Emergency Resolved'
  useEffect(() => {
    async function fetchActiveAccidents() {
      setLoading(true);
      try {
        console.log('[RescueLink Home] Fetching active accidents from public.accidents table...');
        const { data, error } = await supabase
          .from('accidents')
          .select('*')
          .neq('status', 'Emergency Resolved')
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

          if (payload.eventType === 'INSERT') {
            if (newRecord && newRecord.status !== 'Emergency Resolved') {
              setAccidents((prev) => {
                if (prev.some((a) => a.id === newRecord.id)) return prev;
                return [newRecord, ...prev];
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            if (!newRecord) return;
            if (newRecord.status === 'Emergency Resolved') {
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
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 px-4 py-4 space-y-6">
        {/* Banner: Local Status */}
        <div className="bg-gradient-to-r from-primary to-primary-container text-white p-4 rounded-3xl shadow-level-2 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-red-200" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-100">RescueLink Active</span>
            </div>
            <h2 className="text-lg font-extrabold leading-snug">14 Responders Nearby</h2>
            <p className="text-xs text-red-100">Average response time: <span className="font-bold underline">4.2 minutes</span></p>
          </div>
          <button 
            onClick={() => navigate('/volunteer')}
            className="bg-white text-primary text-xs font-bold px-3 py-2 rounded-xl shadow-sm hover:bg-red-50 transition-colors shrink-0"
          >
            Volunteer Mode
          </button>
        </div>

        {/* SOS Central Trigger */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/40 shadow-level-1 text-center">
          <h2 className="text-base font-bold text-on-surface mb-1">In an Immediate Emergency?</h2>
          <p className="text-xs text-on-surface-variant mb-2">Tap below for automatic GPS dispatch & audio SOS</p>
          <SOSButton />
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
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/50 text-center space-y-2">
              <Loader2 className="w-6 h-6 text-primary animate-spin mx-auto" />
              <p className="text-xs font-semibold text-on-surface-variant">Loading live emergency alerts...</p>
            </div>
          ) : accidents.length === 0 ? (
            /* Requirement 7: Friendly empty state */
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/50 text-center space-y-2">
              <Radio className="w-8 h-8 text-outline mx-auto" />
              <p className="text-xs font-bold text-on-surface">No Active Nearby Alerts</p>
              <p className="text-[11px] text-on-surface-variant">Monitoring live emergency channel for new incidents.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {accidents.map((incident) => (
                <div
                  key={incident.id}
                  onClick={() => navigate('/status', { state: { accidentId: incident.id } })}
                  className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-4 shadow-level-1 hover:shadow-level-2 transition-all cursor-pointer group"
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
                    <span className="text-[10px] font-extrabold bg-blue-100 text-blue-900 px-2.5 py-1 rounded-full uppercase">
                      {incident.status}
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
                          navigate('/status', { state: { accidentId: incident.id } });
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
        </div>

        {/* Primary Contact Hotline */}
        <div className="bg-surface-container-high p-4 rounded-2xl flex items-center justify-between border border-outline-variant/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">Emergency Hotline Contact</p>
              <p className="text-[11px] text-on-surface-variant">{mockUserProfile.emergencyContacts[0].name} ({mockUserProfile.emergencyContacts[0].relation})</p>
            </div>
          </div>
          <a
            href={`tel:${mockUserProfile.emergencyContacts[0].phone}`}
            className="bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs hover:bg-primary-hover transition-colors"
          >
            Call
          </a>
        </div>
      </main>
    </div>
  );
};
