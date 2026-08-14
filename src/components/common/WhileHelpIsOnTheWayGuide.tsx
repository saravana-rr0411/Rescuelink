import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PhoneCall,
  Droplets,
  ShieldAlert,
  Eye,
  Car,
  MapPin,
  ChevronDown,
  ChevronUp,
  Ambulance,
  LifeBuoy,
  Radio,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface WhileHelpIsOnTheWayGuideProps {
  status?: string | null;
  className?: string;
}

export const WhileHelpIsOnTheWayGuide: React.FC<WhileHelpIsOnTheWayGuideProps> = ({
  status,
  className = '',
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState<boolean>(true);

  // Dynamic status text based on realtime accident status
  const getStatusText = (st?: string | null): string => {
    if (!st) return 'Responder is being notified...';
    const s = st.trim();
    if (s === 'Volunteer Assigned' || s === 'Assigned') {
      return 'Responder Assigned – Preparing for Dispatch';
    }
    if (s === 'Volunteer En Route' || s === 'En Route') {
      return t('emergency.responderEnRoute');
    }
    if (s === 'Volunteer Arrived' || s === 'Arrived at Scene') {
      return t('emergency.responderArrivedOnScene');
    }
    if (s === 'Transporting to Hospital' || s === 'Hospital Transfer') {
      return 'Transporting to Emergency Hospital';
    }
    if (s === 'Hospital Reached') {
      return t('emergency.safelyArrivedAtHospital');
    }
    if (s === 'Emergency Resolved' || s === 'Emergency Completed' || s === 'Completed') {
      return 'Emergency Handled & Resolved';
    }
    return 'Responder is being notified...';
  };

  const steps = [
    {
      num: 1,
      title: 'Call Emergency Services',
      desc: 'If the situation is critical, call 112 or 108 for emergency assistance.',
      icon: PhoneCall,
      iconBg: 'bg-rose-100 text-rose-700 border-rose-200',
      actionUrl: 'tel:108',
      actionText: 'Call 108',
    },
    {
      num: 2,
      title: 'Control Severe Bleeding',
      desc: 'If there is severe visible bleeding, use clean cloth or gauze and apply firm pressure. Avoid unnecessarily disturbing the wound.',
      icon: Droplets,
      iconBg: 'bg-red-100 text-red-700 border-red-200',
    },
    {
      num: 3,
      title: 'Keep the Victim Safe',
      desc: 'Avoid moving the injured person unnecessarily. Move them only when there is an immediate danger at the current location.',
      icon: ShieldAlert,
      iconBg: 'bg-amber-100 text-amber-800 border-amber-200',
    },
    {
      num: 4,
      title: 'Check Responsiveness',
      desc: 'Check whether the person is responsive and observe any changes in their condition. Share important changes with the responder when they arrive.',
      icon: Eye,
      iconBg: 'bg-blue-100 text-blue-700 border-blue-200',
    },
    {
      num: 5,
      title: 'Keep the Area Safe',
      desc: 'Warn approaching traffic and keep unnecessary crowds away from the injured person.',
      icon: Car,
      iconBg: 'bg-purple-100 text-purple-700 border-purple-200',
    },
    {
      num: 6,
      title: 'Stay Until Help Arrives',
      desc: 'Stay nearby if it is safe to do so. When the responder arrives, provide the accident location and any useful information about the victim.',
      icon: MapPin,
      iconBg: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    },
  ];

  return (
    <div
      className={`bg-surface-container-lowest rounded-3xl border border-outline-variant/60 shadow-level-1 overflow-hidden transition-all ${className}`}
    >
      {/* Realtime Status Indicator Banner */}
      <div className="bg-gradient-to-r from-red-950 via-slate-900 to-indigo-950 text-white px-4 py-3 border-b border-rose-500/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shrink-0">
            <Ambulance className="w-4.5 h-4.5 text-rose-400" />
          </div>
          <span className="text-xs font-extrabold text-rose-100 truncate">
            {getStatusText(status)}
          </span>
        </div>

        <span className="text-[10px] font-extrabold bg-rose-500/20 border border-rose-400/40 text-rose-200 px-2.5 py-1 rounded-full shrink-0 flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-rose-400 animate-pulse" />
          <span>{t('emergency.goldenHour')}</span>
        </span>
      </div>

      {/* Guide Header */}
      <div className="p-4 sm:p-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-primary shrink-0" />
              <h2 className="text-base sm:text-lg font-black text-on-surface leading-tight">
                While Help Is On The Way
              </h2>
            </div>
            <p className="text-xs text-on-surface-variant font-medium">
              Follow these simple steps while a responder is arriving.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface transition-colors shrink-0 flex items-center gap-1 text-xs font-bold"
            aria-label={isExpanded ? t('emergency.collapseGuide') : t('emergency.expandGuide')}
          >
            <span className="hidden sm:inline">{isExpanded ? 'Collapse' : 'Expand'}</span>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Guidance Step Cards Grid */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-5 space-y-3 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {steps.map((step) => {
              const IconComponent = step.icon;
              return (
                <div
                  key={step.num}
                  className="bg-surface-container-low/70 border border-outline-variant/40 rounded-2xl p-3.5 space-y-2 hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs border ${step.iconBg} shrink-0`}
                        >
                          {step.num}
                        </div>
                        <h3 className="text-xs font-extrabold text-on-surface leading-tight">
                          {step.title}
                        </h3>
                      </div>
                      <IconComponent className="w-4 h-4 text-on-surface-variant/70 shrink-0" />
                    </div>

                    <p className="text-xs text-on-surface-variant leading-relaxed font-medium pl-0.5">
                      {step.desc}
                    </p>
                  </div>

                  {step.actionUrl && (
                    <div className="pt-2 border-t border-outline-variant/30">
                      <a href={step.actionUrl} className="inline-block">
                        <Button variant="danger" size="sm" leftIcon={<PhoneCall className="w-3.5 h-3.5" />}>
                          {step.actionText}
                        </Button>
                      </a>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Safety Disclaimer */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 font-medium flex items-start gap-2">
            <LifeBuoy className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>{t('emergency.guidanceNotice')}</strong> These steps provide immediate bystander guidance. Always prioritize calling trained emergency services (108/112) and avoid performing risky medical procedures.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default WhileHelpIsOnTheWayGuide;
