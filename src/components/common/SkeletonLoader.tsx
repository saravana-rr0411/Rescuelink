import React from 'react';
import { type LucideIcon, Loader2 } from 'lucide-react';

interface SpinnerLoaderProps {
  message?: string;
}

export const SpinnerLoader: React.FC<SpinnerLoaderProps> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 space-y-3 animate-in fade-in duration-300 text-center">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
        <Loader2 className="w-5 h-5 text-primary animate-spin absolute" />
      </div>
      <p className="text-xs font-bold text-on-surface-variant tracking-wide">{message}</p>
    </div>
  );
};

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionText,
  onAction,
}) => {
  return (
    <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/50 shadow-level-1 text-center space-y-4 my-4 animate-in fade-in zoom-in-95 duration-300">
      <div className="w-16 h-16 rounded-3xl bg-surface-container-high text-on-surface-variant flex items-center justify-center mx-auto shadow-inner">
        <Icon className="w-8 h-8 text-outline" />
      </div>
      <div className="space-y-1.5 max-w-xs mx-auto">
        <h3 className="text-base font-extrabold text-on-surface">{title}</h3>
        <p className="text-xs text-on-surface-variant font-medium leading-relaxed">
          {description}
        </p>
      </div>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="px-6 py-3 bg-primary text-white font-black text-xs rounded-2xl shadow-level-1 hover:bg-primary-hover active:scale-95 transition-all"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div className="bg-surface-container-lowest p-4.5 rounded-3xl border border-outline-variant/50 shadow-xs space-y-3.5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-5 w-24 bg-surface-container-high rounded-full"></div>
        <div className="h-5 w-20 bg-surface-container-high rounded-full"></div>
      </div>
      <div className="space-y-2">
        <div className="h-4 w-3/4 bg-surface-container-high rounded-lg"></div>
        <div className="h-3 w-1/2 bg-surface-container-high rounded-lg"></div>
      </div>
      <div className="grid grid-cols-2 gap-2 p-3 bg-surface-container-low rounded-2xl border border-outline-variant/30">
        <div className="h-8 bg-surface-container-high rounded-xl"></div>
        <div className="h-8 bg-surface-container-high rounded-xl"></div>
      </div>
      <div className="h-10 w-full bg-surface-container-high rounded-2xl"></div>
    </div>
  );
};

export const HospitalSkeleton: React.FC = () => {
  return (
    <div className="bg-surface-container-lowest p-4 rounded-3xl border border-outline-variant/50 shadow-xs space-y-3 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-surface-container-high"></div>
          <div className="space-y-1.5">
            <div className="h-4 w-40 bg-surface-container-high rounded-md"></div>
            <div className="h-3 w-28 bg-surface-container-high rounded-md"></div>
          </div>
        </div>
        <div className="h-7 w-16 bg-surface-container-high rounded-full"></div>
      </div>
      <div className="h-9 w-full bg-surface-container-high rounded-xl"></div>
    </div>
  );
};

export const StatusCardSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="p-5 rounded-3xl bg-surface-container-high h-44 shadow-level-1 space-y-4">
        <div className="flex justify-between">
          <div className="h-6 w-32 bg-surface-container rounded-full"></div>
          <div className="h-6 w-16 bg-surface-container rounded-full"></div>
        </div>
        <div className="h-8 w-48 bg-surface-container rounded-lg"></div>
        <div className="h-3 w-full bg-surface-container rounded-full"></div>
      </div>
      <div className="p-5 rounded-3xl bg-surface-container-lowest border border-outline-variant/50 space-y-3">
        <div className="h-5 w-40 bg-surface-container-high rounded-lg"></div>
        <div className="space-y-3 pt-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-surface-container-high"></div>
              <div className="h-4 flex-1 bg-surface-container-high rounded-md"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
