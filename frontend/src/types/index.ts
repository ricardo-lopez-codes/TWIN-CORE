export type DataMode = 'SIMULATION' | 'HARDWARE_CONNECTED' | 'HARDWARE_DISCONNECTED';

export type SeverityLevel = 'NORMAL' | 'WARNING' | 'CRITICAL' | 'OFFLINE';

export interface SensorReading {
  timestamp: string;
  source: DataMode;
  temperature_c: number;
  pressure_kpa: number;
  voltage_v: number;
  current_a: number;
  power_w: number;
  power_is_estimated: boolean;
  fan_state: boolean;
  mosfet_state: string;
  packet_seq?: number;
  is_valid: boolean;
  freshness_status: string;
  severity: SeverityLevel;
  device_id?: string;
  lora_rssi?: number;
  lora_snr?: number;
}

export interface ThresholdSettings {
  temp_warn: number;
  temp_crit: number;
  temp_hysteresis: number;
  pressure_warn: number;
  pressure_crit: number;
  pressure_hysteresis: number;
  power_warn: number;
  power_crit: number;
  power_hysteresis: number;
  voltage_min: number;
  voltage_max: number;
  current_max: number;
}

export interface DigitalTwinInput {
  ambient_temperature_c: number;
  atmospheric_pressure_kpa: number;
  electronic_load_pct: number;
  duration_minutes: number;
  relative_humidity_pct: number;
  battery_age_cycles: number;
  cooling_mode: string;
  cold_start: boolean;
}

export interface DigitalTwinPoint {
  time_min: number;
  pcb_temperature_c: number;
  ambient_temperature_c: number;
  stress_index: number;
}

export interface DigitalTwinResult {
  estimated_pcb_temperature_c: number;
  cold_start_stress: number;
  estimated_battery_capacity_pct: number;
  estimated_battery_voltage_drop_v: number;
  combined_stress_index: number;
  relative_air_density_proxy: number;
  cooling_efficiency_factor: number;
  steady_state_temp_rise_c: number;
  risk_classification: string;
  recommendations: string[];
  time_series: DigitalTwinPoint[];
  disclaimer: string;
}

export interface EventLog {
  id: number;
  timestamp: string;
  severity: SeverityLevel;
  category: string;
  source: string;
  description: string;
  action_taken: string;
  acknowledged: boolean;
  recovery_confirmed: boolean;
}

export interface EventSummary {
  active_warnings: number;
  critical_faults: number;
  session_events: number;
  recent_actions: Array<{
    timestamp: string;
    action: string;
    reason: string;
  }>;
}

export interface DemoTimelineEntry {
  timestamp: string;
  step: number;
  message: string;
  severity: string;
}

export interface TempDemoState {
  name: string;
  running: boolean;
  phase: string;
  temperature_c: number;
  pressure_kpa: number;
  voltage_v: number;
  current_a: number;
  power_w: number;
  warn_threshold: number;
  crit_threshold: number;
  recovery_threshold: number;
  simulated_fan_state: boolean;
  simulated_mosfet_state: string;
  time_above_threshold_s: number;
  recovery_status: string;
  severity: SeverityLevel;
  timeline: DemoTimelineEntry[];
  invariants_maintained: boolean;
}

export interface PressureDemoState {
  name: string;
  running: boolean;
  phase: string;
  pressure_kpa: number;
  temperature_c: number;
  voltage_v: number;
  current_a: number;
  power_w: number;
  warn_threshold: number;
  crit_threshold: number;
  recovery_threshold: number;
  strategy: string;
  simulated_pump_running: boolean;
  simulated_vent_valve_open: boolean;
  recovery_status: string;
  severity: SeverityLevel;
  timeline: DemoTimelineEntry[];
  invariants_maintained: boolean;
  educational_note: string;
}

export interface PowerDemoState {
  name: string;
  running: boolean;
  phase: string;
  voltage_v: number;
  current_a: number;
  power_w: number;
  temperature_c: number;
  pressure_kpa: number;
  warn_threshold: number;
  crit_threshold: number;
  recovery_threshold: number;
  load_control_pct: number;
  simulated_mosfet_state: string;
  recovery_status: string;
  severity: SeverityLevel;
  timeline: DemoTimelineEntry[];
  invariants_maintained: boolean;
  safety_note: string;
}

export interface GatewayModeInfo {
  mode: DataMode;
  serial_port: string;
  baud_rate: number;
  is_connected: boolean;
  last_packet_time: number | null;
}

export interface SerialPortInfo {
  device: string;
  description: string;
  manufacturer: string;
  is_esp32: boolean;
}
