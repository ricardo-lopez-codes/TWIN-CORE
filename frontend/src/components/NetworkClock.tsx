import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  Globe,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Wifi,
  ChevronDown
} from 'lucide-react';
import { networkTimeService, NetworkTimeInfo } from '../services/networkTime';

export const NetworkClock: React.FC = () => {
  const [timeInfo, setTimeInfo] = useState<NetworkTimeInfo>(networkTimeService.getCurrentInfo());
  const [isOpen, setIsOpen] = useState(false);
  const [isResyncing, setIsResyncing] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubscribe = networkTimeService.subscribe((info) => {
      setTimeInfo(info);
    });

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      unsubscribe();
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleManualResync = async () => {
    setIsResyncing(true);
    await networkTimeService.syncWithInternet();
    setTimeout(() => setIsResyncing(false), 800);
  };

  const getStatusChip = () => {
    if (timeInfo.status === 'SYNCING') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-mono font-bold border border-blue-200">
          <RefreshCw className="w-2.5 h-2.5 animate-spin text-blue-600" />
          SYNCING NTP
        </span>
      );
    }
    if (timeInfo.status === 'SYNCED') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold border border-emerald-200">
          <Globe className="w-2.5 h-2.5 text-emerald-600" />
          INTERNET SYNCED
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-mono font-bold border border-slate-200">
        <Clock className="w-2.5 h-2.5 text-slate-500" />
        LOCAL CLOCK
      </span>
    );
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Clickable Header Clock Pill */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 transition-all shadow-xs cursor-pointer group"
        title="Click to view Internet Time Sync details"
      >
        <div className="flex flex-col text-left">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-sm text-slate-900 tracking-tight">
              {timeInfo.formattedTime}
            </span>
            {getStatusChip()}
          </div>
          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <span>{timeInfo.tzAbbreviation}</span>
            <span className="text-slate-300">•</span>
            <span>{timeInfo.formattedDate}</span>
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-elevated p-4 z-50 text-xs font-sans animate-in fade-in-50 zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900">Internet Time Calibration</h4>
                <p className="text-[10px] text-slate-500">NTP Reference Standard</p>
              </div>
            </div>
            <button
              onClick={handleManualResync}
              disabled={isResyncing}
              className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition"
              title="Resync with Internet Time Server"
            >
              <RefreshCw className={`w-3 h-3 ${isResyncing ? 'animate-spin' : ''}`} />
              Resync
            </button>
          </div>

          {/* Details list */}
          <div className="space-y-2.5 font-mono text-[11px]">
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Time Source:</span>
              <span className="font-bold text-slate-800 text-right">{timeInfo.sourceName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Reference Timezone:</span>
              <span className="font-semibold text-slate-800 text-right">Asia/Kolkata (IST • UTC+5:30)</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Round-Trip Latency:</span>
              <span className="font-semibold text-emerald-600 text-right">{timeInfo.latencyMs} ms</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-50">
              <span className="text-slate-500">Client Clock Offset:</span>
              <span className="font-semibold text-blue-600 text-right">
                {timeInfo.offsetMs >= 0 ? `+${timeInfo.offsetMs}` : timeInfo.offsetMs} ms
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500">Last Synchronized:</span>
              <span className="text-slate-700 text-right">
                {timeInfo.lastSyncedAt ? timeInfo.lastSyncedAt.toLocaleTimeString() : 'Pending'}
              </span>
            </div>
          </div>

          {/* Hosting Note */}
          <div className="mt-3 pt-2.5 border-t border-slate-100 text-[10px] text-slate-500 font-sans leading-relaxed">
            <span className="font-semibold text-slate-700">Production Deployment Note:</span> When hosted on Vercel, Render, AWS, or local gateways, this service automatically samples global NTP time endpoints to synchronize Ladakh field telemetry stamps without client drift.
          </div>
        </div>
      )}
    </div>
  );
};
