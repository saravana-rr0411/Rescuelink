import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface LanguageDropdownProps {
  className?: string;
}

export const LanguageDropdown: React.FC<LanguageDropdownProps> = ({ className = '' }) => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [explicitLanguage, setExplicitLanguage] = useState<string | null>(() => localStorage.getItem('rescuelink_language'));
  const dropdownRef = useRef<HTMLDivElement>(null);

  const languages = [
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'ta', label: 'தமிழ்', flag: '🇮🇳' },
    { code: 'hi', label: 'हिन्दी', flag: '🇮🇳' }
  ];

  const currentLanguage = explicitLanguage ? languages.find(l => l.code === explicitLanguage) : null;

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('rescuelink_language', lng);
    setExplicitLanguage(lng);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className={`relative inline-block w-full ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className="w-full flex items-center justify-between p-3.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-xs font-bold text-on-surface hover:bg-surface-container-low transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-secondary"
      >
        <span className="flex items-center gap-2">
          {currentLanguage ? (
            <>
              <span className="text-base">{currentLanguage.flag}</span>
              <span>{currentLanguage.label}</span>
            </>
          ) : (
            <span>Select Language</span>
          )}
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4 text-outline" /> : <ChevronDown className="w-4 h-4 text-outline" />}
      </button>

      {isOpen && (
        <ul
          role="listbox"
          className="absolute z-50 w-full mt-2 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-level-2 max-h-60 overflow-y-auto animate-fade-in"
        >
          {languages.map((lng) => (
            <li key={lng.code}>
              <button
                type="button"
                role="option"
                aria-selected={explicitLanguage === lng.code}
                onClick={() => handleLanguageChange(lng.code)}
                className={`w-full flex items-center justify-start gap-3 px-4 py-3 text-sm transition-colors ${
                  explicitLanguage === lng.code
                    ? 'bg-primary/10 text-primary font-bold'
                    : 'text-on-surface hover:bg-surface-container-low font-medium'
                }`}
              >
                <span className="text-base">{lng.flag}</span>
                <span>{lng.label}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
