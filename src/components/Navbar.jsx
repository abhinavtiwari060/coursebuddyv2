import { useState } from 'react';
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
  Sparkles
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
  const [showMenu, setShowMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBugReport, setShowBugReport] = useState(false);

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/my-learning', label: 'My Learning', icon: BookOpen },
    { to: '/categories', label: 'Categories', icon: Grid },
    { to: '/todos', label: 'To-Do', icon: CheckSquare },
    { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
    { to: '/chat', label: 'Chat Rooms', icon: MessageSquare },
  ];

  return (
    <>
      <nav className="sticky top-0 z-30 bg-white border-b border-[#FED7AA] shadow-[2px_2px_8px_rgba(154,52,18,0.05)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Left: Brand + Category Badge */}
            <div className="flex items-center gap-3">
              <Link to="/dashboard" className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#EA580C] text-white flex items-center justify-center font-black text-xl shadow-[2px_2px_6px_rgba(154,52,18,0.3)] border border-[#C2410C]">
                  S
                </div>
                <div>
                  <h1 className="text-xl font-black text-[#431407] tracking-tight leading-none">
                    Study<span className="text-[#EA580C]">Mate</span>
                  </h1>
                  <p className="text-[9px] text-[#78716C] font-bold uppercase tracking-wider mt-0.5">
                    Student Platform
                  </p>
                </div>
              </Link>

              {user?.category && (
                <Link
                  to="/categories"
                  title="Your primary learning path"
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFF7ED] text-[#C2410C] border border-[#FED7AA] text-xs font-bold hover:bg-[#FED7AA]/50 transition"
                >
                  <Sparkles size={12} className="text-[#EA580C]" />
                  {CATEGORY_LABELS[user.category] || 'Learning Path'}
                </Link>
              )}
            </div>

            {/* Middle: Desktop Nav Links */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.to;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA] shadow-[1px_1px_3px_rgba(154,52,18,0.06)]'
                        : 'text-[#78716C] hover:text-[#EA580C] hover:bg-[#FFF7ED]/60'
                    }`}
                  >
                    <Icon size={15} />
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right: Actions & User Dropdown */}
            <div className="flex items-center gap-2">
              <NotificationPanel />
              <ThemeToggle />

              {/* Bug Report */}
              {user?.features?.canReportBug !== false && (
                <button
                  onClick={() => setShowBugReport(true)}
                  className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-[#C2410C] bg-[#FFF7ED] border border-[#FED7AA] hover:bg-[#FED7AA]/50 transition"
                  title="Report an Issue"
                >
                  <Bug size={14} />
                  <span className="hidden xl:inline">Report</span>
                </button>
              )}

              {/* User Menu */}
              {user && (
                <div className="relative">
                  <button
                    onClick={() => setShowMenu(!showMenu)}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white border border-[#FED7AA] hover:bg-[#FFF7ED] shadow-[1px_1px_3px_rgba(154,52,18,0.05)] transition"
                  >
                    <div className="w-7 h-7 bg-[#EA580C] rounded-lg flex items-center justify-center text-white text-xs font-black shadow-sm">
                      {getInitials(user.name)}
                    </div>
                    <span className="hidden sm:block text-xs font-bold text-[#431407] max-w-[80px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown size={13} className="text-[#78716C]" />
                  </button>

                  {showMenu && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                      <div className="absolute right-0 top-full mt-2 w-52 clay-card bg-white p-2 z-40">
                        <div className="p-2 border-b border-[#FED7AA] mb-1">
                          <p className="font-bold text-xs text-[#431407] truncate">{user.name}</p>
                          <p className="text-[11px] text-[#78716C] truncate">{user.email}</p>
                        </div>
                        <Link
                          to="/profile"
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#431407] rounded-lg hover:bg-[#FFF7ED] transition"
                        >
                          <User size={14} className="text-[#EA580C]" /> Profile & Category
                        </Link>
                        <Link
                          to="/todos"
                          onClick={() => setShowMenu(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#431407] rounded-lg hover:bg-[#FFF7ED] transition"
                        >
                          <CheckSquare size={14} className="text-[#EA580C]" /> My Tasks
                        </Link>
                        {user.role === 'admin' && (
                          <Link
                            to="/admin"
                            onClick={() => setShowMenu(false)}
                            className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-[#C2410C] rounded-lg hover:bg-[#FFF7ED] transition"
                          >
                            <LayoutDashboard size={14} /> Admin Portal
                          </Link>
                        )}
                        <div className="border-t border-[#FED7AA] mt-1 pt-1">
                          <button
                            onClick={() => { setShowMenu(false); logout(); navigate('/login'); }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-600 rounded-lg hover:bg-red-50 transition"
                          >
                            <LogOut size={14} /> Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Mobile menu toggle button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-xl text-[#431407] bg-[#FFF7ED] border border-[#FED7AA] hover:bg-[#FED7AA]/50"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-[#FED7AA] bg-[#FFF7ED] px-4 pt-3 pb-4 space-y-1">
            {user?.category && (
              <div className="mb-2 px-3 py-1.5 rounded-lg bg-white border border-[#FED7AA] text-xs font-bold text-[#C2410C] flex items-center gap-2">
                <Sparkles size={14} className="text-[#EA580C]" />
                Path: {CATEGORY_LABELS[user.category] || 'Learning Path'}
              </div>
            )}
            {navLinks.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-bold ${
                    isActive
                      ? 'bg-[#EA580C] text-white shadow-sm'
                      : 'text-[#431407] hover:bg-white'
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </div>
        )}
      </nav>

      {showBugReport && <BugReport onClose={() => setShowBugReport(false)} />}
    </>
  );
}
