import { Heart, Globe, GraduationCap } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden relative">
      {/* Decorative gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-orange-500 via-amber-400 to-indigo-500" />
      
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 items-center justify-center">
          
          <div className="flex flex-col items-center md:items-start">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <GraduationCap className="text-orange-500" size={18} />
              </div>
              <span className="text-xl font-black text-slate-800 dark:text-white">StudyMate</span>
            </div>
            <p className="text-xs font-bold text-slate-400 italic text-center md:text-left leading-relaxed">
              Empowering learners through structured knowledge and persistent effort.
            </p>
          </div>

          <div className="flex flex-col items-center">
            <div className="flex gap-8 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">
               <Link to="/privacy" className="hover:text-orange-500 transition-colors">Privacy</Link>
               <Link to="/dashboard" className="hover:text-orange-500 transition-colors">Dashboard</Link>
               <a href="https://abhinavtiwari.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition-colors flex items-center gap-1">
                 <Globe size={12} /> abhinav.dev
               </a>
            </div>
            <p className="mt-4 text-[10px] font-bold text-slate-500 flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800">
              Handcrafted with <Heart size={10} className="text-red-500 fill-red-500 animate-pulse" /> by <span className="text-orange-500">Abhinav Tiwari</span>
            </p>
          </div>

          <div className="flex flex-col items-center md:items-end">
             <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-black text-slate-400 uppercase tracking-tighter">Powered By</span>
                <span className="text-xs font-black text-orange-500">Google Gemini</span>
             </div>
             <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">&copy; 2026 StudyMate Global</p>
          </div>

        </div>
      </div>
    </footer>
  );
}
