import { useState, useEffect } from 'react';
import { quizService } from '../api/api';
import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Timer, HelpCircle, Loader2 } from 'lucide-react';

export default function LiveQuizBanner() {
  const [activeQuiz, setActiveQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchActive = async () => {
      try {
        const quiz = await quizService.getActive();
        setActiveQuiz(quiz);
      } catch (err) {
        console.error('Failed to fetch active quiz');
      } finally {
        setLoading(false);
      }
    };
    fetchActive();
    // Poll for active quizzes every minute
    const interval = setInterval(fetchActive, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return null;
  if (!activeQuiz) return null;

  return (
    <div className="mb-8 overflow-hidden relative group">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 group-hover:bg-purple-500/20 transition-all duration-700" />
      <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-500/10 rounded-full blur-3xl -ml-20 -mb-20 group-hover:bg-orange-500/20 transition-all duration-700" />

      <div className="glass-card relative border border-purple-200/50 dark:border-purple-900/30 overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-white/80 to-purple-50/50 dark:from-slate-900/80 dark:to-purple-950/20 shadow-xl shadow-purple-500/5">
        <div className="flex flex-col md:flex-row items-center gap-8 p-8 md:p-10">
          
          {/* Icon/Visual Section */}
          <div className="relative flex-shrink-0">
             <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-2xl shadow-purple-500/30 rotate-3 group-hover:rotate-6 transition-transform duration-500">
                <Trophy size={38} strokeWidth={2.5} />
             </div>
             <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-400 rounded-2xl flex items-center justify-center text-white shadow-lg border-4 border-white dark:border-slate-800 -rotate-12 group-hover:-rotate-18 transition-transform duration-500">
                <Timer size={20} strokeWidth={3} />
             </div>
          </div>

          {/* Text Section */}
          <div className="flex-1 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
               <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
               </span>
               <span className="text-xs font-black uppercase tracking-widest text-purple-600 dark:text-purple-400">Live Quiz Now Active</span>
            </div>
            <h2 className="text-3xl font-black text-slate-800 dark:text-white leading-tight">
               {activeQuiz.title}
            </h2>
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 mt-4 text-sm font-bold text-slate-500 dark:text-slate-400">
               <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700">
                  <Timer size={16} className="text-purple-500" />
                  <span>{activeQuiz.duration} Minutes</span>
               </div>
               <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-800/50 px-3 py-1.5 rounded-xl border border-slate-200/50 dark:border-slate-700">
                  <HelpCircle size={16} className="text-indigo-500" />
                  <span>{activeQuiz.questionCount} Questions</span>
               </div>
            </div>
          </div>

          {/* Action Section */}
          <div className="flex-shrink-0 w-full md:w-auto">
             <button 
               onClick={() => navigate(`/quiz/${activeQuiz._id}`)}
               className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-10 py-5 rounded-2xl font-black shadow-xl shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-3 group"
             >
                Start Quiz Now
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
             </button>
          </div>

        </div>
      </div>
    </div>
  );
}
