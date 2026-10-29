import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CornerDownLeft,
  Flame,
  Fan,
  Zap,
  Clock,
  ShieldAlert,
  Info,
  Boxes
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { TwinEnclosure3D } from '../components/3d/TwinEnclosure3D';
import { TempDemoState } from '../types';
import { sendDemoAction } from '../services/api';

interface TempDemoPageProps {
  demoState: TempDemoState;
}

export const TempDemoPage: React.FC<TempDemoPageProps> = ({ demoState }) => {
  const handleAction = async (action: string, value?: number) => {
    try {
      await sendDemoAction('temperature', action, value);
    } catch (e) {
      console.error('Demo action failed:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Simulation safety banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-card">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed font-sans">
          <strong className="text-amber-950 uppercase tracking-wide block font-bold mb-0.5">
            Deterministic Anomaly Demonstration (SIMULATED CONTROL)
          </strong>
          This interactive test demonstrates thermal runaway mitigation in Ladakh's reduced air density.
          All protection actions (fan and load shed) are <strong>SIMULATED</strong> and will not issue real hardware commands to active circuits.
          <span className="block mt-1 font-mono text-amber-800 font-semibold">
            Invariants: Atmospheric Pressure (70.0 kPa) and Supply Voltage (12.0 V) remain strictly invariant.
          </span>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {!demoState.running ? (
            <button
              onClick={() => handleAction('start')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-bold shadow-sm transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              START DEMO
            </button>
          ) : (
            <button
              onClick={() => handleAction('pause')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-sans text-xs font-bold shadow-sm transition-all"
            >
              <Pause className="w-4 h-4 fill-current" />
              PAUSE DEMO
            </button>
          )}

          <button
            onClick={() => handleAction('reset')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-sans text-xs font-semibold border border-slate-200 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            RESET DEMO
          </button>

          <button
            onClick={() => handleAction('return_to_normal')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-sans text-xs font-semibold border border-blue-200 transition-all"
          >
            <CornerDownLeft className="w-4 h-4" />
            RETURN TO NORMAL
          </button>
        </div>

        {/* Phase and Status */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500 font-medium">
            SEQUENCE PHASE: <strong className="text-blue-700 font-bold">{demoState.phase}</strong>
          </span>
          <StatusBadge status={demoState.severity} size="md" />
        </div>
      </div>

      {/* 4 Telemetry Metric Display Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Current Temp */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 font-sans mb-1">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-600">
              <Flame className="w-4 h-4 text-orange-500" />
              CURRENT TEMP
            </span>
            <span className="text-[11px] font-mono font-medium text-slate-400">Nominal 25°C</span>
          </div>
          <div className={`text-4xl font-mono font-bold my-1 tracking-tight ${
            demoState.temperature_c >= demoState.crit_threshold
              ? 'text-rose-600'
              : demoState.temperature_c >= demoState.warn_threshold
              ? 'text-amber-600'
              : 'text-slate-900'
          }`}>
            {demoState.temperature_c.toFixed(1)} <span className="text-lg font-normal text-slate-500">°C</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Warn: ≥{demoState.warn_threshold}°C | Crit: ≥{demoState.crit_threshold}°C
          </div>
        </div>

        {/* Simulated Fan Actuator */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 font-sans mb-1">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-600">
              <Fan className="w-4 h-4 text-blue-600" />
              SIMULATED FAN
            </span>
            <span className="text-[10px] bg-blue-50 px-2 py-0.5 rounded-full text-blue-700 font-mono font-semibold border border-blue-200">
              SIMULATED
            </span>
          </div>
          <div className={`text-2xl font-mono font-bold my-2 ${
            demoState.simulated_fan_state ? 'text-blue-600' : 'text-slate-400'
          }`}>
            {demoState.simulated_fan_state ? 'ACTIVE (100% RPM)' : 'STANDBY (OFF)'}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100">
            {demoState.simulated_fan_state ? 'Convective cooling model active' : 'Triggers automatically at critical'}
          </div>
        </div>

        {/* Simulated Load Control State */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 font-sans mb-1">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-600">
              <Zap className="w-4 h-4 text-emerald-600" />
              MOSFET LOAD STATE
            </span>
            <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full text-emerald-700 font-mono font-semibold border border-emerald-200">
              SIMULATED
            </span>
          </div>
          <div className={`text-2xl font-mono font-bold my-2 ${
            demoState.simulated_mosfet_state === 'DERATED' ? 'text-amber-600' : 'text-emerald-600'
          }`}>
            {demoState.simulated_mosfet_state}
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Current: {demoState.current_a} A | Power: {demoState.power_w} W
          </div>
        </div>

        {/* Time Above Threshold & Recovery */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 font-sans mb-1">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-600">
              <Clock className="w-4 h-4 text-purple-600" />
              EXPOSURE & RECOVERY
            </span>
          </div>
          <div className="text-xl font-mono font-bold text-slate-900 my-2">
            Status: <span className="text-blue-600 font-mono">{demoState.recovery_status}</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Recovery: &lt;{demoState.recovery_threshold}°C (hysteresis)
          </div>
        </div>
      </div>

      {/* 3D Physical Digital Twin Thermal Visualizer */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-cyan-600" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
              Interactive 3D Thermal Hotspot & Actuator Response
            </h3>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
            <span className="hidden sm:inline">Real-Time Heatmap • Dynamic Fan Speed • Airflow Particles</span>
          </div>
        </div>
        <TwinEnclosure3D
          temperature={demoState.temperature_c}
          pressure={demoState.pressure_kpa}
          power={demoState.power_w}
          voltage={demoState.voltage_v}
          current={demoState.current_a}
          fanState={demoState.simulated_fan_state}
          mosfetState={demoState.simulated_mosfet_state}
          status={demoState.severity}
          height="460px"
          showControls={true}
        />
      </div>

      {/* Manual Slider & Invariant Checker */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual temperature slider */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
          <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider mb-2">
            Manual Temperature Override Slider
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Test immediate threshold crossings and fan response interactively by dragging the slider. Watch the 3D heatsink glow and fan spin up!
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="20"
              max="85"
              step="0.5"
              value={demoState.temperature_c}
              onChange={(e) => handleAction('set_manual_value', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-lg font-mono font-bold text-blue-700 w-16 text-right">
              {demoState.temperature_c.toFixed(1)}°C
            </span>
          </div>
        </div>

        {/* Invariant Verification Box */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
          <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-600" />
            Specified Parameter Invariants
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono mt-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Pressure Invariant:</span>
              <div className="text-slate-900 font-bold mt-0.5">{demoState.pressure_kpa.toFixed(1)} kPa (LOCKED)</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Voltage Invariant:</span>
              <div className="text-slate-900 font-bold mt-0.5">{demoState.voltage_v.toFixed(1)} V (LOCKED)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
        <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider mb-3">
          Demo Action & Transition Timeline
        </h3>
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {demoState.timeline && demoState.timeline.length > 0 ? (
            demoState.timeline.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono"
              >
                <span className="text-slate-500 shrink-0 font-medium">
                  {new Date(entry.timestamp).toLocaleTimeString([], { hour12: false })}
                </span>
                <span className="text-slate-800 flex-1 font-medium">{entry.message}</span>
                <StatusBadge status={entry.severity} size="sm" />
              </div>
            ))
          ) : (
            <div className="text-xs font-sans text-slate-400">No events recorded yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
