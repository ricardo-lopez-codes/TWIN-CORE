/**
 * Internet Time Synchronization Service for TWIN-CORE
 * Synchronizes client clock with real-world internet time sources (NTP / World Time APIs)
 * to ensure precise high-altitude telemetry timestamps when deployed or hosted.
 */

export interface NetworkTimeInfo {
  currentTime: Date;
  formattedTime: string;
  formattedDate: string;
  timezone: string;
  tzAbbreviation: string;
  status: 'SYNCED' | 'SYNCING' | 'LOCAL_FALLBACK';
  sourceName: string;
  latencyMs: number;
  offsetMs: number;
  lastSyncedAt: Date | null;
}

type TimeSubscriber = (info: NetworkTimeInfo) => void;

class NetworkTimeService {
  private offsetMs = 0;
  private latencyMs = 0;
  private status: 'SYNCED' | 'SYNCING' | 'LOCAL_FALLBACK' = 'SYNCING';
  private sourceName = 'Connecting...';
  private lastSyncedAt: Date | null = null;
  private subscribers: Set<TimeSubscriber> = new Set();
  private tickInterval: any = null;
  private resyncInterval: any = null;

  constructor() {
    this.startClock();
    this.syncWithInternet();
  }

  public async syncWithInternet(): Promise<void> {
    this.status = 'SYNCING';
    this.notify();

    const tStart = performance.now();

    // Source 1: Local Backend Gateway /api/readings/network-time
    try {
      const res = await fetch('/api/readings/network-time', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const tEnd = performance.now();
        this.latencyMs = Math.round(tEnd - tStart);
        const serverEpoch = data.epoch_ms + this.latencyMs / 2;
        this.offsetMs = serverEpoch - Date.now();
        this.status = 'SYNCED';
        this.sourceName = 'TWIN-CORE NTP Gateway';
        this.lastSyncedAt = new Date();
        this.notify();
        return;
      }
    } catch (e) {
      // Fallback to public web time APIs
    }

    // Source 2: timeapi.io
    try {
      const tStart2 = performance.now();
      const res2 = await fetch('https://timeapi.io/api/time/current/zone?timeZone=Asia/Kolkata', {
        cache: 'no-store'
      });
      if (res2.ok) {
        const data2 = await res2.json();
        const tEnd2 = performance.now();
        this.latencyMs = Math.round(tEnd2 - tStart2);
        const serverDate = new Date(`${data2.dateTime}Z`);
        this.offsetMs = serverDate.getTime() - Date.now() + (5.5 * 3600 * 1000);
        this.status = 'SYNCED';
        this.sourceName = 'timeapi.io (Global NTP)';
        this.lastSyncedAt = new Date();
        this.notify();
        return;
      }
    } catch (e) {
      // Fallback
    }

    // Source 3: worldtimeapi.org
    try {
      const tStart3 = performance.now();
      const res3 = await fetch('https://worldtimeapi.org/api/timezone/Asia/Kolkata', {
        cache: 'no-store'
      });
      if (res3.ok) {
        const data3 = await res3.json();
        const tEnd3 = performance.now();
        this.latencyMs = Math.round(tEnd3 - tStart3);
        const serverEpoch = data3.unixtime * 1000 + this.latencyMs / 2;
        this.offsetMs = serverEpoch - Date.now();
        this.status = 'SYNCED';
        this.sourceName = 'worldtimeapi.org (NTP Pool)';
        this.lastSyncedAt = new Date();
        this.notify();
        return;
      }
    } catch (e) {
      // Fallback to local clock
    }

    // Fallback: Local system clock
    this.status = 'LOCAL_FALLBACK';
    this.sourceName = 'Local System Clock (Offline)';
    this.offsetMs = 0;
    this.lastSyncedAt = new Date();
    this.notify();
  }

  private startClock() {
    if (this.tickInterval) clearInterval(this.tickInterval);
    this.tickInterval = setInterval(() => {
      this.notify();
    }, 1000);

    // Auto resync with internet every 5 minutes
    if (this.resyncInterval) clearInterval(this.resyncInterval);
    this.resyncInterval = setInterval(() => {
      this.syncWithInternet();
    }, 5 * 60 * 1000);
  }

  public getCurrentInfo(): NetworkTimeInfo {
    const netTime = new Date(Date.now() + this.offsetMs);
    
    // Format for India/Ladakh timezone (Asia/Kolkata - UTC+5:30)
    const options: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    const dateOptions: Intl.DateTimeFormatOptions = {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    };

    return {
      currentTime: netTime,
      formattedTime: netTime.toLocaleTimeString('en-IN', options),
      formattedDate: netTime.toLocaleDateString('en-IN', dateOptions),
      timezone: 'Asia/Kolkata',
      tzAbbreviation: 'IST (UTC+5:30)',
      status: this.status,
      sourceName: this.sourceName,
      latencyMs: this.latencyMs,
      offsetMs: Math.round(this.offsetMs),
      lastSyncedAt: this.lastSyncedAt
    };
  }

  public subscribe(callback: TimeSubscriber): () => void {
    this.subscribers.add(callback);
    callback(this.getCurrentInfo());
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notify() {
    const info = this.getCurrentInfo();
    this.subscribers.forEach((cb) => cb(info));
  }
}

export const networkTimeService = new NetworkTimeService();
