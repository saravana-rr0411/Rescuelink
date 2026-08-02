import React, { useState } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { mockFirstAidGuides } from '../data/mockData';
import { Search, HeartPulse, Droplet, Flame, Wind, AlertTriangle, BookOpen, Clock, ChevronDown, ChevronUp } from 'lucide-react';

export const FirstAidGuideScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string>('fa-1');

  const categories = [
    { id: 'all', name: 'All Guides' },
    { id: 'cpr', name: 'CPR & Heart' },
    { id: 'bleeding', name: 'Severe Bleeding' },
    { id: 'burns', name: 'Burns' },
    { id: 'choking', name: 'Choking' },
  ];

  const filteredGuides = mockFirstAidGuides.filter((guide) => {
    const matchesCat = selectedCategory === 'all' || guide.category === selectedCategory;
    const matchesSearch = guide.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          guide.subtitle.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'cpr': return <HeartPulse className="w-5 h-5 text-red-600" />;
      case 'bleeding': return <Droplet className="w-5 h-5 text-rose-600" />;
      case 'burns': return <Flame className="w-5 h-5 text-amber-600" />;
      case 'choking': return <Wind className="w-5 h-5 text-blue-600" />;
      default: return <BookOpen className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar title="First Aid Handbook" showBack />

      <main className="flex-1 px-4 py-4 space-y-4">
        {/* Offline Offline-Ready Badge */}
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl flex items-center justify-between text-xs text-emerald-900 font-medium">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span>Offline First Aid Handbook Active</span>
          </div>
          <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded-full">No Net Needed</span>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-outline absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search symptoms, injuries, CPR, choking..."
            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface-container-lowest text-on-surface-variant border border-outline-variant/50'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Guides List */}
        <div className="space-y-3 pt-1">
          {filteredGuides.map((guide) => {
            const isExpanded = expandedId === guide.id;
            return (
              <div
                key={guide.id}
                className="bg-surface-container-lowest rounded-3xl border border-outline-variant/50 shadow-level-1 overflow-hidden transition-all"
              >
                {/* Card Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? '' : guide.id)}
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-surface-container-low transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-surface-container-high shrink-0">
                      {getCategoryIcon(guide.category)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-xs text-on-surface">{guide.title}</h3>
                        {guide.urgency === 'CRITICAL' && (
                          <span className="text-[9px] font-extrabold bg-red-100 text-red-800 px-2 py-0.5 rounded-full uppercase">Critical</span>
                        )}
                      </div>
                      <p className="text-[11px] text-on-surface-variant">{guide.subtitle}</p>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-outline shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-outline shrink-0" />
                  )}
                </div>

                {/* Expanded Steps Body */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-1 border-t border-surface-container-high space-y-3 bg-surface-container-lowest">
                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-secondary" />
                        {guide.readTime}
                      </span>
                      <span className="font-bold text-primary">Follow Step-by-Step</span>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">Action Steps</h4>
                      <ol className="space-y-2">
                        {guide.steps.map((step, sIdx) => (
                          <li key={sIdx} className="flex items-start gap-2.5 text-xs text-on-surface">
                            <span className="w-5 h-5 rounded-full bg-secondary-fixed text-secondary font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                              {sIdx + 1}
                            </span>
                            <span className="leading-snug">{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>

                    {/* Warnings */}
                    <div className="bg-red-50 border border-red-200 p-3 rounded-2xl space-y-1">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                        <AlertTriangle className="w-4 h-4 text-red-700" />
                        <span>Critical Warning</span>
                      </div>
                      <ul className="text-[11px] text-red-800 space-y-0.5 list-disc list-inside">
                        {guide.warnings.map((w, wIdx) => (
                          <li key={wIdx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};
