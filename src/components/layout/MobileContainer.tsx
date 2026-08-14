import React from 'react';
import { useLocation } from 'react-router-dom';
import { OfflineBanner } from '../common/OfflineBanner';

interface MobileContainerProps {
  children: React.ReactNode;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
  const location = useLocation();
  const hideBottomNav =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/emergency' ||
    location.pathname.startsWith('/navigation') ||
    location.pathname.startsWith('/volunteer/preview');

  return (
    <div className="h-[100dvh] w-full bg-surface-container flex justify-center items-center overflow-hidden">
      <div
        className="w-full max-w-md h-[100dvh] bg-surface flex flex-col shadow-2xl relative overflow-hidden border-x border-outline-variant/30 animate-page-enter"
      >
        <OfflineBanner />
        <div
          id="main-scroll-container"
          className={`flex-1 overflow-y-auto overflow-x-hidden ${
            hideBottomNav ? 'pb-0' : 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))]'
          }`}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
