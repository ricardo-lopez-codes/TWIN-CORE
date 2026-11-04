import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Navigation, Compass, AlertCircle, Sparkles, MapPin } from 'lucide-react';

interface GpsMapProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  gpsFix: boolean | undefined;
  isSimulated?: boolean;
  lastUpdate?: string | null;
  height?: string;
  showRecenterButton?: boolean;
}

export const GpsMap: React.FC<GpsMapProps> = ({
  latitude,
  longitude,
  gpsFix,
  isSimulated = false,
  lastUpdate,
  height = '420px',
  showRecenterButton = true
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Validate coordinates
  const isValidCoord =
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180;

  const hasFix = Boolean(gpsFix && isValidCoord);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default to Ladakh coordinates (Leh baseline ~34.1526, 77.5771) or 0,0
      const initialLat = isValidCoord ? latitude : 34.1526;
      const initialLng = isValidCoord ? longitude : 77.5771;

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: isValidCoord ? 14 : 7,
        zoomControl: true,
        attributionControl: false
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // Clean up map on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Update Marker & Position
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (hasFix && latitude != null && longitude != null) {
      const position: [number, number] = [latitude, longitude];

      // Custom pulsing aerospace pin icon
      const pinColor = isSimulated ? '#0284c7' : '#059669';
      const pulseColor = isSimulated ? 'rgba(2, 132, 199, 0.4)' : 'rgba(5, 150, 105, 0.4)';

      const customIcon = L.divIcon({
        className: 'custom-gps-pin',
        html: `
          <div style="position: relative; width: 34px; height: 34px; transform: translate(-17px, -17px);">
            <div style="
              position: absolute;
              width: 34px;
              height: 34px;
              border-radius: 50%;
              background: ${pulseColor};
              animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;
            "></div>
            <div style="
              position: absolute;
              top: 5px;
              left: 5px;
              width: 24px;
              height: 24px;
              border-radius: 50%;
              background: ${pinColor};
              border: 2.5px solid white;
              box-shadow: 0 4px 10px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              color: white;
            ">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 2v3m0 14v3m-10-10h3m14 0h3"></path>
              </svg>
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17]
      });

      const popupHtml = `
        <div style="font-family: ui-monospace, monospace; font-size: 11px; padding: 4px; line-height: 1.5;">
          <div style="font-weight: bold; color: #0f172a; margin-bottom: 4px;">
            ${isSimulated ? '📡 SIMULATED UNIT 1 POSITION' : '🛰️ UNIT 1 HARDWARE GPS FIX'}
          </div>
          <div><span style="color: #64748b;">Latitude:</span> <strong>${latitude.toFixed(6)}°</strong></div>
          <div><span style="color: #64748b;">Longitude:</span> <strong>${longitude.toFixed(6)}°</strong></div>
          <div><span style="color: #64748b;">Status:</span> <span style="color: ${hasFix ? '#059669' : '#dc2626'}; font-weight: bold;">3D FIX ACTIVE</span></div>
          ${lastUpdate ? `<div><span style="color: #64748b;">Updated:</span> ${new Date(lastUpdate).toLocaleTimeString()}</div>` : ''}
        </div>
      `;

      if (!markerRef.current) {
        markerRef.current = L.marker(position, { icon: customIcon }).addTo(map);
        markerRef.current.bindPopup(popupHtml);
        map.panTo(position);
      } else {
        markerRef.current.setLatLng(position);
        markerRef.current.setIcon(customIcon);
        markerRef.current.setPopupContent(popupHtml);
      }
    } else {
      // No fix: remove marker if exists
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [latitude, longitude, hasFix, isSimulated, lastUpdate]);

  const handleRecenter = () => {
    if (mapInstanceRef.current && hasFix && latitude != null && longitude != null) {
      mapInstanceRef.current.setView([latitude, longitude], 15, { animate: true });
      if (markerRef.current) {
        markerRef.current.openPopup();
      }
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-card bg-slate-100" style={{ height }}>
      {/* OpenStreetMap Canvas */}
      <div ref={mapContainerRef} className="w-full h-full z-0" />

      {/* Overlay Status Banner if No Fix */}
      {!hasFix && (
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center z-10 animate-in fade-in duration-200">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-400 text-rose-300 flex items-center justify-center mb-3">
            <AlertCircle className="w-6 h-6 animate-pulse" />
          </div>
          <h4 className="text-white font-bold text-sm tracking-wide">
            GPS Signal Unavailable / No Satellite Lock
          </h4>
          <p className="text-slate-300 text-xs max-w-sm mt-1">
            Unit 1 GPS receiver is searching for GNSS satellites. In live mode, coordinates are never fabricated.
          </p>
          <span className="mt-3 px-3 py-1 rounded-full bg-slate-800 text-slate-300 text-[11px] font-mono border border-slate-700">
            Awaiting valid NMEA/UBX fix from Unit 1
          </span>
        </div>
      )}

      {/* Top Banner (Demo or Live indicator) */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-2 pointer-events-none">
        {isSimulated ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-600/90 backdrop-blur-md text-white text-xs font-mono font-bold shadow-md">
            <Sparkles className="w-3.5 h-3.5" />
            DEMO DATA — SIMULATED GPS MOVEMENT
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-700/90 backdrop-blur-md text-white text-xs font-mono font-bold shadow-md">
            <MapPin className="w-3.5 h-3.5" />
            LIVE HARDWARE GPS TELEMETRY
          </span>
        )}

        {hasFix && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 backdrop-blur-md text-slate-200 text-xs font-mono">
            <span>Lat: {latitude?.toFixed(4)}°</span>
            <span className="text-slate-500">|</span>
            <span>Lon: {longitude?.toFixed(4)}°</span>
          </span>
        )}
      </div>

      {/* Recenter Button */}
      {showRecenterButton && hasFix && (
        <button
          onClick={handleRecenter}
          className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/95 hover:bg-white text-slate-800 text-xs font-mono font-semibold shadow-md border border-slate-200 transition active:scale-95 cursor-pointer"
          title="Recenter Map on Unit 1 coordinates"
        >
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          Recenter
        </button>
      )}
    </div>
  );
};
