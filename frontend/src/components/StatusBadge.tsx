import React from 'react';
import { SeverityLevel } from '../types';

interface StatusBadgeProps {
  status: SeverityLevel | string;
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  label,
  className = ''
}) => {
  const normStatus = (status || 'NORMAL').toUpperCase();

  const getStyle = () => {
    switch (normStatus) {
      case 'NORMAL':
        return 'bg-emerald-50/90 border-emerald-200 text-emerald-700 font-medium';
      case 'WARNING':
        return 'bg-amber-50/90 border-amber-200 text-amber-800 font-semibold';
      case 'CRITICAL':
        return 'bg-rose-50/90 border-rose-200 text-rose-700 font-bold animate-pulse';
      case 'OFFLINE':
      default:
        return 'bg-slate-100 border-slate-200 text-slate-600 font-medium';
    }
  };

  const getDotStyle = () => {
    switch (normStatus) {
      case 'NORMAL':
        return 'bg-emerald-500';
      case 'WARNING':
        return 'bg-amber-500';
      case 'CRITICAL':
        return 'bg-rose-500';
      case 'OFFLINE':
      default:
        return 'bg-slate-400';
    }
  };

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-xs px-3 py-1.5'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-mono rounded-full border tracking-wide shadow-xs ${getStyle()} ${sizeClasses[size]} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotStyle()}`} />
      {label || normStatus}
    </span>
  );
};
