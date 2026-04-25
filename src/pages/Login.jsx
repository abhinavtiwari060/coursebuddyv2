import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, User, Lock, AlertCircle, Loader2 } from 'lucide-react';

export default function Login() {
  const { login, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      if (user.role === 'admin') navigate('/admin');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-orange-50 dark:bg-slate-950 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="glass-card w-full max-w-md p-8 rounded-3xl relative z-10 shadow-xl">
        <div className="flex flex-col items-center mb-8">
          <div className="btn-primary w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-xl shadow-orange-500/20 p-0 overflow-hidden">
             {/* Custom Robot Logo SVG */}
             <svg viewBox="0 0 100 100" className="w-10 h-10 fill-white">
                <path d="M50 20c-15 0-27 12-27 27s12 27 27 27 27-12 27-27-12-27-27-27zm0 48c-11.6 0-21-9.4-21-21s9.4-21 21-21 21 9.4 21 21-9.4 21-21 21z" opacity="0.3"/>
                <circle cx="38" cy="45" r="5" />
                <circle cx="62" cy="45" r="5" />
                <path d="M40 60c5 3 15 3 20 0" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" />
                {/* Graduation Cap */}
                <path d="M50 5 L85 20 L50 35 L15 20 Z" fill="white" />
                <path d="M85 20 L85 35" fill="none" stroke="white" strokeWidth="2" />
                <circle cx="85" cy="35" r="2" fill="white" />
             </svg>
          </div>
          <h1 className="text-4xl font-black tracking-tight text-slate-800 dark:text-white">
            Study<span className="text-orange-500">Mate</span>
          </h1>
          <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mt-2 uppercase tracking-widest">
            Learn Better · Track Smarter
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 p-4 rounded-xl text-sm font-medium mb-6 border border-red-100 dark:border-red-900/40">
            <AlertCircle size={18} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <User size={18} className="text-slate-400" />
            </div>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white transition-shadow text-sm"
            />
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Lock size={18} className="text-slate-400" />
            </div>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-11 pr-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-orange-500 dark:text-white transition-shadow text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-4 rounded-xl flex items-center justify-center font-bold tracking-wide mt-2"
          >
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'LOGIN'}
          </button>

          <div className="relative my-6 text-center">
             <span className="bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-400 relative z-10">OR</span>
             <div className="absolute top-1/2 left-0 w-full h-px bg-slate-200 dark:bg-slate-800 -z-0"></div>
          </div>

          <button
            type="button"
            onClick={async () => {
              try {
                setLoading(true);
                const user = await loginWithGoogle();
                if (user.role === 'admin') navigate('/admin');
                else navigate('/dashboard');
              } catch (err) {
                console.error(err);
                setError('Google Login failed: ' + (err.response?.data?.error || err.message));
                setLoading(false);
              }
            }}
            disabled={loading}
            className="w-full bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 py-3 rounded-xl border border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition shadow-sm flex items-center justify-center gap-3"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" className="w-5 h-5" alt="G" />
            Sign in with Google
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/signup" className="text-orange-500 hover:text-orange-600 font-bold transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
