import React, { useMemo } from 'react';
import {
  Activity,
  Radio,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info,
  Thermometer,
  Zap,
  BatteryCharging,
  Cpu,
  MapPin,
  TrendingUp,
  Sliders,
  Compass
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { GpsMap } from '../components/GpsMap';
import { SensorReading, ThresholdSettings } from '../types';

interface LiveMonitoringPageProps {
  reading: SensorReading;
  history?: Array<any>;
  thresholds: ThresholdSettings;
  isStale: boolean;
}

// Mini SVG Sparkline component for smooth inline telemetry trends
const MiniSparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({
  data,
  color,
  height = 42
}) => {
  if (!data || data.length < 2) {
    return <div style={{ height }} className="flex items-center text-[10px] text-slate-400 font-mono">Gathering samples...</div>;
  }

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min === 0 ? 1 : max - min;
  const width = 180;
  const padding = 4;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({
  reading,
  history = [],
  thresholds,
  isStale
}) => {
  // Extract historical arrays for sparklines and min/max calculation
  const stats = useMemo(() => {
    const temps = history.map((h) => h.temperature_c ?? 0).filter((v) => v !== 0);
    const volts = history.map((h) => h.voltage_v ?? 0).filter((v) => v !== 0);
    const currs = history.map((h) => h.current_a ?? 0).filter((v) => v !== 0);
    const powers = history.map((h) => h.power_w ?? 0).filter((v) => v !== 0);

    // Include current reading
    if (reading.temperature_c) temps.push(reading.temperature_c);
    if (reading.voltage_v) volts.push(reading.voltage_v);
    if (reading.current_a) currs.push(reading.current_a);
    if (reading.power_w) powers.push(reading.power_w);

    const safeMin = (arr: number[], fallback: number) => (arr.length > 0 ? Math.min(...arr) : fallback);
    const safeMax = (arr: number[], fallback: number) => (arr.length > 0 ? Math.max(...arr) : fallback);

    return {
      temp: {
        series: temps.slice(-25),
        min: safeMin(temps, reading.temperature_c),
        max: safeMax(temps, reading.temperature_c)
      },
      volt: {
        series: volts.slice(-25),
        min: safeMin(volts, reading.voltage_v),
        max: safeMax(volts, reading.voltage_v)
      },
      curr: {
        series: currs.slice(-25),
        min: safeMin(currs, reading.current_a),
        max: safeMax(currs, reading.current_a)
      },
      power: {
        series: powers.slice(-25),
        min: safeMin(powers, reading.power_w),
        max: safeMax(powers, reading.power_w)
      }
    };
  }, [history, reading]);

  const getStatus = (val: number, warn: number, crit: number, lowerIsBad = false) => {
    if (lowerIsBad) {
      if (val <= crit) return 'CRITICAL';
      if (val <= warn) return 'WARNING';
      return 'NORMAL';
    }
    if (val >= crit) return 'CRITICAL';
    if (val >= warn) return 'WARNING';
    return 'NORMAL';
  };

  const tempStatus = getStatus(reading.temperature_c, thresholds.temp_warn, thresholds.temp_crit);
  const voltStatus =
    reading.voltage_v < thresholds.voltage_min || reading.voltage_v > thresholds.voltage_max ? 'WARNING' : 'NORMAL';
  const currStatus = reading.current_a > thresholds.current_max ? 'CRITICAL' : 'NORMAL';
  const powerStatus = getStatus(reading.power_w, thresholds.power_warn, thresholds.power_crit);

  const isSimulated = reading.source === 'SIMULATION';
  const hasGpsFix = Boolean(reading.gps_fix && reading.latitude != null && reading.longitude != null);

  const sensorRows = [
    {
      parameter: 'Ambient / Sensor Temperature',
      rawSensor: 'Unit 1 Precision Thermal Sensor',
      measurementType: 'ACTUAL PHYSICAL MEASUREMENT',
      value: `${reading.temperature_c.toFixed(2)} °C`,
      unit: '°C',
      threshold: `Warn ≥ ${thresholds.temp_warn} | Crit ≥ ${thresholds.temp_crit}`,
      status: tempStatus,
      nature: 'Physical'
    },
    {
      parameter: 'Circuit Input Voltage',
      rawSensor: 'INA3221 Bus Sense (CH1)',
      measurementType: 'ACTUAL PHYSICAL MEASUREMENT',
      value: `${reading.voltage_v.toFixed(2)} V`,
      unit: 'V',
      threshold: `Min ${thresholds.voltage_min} | Max ${thresholds.voltage_max}`,
      status: voltStatus,
      nature: 'Physical'
    },
    {
      parameter: 'Circuit Input Current',
      rawSensor: 'INA3221 Shunt Resistor (10 mΩ)',
      measurementType: 'ACTUAL PHYSICAL MEASUREMENT',
      value: `${reading.current_a.toFixed(3)} A`,
      unit: 'A',
      threshold: `Max Crit ≥ ${thresholds.current_max} A`,
      status: currStatus,
      nature: 'Physical'
    },
    {
      parameter: 'Input Electrical Power',
      rawSensor: 'Automated Real-Time Computation',
      measurementType: 'CALCULATED POWER: P = V × I',
      value: `${reading.power_w.toFixed(2)} W`,
      unit: 'W',
      threshold: `Warn ≥ ${thresholds.power_warn} | Crit ≥ ${thresholds.power_crit}`,
      status: powerStatus,
      nature: 'Calculated'
    },
    {
      parameter: 'GPS Geolocation (Lat / Lon)',
      rawSensor: 'Unit 1 GNSS Satellite Receiver',
      measurementType: 'PHYSICAL POSITION SENSE',
      value: hasGpsFix ? `${reading.latitude?.toFixed(4)}°, ${reading.longitude?.toFixed(4)}°` : 'Searching Lock',
      unit: 'Degrees',
      threshold: 'Lat: -90..90 | Lon: -180..180',
      status: hasGpsFix ? 'NORMAL' : 'WARNING',
      nature: 'Physical'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Distinction Header Callout */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <h3 className="font-sans font-bold text-slate-900 uppercase tracking-wider">
              Live Telemetry Instrumentation & Provenance
            </h3>
            <p className="text-slate-600 leading-relaxed font-normal">
              High-accuracy telemetry streaming from Unit 1 via Unit 2 USB gateway. Electrical power is strictly computed in real time from simultaneous bus voltage and shunt current (<strong className="text-blue-700 font-mono">P = V × I</strong>) without fabrication.
            </p>
          </div>
        </div>
      </div>

      {/* 4 Dedicated Parameter Metric Cards (Temp, Voltage, Current, Power) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* 1. TEMPERATURE CARD */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                <Thermometer className="w-4 h-4 text-orange-500" />
                <span>TEMPERATURE</span>
              </div>
              <StatusBadge status={isStale ? 'OFFLINE' : tempStatus} size="sm" />
            </div>

            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {reading.temperature_c.toFixed(1)}
              </span>
              <span className="text-sm font-mono text-slate-500 font-semibold">°C</span>
            </div>

            {/* Sparkline */}
            <div className="my-3 py-1 bg-slate-50/70 rounded-xl px-2 border border-slate-100">
              <div className="text-[10px] text-slate-400 font-mono mb-1">Live Trend</div>
              <MiniSparkline data={stats.temp.series} color="#f97316" height={40} />
            </div>

            {/* Min / Max readings */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Min Reading</span>
                <span className="font-bold text-slate-800">{stats.temp.min.toFixed(1)} °C</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Max Reading</span>
                <span className="font-bold text-slate-800">{stats.temp.max.toFixed(1)} °C</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-500 flex justify-between items-center">
            <span>Warning Limit:</span>
            <span className="text-amber-600 font-bold">≥ {thresholds.temp_warn}°C</span>
          </div>
        </div>

        {/* 2. INPUT VOLTAGE CARD */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                <BatteryCharging className="w-4 h-4 text-emerald-600" />
                <span>INPUT VOLTAGE</span>
              </div>
              <StatusBadge status={isStale ? 'OFFLINE' : voltStatus} size="sm" />
            </div>

            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {reading.voltage_v.toFixed(2)}
              </span>
              <span className="text-sm font-mono text-slate-500 font-semibold">V</span>
            </div>

            {/* Sparkline */}
            <div className="my-3 py-1 bg-slate-50/70 rounded-xl px-2 border border-slate-100">
              <div className="text-[10px] text-slate-400 font-mono mb-1">Live Trend</div>
              <MiniSparkline data={stats.volt.series} color="#059669" height={40} />
            </div>

            {/* Min / Max readings */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Min Voltage</span>
                <span className="font-bold text-slate-800">{stats.volt.min.toFixed(2)} V</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Max Voltage</span>
                <span className="font-bold text-slate-800">{stats.volt.max.toFixed(2)} V</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-500 flex justify-between items-center">
            <span>Normal Range:</span>
            <span className="text-slate-700 font-bold">{thresholds.voltage_min} - {thresholds.voltage_max} V</span>
          </div>
        </div>

        {/* 3. INPUT CURRENT CARD */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                <Cpu className="w-4 h-4 text-indigo-600" />
                <span>INPUT CURRENT</span>
              </div>
              <StatusBadge status={isStale ? 'OFFLINE' : currStatus} size="sm" />
            </div>

            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {reading.current_a.toFixed(3)}
              </span>
              <span className="text-sm font-mono text-slate-500 font-semibold">A</span>
            </div>

            {/* Sparkline */}
            <div className="my-3 py-1 bg-slate-50/70 rounded-xl px-2 border border-slate-100">
              <div className="text-[10px] text-slate-400 font-mono mb-1">Live Trend</div>
              <MiniSparkline data={stats.curr.series} color="#4f46e5" height={40} />
            </div>

            {/* Min / Max readings */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Min Current</span>
                <span className="font-bold text-slate-800">{stats.curr.min.toFixed(3)} A</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Max Current</span>
                <span className="font-bold text-slate-800">{stats.curr.max.toFixed(3)} A</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-500 flex justify-between items-center">
            <span>Max Rating:</span>
            <span className="text-indigo-600 font-bold">&lt; {thresholds.current_max} A</span>
          </div>
        </div>

        {/* 4. INPUT POWER CARD (P = V x I) */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>INPUT POWER</span>
              </div>
              <StatusBadge status={isStale ? 'OFFLINE' : powerStatus} size="sm" />
            </div>

            <div className="flex items-baseline gap-1 my-1">
              <span className="text-3xl font-black font-mono tracking-tight text-slate-900">
                {reading.power_w.toFixed(2)}
              </span>
              <span className="text-sm font-mono text-slate-500 font-semibold">W</span>
            </div>

            {/* Sparkline */}
            <div className="my-3 py-1 bg-slate-50/70 rounded-xl px-2 border border-slate-100">
              <div className="text-[10px] text-slate-400 font-mono mb-1">Live Trend</div>
              <MiniSparkline data={stats.power.series} color="#d97706" height={40} />
            </div>

            {/* Min / Max readings */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-2 border-t border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Min Power</span>
                <span className="font-bold text-slate-800">{stats.power.min.toFixed(2)} W</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase">Max Power</span>
                <span className="font-bold text-slate-800">{stats.power.max.toFixed(2)} W</span>
              </div>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] font-mono text-slate-500 flex justify-between items-center">
            <span>Calculated:</span>
            <span className="text-amber-700 font-bold font-mono">P = V × I</span>
          </div>
        </div>
      </div>

      {/* GPS Location Section & Interactive Map */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
                Unit 1 GPS Location & Geofence
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">
                {hasGpsFix
                  ? `Lat: ${reading.latitude?.toFixed(6)}° • Lon: ${reading.longitude?.toFixed(6)}°`
                  : 'GPS searching for satellites...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-full text-xs font-mono font-bold flex items-center gap-1.5 ${
              hasGpsFix ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'
            }`}>
              <span className={`w-2 h-2 rounded-full ${hasGpsFix ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              {hasGpsFix ? '3D FIX ACQUIRED' : 'NO SATELLITE FIX'}
            </span>
          </div>
        </div>

        {/* Embedded Leaflet Map */}
        <GpsMap
          latitude={reading.latitude}
          longitude={reading.longitude}
          gpsFix={reading.gps_fix}
          isSimulated={isSimulated}
          lastUpdate={reading.timestamp}
          height="340px"
          showRecenterButton={true}
        />
      </div>

      {/* Calibration & Sensor Validity Table */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-card">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
              Sensor Channel Diagnostics & Threshold Integrity
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Unit 1 Gateway Stream
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-sans">
            <thead className="bg-slate-50 text-slate-600 font-mono uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-5 py-3">Parameter</th>
                <th className="px-5 py-3">Physical Sensor Channel</th>
                <th className="px-5 py-3">Nature</th>
                <th className="px-5 py-3">Current Reading</th>
                <th className="px-5 py-3">Configured Limit</th>
                <th className="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
              {sensorRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50 transition">
                  <td className="px-5 py-3 font-semibold text-slate-900 font-sans">{row.parameter}</td>
                  <td className="px-5 py-3 text-slate-500 text-[11px]">{row.rawSensor}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      row.nature === 'Physical'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}>
                      {row.nature}
                    </span>
                  </td>
                  <td className="px-5 py-3 font-bold text-slate-900">{row.value}</td>
                  <td className="px-5 py-3 text-slate-500 text-[11px]">{row.threshold}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={row.status as any} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
