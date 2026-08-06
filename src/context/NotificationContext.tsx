import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../lib/supabase';

export interface NotificationItem {
  id: string;
  user_id?: string;
  title: string;
  message: string;
  type: 'emergency' | 'volunteer' | 'hospital' | 'system' | 'resolved';
  is_read: boolean;
  created_at: string;
  related_emergency_id?: string;
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

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'default'>('default');

  // Check initial browser notification permission
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      setPermissionStatus(Notification.permission);
    }
  }, []);

  // Request browser notification permission
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const result = await Notification.requestPermission();
        setPermissionStatus(result);
        return result;
      } catch (err) {
        console.warn('[Notification] Permission request failed:', err);
      }
    }
    return 'denied';
  }, []);

  // Auto-request permission on user login/mount
  useEffect(() => {
    if (user && typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        requestPermission();
      }
    }
  }, [user, requestPermission]);

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
          setNotifications(data as NotificationItem[]);
          setLoading(false);
          return;
        }
      }
    } catch (err) {
      console.warn('[Notification] Supabase fetch error, fallback to local storage:', err);
    }

    // Fallback: LocalStorage
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setNotifications(parsed);
      } else {
        // Initial welcome demo notification if empty
        const initialDemo: NotificationItem[] = [
          {
            id: 'demo-1',
            title: '🚨 RescueLink System Active',
            message: 'Emergency network is monitoring active nearby incidents in real time.',
            type: 'system',
            is_read: false,
            created_at: new Date(Date.now() - 10 * 60000).toISOString(),
          },
          {
            id: 'demo-2',
            title: '🏥 Hospital Discovery Ready',
            message: 'Direct emergency room trauma navigation is available.',
            type: 'hospital',
            is_read: false,
            created_at: new Date(Date.now() - 45 * 60000).toISOString(),
          },
        ];
        setNotifications(initialDemo);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initialDemo));
      }
    } catch (e) {
      console.warn('[Notification] Local storage parse failed:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Trigger System Browser Notification
  const triggerBrowserNotification = (title: string, message: string) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/favicon.ico',
        });
      } catch (err) {
        console.warn('[Notification] Browser notification display error:', err);
      }
    }
  };

  // Add a new notification
  const addNotification = useCallback(
    async (item: Omit<NotificationItem, 'id' | 'created_at' | 'is_read'>) => {
      const newItem: NotificationItem = {
        ...item,
        id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        is_read: false,
        created_at: new Date().toISOString(),
        user_id: user?.id,
      };

      // Trigger browser pop-up alert
      triggerBrowserNotification(item.title, item.message);

      // Update state immediately
      setNotifications((prev) => [newItem, ...prev]);

      // Try inserting into Supabase
      try {
        await supabase.from('notifications').insert([{
          id: newItem.id,
          user_id: newItem.user_id,
          title: newItem.title,
          message: newItem.message,
          type: newItem.type,
          is_read: false,
          created_at: newItem.created_at,
          related_emergency_id: newItem.related_emergency_id,
        }]);
      } catch (err) {
        console.warn('[Notification] Supabase insert fallback to local storage:', err);
      }

      // Update local storage
      try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        const parsed: NotificationItem[] = stored ? JSON.parse(stored) : [];
        const updated = [newItem, ...parsed];
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated.slice(0, 50)));
      } catch (e) {
        console.warn('[Notification] Local storage write error:', e);
      }
    },
    [user]
  );

  // Mark single notification as read
  const markAsRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );

    try {
      await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    } catch (err) {
      console.warn('[Notification] Supabase update is_read failed:', err);
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: NotificationItem[] = JSON.parse(stored);
        const updated = parsed.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('[Notification] Local storage update error:', e);
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
      console.warn('[Notification] Supabase markAllAsRead failed:', err);
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: NotificationItem[] = JSON.parse(stored);
        const updated = parsed.map((n) => ({ ...n, is_read: true }));
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.warn('[Notification] Local storage mark all read error:', e);
    }
  };

  // Supabase Realtime Subscriptions for live notifications and accident status changes
  useEffect(() => {
    console.log('[Notification Realtime] Subscribing to live events...');

    // Channel 1: Listen to public.notifications table
    const notifChannel = supabase
      .channel('public_notifications_channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          if (newNotif) {
            setNotifications((prev) => {
              if (prev.some((n) => n.id === newNotif.id)) return prev;
              return [newNotif, ...prev];
            });
            triggerBrowserNotification(newNotif.title, newNotif.message);
          }
        }
      )
      .subscribe();

    // Channel 2: Listen to public.accidents status changes to auto-generate notifications
    const accidentChannel = supabase
      .channel('accident_notifications_channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'accidents' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newAccident = payload.new as any;
            if (newAccident && newAccident.status !== 'Emergency Resolved') {
              addNotification({
                title: '🚨 New Emergency Nearby',
                message: `Accident reported: ${newAccident.address || 'Emergency Incident'}`,
                type: 'emergency',
                related_emergency_id: newAccident.id,
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedAccident = payload.new as any;
            if (updatedAccident) {
              if (updatedAccident.status === 'Responder Dispatched' || updatedAccident.volunteer_id) {
                addNotification({
                  title: '🚑 Volunteer Accepted Emergency',
                  message: `A volunteer responder is en route to ${updatedAccident.address || 'the scene'}`,
                  type: 'volunteer',
                  related_emergency_id: updatedAccident.id,
                });
              } else if (updatedAccident.status === 'Arrived at Scene') {
                addNotification({
                  title: '📍 Volunteer Arrived at Scene',
                  message: `Responder has arrived at ${updatedAccident.address || 'the location'}`,
                  type: 'volunteer',
                  related_emergency_id: updatedAccident.id,
                });
              } else if (updatedAccident.status === 'Transporting to Hospital') {
                addNotification({
                  title: '🏥 Transporting to Hospital',
                  message: `Patient is being transported to emergency hospital`,
                  type: 'hospital',
                  related_emergency_id: updatedAccident.id,
                });
              } else if (updatedAccident.status === 'Emergency Resolved') {
                addNotification({
                  title: '✅ Emergency Resolved',
                  message: `Incident at ${updatedAccident.address || 'the location'} has been resolved`,
                  type: 'resolved',
                  related_emergency_id: updatedAccident.id,
                });
              }
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(accidentChannel);
    };
  }, [addNotification]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        permissionStatus,
        requestPermission,
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
