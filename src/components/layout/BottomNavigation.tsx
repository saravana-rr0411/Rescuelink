import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Activity, PlusCircle, Users, BookOpen, User } from 'lucide-react';

export const BottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/status', label: 'Status', icon: Activity },
    { path: '/volunteer', label: 'Volunteer', icon: Users },
    { path: '/first-aid', label: 'First Aid', icon: BookOpen },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path: string) => {
    if (path === '/' && (location.pathname === '/' || location.pathname === '/home')) return true;
    return location.pathname === path;
  };

  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-surface/95 backdrop-blur-lg border-t border-surface-container-high z-50 px-2 py-2 shadow-level-3">
      <div className="flex items-center justify-around">
        {navItems.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-14 py-1 rounded-2xl transition-all ${
                active ? 'text-primary font-bold' : 'text-on-surface-variant/70 hover:text-on-surface'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary-fixed text-primary' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 font-medium">{item.label}</span>
            </button>
          );
        })}

        {/* Center Emergency SOS FAB */}
        <button
          onClick={() => navigate('/report')}
          className="flex flex-col items-center justify-center -mt-6 group focus:outline-none"
        >
          <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/40 group-hover:scale-105 active:scale-95 transition-transform ring-4 ring-surface">
            <PlusCircle className="w-8 h-8" />
          </div>
          <span className="text-[11px] font-bold text-primary mt-1">Report</span>
        </button>

        {navItems.slice(2).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center w-14 py-1 rounded-2xl transition-all ${
                active ? 'text-primary font-bold' : 'text-on-surface-variant/70 hover:text-on-surface'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${active ? 'bg-primary-fixed text-primary' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] mt-0.5 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
