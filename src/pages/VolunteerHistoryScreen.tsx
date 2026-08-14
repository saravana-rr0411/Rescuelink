import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { getStoredHospital } from '../utils/routing';
import { formatSupabaseError } from '../utils/locationGuard';
import { SpinnerLoader, EmptyState, CardSkeleton } from '../components/common/SkeletonLoader';
import {
  Clock,
  MapPin,
  ChevronRight,
  User,
  Hospital as HospitalIcon,
  CheckCircle2,
  Award,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface HistoryAccidentRecord {
  id: string;
  reporter_id: string;
  volunteer_id?: string | null;
  latitude: number | null;
  longitude: number | null;
  address: string;
  severity: string;
  description: string | null;
  status: string;
  created_at: string;
  accepted_at?: string | null;
  arrived_at?: string | null;
  transported_at?: string | null;
  hospital_reached_at?: string | null;
  completed_at?: string | null;
  citizen_name?: string;
}

export const VolunteerHistoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [historyItems, setHistoryItems] = useState<HistoryAccidentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const fetchVolunteerHistory = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const { data, error } = await supabase
        .from('accidents')
        .select('*')
        .eq('volunteer_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        setErrorMessage(formatSupabaseError(error, 'Failed to load mission history. Please try again.'));
        setHistoryItems([]);
      } else if (data && data.length > 0) {
        // Fetch reporter profile names for items with reporter_id
        const reporterIds = Array.from(
          new Set(data.map((item) => item.reporter_id).filter(Boolean))
        ) as string[];

        let reporterProfilesMap: Record<string, string> = {};

        if (reporterIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('auth_user_id, full_name')
            .in('auth_user_id', reporterIds);

          if (profiles) {
            profiles.forEach((p) => {
              if (p.auth_user_id && p.full_name) {
                reporterProfilesMap[p.auth_user_id] = p.full_name;
              }
            });
          }
        }

        const enriched = data.map((item) => ({
          ...item,
          citizen_name: item.reporter_id
            ? reporterProfilesMap[item.reporter_id] || 'Anonymous Citizen'
            : 'Anonymous Citizen',
        }));

        setHistoryItems(enriched);
      } else {
        setHistoryItems([]);
      }
    } catch (err) {
      console.error('[RescueLink Volunteer History] Unexpected error:', err);
      setErrorMessage('Failed to load mission history. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchVolunteerHistory();
  }, [fetchVolunteerHistory]);

  const formatDate = (isoString: string): string => {
    if (!isoString) return 'N/A';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const calculateTotalResponseTime = (item: HistoryAccidentRecord): string => {
    if (!item.created_at) return 'N/A';
    const startTime = item.accepted_at
      ? new Date(item.accepted_at).getTime()
      : new Date(item.created_at).getTime();

    const endTime = item.completed_at
      ? new Date(item.completed_at).getTime()
      : item.hospital_reached_at
      ? new Date(item.hospital_reached_at).getTime()
      : null;

    if (!endTime) return 'Active Mission';
    const diffMins = Math.max(1, Math.round((endTime - startTime) / (1000 * 60)));
    if (diffMins < 60) return `${diffMins} mins`;
    const hours = Math.floor(diffMins / 60);
    const remMins = diffMins % 60;
    return `${hours}h ${remMins}m`;
  };

  return (
    <div className="flex flex-col min-h-full bg-surface">
      <Navbar title={t('volunteerDashboard.history.missionHistory')} showBack />

      <main className="flex-1 px-4 py-4 space-y-4">
        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl text-xs font-semibold text-rose-900 flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={fetchVolunteerHistory}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center gap-1 shrink-0 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('volunteerDashboard.history.retry')}</span>
            </button>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            <SpinnerLoader message="Loading rescue history..." />
            <CardSkeleton />
            <CardSkeleton />
            <CardSkeleton />
          </div>
        ) : historyItems.length === 0 ? (
          <EmptyState
            icon={Award}
            title={t('volunteerDashboard.history.noHistory')}
            description={t("volunteerDashboard.history.emptyDescription")}
            actionText="Go to Volunteer Dashboard"
            onAction={() => navigate('/volunteer')}
          />
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-extrabold text-on-surface uppercase tracking-wider">
                Missions Handled ({historyItems.length})
              </h2>
            </div>

            {historyItems.map((item) => {
              const hosp = getStoredHospital(item.id);
              const isCompleted =
                item.status === 'Emergency Completed' || item.status === 'Emergency Resolved';

              return (
                <div
                  key={item.id}
                  className="bg-surface-container-lowest p-4.5 rounded-3xl border border-outline-variant/60 shadow-level-1 space-y-3 transition-all hover:shadow-level-2 animate-card-enter"
                >
                  {/* Top Info Bar */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-rose-50 text-red-700 border border-rose-200 px-2.5 py-0.5 rounded-full">
                      {item.severity} SEVERITY
                    </span>
                    <span
                      key={item.status}
                      className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1 animate-badge-pop ${
                        isCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                      {item.status}
                    </span>
                  </div>

                  {/* Address & Date */}
                  <div>
                    <h3 className="text-sm font-extrabold text-on-surface flex items-start gap-1.5 leading-snug">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <span>{item.address}</span>
                    </h3>
                    <p className="text-[11px] font-medium text-on-surface-variant flex items-center gap-1 mt-1 pl-5">
                      <Clock className="w-3.5 h-3.5 text-outline" />
                      <span>{formatDate(item.created_at)}</span>
                    </p>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-surface-container-low p-3 rounded-2xl border border-outline-variant/40">
                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant block uppercase tracking-wider">
                        Citizen Reporter
                      </span>
                      <span className="font-extrabold text-on-surface flex items-center gap-1 mt-0.5 truncate">
                        <User className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{item.citizen_name || 'Citizen'}</span>
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-on-surface-variant block uppercase tracking-wider">
                        Destination Hospital
                      </span>
                      <span className="font-extrabold text-on-surface flex items-center gap-1 mt-0.5 truncate">
                        <HospitalIcon className="w-3.5 h-3.5 text-tertiary shrink-0" />
                        <span className="truncate">{hosp?.name || 'Not Assigned'}</span>
                      </span>
                    </div>

                    <div className="col-span-2 pt-1 border-t border-outline-variant/40 flex items-center justify-between text-[11px]">
                      <span className="text-on-surface-variant font-medium">{t('volunteerDashboard.history.rescueTime')}</span>
                      <span className="font-extrabold text-secondary">
                        ⏱ {calculateTotalResponseTime(item)}
                      </span>
                    </div>
                  </div>

                  {/* View Details Button */}
                  <button
                    onClick={() => navigate(`/volunteer/history/${item.id}`)}
                    className="w-full py-2.5 bg-surface-container-high hover:bg-surface-container text-primary font-black text-xs rounded-2xl border border-outline-variant/60 shadow-xs transition-colors flex items-center justify-center gap-1 btn-press"
                  >
                    <span>{t('volunteerDashboard.history.viewRecord')}</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default VolunteerHistoryScreen;
