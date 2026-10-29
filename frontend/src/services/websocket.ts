import { SensorReading, EventSummary, TempDemoState, PressureDemoState, PowerDemoState, DataMode } from '../types';

export interface LiveTelemetryMessage {
  type: string;
  mode: DataMode;
  active_demo: string | null;
  reading: SensorReading;
  demo_states: {
    temperature: TempDemoState;
    pressure: PressureDemoState;
    power: PowerDemoState;
  };
  event_summary: EventSummary;
}

type MessageCallback = (msg: LiveTelemetryMessage) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private subscribers: Set<MessageCallback> = new Set();
  private reconnectTimer: any = null;
  private isExplicitlyClosed = false;

  public connect() {
    this.isExplicitlyClosed = false;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // If running with Vite dev proxy, ws://localhost:5173/ws/live or direct 8000
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/live`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        // Connected
      };

      this.ws.onmessage = (event) => {
        try {
          const data: LiveTelemetryMessage = JSON.parse(event.data);
          this.subscribers.forEach((cb) => cb(data));
        } catch (err) {
          console.error('Failed to parse WebSocket JSON', err);
        }
      };

      this.ws.onclose = () => {
        if (!this.isExplicitlyClosed) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.ws?.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }

  public subscribe(cb: MessageCallback) {
    this.subscribers.add(cb);
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      this.connect();
    }
    return () => {
      this.subscribers.delete(cb);
    };
  }

  public disconnect() {
    this.isExplicitlyClosed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsService = new WebSocketService();
