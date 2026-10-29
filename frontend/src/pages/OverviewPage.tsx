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
  Sparkles
} from 'lucide-react';
import { MetricCard } from '../components/MetricCard';
import { StatusBadge } from '../components/StatusBadge';
import { LiveSensorChart } from '../charts/LiveSensorChart';
import { TwinEnclosure3D } from '../components/3d/TwinEnclosure3D';
import { TerrainAltitude3D } from '../components/3d/TerrainAltitude3D';
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

  return (
    <div className="space-y-6">
      {/* Prototype threshold disclaimer banner (Hidden on mobile phone as requested) */}
      <div className="hidden sm:flex bg-white border border-blue-100 rounded-xl px-4 py-3 items-center justify-between gap-3 text-xs font-sans text-slate-700 shadow-card">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
            <Sliders className="w-4 h-4" />
          </div>
          <div>
            <span className="font-semibold text-slate-800">
              Active Envelope: Ladakh High-Altitude Field Prototype
            </span>
            <span className="text-slate-500 ml-2 text-[11px]">
              (3,500m – 5,000m ASL Barometric Baseline)
            </span>
          </div>
        </div>
        <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          Prototype limits, not certified flight limits
        </span>
      </div>

      {/* View Mode Switcher Pill */}
      <div className="flex items-center justify-center sm:justify-end">
        <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-mono w-full sm:w-auto shadow-xs">
          <button
            onClick={() => setViewMode('split')}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
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
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
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
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
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

      {/* 5 Main Sensor Cards (with 3D perspective tilt) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1. Atmospheric Pressure */}
        <MetricCard
          label="Atmospheric Pressure"
          value={reading.pressure_kpa}
          unit="kPa abs"
          normalRange={`>${thresholds.pressure_warn} kPa`}
          status={reading.pressure_kpa <= thresholds.pressure_crit ? 'CRITICAL' : reading.pressure_kpa <= thresholds.pressure_warn ? 'WARNING' : 'NORMAL'}
          icon={<Gauge className="w-4 h-4 text-sky-600" />}
          subtitle="Ambient barometric pressure"
          isStale={isStale}
        />

        {/* 2. Ambient Temperature */}
        <MetricCard
          label="Ambient Temperature"
          value={reading.temperature_c}
          unit="°C"
          normalRange={`<${thresholds.temp_warn}°C`}
          status={reading.temperature_c >= thresholds.temp_crit ? 'CRITICAL' : reading.temperature_c >= thresholds.temp_warn ? 'WARNING' : 'NORMAL'}
          icon={<Thermometer className="w-4 h-4 text-orange-500" />}
          subtitle="External enclosure sensor"
          isStale={isStale}
        />

        {/* 3. Power Consumption (V x I) */}
        <MetricCard
          label="Power Consumption"
          value={reading.power_w}
          unit="W"
          normalRange={`<${thresholds.power_warn} W`}
          status={reading.power_w >= thresholds.power_crit ? 'CRITICAL' : reading.power_w >= thresholds.power_warn ? 'WARNING' : 'NORMAL'}
          icon={<Zap className="w-4 h-4 text-amber-500" />}
          subtitle="Calculated: P = V × I"
          isStale={isStale}
        />

        {/* 4. Circuit Voltage */}
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

        {/* 5. Circuit Current */}
        <MetricCard
          label="Input Current"
          value={reading.current_a}
          unit="A"
          normalRange={`<${thresholds.current_max} A`}
          status={reading.current_a > thresholds.current_max ? 'CRITICAL' : 'NORMAL'}
          icon={<Cpu className="w-4 h-4 text-indigo-600" />}
          subtitle="Branch circuit draw"
          isStale={isStale}
        />
      </div>

      {/* Secondary Actuator & Communication Indicators Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card grid grid-cols-2 md:grid-cols-5 gap-4 text-xs font-mono">
        {/* Fan state */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
            reading.fan_state ? 'bg-blue-50 text-blue-600 border border-blue-200 animate-spin' : 'bg-slate-100 text-slate-500'
          }`}>
            <Fan className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">COOLING FAN</div>
            <div className={`font-semibold ${reading.fan_state ? 'text-blue-700' : 'text-slate-700'}`}>
              {reading.fan_state ? 'ACTIVE (100% RPM)' : 'STANDBY (OFF)'}
            </div>
          </div>
        </div>

        {/* MOSFET State */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
            reading.mosfet_state === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'
          }`}>
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">LOAD CONTROL</div>
            <div className="font-semibold text-slate-800">
              {reading.mosfet_state}
            </div>
          </div>
        </div>

        {/* Device Operating State */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">STATUS</div>
            <div className="mt-0.5">
              <StatusBadge status={isStale ? 'OFFLINE' : reading.severity} size="sm" />
            </div>
          </div>
        </div>

        {/* LoRa Sequence & Link */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-blue-600 flex items-center justify-center">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">LORA TELEMETRY</div>
            <div className="text-slate-800 font-semibold">
              Packet #{reading.packet_seq ?? '--'}
            </div>
          </div>
        </div>

        {/* Last update */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">FRESHNESS</div>
            <div className="text-slate-800 font-semibold">
              {isStale ? 'STALE / TIMEOUT' : reading.freshness_status}
            </div>
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

      {/* Event Summary Card */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
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

        {/* Recent Protection Actions */}
        <div>
          <span className="text-[11px] font-sans font-bold uppercase tracking-wider text-slate-500 mb-2 block">
            Recent Automatic Protection Actions
          </span>
          {eventSummary.recent_actions && eventSummary.recent_actions.length > 0 ? (
            <div className="space-y-2">
              {eventSummary.recent_actions.map((act, i) => (
                <div key={i} className="flex items-start justify-between text-xs font-mono bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600 mt-1" />
                    <div>
                      <span className="text-blue-700 font-semibold">{act.action}</span>
                      <span className="text-slate-600 ml-2">— {act.reason}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-medium">
                    {new Date(act.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs font-sans text-slate-500 py-2">
              No recent protection overrides triggered. Circuit operating within nominal envelope.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
