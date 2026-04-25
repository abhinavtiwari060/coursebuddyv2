import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Critical Component Failure:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="glass-card max-w-md w-full p-8 rounded-[2.5rem] border border-red-200 dark:border-red-900/30 text-center shadow-2xl shadow-red-500/5">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 text-red-500 rounded-3xl flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Something went wrong</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
              We encountered a runtime error in this section. Don't worry, the rest of the app is still working.
            </p>
            
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl mb-8 text-left border border-slate-100 dark:border-slate-700">
               <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Error Details</p>
               <p className="text-xs font-mono text-red-600 dark:text-red-400 break-all line-clamp-2">
                 {this.state.error?.toString()}
               </p>
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={() => window.location.reload()}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:opacity-90 transition"
              >
                <RefreshCcw size={18} /> Refresh Page
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-4 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                <Home size={18} /> Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
