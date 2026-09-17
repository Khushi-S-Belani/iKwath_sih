// =============================================================================
// iKwath ESP32 Web Serial API Communication Service
// =============================================================================

export interface ESP32Telemetry {
  type: string;
  phase: string;
  temp_c: number;
  sim_mode: boolean;
  water_ml: number;
  target_water_ml: number;
  heater: 'ACTIVE' | 'OFF';
  pump: 'ACTIVE' | 'OFF';
  stirrer: 'ACTIVE' | 'OFF';
  stirrer_deg: number;
  elapsed_sec: number;
  paused: boolean;
  timestamp: Date;
}

type TelemetryCallback = (data: ESP32Telemetry) => void;
type ConnectionCallback = (connected: boolean, portInfo?: string) => void;

class ESP32SerialService {
  private port: any = null;
  private reader: any = null;
  private writer: any = null;
  private keepReading = false;
  private telemetryCallbacks: Set<TelemetryCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private isConnectedState = false;
  private lineBuffer = '';

  // Check if Web Serial is supported in the current browser
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public isConnected(): boolean {
    return this.isConnectedState;
  }

  public onTelemetry(cb: TelemetryCallback): () => void {
    this.telemetryCallbacks.add(cb);
    return () => this.telemetryCallbacks.delete(cb);
  }

  public onConnectionChange(cb: ConnectionCallback): () => void {
    this.connectionCallbacks.add(cb);
    return () => this.connectionCallbacks.delete(cb);
  }

  // Connect via Web Serial API
  public async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }

    try {
      // Prompt user to select USB Serial Port
      // @ts-ignore
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });

      this.isConnectedState = true;
      this.notifyConnection(true, 'ESP32 (USB Serial @ 115200 Baud)');

      // Start background reading loop
      this.keepReading = true;
      this.readSerialLoop();

      return true;
    } catch (err: any) {
      this.isConnectedState = false;
      this.notifyConnection(false);
      console.error('Failed to open Serial Port:', err);
      throw err;
    }
  }

  // Disconnect from Serial Port
  public async disconnect(): Promise<void> {
    this.keepReading = false;
    try {
      if (this.reader) {
        await this.reader.cancel();
        this.reader = null;
      }
      if (this.port) {
        await this.port.close();
        this.port = null;
      }
    } catch (err) {
      console.warn('Error during serial disconnect:', err);
    } finally {
      this.isConnectedState = false;
      this.notifyConnection(false);
    }
  }

  // Send Command to ESP32
  public async sendCommand(cmd: string | object): Promise<void> {
    if (!this.port || !this.isConnectedState) {
      console.warn('Cannot send command: ESP32 is not connected');
      return;
    }

    try {
      const textEncoder = new TextEncoderStream();
      const writableStreamClosed = textEncoder.readable.pipeTo(this.port.writable);
      const writer = textEncoder.writable.getWriter();

      const payload = typeof cmd === 'string' ? cmd : JSON.stringify(cmd);
      await writer.write(payload + '\n');
      writer.releaseLock();
    } catch (err) {
      console.error('Error writing to Serial port:', err);
    }
  }

  // Helper command shortcuts
  public async startBrew(waterMl = 400): Promise<void> {
    await this.sendCommand({ cmd: 'start', set_water: waterMl });
  }

  public async stopBrew(): Promise<void> {
    await this.sendCommand({ cmd: 'stop' });
  }

  public async togglePause(): Promise<void> {
    await this.sendCommand({ cmd: 'pause' });
  }

  public async toggleTempSimulation(): Promise<void> {
    await this.sendCommand({ cmd: 'toggle_sim' });
  }

  public async testPump(): Promise<void> {
    await this.sendCommand({ cmd: 'test_pump' });
  }

  public async testStirrer(): Promise<void> {
    await this.sendCommand({ cmd: 'test_stirrer' });
  }

  public async testPodFlap(): Promise<void> {
    await this.sendCommand({ cmd: 'test_pod' });
  }

  public async testRelay(): Promise<void> {
    await this.sendCommand({ cmd: 'test_relay' });
  }

  public async testBuzzer(): Promise<void> {
    await this.sendCommand({ cmd: 'test_buzzer' });
  }

  public async startCleaning(): Promise<void> {
    await this.sendCommand({ cmd: 'clean' });
  }

  private async readSerialLoop() {
    while (this.port && this.port.readable && this.keepReading) {
      const textDecoder = new TextDecoderStream();
      // @ts-ignore
      const readableStreamClosed = this.port.readable.pipeTo(textDecoder.writable);
      this.reader = textDecoder.readable.getReader();

      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            this.handleIncomingChunk(value);
          }
        }
      } catch (error) {
        console.warn('Serial read error:', error);
      } finally {
        if (this.reader) {
          this.reader.releaseLock();
        }
      }
    }
  }

  private handleIncomingChunk(chunk: string) {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split('\n');
    this.lineBuffer = lines.pop() || ''; // Keep remainder

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        try {
          const data = JSON.parse(trimmed);
          if (data.type === 'telemetry') {
            const telemetry: ESP32Telemetry = {
              type: 'telemetry',
              phase: data.phase || 'IDLE',
              temp_c: typeof data.temp_c === 'number' ? data.temp_c : 25,
              sim_mode: Boolean(data.sim_mode),
              water_ml: typeof data.water_ml === 'number' ? data.water_ml : 0,
              target_water_ml: typeof data.target_water_ml === 'number' ? data.target_water_ml : 400,
              heater: data.heater === 'ACTIVE' ? 'ACTIVE' : 'OFF',
              pump: data.pump === 'ACTIVE' ? 'ACTIVE' : 'OFF',
              stirrer: data.stirrer === 'ACTIVE' ? 'ACTIVE' : 'OFF',
              stirrer_deg: typeof data.stirrer_deg === 'number' ? data.stirrer_deg : 30,
              elapsed_sec: typeof data.elapsed_sec === 'number' ? data.elapsed_sec : 0,
              paused: Boolean(data.paused),
              timestamp: new Date(),
            };
            this.notifyTelemetry(telemetry);
          }
        } catch (e) {
          // Non-JSON debug line from ESP32
          console.log('[ESP32 RAW]', trimmed);
        }
      } else {
        console.log('[ESP32 DEBUG]', trimmed);
      }
    }
  }

  private notifyTelemetry(data: ESP32Telemetry) {
    this.telemetryCallbacks.forEach((cb) => cb(data));
  }

  private notifyConnection(connected: boolean, portInfo?: string) {
    this.connectionCallbacks.forEach((cb) => cb(connected, portInfo));
  }
}

export const esp32Serial = new ESP32SerialService();
