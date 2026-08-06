import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProfileProvider } from './context/ProfileContext';
import { NotificationProvider } from './context/NotificationContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MobileContainer } from './components/layout/MobileContainer';
import { BottomNavigation } from './components/layout/BottomNavigation';
import { HomeScreen } from './pages/HomeScreen';
import { LoginScreen } from './pages/LoginScreen';
import { SignUpScreen } from './pages/SignUpScreen';
import { ReportAccidentScreen } from './pages/ReportAccidentScreen';
import { EmergencyStatusScreen } from './pages/EmergencyStatusScreen';
import { FirstAidGuideScreen } from './pages/FirstAidGuideScreen';
import { GoodSamaritanScreen } from './pages/GoodSamaritanScreen';
import { VolunteerDashboardScreen } from './pages/VolunteerDashboardScreen';
import { ProfileScreen } from './pages/ProfileScreen';
import { LiveNavigationScreen } from './pages/LiveNavigationScreen';
import { EmergencyActionScreen } from './pages/EmergencyActionScreen';
import { NotificationsScreen } from './pages/NotificationsScreen';
import { CitizenHistoryScreen } from './pages/CitizenHistoryScreen';
import { VolunteerHistoryScreen } from './pages/VolunteerHistoryScreen';
import { HistoryDetailsScreen } from './pages/HistoryDetailsScreen';

const AppContent: React.FC = () => {
  const location = useLocation();
  const hideBottomNav =
    location.pathname === '/login' ||
    location.pathname === '/signup' ||
    location.pathname === '/emergency' ||
    location.pathname.startsWith('/navigation');

  return (
    <MobileContainer>
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
        <Route path="/volunteer" element={<ProtectedRoute><VolunteerDashboardScreen /></ProtectedRoute>} />
        <Route path="/volunteer/history" element={<ProtectedRoute><VolunteerHistoryScreen /></ProtectedRoute>} />
        <Route path="/volunteer/history/:id" element={<ProtectedRoute><HistoryDetailsScreen /></ProtectedRoute>} />
        <Route path="/navigation" element={<ProtectedRoute><LiveNavigationScreen /></ProtectedRoute>} />
        <Route path="/navigation/:accidentId" element={<ProtectedRoute><LiveNavigationScreen /></ProtectedRoute>} />
        <Route path="/navigation/*" element={<ProtectedRoute><LiveNavigationScreen /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><ProfileScreen /></ProtectedRoute>} />
      </Routes>
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
