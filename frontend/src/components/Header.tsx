import React from 'react';
import { Cpu, Radio, ShieldAlert } from 'lucide-react';
import { DataMode, SeverityLevel } from '../types';
import { NetworkClock } from './NetworkClock';

interface HeaderProps {
  mode: DataMode;
  lastTimestamp?: string;
  isGatewayConnected: boolean;
  overallSeverity: SeverityLevel;
  activeDemoName?: string | null;
  rssi?: number;
  snr?: number;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  lastTimestamp,
  isGatewayConnected,
  overallSeverity,
  activeDemoName,
  rssi,
  snr
}) => {
  const getModeBadge = () => {
    switch (mode) {
      case 'HARDWARE_CONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            HARDWARE CONNECTED
          </span>
        );
      case 'HARDWARE_DISCONNECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            HARDWARE DISCONNECTED
          </span>
        );
      case 'SIMULATION':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs font-mono font-semibold shadow-xs">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            SIMULATION MODE
          </span>
        );
    }
  };

  const formattedTime = lastTimestamp
    ? new Date(lastTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : '--:--:--';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-6 flex items-center justify-between z-10 sticky top-0 shadow-xs">
      {/* Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
          <Cpu className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-sans font-extrabold text-base tracking-tight text-slate-900">
              TWIN<span className="text-blue-600 font-bold">-CORE</span>
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-mono font-semibold border border-slate-200">
              LADAKH EDITION
            </span>
          </div>
          <p className="text-[11px] text-slate-500 font-medium">High-Altitude Electronics Digital Twin & Adaptive Protection</p>
        </div>
      </div>

      {/* Active demo banner */}
      {activeDemoName && (
        <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>ACTIVE DEMO: <strong className="uppercase font-bold">{activeDemoName}</strong></span>
        </div>
      )}

      {/* Right controls: Mode Pill, LoRa, Time */}
      <div className="flex items-center gap-3">
        {getModeBadge()}

        {rssi !== undefined && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
            <Radio className="w-3.5 h-3.5 text-blue-600" />
            <span>LoRa: <strong className="text-slate-800">{rssi} dBm</strong></span>
            {snr !== undefined && <span className="text-slate-400">| {snr} dB</span>}
          </div>
        )}

        {/* Internet-Synchronized Reference Clock Block */}
        <NetworkClock />
      </div>
    </header>
  );
};
