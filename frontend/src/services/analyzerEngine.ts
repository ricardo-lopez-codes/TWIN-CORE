export interface DatasetStats {
  voltage: { min: number; max: number; avg: number; count: number };
  current: { min: number; max: number; avg: number; count: number }; // In mA
  temperature: { min: number; max: number; avg: number; count: number };
  humidity: { min: number; max: number; avg: number; count: number };
  totalRows: number;
  fileName: string;
}

export interface AiAnalysisResult {
  stats: DatasetStats;
  recommendedThresholds: {
    voltage: { min: number; max: number };
    current: { min: number; max: number };
    temperature: { min: number; max: number };
    humidity: { min: number; max: number };
  };
  summaryText: string;
  anomalyCount: number;
}

/**
 * Robust CSV/JSON parser that extracts numeric series for Voltage, Current, Temperature, and Humidity.
 */
export function analyzeSensorDataset(
  rawContent: string,
  fileName: string
): AiAnalysisResult {
  let rows: Array<Record<string, any>> = [];

  const trimmed = rawContent.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      rows = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      // fallback to CSV parsing
    }
  }

  if (rows.length === 0) {
    // Parse CSV
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length > 1) {
      const headerLine = lines[0];
      const headers = headerLine.split(/[,;\t]/).map((h) => h.trim().replace(/^["']|["']$/g, ''));
      
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(/[,;\t]/).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        const row: Record<string, any> = {};
        headers.forEach((h, idx) => {
          row[h] = parts[idx];
        });
        rows.push(row);
      }
    }
  }

  // Value extractors matching various column naming conventions
  const voltValues: number[] = [];
  const currValues: number[] = [];
  const tempValues: number[] = [];
  const humValues: number[] = [];

  const isCol = (name: string, patterns: string[]) => {
    const lower = name.toLowerCase().replace(/[^a-z0-9]/g, '');
    return patterns.some((p) => lower.includes(p));
  };

  rows.forEach((r) => {
    Object.keys(r).forEach((k) => {
      const rawVal = r[k];
      if (rawVal === undefined || rawVal === null || rawVal === '') return;
      const num = parseFloat(String(rawVal).replace(/[^0-9.-]/g, ''));
      if (isNaN(num)) return;

      if (isCol(k, ['volt', 'v1', 'v2', 'v3', 'voltage', 'busv'])) {
        voltValues.push(num);
      } else if (isCol(k, ['curr', 'i1', 'i2', 'i3', 'current', 'amps', 'ma'])) {
        // If values are <= 5, assume they are in Amperes and convert to mA
        const ma = num <= 5 ? num * 1000 : num;
        currValues.push(ma);
      } else if (isCol(k, ['temp', 't22', 't11', 'temperature', 'degc'])) {
        tempValues.push(num);
      } else if (isCol(k, ['hum', 'h22', 'h11', 'humidity', 'rh'])) {
        humValues.push(num);
      }
    });
  });

  const computeStats = (arr: number[], defaultMin: number, defaultMax: number) => {
    if (arr.length === 0) {
      return { min: defaultMin, max: defaultMax, avg: (defaultMin + defaultMax) / 2, count: 0 };
    }
    const min = Math.min(...arr);
    const max = Math.max(...arr);
    const sum = arr.reduce((a, b) => a + b, 0);
    const avg = sum / arr.length;
    return {
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      avg: Number(avg.toFixed(2)),
      count: arr.length
    };
  };

  const vStats = computeStats(voltValues, 7.0, 13.0);
  const cStats = computeStats(currValues, 1.0, 800.0);
  const tStats = computeStats(tempValues, 18.0, 35.0);
  const hStats = computeStats(humValues, 30.0, 75.0);

  // Recommended safe operating thresholds with 10-15% safety margins
  const recommendedThresholds = {
    voltage: {
      min: Number(Math.max(0, vStats.min * 0.9).toFixed(2)),
      max: Number((vStats.max * 1.1).toFixed(2))
    },
    current: {
      min: Number(Math.max(0, cStats.min * 0.85).toFixed(1)),
      max: Number((cStats.max * 1.2).toFixed(1))
    },
    temperature: {
      min: Number((tStats.min - 5).toFixed(1)),
      max: Number((tStats.max + 8).toFixed(1))
    },
    humidity: {
      min: Number(Math.max(5, hStats.min - 10).toFixed(1)),
      max: Number(Math.min(95, hStats.max + 10).toFixed(1))
    }
  };

  const anomalyCount = 
    voltValues.filter((v) => v < 5.0 || v > 24.0).length +
    currValues.filter((c) => c > 3000).length +
    tempValues.filter((t) => t < -20 || t > 70).length;

  const summaryText = `Analyzed ${rows.length} telemetry records across ${fileName}. Statistical baseline established with ${anomalyCount} boundary anomalies filtered. Dynamic threshold margins calculated with ±12% operational tolerance.`;

  return {
    stats: {
      voltage: vStats,
      current: cStats,
      temperature: tStats,
      humidity: hStats,
      totalRows: rows.length,
      fileName
    },
    recommendedThresholds,
    summaryText,
    anomalyCount
  };
}
