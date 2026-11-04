import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Usb,
  Cpu,
  Activity,
  Zap,
  Droplets,
  Thermometer,
  Terminal,
  CheckCircle2,
  AlertTriangle,
  Play,
  Square,
  Copy,
  Trash2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Gauge,
  Layers,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import { parseSerialPayload, generateMockSerialString, TelemetryData } from '../services/serialParser';
import { webSerialManager } from '../services/webSerial';

interface LogEntry {
  id: number;
  time: string;
  text: string;
}

export const TwincoreOsPage: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [packetCount, setPacketCount] = useState(0);
  const [lastPacketTime, setLastPacketTime] = useState<string | null>(null);
  const [activeInaTab, setActiveInaTab] = useState<'ch1' | 'ch2' | 'ch3'>('ch1');
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Latest parsed state
  const [currentData, setCurrentData] = useState<TelemetryData>(() =>
    parseSerialPayload('[Received from Master]: DHT22:T=26.3,H=55.3;DHT11:T=nan,H=nan;INA:V1=12.140,V2=5.020,V3=3.310;SH:m1=14.20,m2=8.40,m3=2.10')
  );

  // Sliding window of last 30 packets for Recharts
  const [chartHistory, setChartHistory] = useState<Array<{
    time: string;
    dht22Temp: number | null;
    dht11Temp: number | null;
    dht22Hum: number | null;
    dht11Hum: number | null;
  }>>([]);

  // Terminal log lines
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);
  const logIdCounter = useRef(0);
  const demoTickCounter = useRef(0);

  // Incoming packet ingestion handler
  const handleIncomingLine = (rawLine: string) => {
    const parsed = parseSerialPayload(rawLine);
    setCurrentData(parsed);

    const nowStr = new Date().toLocaleTimeString();
    setLastPacketTime(nowStr);
    setPacketCount((prev) => prev + 1);

    // Append to chart history (sliding window 30)
    setChartHistory((prev) => {
      const next = [
        ...prev,
        {
          time: nowStr,
          dht22Temp: parsed.dht22.temperature,
          dht11Temp: parsed.dht11.temperature,
          dht22Hum: parsed.dht22.humidity,
          dht11Hum: parsed.dht11.humidity
        }
      ];
      return next.length > 30 ? next.slice(-30) : next;
    });

    // Append to logs (keep last 100)
    logIdCounter.current += 1;
    setLogs((prev) => {
      const next = [...prev, { id: logIdCounter.current, time: nowStr, text: rawLine }];
      return next.length > 100 ? next.slice(-100) : next;
    });
  };

  // Auto-scroll terminal
  useEffect(() => {
    if (!isTerminalCollapsed && terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, isTerminalCollapsed]);

  // Demo Mode ticker (every 3 seconds)
  useEffect(() => {
    let timer: any = null;
    if (isDemoMode) {
      timer = setInterval(() => {
        demoTickCounter.current += 1;
        const line = generateMockSerialString(demoTickCounter.current);
        handleIncomingLine(line);
      }, 3000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isDemoMode]);

  // Connect Web Serial port
  const handleConnectSerial = async () => {
    setErrorMsg(null);
    if (isConnected) {
      await webSerialManager.disconnect();
      setIsConnected(false);
      return;
    }

    const success = await webSerialManager.connect(
      115200,
      (line) => {
        handleIncomingLine(line);
      },
      (err) => {
        console.error('Serial error:', err);
        setErrorMsg(err.message || 'Serial communication error');
        setIsConnected(false);
      }
    );

    if (success) {
      setIsConnected(true);
      if (isDemoMode) setIsDemoMode(false); // disable demo if real serial is active
    }
  };

  const handleCopyLogs = () => {
    const text = logs.map((l) => `[${l.time}] ${l.text}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2000);
  };

  const handleClearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="min-h-screen bg-[#090D16] text-slate-100 font-sans p-3 sm:p-6 lg:p-8 space-y-6 selection:bg-[#00f2fe]/30 selection:text-white">
      {/* Background cyber ambient glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#00f2fe]/10 rounded-full blur-[140px]" />
        <div className="absolute top-1/2 -right-40 w-96 h-96 bg-[#10b981]/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* ========================================================= */}
        {/* HEADER SECTION */}
        {/* ========================================================= */}
        <header className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/80 p-4 sm:p-6 shadow-2xl shadow-cyan-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#00f2fe] to-[#4facfe] flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/30">
                <Cpu className="w-6 h-6 text-slate-950" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-[#00f2fe]" />
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white font-mono">
                  TWINCORE <span className="text-[#00f2fe] drop-shadow-[0_0_12px_rgba(0,242,254,0.6)]">OS</span>
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-cyan-950/80 text-[#00f2fe] border border-cyan-500/30 text-[10px] font-mono font-bold uppercase tracking-wider">
                  v2.4 IoT
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Real-Time Hardware Telemetry Stream • Direct Web Serial UART (115200 bps)
              </p>
            </div>
          </div>

          {/* Connection Controls & Badges */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Demo Mode Toggle */}
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
                isDemoMode
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isDemoMode ? 'Mock Data Running (3s)' : 'Demo Mode (Mock)'}
            </button>

            {/* Connect Serial Port Button */}
            <button
              onClick={handleConnectSerial}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all shadow-lg cursor-pointer ${
                isConnected
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300 shadow-rose-950/50'
                  : 'bg-gradient-to-r from-[#00f2fe] to-[#4facfe] hover:brightness-110 text-slate-950 shadow-cyan-500/30 font-black'
              }`}
            >
              <Usb className="w-4 h-4" />
              {isConnected ? 'Disconnect Serial' : 'Connect Serial Port'}
            </button>

            {/* Connection Status Badge */}
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                isConnected
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                  : isDemoMode
                  ? 'bg-blue-950/70 border-cyan-500 text-cyan-300 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-400'
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  isConnected || isDemoMode ? 'bg-[#00ff66] animate-pulse shadow-[0_0_8px_#00ff66]' : 'bg-rose-500'
                }`}
              />
              {isConnected ? 'CONNECTED' : isDemoMode ? 'SIMULATED' : 'DISCONNECTED'}
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {errorMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-300 text-xs font-mono flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white underline">
              Dismiss
            </button>
          </motion.div>
        )}

        {/* Diagnostic Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400">Packets Ingested</span>
            <span className="font-bold text-[#00f2fe] text-sm">{packetCount}</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400">Baud Rate</span>
            <span className="font-bold text-slate-200">115200 8N1</span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400">Stream Status</span>
            <span className={`font-bold ${isConnected || isDemoMode ? 'text-emerald-400' : 'text-slate-500'}`}>
              {isConnected ? 'UART LIVE' : isDemoMode ? 'MOCK ACTIVE' : 'IDLE'}
            </span>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
            <span className="text-slate-400">Last Packet</span>
            <span className="font-bold text-slate-300 truncate">{lastPacketTime || '--:--:--'}</span>
          </div>
        </div>

        {/* ========================================================= */}
        {/* TELEMETRY CARDS GRID (TOP ROW) */}
        {/* ========================================================= */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* CARD 1: DHT22 ENVIRONMENTAL MONITOR */}
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 p-5 shadow-xl relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00f2fe]">
                    <Thermometer className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      DHT22 Precision Sensor
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Ambient Core Channel</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1 shadow-[0_0_8px_rgba(16,185,129,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ACTIVE
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 my-2">
                {/* Temperature */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono mb-1">
                    <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
                    <span>TEMP</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-white tracking-tight">
                    {currentData.dht22.temperature !== null ? currentData.dht22.temperature.toFixed(1) : '--'}
                    <span className="text-sm font-normal text-cyan-400 ml-1">°C</span>
                  </div>
                </div>

                {/* Humidity */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono mb-1">
                    <Droplets className="w-3.5 h-3.5 text-emerald-400" />
                    <span>HUMIDITY</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-white tracking-tight">
                    {currentData.dht22.humidity !== null ? currentData.dht22.humidity.toFixed(1) : '--'}
                    <span className="text-sm font-normal text-emerald-400 ml-1">%</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/60 mt-3 flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Bus: OneWire GPIO</span>
              <span className="text-emerald-400 font-semibold">100% Signal Integrity</span>
            </div>
          </motion.div>

          {/* CARD 2: DHT11 ENVIRONMENTAL MONITOR (With Graceful Fallback for "nan") */}
          <motion.div
            whileHover={{ y: -2 }}
            className={`rounded-2xl bg-slate-900/80 backdrop-blur-xl border p-5 shadow-xl relative overflow-hidden flex flex-col justify-between transition-all ${
              currentData.dht11.status === 'OFFLINE'
                ? 'border-amber-500/40 shadow-amber-950/20'
                : 'border-slate-800/90'
            }`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      DHT11 Auxiliary Sensor
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Secondary Enclosure Probe</span>
                  </div>
                </div>

                {/* Graceful Fallback Indicator */}
                {currentData.dht11.status === 'OFFLINE' ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-950/80 text-amber-300 border border-amber-500/50 text-[10px] font-mono font-bold flex items-center gap-1 shadow-[0_0_10px_rgba(245,158,11,0.25)]">
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                    SENSOR DISCONNECTED / OFF-LINE
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    ONLINE
                  </span>
                )}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4 my-2">
                {/* Temperature with nan check */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono mb-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                    <span>TEMP</span>
                  </div>
                  <div className="text-3xl font-black font-mono tracking-tight">
                    {currentData.dht11.temperature !== null ? (
                      <span className="text-white">
                        {currentData.dht11.temperature.toFixed(1)}
                        <span className="text-sm font-normal text-amber-400 ml-1">°C</span>
                      </span>
                    ) : (
                      <span className="text-amber-500/80 text-2xl font-bold">Offline / --</span>
                    )}
                  </div>
                </div>

                {/* Humidity with nan check */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px] font-mono mb-1">
                    <Droplets className="w-3.5 h-3.5 text-amber-400" />
                    <span>HUMIDITY</span>
                  </div>
                  <div className="text-3xl font-black font-mono tracking-tight">
                    {currentData.dht11.humidity !== null ? (
                      <span className="text-white">
                        {currentData.dht11.humidity.toFixed(1)}
                        <span className="text-sm font-normal text-amber-400 ml-1">%</span>
                      </span>
                    ) : (
                      <span className="text-amber-500/80 text-2xl font-bold">Offline / --</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/60 mt-3 flex items-center justify-between text-[11px] font-mono">
              <span className="text-slate-500">Payload Parse:</span>
              <span className={currentData.dht11.status === 'OFFLINE' ? 'text-amber-400/90' : 'text-emerald-400'}>
                {currentData.dht11.status === 'OFFLINE' ? 'T=nan, H=nan handled safely' : 'Valid floating reading'}
              </span>
            </div>
          </motion.div>

          {/* CARD 3: INA3221 3-CHANNEL POWER MONITOR */}
          <motion.div
            whileHover={{ y: -2 }}
            className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 p-5 shadow-xl relative overflow-hidden flex flex-col justify-between"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />

            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00f2fe]">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                      INA3221 3-Channel Power
                    </h3>
                    <span className="text-[10px] text-slate-400 font-mono">Bus & Shunt Current Rail</span>
                  </div>
                </div>

                {/* Channel Selector Pills */}
                <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-mono">
                  {(['ch1', 'ch2', 'ch3'] as const).map((ch, idx) => (
                    <button
                      key={ch}
                      onClick={() => setActiveInaTab(ch)}
                      className={`px-2 py-0.5 rounded-lg transition-all font-bold cursor-pointer ${
                        activeInaTab === ch
                          ? 'bg-[#00f2fe] text-slate-950 shadow-[0_0_8px_rgba(0,242,254,0.5)]'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      CH{idx + 1}
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Channel Stats */}
              <div className="grid grid-cols-2 gap-4 my-2">
                {/* Bus Voltage */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-slate-400 text-[11px] font-mono mb-1">
                    BUS VOLTAGE (V{activeInaTab === 'ch1' ? '1' : activeInaTab === 'ch2' ? '2' : '3'})
                  </div>
                  <div className="text-3xl font-black font-mono text-white tracking-tight">
                    {(activeInaTab === 'ch1'
                      ? currentData.ina3221.v1
                      : activeInaTab === 'ch2'
                      ? currentData.ina3221.v2
                      : currentData.ina3221.v3
                    )?.toFixed(3)}
                    <span className="text-sm font-normal text-cyan-400 ml-1">V</span>
                  </div>
                </div>

                {/* Shunt Voltage */}
                <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="text-slate-400 text-[11px] font-mono mb-1">
                    SHUNT (m{activeInaTab === 'ch1' ? '1' : activeInaTab === 'ch2' ? '2' : '3'})
                  </div>
                  <div className="text-3xl font-black font-mono text-emerald-400 tracking-tight">
                    {(activeInaTab === 'ch1'
                      ? currentData.ina3221.m1
                      : activeInaTab === 'ch2'
                      ? currentData.ina3221.m2
                      : currentData.ina3221.m3
                    )?.toFixed(2)}
                    <span className="text-sm font-normal text-emerald-400 ml-1">mV</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick 3-channel summary footer */}
            <div className="pt-3 border-t border-slate-800/60 mt-3 grid grid-cols-3 gap-1 text-[10px] font-mono text-slate-400 text-center">
              <div>CH1: {currentData.ina3221.v1?.toFixed(2)}V</div>
              <div>CH2: {currentData.ina3221.v2?.toFixed(2)}V</div>
              <div>CH3: {currentData.ina3221.v3?.toFixed(2)}V</div>
            </div>
          </motion.div>
        </div>

        {/* ========================================================= */}
        {/* REAL-TIME DATA VISUALIZATION (MIDDLE ROW) */}
        {/* ========================================================= */}
        <div className="rounded-2xl bg-slate-900/80 backdrop-blur-xl border border-slate-800/90 p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800/80 gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00f2fe]">
                <Activity className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-white">
                  Real-Time Dual-Axis Temperature History (Sliding Window: 30 Packets)
                </h3>
                <span className="text-[10px] text-slate-400 font-mono">
                  Comparing DHT22 Primary Channel vs DHT11 Auxiliary Channel
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#00f2fe]">
                <span className="w-2.5 h-0.5 bg-[#00f2fe]" /> DHT22 (°C)
              </span>
              <span className="flex items-center gap-1.5 text-[#f59e0b]">
                <span className="w-2.5 h-0.5 bg-[#f59e0b]" /> DHT11 (°C)
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            {chartHistory.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 font-mono text-xs gap-2">
                <RefreshCw className="w-5 h-5 animate-spin text-cyan-400" />
                <span>Awaiting incoming serial stream to plot temperature history...</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartHistory} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="time"
                    stroke="#64748b"
                    fontSize={10}
                    fontFamily="monospace"
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={10}
                    fontFamily="monospace"
                    domain={['auto', 'auto']}
                    unit="°C"
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#090D16',
                      borderColor: '#1e293b',
                      borderRadius: '0.75rem',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      boxShadow: '0 10px 25px -5px rgba(0, 242, 254, 0.2)'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="dht22Temp"
                    name="DHT22 Temp"
                    stroke="#00f2fe"
                    strokeWidth={2.5}
                    dot={{ fill: '#00f2fe', r: 3 }}
                    activeDot={{ r: 5, stroke: '#ffffff' }}
                    isAnimationActive={true}
                    animationDuration={300}
                  />
                  <Line
                    type="monotone"
                    dataKey="dht11Temp"
                    name="DHT11 Temp"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    strokeDasharray="4 2"
                    dot={{ fill: '#f59e0b', r: 2.5 }}
                    activeDot={{ r: 4 }}
                    isAnimationActive={true}
                    animationDuration={300}
                    connectNulls={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ========================================================= */}
        {/* SYSTEM CONSOLE / RAW LOGS (BOTTOM ROW) */}
        {/* ========================================================= */}
        <div className="rounded-2xl bg-black border border-slate-800 shadow-2xl overflow-hidden font-mono text-xs">
          {/* Terminal Header */}
          <div className="bg-slate-950 px-4 py-3 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-300">
              <Terminal className="w-4 h-4 text-[#00ff66]" />
              <span className="font-bold text-white tracking-wider">SYSTEM CONSOLE • RAW UART STREAM</span>
              <span className="text-[10px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                115200 BAUD
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyLogs}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition text-[11px] cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                {copiedLog ? 'Copied!' : 'Copy'}
              </button>

              <button
                onClick={handleClearLogs}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 transition text-[11px] cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </button>

              <button
                onClick={() => setIsTerminalCollapsed(!isTerminalCollapsed)}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700/60 transition cursor-pointer"
              >
                {isTerminalCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Terminal Body */}
          <AnimatePresence>
            {!isTerminalCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: '220px', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-4 overflow-y-auto space-y-1.5 text-[#00ff66] select-text bg-black/95"
              >
                {logs.length === 0 ? (
                  <div className="text-slate-600 italic py-6 text-center">
                    No UART packets received yet. Click &quot;Connect Serial Port&quot; or toggle &quot;Demo Mode&quot; to begin streaming.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div key={log.id} className="leading-relaxed flex items-start gap-2 break-all hover:bg-slate-900/30 px-1 rounded">
                      <span className="text-slate-500 shrink-0 select-none">[{log.time}]</span>
                      <span>{log.text}</span>
                    </div>
                  ))
                )}
                <div ref={terminalBottomRef} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
