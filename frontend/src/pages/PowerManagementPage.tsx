import React from 'react';
import {
  Zap,
  Sliders,
  ShieldAlert,
  Fan,
  Cpu,
  Lock,
  BatteryCharging,
  Layers,
  Info
} from 'lucide-react';

export const PowerManagementPage: React.FC = () => {
  return (
    <div className="space-y-6 select-none">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-sans font-bold text-slate-900 tracking-tight">
                POWER MANAGEMENT — COMING SOON
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-300 text-slate-700 text-[10px] font-mono font-bold flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-500" />
                DISABLED / ARCHITECTURAL ISOLATION
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Future closed-loop autonomous power distribution, thermal mitigation, and load shed actuators.
            </p>
          </div>
        </div>

        {/* Disabled Indicator */}
        <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-mono text-slate-500 flex items-center gap-2 shrink-0">
          <ShieldAlert className="w-4 h-4 text-slate-400" />
          <span>FIRMWARE COMMAND TRANSMISSION LOCKED</span>
        </div>
      </div>

      {/* Prominent Architectural Isolation Notice */}
      <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-4 text-xs font-sans text-amber-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <strong className="font-bold">Architectural Safety Separation:</strong>
          <p className="text-amber-800 leading-relaxed">
            In this phase of TWIN-CORE development, active hardware actuators and remote voltage/current controls
            are strictly disabled. Monitoring systems are decoupled from control outputs to guarantee failsafe telemetry
            integrity during extreme Ladakh field trials. Controls below represent future phase interfaces and do not
            transmit instructions to the hardware.
          </p>
        </div>
      </div>

      {/* Grid of Visibly Disabled Placeholder Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 1. Output Voltage Adjustment */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card opacity-60 cursor-not-allowed relative overflow-hidden">
          <div className="absolute top-3 right-3 text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <BatteryCharging className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-800 uppercase">
                Output Voltage Adjustment
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Regulated DC Rail Trim</span>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">Target Voltage:</span>
              <span className="font-bold text-slate-700">12.00 V (Fixed)</span>
            </div>
            <input
              type="range"
              min="9.0"
              max="15.0"
              step="0.1"
              value="12.0"
              disabled
              className="w-full cursor-not-allowed accent-slate-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>9.0 V</span>
              <span>12.0 V (Default)</span>
              <span>15.0 V</span>
            </div>
          </div>
        </div>

        {/* 2. Current Limiting Setpoint */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card opacity-60 cursor-not-allowed relative overflow-hidden">
          <div className="absolute top-3 right-3 text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-800 uppercase">
                Current Limiting Setpoint
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Active OCP Threshold</span>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">Max Rail Current:</span>
              <span className="font-bold text-slate-700">2.00 A (Preset)</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="3.0"
              step="0.1"
              value="2.0"
              disabled
              className="w-full cursor-not-allowed accent-slate-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0.5 A</span>
              <span>2.0 A (Rated)</span>
              <span>3.0 A</span>
            </div>
          </div>
        </div>

        {/* 3. Load Management */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card opacity-60 cursor-not-allowed relative overflow-hidden">
          <div className="absolute top-3 right-3 text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-800 uppercase">
                Load Management
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Subsystem Priority Bus</span>
            </div>
          </div>

          <div className="space-y-2 mt-4 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Bus 1: Critical Avionics</span>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">LOCKED ON</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Bus 2: Payload Sensors</span>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">LOCKED ON</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100">
              <span className="text-slate-600">Bus 3: Auxiliary Heaters</span>
              <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-bold">STANDBY</span>
            </div>
          </div>
        </div>

        {/* 4. MOSFET Switching */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card opacity-60 cursor-not-allowed relative overflow-hidden">
          <div className="absolute top-3 right-3 text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-800 uppercase">
                MOSFET Gate Switching
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">High-Side Solid State Switch</span>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-700 font-mono">N-Channel Gate Driver</div>
                <div className="text-[10px] text-slate-400 font-mono">State: ACTIVE CONDUCTING</div>
              </div>
              <button
                disabled
                className="px-3 py-1.5 rounded-lg bg-slate-200 text-slate-500 font-mono text-xs cursor-not-allowed font-semibold"
              >
                Disabled
              </button>
            </div>
          </div>
        </div>

        {/* 5. Cooling Fan PWM Control */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card opacity-60 cursor-not-allowed relative overflow-hidden">
          <div className="absolute top-3 right-3 text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <Fan className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-800 uppercase">
                Cooling Fan PWM Control
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Convective Heat Sinking</span>
            </div>
          </div>

          <div className="space-y-3 mt-4">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-500">Duty Cycle:</span>
              <span className="font-bold text-slate-700">AUTO THERMAL (Disabled)</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value="0"
              disabled
              className="w-full cursor-not-allowed accent-slate-400"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400">
              <span>0% (OFF)</span>
              <span>50%</span>
              <span>100% (MAX)</span>
            </div>
          </div>
        </div>

        {/* 6. Hardware Actuator Safety Interlock */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-card opacity-60 cursor-not-allowed relative overflow-hidden">
          <div className="absolute top-3 right-3 text-slate-400">
            <Lock className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2.5 mb-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-mono font-bold text-slate-800 uppercase">
                Safety Interlock Bypass
              </h4>
              <span className="text-[10px] text-slate-400 font-mono">Emergency Override</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs font-mono text-slate-500 mt-4 leading-relaxed">
            Hardware interlock engaged. Actuation channels locked pending hardware pin assignments and DRDO/field safety review.
          </div>
        </div>
      </div>
    </div>
  );
};
