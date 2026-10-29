import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Play,
  RotateCcw,
  Download,
  ShieldCheck,
  HelpCircle,
  Cpu,
  Battery,
  Wind,
  Layers,
  Thermometer,
  LineChart
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { TwinResponseChart } from '../charts/TwinResponseChart';
import { TwinEnclosure3D } from '../components/3d/TwinEnclosure3D';
import { TerrainAltitude3D } from '../components/3d/TerrainAltitude3D';
import { DigitalTwinInput, DigitalTwinResult } from '../types';
import { runDigitalTwin, EXPORT_URLS } from '../services/api';

const DEFAULT_INPUTS: DigitalTwinInput = {
  ambient_temperature_c: -15.0, // Typical winter Ladakh field deployment
  atmospheric_pressure_kpa: 65.0, // ~3,500m ASL
  electronic_load_pct: 65.0,
  duration_minutes: 60,
  relative_humidity_pct: 35.0,
  battery_age_cycles: 120,
  cooling_mode: 'active_fan',
  cold_start: true
};

export const DigitalTwinPage: React.FC = () => {
  const [inputs, setInputs] = useState<DigitalTwinInput>(DEFAULT_INPUTS);
  const [result, setResult] = useState<DigitalTwinResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewTab, setViewTab] = useState<'both' | '3d' | 'charts'>('both');

  useEffect(() => {
    handleRunSimulation();
  }, []);

  const handleRunSimulation = async () => {
    setLoading(true);
    try {
      const res = await runDigitalTwin(inputs);
      setResult(res);
    } catch (err) {
      console.error('Failed to run digital twin simulation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setInputs(DEFAULT_INPUTS);
    handleRunSimulation();
  };

  const getRiskColor = (risk: string) => {
    switch (risk?.toUpperCase()) {
      case 'CRITICAL':
        return 'text-rose-700 border-rose-300 bg-rose-50/70';
      case 'HIGH':
        return 'text-orange-700 border-orange-300 bg-orange-50/70';
      case 'MODERATE':
        return 'text-amber-800 border-amber-300 bg-amber-50/70';
      case 'LOW':
      default:
        return 'text-emerald-700 border-emerald-300 bg-emerald-50/70';
    }
  };

  return (
    <div className="space-y-6">
      {/* Persistent Educational Disclaimer Required by Spec */}
      <div className="bg-white border-l-4 border-l-blue-600 border border-slate-200/90 rounded-r-xl p-5 shadow-card">
        <div className="flex items-start gap-3.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <h3 className="font-sans font-bold text-slate-900 uppercase tracking-wider">
              Educational Digital Twin Simulation Engine
            </h3>
            <p className="text-slate-700 italic font-mono text-[11px] leading-relaxed">
              “This is an educational, first-pass simulation using illustrative equations. It is not a validated digital twin of a specific DRDO device and must not be used to make safety-critical decisions.”
            </p>
            <p className="text-slate-500 text-[11px] font-medium">
              The combined stress score is a relative engineering indicator for architectural analysis, not a certified probability of failure or remaining useful life.
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs Form & Results Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Simulation Inputs (5 cols) */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-xl p-5 shadow-card space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Boxes className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-sans font-bold text-slate-900 uppercase tracking-wider">
                Digital Twin Parameters
              </h3>
            </div>
            <button
              onClick={handleReset}
              className="text-xs font-mono text-slate-500 hover:text-slate-900 flex items-center gap-1 font-semibold transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>

          {/* 1. Ambient Temperature */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 font-medium">Ambient Temperature:</span>
              <span className="font-bold text-blue-700">{inputs.ambient_temperature_c.toFixed(1)}°C</span>
            </div>
            <input
              type="range"
              min="-40"
              max="50"
              step="1"
              value={inputs.ambient_temperature_c}
              onChange={(e) => setInputs({ ...inputs, ambient_temperature_c: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 font-medium">
              <span>-40°C (Siachen Winter)</span>
              <span>0°C</span>
              <span>+50°C (Summer Desert)</span>
            </div>
          </div>

          {/* 2. Atmospheric Pressure */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 font-medium">Atmospheric Pressure:</span>
              <span className="font-bold text-sky-700">{inputs.atmospheric_pressure_kpa.toFixed(1)} kPa</span>
            </div>
            <input
              type="range"
              min="35"
              max="105"
              step="1"
              value={inputs.atmospheric_pressure_kpa}
              onChange={(e) => setInputs({ ...inputs, atmospheric_pressure_kpa: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 font-medium">
              <span>35 kPa (Khardung La)</span>
              <span>70 kPa (Leh ~3500m)</span>
              <span>101.3 kPa (Sea Level)</span>
            </div>
          </div>

          {/* 3. Electronic Load Percentage */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 font-medium">Electronic Circuit Load:</span>
              <span className="font-bold text-amber-600">{inputs.electronic_load_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={inputs.electronic_load_pct}
              onChange={(e) => setInputs({ ...inputs, electronic_load_pct: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-600"
            />
            <div className="flex justify-between text-[10px] font-mono text-slate-400 font-medium">
              <span>0% (Idle Sleep)</span>
              <span>50% (Nominal)</span>
              <span>100% (Full Compute/TX)</span>
            </div>
          </div>

          {/* 4. Duration */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 font-medium">Transient Duration:</span>
              <span className="font-bold text-slate-800">{inputs.duration_minutes} min</span>
            </div>
            <input
              type="range"
              min="10"
              max="120"
              step="5"
              value={inputs.duration_minutes}
              onChange={(e) => setInputs({ ...inputs, duration_minutes: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* 5. Humidity */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 font-medium">Relative Humidity:</span>
              <span className="font-bold text-slate-800">{inputs.relative_humidity_pct}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={inputs.relative_humidity_pct}
              onChange={(e) => setInputs({ ...inputs, relative_humidity_pct: parseFloat(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>

          {/* 6. Battery Age Cycles */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-600 font-medium">Battery Age (Equiv. Cycles):</span>
              <span className="font-bold text-emerald-600">{inputs.battery_age_cycles} cycles</span>
            </div>
            <input
              type="range"
              min="0"
              max="1000"
              step="25"
              value={inputs.battery_age_cycles}
              onChange={(e) => setInputs({ ...inputs, battery_age_cycles: parseInt(e.target.value) })}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
            />
          </div>

          {/* 7. Cooling Mode Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-sans font-semibold text-slate-700 block">Cooling Architecture:</label>
            <select
              value={inputs.cooling_mode}
              onChange={(e) => setInputs({ ...inputs, cooling_mode: e.target.value })}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="passive">Natural Convection (Passive Heatsink)</option>
              <option value="active_fan">Standard Active Fan (Single 40mm)</option>
              <option value="forced_convection">Forced Dual-Fan Convection (High Altitude Tuned)</option>
            </select>
          </div>

          {/* 8. Cold Start Checkbox */}
          <div className="pt-2">
            <label className="flex items-center gap-3 cursor-pointer bg-slate-50 p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition">
              <input
                type="checkbox"
                checked={inputs.cold_start}
                onChange={(e) => setInputs({ ...inputs, cold_start: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 accent-blue-600"
              />
              <div className="text-xs font-sans">
                <span className="text-slate-900 font-bold block">Cold-Start Soak Protocol</span>
                <span className="text-[11px] text-slate-500 font-medium">
                  Unit energized directly from cold ambient without preheating
                </span>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="pt-3 flex items-center gap-3">
            <button
              onClick={handleRunSimulation}
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-sans text-xs font-bold transition shadow-sm"
            >
              <Play className="w-4 h-4 fill-current" />
              {loading ? 'SIMULATING...' : 'RUN SIMULATION'}
            </button>
            <a
              href={EXPORT_URLS.simulationCsv}
              download="twincore_digital_twin_simulation.csv"
              className="px-3.5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 font-sans text-xs font-semibold flex items-center gap-1.5 transition"
              title="Download CSV"
            >
              <Download className="w-4 h-4" />
              CSV
            </a>
          </div>
        </div>

        {/* Right Column: Output Metrics & Risk Classification (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Classification Banner */}
          <div className={`p-5 rounded-xl border shadow-card flex items-center justify-between ${getRiskColor(result?.risk_classification || 'LOW')}`}>
            <div className="flex items-center gap-3.5">
              <ShieldCheck className="w-7 h-7 shrink-0" />
              <div>
                <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500">
                  EQUIPMENT RISK CLASSIFICATION
                </div>
                <div className="text-2xl font-sans font-extrabold tracking-tight">
                  {result?.risk_classification || 'COMPUTING...'}
                </div>
              </div>
            </div>
            <div className="text-right font-mono text-xs">
              <div className="text-slate-500 font-medium">COMBINED STRESS INDEX</div>
              <div className="text-2xl font-bold">{result?.combined_stress_index ?? '--'} / 100</div>
            </div>
          </div>

          {/* 6 Metric Badges Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono text-xs">
            {/* 1. Estimated PCB Temp */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-card">
              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 font-sans">
                <Thermometer className="w-3.5 h-3.5 text-orange-500" />
                EST. PCB JUNCTION TEMP
              </div>
              <div className="text-2xl font-bold text-orange-600 mt-1">
                {result ? `${result.estimated_pcb_temperature_c}°C` : '--'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                Rise: +{result?.steady_state_temp_rise_c ?? '--'}°C
              </div>
            </div>

            {/* 2. Relative Air Density */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-card">
              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 font-sans">
                <Wind className="w-3.5 h-3.5 text-sky-600" />
                AIR DENSITY PROXY (ρ)
              </div>
              <div className="text-2xl font-bold text-sky-600 mt-1">
                {result ? `${(result.relative_air_density_proxy * 100).toFixed(1)}%` : '--'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                Relative to sea level ISA
              </div>
            </div>

            {/* 3. Cooling Efficiency */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-card">
              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 font-sans">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                COOLING FACTOR (E_cool)
              </div>
              <div className="text-2xl font-bold text-blue-700 mt-1">
                {result?.cooling_efficiency_factor ?? '--'}x
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                Air-thinness derated
              </div>
            </div>

            {/* 4. Usable Battery Capacity */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-card">
              <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1 font-sans">
                <Battery className="w-3.5 h-3.5 text-emerald-600" />
                USABLE BATTERY CAP
              </div>
              <div className="text-2xl font-bold text-emerald-600 mt-1">
                {result ? `${result.estimated_battery_capacity_pct}%` : '--'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                Electrolyte cold mobility
              </div>
            </div>

            {/* 5. Battery Voltage Drop */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-card">
              <div className="text-[11px] text-slate-500 font-medium font-sans">BATTERY VOLTAGE DROP</div>
              <div className="text-2xl font-bold text-amber-600 mt-1">
                {result ? `${result.estimated_battery_voltage_drop_v} V` : '--'}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                Internal ESR impedance
              </div>
            </div>

            {/* 6. Cold Start Stress */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3.5 shadow-card">
              <div className="text-[11px] text-slate-500 font-medium font-sans">COLD-START SHOCK</div>
              <div className="text-2xl font-bold text-purple-600 mt-1">
                {result?.cold_start_stress ?? '--'} <span className="text-xs font-normal text-slate-400">/ 100</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5 font-sans">
                {inputs.cold_start ? 'Cold-soak penalty active' : 'Preheated'}
              </div>
            </div>
          </div>

          {/* Engineering Recommendations Box */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
            <h4 className="text-xs font-sans font-bold text-slate-900 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-600" />
              Dynamic Engineering Recommendations (Ladakh Envelope)
            </h4>
            <div className="space-y-2">
              {result?.recommendations && result.recommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2.5 text-xs font-sans bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px] shrink-0 font-mono">
                    {i + 1}
                  </span>
                  <span className="text-slate-700 leading-relaxed font-medium">{rec}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher: 3D Twin Mesh vs Transient Thermal Charts */}
      <div className="flex items-center justify-between bg-white border border-slate-200/90 rounded-xl p-3 shadow-card">
        <div className="flex items-center gap-2">
          <Boxes className="w-4 h-4 text-blue-600" />
          <span className="text-xs font-sans font-bold text-slate-900 uppercase tracking-wider">
            Visualization Modules
          </span>
        </div>
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-mono">
          <button
            onClick={() => setViewTab('both')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewTab === 'both' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Dual View (3D & Curves)
          </button>
          <button
            onClick={() => setViewTab('3d')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewTab === '3d' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            3D Digital Twin Mesh
          </button>
          <button
            onClick={() => setViewTab('charts')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              viewTab === 'charts' ? 'bg-white text-blue-700 font-bold shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Transient Response Charts
          </button>
        </div>
      </div>

      {/* 3D Visualizer Grid */}
      {(viewTab === 'both' || viewTab === '3d') && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Boxes className="w-4 h-4 text-cyan-600" />
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
                  Predicted 3D Unit 1 State & Thermal IR Mode
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Predicted Junction: {result?.estimated_pcb_temperature_c.toFixed(1) ?? '--'}°C
              </span>
            </div>
            <TwinEnclosure3D
              temperature={result ? result.estimated_pcb_temperature_c : 25}
              pressure={inputs.atmospheric_pressure_kpa}
              fanState={inputs.cooling_mode.includes('fan')}
              status={
                result?.risk_classification === 'CRITICAL'
                  ? 'CRITICAL'
                  : result?.risk_classification === 'HIGH'
                  ? 'WARNING'
                  : 'NORMAL'
              }
              height="460px"
              showControls={true}
            />
          </div>

          <div className="lg:col-span-4 bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Wind className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
                  Atmospheric Altitude
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                P: {inputs.atmospheric_pressure_kpa} kPa
              </span>
            </div>
            <TerrainAltitude3D
              pressureKpa={inputs.atmospheric_pressure_kpa}
              temperatureC={inputs.ambient_temperature_c}
              height="460px"
            />
          </div>
        </div>
      )}

      {/* Chart: Transient Thermal Response */}
      {(viewTab === 'both' || viewTab === 'charts') && result && result.time_series && (
        <TwinResponseChart data={result.time_series} />
      )}

      {/* Results Sample Table */}
      {result && (
        <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-card">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-sans font-bold text-slate-900 uppercase tracking-wider">
              Simulation Time-Step Results Sample
            </h3>
            <span className="text-xs font-mono text-slate-500 font-medium">Sample interval: 5 min</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-sans font-bold">
                <tr>
                  <th className="py-2.5 px-4">Time (min)</th>
                  <th className="py-2.5 px-4">Ambient Temp (°C)</th>
                  <th className="py-2.5 px-4">Estimated PCB Temp (°C)</th>
                  <th className="py-2.5 px-4">Local Stress Index</th>
                  <th className="py-2.5 px-4 text-right">Convergence Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.time_series.filter((_, i) => i % 5 === 0 || i === result.time_series.length - 1).map((pt, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80">
                    <td className="py-2 px-4 font-bold text-slate-800">{pt.time_min} m</td>
                    <td className="py-2 px-4 text-sky-600 font-semibold">{pt.ambient_temperature_c.toFixed(1)} °C</td>
                    <td className="py-2 px-4 font-bold text-orange-600">{pt.pcb_temperature_c.toFixed(2)} °C</td>
                    <td className="py-2 px-4 text-slate-700 font-medium">{pt.stress_index.toFixed(1)}</td>
                    <td className="py-2 px-4 text-right text-slate-500 font-sans font-medium">
                      {pt.time_min > 35 ? 'Steady-State Reached' : 'Transient Thermal Rise'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
