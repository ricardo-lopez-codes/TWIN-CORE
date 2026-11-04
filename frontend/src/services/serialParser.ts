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
    m1: number | null;
    m2: number | null;
    m3: number | null;
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
    ina3221: { v1: 0, v2: 0, v3: 0, m1: 0, m2: 0, m3: 0 }
  };

  // Format: "DHT22:T=26.3,H=55.3;DHT11:T=nan,H=nan;INA:V1=0.000,V2=0.000,V3=0.000;SH:m1=0.00,m2=0.00,m3=0.00"
  const sections = payload.split(';');

  for (const section of sections) {
    const trimmed = section.trim();
    if (!trimmed) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) continue;

    const tag = trimmed.slice(0, colonIdx).trim().toUpperCase();
    const kvPairs = trimmed.slice(colonIdx + 1).split(',');

    const map: Record<string, string> = {};
    for (const pair of kvPairs) {
      const [k, v] = pair.split('=').map((s) => s.trim());
      if (k && v !== undefined) {
        map[k] = v;
      }
    }

    if (tag === 'DHT22') {
      const t = parseFloat(map['T']);
      const h = parseFloat(map['H']);
      const isTOk = !isNaN(t) && map['T']?.toLowerCase() !== 'nan';
      const isHOk = !isNaN(h) && map['H']?.toLowerCase() !== 'nan';

      result.dht22 = {
        temperature: isTOk ? t : null,
        humidity: isHOk ? h : null,
        status: isTOk || isHOk ? 'ACTIVE' : 'OFFLINE'
      };
    } else if (tag === 'DHT11') {
      const t = parseFloat(map['T']);
      const h = parseFloat(map['H']);
      const isTOk = !isNaN(t) && map['T']?.toLowerCase() !== 'nan';
      const isHOk = !isNaN(h) && map['H']?.toLowerCase() !== 'nan';

      result.dht11 = {
        temperature: isTOk ? t : null,
        humidity: isHOk ? h : null,
        status: isTOk || isHOk ? 'ACTIVE' : 'OFFLINE'
      };
    } else if (tag === 'INA') {
      const parseVal = (key: string) => {
        const val = parseFloat(map[key]);
        return isNaN(val) ? 0 : val;
      };
      result.ina3221.v1 = parseVal('V1');
      result.ina3221.v2 = parseVal('V2');
      result.ina3221.v3 = parseVal('V3');
    } else if (tag === 'SH') {
      const parseVal = (key: string) => {
        const val = parseFloat(map[key]);
        return isNaN(val) ? 0 : val;
      };
      result.ina3221.m1 = parseVal('m1');
      result.ina3221.m2 = parseVal('m2');
      result.ina3221.m3 = parseVal('m3');
    }
  }

  return result;
}

export function generateMockSerialString(tick: number): string {
  // Realistic varying readings
  const t22 = (26.0 + Math.sin(tick * 0.2) * 1.8 + Math.random() * 0.3).toFixed(1);
  const h22 = (54.0 + Math.cos(tick * 0.15) * 4.0 + Math.random() * 0.5).toFixed(1);

  // DHT11 intermittently offline or fluctuating
  let dht11Part = 'DHT11:T=nan,H=nan';
  if (tick % 4 === 0) {
    const t11 = (27.2 + Math.sin(tick * 0.3) * 1.2).toFixed(1);
    const h11 = (58.5 + Math.cos(tick * 0.2) * 2.0).toFixed(1);
    dht11Part = `DHT11:T=${t11},H=${h11}`;
  }

  const v1 = (12.1 + Math.sin(tick * 0.1) * 0.35).toFixed(3);
  const v2 = (5.02 + Math.cos(tick * 0.08) * 0.08).toFixed(3);
  const v3 = (3.31 + Math.sin(tick * 0.05) * 0.03).toFixed(3);

  const m1 = (14.2 + Math.sin(tick * 0.25) * 2.5).toFixed(2);
  const m2 = (8.4 + Math.cos(tick * 0.2) * 1.2).toFixed(2);
  const m3 = (2.1 + Math.sin(tick * 0.15) * 0.6).toFixed(2);

  return `[Received from Master]: DHT22:T=${t22},H=${h22};${dht11Part};INA:V1=${v1},V2=${v2},V3=${v3};SH:m1=${m1},m2=${m2},m3=${m3}`;
}
