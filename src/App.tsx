import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MobileContainer } from './components/layout/MobileContainer';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { SpinnerLoader } from './components/common/SkeletonLoader';

// Lazy-loaded page components for bundle optimization & instant route transitions
const HomeScreen = lazy(() => import('./pages/HomeScreen').then((m) => ({ default: m.HomeScreen })));
const LoginScreen = lazy(() => import('./pages/LoginScreen').then((m) => ({ default: m.LoginScreen })));
const SignUpScreen = lazy(() => import('./pages/SignUpScreen').then((m) => ({ default: m.SignUpScreen })));
const ReportAccidentScreen = lazy(() => import('./pages/ReportAccidentScreen').then((m) => ({ default: m.ReportAccidentScreen })));
const EmergencyStatusScreen = lazy(() => import('./pages/EmergencyStatusScreen').then((m) => ({ default: m.EmergencyStatusScreen })));
const FirstAidGuideScreen = lazy(() => import('./pages/FirstAidGuideScreen').then((m) => ({ default: m.FirstAidGuideScreen })));
const GoodSamaritanScreen = lazy(() => import('./pages/GoodSamaritanScreen').then((m) => ({ default: m.GoodSamaritanScreen })));
const VolunteerDashboardScreen = lazy(() => import('./pages/VolunteerDashboardScreen').then((m) => ({ default: m.VolunteerDashboardScreen })));
const ProfileScreen = lazy(() => import('./pages/ProfileScreen').then((m) => ({ default: m.ProfileScreen })));
const LiveNavigationScreen = lazy(() => import('./pages/LiveNavigationScreen').then((m) => ({ default: m.LiveNavigationScreen })));
const EmergencyActionScreen = lazy(() => import('./pages/EmergencyActionScreen').then((m) => ({ default: m.EmergencyActionScreen })));
const NotificationsScreen = lazy(() => import('./pages/NotificationsScreen').then((m) => ({ default: m.NotificationsScreen })));
const CitizenHistoryScreen = lazy(() => import('./pages/CitizenHistoryScreen').then((m) => ({ default: m.CitizenHistoryScreen })));
const VolunteerHistoryScreen = lazy(() => import('./pages/VolunteerHistoryScreen').then((m) => ({ default: m.VolunteerHistoryScreen })));
const HistoryDetailsScreen = lazy(() => import('./pages/HistoryDetailsScreen').then((m) => ({ default: m.HistoryDetailsScreen })));
const VolunteerMapPreviewScreen = lazy(() => import('./pages/VolunteerMapPreviewScreen').then((m) => ({ default: m.VolunteerMapPreviewScreen })));
const GoogleMapTest = lazy(() => import('./components/common/GoogleMapTest').then((m) => ({ default: m.GoogleMapTest })));
const EmergencyTrainingScreen = lazy(() => import('./pages/EmergencyTrainingScreen').then((m) => ({ default: m.EmergencyTrainingScreen })));

const AppContent: React.FC = () => {
  const location = useLocation();
  const hideBottomNav =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/emergency' ||
    location.pathname === '/google-map-test' ||
    location.pathname.startsWith('/navigation') ||
    location.pathname.startsWith('/volunteer/preview');

  return (
    <MobileContainer>
      <Suspense fallback={<SpinnerLoader message="Loading RescueLink..." />}>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginScreen />} />
          <Route path="/signup" element={<SignUpScreen />} />

          {/* Protected Application Routes */}
          <Route path="/" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
          <Route path="/home" element={<ProtectedRoute><HomeScreen /></ProtectedRoute>} />
          <Route path="/emergency" element={<ProtectedRoute><EmergencyActionScreen /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><NotificationsScreen /></ProtectedRoute>} />
          <Route path="/report" element={<ProtectedRoute><ReportAccidentScreen /></ProtectedRoute>} />
          <Route path="/status" element={<ProtectedRoute><EmergencyStatusScreen /></ProtectedRoute>} />
          <Route path="/history" element={<ProtectedRoute><CitizenHistoryScreen /></ProtectedRoute>} />
          <Route path="/history/:id" element={<ProtectedRoute><HistoryDetailsScreen /></ProtectedRoute>} />
          <Route path="/first-aid" element={<ProtectedRoute><FirstAidGuideScreen /></ProtectedRoute>} />
          <Route path="/good-samaritan" element={<ProtectedRoute><GoodSamaritanScreen /></ProtectedRoute>} />
          <Route path="/training" element={<ProtectedRoute><EmergencyTrainingScreen /></ProtectedRoute>} />
          <Route path="/volunteer" element={<ProtectedRoute><VolunteerDashboardScreen /></ProtectedRoute>} />
          <Route path="/volunteer/preview/:accidentId" element={<ProtectedRoute><VolunteerMapPreviewScreen /></ProtectedRoute>} />
          <Route path="/volunteer/history" element={<ProtectedRoute><VolunteerHistoryScreen /></ProtectedRoute>} />
          <Route path="/volunteer/history/:id" element={<ProtectedRoute><HistoryDetailsScreen /></ProtectedRoute>} />
          <Route path="/navigation" element={<ProtectedRoute><LiveNavigationScreen /></ProtectedRoute>} />
          <Route path="/navigation/:accidentId" element={<ProtectedRoute><LiveNavigationScreen /></ProtectedRoute>} />
          <Route path="/navigation/*" element={<ProtectedRoute><LiveNavigationScreen /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
          <Route path="/google-map-test" element={<GoogleMapTest />} />
        </Routes>
      </Suspense>
      {!hideBottomNav && <BottomNavigation />}
    </MobileContainer>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <ProfileProvider>
        <NotificationProvider>
          <Router>
            <AppContent />
          </Router>
        </NotificationProvider>
      </ProfileProvider>
    </AuthProvider>
  );
};

export default App;
