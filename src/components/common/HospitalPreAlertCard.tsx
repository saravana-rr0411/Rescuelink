import React from 'react';
import { Hospital as HospitalIcon, Clock, MapPin, HeartPulse, Droplets } from 'lucide-react';

export interface HospitalPreAlertCardProps {
  bloodGroup?: string | null;
  severity?: string | null;
  eta?: string | null;
  patientAddress?: string | null;
  hospitalName?: string | null;
  className?: string;
  variant?: 'floating' | 'embedded';
}

export const HospitalPreAlertCard: React.FC<HospitalPreAlertCardProps> = ({
  bloodGroup,
  severity,
  eta,
  patientAddress,
  hospitalName,
  className = '',
  variant = 'floating',
}) => {
  const displayBloodGroup = bloodGroup && bloodGroup.trim().length > 0 ? bloodGroup : 'Blood group unavailable';
  const displaySeverity = severity && severity.trim().length > 0 ? severity.toUpperCase() : 'CRITICAL';
  const displayEta = eta && eta.trim().length > 0 ? eta : 'Calculating ETA...';
  const displayAddress = patientAddress && patientAddress.trim().length > 0 ? patientAddress : 'Location unavailable';
  const displayHospital = hospitalName && hospitalName.trim().length > 0 ? hospitalName : 'Hospital details unavailable';

  const isFloating = variant === 'floating';

  return (
    <div
      className={`rounded-3xl border shadow-2xl transition-all overflow-hidden ${
        isFloating
          ? 'bg-slate-900/95 backdrop-blur-xl text-white border-rose-500/40 ring-1 ring-rose-500/20'
          : 'bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 text-white border-rose-500/50'
      } ${className}`}
    >
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-rose-900/90 via-red-800/90 to-rose-950/90 px-4 py-2.5 flex items-center justify-between border-b border-rose-500/30">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shrink-0">
            <HospitalIcon className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="text-xs font-black uppercase tracking-wider text-rose-100 flex items-center gap-1.5">
            🏥 HOSPITAL PRE-ALERT
          </span>
        </div>

        <div className="flex items-center gap-1.5 bg-rose-950/80 text-rose-200 px-2.5 py-1 rounded-full border border-rose-500/40 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping"></span>
          <span className="text-[10px] font-extrabold uppercase tracking-wide">🚨 Incoming Emergency</span>
        </div>
      </div>

      {/* Main Details Body */}
      <div className="p-4 space-y-3.5 text-xs">
        {/* Highlighted Critical Badges: Blood Group & Severity */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Blood Group Highlight Card */}
          <div className="bg-rose-950/60 border border-rose-500/40 rounded-2xl p-2.5 flex items-center gap-2.5 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-rose-600/30 border border-rose-400/50 text-rose-300 flex items-center justify-center shrink-0">
              <Droplets className="w-4 h-4 text-rose-400 fill-rose-400/30 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-rose-300/80 block">
                Blood Group
              </span>
              <span className="text-sm font-black text-rose-100 truncate block">
                {displayBloodGroup}
              </span>
            </div>
          </div>

          {/* Severity Highlight Card */}
          <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-2.5 flex items-center gap-2.5 shadow-inner">
            <div className="w-8 h-8 rounded-xl bg-amber-600/30 border border-amber-400/50 text-amber-300 flex items-center justify-center shrink-0">
              <HeartPulse className="w-4 h-4 text-amber-400 stroke-[2.5]" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300/80 block">
                Severity
              </span>
              <span className="text-sm font-black text-amber-100 truncate block">
                {displaySeverity}
              </span>
            </div>
          </div>
        </div>

        {/* Selected Hospital & Live ETA Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
          {/* Selected Hospital Name */}
          <div className="flex items-start gap-2 bg-slate-800/60 border border-slate-700/60 rounded-2xl p-2.5">
            <HospitalIcon className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                Selected Hospital
              </span>
              <span className="text-xs font-black text-white leading-tight line-clamp-1 block">
                {displayHospital}
              </span>
            </div>
          </div>

          {/* Navigation ETA */}
          <div className="flex items-start gap-2 bg-emerald-950/50 border border-emerald-500/40 rounded-2xl p-2.5">
            <Clock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-300/80 block">
                Navigation Route ETA
              </span>
              <span className="text-xs font-black text-emerald-200 leading-tight block">
                {displayEta}
              </span>
            </div>
          </div>
        </div>

        {/* Patient / Incident Location */}
        <div className="flex items-start gap-2 bg-slate-800/40 border border-slate-700/50 rounded-2xl p-2.5">
          <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Patient / Incident Location
            </span>
            <span className="text-xs font-semibold text-slate-200 leading-relaxed line-clamp-2 block">
              {displayAddress}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalPreAlertCard;
