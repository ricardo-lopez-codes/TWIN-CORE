import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  UploadCloud,
  FileText,
  Cpu,
  Zap,
  Thermometer,
  Droplets,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Sliders,
  Bell,
  Send,
  Save,
  Wand2,
  Sparkles,
  Info,
  RefreshCw,
  FileSpreadsheet
} from 'lucide-react';
import {
  analyzeSensorDataset,
  analyzePdfDatasheet,
  extractTextFromPdf,
  AiAnalysisResult
} from '../services/analyzerEngine';
import {
  SystemThresholds,
  NtfyConfig,
  loadThresholds,
  saveThresholds,
  loadNtfyConfig,
  saveNtfyConfig,
  dispatchNtfyAlert,
  DEFAULT_THRESHOLDS
} from '../services/thresholdService';

interface Props {
  onThresholdsUpdated?: (newThresholds: SystemThresholds) => void;
}

export const ThresholdAnalyzerPage: React.FC<Props> = ({ onThresholdsUpdated }) => {
  // Threshold & Ntfy States
  const [thresholds, setThresholds] = useState<SystemThresholds>(loadThresholds);
  const [ntfyConfig, setNtfyConfig] = useState<NtfyConfig>(loadNtfyConfig);

  // Analysis State
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Notification UI feedback
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'warn' | 'info' } | null>(null);
  const [isTestingNtfy, setIsTestingNtfy] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (text: string, type: 'success' | 'warn' | 'info' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3500);
  };

  const processFileContent = (content: string, fileName: string) => {
    setIsAnalyzing(true);
    setTimeout(() => {
      try {
        const result = analyzeSensorDataset(content, fileName);
        setAnalysisResult(result);
        showToast(`Dataset analyzed: ${result.stats.totalRows} telemetry rows processed!`, 'success');
      } catch (err: any) {
        showToast(`Failed to parse file: ${err.message}`, 'warn');
      } finally {
        setIsAnalyzing(false);
      }
    }, 400);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setIsAnalyzing(true);
      try {
        const buffer = await file.arrayBuffer();
        const extractedText = await extractTextFromPdf(buffer);
        const result = analyzePdfDatasheet(extractedText, file.name);
        setAnalysisResult(result);
        showToast(`PDF Datasheet analyzed! Extracted manufacturer limits.`, 'success');
      } catch (err: any) {
        showToast(`Failed to parse PDF: ${err.message}`, 'warn');
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) processFileContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setSelectedFile(file);

    if (file.name.toLowerCase().endsWith('.pdf')) {
      setIsAnalyzing(true);
      try {
        const buffer = await file.arrayBuffer();
        const extractedText = await extractTextFromPdf(buffer);
        const result = analyzePdfDatasheet(extractedText, file.name);
        setAnalysisResult(result);
        showToast(`PDF Datasheet analyzed! Extracted manufacturer limits.`, 'success');
      } catch (err: any) {
        showToast(`Failed to parse PDF: ${err.message}`, 'warn');
      } finally {
        setIsAnalyzing(false);
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) processFileContent(text, file.name);
    };
    reader.readAsText(file);
  };

  const handleApplyAiThresholds = () => {
    if (!analysisResult) return;
    const rec = analysisResult.recommendedThresholds;
    const updated: SystemThresholds = {
      voltage: { min: rec.voltage.min, max: rec.voltage.max },
      current: { min: rec.current.min, max: rec.current.max },
      temperature: { min: rec.temperature.min, max: rec.temperature.max },
      humidity: { min: rec.humidity.min, max: rec.humidity.max }
    };
    setThresholds(updated);
    saveThresholds(updated);
    if (onThresholdsUpdated) onThresholdsUpdated(updated);
    showToast('Applied AI calculated safe operating thresholds!', 'success');
  };

  const handleSaveThresholds = () => {
    saveThresholds(thresholds);
    if (onThresholdsUpdated) onThresholdsUpdated(thresholds);
    showToast('Threshold settings saved to persistent storage!', 'success');
  };

  const handleSaveNtfy = () => {
    saveNtfyConfig(ntfyConfig);
    showToast(`ntfy.sh alerts configured for topic: ${ntfyConfig.topic}`, 'success');
  };

  const [isSimulatingBreach, setIsSimulatingBreach] = useState(false);
  const [simulationType, setSimulationType] = useState<'voltage' | 'current' | 'temperature'>('temperature');
  const [simulatedValue, setSimulatedValue] = useState<number | null>(null);

  const handleSimulateThresholdBreach = async (type: 'voltage' | 'current' | 'temperature') => {
    if (!ntfyConfig.topic) {
      showToast('Please enter an ntfy topic name first', 'warn');
      return;
    }

    setIsSimulatingBreach(true);
    setSimulationType(type);

    let val = 0;
    let label = '';
    let unit = '';
    let limitVal = 0;
    let tags = 'warning,electric_plug';

    if (type === 'voltage') {
      limitVal = thresholds.voltage.max;
      val = Number((limitVal + 2.8).toFixed(2));
      label = 'Main Rail Voltage';
      unit = 'V';
      tags = 'warning,zap';
    } else if (type === 'current') {
      limitVal = thresholds.current.max;
      val = Math.round(limitVal + 450);
      label = 'Inverter Shunt Current';
      unit = 'mA';
      tags = 'warning,flame';
    } else {
      limitVal = thresholds.temperature.max;
      val = Number((limitVal + 14.5).toFixed(1));
      label = 'High-Altitude Battery & Core Temperature';
      unit = '°C';
      tags = 'warning,thermometer,fire';
    }

    setSimulatedValue(val);

    const title = `⚠️ CRITICAL EQUIPMENT ALERT: ${label} Out of Bounds!`;
    const body = `[DEMO SIMULATION]: Current ${label} reading (${val} ${unit}) breached critical threshold limit (Max: ${limitVal} ${unit}). Immediate hardware shutdown / protection required!`;

    const success = await dispatchNtfyAlert(
      ntfyConfig.topic,
      title,
      body,
      'urgent',
      tags
    );

    setIsSimulatingBreach(false);

    if (success) {
      showToast(
        `🚨 Notification sent to your phone! Simulated ${label} breach: ${val} ${unit} (Max: ${limitVal} ${unit})`,
        'success'
      );
    } else {
      showToast(`Simulation alert failed to send. Check ntfy topic or connection.`, 'warn');
    }
  };

  const handleTestNtfy = async () => {
    if (!ntfyConfig.topic) {
      showToast('Please enter an ntfy topic name first', 'warn');
      return;
    }
    setIsTestingNtfy(true);
    const success = await dispatchNtfyAlert(
      ntfyConfig.topic,
      '🧪 TWINCORE OS Test Alert',
      `Manual test ping sent from TWINCORE Equipment Analyzer. Target Topic: ${ntfyConfig.topic}`,
      'high',
      'satellite,white_check_mark'
    );
    setIsTestingNtfy(false);
    if (success) {
      showToast(`Test alert successfully sent to https://ntfy.sh/${ntfyConfig.topic}`, 'success');
    } else {
      showToast(`Failed to dispatch alert. Check network or topic name.`, 'warn');
    }
  };

  // Load sample dataset for one-click testing
  const handleLoadSampleDataset = () => {
    const sampleCsv = `Timestamp,Voltage_V,Current_A,Temperature_C,Humidity_RH
2026-11-04T10:00:01,7.63,0.001,26.4,54.1
2026-11-04T10:00:03,7.65,0.002,26.5,53.8
2026-11-04T10:00:06,7.66,0.001,26.6,53.2
2026-11-04T10:00:09,8.12,0.140,28.2,51.0
2026-11-04T10:00:12,11.95,0.450,31.4,48.5
2026-11-04T10:00:15,12.04,0.510,32.8,47.0
2026-11-04T10:00:18,12.08,0.520,33.1,46.2
2026-11-04T10:00:21,11.92,0.480,32.5,47.5
2026-11-04T10:00:24,7.64,0.001,27.1,52.4
2026-11-04T10:00:27,7.63,0.001,26.7,53.0`;
    processFileContent(sampleCsv, 'twincore_telemetry_sample.csv');
  };

  return (
    <div className="space-y-8">
      {/* Toast popup */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border text-xs sm:text-sm font-mono backdrop-blur-md ${
              toastMsg.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-200 shadow-emerald-950/60'
                : toastMsg.type === 'warn'
                ? 'bg-amber-950/90 border-amber-500/50 text-amber-200 shadow-amber-950/60'
                : 'bg-cyan-950/90 border-cyan-500/50 text-cyan-200 shadow-cyan-950/60'
            }`}
          >
            {toastMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            )}
            <span>{toastMsg.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/60 to-slate-950 border border-slate-800 backdrop-blur-xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#00f2fe]/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Cpu className="w-5 h-5 text-[#00f2fe]" />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-white tracking-tight font-mono flex items-center gap-2">
                EQUIPMENT THRESHOLD ANALYZER
                <span className="px-2 py-0.5 rounded-full bg-cyan-950 text-[#00f2fe] border border-cyan-500/30 text-[10px] font-bold">
                  AI ENGINE
                </span>
              </h2>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Dataset Ingestion • Open-Source Statistical Safe Limits • ntfy.sh Real-Time Alert Dispatch
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleLoadSampleDataset}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 transition-all hover:text-white"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#00f2fe]" />
            Load Sample Dataset
          </button>
        </div>
      </div>

      {/* Section 1: Drag-and-Drop Ingestion */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all relative overflow-hidden backdrop-blur-xl ${
              dragOver
                ? 'border-[#00f2fe] bg-cyan-950/30 shadow-[0_0_25px_rgba(0,242,254,0.25)]'
                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/80'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv,.json,.pdf,.txt"
              className="hidden"
            />
            <div className="flex flex-col items-center justify-center space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-[#00f2fe] shadow-[0_0_20px_rgba(0,242,254,0.15)]">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-mono font-bold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Drop equipment PDF datasheet, CSV, or JSON here or click to browse'}
                </p>
                <p className="text-xs text-slate-400 font-mono mt-1">
                  Supports PDF Component Datasheets, CSV Telemetry Logs, or JSON Sensor Arrays
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300">
                <Sparkles className="w-3 h-3 text-[#00f2fe]" />
                Automated statistical bounds calculation
              </span>
            </div>
          </div>

          {/* AI Calculated Safe Limits Cards */}
          {analysisResult ? (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-[#00f2fe]" />
                  <h3 className="text-sm font-bold font-mono text-white uppercase tracking-wider">
                    Calculated Safe Limits (Dataset Extracted)
                  </h3>
                </div>
                <span className="text-xs font-mono text-slate-400">
                  {analysisResult.stats.totalRows} data points analyzed
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                {/* Voltage Card */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#00f2fe]" />
                      VOLTAGE (V)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-800">
                      V_BUS
                    </span>
                  </div>
                  <div className="space-y-1.5 font-mono">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Minimum:</span>
                      <span className="text-emerald-400 font-bold">{analysisResult.stats.voltage.min} V</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Maximum:</span>
                      <span className="text-rose-400 font-bold">{analysisResult.stats.voltage.max} V</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                      <span>Avg: {analysisResult.stats.voltage.avg} V</span>
                      <span className="text-[#00f2fe]">Rec: {analysisResult.recommendedThresholds.voltage.min} - {analysisResult.recommendedThresholds.voltage.max}V</span>
                    </div>
                  </div>
                </div>

                {/* Current Card */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-emerald-400" />
                      CURRENT (mA)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                      I_SHUNT
                    </span>
                  </div>
                  <div className="space-y-1.5 font-mono">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Minimum:</span>
                      <span className="text-emerald-400 font-bold">{analysisResult.stats.current.min} mA</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Maximum:</span>
                      <span className="text-rose-400 font-bold">{analysisResult.stats.current.max} mA</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                      <span>Avg: {analysisResult.stats.current.avg} mA</span>
                      <span className="text-emerald-400">Rec: ≤ {analysisResult.recommendedThresholds.current.max}mA</span>
                    </div>
                  </div>
                </div>

                {/* Temperature Card */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                      <Thermometer className="w-3.5 h-3.5 text-amber-400" />
                      TEMPERATURE (°C)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950 text-amber-300 border border-amber-800">
                      THERMAL
                    </span>
                  </div>
                  <div className="space-y-1.5 font-mono">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Minimum:</span>
                      <span className="text-cyan-400 font-bold">{analysisResult.stats.temperature.min} °C</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Maximum:</span>
                      <span className="text-rose-400 font-bold">{analysisResult.stats.temperature.max} °C</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                      <span>Avg: {analysisResult.stats.temperature.avg} °C</span>
                      <span className="text-amber-400">Rec: ≤ {analysisResult.recommendedThresholds.temperature.max}°C</span>
                    </div>
                  </div>
                </div>

                {/* Humidity Card */}
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 backdrop-blur-md relative overflow-hidden">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                      <Droplets className="w-3.5 h-3.5 text-blue-400" />
                      HUMIDITY (%)
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                      RH %
                    </span>
                  </div>
                  <div className="space-y-1.5 font-mono">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Minimum:</span>
                      <span className="text-emerald-400 font-bold">{analysisResult.stats.humidity.min} %</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400">Maximum:</span>
                      <span className="text-rose-400 font-bold">{analysisResult.stats.humidity.max} %</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-800">
                      <span>Avg: {analysisResult.stats.humidity.avg} %</span>
                      <span className="text-blue-400">Rec: {analysisResult.recommendedThresholds.humidity.min}-{analysisResult.recommendedThresholds.humidity.max}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action: Apply AI Presets */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 backdrop-blur-md">
                <div className="text-xs font-mono text-cyan-200">
                  <p className="font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00f2fe]" />
                    AI Recommendation Ready
                  </p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {analysisResult.summaryText}
                  </p>
                </div>
                <button
                  onClick={handleApplyAiThresholds}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#00f2fe] hover:brightness-110 text-slate-950 shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  Apply AI Calculated Thresholds
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 text-center font-mono text-xs text-slate-500">
              Upload a dataset above or click &quot;Load Sample Dataset&quot; to calculate equipment baseline limits.
            </div>
          )}
        </div>

        {/* Section 2: ntfy.sh Real-Time Alert Settings Card */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative overflow-hidden space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold font-mono text-white tracking-wide">
                  NTFY.SH ALERT SYSTEM
                </h3>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${
                ntfyConfig.enabled
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}>
                {ntfyConfig.enabled ? 'ACTIVE' : 'DISABLED'}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono leading-relaxed">
              Dispatches instant push alerts to mobile phones and desktops via the free, open-source{' '}
              <a href="https://ntfy.sh" target="_blank" rel="noreferrer" className="text-[#00f2fe] underline">
                ntfy.sh
              </a>{' '}
              relay when equipment exceeds safe boundaries.
            </p>

            {/* Toggle switch */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950/60 border border-slate-800">
              <span className="text-xs font-mono font-bold text-slate-200">
                Enable Push Alerts
              </span>
              <button
                type="button"
                onClick={() => {
                  const updated = { ...ntfyConfig, enabled: !ntfyConfig.enabled };
                  setNtfyConfig(updated);
                  saveNtfyConfig(updated);
                }}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out ${
                  ntfyConfig.enabled ? 'bg-[#00f2fe]' : 'bg-slate-800'
                }`}
              >
                <div
                  className={`bg-slate-950 w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    ntfyConfig.enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Topic Input */}
            <div className="space-y-1.5 font-mono">
              <label className="text-xs text-slate-300 font-bold block">
                ntfy Topic Name
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">ntfy.sh/</span>
                <input
                  type="text"
                  value={ntfyConfig.topic}
                  onChange={(e) => setNtfyConfig({ ...ntfyConfig, topic: e.target.value })}
                  placeholder="e.g. twincore_alerts_9025"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-slate-500">
                Subscribe in the free ntfy mobile app (Android/iOS) to receive push alerts.
              </p>
            </div>

            {/* Test & Save buttons */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={handleTestNtfy}
                disabled={isTestingNtfy}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-300 transition-all cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {isTestingNtfy ? 'Sending...' : 'Test Alert'}
              </button>
              <button
                onClick={handleSaveNtfy}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-mono font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                Save Topic
              </button>
            </div>

            {/* Threshold Breach Simulation Demo Box */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  Simulate Threshold Breach Demo
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-950 text-rose-400 border border-rose-800">
                  PUSH TO PHONE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Click any parameter below to immediately trigger an out-of-bounds surge that dispatches a high-priority alarm notification to your phone:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  disabled={isSimulatingBreach}
                  onClick={() => handleSimulateThresholdBreach('temperature')}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/40 text-rose-200 transition-all cursor-pointer"
                >
                  <Thermometer className="w-4 h-4 text-rose-400 mb-1" />
                  <span className="text-[10px] font-mono font-bold">Temp Surge</span>
                  <span className="text-[8px] text-rose-400">&gt;{thresholds.temperature.max}°C</span>
                </button>

                <button
                  type="button"
                  disabled={isSimulatingBreach}
                  onClick={() => handleSimulateThresholdBreach('voltage')}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-500/40 text-amber-200 transition-all cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-400 mb-1" />
                  <span className="text-[10px] font-mono font-bold">Overvoltage</span>
                  <span className="text-[8px] text-amber-400">&gt;{thresholds.voltage.max}V</span>
                </button>

                <button
                  type="button"
                  disabled={isSimulatingBreach}
                  onClick={() => handleSimulateThresholdBreach('current')}
                  className="flex flex-col items-center justify-center p-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-500/40 text-cyan-200 transition-all cursor-pointer"
                >
                  <Activity className="w-4 h-4 text-cyan-400 mb-1" />
                  <span className="text-[10px] font-mono font-bold">Overcurrent</span>
                  <span className="text-[8px] text-cyan-400">&gt;{thresholds.current.max}mA</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Adjustable Thresholds Control Panel */}
      <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 backdrop-blur-xl relative space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#00f2fe]" />
            <div>
              <h3 className="text-base font-bold font-mono text-white tracking-wide">
                ADJUSTABLE THRESHOLDS CONTROL PANEL
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Real-time bounds continuously enforced against live telemetry packets
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setThresholds(DEFAULT_THRESHOLDS);
                saveThresholds(DEFAULT_THRESHOLDS);
                if (onThresholdsUpdated) onThresholdsUpdated(DEFAULT_THRESHOLDS);
                showToast('Reset thresholds to factory defaults', 'info');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-mono text-slate-400 hover:text-slate-200 bg-slate-800/60 border border-slate-700"
            >
              Reset Defaults
            </button>
            <button
              onClick={handleSaveThresholds}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Threshold Settings
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-mono">
          {/* Voltage Thresholds */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#00f2fe]" />
                Voltage Bounds (V)
              </span>
              <span className="text-[10px] text-cyan-400">
                Range: 0V - 30V
              </span>
            </div>

            {/* Min Input & Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Minimum Safe Voltage:</span>
                <span className="text-emerald-400 font-bold">{thresholds.voltage.min} V</span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.1"
                value={thresholds.voltage.min}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    voltage: { ...thresholds.voltage, min: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            {/* Max Input & Slider */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Maximum Safe Voltage:</span>
                <span className="text-rose-400 font-bold">{thresholds.voltage.max} V</span>
              </div>
              <input
                type="range"
                min="0"
                max="30"
                step="0.1"
                value={thresholds.voltage.max}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    voltage: { ...thresholds.voltage, max: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Current Thresholds */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                Current Bounds (mA)
              </span>
              <span className="text-[10px] text-emerald-400">
                Range: 0mA - 3000mA
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Minimum Current:</span>
                <span className="text-emerald-400 font-bold">{thresholds.current.min} mA</span>
              </div>
              <input
                type="range"
                min="0"
                max="1000"
                step="10"
                value={thresholds.current.min}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    current: { ...thresholds.current, min: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Maximum Current (Overcurrent):</span>
                <span className="text-rose-400 font-bold">{thresholds.current.max} mA</span>
              </div>
              <input
                type="range"
                min="100"
                max="3000"
                step="25"
                value={thresholds.current.max}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    current: { ...thresholds.current, max: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>

          {/* Temperature Thresholds */}
          <div className="p-5 rounded-xl bg-slate-950/70 border border-slate-800/80 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-400" />
                Temperature Bounds (°C)
              </span>
              <span className="text-[10px] text-amber-400">
                Range: -40°C - +85°C
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Low Temp (Frost Alarm):</span>
                <span className="text-cyan-400 font-bold">{thresholds.temperature.min} °C</span>
              </div>
              <input
                type="range"
                min="-40"
                max="25"
                step="1"
                value={thresholds.temperature.min}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    temperature: { ...thresholds.temperature, min: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-slate-400">
                <span>High Temp (Thermal Alarm):</span>
                <span className="text-rose-400 font-bold">{thresholds.temperature.max} °C</span>
              </div>
              <input
                type="range"
                min="20"
                max="85"
                step="1"
                value={thresholds.temperature.max}
                onChange={(e) =>
                  setThresholds({
                    ...thresholds,
                    temperature: { ...thresholds.temperature, max: parseFloat(e.target.value) }
                  })
                }
                className="w-full accent-rose-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
