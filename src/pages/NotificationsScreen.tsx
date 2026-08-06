import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Bell,
  ShieldAlert,
  Ambulance,
  Hospital as HospitalIcon,
  CheckCircle2,
  CheckCheck,
  Clock,
  Sparkles,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import type { NotificationItem } from '../context/NotificationContext';

export const NotificationsScreen: React.FC = () => {
  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    loading,
    permissionStatus,
    requestPermission,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  // Helper function to format relative timestamps
  const formatTimeAgo = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSecs = Math.floor(diffMs / 1000);
      const diffMins = Math.floor(diffSecs / 60);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffSecs < 60) return 'Just now';
      if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
      if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
      if (diffDays === 1) return 'Yesterday';
      return `${diffDays} days ago`;
    } catch (e) {
      return 'Recently';
    }
  };

  // Helper to render type-specific icons
  const renderIcon = (type: NotificationItem['type']) => {
    switch (type) {
      case 'emergency':
        return (
          <div className="w-11 h-11 rounded-2xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
        );
      case 'volunteer':
        return (
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <Ambulance className="w-6 h-6" />
          </div>
        );
      case 'hospital':
        return (
          <div className="w-11 h-11 rounded-2xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
            <HospitalIcon className="w-6 h-6" />
          </div>
        );
      case 'resolved':
        return (
          <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        );
      case 'system':
      default:
        return (
          <div className="w-11 h-11 rounded-2xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
            <Bell className="w-6 h-6" />
          </div>
        );
    }
  };

  const handleItemClick = (item: NotificationItem) => {
    markAsRead(item.id);
    if (item.related_emergency_id) {
      navigate('/status', { state: { accidentId: item.related_emergency_id } });
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-surface">
      {/* Navbar Header */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-surface-container-high px-4 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-full hover:bg-surface-container text-on-surface transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-on-surface leading-tight flex items-center gap-2">
              <span>Notification Center</span>
              {unreadCount > 0 && (
                <span className="bg-primary text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h1>
            <p className="text-xs text-on-surface-variant font-medium">
              Live emergency updates & alerts
            </p>
          </div>
        </div>

        {notifications.length > 0 && unreadCount > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-3 py-1.5 bg-surface-container hover:bg-surface-container-high text-primary rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Mark all notifications as read"
          >
            <CheckCheck className="w-4 h-4" />
            <span className="hidden sm:inline">Mark all read</span>
          </button>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 py-4 space-y-4 max-w-md mx-auto w-full">

        {/* Browser Permission Prompt Banner */}
        {permissionStatus !== 'granted' && (
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl space-y-2 shadow-xs">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-blue-600 shrink-0" />
              <h3 className="text-xs font-black text-blue-900">Enable Desktop & System Alerts</h3>
            </div>
            <p className="text-xs text-blue-700 leading-relaxed font-medium">
              Get instant browser pop-up notifications when an ambulance, responder, or hospital status updates.
            </p>
            <button
              onClick={requestPermission}
              className="mt-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all active:scale-95"
            >
              Enable Browser Notifications
            </button>
          </div>
        )}

        {/* Notifications List */}
        {loading ? (
          <div className="py-16 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
            <p className="text-xs font-bold text-on-surface">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-surface-container-lowest rounded-3xl border border-outline-variant/60 p-8 shadow-level-1">
            <Bell className="w-10 h-10 text-outline mx-auto" />
            <h3 className="text-sm font-extrabold text-on-surface">No notifications added</h3>
            <p className="text-xs text-on-surface-variant font-medium">
              You are all caught up! Emergency alerts and responder updates will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                className={`p-4 rounded-3xl border transition-all cursor-pointer flex items-start justify-between gap-3 group active:scale-[0.98] ${
                  !item.is_read
                    ? 'bg-surface-container-lowest border-primary/40 shadow-level-2 ring-1 ring-primary/20'
                    : 'bg-surface-container-lowest/80 border-outline-variant/60 shadow-level-1 hover:border-outline-variant'
                }`}
              >
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  {renderIcon(item.type)}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-extrabold text-on-surface leading-tight truncate">
                        {item.title}
                      </h4>
                      {!item.is_read && (
                        <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0 animate-pulse"></span>
                      )}
                    </div>
                    <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                      {item.message}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] text-outline font-semibold pt-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatTimeAgo(item.created_at)}</span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-outline group-hover:text-on-surface group-hover:translate-x-0.5 transition-transform shrink-0 self-center" />
              </div>
            ))}
          </div>
        )}

      </main>
    </div>
  );
};

export default NotificationsScreen;
