import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';
import {
  registerServiceWorker,
  requestNotificationPermission,
  triggerPushNotification,
} from '../utils/serviceWorker';
import { CITIZEN_STATUS_NOTIFICATIONS } from '../utils/notificationTypes';

export interface NotificationItem {
  id: string; // Maps to notification_id
  notification_id?: string;
  user_id?: string;
  accident_id?: string;
  related_emergency_id?: string;
  title: string;
  message: string;
  status_type?: string;
  type: 'emergency' | 'volunteer' | 'hospital' | 'system' | 'resolved';
  is_read: boolean;
  created_at: string;
}

interface NotificationContextType {
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  permissionStatus: NotificationPermission | 'default';
  requestPermission: () => Promise<NotificationPermission>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  addNotification: (notification: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'rescuelink_notifications_fallback';
const PROCESSED_KEYS_KEY = 'rescuelink_processed_notif_keys';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'default'>('default');

  // Deduplication set to prevent duplicate notifications for the same status update
  const processedKeysRef = useRef<Set<string>>(new Set());

  // Load deduplication keys from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(PROCESSED_KEYS_KEY);
      if (stored) {
        const arr: string[] = JSON.parse(stored);
        processedKeysRef.current = new Set(arr);
      }
    } catch {
      // ignore
    }
  }, []);

  const saveProcessedKeys = () => {
    try {
      const arr = Array.from(processedKeysRef.current).slice(-200);
      localStorage.setItem(PROCESSED_KEYS_KEY, JSON.stringify(arr));
    } catch {
      // ignore
    }
  };

  // Register Service Worker on mount
  useEffect(() => {
    registerServiceWorker();

    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Listen for Service Worker notification click messages
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        const targetUrl = event.data.url || '/status';
        window.focus();
        window.location.href = targetUrl;
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage);
    };
  }, []);

  // Request browser notification permission
  const handleRequestPermission = useCallback(async (): Promise<NotificationPermission> => {
    const status = await requestNotificationPermission();
    setPermissionStatus(status);
    return status;
  }, []);

  // Auto-request permission on user login if not decided yet
  useEffect(() => {
    if (user && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        handleRequestPermission();
      }
    }
  }, [user, handleRequestPermission]);

  // Load notifications from Supabase or LocalStorage fallback
  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      if (user) {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .or(`user_id.eq.${user.id},user_id.is.null`)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const mapped = data.map((d: any) => ({
            id: d.id || d.notification_id || `notif-${Date.now()}`,
            notification_id: d.notification_id || d.id,
            user_id: d.user_id,
            accident_id: d.accident_id || d.related_emergency_id,
            related_emergency_id: d.related_emergency_id || d.accident_id,
            title: d.title,
            message: d.message,
            status_type: d.status_type || d.type,
            type: d.type || (d.status_type === 'case_completed' ? 'resolved' : d.status_type === 'patient_picked' || d.status_type === 'hospital_reached' ? 'hospital' : 'volunteer'),
            is_read: Boolean(d.is_read),
            created_at: d.created_at || new Date().toISOString(),
          }));

          setNotifications(mapped as NotificationItem[]);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('[NotificationContext] Supabase fetch error, fallback to local storage:', err);
    }

    // Fallback: LocalStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
      } else {
        setNotifications([]);
      }
    } catch (e) {
      console.warn('[NotificationContext] Local storage parse error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Helper to add a notification & trigger Push
  const addNotification = useCallback(
    async (item: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>) => {
      const notifId = `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
      const createdAt = new Date().toISOString();
      const targetUserId = item.user_id || user?.id;
      const accidentId = item.accident_id || item.related_emergency_id;
      const statusType = item.status_type || item.type;

      const newItem: NotificationItem = {
        id: notifId,
        notification_id: notifId,
        user_id: targetUserId,
        accident_id: accidentId,
        related_emergency_id: accidentId,
        title: item.title,
        message: item.message,
        status_type: statusType,
        type: item.type,
        is_read: false,
        created_at: createdAt,
      };

      // 1. Trigger Push Notification via Service Worker / Browser API
      triggerPushNotification({
        title: newItem.title,
        message: newItem.message,
        accident_id: newItem.accident_id,
        status_type: newItem.status_type,
        timestamp: newItem.created_at,
      });

      // 2. Update state immediately
      setNotifications((prev) => [newItem, ...prev]);

      // 3. Insert record into Supabase
      try {
        await supabase.from('notifications').insert([
          {
            id: notifId,
            notification_id: notifId,
            user_id: targetUserId,
            accident_id: accidentId,
            related_emergency_id: accidentId,
            title: newItem.title,
            message: newItem.message,
            status_type: statusType,
            type: newItem.type,
            is_read: false,
            created_at: createdAt,
          },
        ]);
      } catch (err) {
        console.warn('[NotificationContext] Supabase insert fallback to local storage:', err);
      }

      // 4. Update LocalStorage fallback
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        const parsed: NotificationItem[] = stored ? JSON.parse(stored) : [];
        const updated = [newItem, ...parsed];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
      } catch (e) {
        console.warn('[NotificationContext] Local storage write error:', e);
      }
    },
    [user]
  );

  // Mark a single notification as read
  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id || n.notification_id === id ? { ...n, is_read: true } : n))
    );

    try {
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .or(`id.eq.${id},notification_id.eq.${id}`);
    } catch (err) {
      console.warn('[NotificationContext] Supabase update is_read failed:', err);
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: NotificationItem[] = JSON.parse(stored);
        const updated = parsed.map((n) => (n.id === id || n.notification_id === id ? { ...n, is_read: true } : n));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('[NotificationContext] Local storage update error:', e);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));

    try {
      if (user) {
        await supabase
          .from('notifications')
          .update({ is_read: true })
          .or(`user_id.eq.${user.id},user_id.is.null`);
      }
    } catch (err) {
      console.warn('[NotificationContext] Supabase markAllAsRead failed:', err);
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: NotificationItem[] = JSON.parse(stored);
        const updated = parsed.map((n) => ({ ...n, is_read: true }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('[NotificationContext] Local storage mark all read error:', e);
    }
  };

  // Supabase Realtime Subscription for accidents updates -> Auto-generate Push Notifications for Citizen
  useEffect(() => {
    if (!user) return;

    console.log('[Notification Realtime] Subscribing to public.accidents live events for user:', user.id);

    const accidentChannel = supabase
      .channel(`citizen_accidents_channel_${user.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'accidents' },
        (payload) => {
          if (!payload.new) return;
          const updatedAccident = payload.new as any;

          // Requirement 10: Ensure notifications are delivered only to the citizen who created the accident report
          if (updatedAccident.reporter_id !== user.id) {
            return;
          }

          const rawStatus = updatedAccident.status;
          const config = CITIZEN_STATUS_NOTIFICATIONS[rawStatus];

          if (!config) {
            return;
          }

          // Requirement 9: Prevent duplicate notifications if the same status update is received multiple times
          const dedupeKey = `${updatedAccident.id}_${config.statusType}`;
          if (processedKeysRef.current.has(dedupeKey)) {
            console.log('[Notification Realtime] Duplicate notification prevented for key:', dedupeKey);
            return;
          }

          processedKeysRef.current.add(dedupeKey);
          saveProcessedKeys();

          console.log('[Notification Realtime] Citizen Push Notification triggered:', config.title);

          addNotification({
            user_id: user.id,
            accident_id: updatedAccident.id,
            related_emergency_id: updatedAccident.id,
            title: config.title,
            message: config.message,
            status_type: config.statusType,
            type: config.type,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(accidentChannel);
    };
  }, [user, addNotification]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        permissionStatus,
        requestPermission: handleRequestPermission,
        markAsRead,
        markAllAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
