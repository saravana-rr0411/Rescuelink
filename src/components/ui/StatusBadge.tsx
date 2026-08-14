import React from 'react';

interface StatusBadgeProps {
  status: 'DISPATCHED' | 'EN_ROUTE' | 'ON_SCENE' | 'RESOLVED' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeStyle = () => {
    switch (status) {
      case 'EN_ROUTE':
        return 'bg-blue-100 text-blue-900 border-blue-300';
      case 'ON_SCENE':
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
      case 'DISPATCHED':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'RESOLVED':
        return 'bg-slate-100 text-slate-700 border-slate-200';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  const getLabel = () => {
    switch (status) {
      case 'EN_ROUTE':
        return 'Ambulance En Route';
      case 'ON_SCENE':
        return 'Responder On Scene';
      case 'DISPATCHED':
        return 'Dispatching Help';
      case 'RESOLVED':
        return 'Resolved';
      default:
        return status;
    }
  };

  return (
    <span className={`px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider rounded-full border shadow-sm inline-flex items-center gap-1.5 ${getBadgeStyle()}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
      {getLabel()}
    </span>
  );
};
