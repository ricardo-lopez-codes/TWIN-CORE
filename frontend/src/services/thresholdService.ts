export interface ThresholdLimits {
  min: number;
  max: number;
}

export interface SystemThresholds {
  voltage: ThresholdLimits;     // in Volts (V)
  current: ThresholdLimits;     // in Milliamperes (mA)
  temperature: ThresholdLimits; // in Celsius (°C)
  humidity: ThresholdLimits;    // in Percent (%)
}

export interface NtfyConfig {
  enabled: boolean;
  topic: string;
}

export interface ThresholdBreachAlert {
  id: string;
  timestamp: string;
  parameter: 'voltage' | 'current' | 'temperature' | 'humidity';
  label: string;
  value: number;
  unit: string;
  limitType: 'MIN' | 'MAX';
  limitValue: number;
  ntfyDispatched: boolean;
}

const STORAGE_KEY_THRESHOLDS = 'twincore_system_thresholds_v1';
const STORAGE_KEY_NTFY = 'twincore_ntfy_config_v1';

export const DEFAULT_THRESHOLDS: SystemThresholds = {
  voltage: { min: 6.5, max: 14.5 },
  current: { min: 0.0, max: 1500.0 }, // 0 to 1500 mA
  temperature: { min: -10.0, max: 45.0 },
  humidity: { min: 10.0, max: 90.0 }
};

export const DEFAULT_NTFY_CONFIG: NtfyConfig = {
  enabled: false,
  topic: `twincore_alerts_${Math.floor(1000 + Math.random() * 9000)}`
};

export function loadThresholds(): SystemThresholds {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_THRESHOLDS);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        voltage: { ...DEFAULT_THRESHOLDS.voltage, ...(parsed.voltage || {}) },
        current: { ...DEFAULT_THRESHOLDS.current, ...(parsed.current || {}) },
        temperature: { ...DEFAULT_THRESHOLDS.temperature, ...(parsed.temperature || {}) },
        humidity: { ...DEFAULT_THRESHOLDS.humidity, ...(parsed.humidity || {}) }
      };
    }
  } catch (e) {
    console.error('Failed to load thresholds from storage:', e);
  }
  return { ...DEFAULT_THRESHOLDS };
}

export function saveThresholds(thresholds: SystemThresholds): void {
  try {
    localStorage.setItem(STORAGE_KEY_THRESHOLDS, JSON.stringify(thresholds));
  } catch (e) {
    console.error('Failed to save thresholds to storage:', e);
  }
}

export function loadNtfyConfig(): NtfyConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_NTFY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        enabled: Boolean(parsed.enabled),
        topic: (parsed.topic || '').trim() || DEFAULT_NTFY_CONFIG.topic
      };
    }
  } catch (e) {
    console.error('Failed to load ntfy config:', e);
  }
  return { ...DEFAULT_NTFY_CONFIG };
}

export function saveNtfyConfig(config: NtfyConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY_NTFY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save ntfy config:', e);
  }
}

// Track last alert dispatch timestamps per parameter for 30s cooldown
const alertCooldowns: Record<string, number> = {};

export async function dispatchNtfyAlert(
  topic: string,
  title: string,
  body: string,
  priority: 'high' | 'urgent' = 'high',
  tags: string = 'warning,electric_plug'
): Promise<boolean> {
  const cleanTopic = topic.trim();
  if (!cleanTopic) return false;

  try {
    const res = await fetch(`https://ntfy.sh/${encodeURIComponent(cleanTopic)}`, {
      method: 'POST',
      body,
      headers: {
        'Title': title,
        'Priority': priority,
        'Tags': tags
      }
    });
    return res.ok;
  } catch (err) {
    console.error('Error dispatching ntfy notification:', err);
    return false;
  }
}

/**
 * Checks a live value against configured thresholds and dispatches ntfy notification if breached
 * adhering to a 30-second cooldown per parameter.
 */
export async function checkParameterThreshold(
  parameter: 'voltage' | 'current' | 'temperature' | 'humidity',
  label: string,
  value: number | null,
  unit: string,
  limits: ThresholdLimits,
  ntfyConfig: NtfyConfig,
  onAlertCallback?: (alert: ThresholdBreachAlert) => void
): Promise<ThresholdBreachAlert | null> {
  if (value === null || isNaN(value)) return null;

  let limitType: 'MIN' | 'MAX' | null = null;
  let limitValue = 0;

  if (value < limits.min) {
    limitType = 'MIN';
    limitValue = limits.min;
  } else if (value > limits.max) {
    limitType = 'MAX';
    limitValue = limits.max;
  }

  if (!limitType) return null;

  const now = Date.now();
  const cooldownKey = `${parameter}_${limitType}`;
  const lastTime = alertCooldowns[cooldownKey] || 0;
  const isCooldownActive = now - lastTime < 30000; // 30-second cooldown

  let ntfyDispatched = false;

  if (!isCooldownActive) {
    alertCooldowns[cooldownKey] = now;

    if (ntfyConfig.enabled && ntfyConfig.topic) {
      const title = `⚠️ CRITICAL EQUIPMENT ALERT: ${label} Out of Bounds!`;
      const body = `Current ${label} reading (${value} ${unit}) breached set thresholds (Min: ${limits.min} ${unit}, Max: ${limits.max} ${unit}). Equipment requires immediate inspection.`;
      
      ntfyDispatched = await dispatchNtfyAlert(
        ntfyConfig.topic,
        title,
        body,
        limitType === 'MAX' ? 'urgent' : 'high',
        parameter === 'temperature' ? 'fire,thermometer' : 'warning,electric_plug'
      );
    }
  }

  const alert: ThresholdBreachAlert = {
    id: `${now}-${Math.random()}`,
    timestamp: new Date().toLocaleTimeString(),
    parameter,
    label,
    value,
    unit,
    limitType,
    limitValue,
    ntfyDispatched
  };

  if (onAlertCallback && !isCooldownActive) {
    onAlertCallback(alert);
  }

  return alert;
}
