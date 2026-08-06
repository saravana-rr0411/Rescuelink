import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Ambulance,
  Hospital as HospitalIcon,
  Bandage,
  Share2,
  Camera,
  ShieldAlert,
  Flame,
  PhoneCall,
  ChevronRight,
  MapPin,
  Star,
  Navigation,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import type { Hospital } from '../utils/routing';
import { fetchNearbyHospitalsOverpass } from '../utils/routing';
import { GoogleMapsNavigationMode } from '../components/common/GoogleMapsNavigationMode';

export const EmergencyActionScreen: React.FC = () => {
  const navigate = useNavigate();

  // Mode: 'actions' | 'hospitals' | 'navigation'
  const [viewMode, setViewMode] = useState<'actions' | 'hospitals' | 'navigation'>('actions');

  // User GPS coordinates state
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Hospital state
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loadingHospitals, setLoadingHospitals] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);

  // Initial GPS location request
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.warn('[Emergency Action Screen] GPS permission denied:', err.message);
          setUserLocation({ lat: 12.9716, lng: 77.5946 });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setUserLocation({ lat: 12.9716, lng: 77.5946 });
    }
  }, []);

  const handleCall = (number: string) => {
    window.location.href = `tel:${number}`;
  };

  const handleOpenHospitals = async () => {
    setViewMode('hospitals');
    const coords = userLocation || { lat: 12.9716, lng: 77.5946 };
    setLoadingHospitals(true);
    try {
      const list = await fetchNearbyHospitalsOverpass(coords.lat, coords.lng);
      setHospitals(list);
    } catch (err) {
      console.error('[Emergency Action Screen] Error loading hospitals:', err);
    } finally {
      setLoadingHospitals(false);
    }
  };

  const handleStartNavigation = (hospital: Hospital) => {
    setSelectedHospital(hospital);
    setViewMode('navigation');
  };

  const handleStopNavigation = () => {
    setSelectedHospital(null);
    setViewMode('hospitals');
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
              setToastMessage('GPS Location shared successfully!');
            } catch (e) {
              console.warn('[Share Location] Cancelled:', e);
            }
          } else {
            try {
              await navigator.clipboard.writeText(shareText);
              setToastMessage('GPS location link copied to clipboard!');
            } catch {
              setToastMessage(`GPS: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          }
          setTimeout(() => setToastMessage(null), 3000);
        },
        () => {
          setToastMessage('Location permission required.');
          setTimeout(() => setToastMessage(null), 3000);
        }
      );
    }
  };

  const userCoords: [number, number] | null = userLocation
    ? [userLocation.lat, userLocation.lng]
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Top Header Navbar */}
      <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur-md border-b border-surface-container-high px-4 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (viewMode === 'navigation') {
                setViewMode('hospitals');
              } else if (viewMode === 'hospitals') {
                setViewMode('actions');
              } else {
                navigate(-1);
              }
            }}
            className="p-2 rounded-full hover:bg-surface-container-high text-on-surface transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-on-surface leading-tight">
              {viewMode === 'actions'
                ? 'SOS Emergency Services'
                : viewMode === 'hospitals'
                ? 'Nearby Hospitals & Trauma Centers'
                : 'Hospital Navigation'}
            </h1>
            <p className="text-xs text-on-surface-variant">
              {viewMode === 'actions'
                ? 'Direct 24/7 Dispatch Hotline'
                : viewMode === 'hospitals'
                ? 'Realtime OpenStreetMap Emergency Directory'
                : 'Google Maps Live GPS Navigation'}
            </p>
          </div>
        </div>
      </header>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-on-surface text-surface px-4 py-2.5 rounded-full text-xs font-bold shadow-level-3 animate-in fade-in zoom-in duration-200">
          {toastMessage}
        </div>
      )}

      {/* Main Content Body */}
      <main className="flex-1 px-4 py-4 space-y-4">
        {/* ========================================================================= */}
        {/* VIEW 1: SOS ACTION DASHBOARD */}
        {/* ========================================================================= */}
        {viewMode === 'actions' && (
          <div className="space-y-4">
            {/* Primary Hotline Hero Cards */}
            <div className="grid grid-cols-1 gap-3">
              {/* Call Ambulance (108) */}
              <div
                onClick={() => handleCall('108')}
                className="bg-gradient-to-r from-red-600 to-rose-700 text-white p-4 rounded-2xl shadow-level-2 flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <Ambulance className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                      Toll Free • National Emergency
                    </span>
                    <h2 className="text-lg font-black mt-0.5">Call Ambulance (108)</h2>
                    <p className="text-xs text-red-100 font-medium">
                      24/7 Medical & Casualty Response
                    </p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white text-red-700 flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                  108
                </div>
              </div>

              {/* Call Police (100) */}
              <div
                onClick={() => handleCall('100')}
                className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-4 rounded-2xl shadow-level-2 flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                      Law Enforcement Dispatch
                    </span>
                    <h2 className="text-lg font-black mt-0.5">Call Police (100)</h2>
                    <p className="text-xs text-blue-100 font-medium">Traffic & Crime Helpline</p>
                  </div>
                </div>
                <div className="w-10 h-10 rounded-full bg-white text-blue-800 flex items-center justify-center font-black text-sm shrink-0 shadow-md">
                  100
                </div>
              </div>
            </div>

            {/* Quick Action Grid */}
            <div className="grid grid-cols-2 gap-3">
              {/* Nearby Hospitals Button */}
              <button
                onClick={handleOpenHospitals}
                className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-level-1 hover:border-primary/50 transition-all text-left flex flex-col justify-between space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <HospitalIcon className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center justify-between">
                    <span>Nearby Hospitals</span>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Live GPS distance & map navigation
                  </p>
                </div>
              </button>

              {/* Share Live Location */}
              <button
                onClick={handleShareLocation}
                className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-level-1 hover:border-primary/50 transition-all text-left flex flex-col justify-between space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Share2 className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center justify-between">
                    <span>Share Location</span>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Send exact GPS coordinates to contacts
                  </p>
                </div>
              </button>

              {/* First Aid Manual */}
              <button
                onClick={() => navigate('/first-aid')}
                className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-level-1 hover:border-primary/50 transition-all text-left flex flex-col justify-between space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Bandage className="w-5 h-5 text-blue-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center justify-between">
                    <span>First Aid Guides</span>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Step-by-step CPR & trauma procedures
                  </p>
                </div>
              </button>

              {/* Fire Brigade (101) */}
              <button
                onClick={() => handleCall('101')}
                className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-level-1 hover:border-primary/50 transition-all text-left flex flex-col justify-between space-y-3 group"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-800 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Flame className="w-5 h-5 text-orange-700" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-on-surface flex items-center justify-between">
                    <span>Fire Brigade (101)</span>
                    <ChevronRight className="w-4 h-4 text-on-surface-variant group-hover:translate-x-0.5 transition-transform" />
                  </h3>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">
                    Vehicle fire & crash extraction
                  </p>
                </div>
              </button>
            </div>

            {/* RescueLink Emergency Hotline Banner */}
            <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-level-1 space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-on-surface">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>RescueLink Verified Dispatch System</span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Need to report a road accident? Our automated volunteer network dispatches nearby
                good samaritan responders within seconds.
              </p>
              <button
                onClick={() => navigate('/report')}
                className="w-full py-3 bg-primary text-white font-extrabold text-xs rounded-xl shadow-level-1 hover:bg-primary-hover transition-colors flex items-center justify-center space-x-2"
              >
                <Camera className="w-4 h-4" />
                <span>Report Accident Incident Now</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 2: NEARBY HOSPITALS LIST */}
        {/* ========================================================================= */}
        {viewMode === 'hospitals' && (
          <div className="space-y-3">
            {loadingHospitals ? (
              <div className="py-12 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                <p className="text-xs font-bold text-on-surface">
                  Fetching nearby emergency hospitals via OpenStreetMap...
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {hospitals.map((hosp) => {
                  const distFormatted = (hosp.distanceMeters / 1000).toFixed(1) + ' km';
                  return (
                    <div
                      key={hosp.id}
                      className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 shadow-level-1 hover:border-primary/60 transition-all space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <h3 className="text-sm font-extrabold text-on-surface flex items-center gap-1.5">
                            <span>🏥</span>
                            <span>{hosp.name}</span>
                          </h3>
                          <p className="text-xs text-on-surface-variant flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>{hosp.address}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-xs font-black text-primary bg-primary/10 px-2.5 py-1 rounded-full block">
                            {distFormatted}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs pt-1 border-t border-outline-variant/40">
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-emerald-600 text-emerald-600" />
                          <span>4.8 (Emergency Ready)</span>
                        </span>

                        <div className="flex items-center space-x-2">
                          {hosp.phone ? (
                            <a
                              href={`tel:${hosp.phone}`}
                              className="px-3 py-1.5 bg-surface-container-high hover:bg-surface-container text-on-surface font-bold text-xs rounded-xl flex items-center gap-1 transition-colors"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>Call</span>
                            </a>
                          ) : (
                            <button
                              disabled
                              className="px-3 py-1.5 bg-surface-container-high/50 text-on-surface-variant/50 rounded-xl text-xs font-bold flex items-center gap-1 cursor-not-allowed"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                              <span>No Phone</span>
                            </button>
                          )}

                          <button
                            onClick={() => handleStartNavigation(hosp)}
                            className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-white text-xs font-extrabold rounded-xl shadow-level-1 transition-all flex items-center gap-1.5 active:scale-95"
                          >
                            <Navigation className="w-4 h-4" />
                            <span>Navigate</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* VIEW 3: REUSED LIVE GPS NAVIGATION ENGINE (GOOGLE MAPS STYLE EXPERIENCE) */}
        {/* ========================================================================= */}
        {viewMode === 'navigation' && selectedHospital && (
          <GoogleMapsNavigationMode
            destinationName={selectedHospital.name}
            destinationAddress={selectedHospital.address}
            destinationCoords={[selectedHospital.latitude, selectedHospital.longitude]}
            destinationType="hospital"
            initialUserCoords={userCoords}
            navigationStatus="Navigating to Hospital"
            onStopNavigation={handleStopNavigation}
          />
        )}
      </main>
    </div>
  );
};

export default EmergencyActionScreen;
