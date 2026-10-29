import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

interface LiveSensorChartProps {
  title: string;
  data: Array<any>;
  dataKeys: Array<{
    key: string;
    name: string;
    color: string;
    unit: string;
  }>;
  yDomain?: [number | string, number | string];
  height?: number;
  timeRange?: string;
  onTimeRangeChange?: (range: string) => void;
  showTimeRangeSelector?: boolean;
}

export const LiveSensorChart: React.FC<LiveSensorChartProps> = ({
  title,
  data,
  dataKeys,
  yDomain,
  height = 240,
  timeRange = '15m',
  onTimeRangeChange,
  showTimeRangeSelector = false
}) => {
  const formatTime = (ts: string) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const ranges = ['1m', '5m', '15m', '1h'];

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider">
          {title}
        </h3>
        {showTimeRangeSelector && onTimeRangeChange && (
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
            {ranges.map((r) => (
              <button
                key={r}
                onClick={() => onTimeRangeChange(r)}
                className={`text-[11px] font-mono px-2.5 py-0.5 rounded-md transition-all ${
                  timeRange === r
                    ? 'bg-white text-blue-700 font-bold shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 font-medium'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chart container */}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              {dataKeys.map((dk) => (
                <linearGradient key={dk.key} id={`grad-${dk.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={dk.color} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={dk.color} stopOpacity={0.0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              stroke="#94a3b8"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              minTickGap={30}
            />
            <YAxis
              domain={yDomain || ['auto', 'auto']}
              stroke="#94a3b8"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#ffffff',
                borderColor: '#e2e8f0',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                fontSize: '12px',
                fontFamily: 'JetBrains Mono, monospace',
                color: '#0f172a'
              }}
              labelFormatter={(label) => `Time: ${formatTime(label)}`}
              formatter={(value: any, name: any, item: any) => {
                const dk = dataKeys.find((d) => d.name === name || d.key === item.dataKey);
                return [`${Number(value).toFixed(2)} ${dk?.unit || ''}`, dk?.name || name];
              }}
            />
            {dataKeys.length > 1 && (
              <Legend
                wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', paddingTop: '10px' }}
              />
            )}
            {dataKeys.map((dk) => (
              <Area
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color}
                strokeWidth={2}
                fillOpacity={1}
                fill={`url(#grad-${dk.key})`}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
