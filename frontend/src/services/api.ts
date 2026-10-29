import {
  SensorReading,
  ThresholdSettings,
  DigitalTwinInput,
  DigitalTwinResult,
  EventLog,
  EventSummary,
  GatewayModeInfo,
  SerialPortInfo,
  DataMode
} from '../types';

const API_BASE = '/api';

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}

export async function fetchLatestReading(): Promise<SensorReading> {
  const res = await fetch(`${API_BASE}/readings/latest`);
  return res.json();
}

export async function fetchReadingsHistory(minutes = 15, limit = 300, source?: string) {
  const params = new URLSearchParams({ minutes: minutes.toString(), limit: limit.toString() });
  if (source) params.append('source', source);
  const res = await fetch(`${API_BASE}/readings/history?${params}`);
  return res.json();
}

export async function fetchEvents(limit = 100, severity?: string, acknowledged?: boolean): Promise<EventLog[]> {
  const params = new URLSearchParams({ limit: limit.toString() });
  if (severity) params.append('severity', severity);
  if (acknowledged !== undefined) params.append('acknowledged', acknowledged.toString());
  const res = await fetch(`${API_BASE}/events?${params}`);
  return res.json();
}

export async function fetchEventSummary(): Promise<EventSummary> {
  const res = await fetch(`${API_BASE}/events/summary`);
  return res.json();
}

export async function ackEvent(id: number) {
  const res = await fetch(`${API_BASE}/events/${id}/ack`, { method: 'POST' });
  return res.json();
}

export async function ackAllEvents() {
  const res = await fetch(`${API_BASE}/events/ack-all`, { method: 'POST' });
  return res.json();
}

export async function fetchThresholds(): Promise<ThresholdSettings> {
  const res = await fetch(`${API_BASE}/settings/thresholds`);
  return res.json();
}

export async function updateThresholds(thresholds: ThresholdSettings): Promise<ThresholdSettings> {
  const res = await fetch(`${API_BASE}/settings/thresholds`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(thresholds)
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail ? JSON.stringify(err.detail) : 'Failed to update thresholds');
  }
  return res.json();
}

export async function fetchMode(): Promise<GatewayModeInfo> {
  const res = await fetch(`${API_BASE}/settings/mode`);
  return res.json();
}

export async function setMode(mode: DataMode, serial_port = 'AUTO', baud_rate = 115200) {
  const res = await fetch(`${API_BASE}/settings/mode`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, serial_port, baud_rate })
  });
  return res.json();
}

export async function fetchSerialPorts(): Promise<SerialPortInfo[]> {
  const res = await fetch(`${API_BASE}/settings/ports`);
  return res.json();
}

export async function runDigitalTwin(inputs: DigitalTwinInput): Promise<DigitalTwinResult> {
  const res = await fetch(`${API_BASE}/simulation/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(inputs)
  });
  return res.json();
}

export async function fetchDemoState(demoType: string) {
  const res = await fetch(`${API_BASE}/demos/${demoType}/state`);
  return res.json();
}

export async function sendDemoAction(demoType: string, action: string, value?: number, strategy?: string) {
  const res = await fetch(`${API_BASE}/demos/${demoType}/action`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, value, strategy })
  });
  return res.json();
}

export const EXPORT_URLS = {
  simulationCsv: `${API_BASE}/simulation/export`,
  readingsCsv: (mins = 60) => `${API_BASE}/readings/export?minutes=${mins}`,
  eventsCsv: `${API_BASE}/events/export`
};
