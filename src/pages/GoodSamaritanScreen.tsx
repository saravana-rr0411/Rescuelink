import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { mockGoodSamaritanRights } from '../data/mockData';
import { Scale, ShieldCheck, FileText, PhoneCall, CheckCircle } from 'lucide-react';

export const GoodSamaritanScreen: React.FC = () => {
  return (
    <div className="flex flex-col min-h-full">
      <Navbar title="Good Samaritan Rights" showBack />

      <main className="flex-1 px-4 py-4 space-y-5">
        {/* Banner */}
        <div className="bg-gradient-to-br from-tertiary to-amber-800 text-white p-5 rounded-3xl shadow-level-2 space-y-2">
          <div className="flex items-center gap-2">
            <Scale className="w-6 h-6 text-amber-200" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-100">Legal Protection Charter</span>
          </div>
          <h2 className="text-xl font-extrabold leading-tight">You Are Protected By Law</h2>
          <p className="text-xs text-amber-100 leading-relaxed">
            The Good Samaritan Law protects anyone who offers reasonable assistance to those who are injured, ill, in peril, or otherwise incapacitated.
          </p>
        </div>

        {/* Core Guarantees */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/40 space-y-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-on-surface pt-1">Zero Civil Liability</h3>
            <p className="text-[10px] text-on-surface-variant">Immunity from lawsuits when helping in good faith.</p>
          </div>

          <div className="bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/40 space-y-1">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-xs text-on-surface pt-1">No Mandatory Detention</h3>
            <p className="text-[10px] text-on-surface-variant">Police cannot hold or force witness statement.</p>
          </div>
        </div>

        {/* Detailed Rights Accordion / Cards */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-on-surface uppercase tracking-wider">Key Legal Statutory Articles</h2>

          {mockGoodSamaritanRights.map((right) => (
            <div
              key={right.id}
              className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-level-1 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-tertiary bg-tertiary-fixed px-2 py-0.5 rounded-full">
                    {right.actSection}
                  </span>
                  <h3 className="font-bold text-sm text-on-surface mt-1">{right.title}</h3>
                </div>
                <span className="text-xs font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
                  {right.badge}
                </span>
              </div>

              <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
                {right.summary}
              </p>

              <div className="pt-2 border-t border-surface-container-high space-y-1.5">
                {right.details.map((detail, dIdx) => (
                  <div key={dIdx} className="flex items-start gap-2 text-xs text-on-surface">
                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{detail}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Legal Aid Helpline Card */}
        <div className="bg-surface-container-high p-4 rounded-3xl border border-outline-variant/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-tertiary/10 text-tertiary flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">Legal Aid Emergency Helpline</p>
              <p className="text-[10px] text-on-surface-variant">24/7 Samaritan Attorney Network</p>
            </div>
          </div>
          <a
            href="tel:18005550199"
            className="bg-tertiary text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs hover:bg-tertiary/90 transition-colors"
          >
            Call Lawyer
          </a>
        </div>
      </main>
    </div>
  );
};
