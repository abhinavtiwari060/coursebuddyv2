export default function ProgressBar({ progress, label }) {
  return (
    <div className="w-full">
      {label && <p className="text-sm font-medium mb-1 text-slate-700 dark:text-slate-300">{label}</p>}
      <div className="w-full bg-orange-100 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
        <div
          className="bg-[#EA580C] h-2.5 rounded-full transition-all duration-700 ease-out"
          style={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        />
      </div>
    </div>
  );
}
