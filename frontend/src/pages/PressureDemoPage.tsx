import React from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  CornerDownLeft,
  Gauge,
  Wind,
  Info,
  Sliders,
  Boxes
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { PressureGauge } from '../charts/PressureGauge';
import { Chamber3D } from '../components/3d/Chamber3D';
import { PressureDemoState } from '../types';
import { sendDemoAction } from '../services/api';

interface PressureDemoPageProps {
  demoState: PressureDemoState;
}

export const PressureDemoPage: React.FC<PressureDemoPageProps> = ({ demoState }) => {
  const handleAction = async (action: string, value?: number, strategy?: string) => {
    try {
      await sendDemoAction('pressure', action, value, strategy);
    } catch (e) {
      console.error('Pressure demo action error:', e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Educational disclaimer banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-4 flex items-start gap-3 shadow-card">
        <Info className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="text-xs text-sky-900 leading-relaxed font-sans">
          <strong className="text-sky-950 uppercase tracking-wide block font-bold mb-0.5">
            Atmospheric Depressurization Demonstration
          </strong>
          {demoState.educational_note || (
            "Simulated pressure equalization applies to a controlled environmental test chamber with vacuum pumps and vent valves, " +
            "not to the ambient atmosphere in a Ladakh outdoor field deployment. Depressurization is an environmental stressor, not a protective action."
          )}
          <span className="block mt-1 font-mono text-sky-800 font-semibold">
            Invariants: Temperature (25.0°C), Voltage (12.0V), Current (0.50A), and Power (6.0W) remain locked.
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
            RESTORE TO 70 kPa
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

      {/* 3D Hypobaric Chamber + Radial Gauge Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 3D Interactive Test Chamber */}
        <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-cyan-600" />
              <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
                Interactive 3D Hypobaric Vacuum Chamber
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              Drag to Orbit • Observe Solenoid Valve & Pressure Gauge
            </span>
          </div>
          <Chamber3D
            pressure={demoState.pressure_kpa}
            pumpState={demoState.simulated_pump_running ? 'ACTIVE' : 'STOPPED'}
            valveState={demoState.simulated_vent_valve_open ? 'OPEN (VENTING)' : 'CLOSED (SEALED)'}
            stage={demoState.phase}
            height="380px"
          />
        </div>

        {/* Radial Pressure Gauge & Actuators */}
        <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-sans text-slate-700 mb-2">
              <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-slate-800">
                <Gauge className="w-4 h-4 text-sky-600" />
                CHAMBER SENSOR
              </span>
              <span className="text-slate-400 font-mono text-[11px]">Absolute (kPa)</span>
            </div>

            <PressureGauge
              value={demoState.pressure_kpa}
              warnThreshold={demoState.warn_threshold}
              critThreshold={demoState.crit_threshold}
            />

            <div className="text-center font-mono text-[11px] text-slate-500 mt-2 font-medium">
              Warning ≤ {demoState.warn_threshold} kPa | Critical ≤ {demoState.crit_threshold} kPa
            </div>
          </div>

          <div className="space-y-2 mt-4 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">PUMP MOTOR:</span>
              <span className={`font-bold ${demoState.simulated_pump_running ? 'text-amber-600' : 'text-slate-400'}`}>
                {demoState.simulated_pump_running ? 'RUNNING' : 'STANDBY'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-mono bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <span className="text-slate-500">VENT EQUALIZER:</span>
              <span className={`font-bold ${demoState.simulated_vent_valve_open ? 'text-emerald-600' : 'text-slate-400'}`}>
                {demoState.simulated_vent_valve_open ? 'OPEN' : 'SEALED'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Strategy Selector & Chamber Invariants */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Strategy Selector (spans 2 cols) */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
          <div className="flex items-center gap-2 text-xs font-sans font-bold text-slate-800 uppercase tracking-wider mb-2">
            <Sliders className="w-4 h-4 text-blue-600" />
            <span>Simulated Protection Strategy</span>
          </div>
          <p className="text-xs text-slate-500 mb-4 font-normal">
            Select protective protocol when high-altitude chamber pressure breaches critical threshold:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              {
                id: 'chamber_vent',
                title: 'Chamber Vent & Pump Stop',
                tag: 'RECOMMENDED',
                desc: 'Halt vacuum pump, open equalization vent valve to restore 70 kPa.'
              },
              {
                id: 'stop_test',
                title: 'Halt Test Sequence',
                tag: 'INTERRUPT',
                desc: 'Pause telemetry and isolate load branches immediately upon critical depressurization.'
              },
              {
                id: 'alert_only',
                title: 'Passive Alert Only',
                tag: 'MONITOR ONLY',
                desc: 'Raise warnings and log events without commanding simulated chamber valves.'
              }
            ].map((strat) => (
              <label
                key={strat.id}
                className={`block p-3.5 rounded-xl border cursor-pointer transition-all ${
                  demoState.strategy === strat.id
                    ? 'bg-blue-50/70 border-blue-300 ring-2 ring-blue-100 text-slate-900'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="strategy"
                      checked={demoState.strategy === strat.id}
                      onChange={() => handleAction('set_strategy', undefined, strat.id)}
                      className="accent-blue-600"
                    />
                    <span className="font-sans text-xs font-bold text-slate-900">{strat.title}</span>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold text-blue-600 bg-blue-100/60 px-1.5 py-0.5 rounded">
                  {strat.tag}
                </span>
                <p className="text-[11px] text-slate-500 mt-2 font-medium">{strat.desc}</p>
              </label>
            ))}
          </div>
        </div>

        {/* Specified Parameter Invariants */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-sans font-bold text-slate-800 uppercase tracking-wider mb-2">
              <Info className="w-4 h-4 text-emerald-600" />
              <span>Parameter Invariants</span>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Locked constants during depressurization:
            </p>
            <div className="space-y-2 text-xs font-mono">
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between">
                <span className="text-slate-500">Temperature:</span>
                <span className="font-bold text-slate-800">25.0°C (LOCKED)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between">
                <span className="text-slate-500">Supply Voltage:</span>
                <span className="font-bold text-slate-800">12.0 V (LOCKED)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between">
                <span className="text-slate-500">Circuit Current:</span>
                <span className="font-bold text-slate-800">0.50 A (LOCKED)</span>
              </div>
              <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex justify-between">
                <span className="text-slate-500">Load Power:</span>
                <span className="font-bold text-slate-800">6.0 W (LOCKED)</span>
              </div>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 mt-3 pt-2 border-t border-slate-100 font-mono">
            Recovery Threshold: &gt;{demoState.recovery_threshold} kPa
          </div>
        </div>
      </div>

      {/* Manual Slider & Event Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual Pressure Slider */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
          <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider mb-2">
            Manual Pressure Override Slider
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Simulate instantaneous high-altitude pressure drops by adjusting the slider below:
          </p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="35"
              max="105"
              step="0.5"
              value={demoState.pressure_kpa}
              onChange={(e) => handleAction('set_manual_value', parseFloat(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <span className="text-lg font-mono font-bold text-sky-700 w-24 text-right">
              {demoState.pressure_kpa.toFixed(1)} kPa
            </span>
          </div>
        </div>

        {/* Timeline */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
          <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider mb-3">
            Pressure Anomaly Event Log
          </h3>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
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
              <div className="text-xs font-sans text-slate-400">No events logged.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
