import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Globe } from 'lucide-react';

interface LanguageSelectorProps {
  onClose?: () => void;
  className?: string;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ onClose, className = '' }) => {
  const { t, i18n } = useTranslation();

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('rescuelink_language', lng);
    if (onClose) onClose();
  };

  const languages = [
    { code: 'en', label: t('profile.english') },
    { code: 'ta', label: t('profile.tamil') },
    { code: 'hi', label: t('profile.hindi') }
  ];

  return (
    <div className={`bg-surface-container-lowest border border-outline-variant/60 rounded-3xl p-5 shadow-level-2 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="text-sm font-bold text-on-surface">{t('profile.languageModalTitle')}</h3>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 rounded-full hover:bg-surface-container transition-colors">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        )}
      </div>

      <div className="space-y-2">
        {languages.map((lng) => (
          <button
            key={lng.code}
            onClick={() => handleLanguageChange(lng.code)}
            className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
              i18n.language === lng.code
                ? 'border-primary bg-primary/5 text-primary font-bold'
                : 'border-outline-variant/50 hover:bg-surface-container-low text-on-surface'
            }`}
          >
            <span>{lng.label}</span>
            {i18n.language === lng.code && (
              <div className="w-2 h-2 rounded-full bg-primary" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};
