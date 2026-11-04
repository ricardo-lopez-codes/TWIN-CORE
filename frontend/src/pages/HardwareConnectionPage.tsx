import React, { useState, useEffect, useRef } from 'react';
import {
  Usb,
  Radio,
  RefreshCw,
  Power,
  PowerOff,
  Activity,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import {
  fetchConnectionStatus,
  connectSerial,
  disconnectSerial,
  fetchSerialPorts
} from '../services/api';
import { ConnectionStatus, SerialPortInfo, SensorReading, DataMode } from '../types';

interface HardwareConnectionPageProps {
  reading: SensorReading;
  mode: DataMode;
  onModeChanged?: (mode: DataMode) => void;
}

export const HardwareConnectionPage: React.FC<HardwareConnectionPageProps> = ({
  reading,
  mode,
  onModeChanged
}) => {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [ports, setPorts] = useState<SerialPortInfo[]>([]);
  const [selectedPort, setSelectedPort] = useState<string>('AUTO');
  const [selectedBaud, setSelectedBaud] = useState<number>(115200);
  const [loading, setLoading] = useState<boolean>(false);
  const [copiedFormat, setCopiedFormat] = useState<boolean>(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  const loadStatusAndPorts = async () => {
    try {
      const s = await fetchConnectionStatus();
      if (s) {
        setStatus(s);
        if (s.port) setSelectedPort(s.port);
        if (s.baud_rate) setSelectedBaud(s.baud_rate);
      }
      const p = await fetchSerialPorts();
      if (p) setPorts(p);
    } catch (e) {
      console.error('Failed to load serial status:', e);
    }
  };

  useEffect(() => {
    loadStatusAndPorts();
    const interval = setInterval(loadStatusAndPorts, 2500);
    return () => clearInterval(interval);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const updated = await connectSerial(selectedPort, selectedBaud);
      setStatus(updated);
      if (onModeChanged) {
        onModeChanged(updated.connected ? 'HARDWARE_CONNECTED' : 'HARDWARE_DISCONNECTED');
      }
    } catch (e) {
      console.error('Connect failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      const updated = await disconnectSerial();
      setStatus(updated);
      if (onModeChanged) {
        onModeChanged('SIMULATION');
      }
    } catch (e) {
      console.error('Disconnect failed:', e);
    } finally {
      setLoading(false);
    }
  };

  const isConnected = Boolean(status?.connected);

  const proposedPacketJson = JSON.stringify(
    {
      device_id: 'TWINCORE-UNIT1',
      packet_id: 1,
      temperature: 32.25,
      voltage: 12.0,
      current: 1.25,
      latitude: 34.1526,
      longitude: 77.5771,
      gps_fix: true,
      timestamp: '2026-11-04T10:30:00'
    },
    null,
    2
  );

  const handleCopyPacket = () => {
    navigator.clipboard.writeText(proposedPacketJson);
    setCopiedFormat(true);
    setTimeout(() => setCopiedFormat(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <Usb className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-sans font-bold text-slate-900 tracking-tight">
              Unit 2 Communication Gateway & Serial Bridge
            </h2>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              USB-CDC serial port connection management, real-time packet parsing, and diagnostics.
            </p>
          </div>
        </div>

        {/* Status indicator badge */}
        <div className="flex items-center gap-3">
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 font-mono text-xs ${
            isConnected
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-slate-100 border-slate-200 text-slate-700'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">GATEWAY STATE</div>
              <div className="font-bold">{isConnected ? 'USB SERIAL CONNECTED' : 'DISCONNECTED (STANDBY)'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Control Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
              Serial Interface Configuration
            </h3>
          </div>
          <button
            onClick={loadStatusAndPorts}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 font-mono transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Scan Ports
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4 items-end">
          {/* COM Port selection */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5">
              SERIAL COM PORT
            </label>
            <select
              value={selectedPort}
              onChange={(e) => setSelectedPort(e.target.value)}
              disabled={isConnected || loading}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value="AUTO">AUTO (Detect ESP32 / CP210x)</option>
              {ports.map((p) => (
                <option key={p.device} value={p.device}>
                  {p.device} - {p.description}
                </option>
              ))}
            </select>
          </div>

          {/* Baud Rate selection */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-700 mb-1.5">
              BAUD RATE (BPS)
            </label>
            <select
              value={selectedBaud}
              onChange={(e) => setSelectedBaud(Number(e.target.value))}
              disabled={isConnected || loading}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value={9600}>9600 baud</option>
              <option value={19200}>19200 baud</option>
              <option value={38400}>38400 baud</option>
              <option value={57600}>57600 baud</option>
              <option value={115200}>115200 baud (Standard)</option>
              <option value={230400}>230400 baud</option>
            </select>
          </div>

          {/* Connect / Disconnect Buttons */}
          <div className="flex items-center gap-2 sm:col-span-1 lg:col-span-2">
            {!isConnected ? (
              <button
                onClick={handleConnect}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs shadow-md shadow-blue-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Power className="w-4 h-4" />
                {loading ? 'Connecting...' : 'Connect to Unit 2'}
              </button>
            ) : (
              <button
                onClick={handleDisconnect}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-mono font-bold text-xs shadow-md shadow-rose-500/20 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <PowerOff className="w-4 h-4" />
                {loading ? 'Disconnecting...' : 'Disconnect Gateway'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Link Diagnostics & Packet Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="text-slate-500 text-xs font-mono mb-1">PACKETS RECEIVED</div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {status?.packets_received ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">Valid JSON frames</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="text-slate-500 text-xs font-mono mb-1">BYTES RECEIVED</div>
          <div className="text-xl font-bold font-mono text-slate-900">
            {status?.bytes_received ? `${(status.bytes_received / 1024).toFixed(1)} KB` : '0 KB'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">USB Serial throughput</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="text-slate-500 text-xs font-mono mb-1">PACKET ERRORS</div>
          <div className={`text-xl font-bold font-mono ${(status?.packet_errors ?? 0) > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
            {status?.packet_errors ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">Checksum/parse fails</div>
        </div>

        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="text-slate-500 text-xs font-mono mb-1">LAST PACKET TIME</div>
          <div className="text-xs font-bold font-mono text-slate-900 truncate mt-1">
            {status?.last_packet_time ? new Date(status.last_packet_time).toLocaleTimeString() : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {isConnected ? 'Active Stream' : 'Awaiting Connection'}
          </div>
        </div>
      </div>

      {/* Split Viewer: Raw Serial Terminal & Parsed Packet Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raw Serial Terminal */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-card flex flex-col h-96">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-2">
            <div className="flex items-center gap-2 text-slate-300 text-xs font-mono">
              <Terminal className="w-4 h-4 text-emerald-400" />
              <span className="font-bold">INCOMING RAW SERIAL FEED</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">
              {status?.port ?? selectedPort} @ {selectedBaud}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 font-mono text-[11px] text-emerald-400/90 pr-2 select-text">
            {status?.raw_buffer && status.raw_buffer.length > 0 ? (
              status.raw_buffer.map((line, idx) => (
                <div key={idx} className="break-all leading-relaxed">
                  {line}
                </div>
              ))
            ) : (
              <div className="text-slate-600 italic py-4">
                No serial data received yet. Connect Unit 2 over USB to monitor incoming UART stream.
              </div>
            )}
            <div ref={terminalEndRef} />
          </div>
        </div>

        {/* Parsed Telemetry Inspector & Proposed JSON Specification */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
                  Unit 1 Telemetry Packet Specification
                </h3>
              </div>
              <button
                onClick={handleCopyPacket}
                className="flex items-center gap-1 text-[11px] font-mono text-slate-600 hover:text-blue-600 transition"
              >
                {copiedFormat ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedFormat ? 'Copied' : 'Copy Spec'}
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-3">
              Unit 2 streams telemetry over USB Serial as newline-terminated JSON strings.
              Power is calculated on reception (<code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-blue-700">P = V × I</code>).
            </p>

            <pre className="p-3.5 rounded-xl bg-slate-900 text-emerald-400 font-mono text-xs overflow-x-auto shadow-inner leading-relaxed">
              {proposedPacketJson}
            </pre>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Calculated Power: <strong>{(12.0 * 1.25).toFixed(2)} W</strong></span>
            <span>Target: Unit 2 Gateway (ESP32)</span>
          </div>
        </div>
      </div>
    </div>
  );
};
