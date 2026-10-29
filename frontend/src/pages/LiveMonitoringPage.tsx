import React from 'react';
import {
  Activity,
  Radio,
  Clock,
  CheckCircle,
  AlertTriangle,
  Info
} from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { SensorReading, ThresholdSettings } from '../types';

interface LiveMonitoringPageProps {
  reading: SensorReading;
  thresholds: ThresholdSettings;
  isStale: boolean;
}

export const LiveMonitoringPage: React.FC<LiveMonitoringPageProps> = ({
  reading,
  thresholds,
  isStale
}) => {
  const getStatus = (val: number, warn: number, crit: number, lowerIsBad = false) => {
    if (lowerIsBad) {
      if (val <= crit) return 'CRITICAL';
      if (val <= warn) return 'WARNING';
      return 'NORMAL';
    }
    if (val >= crit) return 'CRITICAL';
    if (val >= warn) return 'WARNING';
    return 'NORMAL';
  };

  const sensorRows = [
    {
      parameter: 'Atmospheric Pressure',
      rawSensor: 'BMP280 / MS5611 Barometer',
      measurementType: 'ACTUAL PHYSICAL MEASUREMENT',
      value: `${reading.pressure_kpa.toFixed(2)} kPa`,
      unit: 'kPa abs',
      threshold: `Warn ≤ ${thresholds.pressure_warn} | Crit ≤ ${thresholds.pressure_crit}`,
      status: getStatus(reading.pressure_kpa, thresholds.pressure_warn, thresholds.pressure_crit, true),
      validity: reading.is_valid ? 'VALID (CRC OK)' : 'CHECKSUM ERROR',
      nature: 'Physical'
    },
    {
      parameter: 'Ambient Temperature',
      rawSensor: 'DHT22 / BMP280 Ambient Sensor',
      measurementType: 'ACTUAL PHYSICAL MEASUREMENT',
      value: `${reading.temperature_c.toFixed(2)} °C`,
      unit: '°C',
      threshold: `Warn ≥ ${thresholds.temp_warn} | Crit ≥ ${thresholds.temp_crit}`,
      status: getStatus(reading.temperature_c, thresholds.temp_warn, thresholds.temp_crit),
      validity: reading.is_valid ? 'VALID (CRC OK)' : 'SENSOR TIMEOUT',
      nature: 'Physical'
    },
    {
      parameter: 'Circuit Input Voltage',
      rawSensor: 'INA3221 Bus Voltage Sense (CH1)',
      measurementType: 'ACTUAL PHYSICAL MEASUREMENT',
      value: `${reading.voltage_v.toFixed(2)} V`,
      unit: 'V',
      threshold: `Min ${thresholds.voltage_min} | Max ${thresholds.voltage_max}`,
      status: reading.voltage_v < thresholds.voltage_min || reading.voltage_v > thresholds.voltage_max ? 'WARNING' : 'NORMAL',
      validity: 'VALID',
      nature: 'Physical'
    },
    {
      parameter: 'Circuit Current Draw',
      rawSensor: 'INA3221 Shunt Resistor Sense (10 mΩ)',
      measurementType: 'ACTUAL PHYSICAL MEASUREMENT',
      value: `${reading.current_a.toFixed(3)} A`,
      unit: 'A',
      threshold: `Max Crit ≥ ${thresholds.current_max} A`,
      status: reading.current_a > thresholds.current_max ? 'CRITICAL' : 'NORMAL',
      validity: 'VALID',
      nature: 'Physical'
    },
    {
      parameter: 'Total Circuit Power',
      rawSensor: 'Derived Computation',
      measurementType: 'CALCULATED ELECTRICAL POWER (P = V × I)',
      value: `${reading.power_w.toFixed(2)} W`,
      unit: 'W',
      threshold: `Warn ≥ ${thresholds.power_warn} | Crit ≥ ${thresholds.power_crit}`,
      status: getStatus(reading.power_w, thresholds.power_warn, thresholds.power_crit),
      validity: 'DERIVED',
      nature: 'Calculated'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Distinction Header Callout */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
        <div className="flex items-start gap-3.5">
          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Info className="w-5 h-5" />
          </div>
          <div className="text-xs space-y-1">
            <h3 className="font-sans font-bold text-slate-900 uppercase tracking-wider">
              Data Integrity & Measurement Provenance
            </h3>
            <p className="text-slate-600 leading-relaxed font-normal">
              This instrumentation panel enforces strict distinction between{' '}
              <strong className="text-blue-700 font-semibold">Actual Physical Measurements</strong> (calibrated hardware sensors over LoRa),{' '}
              <strong className="text-emerald-700 font-semibold">Calculated Values</strong> (Ohmic power derived from simultaneous voltage/current sampling), and{' '}
              <strong className="text-indigo-700 font-semibold">Predicted Digital Twin Values</strong> (thermodynamic virtual model).
            </p>
          </div>
        </div>
      </div>

      {/* Hardware Packet Metadata Banner */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-card">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
          <div className="flex items-center gap-2 text-xs font-sans font-bold text-slate-800 uppercase tracking-wider">
            <Radio className="w-4 h-4 text-blue-600" />
            <span>Latest Received LoRa Telemetry Frame</span>
          </div>
          <StatusBadge status={isStale ? 'OFFLINE' : reading.severity} size="sm" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 text-xs font-mono">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">REMOTE DEVICE ID</div>
            <div className="font-bold text-slate-900 mt-0.5">{reading.device_id || 'TWIN-CORE-UNIT1'}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">PACKET SEQUENCE #</div>
            <div className="font-bold text-blue-600 mt-0.5">#{reading.packet_seq ?? '--'}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">DATA SOURCE</div>
            <div className="font-bold text-slate-800 mt-0.5">{reading.source}</div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">TIMESTAMP</div>
            <div className="font-bold text-slate-700 mt-0.5">
              {new Date(reading.timestamp).toLocaleTimeString([], { hour12: false })}
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">FAN STAGE</div>
            <div className={`font-bold mt-0.5 ${reading.fan_state ? 'text-blue-600' : 'text-slate-500'}`}>
              {reading.fan_state ? 'FAN ON (100%)' : 'FAN OFF'}
            </div>
          </div>
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="text-[10px] text-slate-500 uppercase font-semibold">MOSFET STAGE</div>
            <div className="font-bold text-emerald-600 mt-0.5">
              {reading.mosfet_state}
            </div>
          </div>
        </div>

        {/* Stale warning banner */}
        {isStale && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2.5 text-xs font-sans text-rose-800">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Warning:</strong> Telemetry stream has exceeded timeout without new packets. Values are marked STALE and cannot be trusted for live operations.
            </span>
          </div>
        )}
      </div>

      {/* Detailed Sensor Telemetry Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-card">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-sans font-bold text-slate-900 uppercase tracking-wider">
            Detailed Instrumentation & Channel Calibration
          </h3>
          <span className="text-xs font-mono text-slate-500 font-medium">5 Monitored Channels</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200 uppercase tracking-wider text-[11px] font-sans font-bold">
              <tr>
                <th className="py-3 px-4">Parameter</th>
                <th className="py-3 px-4">Provenance</th>
                <th className="py-3 px-4">Transducer / Origin</th>
                <th className="py-3 px-4">Value</th>
                <th className="py-3 px-4">Configured Threshold</th>
                <th className="py-3 px-4">Integrity</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sensorRows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-bold text-slate-900 font-sans">
                    {row.parameter}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${
                      row.nature === 'Physical'
                        ? 'bg-blue-50 border border-blue-200 text-blue-700'
                        : 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                    }`}>
                      {row.measurementType}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500">{row.rawSensor}</td>
                  <td className="py-3 px-4 font-bold text-slate-900 text-sm">
                    {isStale ? '--' : row.value}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-medium">{row.threshold}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1.5 text-emerald-600 text-[11px] font-semibold">
                      <CheckCircle className="w-3.5 h-3.5" />
                      {row.validity}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <StatusBadge status={isStale ? 'OFFLINE' : row.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
