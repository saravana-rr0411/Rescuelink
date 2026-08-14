import React, { useRef, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { HeartPulse, ShieldAlert, BookOpen, AlertCircle, Phone, Heart, Users, Play, X, Video } from 'lucide-react';
import { useNetworkSync } from '../hooks/useNetworkSync';

export const EmergencyTrainingScreen: React.FC = () => {
  const navigate = useNavigate();
  const cprRef = useRef<HTMLElement>(null);
  const responseRef = useRef<HTMLElement>(null);
  const firstAidRef = useRef<HTMLElement>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const { isOnline } = useNetworkSync();

  useEffect(() => {
    const container = document.getElementById('main-scroll-container');
    if (container) {
      container.scrollTop = 0;
    }
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar title="Emergency Response Training" showBack />

      <main className="flex-1 pb-16">
        {/* HERO */}
        <section className="bg-slate-900 text-white px-6 py-12 border-b border-slate-800">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold tracking-tight mb-3">Emergency Response Training</h1>
            <p className="text-lg text-slate-300 max-w-xl leading-relaxed font-medium">
              Learn the basic knowledge needed to respond safely during an emergency.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-12">

          {/* ========================================================================= */}
          {/* SECTION 1 — CPR AWARENESS */}
          {/* ========================================================================= */}
          <section ref={cprRef} className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-6 h-6 text-rose-600" /> CPR Awareness
              </h2>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <p className="text-base text-slate-700 mb-6 font-medium leading-relaxed">
                Learn how to recognise a possible cardiac emergency and understand the importance of immediate response and professional assistance.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-4 rounded border border-slate-100 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Recognising a possible cardiac emergency</h3>
                    <p className="text-xs text-slate-600 mt-1">Look for unresponsiveness and abnormal or absent breathing.</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded border border-slate-100 flex items-start gap-3">
                  <Phone className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Calling for emergency assistance</h3>
                    <p className="text-xs text-slate-600 mt-1">Dial emergency services immediately. Ensure the dispatcher knows the exact location.</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded border border-slate-100 flex items-start gap-3">
                  <Heart className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Basic CPR awareness</h3>
                    <p className="text-xs text-slate-600 mt-1">CPR involves rhythmic chest compressions to maintain blood flow.</p>
                  </div>
                </div>
                
                <div className="bg-slate-50 p-4 rounded border border-slate-100 flex items-start gap-3">
                  <Users className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-bold text-sm text-slate-900">Following professional guidance</h3>
                    <p className="text-xs text-slate-600 mt-1">Stay on the phone. Emergency dispatchers can provide step-by-step guidance.</p>
                  </div>
                </div>
              </div>

              {/* VIDEO LEARNING AREA */}
              <div className="mb-6">
                <h3 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
                  <Video className="w-5 h-5 text-slate-500" />
                  Educational CPR Videos
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* VIDEO CARD 1 */}
                  <button 
                    onClick={() => isOnline ? setActiveVideoId('M4ACYp75mjU') : alert('An internet connection is required to play educational videos.')}
                    className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow text-left group flex flex-col"
                  >
                    <div className="w-full aspect-video bg-slate-800 relative flex items-center justify-center">
                      <img 
                        src="https://img.youtube.com/vi/M4ACYp75mjU/maxresdefault.jpg" 
                        alt="Learn Hands-Only CPR in 60 seconds - AHA"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => { e.currentTarget.src = "https://img.youtube.com/vi/M4ACYp75mjU/hqdefault.jpg"; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-rose-600 shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 ml-1" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Learn Hands-Only CPR (60s)</h4>
                      <p className="text-xs text-slate-500">American Heart Association (AHA)</p>
                    </div>
                  </button>

                  {/* VIDEO CARD 2 */}
                  <button 
                    onClick={() => isOnline ? setActiveVideoId('ILxjxfB4zNk') : alert('An internet connection is required to play educational videos.')}
                    className="bg-slate-50 border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow text-left group flex flex-col"
                  >
                    <div className="w-full aspect-video bg-slate-800 relative flex items-center justify-center">
                      <img 
                        src="https://img.youtube.com/vi/ILxjxfB4zNk/maxresdefault.jpg" 
                        alt="Vinnie Jones' hard and fast Hands-only CPR - BHF"
                        className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                        onError={(e) => { e.currentTarget.src = "https://img.youtube.com/vi/ILxjxfB4zNk/hqdefault.jpg"; }}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-12 h-12 bg-white/90 rounded-full flex items-center justify-center text-rose-600 shadow-lg group-hover:scale-110 transition-transform">
                          <Play className="w-5 h-5 ml-1" />
                        </div>
                      </div>
                    </div>
                    <div className="p-3">
                      <h4 className="font-bold text-sm text-slate-900 mb-1">Hands-only CPR (Vinnie Jones)</h4>
                      <p className="text-xs text-slate-500">British Heart Foundation (BHF)</p>
                    </div>
                  </button>

                </div>
              </div>

              <div className="bg-rose-50 border-l-4 border-rose-500 p-4 text-sm text-rose-900">
                <p className="font-bold mb-1">Important Safety Note</p>
                <p>
                  This information is provided for general awareness only. Viewing this content does not provide medical certification, nor does it replace professional, hands-on CPR training.
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 2 — ROAD ACCIDENT RESPONSE */}
          {/* ========================================================================= */}
          <section ref={responseRef} className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-6 h-6 text-amber-600" /> Road Accident Response
              </h2>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
              
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-slate-100 text-slate-800 font-bold flex items-center justify-center rounded-xl">
                  01
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1 tracking-wide">ASSESS</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Check whether the scene is reasonably safe before approaching.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-slate-100 text-slate-800 font-bold flex items-center justify-center rounded-xl">
                  02
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1 tracking-wide">REPORT</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Contact emergency assistance and provide the accident location.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-slate-100 text-slate-800 font-bold flex items-center justify-center rounded-xl">
                  03
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1 tracking-wide">SHARE INFORMATION</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Provide clear information about the location and situation.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-slate-100 text-slate-800 font-bold flex items-center justify-center rounded-xl">
                  04
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1 tracking-wide">ASSIST SAFELY</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">If it is safe to do so, provide reasonable assistance within your knowledge and ability.</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 bg-slate-100 text-slate-800 font-bold flex items-center justify-center rounded-xl">
                  05
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 mb-1 tracking-wide">COORDINATE</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">Follow appropriate guidance and cooperate with arriving responders.</p>
                </div>
              </div>

            </div>
          </section>

          {/* ========================================================================= */}
          {/* SECTION 3 — FIRST AID LINK */}
          {/* ========================================================================= */}
          <section ref={firstAidRef} className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-blue-600" /> First Aid Basics
              </h2>
            </div>
            
            <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-6">
              <div>
                <p className="text-sm text-slate-300 font-medium">
                  Learn essential first-aid practices for emergency situations.
                </p>
              </div>
              <button
                onClick={() => navigate('/first-aid')}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors whitespace-nowrap shrink-0 active:scale-95 shadow-sm"
              >
                Open First Aid
              </button>
            </div>
          </section>

        </div>
      </main>

      {/* VIDEO MODAL */}
      {activeVideoId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/95 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="flex items-center justify-between p-4 border-b border-slate-800">
              <div>
                <h3 className="font-bold text-white">Educational Video</h3>
                <p className="text-xs text-slate-400">Press play to begin</p>
              </div>
              <button
                onClick={() => setActiveVideoId(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-full aspect-video bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1`}
                title="Educational CPR Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              ></iframe>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmergencyTrainingScreen;
