import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import { DigitalTwinPoint } from '../types';

interface TwinResponseChartProps {
  data: DigitalTwinPoint[];
  critThreshold?: number;
  warnThreshold?: number;
}

export const TwinResponseChart: React.FC<TwinResponseChartProps> = ({
  data,
  critThreshold = 70.0,
  warnThreshold = 60.0
}) => {
  return (
    <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card hover:shadow-card-hover transition-all duration-200">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider">
            Thermal Transient Response Curve
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">
            First-order thermodynamic convergence: PCB junction temperature vs Ambient
          </p>
        </div>
      </div>

      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 10, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="time_min"
              stroke="#94a3b8"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              label={{ value: 'Time (minutes)', position: 'insideBottom', offset: -5, fill: '#64748b', fontSize: 10 }}
            />
            <YAxis
              stroke="#94a3b8"
              tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'JetBrains Mono, monospace' }}
              domain={['auto', 'auto']}
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
              formatter={(value: any, name: any) => [`${Number(value).toFixed(2)} °C`, name]}
              labelFormatter={(label) => `t = ${label} min`}
            />
            <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'JetBrains Mono, monospace', paddingTop: '10px' }} />

            <ReferenceLine
              y={critThreshold}
              stroke="#dc2626"
              strokeDasharray="4 4"
              label={{ value: `Critical: ${critThreshold}°C`, fill: '#dc2626', fontSize: 10, position: 'insideTopRight' }}
            />
            <ReferenceLine
              y={warnThreshold}
              stroke="#d97706"
              strokeDasharray="4 4"
              label={{ value: `Warning: ${warnThreshold}°C`, fill: '#d97706', fontSize: 10, position: 'insideBottomRight' }}
            />

            <Line
              type="monotone"
              dataKey="pcb_temperature_c"
              name="Estimated PCB Temp (°C)"
              stroke="#ea580c"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="ambient_temperature_c"
              name="Ambient Temperature (°C)"
              stroke="#0284c7"
              strokeWidth={1.8}
              strokeDasharray="5 5"
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
