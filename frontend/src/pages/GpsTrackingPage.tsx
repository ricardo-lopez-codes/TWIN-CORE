import React from 'react';
import {
  MapPin,
  Compass,
  Navigation,
  Globe,
  Satellite,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Sparkles
} from 'lucide-react';
import { GpsMap } from '../components/GpsMap';
import { SensorReading, DataMode } from '../types';

interface GpsTrackingPageProps {
  reading: SensorReading;
  mode: DataMode;
}

export const GpsTrackingPage: React.FC<GpsTrackingPageProps> = ({ reading, mode }) => {
  const isSimulated = reading.source === 'SIMULATION' || mode === 'SIMULATION';
  const hasFix = Boolean(reading.gps_fix && reading.latitude != null && reading.longitude != null);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-sans font-bold text-slate-900 tracking-tight">
                GPS Equipment Tracking & Geolocation
              </h2>
              {isSimulated ? (
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-[10px] font-mono font-bold">
                  SIMULATED MOVEMENT
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-mono font-bold">
                  LIVE HARDWARE GPS
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5 font-medium">
              Real-time spatial positioning of Unit 1 remote enclosure across Ladakh high-altitude field deployment.
            </p>
          </div>
        </div>

        {/* Fix Status Pill */}
        <div className="flex items-center gap-3 shrink-0">
          <div className={`px-4 py-2 rounded-xl border flex items-center gap-2.5 font-mono text-xs ${
            hasFix
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            <span className={`w-2.5 h-2.5 rounded-full ${hasFix ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider opacity-75">GNSS STATUS</div>
              <div className="font-bold">{hasFix ? '3D FIX ACQUIRED' : 'SEARCHING SATELLITES'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Geolocation Coordinate Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Latitude */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-1">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>LATITUDE</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {reading.latitude != null ? `${reading.latitude.toFixed(6)}°` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {reading.latitude != null ? (reading.latitude >= 0 ? 'North' : 'South') : 'No Fix'}
          </div>
        </div>

        {/* Longitude */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-1">
            <Navigation className="w-3.5 h-3.5 text-cyan-600" />
            <span>LONGITUDE</span>
          </div>
          <div className="text-lg font-bold font-mono text-slate-900">
            {reading.longitude != null ? `${reading.longitude.toFixed(6)}°` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {reading.longitude != null ? (reading.longitude >= 0 ? 'East' : 'West') : 'No Fix'}
          </div>
        </div>

        {/* Operational Zone */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-1">
            <Globe className="w-3.5 h-3.5 text-indigo-600" />
            <span>DEPLOYMENT ZONE</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 truncate">
            Ladakh UT, India
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            Leh High-Altitude Base
          </div>
        </div>

        {/* Last Timestamp */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-card">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-mono mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>LAST FIX TIME</span>
          </div>
          <div className="text-sm font-bold font-mono text-slate-900 truncate">
            {reading.timestamp ? new Date(reading.timestamp).toLocaleTimeString() : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-0.5">
            {reading.gps_timestamp ? 'GPS UTC Clock' : 'Local Gateway Time'}
          </div>
        </div>
      </div>

      {/* Main Map Canvas */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-card">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900">
              OpenStreetMap Satellite Grid & Route Tracking
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500">
            Tile Provider: OSM Standard • Zoom: Double-click / Scroll
          </span>
        </div>

        <GpsMap
          latitude={reading.latitude}
          longitude={reading.longitude}
          gpsFix={reading.gps_fix}
          isSimulated={isSimulated}
          lastUpdate={reading.timestamp}
          height="520px"
          showRecenterButton={true}
        />
      </div>

      {/* Engineering Guidelines & Integrity Notice */}
      <div className="bg-blue-50/60 border border-blue-200/70 rounded-xl p-4 text-xs font-sans text-slate-700 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold text-slate-900">GPS Hardware Safety & Data Integrity Rule:</span>
          <p className="text-slate-600 leading-relaxed">
            In Live Hardware Mode, coordinates are exclusively accepted from Unit 1&apos;s physical GNSS receiver.
            Dummy or placeholder coordinates are never inserted when live lock is lost. In Demo Mode, realistic waypoint
            wander simulates equipment transport across the high-altitude terrain.
          </p>
        </div>
      </div>
    </div>
  );
};
