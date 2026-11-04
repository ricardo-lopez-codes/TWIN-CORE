export interface TelemetryData {
  timestamp: string;
  timeStr: string;
  raw: string;
  dht22: {
    temperature: number | null;
    humidity: number | null;
    status: 'ACTIVE' | 'OFFLINE';
  };
  dht11: {
    temperature: number | null;
    humidity: number | null;
    status: 'ACTIVE' | 'OFFLINE';
  };
  ina3221: {
    v1: number | null;
    v2: number | null;
    v3: number | null;
    i1: number | null;
    i2: number | null;
    i3: number | null;
    m1: number | null;
    m2: number | null;
    m3: number | null;
  };
  gps: {
    lat: number | null;
    lon: number | null;
    gpsStatus: number;
    satCount: number;
    hasFix: boolean;
  };
}

export function parseSerialPayload(rawInput: string): TelemetryData {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();

  // Strip prefix like "[Received from Master]: " if present
  let payload = rawInput.trim();
  const prefixMatch = payload.match(/\[Received from Master\]:\s*(.*)/i);
  if (prefixMatch) {
    payload = prefixMatch[1].trim();
  }

  const result: TelemetryData = {
    timestamp: now.toISOString(),
    timeStr,
    raw: rawInput.trim(),
    dht22: { temperature: null, humidity: null, status: 'OFFLINE' },
    dht11: { temperature: null, humidity: null, status: 'OFFLINE' },
    ina3221: { v1: 0, v2: 0, v3: 0, i1: 0, i2: 0, i3: 0, m1: 0, m2: 0, m3: 0 },
    gps: { lat: 0, lon: 0, gpsStatus: 0, satCount: 0, hasFix: false }
  };

  const parseNum = (valStr: string | undefined): number | null => {
    if (!valStr) return null;
    const lower = valStr.trim().toLowerCase();
    if (lower === 'nan' || lower === 'null' || lower === 'inf' || lower === '-inf') return null;
    const num = parseFloat(lower);
    return isNaN(num) ? null : num;
  };

  // Check Format 1 (Current Master Output from Serial Monitor):
  // "T22:26.6,H22:53.3;T11:nan,H11:nan;V1:7.63,I1:0.001;V2:7.63,I2:0.001;V3:7.63,I3:0.001;LAT:0.000000,LON:0.000000;GPS:0,SAT:0"
  // Check Format 2 (Standard Key=Value):
  // "DHT22:T=26.3,H=55.3;DHT11:T=nan,H=nan;INA:V1=0.000,V2=0.000,V3=0.000;SH:m1=0.00,m2=0.00,m3=0.00"

  const sections = payload.split(';');

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    // Split sub-tokens by comma
    const tokens = trimmed.split(',');

    for (const token of tokens) {
      const item = token.trim();
      if (!item) continue;

      // Handle colon separator (e.g., T22:26.6 or V1:7.63 or DHT22:T=26.3)
      // Check if it's "TAG:KEY=VAL,KEY=VAL"
      if (item.includes('=')) {
        // Tagged key=value format (e.g. DHT22:T=26.3 or just T=26.3)
        const parts = item.split(':');
        const kvPart = parts.length > 1 ? parts[1] : parts[0];
        const [k, v] = kvPart.split('=').map((s) => s.trim());
        const tag = parts.length > 1 ? parts[0].toUpperCase() : '';

        const val = parseNum(v);

        if (tag === 'DHT22' || k === 'T22' || (tag === '' && k === 'T')) {
          if (k === 'T' || k === 'T22') {
            result.dht22.temperature = val;
            if (val !== null) result.dht22.status = 'ACTIVE';
          } else if (k === 'H' || k === 'H22') {
            result.dht22.humidity = val;
            if (val !== null) result.dht22.status = 'ACTIVE';
          }
        } else if (tag === 'DHT11' || k === 'T11') {
          if (k === 'T' || k === 'T11') {
            result.dht11.temperature = val;
            if (val !== null) result.dht11.status = 'ACTIVE';
          } else if (k === 'H' || k === 'H11') {
            result.dht11.humidity = val;
            if (val !== null) result.dht11.status = 'ACTIVE';
          }
        } else if (k === 'V1') result.ina3221.v1 = val;
        else if (k === 'V2') result.ina3221.v2 = val;
        else if (k === 'V3') result.ina3221.v3 = val;
        else if (k === 'I1') result.ina3221.i1 = val;
        else if (k === 'I2') result.ina3221.i2 = val;
        else if (k === 'I3') result.ina3221.i3 = val;
        else if (k === 'm1') result.ina3221.m1 = val;
        else if (k === 'm2') result.ina3221.m2 = val;
        else if (k === 'm3') result.ina3221.m3 = val;
        else if (k === 'LAT') result.gps.lat = val;
        else if (k === 'LON') result.gps.lon = val;
      } else if (item.includes(':')) {
        // Direct Key:Value format (e.g., T22:26.6, H22:53.3, V1:7.63, I1:0.001, LAT:0.000000, GPS:0, SAT:0)
        const [kRaw, vRaw] = item.split(':').map((s) => s.trim());
        const k = kRaw.toUpperCase();
        const val = parseNum(vRaw);

        if (k === 'T22') {
          result.dht22.temperature = val;
          if (val !== null) result.dht22.status = 'ACTIVE';
        } else if (k === 'H22') {
          result.dht22.humidity = val;
          if (val !== null) result.dht22.status = 'ACTIVE';
        } else if (k === 'T11') {
          result.dht11.temperature = val;
          if (val !== null) result.dht11.status = 'ACTIVE';
        } else if (k === 'H11') {
          result.dht11.humidity = val;
          if (val !== null) result.dht11.status = 'ACTIVE';
        } else if (k === 'V1') {
          result.ina3221.v1 = val;
        } else if (k === 'V2') {
          result.ina3221.v2 = val;
        } else if (k === 'V3') {
          result.ina3221.v3 = val;
        } else if (k === 'I1') {
          result.ina3221.i1 = val;
        } else if (k === 'I2') {
          result.ina3221.i2 = val;
        } else if (k === 'I3') {
          result.ina3221.i3 = val;
        } else if (k === 'M1') {
          result.ina3221.m1 = val;
        } else if (k === 'M2') {
          result.ina3221.m2 = val;
        } else if (k === 'M3') {
          result.ina3221.m3 = val;
        } else if (k === 'LAT') {
          result.gps.lat = val;
        } else if (k === 'LON') {
          result.gps.lon = val;
        } else if (k === 'GPS') {
          result.gps.gpsStatus = val !== null ? Math.round(val) : 0;
          result.gps.hasFix = (val ?? 0) > 0;
        } else if (k === 'SAT') {
          result.gps.satCount = val !== null ? Math.round(val) : 0;
        }
      }
    }
  }

  // Final check for DHT sensor status
  if (result.dht22.temperature !== null || result.dht22.humidity !== null) {
    result.dht22.status = 'ACTIVE';
  } else {
    result.dht22.status = 'OFFLINE';
  }

  if (result.dht11.temperature !== null || result.dht11.humidity !== null) {
    result.dht11.status = 'ACTIVE';
  } else {
    result.dht11.status = 'OFFLINE';
  }

  return result;
}

export function generateMockSerialString(tick: number): string {
  const t22 = (26.6 + Math.sin(tick * 0.2) * 0.8 + Math.random() * 0.1).toFixed(1);
  const h22 = (53.3 + Math.cos(tick * 0.15) * 1.5 + Math.random() * 0.2).toFixed(1);

  // DHT11 intermittently offline or reading
  let dht11Part = 'T11:nan,H11:nan';
  if (tick % 5 === 0) {
    const t11 = (27.2 + Math.sin(tick * 0.3) * 0.5).toFixed(1);
    const h11 = (58.5 + Math.cos(tick * 0.2) * 1.0).toFixed(1);
    dht11Part = `T11:${t11},H11:${h11}`;
  }

  const v1 = (7.64 + Math.sin(tick * 0.1) * 0.05).toFixed(2);
  const v2 = (7.64 + Math.cos(tick * 0.08) * 0.04).toFixed(2);
  const v3 = (7.66 + Math.sin(tick * 0.05) * 0.05).toFixed(2);

  const i1 = (0.001 + Math.random() * 0.002).toFixed(3);
  const i2 = (0.001 + Math.random() * 0.002).toFixed(3);
  const i3 = (0.001 + Math.random() * 0.002).toFixed(3);

  return `[Received from Master]: T22:${t22},H22:${h22};${dht11Part};V1:${v1},I1:${i1};V2:${v2},I2:${i2};V3:${v3},I3:${i3};LAT:34.152600,LON:77.577100;GPS:1,SAT:8`;
}
