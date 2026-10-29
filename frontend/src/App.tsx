import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar, PageId } from './components/Sidebar';
import { OverviewPage } from './pages/OverviewPage';
import { LiveMonitoringPage } from './pages/LiveMonitoringPage';
import { TempDemoPage } from './pages/TempDemoPage';
import { PressureDemoPage } from './pages/PressureDemoPage';
import { PowerDemoPage } from './pages/PowerDemoPage';
import { DigitalTwinPage } from './pages/DigitalTwinPage';
import { EventLogsPage } from './pages/EventLogsPage';
import { SettingsPage } from './pages/SettingsPage';

import {
  SensorReading,
  ThresholdSettings,
  EventSummary,
  TempDemoState,
  PressureDemoState,
  PowerDemoState,
  DataMode,
  SeverityLevel
} from './types';
import { fetchLatestReading, fetchReadingsHistory, fetchThresholds, fetchEventSummary, fetchMode } from './services/api';
import { wsService, LiveTelemetryMessage } from './services/websocket';

const INITIAL_READING: SensorReading = {
  timestamp: new Date().toISOString(),
  source: 'SIMULATION',
  temperature_c: 24.8,
  pressure_kpa: 69.5,
  voltage_v: 12.02,
  current_a: 0.51,
  power_w: 6.13,
  power_is_estimated: true,
  fan_state: false,
  mosfet_state: 'ACTIVE',
  packet_seq: 1,
  is_valid: true,
  freshness_status: 'FRESH',
  severity: 'NORMAL',
  device_id: 'SIM-UNIT1'
};

const INITIAL_THRESHOLDS: ThresholdSettings = {
  temp_warn: 60.0,
  temp_crit: 70.0,
  temp_hysteresis: 3.0,
  pressure_warn: 65.0,
  pressure_crit: 55.0,
  pressure_hysteresis: 2.0,
  power_warn: 10.0,
  power_crit: 15.0,
  power_hysteresis: 1.0,
  voltage_min: 10.5,
  voltage_max: 14.5,
  current_max: 2.0
};

const INITIAL_EVENT_SUMMARY: EventSummary = {
  active_warnings: 0,
  critical_faults: 0,
  session_events: 0,
  recent_actions: []
};

const INITIAL_TEMP_DEMO: TempDemoState = {
  name: 'Temperature Anomaly Demo',
  running: false,
  phase: 'IDLE',
  temperature_c: 25.0,
  pressure_kpa: 70.0,
  voltage_v: 12.0,
  current_a: 0.5,
  power_w: 6.0,
  warn_threshold: 60.0,
  crit_threshold: 70.0,
  recovery_threshold: 57.0,
  simulated_fan_state: false,
  simulated_mosfet_state: 'ACTIVE',
  time_above_threshold_s: 0,
  recovery_status: 'NORMAL',
  severity: 'NORMAL',
  timeline: [],
  invariants_maintained: true
};

const INITIAL_PRESSURE_DEMO: PressureDemoState = {
  name: 'Pressure Anomaly Demo',
  running: false,
  phase: 'IDLE',
  pressure_kpa: 70.0,
  temperature_c: 25.0,
  voltage_v: 12.0,
  current_a: 0.5,
  power_w: 6.0,
  warn_threshold: 65.0,
  crit_threshold: 55.0,
  recovery_threshold: 67.0,
  strategy: 'chamber_vent',
  simulated_pump_running: true,
  simulated_vent_valve_open: false,
  recovery_status: 'NORMAL',
  severity: 'NORMAL',
  timeline: [],
  invariants_maintained: true,
  educational_note: ''
};

const INITIAL_POWER_DEMO: PowerDemoState = {
  name: 'Power Consumption Anomaly Demo',
  running: false,
  phase: 'IDLE',
  voltage_v: 12.0,
  current_a: 0.5,
  power_w: 6.0,
  temperature_c: 25.0,
  pressure_kpa: 70.0,
  warn_threshold: 10.0,
  crit_threshold: 15.0,
  recovery_threshold: 9.0,
  load_control_pct: 100.0,
  simulated_mosfet_state: 'ACTIVE',
  recovery_status: 'NORMAL',
  severity: 'NORMAL',
  timeline: [],
  invariants_maintained: true,
  safety_note: ''
};

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [mode, setModeState] = useState<DataMode>('SIMULATION');
  const [reading, setReading] = useState<SensorReading>(INITIAL_READING);
  const [history, setHistory] = useState<Array<any>>([]);
  const [thresholds, setThresholds] = useState<ThresholdSettings>(INITIAL_THRESHOLDS);
  const [eventSummary, setEventSummary] = useState<EventSummary>(INITIAL_EVENT_SUMMARY);
  const [timeRange, setTimeRange] = useState<string>('15m');
  const [activeDemoName, setActiveDemoName] = useState<string | null>(null);

  // Demo States
  const [tempDemoState, setTempDemoState] = useState<TempDemoState>(INITIAL_TEMP_DEMO);
  const [pressureDemoState, setPressureDemoState] = useState<PressureDemoState>(INITIAL_PRESSURE_DEMO);
  const [powerDemoState, setPowerDemoState] = useState<PowerDemoState>(INITIAL_POWER_DEMO);

  // Initial data loading
  useEffect(() => {
    const initData = async () => {
      try {
        const th = await fetchThresholds();
        if (th) setThresholds(th);

        const r = await fetchLatestReading();
        if (r) setReading(r);

        const m = await fetchMode();
        if (m && m.mode) setModeState(m.mode);

        const hist = await fetchReadingsHistory(15, 60);
        if (hist && hist.readings) setHistory(hist.readings);

        const ev = await fetchEventSummary();
        if (ev) setEventSummary(ev);
      } catch (err) {
        console.error('Initial data fetch error:', err);
      }
    };

    initData();
  }, []);

  // Subscribe to real-time WebSocket telemetry stream
  useEffect(() => {
    const unsubscribe = wsService.subscribe((msg: LiveTelemetryMessage) => {
      if (msg.reading) {
        setReading(msg.reading);
        // Append reading to chart history (keep up to 100 points)
        setHistory((prev) => {
          const next = [...prev, msg.reading];
          return next.length > 100 ? next.slice(-100) : next;
        });
      }
      if (msg.mode) {
        setModeState(msg.mode);
      }
      if (msg.event_summary) {
        setEventSummary(msg.event_summary);
      }
      setActiveDemoName(msg.active_demo);

      if (msg.demo_states) {
        if (msg.demo_states.temperature) setTempDemoState(msg.demo_states.temperature);
        if (msg.demo_states.pressure) setPressureDemoState(msg.demo_states.pressure);
        if (msg.demo_states.power) setPowerDemoState(msg.demo_states.power);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleTimeRangeChange = async (range: string) => {
    setTimeRange(range);
    let mins = 15;
    if (range === '1m') mins = 1;
    else if (range === '5m') mins = 5;
    else if (range === '15m') mins = 15;
    else if (range === '1h') mins = 60;

    try {
      const hist = await fetchReadingsHistory(mins, 150);
      if (hist && hist.readings) setHistory(hist.readings);
    } catch (e) {
      console.error('History fetch error:', e);
    }
  };

  const isStale = reading.freshness_status === 'STALE' || reading.freshness_status === 'OFFLINE';

  const renderContent = () => {
    switch (currentPage) {
      case 'overview':
        return (
          <OverviewPage
            reading={reading}
            history={history}
            eventSummary={eventSummary}
            thresholds={thresholds}
            timeRange={timeRange}
            onTimeRangeChange={handleTimeRangeChange}
            isStale={isStale}
          />
        );
      case 'live':
        return (
          <LiveMonitoringPage
            reading={reading}
            thresholds={thresholds}
            isStale={isStale}
          />
        );
      case 'demo_temp':
        return <TempDemoPage demoState={tempDemoState} />;
      case 'demo_pressure':
        return <PressureDemoPage demoState={pressureDemoState} />;
      case 'demo_power':
        return <PowerDemoPage demoState={powerDemoState} />;
      case 'digital_twin':
        return <DigitalTwinPage />;
      case 'events':
        return <EventLogsPage />;
      case 'settings':
        return (
          <SettingsPage
            thresholds={thresholds}
            onThresholdsUpdated={setThresholds}
            activeMode={mode}
            onModeChanged={setModeState}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 font-sans text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        currentPage={currentPage}
        onSelectPage={setCurrentPage}
        activeMode={mode}
        unreadWarningCount={eventSummary.active_warnings + eventSummary.critical_faults}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header
          mode={mode}
          lastTimestamp={reading.timestamp}
          isGatewayConnected={mode === 'HARDWARE_CONNECTED'}
          overallSeverity={reading.severity}
          activeDemoName={activeDemoName}
          rssi={reading.lora_rssi}
          snr={reading.lora_snr}
        />

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-50/70">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};
export default App;
