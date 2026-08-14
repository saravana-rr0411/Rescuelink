import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Bell, User, WifiOff, Wifi } from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { useProfile } from '../../context/ProfileContext';
import { useNetworkSync } from '../../hooks/useNetworkSync';

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ title, showBack = false, rightAction }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { avatarUrl } = useProfile();
  const { isOnline, isSyncing } = useNetworkSync();
  const [showRestored, setShowRestored] = useState(false);
  const [wasOffline, setWasOffline] = useState(!navigator.onLine);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowRestored(true);
      setWasOffline(false);
      const timer = setTimeout(() => setShowRestored(false), 3000);
      return () => clearTimeout(timer);
    } else if (!isOnline) {
      setWasOffline(true);
      setShowRestored(false);
    }
  }, [isOnline, wasOffline]);

  const isHome = location.pathname === '/' || location.pathname === '/home';

  return (
    <>
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-surface-container-high px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          {showBack || !isHome ? (
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-full hover:bg-surface-container text-on-surface transition-colors focus:outline-none"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold shadow-md">
              <ShieldAlert className="w-6 h-6" />
            </div>
          )}

          <div>
            <h1 className="font-bold text-lg text-on-surface leading-tight tracking-tight">
              {title ? title : 'RescueLink'}
            </h1>
            {isHome && (
              <p className="text-xs font-medium text-secondary flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                Emergency System Active
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {rightAction}
          <button 
            onClick={() => navigate('/notifications')}
            className="relative p-2 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors"
            aria-label="Notification Center"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] font-black min-w-5 h-5 px-1 rounded-full flex items-center justify-center border-2 border-surface shadow-xs">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </button>

          <button 
            onClick={() => navigate('/profile')}
            className="p-1 rounded-full hover:bg-surface-container text-on-surface-variant transition-colors flex items-center justify-center shrink-0"
            aria-label="User Profile"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="User Avatar"
                loading="lazy"
                decoding="async"
                className="w-8 h-8 rounded-full object-cover shrink-0 aspect-square ring-2 ring-primary/30 shadow-xs"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-surface-container-high border border-outline-variant/60 shrink-0 aspect-square flex items-center justify-center">
                <User className="w-4.5 h-4.5 text-on-surface-variant shrink-0" />
              </div>
            )}
          </button>
        </div>
      </header>

      {/* OFFLINE INDICATOR */}
      {!isOnline && (
        <div className="sticky top-[68px] z-30 bg-amber-100 text-amber-900 px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b border-amber-200 shadow-sm">
          <WifiOff className="w-3.5 h-3.5" />
          Offline — Limited features available
        </div>
      )}

      {/* ONLINE RESTORED INDICATOR */}
      {showRestored && (
        <div className="sticky top-[68px] z-30 bg-emerald-100 text-emerald-900 px-4 py-1.5 text-xs font-bold flex items-center justify-center gap-1.5 border-b border-emerald-200 shadow-sm animate-fade-in">
          <Wifi className="w-3.5 h-3.5" />
          Connection restored {isSyncing ? '(Syncing...)' : ''}
        </div>
      )}
    </>
  );
};
