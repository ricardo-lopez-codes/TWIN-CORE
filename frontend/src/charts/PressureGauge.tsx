import React from 'react';

interface PressureGaugeProps {
  value: number; // in kPa
  min?: number;
  max?: number;
  warnThreshold?: number;
  critThreshold?: number;
}

export const PressureGauge: React.FC<PressureGaugeProps> = ({
  value,
  min = 30,
  max = 110,
  warnThreshold = 65,
  critThreshold = 55
}) => {
  const clamped = Math.max(min, Math.min(max, value));
  const pct = (clamped - min) / (max - min);
  const angle = -120 + pct * 240;

  const isCritical = value <= critThreshold;
  const isWarning = value <= warnThreshold && !isCritical;

  const needleColor = isCritical ? '#dc2626' : isWarning ? '#d97706' : '#2563eb';

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-white border border-slate-200/90 rounded-xl shadow-card">
      <div className="relative w-48 h-32 flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 200 130" className="w-full h-full">
          {/* Background Arc */}
          <path
            d="M 25 110 A 80 80 0 1 1 175 110"
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Critical zone arc (30 to 55 kPa) */}
          <path
            d="M 25 110 A 80 80 0 0 1 65 38"
            fill="none"
            stroke="#fca5a5"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Warning zone arc (55 to 65 kPa) */}
          <path
            d="M 65 38 A 80 80 0 0 1 95 30"
            fill="none"
            stroke="#fcd34d"
            strokeWidth="14"
          />

          {/* Normal zone arc (65 to 110 kPa) */}
          <path
            d="M 95 30 A 80 80 0 0 1 175 110"
            fill="none"
            stroke="#6ee7b7"
            strokeWidth="14"
            strokeLinecap="round"
          />

          {/* Needle */}
          <g transform={`rotate(${angle} 100 110)`}>
            <polygon points="98,110 102,110 100,35" fill={needleColor} />
            <circle cx="100" cy="110" r="7" fill="#64748b" />
            <circle cx="100" cy="110" r="4" fill="#ffffff" />
          </g>

          {/* Dial labels */}
          <text x="25" y="125" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="middle" fontWeight="600">
            {min}
          </text>
          <text x="175" y="125" fill="#64748b" fontSize="10" fontFamily="JetBrains Mono, monospace" textAnchor="middle" fontWeight="600">
            {max}
          </text>
          <text x="100" y="70" fill="#64748b" fontSize="9" fontFamily="JetBrains Mono, monospace" textAnchor="middle" fontWeight="500">
            kPa (ABS)
          </text>
        </svg>

        {/* Center reading */}
        <div className="absolute bottom-1 flex flex-col items-center">
          <span className={`text-2xl font-mono font-bold tracking-tight ${
            isCritical ? 'text-rose-600' : isWarning ? 'text-amber-600' : 'text-slate-900'
          }`}>
            {value.toFixed(1)}
          </span>
          <span className="text-[10px] font-mono font-semibold text-slate-500">kPa absolute</span>
        </div>
      </div>

      <div className="flex items-center gap-3 text-[11px] font-mono mt-3 text-slate-600 font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
          Crit &le;{critThreshold}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          Warn &le;{warnThreshold}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          Nominal
        </span>
      </div>
    </div>
  );
};
