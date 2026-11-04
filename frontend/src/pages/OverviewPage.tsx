import React, { useState } from 'react';
import {
  Thermometer,
  Gauge,
  Zap,
  BatteryCharging,
  Cpu,
  Fan,
  Radio,
  Clock,
  ShieldAlert,
  Sliders,
  Boxes,
  LineChart,
  Layers,
  Sparkles,
  MapPin,
  Activity,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Navigation
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { LiveSensorChart } from '../charts/LiveSensorChart';
import { TwinEnclosure3D } from '../components/3d/TwinEnclosure3D';
import { TerrainAltitude3D } from '../components/3d/TerrainAltitude3D';
import { GpsMap } from '../components/GpsMap';
import { SensorReading, EventSummary, ThresholdSettings } from '../types';

interface OverviewPageProps {
  reading: SensorReading;
  history: Array<any>;
  eventSummary: EventSummary;
  thresholds: ThresholdSettings;
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  isStale: boolean;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  reading,
  history,
  eventSummary,
  thresholds,
  timeRange,
  onTimeRangeChange,
  isStale
}) => {
  const [viewMode, setViewMode] = useState<'split' | '3d' | 'charts'>('split');

  const isSimulated = reading.source === 'SIMULATION';
  const hasGpsFix = Boolean(reading.gps_fix && reading.latitude != null && reading.longitude != null);

  // Digital Twin Combined Stress Assessment
  const tempExcess = Math.max(0, reading.temperature_c - 25.0);
  const powerExcess = Math.max(0, reading.power_w - 6.0);
  const calculatedRiskIndex = Math.min(100, Math.round(tempExcess * 1.5 + powerExcess * 4.0));
  const riskLevel = calculatedRiskIndex > 65 ? 'HIGH RISK' : calculatedRiskIndex > 35 ? 'MODERATE RISK' : 'LOW RISK / NOMINAL';

  return (
    <div className="space-y-5">
      {/* Top Architecture Status Bar: Mode, Unit 1, Unit 2, GPS */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
        {/* Operating Mode */}
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
            isSimulated ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
          }`}>
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-bold">OPERATING MODE</div>
            <div className="font-bold text-slate-800 truncate">
              {isSimulated ? 'DEMO MODE (SIMULATED)' : 'LIVE HARDWARE MODE'}
            </div>
          </div>
        </div>

        {/* Unit 1 Status */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-blue-600 flex items-center justify-center shrink-0">
            <Radio className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-bold">UNIT 1 (SENSORS)</div>
            <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full ${reading.unit1_status === 'OFFLINE' ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'}`} />
              {reading.unit1_status ?? (isStale ? 'OFFLINE' : 'ONLINE')}
            </div>
          </div>
        </div>

        {/* Unit 2 Status */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Activity className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-bold">UNIT 2 (GATEWAY)</div>
            <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {reading.unit2_status ?? 'CONNECTED'}
            </div>
          </div>
        </div>

        {/* GPS Fix Status */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-cyan-600 flex items-center justify-center shrink-0">
            <MapPin className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-[10px] text-slate-400 uppercase font-bold">GPS POSITIONING</div>
            <div className="font-bold text-slate-800 flex items-center gap-1.5 truncate">
              <span className={`w-2 h-2 rounded-full ${hasGpsFix ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {hasGpsFix ? '3D FIX ACTIVE' : 'NO SATELLITE FIX'}
            </div>
          </div>
        </div>
      </div>

      {/* View Mode Switcher Pill */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
          <span className="font-bold text-slate-800">PRIMARY TELEMETRY DECK</span>
          <span>•</span>
          <span>Ladakh Environmental Baseline</span>
        </div>

        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-mono shadow-xs">
          <button
            onClick={() => setViewMode('split')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'split'
                ? 'bg-white text-blue-700 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-blue-600" />
            <span>Split 3D & Trends</span>
          </button>
          <button
            onClick={() => setViewMode('3d')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === '3d'
                ? 'bg-white text-blue-700 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Boxes className="w-3.5 h-3.5 text-cyan-600" />
            <span>3D Digital Twin</span>
          </button>
          <button
            onClick={() => setViewMode('charts')}
            className={`flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
              viewMode === 'charts'
                ? 'bg-white text-blue-700 font-bold shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LineChart className="w-3.5 h-3.5 text-emerald-600" />
            <span>2D Charts</span>
          </button>
        </div>
      </div>

      {/* 5 Main Sensor Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Ambient Temperature */}
        <MetricCard
          label="Temperature"
          value={reading.temperature_c}
          unit="°C"
          normalRange={`<${thresholds.temp_warn}°C`}
          status={reading.temperature_c >= thresholds.temp_crit ? 'CRITICAL' : reading.temperature_c >= thresholds.temp_warn ? 'WARNING' : 'NORMAL'}
          icon={<Thermometer className="w-4 h-4 text-orange-500" />}
          subtitle="Unit 1 ambient sensor"
          isStale={isStale}
        />

        {/* 2. Circuit Voltage */}
        <MetricCard
          label="Input Voltage"
          value={reading.voltage_v}
          unit="V"
          normalRange={`${thresholds.voltage_min} - ${thresholds.voltage_max} V`}
          status={reading.voltage_v < thresholds.voltage_min || reading.voltage_v > thresholds.voltage_max ? 'WARNING' : 'NORMAL'}
          icon={<BatteryCharging className="w-4 h-4 text-emerald-600" />}
          subtitle="Regulated DC power rail"
          isStale={isStale}
        />

        {/* 3. Circuit Current */}
        <MetricCard
          label="Input Current"
          value={reading.current_a}
          unit="A"
          normalRange={`<${thresholds.current_max} A`}
          status={reading.current_a > thresholds.current_max ? 'CRITICAL' : 'NORMAL'}
          icon={<Cpu className="w-4 h-4 text-indigo-600" />}
          subtitle="Branch circuit shunt"
          isStale={isStale}
        />

        {/* 4. Power (P = V x I) */}
        <MetricCard
          label="Input Power"
          value={reading.power_w}
          unit="W"
          normalRange={`<${thresholds.power_warn} W`}
          status={reading.power_w >= thresholds.power_crit ? 'CRITICAL' : reading.power_w >= thresholds.power_warn ? 'WARNING' : 'NORMAL'}
          icon={<Zap className="w-4 h-4 text-amber-500" />}
          subtitle="Calculated: P = V × I"
          isStale={isStale}
        />

        {/* 5. GPS Status Card */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-slate-500">GPS LOCATION</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              hasGpsFix ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
            }`}>
              {hasGpsFix ? 'FIXED' : 'SEARCHING'}
            </span>
          </div>

          <div className="my-1">
            <div className="text-base font-bold font-mono text-slate-900 truncate">
              {hasGpsFix ? `${reading.latitude?.toFixed(4)}°, ${reading.longitude?.toFixed(4)}°` : 'No Coordinate Fix'}
            </div>
            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
              {hasGpsFix ? 'Ladakh Field Deployment' : 'Awaiting satellite lock'}
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span>{isSimulated ? 'Simulated Route' : 'Hardware GNSS'}</span>
            <MapPin className="w-3.5 h-3.5 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Equipment Location Mini Preview & Digital Twin Risk Indicator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Interactive Mini Map Preview (5 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
                Equipment Location & Map Preview
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {hasGpsFix ? 'OSM Standard Grid' : 'Standby'}
            </span>
          </div>

          <GpsMap
            latitude={reading.latitude}
            longitude={reading.longitude}
            gpsFix={reading.gps_fix}
            isSimulated={isSimulated}
            lastUpdate={reading.timestamp}
            height="260px"
            showRecenterButton={true}
          />
        </div>

        {/* Digital Twin Operating Risk Indicator (6 cols) */}
        <div className="lg:col-span-6 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
                  Digital Twin Thermodynamic Risk Appraisal
                </h3>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                calculatedRiskIndex > 65
                  ? 'bg-rose-50 text-rose-700 border border-rose-200'
                  : calculatedRiskIndex > 35
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {riskLevel}
              </span>
            </div>

            {/* Risk Index Progress bar */}
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-600">Combined Thermal & Dielectric Stress Index:</span>
                <span className="font-bold text-slate-900">{calculatedRiskIndex} / 100</span>
              </div>
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200">
                <div
                  className={`h-full transition-all duration-300 rounded-full ${
                    calculatedRiskIndex > 65
                      ? 'bg-rose-500'
                      : calculatedRiskIndex > 35
                      ? 'bg-amber-500'
                      : 'bg-emerald-500'
                  }`}
                  style={{ width: `${calculatedRiskIndex}%` }}
                />
              </div>
            </div>

            {/* Diagnostic recommendations */}
            <div className="space-y-2 text-xs font-sans text-slate-600">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  High-altitude air density derating (~60% of sea level mass airflow at Ladakh 4,000m ASL).
                </span>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  Current power dissipation is <strong>{reading.power_w.toFixed(2)} W</strong> (<code className="font-mono bg-slate-100 px-1 py-0.2 rounded">P = V × I</code>).
                </span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] font-mono text-slate-400 italic">
            Virtual model derived from ISA atmosphere and thermal transfer equations.
          </div>
        </div>
      </div>

      {/* 3D Visualizer Views */}
      {(viewMode === 'split' || viewMode === '3d') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Unit 1 3D Physical Digital Twin */}
          <div className={viewMode === '3d' ? 'lg:col-span-8' : 'lg:col-span-7'}>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
                    Unit 1 Remote Enclosure • Real-Time 3D Twin
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Orbit: Drag • Zoom: Scroll
                </span>
              </div>
              <TwinEnclosure3D
                temperature={reading.temperature_c}
                pressure={reading.pressure_kpa}
                power={reading.power_w}
                voltage={reading.voltage_v}
                current={reading.current_a}
                fanState={reading.fan_state}
                mosfetState={reading.mosfet_state}
                status={isStale ? 'OFFLINE' : reading.severity}
                height={viewMode === '3d' ? '540px' : '440px'}
                showControls={true}
              />
            </div>
          </div>

          {/* Ladakh 3D Altitude & Atmospheric Lapse Profile */}
          <div className={viewMode === '3d' ? 'lg:col-span-4' : 'lg:col-span-5'}>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card h-full flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
                    Ladakh Atmospheric Profile
                  </h3>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  Barometric Axis
                </span>
              </div>
              <TerrainAltitude3D
                pressureKpa={reading.pressure_kpa}
                temperatureC={reading.temperature_c}
                height={viewMode === '3d' ? '540px' : '440px'}
              />
            </div>
          </div>
        </div>
      )}

      {/* Live Graphs Grid (4 charts) */}
      {(viewMode === 'split' || viewMode === 'charts') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LiveSensorChart
            title="Ambient Temperature Trend (°C)"
            data={history}
            dataKeys={[
              { key: 'temperature_c', name: 'Temp (°C)', color: '#f97316', unit: '°C' }
            ]}
            yDomain={['auto', 'auto']}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
            showTimeRangeSelector={true}
          />

          <LiveSensorChart
            title="Atmospheric Pressure Trend (kPa)"
            data={history}
            dataKeys={[
              { key: 'pressure_kpa', name: 'Pressure (kPa)', color: '#0284c7', unit: 'kPa' }
            ]}
            yDomain={['auto', 'auto']}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
          />

          <LiveSensorChart
            title="Electrical Rail: Voltage (V) & Current (A)"
            data={history}
            dataKeys={[
              { key: 'voltage_v', name: 'Voltage (V)', color: '#059669', unit: 'V' },
              { key: 'current_a', name: 'Current (A)', color: '#4f46e5', unit: 'A' }
            ]}
            yDomain={[0, 16]}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
          />

          <LiveSensorChart
            title="Power Consumption Trend: P = V × I (W)"
            data={history}
            dataKeys={[
              { key: 'power_w', name: 'Power (W)', color: '#d97706', unit: 'W' }
            ]}
            yDomain={[0, 'auto']}
            timeRange={timeRange}
            onTimeRangeChange={onTimeRangeChange}
          />
        </div>
      )}

      {/* Protection Event Summary */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
              Protection Event & Safety Summary
            </h3>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="text-slate-600">
              Session Events: <strong className="text-slate-900 font-bold">{eventSummary.session_events}</strong>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Active Warnings</span>
            <span className={`text-2xl font-mono font-bold ${eventSummary.active_warnings > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
              {eventSummary.active_warnings}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Critical Faults</span>
            <span className={`text-2xl font-mono font-bold ${eventSummary.critical_faults > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
              {eventSummary.critical_faults}
            </span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">Protection Status</span>
            <StatusBadge status={eventSummary.critical_faults > 0 ? 'CRITICAL' : eventSummary.active_warnings > 0 ? 'WARNING' : 'NORMAL'} size="md" />
          </div>
        </div>
      </div>
    </div>
  );
};
