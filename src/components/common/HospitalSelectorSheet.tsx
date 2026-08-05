import React, { useEffect, useState } from 'react';
import type { Hospital } from '../../utils/routing';
import { fetchNearbyHospitalsOverpass, formatETA } from '../../utils/routing';
import { formatDistance } from '../../utils/distance';
import { Hospital as HospitalIcon, MapPin, Clock, Loader2, X, Navigation, Phone, ShieldCheck } from 'lucide-react';

export interface HospitalSelectorSheetProps {
  isOpen: boolean;
  onClose: () => void;
  accidentLatitude: number;
  accidentLongitude: number;
  onSelectHospital: (hospital: Hospital) => void;
}

export const HospitalSelectorSheet: React.FC<HospitalSelectorSheetProps> = ({
  isOpen,
  onClose,
  accidentLatitude,
  accidentLongitude,
  onSelectHospital,
}) => {
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadHospitals() {
      setLoading(true);
      const list = await fetchNearbyHospitalsOverpass(accidentLatitude, accidentLongitude);
      if (isMounted) {
        setHospitals(list);
        setLoading(false);
      }
    }

    loadHospitals();

    return () => {
      isMounted = false;
    };
  }, [isOpen, accidentLatitude, accidentLongitude]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/70 backdrop-blur-sm flex items-end justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface border border-outline-variant/60 rounded-t-3xl sm:rounded-3xl shadow-level-3 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-4 border-b border-surface-container-high flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary text-white flex items-center justify-center shadow-md">
              <HospitalIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-on-surface">Select Destination Hospital</h2>
              <p className="text-[11px] text-on-surface-variant">Arrived at Scene • Auto-discovered nearby trauma centers</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-xs font-bold text-on-surface">Querying Nearby Hospitals via OpenStreetMap...</p>
              <p className="text-[11px] text-on-surface-variant">Calculating distance and travel time from accident scene.</p>
            </div>
          ) : hospitals.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <HospitalIcon className="w-8 h-8 text-outline mx-auto" />
              <p className="text-xs font-bold text-on-surface">No Nearby Hospitals Found</p>
              <p className="text-[11px] text-on-surface-variant">Check location coordinates or network connectivity.</p>
            </div>
          ) : (
            hospitals.map((hosp) => {
              // Speed estimate ~ 40 km/h in city road traffic
              const estimatedSeconds = (hosp.distanceMeters / 1000 / 40) * 3600;
              const isSelected = selectedId === hosp.id;

              return (
                <div
                  key={hosp.id}
                  className={`p-4 rounded-2xl border transition-all space-y-3 ${
                    isSelected
                      ? 'bg-primary-fixed/20 border-primary ring-2 ring-primary/30 shadow-level-2'
                      : 'bg-surface-container-lowest border-outline-variant/50 hover:border-primary/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          ER Emergency Ready
                        </span>
                        <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full flex items-center gap-1">
                          ⭐ 4.8 Rating
                        </span>
                        {hosp.bedsAvailable > 0 && (
                          <span className="text-[10px] font-bold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                            {hosp.bedsAvailable} Beds Available
                          </span>
                        )}
                      </div>
                      <h3 className="text-sm font-extrabold text-on-surface truncate">{hosp.name}</h3>
                      <p className="text-xs text-on-surface-variant flex items-center gap-1 font-medium truncate">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{hosp.address}</span>
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-sm font-extrabold text-primary block">
                        {formatDistance(hosp.distanceMeters)}
                      </span>
                      <span className="text-[11px] font-bold text-secondary flex items-center justify-end gap-1">
                        <Clock className="w-3 h-3" />
                        {formatETA(estimatedSeconds)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-surface-container-high">
                    <a
                      href={`tel:${hosp.phone || '911'}`}
                      className="px-3 py-1.5 bg-secondary/10 text-secondary border border-secondary/20 hover:bg-secondary/20 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5" />
                      <span>Call Hospital</span>
                    </a>

                    <button
                      onClick={() => {
                        setSelectedId(hosp.id);
                        onSelectHospital(hosp);
                      }}
                      className="px-4 py-2 bg-primary text-white text-xs font-extrabold rounded-xl shadow-level-1 hover:bg-primary-hover transition-all flex items-center gap-1.5 active:scale-95"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>Select Hospital</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
