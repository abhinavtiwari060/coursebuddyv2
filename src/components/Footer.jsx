import { Link } from 'react-router-dom';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-[#FED7AA] bg-white text-[#431407]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          
          {/* Brand & Platform Summary */}
          <div className="space-y-2">
            <Link to="/dashboard" className="inline-block focus:outline-none">
              <span className="text-lg font-black tracking-tight text-[#431407]">
                Study<span className="text-[#EA580C]">Mate</span>
              </span>
            </Link>
            <p className="text-xs text-[#78716C] leading-relaxed max-w-sm">
              A distraction-free, student-first learning platform for tracking study time, curating course curricula, and building daily consistency.
            </p>
          </div>

          {/* Quick Navigation Links */}
          <div className="space-y-2 md:text-center">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#EA580C]">
              Platform Navigation
            </p>
            <div className="flex flex-wrap md:justify-center gap-x-5 gap-y-2 text-xs font-bold text-[#78716C]">
              <Link to="/dashboard" className="hover:text-[#EA580C] transition">
                Dashboard
              </Link>
              <Link to="/my-learning" className="hover:text-[#EA580C] transition">
                My Learning
              </Link>
              <Link to="/categories" className="hover:text-[#EA580C] transition">
                Categories
              </Link>
              <Link to="/todos" className="hover:text-[#EA580C] transition">
                To-Do
              </Link>
              <Link to="/leaderboard" className="hover:text-[#EA580C] transition">
                Leaderboard
              </Link>
            </div>
          </div>

          {/* Legal & Dynamic Copyright */}
          <div className="space-y-2 md:text-right">
            <p className="text-[11px] font-black uppercase tracking-wider text-[#EA580C]">
              Legal & Support
            </p>
            <div className="flex flex-wrap md:justify-end gap-x-4 gap-y-1 text-xs font-bold text-[#78716C]">
              <Link to="/privacy-policy" className="hover:text-[#EA580C] transition">
                Privacy Policy
              </Link>
              <Link to="/chat" className="hover:text-[#EA580C] transition">
                Community Chat
              </Link>
            </div>
            <p className="text-[11px] text-[#78716C] pt-1">
              &copy; {currentYear} StudyMate. All rights reserved.
            </p>
          </div>

        </div>
      </div>
    </footer>
  );
}
