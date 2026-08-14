import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { mockGoodSamaritanRights } from '../data/mockData';
import {
  Shield,
  Phone,
  CheckCircle2,
  Info,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

export const GoodSamaritanScreen: React.FC = () => {
  const navigate = useNavigate();
  const rightsRef = useRef<HTMLDivElement>(null);

  const scrollToRights = () => {
    if (rightsRef.current) {
      // Account for sticky Navbar height
      const offset = 80;
      const top = rightsRef.current.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const handleReportEmergency = () => {
    navigate('/report');
  };

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 text-slate-900 font-sans">
      <Navbar title="Good Samaritan Protection" showBack />

      <main className="flex-1 pb-16">
        
        {/* ========================================================================= */}
        {/* 1. HERO — GOOD SAMARITAN PROTECTION */}
        {/* ========================================================================= */}
        <section className="bg-slate-900 text-white px-6 py-12 border-b border-slate-800">
          <div className="max-w-3xl mx-auto">
            <div className="mb-4 text-blue-400">
              <Shield className="w-8 h-8" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-3">Good Samaritan Protection</h1>
            <p className="text-lg font-medium text-slate-300 mb-4">Helping an injured person should not begin with fear.</p>
            <p className="text-sm text-slate-400 leading-relaxed max-w-2xl mb-8">
              Understand your rights and the basic steps you can take when you witness a road emergency.
            </p>
            <button 
              onClick={scrollToRights}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white text-slate-900 text-sm font-semibold rounded hover:bg-slate-100 transition-colors"
            >
              Know Your Rights
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 space-y-12 py-10">

          {/* ========================================================================= */}
          {/* 2. KNOW YOUR RIGHTS */}
          {/* ========================================================================= */}
          <section ref={rightsRef} className="space-y-6 scroll-mt-20">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900">Know Your Rights</h2>
              <p className="text-sm text-slate-600 mt-2">
                Good Samaritan protections are intended to encourage members of the public to provide reasonable assistance during emergencies.
              </p>
            </div>

            <div className="space-y-4">
              {mockGoodSamaritanRights.map((right) => (
                <div key={right.id} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-wider rounded mb-2">
                        {right.actSection}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 leading-tight">{right.title}</h3>
                    </div>
                    <span className="inline-block px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-100 text-xs font-semibold rounded shrink-0">
                      {right.badge}
                    </span>
                  </div>
                  
                  <p className="text-sm text-slate-700 font-medium mb-4">{right.summary}</p>
                  
                  <ul className="space-y-2 border-t border-slate-100 pt-4">
                    {right.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-600">
                        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{detail}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 3. DON'T BE AFRAID TO HELP */}
          {/* ========================================================================= */}
          <section className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900">Don't Be Afraid to Help</h2>
              <p className="text-sm text-slate-600 mt-2">
                People may hesitate to assist after witnessing an accident because they are uncertain about legal consequences, lack first-aid knowledge, or fear making the situation worse.
              </p>
            </div>

            <div className="grid gap-4">
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-500" />
                  "I do not know first aid."
                </h3>
                <p className="text-sm text-slate-600 pl-6 border-l-2 border-blue-100 ml-2">
                  You can still report the emergency, share the location, and seek appropriate assistance. You do not need to be a medical professional to take the first responsible step.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-500" />
                  "Will helping create legal problems for me?"
                </h3>
                <p className="text-sm text-slate-600 pl-6 border-l-2 border-blue-100 ml-2">
                  Good Samaritan protections exist to encourage people to assist during emergencies. Review the applicable protections provided in the section above.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-500" />
                  "What if I make the situation worse?"
                </h3>
                <p className="text-sm text-slate-600 pl-6 border-l-2 border-blue-100 ml-2">
                  Prioritise your own safety and provide only assistance that is appropriate to your knowledge and circumstances.
                </p>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 4. WHAT SHOULD I DO? */}
          {/* ========================================================================= */}
          <section className="space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h2 className="text-2xl font-bold text-slate-900">What Should I Do When I Witness an Accident?</h2>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6">
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-slate-100 text-slate-700 font-bold flex items-center justify-center rounded">
                    01
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">CHECK</h3>
                    <p className="text-sm text-slate-600">Ensure that the scene is reasonably safe before approaching.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-slate-100 text-slate-700 font-bold flex items-center justify-center rounded">
                    02
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">CALL</h3>
                    <p className="text-sm text-slate-600">Report the emergency and provide the location and relevant information.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-slate-100 text-slate-700 font-bold flex items-center justify-center rounded">
                    03
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 mb-1">HELP</h3>
                    <p className="text-sm text-slate-600">If it is safe to do so, provide reasonable assistance within your knowledge and comfort level.</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-500">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <p>Do not put yourself at risk while attempting to assist another person.</p>
              </div>
            </div>
          </section>

          {/* ========================================================================= */}
          {/* 5. TAKE ACTION */}
          {/* ========================================================================= */}
          <section className="space-y-6">
            <div className="bg-slate-900 text-white rounded-lg p-6 border border-slate-800">
              <h2 className="text-xl font-bold mb-2">Witnessed a Road Accident?</h2>
              <p className="text-sm text-slate-300 mb-6">
                Report the incident so that appropriate assistance can be coordinated.
              </p>
              
              <button
                onClick={handleReportEmergency}
                className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                Report Emergency
              </button>
            </div>

            {/* LEGAL AID */}
            <div className="bg-white border border-slate-200 rounded-lg p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded bg-slate-50 flex items-center justify-center border border-slate-100 text-slate-600">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Legal Aid Emergency Helpline</h3>
                  <p className="text-xs text-slate-500">24/7 Samaritan Attorney Network</p>
                </div>
              </div>
              <a
                href="tel:18005550199"
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-semibold rounded transition-colors border border-slate-200"
              >
                Call
              </a>
            </div>
          </section>

        </div>
      </main>
    </div>
  );
};

export default GoodSamaritanScreen;
