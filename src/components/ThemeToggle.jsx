import { Moon, Sun } from 'lucide-react';
import { useEffect } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';

export default function ThemeToggle() {
  const [theme, setTheme] = useLocalStorage('studymate_theme', 'light');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <button
      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
      className="p-2 rounded-full bg-orange-100 dark:bg-slate-800 text-orange-600 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-slate-700 transition-colors"
      aria-label="Toggle Theme"
    >
      {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
    </button>
  );
}
