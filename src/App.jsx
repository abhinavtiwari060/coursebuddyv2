import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { settingsService } from './api/api';
import { Download, WifiOff } from 'lucide-react';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Community from './pages/Community';
import TelegramApp from './pages/TelegramApp';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center dark:text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
};

const FeatureGate = ({ children, feature }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center dark:text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.features && user.features[feature] === false) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    // Listen for network status
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    // 1. Listen for PWA installation prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 2. Fetch Global Settings (Theme)
    const loadSettings = async () => {
      try {
        const config = await settingsService.getSettings();
        if (config.theme) {
          // Remove all theme classes first
          document.documentElement.classList.remove('theme-lavender'); 
          if (config.theme !== 'default') {
            document.documentElement.classList.add(config.theme);
          }
        }
      } catch (err) {
        console.error('Failed to load global settings');
      }
    };
    loadSettings();
    const interval = setInterval(loadSettings, 15000); // Sync every 15s

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
      clearInterval(interval);
    };
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
  };

  return (
    <>
      {isOffline && (
        <div className="fixed top-0 left-0 w-full z-[100] bg-red-500 text-white py-2 text-center text-sm font-bold flex justify-center items-center gap-2 shadow-md animate-fade-in">
          <WifiOff size={16} /> You are currently offline. Some features may be unavailable.
        </div>
      )}

      {deferredPrompt && (
        <button
          onClick={handleInstallPWA}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold transition-transform hover:scale-105 active:scale-95"
        >
          <Download size={20} />
          Install App
        </button>
      )}
      <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route 
            path="/admin" 
            element={
              <ProtectedRoute>
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/profile" 
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/leaderboard" 
            element={
              <FeatureGate feature="canUseLeaderboard">
                <Leaderboard />
              </FeatureGate>
            } 
          />
          <Route 
            path="/community" 
            element={
              <FeatureGate feature="canUseCommunity">
                <Community />
              </FeatureGate>
            } 
          />
          <Route 
            path="/telegram-sync" 
            element={
              <ProtectedRoute>
                <TelegramApp />
              </ProtectedRoute>
            } 
          />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
    </>
  );
}
