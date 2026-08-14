import React from 'react';
import { useTranslation } from 'react-i18next';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-full bg-surface flex flex-col items-center justify-center p-6 space-y-4 text-center">
        <div className="w-12 h-12 rounded-full bg-primary/20 text-primary flex items-center justify-center animate-spin">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <p className="text-xs font-bold text-on-surface-variant">{t('auth.verifyingAuth')}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
