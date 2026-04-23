import Navbar from '../components/Navbar';
import ThoughtFeed from '../components/ThoughtFeed';

export default function Thoughts() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <Navbar />
      <main className="px-4 pb-20">
        <ThoughtFeed />
      </main>
    </div>
  );
}
