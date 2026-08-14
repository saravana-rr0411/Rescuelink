import React, { useRef } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { BookOpen, HeartPulse, ShieldAlert, ChevronRight, Info } from 'lucide-react';

export const EmergencyTrainingScreen: React.FC = () => {
  const firstAidRef = useRef<HTMLElement>(null);
  const cprRef = useRef<HTMLElement>(null);
  const responseRef = useRef<HTMLElement>(null);

  const scrollTo = (ref: React.RefObject<HTMLElement | null>) => {
    if (ref.current) {
      const top = ref.current.getBoundingClientRect().top + window.scrollY - 80;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar title="Emergency Training" showBack />

      <main className="flex-1 pb-16">
        {/* HERO */}
        <section className="bg-slate-900 text-white px-6 py-10 border-b border-slate-800">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold tracking-tight mb-2">Emergency Response Training</h1>
            <p className="text-sm text-slate-400 max-w-xl leading-relaxed">
              Learn the basic knowledge needed to respond safely during an emergency.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 py-8 space-y-12">
          
          {/* LEARNING OVERVIEW CARDS */}
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button 
              onClick={() => scrollTo(firstAidRef)}
              className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                <BookOpen className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1 group-hover:text-blue-700 transition-colors">First Aid Basics</h3>
              <p className="text-xs text-slate-500">Core principles of first response.</p>
            </button>

            <button 
              onClick={() => scrollTo(cprRef)}
              className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-3">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1 group-hover:text-rose-700 transition-colors">CPR Awareness</h3>
              <p className="text-xs text-slate-500">Recognising cardiac emergencies.</p>
            </button>

            <button 
              onClick={() => scrollTo(responseRef)}
              className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow text-left group"
            >
              <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 mb-1 group-hover:text-amber-700 transition-colors">Accident Response</h3>
              <p className="text-xs text-slate-500">Safe steps at a road accident.</p>
            </button>
          </section>

          {/* DETAILED CONTENT */}
          
          {/* 1. FIRST AID BASICS */}
          <section ref={firstAidRef} className="scroll-mt-24 space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" /> First Aid Basics
              </h2>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
              <p className="text-sm text-slate-600 font-medium">
                Understand the basic principles of providing safe assistance while professional help is being arranged.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Scene Safety</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Always ensure the area is safe for yourself before approaching a victim.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Initial Assessment</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Observe the victim's condition. Are they conscious? Are they breathing normally?</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Provide Safe Assistance</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Assist only within the boundaries of your current knowledge. Reassure the victim and keep them calm.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center shrink-0">
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">What To Avoid</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Do not move a severely injured person unless there is an immediate threat to their life (e.g., fire).</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 2. CPR AWARENESS */}
          <section ref={cprRef} className="scroll-mt-24 space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <HeartPulse className="w-5 h-5 text-rose-600" /> CPR Awareness
              </h2>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
              <p className="text-sm text-slate-600 font-medium">
                Learn the basics of recognising a cardiac emergency and the importance of getting immediate professional assistance.
              </p>
              
              <div className="space-y-3 pt-2">
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded bg-rose-50 flex items-center justify-center shrink-0">
                    <span className="text-rose-600 font-bold text-xs">1</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Recognise the Emergency</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Check if the person is unresponsive and not breathing, or only gasping.</p>
                  </div>
                </div>
                
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded bg-rose-50 flex items-center justify-center shrink-0">
                    <span className="text-rose-600 font-bold text-xs">2</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Call for Help</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Immediately call emergency services. Ask a bystander to find an AED if available.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded bg-rose-50 flex items-center justify-center shrink-0">
                    <span className="text-rose-600 font-bold text-xs">3</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Basic CPR Knowledge</h4>
                    <p className="text-sm text-slate-600 mt-0.5">CPR involves chest compressions to keep blood flowing. Follow the emergency dispatcher's instructions—they can guide you through the process over the phone.</p>
                  </div>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-slate-50 border border-slate-200 rounded flex items-start gap-2">
                <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-600 leading-relaxed">
                  Note: Reading this information does not provide professional medical certification. Consider enrolling in a certified CPR training course in your area for hands-on practice.
                </p>
              </div>
            </div>
          </section>

          {/* 3. ROAD ACCIDENT RESPONSE */}
          <section ref={responseRef} className="scroll-mt-24 space-y-4">
            <div className="border-b border-slate-200 pb-2">
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" /> Road Accident Response
              </h2>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
              <p className="text-sm text-slate-600 font-medium">
                Learn how a bystander can respond safely when witnessing a road accident.
              </p>
              
              <ul className="space-y-3 pt-2">
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2"></div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Assess Scene Safety</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Ensure you are safe from oncoming traffic, fire, or hazards before acting.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2"></div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Contact Emergency Assistance</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Call emergency services immediately or use the RescueLink reporting tool.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2"></div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Share Accurate Location</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Provide exact details, landmarks, and the number of people involved.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2"></div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Avoid Unnecessary Risks</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Do not place yourself in the path of traffic to warn others unless it is completely safe and you have high-visibility gear.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-2"></div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">Coordinate With Responders</h4>
                    <p className="text-sm text-slate-600 mt-0.5">Once help arrives, step back and inform them of any observations you made.</p>
                  </div>
                </li>
              </ul>
            </div>
          </section>

          {/* CLOSING */}
          <div className="bg-slate-100 p-5 rounded border border-slate-200 text-center">
            <p className="text-sm font-semibold text-slate-700">
              Learning the basics can help you respond with greater confidence while professional assistance is on the way.
            </p>
          </div>

        </div>
      </main>
    </div>
  );
};

export default EmergencyTrainingScreen;
