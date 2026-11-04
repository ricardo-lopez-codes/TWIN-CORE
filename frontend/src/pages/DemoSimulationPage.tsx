import React, { useState } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Flame,
  Zap,
  Gauge,
  MapPin,
  Clock,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  ArrowRight
} from 'lucide-react';
import {
  startUnifiedDemo,
  stopUnifiedDemo,
  resetUnifiedDemo,
  setMode
} from '../services/api';
import { SensorReading, DataMode, UnifiedDemoState, ThresholdSettings } from '../types';
import { GpsMap } from '../components/GpsMap';

interface DemoSimulationPageProps {
  reading: SensorReading;
  mode: DataMode;
  thresholds: ThresholdSettings;
  demoState?: UnifiedDemoState;
  onModeChanged?: (mode: DataMode) => void;
}

export const DemoSimulationPage: React.FC<DemoSimulationPageProps> = ({
  reading,
  mode,
  thresholds,
  demoState,
  onModeChanged
}) => {
  const [speed, setSpeed] = useState<number>(demoState?.speed || 1.0);
  const [manualTemp, setManualTemp] = useState<number>(reading.temperature_c || 25.0);
  const [manualVolt, setManualVolt] = useState<number>(reading.voltage_v || 12.0);
  const [manualCurr, setManualCurr] = useState<number>(reading.current_a || 0.5);
  const [isApplying, setIsApplying] = useState<boolean>(false);

  const isDemoActive = mode === 'SIMULATION';
  const isRunning = Boolean(demoState?.running);

  const handleStart = async () => {
    setIsApplying(true);
    try {
      if (mode !== 'SIMULATION' && onModeChanged) {
        await setMode('SIMULATION');
        onModeChanged('SIMULATION');
      }
      await startUnifiedDemo({ speed });
    } catch (e) {
      console.error('Failed to start demo:', e);
    } finally {
      setIsApplying(false);
    }
  };

  const handlePause = async () => {
    setIsApplying(true);
    try {
      await stopUnifiedDemo();
    } catch (e) {
      console.error('Failed to pause demo:', e);
    } finally {
      setIsApplying(false);
    }
  };

  const handleReset = async () => {
    setIsApplying(true);
    try {
      await resetUnifiedDemo();
      setManualTemp(24.8);
      setManualVolt(12.0);
      setManualCurr(0.5);
    } catch (e) {
      console.error('Failed to reset demo:', e);
    } finally {
      setIsApplying(false);
    }
  };

  const handleSpeedChange = async (newSpeed: number) => {
    setSpeed(newSpeed);
    if (isRunning) {
      try {
        await startUnifiedDemo({ speed: newSpeed });
      } catch (e) {
        console.error('Failed to change speed:', e);
      }
    }
  };

  const handleApplyOverrides = async () => {
    setIsApplying(true);
    try {
      await startUnifiedDemo({
        speed,
        temperature: manualTemp,
        voltage: manualVolt,
        current: manualCurr
      });
    } catch (e) {
      console.error('Failed to apply overrides:', e);
    } finally {
      setIsApplying(false);
    }
  };

  const calculatedPower = Number((manualVolt * manualCurr).toFixed(2));

  return (
    <div className="space-y-6">
      {/* Prominent Demo Mode Notification & Mode Selector */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 rounded-2xl p-5 text-white shadow-elevated flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-400/30 text-[10px] font-mono font-bold">
                DEMO SIMULATION SUITE
              </span>
              <span className="text-xs text-white/70 font-mono">
                Isolated Sandbox Mode
              </span>
            </div>
            <h2 className="text-xl font-sans font-bold tracking-tight text-white mt-1">
              Fully Functional Hardware-Free Simulation
            </h2>
            <p className="text-xs text-blue-100 max-w-xl mt-0.5 font-medium">
              Generates deterministic physics-based readings for Temperature, Voltage, Current, derived Power, and GPS trajectory without needing Unit 1 or Unit 2 connected.
            </p>
          </div>
        </div>

        {/* Global Mode Switcher Pill */}
        <div className="bg-white/10 backdrop-blur-md p-1.5 rounded-2xl border border-white/20 flex items-center gap-1.5 self-start md:self-auto">
          <button
            onClick={async () => {
              await setMode('HARDWARE_CONNECTED');
              if (onModeChanged) onModeChanged('HARDWARE_CONNECTED');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
              mode === 'HARDWARE_CONNECTED'
                ? 'bg-emerald-500 text-white shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            LIVE HARDWARE MODE
          </button>
          <button
            onClick={async () => {
              await setMode('SIMULATION');
              if (onModeChanged) onModeChanged('SIMULATION');
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition ${
              mode === 'SIMULATION'
                ? 'bg-white text-blue-800 shadow-sm'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            DEMO MODE
          </button>
        </div>
      </div>

      {/* Main Simulation Control Deck */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 mb-5 gap-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
              Simulation Playback & Rate Controls
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500">SPEED:</span>
            {[0.5, 1.0, 2.0, 5.0].map((s) => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border transition ${
                  speed === s
                    ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={isApplying}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              Start Simulation
            </button>
          ) : (
            <button
              onClick={handlePause}
              disabled={isApplying}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs shadow-md shadow-amber-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              <Pause className="w-4 h-4 fill-white" />
              Pause Simulation
            </button>
          )}

          <button
            onClick={handleReset}
            disabled={isApplying}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-mono font-bold text-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Simulation
          </button>

          <div className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono text-slate-600">
            <span className={`w-2.5 h-2.5 rounded-full ${isRunning ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <span>PHASE: <strong className="text-slate-800">{demoState?.phase ?? (isRunning ? 'ACTIVE' : 'IDLE')}</strong></span>
          </div>
        </div>
      </div>

      {/* Real-Time Parameter Sliders & Threshold Verification */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Temperature Simulation Slider */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-500" />
                <h4 className="text-xs font-mono font-bold text-slate-800 uppercase">
                  Temperature Cycle (°C)
                </h4>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                manualTemp >= thresholds.temp_crit
                  ? 'bg-rose-50 border border-rose-200 text-rose-700'
                  : manualTemp >= thresholds.temp_warn
                  ? 'bg-amber-50 border border-amber-200 text-amber-700'
                  : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
              }`}>
                {manualTemp >= thresholds.temp_crit ? 'CRITICAL' : manualTemp >= thresholds.temp_warn ? 'WARNING' : 'NORMAL'}
              </span>
            </div>

            <div className="text-2xl font-black font-mono text-slate-900 mb-2">
              {manualTemp.toFixed(1)} <span className="text-base text-slate-500 font-normal">°C</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
              During automated simulation, temperature starts at 24.8°C, gradually ramps past warning ({thresholds.temp_warn}°C), triggers fan cooling, and recovers.
            </p>

            <input
              type="range"
              min="10.0"
              max="85.0"
              step="0.5"
              value={manualTemp}
              onChange={(e) => setManualTemp(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>10.0°C</span>
              <span className="text-amber-600 font-bold">Warn: {thresholds.temp_warn}°C</span>
              <span className="text-rose-600 font-bold">Crit: {thresholds.temp_crit}°C</span>
              <span>85.0°C</span>
            </div>
          </div>

          <button
            onClick={handleApplyOverrides}
            className="mt-4 w-full py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-mono font-bold transition"
          >
            Inject Temperature ({manualTemp.toFixed(1)}°C)
          </button>
        </div>

        {/* 2. Voltage Simulation Slider */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-mono font-bold text-slate-800 uppercase">
                  Input Voltage Rail (V)
                </h4>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                DC BUS
              </span>
            </div>

            <div className="text-2xl font-black font-mono text-slate-900 mb-2">
              {manualVolt.toFixed(2)} <span className="text-base text-slate-500 font-normal">V</span>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
              Simulates DC battery power rail fluctuations under varying atmospheric temperature and internal resistance in Ladakh.
            </p>

            <input
              type="range"
              min="9.0"
              max="16.0"
              step="0.1"
              value={manualVolt}
              onChange={(e) => setManualVolt(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>9.0 V</span>
              <span>12.0 V (Nominal)</span>
              <span>16.0 V</span>
            </div>
          </div>

          <button
            onClick={handleApplyOverrides}
            className="mt-4 w-full py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-mono font-bold transition"
          >
            Inject Voltage ({manualVolt.toFixed(2)} V)
          </button>
        </div>

        {/* 3. Current & Calculated Power */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-mono font-bold text-slate-800 uppercase">
                  Current & Derived Power
                </h4>
              </div>
              <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                P = V × I
              </span>
            </div>

            <div className="flex items-baseline gap-4 mb-2">
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">CURRENT</div>
                <div className="text-2xl font-black font-mono text-slate-900">
                  {manualCurr.toFixed(3)} <span className="text-sm text-slate-500 font-normal">A</span>
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 uppercase">POWER</div>
                <div className="text-2xl font-black font-mono text-amber-600">
                  {calculatedPower.toFixed(2)} <span className="text-sm text-slate-500 font-normal">W</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
              Electrical power recalculates automatically whenever voltage or current changes. In live mode, power is strictly computed without fabrication.
            </p>

            <input
              type="range"
              min="0.10"
              max="2.50"
              step="0.05"
              value={manualCurr}
              onChange={(e) => setManualCurr(Number(e.target.value))}
              className="w-full accent-indigo-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1">
              <span>0.10 A</span>
              <span>1.0 A</span>
              <span>2.50 A</span>
            </div>
          </div>

          <button
            onClick={handleApplyOverrides}
            className="mt-4 w-full py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-mono font-bold transition"
          >
            Inject Current ({manualCurr.toFixed(2)} A)
          </button>
        </div>
      </div>

      {/* GPS Simulation Map View */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
              Simulated GPS Equipment Route (Ladakh Perimeter)
            </h3>
          </div>
          <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-200">
            DEMO DATA — SIMULATED GPS MOVEMENT
          </span>
        </div>

        <GpsMap
          latitude={reading.latitude}
          longitude={reading.longitude}
          gpsFix={reading.gps_fix}
          isSimulated={true}
          lastUpdate={reading.timestamp}
          height="380px"
          showRecenterButton={true}
        />
      </div>

      {/* Simulation Timeline Feed */}
      {demoState?.timeline && demoState.timeline.length > 0 && (
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
            <Clock className="w-4 h-4 text-slate-500" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
              Demo Sequence Event Log
            </h3>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto font-mono text-xs">
            {demoState.timeline.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50 border border-slate-100">
                <span className="text-slate-400 text-[10px] shrink-0">
                  {new Date(entry.timestamp).toLocaleTimeString()}
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  entry.severity === 'CRITICAL'
                    ? 'bg-rose-100 text-rose-800'
                    : entry.severity === 'WARNING'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {entry.severity}
                </span>
                <span className="text-slate-700 truncate">{entry.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
