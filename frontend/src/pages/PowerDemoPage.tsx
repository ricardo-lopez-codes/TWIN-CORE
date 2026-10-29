import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CornerDownLeft,
  Zap,
  BatteryCharging,
  Cpu,
  ShieldAlert,
  Info,
  Boxes
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { TwinEnclosure3D } from '../components/3d/TwinEnclosure3D';
import { PowerDemoState } from '../types';
import { sendDemoAction } from '../services/api';

interface PowerDemoPageProps {
  demoState: PowerDemoState;
}

export const PowerDemoPage: React.FC<PowerDemoPageProps> = ({ demoState }) => {
  const handleAction = async (action: string, value?: number) => {
    try {
      await sendDemoAction('power', action, value);
    } catch (e) {
      console.error('Power demo action error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Power Stage Safety Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-card">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed font-sans">
          <strong className="text-amber-950 uppercase tracking-wide block font-bold mb-0.5">
            Electrical Overpower & Load Shedding Demonstration
          </strong>
          {demoState.safety_note || (
            "Logical load control simulation only. Real MOSFET power stages require gate driver isolation and thermal validation before hardware actuation."
          )}
          <span className="block mt-1 font-mono text-amber-800 font-semibold">
            Invariants: Ambient Temperature (25.0°C) and Atmospheric Pressure (70.0 kPa) remain strictly locked.
          </span>
        </div>
      </div>

      {/* Controls Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          {!demoState.running ? (
            <button
              onClick={() => handleAction('start')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-sans text-xs font-bold shadow-sm transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              START SURGE DEMO
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
            RESET TO 6W
          </button>

          <button
            onClick={() => handleAction('return_to_normal')}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-sans text-xs font-semibold border border-blue-200 transition-all"
          >
            <CornerDownLeft className="w-4 h-4" />
            TRIGGER LOAD SHED
          </button>
        </div>

        {/* Phase & Severity */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-slate-500 font-medium">
            PHASE: <strong className="text-blue-700 font-bold">{demoState.phase}</strong>
          </span>
          <StatusBadge status={demoState.severity} size="md" />
        </div>
      </div>

      {/* 4 Cards: Calculated Power, Current, Voltage, Load % */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Calculated Power */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 font-sans mb-1">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700">
              <Zap className="w-4 h-4 text-amber-500" />
              CALCULATED POWER (P)
            </span>
            <span className="text-[10px] bg-amber-50 px-2 py-0.5 rounded-full text-amber-800 font-mono font-bold border border-amber-200">
              V × I
            </span>
          </div>
          <div className={`text-4xl font-mono font-bold my-1 tracking-tight ${
            demoState.power_w >= demoState.crit_threshold
              ? 'text-rose-600'
              : demoState.power_w >= demoState.warn_threshold
              ? 'text-amber-600'
              : 'text-slate-900'
          }`}>
            {demoState.power_w.toFixed(1)} <span className="text-lg font-normal text-slate-500">W</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Warn: ≥{demoState.warn_threshold} W | Crit: ≥{demoState.crit_threshold} W
          </div>
        </div>

        {/* Monitored Current */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 font-sans mb-1">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700">
              <Cpu className="w-4 h-4 text-indigo-600" />
              BRANCH CURRENT (I)
            </span>
          </div>
          <div className="text-3xl font-mono font-bold my-1 text-slate-900 tracking-tight">
            {demoState.current_a.toFixed(2)} <span className="text-lg font-normal text-slate-500">A</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Surges dynamically during test
          </div>
        </div>

        {/* Constant Voltage Invariant */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 font-sans mb-1">
            <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-700">
              <BatteryCharging className="w-4 h-4 text-emerald-600" />
              BUS VOLTAGE (V)
            </span>
            <span className="text-[10px] bg-emerald-50 px-2 py-0.5 rounded-full text-emerald-800 font-mono font-bold border border-emerald-200">
              INVARIANT
            </span>
          </div>
          <div className="text-3xl font-mono font-bold my-1 text-emerald-600 tracking-tight">
            {demoState.voltage_v.toFixed(1)} <span className="text-lg font-normal text-slate-500">V</span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Fixed regulated rail voltage
          </div>
        </div>

        {/* Load Control & MOSFET State */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center justify-between text-xs text-slate-500 font-sans mb-1">
            <span className="font-bold uppercase tracking-wider text-slate-700">MOSFET STAGE</span>
            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-700 font-mono font-bold border border-slate-200">
              SIMULATED
            </span>
          </div>
          <div className="flex items-baseline gap-2 my-1">
            <span className="text-3xl font-mono font-bold text-blue-700 tracking-tight">
              {demoState.load_control_pct.toFixed(0)}%
            </span>
            <span className="text-xs font-mono font-bold text-slate-500">
              ({demoState.simulated_mosfet_state})
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-500 mt-2 pt-2 border-t border-slate-100">
            PWM load throttling duty cycle
          </div>
        </div>
      </div>

      {/* 3D Hardware Power Stage Visualizer */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Boxes className="w-4 h-4 text-cyan-600" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
              3D Power Flow & MOSFET Load Switch Inspection
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Current: {demoState.current_a.toFixed(2)}A • Power: {demoState.power_w.toFixed(1)}W
          </span>
        </div>
        <TwinEnclosure3D
          temperature={demoState.temperature_c}
          pressure={demoState.pressure_kpa}
          power={demoState.power_w}
          voltage={demoState.voltage_v}
          current={demoState.current_a}
          fanState={false}
          mosfetState={demoState.simulated_mosfet_state}
          status={demoState.severity}
          height="440px"
          showControls={true}
        />
      </div>

      {/* Manual Current Slider & Invariants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual current slider */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
          <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider mb-2">
            Manual Circuit Current Override Slider
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Simulate instantaneous electrical load variations by modulating current draw:
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="0.2"
              max="2.0"
              step="0.05"
              value={demoState.current_a}
              onChange={(e) => handleAction('set_manual_value', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <span className="text-lg font-mono font-bold text-slate-900 w-28 text-right">
              {demoState.current_a.toFixed(2)} A ({(demoState.current_a * demoState.voltage_v).toFixed(1)} W)
            </span>
          </div>
        </div>

        {/* Environmental Invariants Confirmation */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
          <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-emerald-600" />
            Specified Invariants Under Power Surge
          </h3>
          <div className="grid grid-cols-2 gap-3 text-xs font-mono mt-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Ambient Temp:</span>
              <div className="text-slate-900 font-bold mt-0.5">{demoState.temperature_c.toFixed(1)}°C (LOCKED)</div>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-slate-500 font-medium">Atmospheric Press:</span>
              <div className="text-slate-900 font-bold mt-0.5">{demoState.pressure_kpa.toFixed(1)} kPa (LOCKED)</div>
            </div>
          </div>
        </div>
      </div>

      {/* Event Timeline */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
        <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider mb-3">
          Power Surge Event & Action Timeline
        </h3>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
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
            <div className="text-xs font-sans text-slate-400">No events logged yet.</div>
          )}
        </div>
      </div>
    </div>
  );
};
