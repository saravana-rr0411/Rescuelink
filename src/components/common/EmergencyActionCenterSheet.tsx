import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Ambulance,
  Hospital,
  Bandage,
  Share2,
  Camera,
  ShieldAlert,
  Flame,
  PhoneCall,
  X,
  MapPin,
  CheckCircle2,
} from 'lucide-react';
import { HospitalSelectorSheet } from './HospitalSelectorSheet';
import type { Hospital as HospitalType } from '../../utils/routing';

interface EmergencyActionCenterSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EmergencyActionCenterSheet: React.FC<EmergencyActionCenterSheetProps> = ({
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [showHospitals, setShowHospitals] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleOpenHospitals = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setShowHospitals(true);
        },
        (err) => {
          console.warn('[Emergency Action Center] Geolocation failed:', err.message);
          setShareSuccess('GPS permission denied. Location access is required to discover nearby hospitals.');
          setTimeout(() => setShareSuccess(null), 4000);
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setShareSuccess('Geolocation API is not supported by your browser.');
      setTimeout(() => setShareSuccess(null), 4000);
    }
  };

  const handleShareLocation = async () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          const shareText = `🚨 EMERGENCY SOS! I need immediate help. My current GPS Location: ${mapUrl}`;

          if (navigator.share) {
            try {
              await navigator.share({
                title: 'RescueLink Emergency Location',
                text: shareText,
                url: mapUrl,
              });
              setShareSuccess('Location shared successfully!');
            } catch (e) {
              console.warn('[Share Location] User cancelled or share failed:', e);
            }
          } else {
            try {
              await navigator.clipboard.writeText(shareText);
              setShareSuccess('GPS location link copied to clipboard!');
            } catch (e) {
              setShareSuccess(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          }

          setTimeout(() => setShareSuccess(null), 3000);
        },
        () => {
          setShareSuccess('Location permission required.');
          setTimeout(() => setShareSuccess(null), 3000);
        }
      );
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[999] bg-slate-950/75 backdrop-blur-sm flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200">
        <div className="w-full max-w-md bg-surface border border-outline-variant/60 rounded-t-3xl sm:rounded-3xl shadow-level-3 overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom duration-300">
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-surface-container-high flex items-center justify-between bg-gradient-to-r from-red-950/40 via-red-900/20 to-surface">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md ring-4 ring-red-500/20">
                <ShieldAlert className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-on-surface flex items-center gap-1.5">
                  <span>🚨 Emergency Action Center</span>
                </h2>
                <p className="text-xs text-on-surface-variant font-medium">
                  Immediate actions you can perform during an emergency.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
              aria-label="Close Emergency Action Center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {shareSuccess && (
            <div className="mx-4 mt-3 p-3 bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold rounded-2xl flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{shareSuccess}</span>
            </div>
          )}

          {/* Action Cards List */}
          <div className="p-4 sm:p-5 overflow-y-auto space-y-3 flex-1">
            {/* 1. Call Ambulance (108) */}
            <button
              onClick={() => handleCall('108')}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-700 text-white shadow-level-2 hover:from-red-700 hover:to-rose-800 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <Ambulance className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black flex items-center gap-1.5">
                    <span>🚑 Call Ambulance</span>
                    <span className="bg-white/30 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">108</span>
                  </h3>
                  <p className="text-xs text-red-100 font-medium mt-0.5">
                    Connect immediately to emergency dispatch
                  </p>
                </div>
              </div>
              <PhoneCall className="w-5 h-5 text-white/80 group-hover:scale-110 transition-transform shrink-0" />
            </button>

            {/* 2. Find Nearby Hospitals */}
            <button
              onClick={handleOpenHospitals}
              className="w-full p-4 rounded-2xl bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-level-2 hover:from-blue-800 hover:to-indigo-900 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <Hospital className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-black flex items-center gap-1.5">
                    <span>🏥 Find Nearby Hospitals</span>
                  </h3>
                  <p className="text-xs text-blue-100 font-medium mt-0.5">
                    Discover ER trauma centers & emergency rooms
                  </p>
                </div>
              </div>
              <MapPin className="w-5 h-5 text-white/80 group-hover:scale-110 transition-transform shrink-0" />
            </button>

            {/* 3. First Aid Guide */}
            <button
              onClick={() => {
                onClose();
                navigate('/first-aid');
              }}
              className="w-full p-4 rounded-2xl bg-surface-container-lowest border border-emerald-300 text-emerald-950 shadow-xs hover:border-emerald-500 hover:bg-emerald-50/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Bandage className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
                    <span>🩹 First Aid Guide</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Step-by-step CPR, bleeding & trauma guides
                  </p>
                </div>
              </div>
            </button>

            {/* 4. Share Live Location */}
            <button
              onClick={handleShareLocation}
              className="w-full p-4 rounded-2xl bg-surface-container-lowest border border-amber-300 text-amber-950 shadow-xs hover:border-amber-500 hover:bg-amber-50/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <Share2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
                    <span>📍 Share Live Location</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Send precise GPS coordinates to contacts
                  </p>
                </div>
              </div>
            </button>

            {/* 5. Report Accident */}
            <button
              onClick={() => {
                onClose();
                navigate('/report');
              }}
              className="w-full p-4 rounded-2xl bg-surface-container-lowest border border-red-300 text-red-950 shadow-xs hover:border-red-500 hover:bg-red-50/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-xl bg-red-100 text-red-800 flex items-center justify-center shrink-0">
                  <Camera className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
                    <span>📸 Report Accident</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    File 1-Tap SOS accident report with photo
                  </p>
                </div>
              </div>
            </button>

            {/* 6. Call Police (100) */}
            <button
              onClick={() => handleCall('100')}
              className="w-full p-4 rounded-2xl bg-surface-container-lowest border border-indigo-300 text-indigo-950 shadow-xs hover:border-indigo-500 hover:bg-indigo-50/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
                    <span>🚓 Call Police</span>
                    <span className="bg-indigo-100 text-indigo-900 text-[10px] px-2 py-0.5 rounded-full font-bold">100 / 112</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Direct line to law enforcement & highway patrol
                  </p>
                </div>
              </div>
              <PhoneCall className="w-5 h-5 text-indigo-700 shrink-0" />
            </button>

            {/* 7. Call Fire Service (101) */}
            <button
              onClick={() => handleCall('101')}
              className="w-full p-4 rounded-2xl bg-surface-container-lowest border border-orange-300 text-orange-950 shadow-xs hover:border-orange-500 hover:bg-orange-50/50 transition-all flex items-center justify-between group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center shrink-0">
                  <Flame className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
                    <span>🚒 Call Fire Service</span>
                    <span className="bg-orange-100 text-orange-900 text-[10px] px-2 py-0.5 rounded-full font-bold">101</span>
                  </h3>
                  <p className="text-xs text-on-surface-variant font-medium mt-0.5">
                    Direct line to fire brigade & rescue squads
                  </p>
                </div>
              </div>
              <PhoneCall className="w-5 h-5 text-orange-700 shrink-0" />
            </button>
          </div>
        </div>
      </div>

      {showHospitals && userLocation && (
        <HospitalSelectorSheet
          isOpen={showHospitals}
          onClose={() => setShowHospitals(false)}
          accidentLatitude={userLocation.lat}
          accidentLongitude={userLocation.lng}
          onSelectHospital={(hosp: HospitalType) => {
            setShowHospitals(false);
            onClose();
            window.location.href = `tel:${hosp.phone || '108'}`;
          }}
        />
      )}
    </>
  );
};
