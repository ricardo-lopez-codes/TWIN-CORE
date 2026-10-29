import React from 'react';
import { Cpu, Radio, ShieldAlert, Menu, X } from 'lucide-react';
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
  onToggleMobileSidebar?: () => void;
  isMobileSidebarOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  mode,
  lastTimestamp,
  isGatewayConnected,
  overallSeverity,
  activeDemoName,
  rssi,
  snr,
  onToggleMobileSidebar,
  isMobileSidebarOpen
}) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-3.5 sm:px-6 flex items-center justify-between z-20 sticky top-0 shadow-xs">
      {/* Brand & Subtitle + Mobile Hamburger */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {/* Mobile menu trigger */}
        {onToggleMobileSidebar && (
          <button
            onClick={onToggleMobileSidebar}
            className="md:hidden w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 transition"
            aria-label="Toggle Navigation"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        )}

        {/* Logo Icon */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20 shrink-0">
          <Cpu className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
        </div>

        {/* Heading increased by >20% (No 'Ladakh Edition' badge) */}
        <div className="min-w-0">
          <h1 className="font-sans font-black text-xl sm:text-2xl lg:text-[1.75rem] tracking-tight text-slate-900 leading-none truncate">
            TWIN<span className="text-blue-600 font-extrabold">-CORE</span>
          </h1>
          <p className="text-[11px] text-slate-500 font-medium hidden sm:block mt-0.5 truncate">
            High-Altitude Electronics Digital Twin & Adaptive Protection
          </p>
        </div>
      </div>

      {/* Active demo banner (Large screens) */}
      {activeDemoName && (
        <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-xs font-mono">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
          <span>ACTIVE DEMO: <strong className="uppercase font-bold">{activeDemoName}</strong></span>
        </div>
      )}

      {/* Right controls: LoRa & Internet Time Clock (No 'Simulation Mode' badge) */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {rssi !== undefined && (
          <div className="hidden lg:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-600">
            <Radio className="w-3.5 h-3.5 text-blue-600" />
            <span>LoRa: <strong className="text-slate-800">{rssi} dBm</strong></span>
            {snr !== undefined && <span className="text-slate-400">| {snr} dB</span>}
          </div>
        )}

        {/* Internet-Synchronized Reference Clock Block (Hidden on mobile phones, visible on PC & tablets) */}
        <div className="hidden sm:block">
          <NetworkClock />
        </div>
      </div>
    </header>
  );
};
