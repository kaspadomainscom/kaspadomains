// app/loading.tsx
export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white">
      <svg
        className="w-24 h-24 mb-4"
        viewBox="0 0 100 100"
        fill="none"
        aria-label="Loading"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="kaspaGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#32D583" /> {/* kaspaGreen */}
            <stop offset="100%" stopColor="#4DEFEF" /> {/* kaspaMint */}
          </linearGradient>
        </defs>

        <circle
          cx="50"
          cy="50"
          r="44"
          stroke="url(#kaspaGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray="276.46" /* circumference = 2 * PI * r */
          strokeDashoffset="207.35" /* 3/4 of circumference */
          transform="rotate(-90 50 50)"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 50 50"
            to="360 50 50"
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="stroke-dashoffset"
            values="207.35;276.46;207.35"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      <div className="text-lg font-semibold">Loading...</div>
    </div>
  );
}
