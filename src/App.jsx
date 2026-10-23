import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Download, WifiOff } from 'lucide-react';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import AdminDashboard from './pages/AdminDashboard';
import Profile from './pages/Profile';
import Leaderboard from './pages/Leaderboard';
import MyLearning from './pages/MyLearning';
import CourseDetail from './pages/CourseDetail';
import Categories from './pages/Categories';
import Todos from './pages/Todos';
import Chat from './pages/Chat';
import VideoPlayer from './pages/VideoPlayer';
import PrivacyPolicy from './pages/PrivacyPolicy';
import ErrorBoundary from './components/ErrorBoundary';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED]">
        <div className="flex flex-col items-center gap-3">
          <span className="font-['Outfit'] text-2xl font-black text-[#431407]">
            Study<span className="text-[#EA580C]">Mate</span>
          </span>
          <div className="w-10 h-1 bg-[#FED7AA] rounded-full overflow-hidden">
            <div className="w-full h-full bg-[#EA580C] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const FeatureGate = ({ children, feature }) => {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF7ED]">
        <div className="flex flex-col items-center gap-3">
          <span className="font-['Outfit'] text-2xl font-black text-[#431407]">
            Study<span className="text-[#EA580C]">Mate</span>
          </span>
          <div className="w-10 h-1 bg-[#FED7AA] rounded-full overflow-hidden">
            <div className="w-full h-full bg-[#EA580C] animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (user.features && user.features[feature] === false) return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline  = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online',  handleOnline);

    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online',  handleOnline);
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
        <div className="fixed top-0 left-0 w-full z-[100] bg-red-600 text-white py-2 text-center text-xs sm:text-sm font-bold flex justify-center items-center gap-2 shadow-md">
          <WifiOff size={16} /> You are currently offline. Some features may be unavailable.
        </div>
      )}

      {deferredPrompt && (
        <button
          onClick={handleInstallPWA}
          className="fixed bottom-6 right-6 z-50 bg-[#EA580C] hover:bg-[#C2410C] text-white px-5 py-3 rounded-2xl shadow-xl border border-[#9A3412] flex items-center gap-2 font-bold transition-transform hover:scale-105 active:scale-95"
        >
          <Download size={20} /> Install App
        </button>
      )}

      <Router>
        <ErrorBoundary>
          <AuthProvider>
            <Routes>
              <Route path="/login"  element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/admin"  element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/dashboard" element={<ProtectedRoute><Home /></ProtectedRoute>} />
              <Route path="/my-learning" element={<ProtectedRoute><MyLearning /></ProtectedRoute>} />
              <Route path="/course/:courseId" element={<ProtectedRoute><CourseDetail /></ProtectedRoute>} />
              <Route path="/course/:courseId/video" element={<ProtectedRoute><VideoPlayer /></ProtectedRoute>} />
              <Route path="/course/:courseId/video/:videoId" element={<ProtectedRoute><VideoPlayer /></ProtectedRoute>} />
              <Route path="/course/:courseId/learn" element={<ProtectedRoute><VideoPlayer /></ProtectedRoute>} />
              <Route path="/categories" element={<ProtectedRoute><Categories /></ProtectedRoute>} />
              <Route path="/todos" element={<ProtectedRoute><Todos /></ProtectedRoute>} />
              <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/leaderboard" element={<FeatureGate feature="canUseLeaderboard"><Leaderboard /></FeatureGate>} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </AuthProvider>
        </ErrorBoundary>
      </Router>
    </>
  );
}
