export default function Logo({ size = 44, className = "" }) {
  return (
    <div
      className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 shadow-lg shadow-orange-500/20 overflow-hidden ${className}`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 100 100" className="w-4/5 h-4/5 fill-white">
        {/* Graduation Cap */}
        <path d="M50 8 L85 22 L50 36 L15 22 Z" fill="#fff" />
        <path d="M85 22 L85 32" fill="none" stroke="#fff" strokeWidth="2" />
        <circle cx="85" cy="32" r="2" fill="#fff" />

        {/* Robot Head */}
        <rect x="25" y="40" width="50" height="35" rx="8" fill="#fff" />
        {/* Screen */}
        <rect x="30" y="45" width="40" height="20" rx="4" fill="#fb923c" />

        {/* Eyes */}
        <circle cx="42" cy="55" r="3.5" fill="#fff" />
        <circle cx="58" cy="55" r="3.5" fill="#fff" />

        {/* Antennas */}
        <line x1="40" y1="40" x2="35" y2="30" stroke="#fff" strokeWidth="3" />
        <line x1="60" y1="40" x2="65" y2="30" stroke="#fff" strokeWidth="3" />
        <circle cx="35" cy="30" r="3" fill="#fff" />
        <circle cx="65" cy="30" r="3" fill="#fff" />
      </svg>
    </div>
  );
}
