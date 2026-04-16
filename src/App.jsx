import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { settingsService } from './api/api';
import { Download } from 'lucide-react';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import Community from './pages/Community';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) return <div className="min-h-screen flex items-center justify-center dark:text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  return children;
};

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
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
      {deferredPrompt && (
        <button
          onClick={handleInstallPWA}
          className="fixed bottom-6 right-6 z-50 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 rounded-full shadow-2xl flex items-center gap-2 font-bold transition-transform hover:scale-105 active:scale-95"
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
              <ProtectedRoute>
                <Leaderboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/community" 
            element={
              <ProtectedRoute>
                <Community />
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
