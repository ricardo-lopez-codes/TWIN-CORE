export class WebSerialManager {
  private port: any = null;
  private reader: any = null;
  private keepReading = false;
  private readableStreamClosed: Promise<void> | null = null;

  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public async connect(
    baudRate = 115200,
    onLine: (line: string) => void,
    onError: (err: any) => void
  ): Promise<boolean> {
    if (!this.isSupported()) {
      onError(new Error('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.'));
      return false;
    }

    try {
      // @ts-ignore - Web Serial API
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate });
      this.keepReading = true;

      this.readLoop(onLine, onError);
      return true;
    } catch (err: any) {
      onError(err);
      this.disconnect();
      return false;
    }
  }

  private async readLoop(onLine: (line: string) => void, onError: (err: any) => void) {
    let lineBuffer = '';

    while (this.port && this.port.readable && this.keepReading) {
      try {
        const textDecoder = new TextDecoderStream();
        this.readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
        const reader = textDecoder.readable.getReader();
        this.reader = reader;

        while (true) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          if (value) {
            lineBuffer += value;
            const lines = lineBuffer.split(/\r?\n/);
            lineBuffer = lines.pop() || ''; // Keep remainder
            for (const line of lines) {
              const trimmed = line.trim();
              if (trimmed) {
                onLine(trimmed);
              }
            }
          }
        }
      } catch (err: any) {
        if (this.keepReading) {
          onError(err);
        }
        break;
      }
    }
  }

  public async disconnect(): Promise<void> {
    this.keepReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (e) {
        // ignore
      }
      this.reader = null;
    }

    if (this.readableStreamClosed) {
      try {
        await this.readableStreamClosed;
      } catch (e) {
        // ignore
      }
      this.readableStreamClosed = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (e) {
        // ignore
      }
      this.port = null;
    }
  }
}

export const webSerialManager = new WebSerialManager();
