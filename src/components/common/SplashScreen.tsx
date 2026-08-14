import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const { loading } = useAuth();
  
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);
  
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [maxTimePassed, setMaxTimePassed] = useState(false);

  useEffect(() => {
    // Enforce a minimum display time of 2.0 seconds for the professional branded experience
    const minTimer = setTimeout(() => setMinTimePassed(true), 2000);
    // Enforce a maximum timeout of 5 seconds to ensure we never get stuck indefinitely
    const maxTimer = setTimeout(() => setMaxTimePassed(true), 5000);
    
    return () => {
      clearTimeout(minTimer);
      clearTimeout(maxTimer);
    };
  }, []);

  useEffect(() => {
    // If minimum time has passed AND (either auth has finished loading OR we've hit the max timeout)
    if (minTimePassed && (!loading || maxTimePassed)) {
      setIsFadingOut(true);
      // Wait for the fade out CSS transition to finish before unmounting
      const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
        onComplete();
      }, 400); 
      
      return () => clearTimeout(fadeOutTimer);
    }
  }, [minTimePassed, maxTimePassed, loading, onComplete]);

  if (!isVisible) return null;

  return (
    <div className={`fixed inset-0 z-[100] bg-surface flex flex-col items-center justify-center transition-opacity duration-500 ease-in-out ${isFadingOut ? 'opacity-0' : 'opacity-100'}`}>
       <div className="flex flex-col items-center">
          <div className="w-24 h-24 rounded-2xl bg-white flex items-center justify-center mx-auto overflow-hidden mb-6 shadow-sm animate-splash-logo opacity-0">
            <img src="/images/yi-logo.jpg" alt="Young Indians Yi Logo" className="w-full h-full object-contain" />
          </div>
          
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight animate-splash-logo opacity-0" style={{ animationDelay: '150ms' }}>
            RescueLink
          </h1>
          
          <p className="text-sm font-semibold text-secondary mt-2 animate-splash-text opacity-0" style={{ animationDelay: '450ms' }}>
            {t('auth.brandSubtitle')}
          </p>
       </div>
    </div>
  );
};
