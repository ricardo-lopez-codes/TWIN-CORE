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

        {/* Heading increased by >20% */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="font-sans font-black text-xl sm:text-2xl lg:text-[1.75rem] tracking-tight text-slate-900 leading-none truncate">
              TWIN<span className="text-blue-600 font-extrabold">-CORE</span>
            </h1>
            {/* Hidden on mobile phone as requested */}
            <span className="hidden sm:inline-flex text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200 shrink-0">
              LADAKH EDITION
            </span>
          </div>
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

      {/* Right controls: Mode Pill, LoRa, Time */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Mode badge: Hidden on mobile phone as requested */}
        <div className="hidden sm:flex">
          {getModeBadge()}
        </div>

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
