import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function GlobalNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Don't show on login/signup or if not logged in
  if (!user || location.pathname === '/login' || location.pathname === '/signup') {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
      {location.pathname !== '/dashboard' && location.pathname !== '/admin' && (
        <>
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 flex items-center justify-center bg-white hover:bg-[#FFF7ED] text-[#C2410C] rounded-2xl shadow-[2px_2px_6px_rgba(154,52,18,0.12)] border border-[#FED7AA] transition-transform hover:scale-105 active:scale-95"
            title="Go Back"
          >
            <ArrowLeft size={18} />
          </button>
          <button
            onClick={() => navigate(user.role === 'admin' ? '/admin' : '/dashboard')}
            className="w-10 h-10 flex items-center justify-center bg-white hover:bg-[#FFF7ED] text-[#EA580C] rounded-2xl shadow-[2px_2px_6px_rgba(154,52,18,0.12)] border border-[#FED7AA] transition-transform hover:scale-105 active:scale-95"
            title="Dashboard"
          >
            <Home size={18} />
          </button>
        </>
      )}
    </div>
  );
}
