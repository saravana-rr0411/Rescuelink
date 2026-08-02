import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navbar } from '../components/layout/Navbar';
import { SOSButton } from '../components/ui/SOSButton';
import { EmergencyCard } from '../components/ui/EmergencyCard';
import { mockActiveIncidents, mockUserProfile } from '../data/mockData';
import { Stethoscope, Car, Flame, ShieldAlert, BookOpen, Scale, PhoneCall, ShieldCheck } from 'lucide-react';

export const HomeScreen: React.FC = () => {
  const navigate = useNavigate();

  const categories = [
    { id: 'medical', title: 'Medical Alert', icon: Stethoscope, color: 'bg-red-100 text-red-700 border-red-200' },
    { id: 'accident', title: 'Car Accident', icon: Car, color: 'bg-blue-100 text-blue-700 border-blue-200' },
    { id: 'fire', title: 'Fire Alert', icon: Flame, color: 'bg-amber-100 text-amber-700 border-amber-200' },
    { id: 'crime', title: 'Safety Hazard', icon: ShieldAlert, color: 'bg-purple-100 text-purple-700 border-purple-200' },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 px-4 py-4 space-y-6">
        {/* Banner: Local Status */}
        <div className="bg-gradient-to-r from-primary to-primary-container text-white p-4 rounded-3xl shadow-level-2 flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-red-200" />
              <span className="text-xs font-bold uppercase tracking-wider text-red-100">RescueLink Active</span>
            </div>
            <h2 className="text-lg font-extrabold leading-snug">14 Responders Nearby</h2>
            <p className="text-xs text-red-100">Average response time: <span className="font-bold underline">4.2 minutes</span></p>
          </div>
          <button 
            onClick={() => navigate('/volunteer')}
            className="bg-white text-primary text-xs font-bold px-3 py-2 rounded-xl shadow-sm hover:bg-red-50 transition-colors shrink-0"
          >
            Volunteer Mode
          </button>
        </div>

        {/* SOS Central Trigger */}
        <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/40 shadow-level-1 text-center">
          <h2 className="text-base font-bold text-on-surface mb-1">In an Immediate Emergency?</h2>
          <p className="text-xs text-on-surface-variant mb-2">Tap below for automatic GPS dispatch & audio SOS</p>
          <SOSButton />
        </div>

        {/* Quick Emergency Category Dispatch */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Quick Category Dispatch</h2>
            <span className="text-xs text-on-surface-variant font-medium">Select type</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => navigate('/report', { state: { category: cat.id } })}
                  className="bg-surface-container-lowest p-3.5 rounded-2xl border border-outline-variant/40 flex items-center gap-3 hover:border-primary/50 transition-all text-left group"
                >
                  <div className={`p-2.5 rounded-xl ${cat.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-on-surface group-hover:text-primary transition-colors">{cat.title}</h3>
                    <p className="text-[10px] text-on-surface-variant font-medium">1-Tap Report</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Local Incidents */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Active Nearby Alerts</h2>
            <button 
              onClick={() => navigate('/status')}
              className="text-xs font-bold text-primary hover:underline"
            >
              View Status
            </button>
          </div>

          <div className="space-y-3">
            {mockActiveIncidents.map((incident) => (
              <EmergencyCard key={incident.id} incident={incident} />
            ))}
          </div>
        </div>

        {/* Knowledge & Protection Shortcuts */}
        <div className="space-y-3">
          <h2 className="text-sm font-bold text-on-surface uppercase tracking-wider">Essential Resources</h2>
          
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/first-aid')}
              className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 hover:shadow-level-2 transition-all text-left flex flex-col justify-between h-28"
            >
              <div className="w-8 h-8 rounded-xl bg-secondary-fixed text-secondary flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-on-surface">First Aid Guide</h3>
                <p className="text-[10px] text-on-surface-variant">CPR & Trauma steps</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/good-samaritan')}
              className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/40 hover:shadow-level-2 transition-all text-left flex flex-col justify-between h-28"
            >
              <div className="w-8 h-8 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center">
                <Scale className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-on-surface">Samaritan Rights</h3>
                <p className="text-[10px] text-on-surface-variant">Legal protections</p>
              </div>
            </button>
          </div>
        </div>

        {/* Primary Contact Hotline */}
        <div className="bg-surface-container-high p-4 rounded-2xl flex items-center justify-between border border-outline-variant/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-on-surface">Emergency Hotline Contact</p>
              <p className="text-[11px] text-on-surface-variant">{mockUserProfile.emergencyContacts[0].name} ({mockUserProfile.emergencyContacts[0].relation})</p>
            </div>
          </div>
          <a
            href={`tel:${mockUserProfile.emergencyContacts[0].phone}`}
            className="bg-primary text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs hover:bg-primary-hover transition-colors"
          >
            Call
          </a>
        </div>
      </main>
    </div>
  );
};
