import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface PendingReport {
  id: string; // local unique id
  reporter_id: string;
  latitude: number;
  longitude: number;
  address: string;
  severity: string;
  description: string;
  blood_group: string;
  timestamp: string;
}

export const useNetworkSync = () => {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingReports();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check in case there are pending reports right on load
    if (navigator.onLine) {
      syncPendingReports();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncPendingReports = async () => {
    if (isSyncing) return;
    
    const reportsJson = localStorage.getItem('rescuelink_pending_reports');
    if (!reportsJson) return;

    try {
      const pendingReports: PendingReport[] = JSON.parse(reportsJson);
      if (pendingReports.length === 0) return;

      setIsSyncing(true);
      const remainingReports: PendingReport[] = [];

      for (const report of pendingReports) {
        try {
          const { error } = await supabase.from('accidents').insert([{
            reporter_id: report.reporter_id,
            latitude: report.latitude,
            longitude: report.longitude,
            address: report.address,
            severity: report.severity,
            description: report.description,
            blood_group: report.blood_group,
            status: 'SOS Sent',
          }]);

          if (error) {
            console.error(`[Offline Sync] Failed to sync report ${report.id}:`, error);
            remainingReports.push(report); // keep it to try again later
          } else {
            console.log(`[Offline Sync] Successfully synced report ${report.id}`);
          }
        } catch (e) {
          console.error(`[Offline Sync] Exception syncing report ${report.id}:`, e);
          remainingReports.push(report);
        }
      }

      // Update queue with only the ones that failed
      localStorage.setItem('rescuelink_pending_reports', JSON.stringify(remainingReports));
    } catch (e) {
      console.error('[Offline Sync] Failed to parse pending reports:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  return { isOnline, isSyncing };
};
