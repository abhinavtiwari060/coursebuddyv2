import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ThemeToggle from './ThemeToggle';
import BugReport from './BugReport';
import NotificationPanel from './NotificationPanel';
import {
  LayoutDashboard,
  BookOpen,
  Grid,
  CheckSquare,
  Trophy,
  MessageSquare,
  User,
  Bug,
  ChevronDown,
  LogOut,
  Menu,
  X,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

function getInitials(name = '') {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

const CATEGORY_LABELS = {
  'government-exams': 'Govt Exams',
  'iit-neet': 'IIT / NEET',
  'skills': 'Skills & Career',
  'other': 'General',
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowUserMenu(false);
        setMobileMenuOpen(false);
      }
    };
    if (showUserMenu || mobileMenuOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUserMenu, mobileMenuOpen]);

  // Desktop primary navigation links
  const primaryNavLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/my-learning', label: 'My Learning', icon: BookOpen },
    { to: '/categories', label: 'Categories', icon: Grid },
    { to: '/todos', label: 'To-Do', icon: CheckSquare },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  ];

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
    navigate('/login');
  };

  return (
    <>
      <nav className="sticky top-0 z-40 bg-white border-b border-[#FED7AA] shadow-[0_2px_8px_rgba(234,88,12,0.04)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            
            {/* 1. Left: Brand Name as Clean Text (No logo box) */}
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="flex items-baseline gap-1 py-1 group focus:outline-none">
                <span className="text-xl font-black text-[#431407] tracking-tight group-hover:text-[#EA580C] transition">
                  Study<span className="text-[#EA580C]">Mate</span>
                </span>
              </Link>

              {user?.category && (
                <span className="hidden xl:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] text-[11px] font-bold">
                  <Sparkles size={11} className="text-[#EA580C]" />
                  {CATEGORY_LABELS[user.category] || 'Curriculum'}
                </span>
              )}
            </div>

            {/* 2. Middle: Desktop Core Navigation (No awkward wrapping, consistent icons) */}
            <div className="hidden md:flex items-center gap-1">
              {primaryNavLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                      isActive
                        ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] shadow-sm'
                        : 'text-[#78716C] hover:text-[#EA580C] hover:bg-[#FFF7ED]/70'
                    }`}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* 3. Right: Secondary Actions, Notification, Theme, Profile Dropdown */}
            <div className="flex items-center gap-2">
              <NotificationPanel />
              <ThemeToggle />

              {/* Bug Report quick button */}
              {user?.features?.canReportBug !== false && (
                <button
                  onClick={() => setShowBugReport(true)}
                  className="hidden lg:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#C2410C] bg-[#FFF7ED] border border-[#FED7AA] hover:bg-[#FED7AA]/50 transition"
                  title="Report an Issue"
                >
                  <Bug size={14} />
                  <span className="hidden 2xl:inline">Report</span>
                </button>
              )}

              {/* User Dropdown */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-[#FED7AA] hover:bg-[#FFF7ED] shadow-sm transition focus:outline-none"
                    aria-label="User profile menu"
                  >
                    <div className="w-7 h-7 bg-[#EA580C] rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm flex-shrink-0">
                      {getInitials(user.name)}
                    </div>
                    <span className="hidden sm:block text-xs font-bold text-[#431407] max-w-[90px] truncate text-left">
                      {user.name}
                    </span>
                    <ChevronDown size={13} className="text-[#78716C]" />
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-56 clay-card bg-white p-2 z-40 border border-[#FED7AA] rounded-2xl shadow-xl animate-fadeIn">
                        <div className="p-2.5 border-b border-[#FED7AA] mb-1 bg-[#FFF7ED]/50 rounded-xl">
                          <p className="font-black text-xs text-[#431407] truncate">{user.name}</p>
                          <p className="text-[11px] text-[#78716C] truncate mt-0.5">{user.email}</p>
                          {user.role === 'admin' && (
                            <span className="inline-block mt-1 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#FED7AA] text-[#9A3412]">
                              Administrator
                            </span>
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <Link
                            to="/profile"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#431407] rounded-xl hover:bg-[#FFF7ED] transition"
                          >
                            <User size={14} className="text-[#EA580C]" /> Profile & Track
                          </Link>

                          <Link
                            to="/chat"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#431407] rounded-xl hover:bg-[#FFF7ED] transition"
                          >
                            <MessageSquare size={14} className="text-[#EA580C]" /> Category Chat
                          </Link>

                          <Link
                            to="/todos"
                            onClick={() => setShowUserMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#431407] rounded-xl hover:bg-[#FFF7ED] transition"
                          >
                            <CheckSquare size={14} className="text-[#EA580C]" /> Study Tasks
                          </Link>

                          {user.features?.canUseCommunity !== false && (
                            <Link
                              to="/thoughts"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#431407] rounded-xl hover:bg-[#FFF7ED] transition"
                            >
                              <Sparkles size={14} className="text-[#EA580C]" /> Community Thoughts
                            </Link>
                          )}

                          {user.role === 'admin' && (
                            <Link
                              to="/admin"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2.5 px-3 py-2 text-xs font-black text-[#C2410C] rounded-xl bg-[#FFF7ED] hover:bg-[#FED7AA]/50 transition"
                            >
                              <ShieldCheck size={14} className="text-[#EA580C]" /> Admin Portal
                            </Link>
                          )}
                        </div>

                        <div className="border-t border-[#FED7AA] mt-1.5 pt-1">
                          <button
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 rounded-xl hover:bg-red-50 transition"
                          >
                            <LogOut size={14} /> Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mobile hamburger menu toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-[#431407] bg-[#FFF7ED] border border-[#FED7AA] hover:bg-[#FED7AA]/50 transition focus:outline-none"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* 4. Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#FED7AA] bg-[#FFF7ED] px-4 pt-3 pb-4 space-y-1 animate-fadeIn">
            {user?.category && (
              <div className="mb-2 px-3 py-2 rounded-xl bg-white border border-[#FED7AA] text-xs font-bold text-[#C2410C] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={13} className="text-[#EA580C]" />
                  Path: {CATEGORY_LABELS[user.category] || 'Curriculum'}
                </span>
                <Link
                  to="/categories"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[11px] text-[#EA580C] underline font-bold"
                >
                  Change
                </Link>
              </div>
            )}

            {/* Primary Mobile Links */}
            {primaryNavLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-black transition ${
                    isActive
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'text-[#431407] hover:bg-white'
                  }`}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Secondary Mobile Links */}
            <div className="pt-2 border-t border-[#FED7AA]/60 space-y-1">
              <Link
                to="/chat"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#431407] hover:bg-white rounded-xl"
              >
                <MessageSquare size={16} className="text-[#EA580C]" />
                <span>Category Chat</span>
              </Link>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2 text-xs font-bold text-[#431407] hover:bg-white rounded-xl"
              >
                <User size={16} className="text-[#EA580C]" />
                <span>Profile & Settings</span>
              </Link>
              {user?.role === 'admin' && (
                <Link
                  to="/admin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-xs font-black text-[#C2410C] bg-white rounded-xl border border-[#FED7AA]"
                >
                  <ShieldCheck size={16} className="text-[#EA580C]" />
                  <span>Admin Control Panel</span>
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {showBugReport && <BugReport onClose={() => setShowBugReport(false)} />}
    </>
  );
}
