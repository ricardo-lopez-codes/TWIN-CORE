import React from 'react';
import {
  LayoutDashboard,
  Activity,
  Flame,
  Gauge,
  Zap,
  Boxes,
  ScrollText,
  Sliders,
  Radio,
  Mountain,
  X
} from 'lucide-react';
import { DataMode } from '../types';

export type PageId =
  | 'overview'
  | 'live'
  | 'demo_temp'
  | 'demo_pressure'
  | 'demo_power'
  | 'digital_twin'
  | 'events'
  | 'settings';

interface SidebarProps {
  currentPage: PageId;
  onSelectPage: (page: PageId) => void;
  activeMode: DataMode;
  unreadWarningCount?: number;
  onCloseMobile?: () => void;
  className?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onSelectPage,
  activeMode,
  unreadWarningCount = 0,
  onCloseMobile,
  className = ''
}) => {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'live', label: 'Live Monitoring', icon: <Activity className="w-4 h-4" /> },
    { id: 'demo_temp', label: 'Temperature Demo', icon: <Flame className="w-4 h-4 text-orange-500" /> },
    { id: 'demo_pressure', label: 'Pressure Demo', icon: <Gauge className="w-4 h-4 text-sky-500" /> },
    { id: 'demo_power', label: 'Power Demo', icon: <Zap className="w-4 h-4 text-amber-500" /> },
    { id: 'digital_twin', label: 'Digital Twin Sim', icon: <Boxes className="w-4 h-4 text-indigo-500" /> },
    {
      id: 'events',
      label: 'Event Logs',
      icon: <ScrollText className="w-4 h-4" />,
      badge: unreadWarningCount > 0 ? unreadWarningCount : null
    },
    { id: 'settings', label: 'Settings', icon: <Sliders className="w-4 h-4" /> }
  ];

  const handleItemClick = (id: PageId) => {
    onSelectPage(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <aside className={`w-64 bg-white border-r border-slate-200/90 flex flex-col justify-between shrink-0 select-none shadow-xs h-full ${className}`}>
      <div>
        {/* Navigation Section Title + Mobile Close */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-400">
            SYSTEM TELEMETRY
          </span>
          {onCloseMobile && (
            <button
              onClick={onCloseMobile}
              className="md:hidden w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id as PageId)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 font-medium'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={isActive ? 'text-blue-600' : 'text-slate-500'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Modern Light Sidebar Footer */}
      <div className="p-4 m-3 rounded-xl bg-slate-50 border border-slate-200/80 shadow-xs">
        <div className="text-[11px] font-sans font-bold text-slate-500 mb-1.5 flex items-center gap-1.5">
          <Radio className="w-3.5 h-3.5 text-blue-600" />
          <span>DATA ACQUISITION</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono font-bold text-slate-800">
            {activeMode === 'SIMULATION'
              ? 'SIMULATION'
              : activeMode === 'HARDWARE_CONNECTED'
              ? 'HW CONNECTED'
              : 'HW OFFLINE'}
          </span>
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              activeMode === 'HARDWARE_CONNECTED'
                ? 'bg-emerald-500'
                : activeMode === 'SIMULATION'
                ? 'bg-blue-500'
                : 'bg-rose-500'
            }`}
          />
        </div>
        <div className="mt-2.5 pt-2 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center gap-1.5">
          <Mountain className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>Ladakh Alpine (3,500m - 5,000m)</span>
        </div>
      </div>
    </aside>
  );
};
