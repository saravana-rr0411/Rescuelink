import React from 'react';
import { useLocation } from 'react-router-dom';

interface MobileContainerProps {
  children: React.ReactNode;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
  const location = useLocation();
  const hideBottomNav =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/emergency' ||
    location.pathname.startsWith('/navigation');

  return (
    <div className="min-h-screen bg-surface-container flex justify-center items-start">
      <div
        className={`w-full max-w-md min-h-screen bg-surface flex flex-col shadow-2xl relative overflow-x-hidden border-x border-outline-variant/30 ${
          hideBottomNav ? 'pb-0' : 'pb-20'
        }`}
      >
        {children}
      </div>
    </div>
  );
};
