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
  Sparkles,
  Sliders,
  Bell,
  ShieldAlert,
  Radio
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
import {
  loadThresholds,
  loadNtfyConfig,
  checkParameterThreshold,
  ThresholdBreachAlert,
  SystemThresholds,
  NtfyConfig
} from '../services/thresholdService';
import { ThresholdAnalyzerPage } from './ThresholdAnalyzerPage';

interface LogEntry {
  id: number;
  time: string;
  text: string;
}

export const TwincoreOsPage: React.FC = () => {
  // Navigation: Page 1 = Telemetry Dashboard, Page 2 = Equipment Threshold Analyzer
  const [activePage, setActivePage] = useState<'dashboard' | 'analyzer'>('dashboard');

  // Serial & Connection States
  const [isConnected, setIsConnected] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [packetCount, setPacketCount] = useState(0);
  const [lastPacketTime, setLastPacketTime] = useState<string | null>(null);
  const [activeInaTab, setActiveInaTab] = useState<'ch1' | 'ch2' | 'ch3'>('ch1');
  const [isTerminalCollapsed, setIsTerminalCollapsed] = useState(false);
  const [copiedLog, setCopiedLog] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Dynamic Thresholds & ntfy.sh alert state
  const [thresholds, setThresholds] = useState<SystemThresholds>(loadThresholds);
  const [ntfyConfig, setNtfyConfig] = useState<NtfyConfig>(loadNtfyConfig);
  const [activeAlerts, setActiveAlerts] = useState<ThresholdBreachAlert[]>([]);
  const [recentToast, setRecentToast] = useState<ThresholdBreachAlert | null>(null);

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

  // Refresh thresholds when updated
  const handleThresholdsUpdated = (newThresholds: SystemThresholds) => {
    setThresholds(newThresholds);
    setNtfyConfig(loadNtfyConfig());
  };

  // Process threshold breaches
  const handleBreach = (alert: ThresholdBreachAlert) => {
    setActiveAlerts((prev) => [alert, ...prev.slice(0, 4)]);
    setRecentToast(alert);
    setTimeout(() => {
      setRecentToast((curr) => (curr?.id === alert.id ? null : curr));
    }, 4500);
  };

  // Incoming packet ingestion handler
  const handleIncomingLine = (rawLine: string) => {
    const parsed = parseSerialPayload(rawLine);
    setCurrentData(parsed);

    const nowStr = new Date().toLocaleTimeString();
    setLastPacketTime(nowStr);
    setPacketCount((prev) => prev + 1);

    // ==========================================
    // Real-Time Threshold Enforcement Loop
    // ==========================================
    // 1. Voltage Check (Channel 1 or max voltage across rails)
    const voltVal = parsed.ina3221.v1 ?? 0;
    checkParameterThreshold('voltage', 'Bus Voltage V1', voltVal, 'V', thresholds.voltage, ntfyConfig, handleBreach);

    // 2. Current Check (in mA, converted from A)
    const currValA = parsed.ina3221.i1 ?? 0;
    const currValMa = Math.round(currValA * 1000);
    checkParameterThreshold('current', 'Input Current I1', currValMa, 'mA', thresholds.current, ntfyConfig, handleBreach);

    // 3. Temperature Check (DHT22 primary or DHT11)
    const tempVal = parsed.dht22.temperature ?? parsed.dht11.temperature;
    if (tempVal !== null) {
      checkParameterThreshold('temperature', 'Operating Temperature', tempVal, '°C', thresholds.temperature, ntfyConfig, handleBreach);
    }

    // 4. Humidity Check
    const humVal = parsed.dht22.humidity ?? parsed.dht11.humidity;
    if (humVal !== null) {
      checkParameterThreshold('humidity', 'Chamber Humidity', humVal, '%', thresholds.humidity, ntfyConfig, handleBreach);
    }

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

    // Ingest into backend (works both on Render cloud and local) to update Digital Twin & Live Monitoring
    fetch('/api/readings/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ line: rawLine })
    }).catch(() => {});
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
  }, [isDemoMode, thresholds, ntfyConfig]);

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
      if (isDemoMode) setIsDemoMode(false);
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

      {/* Floating Breach Alert Toast */}
      <AnimatePresence>
        {recentToast && (
          <motion.div
            initial={{ opacity: 0, y: -30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.9 }}
            className="fixed top-5 right-5 z-50 max-w-md p-4 rounded-2xl bg-rose-950/95 border border-rose-500/70 text-rose-100 shadow-2xl shadow-rose-950/80 backdrop-blur-xl space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                <span className="font-mono text-xs font-black uppercase tracking-wider text-rose-200">
                  {recentToast.label} Threshold Breach
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900/80 text-rose-300">
                {recentToast.limitType} EXCEEDED
              </span>
            </div>
            <p className="font-mono text-xs text-rose-200/90 leading-relaxed">
              Reading <span className="font-black text-white">{recentToast.value} {recentToast.unit}</span> breached boundary limit of {recentToast.limitValue} {recentToast.unit}.
            </p>
            {recentToast.ntfyDispatched && (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 pt-1 border-t border-rose-900">
                <Bell className="w-3 h-3" />
                <span>ntfy.sh push alert successfully dispatched</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative z-10 max-w-7xl mx-auto space-y-6">
        {/* ========================================================= */}
        {/* TOP MULTI-PAGE NAVIGATION BAR */}
        {/* ========================================================= */}
        <header className="sticky top-2 z-40 rounded-2xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 p-3 sm:p-4 shadow-2xl shadow-cyan-950/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00f2fe] to-[#4facfe] flex items-center justify-center text-slate-950 font-black shadow-lg shadow-cyan-500/30">
                  <Cpu className="w-5 h-5 text-slate-950" />
                </div>
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00f2fe] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00f2fe]" />
                </span>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-white font-mono">
                    TWINCORE <span className="text-[#00f2fe] drop-shadow-[0_0_12px_rgba(0,242,254,0.6)]">OS</span>
                  </h1>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-[#00f2fe] border border-cyan-500/30 text-[10px] font-mono font-bold uppercase">
                    v2.5
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono hidden sm:block">
                  IoT Telemetry Stream & Equipment Threshold Analytics
                </p>
              </div>
            </div>
          </div>

          {/* Page Tabs */}
          <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800/80">
            <button
              onClick={() => setActivePage('dashboard')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activePage === 'dashboard'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-[#00f2fe] border border-cyan-500/40 shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Live Telemetry Dashboard
            </button>

            <button
              onClick={() => setActivePage('analyzer')}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                activePage === 'analyzer'
                  ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              Equipment Threshold Analyzer
            </button>
          </div>

          {/* Quick Hardware Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsDemoMode(!isDemoMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono font-bold border transition-all ${
                isDemoMode
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                  : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {isDemoMode ? 'Mock Data (3s)' : 'Demo Mode'}
            </button>

            <button
              onClick={handleConnectSerial}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold transition-all shadow-lg cursor-pointer ${
                isConnected
                  ? 'bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/50 text-rose-300'
                  : 'bg-gradient-to-r from-[#00f2fe] to-[#4facfe] hover:brightness-110 text-slate-950 font-black'
              }`}
            >
              <Usb className="w-3.5 h-3.5" />
              {isConnected ? 'Disconnect' : 'Connect Serial'}
            </button>

            <div
              className={`flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
                isConnected
                  ? 'bg-emerald-950/70 border-emerald-500 text-emerald-400'
                  : isDemoMode
                  ? 'bg-blue-950/70 border-cyan-500 text-cyan-300'
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-400'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected || isDemoMode ? 'bg-[#00ff66] animate-pulse shadow-[0_0_8px_#00ff66]' : 'bg-rose-500'
                }`}
              />
              <span className="text-[11px]">{isConnected ? 'ONLINE' : isDemoMode ? 'MOCK' : 'OFFLINE'}</span>
            </div>
          </div>
        </header>

        {/* ========================================================= */}
        {/* CONDITIONAL RENDERING OF PAGE 1 OR PAGE 2 */}
        {/* ========================================================= */}
        {activePage === 'analyzer' ? (
          <ThresholdAnalyzerPage onThresholdsUpdated={handleThresholdsUpdated} />
        ) : (
          <>
            {/* Telemetry Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                <span className="text-slate-400 block text-[10px] uppercase">Packets Streamed</span>
                <span className="text-base font-black text-cyan-400">{packetCount}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                <span className="text-slate-400 block text-[10px] uppercase">Last Received</span>
                <span className="text-sm font-bold text-slate-200">{lastPacketTime || '--:--:--'}</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                <span className="text-slate-400 block text-[10px] uppercase">Voltage Safe Limit</span>
                <span className="text-sm font-bold text-emerald-400">
                  {thresholds.voltage.min}V - {thresholds.voltage.max}V
                </span>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
                <span className="text-slate-400 block text-[10px] uppercase">ntfy.sh Relay</span>
                <span className={`text-sm font-bold ${ntfyConfig.enabled ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {ntfyConfig.enabled ? ntfyConfig.topic : 'Off'}
                </span>
              </div>
            </div>

            {/* Error banner if port lock or disconnect */}
            {errorMsg && (
              <div className="flex items-center gap-3 p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Telemetry Cards Grid (Top Row) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card 1: DHT22 Environmental Monitor */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-4 h-4 text-[#00f2fe]" />
                    <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                      DHT22 Precision Ambient
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    currentData.dht22.status === 'ACTIVE'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {currentData.dht22.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-mono block">TEMPERATURE</span>
                    <div className="text-2xl font-black font-mono text-white mt-1">
                      {currentData.dht22.temperature !== null ? `${currentData.dht22.temperature.toFixed(1)}°C` : '--'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-mono block">HUMIDITY</span>
                    <div className="text-2xl font-black font-mono text-cyan-400 mt-1">
                      {currentData.dht22.humidity !== null ? `${currentData.dht22.humidity.toFixed(1)}%` : '--'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: DHT11 Environmental Monitor */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                      DHT11 Auxiliary Chamber
                    </h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    currentData.dht11.status === 'ACTIVE'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
                  }`}>
                    {currentData.dht11.status === 'ACTIVE' ? 'ACTIVE' : 'OFFLINE (NAN)'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-mono block">TEMPERATURE</span>
                    <div className="text-2xl font-black font-mono text-slate-300 mt-1">
                      {currentData.dht11.temperature !== null ? `${currentData.dht11.temperature.toFixed(1)}°C` : '--'}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-mono block">HUMIDITY</span>
                    <div className="text-2xl font-black font-mono text-slate-300 mt-1">
                      {currentData.dht11.humidity !== null ? `${currentData.dht11.humidity.toFixed(1)}%` : '--'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 3: INA3221 3-Channel Power Monitor */}
              <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                      INA3221 3-Rail Telemetry
                    </h3>
                  </div>
                  <div className="flex gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                    {(['ch1', 'ch2', 'ch3'] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setActiveInaTab(tab)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase transition ${
                          activeInaTab === tab
                            ? 'bg-[#00f2fe] text-slate-950 shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tab content */}
                {(() => {
                  const v =
                    activeInaTab === 'ch1'
                      ? currentData.ina3221.v1
                      : activeInaTab === 'ch2'
                      ? currentData.ina3221.v2
                      : currentData.ina3221.v3;
                  const i =
                    activeInaTab === 'ch1'
                      ? currentData.ina3221.i1
                      : activeInaTab === 'ch2'
                      ? currentData.ina3221.i2
                      : currentData.ina3221.i3;
                  const m =
                    activeInaTab === 'ch1'
                      ? currentData.ina3221.m1
                      : activeInaTab === 'ch2'
                      ? currentData.ina3221.m2
                      : currentData.ina3221.m3;
                  const p = (v ?? 0) * (i ?? 0);

                  return (
                    <div className="grid grid-cols-3 gap-2 font-mono">
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">BUS (V)</span>
                        <span className="text-lg font-black text-cyan-400">
                          {v !== null ? v.toFixed(2) : '--'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">CURRENT</span>
                        <span className="text-lg font-black text-emerald-400">
                          {i !== null ? `${(i * 1000).toFixed(0)}mA` : `${m ?? '--'}mV`}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                        <span className="text-[10px] text-slate-400 block">POWER</span>
                        <span className="text-lg font-black text-amber-400">
                          {p > 0 ? `${p.toFixed(2)}W` : '0.00W'}
                        </span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Real-Time Line Chart (Middle Row) */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00f2fe]" />
                  <h3 className="text-sm font-bold font-mono text-white tracking-wide">
                    REAL-TIME THERMAL TELEMETRY HISTORY (LAST 30 PACKETS)
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  Sliding Window • 1 Hz
                </span>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartHistory}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis stroke="#64748b" domain={['auto', 'auto']} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#090d16',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }} />
                    <Line type="monotone" dataKey="dht22Temp" name="DHT22 Temp (°C)" stroke="#00f2fe" strokeWidth={2} dot={false} isAnimationActive={false} />
                    <Line type="monotone" dataKey="dht11Temp" name="DHT11 Temp (°C)" stroke="#f59e0b" strokeWidth={2} dot={false} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* System Console / Raw Logs (Bottom Row) */}
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl overflow-hidden font-mono text-xs shadow-2xl">
              <div className="flex items-center justify-between p-3.5 bg-slate-950/80 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#00ff66]" />
                  <span className="font-bold text-slate-300">UART SERIAL TELEMETRY CONSOLE</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
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
          </>
        )}
      </div>
    </div>
  );
};
