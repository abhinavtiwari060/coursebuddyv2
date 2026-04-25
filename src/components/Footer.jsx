export default function Footer() {
  return (
    <footer className="mt-8 py-10 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 text-center">
      <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-slate-500 dark:text-slate-400 font-bold text-sm">
          &copy; 2026 StudyMate. All rights reserved.
        </p>
        <div className="flex items-center gap-6 text-sm font-black text-slate-400 uppercase tracking-widest">
           <a href="/privacy" className="hover:text-orange-500 transition">Privacy Policy</a>
           <a href="https://abhinavtiwari.netlify.app/" target="_blank" rel="noopener noreferrer" className="hover:text-orange-500 transition">Developer</a>
        </div>
      </div>
    </footer>
  );
}
