import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PhoneCall } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface SOSButtonProps {
  onTrigger?: () => void;
  size?: 'normal' | 'large';
}

export const SOSButton: React.FC<SOSButtonProps> = ({ onTrigger, size = 'large' }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isPressing, setIsPressing] = useState(false);

  const handleClick = () => {
    if (onTrigger) {
      onTrigger();
    } else {
      navigate('/report');
    }
  };

  const buttonDimensions = size === 'large' ? 'w-32 h-32' : 'w-24 h-24';
  const pingDimensions = size === 'large' ? 'w-44 h-44' : 'w-32 h-32';
  const pulseDimensions = size === 'large' ? 'w-36 h-36' : 'w-28 h-28';

  return (
    <div className="flex flex-col items-center justify-center my-6">
      <div className="relative flex items-center justify-center">
        {/* Animated outer pulsing rings */}
        <div className={`absolute ${pingDimensions} rounded-full bg-primary/10 animate-ping opacity-75`}></div>
        <div className={`absolute ${pulseDimensions} rounded-full bg-primary/20 animate-pulse`}></div>

        <button
          onClick={handleClick}
          onMouseDown={() => setIsPressing(true)}
          onMouseUp={() => setIsPressing(false)}
          onTouchStart={() => setIsPressing(true)}
          onTouchEnd={() => setIsPressing(false)}
          className={`relative z-10 ${buttonDimensions} rounded-full bg-gradient-to-br from-primary-container to-primary text-white flex flex-col items-center justify-center shadow-level-3 active:scale-95 transition-all duration-200 border-4 border-white/40 ${
            isPressing ? 'scale-95 shadow-inner' : 'hover:scale-105'
          }`}
          aria-label="Emergency SOS Press"
        >
          <PhoneCall className="w-9 h-9 mb-0.5 animate-bounce" />
          <span className="text-xl font-extrabold tracking-wider">{t('home.sos')}</span>
          <span className="text-[10px] font-semibold tracking-tight uppercase opacity-90">{t('home.pressForHelp')}</span>
        </button>
      </div>

      <p className="mt-4 text-xs font-semibold text-on-surface-variant flex items-center gap-1.5 bg-surface-container-high px-3 py-1.5 rounded-full">
        <span className="w-2 h-2 rounded-full bg-primary"></span>
        {t('home.tapToAlert')}
      </p>
    </div>
  );
};
