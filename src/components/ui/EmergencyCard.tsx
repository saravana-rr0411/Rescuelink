import React from 'react';
import type { EmergencyIncident } from '../../data/mockData';
import { StatusBadge } from './StatusBadge';
import { MapPin, Clock, Users, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface EmergencyCardProps {
  incident: EmergencyIncident;
}

export const EmergencyCard: React.FC<EmergencyCardProps> = ({ incident }) => {
  const navigate = useNavigate();

  return (
    <div 
      onClick={() => navigate('/status')}
      className="bg-surface-container-lowest border border-outline-variant/50 rounded-2xl p-4 shadow-level-1 hover:shadow-level-2 transition-all cursor-pointer group"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="font-bold text-on-surface text-base group-hover:text-primary transition-colors">
          {incident.title}
        </h3>
        <StatusBadge status={incident.status} />
      </div>

      <p className="text-xs text-on-surface-variant line-clamp-2 mb-3">
        {incident.description}
      </p>

      <div className="flex flex-wrap items-center justify-between text-xs text-on-surface-variant/80 pt-2 border-t border-surface-container-high gap-2">
        <div className="flex items-center gap-1.5 font-medium">
          <MapPin className="w-3.5 h-3.5 text-primary" />
          <span>{incident.location} ({incident.distance})</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-secondary" />
            <span>{incident.timeAgo}</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-tertiary" />
            <span>{incident.respondersAssigned} Assigned</span>
          </div>
          <ChevronRight className="w-4 h-4 text-outline group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>
    </div>
  );
};
