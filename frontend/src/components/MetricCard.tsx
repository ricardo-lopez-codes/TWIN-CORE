import React from 'react';
import { StatusBadge } from './StatusBadge';
import { SeverityLevel } from '../types';
import { Card3D } from './3d/Card3D';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit: string;
  normalRange?: string;
  status?: SeverityLevel | string;
  icon?: React.ReactNode;
  subtitle?: string;
  deltaText?: string;
  isStale?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  normalRange,
  status = 'NORMAL',
  icon,
  subtitle,
  deltaText,
  isStale = false
}) => {
  const normStatus = (status || 'NORMAL').toUpperCase();

  const getBorderColor = () => {
    if (isStale) return 'border-slate-200 bg-slate-50/50';
    if (normStatus === 'CRITICAL') return 'border-rose-300 ring-2 ring-rose-100 bg-rose-50/20';
    if (normStatus === 'WARNING') return 'border-amber-300 ring-2 ring-amber-100 bg-amber-50/20';
    return 'border-slate-200/90 bg-white hover:border-slate-300';
  };

  return (
    <Card3D tiltMax={5} scale={1.018} glare={true} className="h-full">
      <div className={`relative rounded-xl border p-4 shadow-card transition-all duration-200 h-full ${getBorderColor()}`}>
        {/* Top row: Label, Icon, Status */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            {icon && (
              <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600">
                {icon}
              </div>
            )}
            <span className="text-xs font-semibold text-slate-600 tracking-wide uppercase">{label}</span>
          </div>
          <StatusBadge status={isStale ? 'OFFLINE' : status} size="sm" />
        </div>

        {/* Main value display */}
        <div className="flex items-baseline gap-1.5 my-1.5">
          <span className={`text-2xl lg:text-3xl font-mono font-bold tracking-tight ${
            isStale 
              ? 'text-slate-400 line-through' 
              : normStatus === 'CRITICAL'
              ? 'text-rose-600'
              : normStatus === 'WARNING'
              ? 'text-amber-600'
              : 'text-slate-900'
          }`}>
            {isStale ? '--' : typeof value === 'number' ? value.toFixed(1) : value}
          </span>
          <span className="text-xs font-mono font-semibold text-slate-500">{unit}</span>
        </div>

        {/* Normal Range & Subtitle */}
        <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div>
            {normalRange && (
              <span className="font-mono">
                Target: <span className="font-semibold text-slate-700">{normalRange}</span>
              </span>
            )}
            {subtitle && (
              <div className="text-[10px] text-slate-400 mt-0.5">{subtitle}</div>
            )}
          </div>
          {deltaText && (
            <span className="font-mono text-xs text-slate-500">{deltaText}</span>
          )}
        </div>
      </div>
    </Card3D>
  );
};
