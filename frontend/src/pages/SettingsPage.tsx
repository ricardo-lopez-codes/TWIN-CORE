import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Radio,
  Save,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  Globe
} from 'lucide-react';
import { ThresholdSettings, GatewayModeInfo, SerialPortInfo, DataMode } from '../types';
import { networkTimeService, NetworkTimeInfo } from '../services/networkTime';
import {
  fetchThresholds,
  updateThresholds,
  fetchMode,
  setMode,
  fetchSerialPorts
} from '../services/api';

interface SettingsPageProps {
  thresholds: ThresholdSettings;
  onThresholdsUpdated: (newThresholds: ThresholdSettings) => void;
  activeMode: DataMode;
  onModeChanged: (mode: DataMode) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  thresholds,
  onThresholdsUpdated,
  activeMode,
  onModeChanged
}) => {
  const [formData, setFormData] = useState<ThresholdSettings>(thresholds);
  const [modeInfo, setModeInfo] = useState<GatewayModeInfo | null>(null);
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('AUTO');
  const [selectedBaud, setSelectedBaud] = useState<number>(115200);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [modeStatus, setModeStatus] = useState<string | null>(null);

  useEffect(() => {
    setFormData(thresholds);
  }, [thresholds]);

  useEffect(() => {
    loadHardwareConfig();
  }, []);

  const loadHardwareConfig = async () => {
    try {
      const m = await fetchMode();
      setModeInfo(m);
      if (m.serial_port) setSelectedPort(m.serial_port);
      if (m.baud_rate) setSelectedBaud(m.baud_rate);

      const p = await fetchSerialPorts();
      setPorts(p);
    } catch (err) {
      console.error('Error fetching hardware config:', err);
    }
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus(null);
    try {
      const updated = await updateThresholds(formData);
      onThresholdsUpdated(updated);
      setSaveStatus('Prototype thresholds successfully updated and synced to threshold engine.');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      setSaveStatus(`Failed to update thresholds: ${err.message}`);
    }
  };

  const handleSwitchMode = async (newMode: DataMode) => {
    setModeStatus('Switching mode...');
    try {
      const res = await setMode(newMode, selectedPort, selectedBaud);
      onModeChanged(newMode);
      setModeStatus(res.message);
      await loadHardwareConfig();
      setTimeout(() => setModeStatus(null), 4000);
    } catch (err: any) {
      setModeStatus(`Mode switch error: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice Callout */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card flex items-start gap-3.5">
        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
          <HelpCircle className="w-5 h-5" />
        </div>
        <div className="text-xs space-y-1">
          <h3 className="font-sans font-bold text-slate-900 uppercase tracking-wider">
            Prototype Threshold Configuration Notice
          </h3>
          <p className="text-slate-600 leading-relaxed font-sans text-xs">
            These limits configure the experimental digital twin threshold evaluation engine for test circuits.
            They are presented as <strong>prototype engineering settings</strong> for testing high-altitude failure modes, not certified industrial specifications.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Form: Threshold Settings (7 cols) */}
        <form onSubmit={handleSaveThresholds} className="lg:col-span-7 bg-white border border-slate-200/90 rounded-xl p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Safety Thresholds & Hysteresis Limits</span>
            </h3>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-sans font-bold text-xs shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" />
              Save Limits
            </button>
          </div>

          {saveStatus && (
            <div className={`p-3.5 rounded-xl text-xs font-sans flex items-center gap-2.5 ${
              saveStatus.includes('Failed')
                ? 'bg-rose-50 border border-rose-200 text-rose-800'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            }`}>
              {saveStatus.includes('Failed') ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
              <span className="font-semibold">{saveStatus}</span>
            </div>
          )}

          {/* Temperature section */}
          <div className="space-y-3 pt-1">
            <span className="text-xs font-sans font-bold text-orange-600 block border-b border-slate-100 pb-1 uppercase tracking-wider">
              Temperature Thresholds (°C)
            </span>
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Warning (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.temp_warn}
                  onChange={(e) => setFormData({ ...formData, temp_warn: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Critical (°C)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.temp_crit}
                  onChange={(e) => setFormData({ ...formData, temp_crit: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Hysteresis (°C)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.temp_hysteresis}
                  onChange={(e) => setFormData({ ...formData, temp_hysteresis: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Pressure section */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-sans font-bold text-sky-600 block border-b border-slate-100 pb-1 uppercase tracking-wider">
              Atmospheric Depressurization Thresholds (kPa abs)
            </span>
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Warning (≤ kPa)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.pressure_warn}
                  onChange={(e) => setFormData({ ...formData, pressure_warn: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Critical (≤ kPa)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.pressure_crit}
                  onChange={(e) => setFormData({ ...formData, pressure_crit: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Hysteresis (kPa)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.pressure_hysteresis}
                  onChange={(e) => setFormData({ ...formData, pressure_hysteresis: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Power section */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-sans font-bold text-amber-600 block border-b border-slate-100 pb-1 uppercase tracking-wider">
              Power Consumption Thresholds (W = V × I)
            </span>
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Warning (W)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.power_warn}
                  onChange={(e) => setFormData({ ...formData, power_warn: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Critical (W)</label>
                <input
                  type="number"
                  step="0.5"
                  value={formData.power_crit}
                  onChange={(e) => setFormData({ ...formData, power_crit: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Hysteresis (W)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.power_hysteresis}
                  onChange={(e) => setFormData({ ...formData, power_hysteresis: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
            </div>
          </div>

          {/* Voltage & Current */}
          <div className="space-y-3 pt-2">
            <span className="text-xs font-sans font-bold text-emerald-600 block border-b border-slate-100 pb-1 uppercase tracking-wider">
              Voltage & Current Safe Operating Range
            </span>
            <div className="grid grid-cols-3 gap-3 font-mono">
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Min Voltage (V)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.voltage_min}
                  onChange={(e) => setFormData({ ...formData, voltage_min: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Max Voltage (V)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.voltage_max}
                  onChange={(e) => setFormData({ ...formData, voltage_max: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
              <div>
                <label className="text-[11px] font-sans font-semibold text-slate-500 block mb-1">Max Current (A)</label>
                <input
                  type="number"
                  step="0.1"
                  value={formData.current_max}
                  onChange={(e) => setFormData({ ...formData, current_max: parseFloat(e.target.value) })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-bold"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Right Column: Hardware Gateway Integration & Mode (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600" />
                <span>Unit 2 Gateway Serial Bridge</span>
              </h3>
              <button
                onClick={loadHardwareConfig}
                className="text-[11px] font-sans font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 transition"
                title="Refresh COM Ports"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                Rescan
              </button>
            </div>

            {modeStatus && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs font-sans text-blue-800 font-medium">
                {modeStatus}
              </div>
            )}

            {/* Mode selection buttons */}
            <div className="space-y-2">
              <label className="text-[11px] font-sans font-bold text-slate-600 uppercase tracking-wider block">Acquisition Mode:</label>
              <div className="grid grid-cols-2 gap-2 font-sans text-xs">
                <button
                  type="button"
                  onClick={() => handleSwitchMode('SIMULATION')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    activeMode === 'SIMULATION'
                      ? 'bg-blue-600 border-blue-600 text-white font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 font-semibold'
                  }`}
                >
                  SIMULATION
                </button>
                <button
                  type="button"
                  onClick={() => handleSwitchMode('HARDWARE_CONNECTED')}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    activeMode === 'HARDWARE_CONNECTED'
                      ? 'bg-emerald-600 border-emerald-600 text-white font-bold shadow-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:border-slate-300 font-semibold'
                  }`}
                >
                  HARDWARE SERIAL
                </button>
              </div>
            </div>

            {/* COM Port selector */}
            <div className="space-y-1.5 pt-2 font-sans">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">USB Serial COM Port:</label>
              <select
                value={selectedPort}
                onChange={(e) => setSelectedPort(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-semibold"
              >
                <option value="AUTO">AUTO (Auto-detect ESP32 Gateway)</option>
                {ports.map((p) => (
                  <option key={p.device} value={p.device}>
                    {p.device} — {p.description} {p.is_esp32 ? '(ESP32)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Baud rate */}
            <div className="space-y-1.5 font-sans">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">Baud Rate:</label>
              <select
                value={selectedBaud}
                onChange={(e) => setSelectedBaud(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 font-semibold"
              >
                <option value={115200}>115200 (Standard TWIN-CORE)</option>
                <option value={9600}>9600</option>
                <option value={57600}>57600</option>
                <option value={230400}>230400</option>
              </select>
            </div>

            {/* Current hardware bridge diagnostics */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-sans space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium">Active Port:</span>
                <span className="text-slate-900 font-bold font-mono">{modeInfo?.serial_port || selectedPort}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Port Connection:</span>
                <span className={`font-bold ${modeInfo?.is_connected ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {modeInfo?.is_connected ? 'OPEN / CONNECTED' : 'CLOSED'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Last Hardware Packet:</span>
                <span className="text-slate-800 font-semibold font-mono">
                  {modeInfo?.last_packet_time
                    ? new Date(modeInfo.last_packet_time * 1000).toLocaleTimeString()
                    : 'None in current session'}
                </span>
              </div>
            </div>
          </div>

          {/* Internet Time Synchronization Card */}
          <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-xs font-sans font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Globe className="w-4 h-4 text-emerald-600" />
                <span>Internet Time (NTP) Synchronization</span>
              </h3>
              <button
                type="button"
                onClick={() => networkTimeService.syncWithInternet()}
                className="text-[11px] font-sans font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 transition"
                title="Force Internet Time Resync"
              >
                <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                Resync
              </button>
            </div>

            <p className="text-xs text-slate-500 font-sans leading-relaxed">
              When hosted publicly, the dashboard automatically syncs with global internet time pools (NTP & WorldTimeAPI) to align telemetry with Ladakh field time without local hardware clock drift.
            </p>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs font-sans space-y-2 text-slate-600">
              <div className="flex justify-between">
                <span className="font-medium">Sync Source:</span>
                <span className="text-slate-900 font-bold font-mono">{networkTimeService.getCurrentInfo().sourceName}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Station Timezone:</span>
                <span className="text-slate-800 font-semibold font-mono">Asia/Kolkata (IST • UTC+5:30)</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Network Latency:</span>
                <span className="text-emerald-700 font-bold font-mono">{networkTimeService.getCurrentInfo().latencyMs} ms</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Status:</span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ONLINE SYNCHRONIZED
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
