import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/layout/Navbar';
import { mockFirstAidGuides } from '../data/mockData';
import { Search, HeartPulse, Droplet, Flame, Wind, AlertTriangle, BookOpen, Clock, ChevronDown, ChevronUp, Zap, Car, Waves, ShieldAlert, Activity, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const FirstAidGuideScreen: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string>('');

  useEffect(() => {
    // Reset scroll position to 0 when the page mounts
    const container = document.getElementById('main-scroll-container');
    if (container) {
      container.scrollTo(0, 0);
    }
    window.scrollTo(0, 0);
  }, []);

  const translatedGuides = mockFirstAidGuides.map(guide => ({
    ...guide,
    title: t(`firstAid.guides.${guide.id}.title`, guide.title),
    subtitle: t(`firstAid.guides.${guide.id}.subtitle`, guide.subtitle),
    readTime: t(`firstAid.guides.${guide.id}.readTime`, guide.readTime),
    steps: guide.steps.map((step, idx) => t(`firstAid.guides.${guide.id}.steps.${idx}`, step)),
    dos: guide.dos?.map((dItem, idx) => t(`firstAid.guides.${guide.id}.dos.${idx}`, dItem)),
    donts: guide.donts?.map((dontItem, idx) => t(`firstAid.guides.${guide.id}.donts.${idx}`, dontItem)),
    warnings: guide.warnings?.map((w, idx) => t(`firstAid.guides.${guide.id}.warnings.${idx}`, w))
  }));

  const filteredGuides = translatedGuides.filter((guide) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      guide.title.toLowerCase().includes(query) ||
      guide.subtitle.toLowerCase().includes(query) ||
      guide.steps.some((s) => s.toLowerCase().includes(query)) ||
      (guide.dos && guide.dos.some((d) => d.toLowerCase().includes(query))) ||
      (guide.donts && guide.donts.some((d) => d.toLowerCase().includes(query)));
    return matchesSearch;
  });

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'bleeding':
        return <Droplet className="w-5 h-5 text-rose-600" />;
      case 'heart_attack':
        return <HeartPulse className="w-5 h-5 text-red-600" />;
      case 'stroke':
        return <Activity className="w-5 h-5 text-purple-600" />;
      case 'fracture':
        return <ShieldAlert className="w-5 h-5 text-amber-600" />;
      case 'burns':
        return <Flame className="w-5 h-5 text-amber-600" />;
      case 'electric_shock':
        return <Zap className="w-5 h-5 text-yellow-600" />;
      case 'snake_bite':
        return <AlertTriangle className="w-5 h-5 text-emerald-600" />;
      case 'traffic_accident':
        return <Car className="w-5 h-5 text-blue-600" />;
      case 'choking':
        return <Wind className="w-5 h-5 text-cyan-600" />;
      case 'drowning':
        return <Waves className="w-5 h-5 text-blue-500" />;
      default:
        return <BookOpen className="w-5 h-5 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      <Navbar title={t('firstAid.title')} showBack />

      <main className="flex-1 px-4 py-4 space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-outline absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('firstAid.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-xs font-medium text-on-surface focus:outline-none focus:ring-2 focus:ring-secondary"
          />
        </div>



        {/* Guides List (10 Modules) */}
        <div className="space-y-3 pt-1">
          {filteredGuides.length === 0 ? (
            <div className="bg-surface-container-lowest p-6 rounded-3xl border border-outline-variant/50 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-outline mx-auto" />
              <p className="text-xs font-bold text-on-surface">{t('firstAid.noModulesFound')}</p>
              <p className="text-[11px] text-on-surface-variant">{t('firstAid.trySearching')}</p>
            </div>
          ) : (
            filteredGuides.map((guide) => {
              const isExpanded = expandedId === guide.id;
              return (
                <div
                  key={guide.id}
                  className="bg-surface-container-lowest rounded-3xl border border-outline-variant/50 shadow-level-1 overflow-hidden transition-all"
                >
                  {/* Card Header (Expandable Trigger) */}
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

                  {/* Expanded Module Body */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-1 border-t border-surface-container-high space-y-4 bg-surface-container-lowest">
                      <div className="flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-secondary" />
                          {guide.readTime}
                        </span>
                        <span className="font-bold text-primary">{t('firstAid.immediateResponseProtocol')}</span>
                      </div>

                      {/* 1. Immediate First-Aid Steps (4-6 points) */}
                      <div className="space-y-2">
                        <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">{t('firstAid.immediateFirstAidSteps')}</h4>
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

                      {/* 2. Do's and Don'ts Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {/* Do's Section */}
                        {guide.dos && guide.dos.length > 0 && (
                          <div className="bg-emerald-50/70 border border-emerald-200 p-3 rounded-2xl space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span>{t('firstAid.dos')}</span>
                            </div>
                            <ul className="text-[11px] text-emerald-950 space-y-1">
                              {guide.dos.map((dItem, dIdx) => (
                                <li key={dIdx} className="flex items-start gap-1.5">
                                  <span className="text-emerald-600 font-bold">•</span>
                                  <span className="leading-tight">{dItem}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Don'ts Section */}
                        {guide.donts && guide.donts.length > 0 && (
                          <div className="bg-rose-50/70 border border-rose-200 p-3 rounded-2xl space-y-1.5">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                              <span>{t('firstAid.donts')}</span>
                            </div>
                            <ul className="text-[11px] text-rose-950 space-y-1">
                              {guide.donts.map((dontItem, dontIdx) => (
                                <li key={dontIdx} className="flex items-start gap-1.5">
                                  <span className="text-rose-600 font-bold">•</span>
                                  <span className="leading-tight">{dontItem}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>

                      {/* 3. Critical Warnings */}
                      {guide.warnings && guide.warnings.length > 0 && (
                        <div className="bg-red-50 border border-red-200 p-3 rounded-2xl space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-red-900">
                            <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                            <span>{t('firstAid.criticalWarning')}</span>
                          </div>
                          <ul className="text-[11px] text-red-800 space-y-0.5 list-disc list-inside">
                            {guide.warnings.map((w, wIdx) => (
                              <li key={wIdx}>{w}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 4. Video Player Section */}
                      {guide.videoId && (
                        <div className="mt-4 bg-surface-container border border-outline-variant/60 p-3 rounded-3xl space-y-3 shadow-sm">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                              <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center">▶</span>
                              <span>{t('firstAid.videoGuide')}</span>
                            </h4>
                          </div>
                          <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black shadow-inner">
                            <iframe
                              className="absolute top-0 left-0 w-full h-full"
                              src={`https://www.youtube.com/embed/${guide.videoId}?rel=0&modestbranding=1`}
                              title={`${guide.title} First Aid Video`}
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                              loading="lazy"
                            ></iframe>
                          </div>
                          <p className="text-[11px] text-center font-bold text-on-surface-variant">
                            {t('firstAid.watchVideo')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>
    </div>
  );
};
