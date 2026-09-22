// =============================================================================
// iKwath ESP32 Web Serial API Communication Service (Bidirectional Sync)
// =============================================================================

export interface ESP32Telemetry {
  type: string;
  phase: string;
  temp_c: number;
  sim_mode: boolean;
  water_ml: number;
  target_water_ml: number;
  target_temp_c?: number;
  flow_rate_lpm?: number;
  flow_pulses?: number;
  flow_sensor_ok?: boolean;
  heater: 'ACTIVE' | 'OFF';
  relay_active_low?: boolean;
  pump: 'ACTIVE' | 'OFF';
  stirrer: 'ACTIVE' | 'OFF';
  stirrer_deg: number;
  pod_deg?: number;
  buzzer?: 'ACTIVE' | 'OFF';
  buzzer_active_low?: boolean;
  elapsed_sec: number;
  paused: boolean;
  ds18b20_found?: boolean;
  temp_sensor_found?: boolean;
  humidity?: number;
  sensor_type?: string;
  timestamp: Date;
}

export interface SerialLogEntry {
  direction: 'TX' | 'RX' | 'SYS';
  text: string;
  time: string;
}

type TelemetryCallback = (data: ESP32Telemetry) => void;
type ConnectionCallback = (connected: boolean, portInfo?: string) => void;
type LogCallback = (entry: SerialLogEntry) => void;
type KeypadCallback = (key: string) => void;
type ButtonEventCallback = (event: string, data: any) => void;

class ESP32SerialService {
  private port: any = null;
  private reader: any = null;
  private keepReading = false;
  private isConnectedState = false;
  private lineBuffer = '';
  private writeQueue: Promise<void> = Promise.resolve();
  private latestTelemetry: ESP32Telemetry | null = null;

  private telemetryCallbacks: Set<TelemetryCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private logCallbacks: Set<LogCallback> = new Set();
  private keypadCallbacks: Set<KeypadCallback> = new Set();
  private buttonEventCallbacks: Set<ButtonEventCallback> = new Set();
  private logHistory: SerialLogEntry[] = [];

  constructor() {
    this.initAutoListeners();
  }

  // Check if Web Serial API is supported in the browser
  public isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  public isConnected(): boolean {
    return this.isConnectedState && this.port !== null;
  }

  public getLatestTelemetry(): ESP32Telemetry | null {
    return this.latestTelemetry;
  }

  public onTelemetry(cb: TelemetryCallback): () => void {
    this.telemetryCallbacks.add(cb);
    if (this.latestTelemetry) {
      try {
        cb(this.latestTelemetry);
      } catch (e) {
        console.error('[ESP32] Error calling initial telemetry callback:', e);
      }
    }
    return () => this.telemetryCallbacks.delete(cb);
  }

  public onConnectionChange(cb: ConnectionCallback): () => void {
    this.connectionCallbacks.add(cb);
    cb(this.isConnected(), this.isConnected() ? 'ESP32 (USB Serial @ 115200 Baud)' : undefined);
    return () => this.connectionCallbacks.delete(cb);
  }

  public onLog(cb: LogCallback): () => void {
    this.logCallbacks.add(cb);
    return () => this.logCallbacks.delete(cb);
  }

  public onKeypad(cb: KeypadCallback): () => void {
    this.keypadCallbacks.add(cb);
    return () => this.keypadCallbacks.delete(cb);
  }

  public onButtonEvent(cb: ButtonEventCallback): () => void {
    this.buttonEventCallbacks.add(cb);
    return () => this.buttonEventCallbacks.delete(cb);
  }

  public getLogHistory(): SerialLogEntry[] {
    return [...this.logHistory];
  }

  private addLog(direction: 'TX' | 'RX' | 'SYS', text: string) {
    const entry: SerialLogEntry = {
      direction,
      text,
      time: new Date().toLocaleTimeString(),
    };
    this.logHistory = [entry, ...this.logHistory.slice(0, 99)];
    this.logCallbacks.forEach((cb) => {
      try {
        cb(entry);
      } catch (err) {
        console.error('[ESP32] Error in log callback:', err);
      }
    });
  }

  private isOpening = false;
  private isClosing = false;
  private writer: any = null;

  // Initialize USB connect / disconnect event listeners
  public initAutoListeners() {
    if (!this.isSupported()) return;

    try {
      // @ts-ignore
      navigator.serial.addEventListener('connect', async (e: any) => {
        this.addLog('SYS', 'USB Serial Device plugged in. Attempting auto-reconnect...');
        console.log('[ESP32] USB Device connected:', e);
        await this.autoReconnect();
      });

      // @ts-ignore
      navigator.serial.addEventListener('disconnect', (e: any) => {
        this.addLog('SYS', 'USB Serial Device disconnected.');
        console.log('[ESP32] USB Device disconnected:', e);
        this.disconnect();
      });
    } catch (err) {
      console.warn('[ESP32] Could not attach serial events:', err);
    }
  }

  // Auto-reconnect to an already authorized port without prompting user (e.g. on page refresh)
  public async autoReconnect(): Promise<boolean> {
    if (!this.isSupported() || this.isConnectedState || this.isOpening || this.isClosing) return false;
    this.isOpening = true;

    try {
      // @ts-ignore
      const ports = await navigator.serial.getPorts();
      if (ports && ports.length > 0) {
        this.addLog('SYS', 'Found authorized USB port. Connecting...');
        this.port = ports[0];
        await this.port.open({ baudRate: 115200 });

        this.isConnectedState = true;
        this.notifyConnection(true, 'ESP32 (Auto-Connected @ 115200 Baud)');
        this.addLog('SYS', 'ESP32 Connected automatically (115200 Baud).');

        this.keepReading = true;
        this.startReadLoop();

        // Send connect handshake
        setTimeout(() => {
          this.sendCommand({ cmd: 'connect' });
        }, 300);

        this.isOpening = false;
        return true;
      }
    } catch (err: any) {
      this.addLog('SYS', `Auto-reconnect notice: ${err.message || 'port busy'}`);
      console.warn('[ESP32] Auto-reconnect notice:', err);
      if (this.port && !this.isConnectedState) {
        try { await this.port.close(); } catch (e) {}
      }
      this.port = null;
      this.isConnectedState = false;
      this.notifyConnection(false);
    } finally {
      this.isOpening = false;
    }
    return false;
  }

  // Connect via user selection dialog
  public async connect(): Promise<boolean> {
    if (!this.isSupported()) {
      throw new Error('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
    }

    if (this.isConnectedState) return true;
    if (this.isOpening) return false;
    this.isOpening = true;

    try {
      // Prompt user to select USB Serial Port
      // @ts-ignore
      this.port = await navigator.serial.requestPort();
      await this.port.open({ baudRate: 115200 });

      this.isConnectedState = true;
      this.notifyConnection(true, 'ESP32 (USB Serial @ 115200 Baud)');
      this.addLog('SYS', 'ESP32 Connected via USB Serial (115200 Baud).');

      // Start background reading loop
      this.keepReading = true;
      this.startReadLoop();

      // Send initial connect handshake command
      setTimeout(() => {
        this.sendCommand({ cmd: 'connect' });
      }, 400);

      this.isOpening = false;
      return true;
    } catch (err: any) {
      this.isConnectedState = false;
      this.notifyConnection(false);
      this.addLog('SYS', `Connection error: ${err.message || err}`);
      console.error('[ESP32] Failed to open Serial Port:', err);
      if (this.port) {
        try { await this.port.close(); } catch (e) {}
        this.port = null;
      }
      throw err;
    } finally {
      this.isOpening = false;
    }
  }

  // Disconnect from Serial Port (Clean teardown of readers, writers, and port)
  public async disconnect(): Promise<void> {
    if (this.isClosing) return;
    this.isClosing = true;
    this.keepReading = false;
    this.isConnectedState = false;
    this.notifyConnection(false);
    this.addLog('SYS', 'Disconnecting ESP32 Serial Port...');

    try {
      if (this.writer) {
        try {
          await this.writer.close();
        } catch (e) {}
        try {
          this.writer.releaseLock();
        } catch (e) {}
        this.writer = null;
      }
      if (this.reader) {
        try {
          await this.reader.cancel();
        } catch (e) {}
        try {
          this.reader.releaseLock();
        } catch (e) {}
        this.reader = null;
      }
      if (this.port) {
        try {
          await this.port.close();
        } catch (e) {}
        this.port = null;
      }
    } catch (err: any) {
      console.warn('[ESP32] Error during disconnect:', err);
    } finally {
      this.isConnectedState = false;
      this.isOpening = false;
      this.isClosing = false;
      this.port = null;
      this.notifyConnection(false);
      this.addLog('SYS', 'ESP32 Disconnected successfully.');
    }
  }

  // Bulletproof Persistent Command Sender (Zero Stream Locking Delays)
  public async sendCommand(cmd: string | object): Promise<boolean> {
    if (!this.port || !this.port.writable || !this.isConnectedState) {
      console.warn('[ESP32] Cannot send command: ESP32 is not connected', cmd);
      this.addLog('TX', `[DROPPED - NOT CONNECTED] ${typeof cmd === 'string' ? cmd : JSON.stringify(cmd)}`);
      return false;
    }

    const payload = typeof cmd === 'string' ? cmd : JSON.stringify(cmd);
    const encoder = new TextEncoder();
    const data = encoder.encode(payload + '\n');

    try {
      if (!this.writer) {
        this.writer = this.port.writable.getWriter();
      }
      await this.writer.write(data);
      this.addLog('TX', payload);
      console.log('[ESP32 SENT]', payload);
      return true;
    } catch (err: any) {
      this.addLog('SYS', `Write error: ${err.message || err}`);
      console.error('[ESP32] Write error:', err);
      if (this.writer) {
        try {
          this.writer.releaseLock();
        } catch (e) {}
        this.writer = null;
      }
      return false;
    }
  }

  // Actuator and Phase Commands with Recipe Sync
  public async startBrew(waterMl = 400, tempC = 35): Promise<boolean> {
    return await this.sendCommand({
      cmd: 'start',
      set_water: waterMl,
      set_temp: tempC,
    });
  }

  public async preparePod(waterMl = 400, tempC = 35, recipeName?: string): Promise<boolean> {
    return await this.sendCommand({
      cmd: 'prepare_pod',
      set_water: waterMl,
      set_temp: tempC,
      recipe: recipeName || 'custom',
    });
  }

  public async confirmPodInserted(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'pod_inserted' });
  }

  public async setServoAngle(angle: number): Promise<boolean> {
    return await this.sendCommand({ cmd: angle >= 45 ? 'pod_open' : 'pod_close' });
  }

  public async syncRecipe(waterMl: number, tempC: number, recipeName?: string): Promise<boolean> {
    return await this.sendCommand({
      cmd: 'sync_recipe',
      set_water: waterMl,
      set_temp: tempC,
      recipe: recipeName || 'custom',
    });
  }

  public async stopBrew(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'stop' });
  }

  public async togglePause(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'pause' });
  }

  public async toggleTempSimulation(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'toggle_sim' });
  }

  public async pumpOn(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'pump_on' });
  }

  public async pumpOff(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'pump_off' });
  }

  public async testPump(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'test_pump' });
  }

  public async stirrerOn(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'stirrer_on' });
  }

  public async stirrerOff(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'stirrer_off' });
  }

  public async testStirrer(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'test_stirrer' });
  }

  public async podOpen(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'pod_open' });
  }

  public async podClose(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'pod_close' });
  }

  public async testPodFlap(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'test_pod' });
  }

  public async relayOn(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'relay_on' });
  }

  public async relayOff(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'relay_off' });
  }

  public async testRelay(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'test_relay' });
  }

  public async invertRelay(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'invert_relay' });
  }

  public async buzzerOn(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'buzzer_on' });
  }

  public async buzzerOff(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'buzzer_off' });
  }

  public async testBuzzer(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'test_buzzer' });
  }

  public async invertBuzzer(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'invert_buzzer' });
  }

  public async startCleaning(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'clean' });
  }

  // Flow Sensor Controls & Calibration
  public async resetFlowCount(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'reset_flow' });
  }

  public async setFlowCalibration(factor: number): Promise<boolean> {
    return await this.sendCommand({ cmd: 'set_flow_cal', factor });
  }

  public async testFlowSensor(): Promise<boolean> {
    return await this.sendCommand({ cmd: 'test_flow' });
  }

  // Non-pipe direct binary reader loop
  private async startReadLoop() {
    const decoder = new TextDecoder();

    while (this.port && this.port.readable && this.keepReading) {
      try {
        this.reader = this.port.readable.getReader();

        while (this.keepReading) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            this.handleIncomingChunk(chunk);
          }
        }
      } catch (error: any) {
        if (this.keepReading) {
          console.warn('[ESP32] Serial read warning:', error);
          this.addLog('SYS', `Read warning: ${error.message || error}`);
        }
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch (e) {}
          this.reader = null;
        }
      }
    }
  }

  // Robust Chunk & JSON Extraction Parser
  private handleIncomingChunk(chunk: string) {
    this.lineBuffer += chunk;
    const lines = this.lineBuffer.split('\n');
    this.lineBuffer = lines.pop() || ''; // Keep incomplete fragment

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // Extract JSON object if present in the line (handles serial prefix/suffix noise)
      const jsonStart = trimmed.indexOf('{');
      const jsonEnd = trimmed.lastIndexOf('}');

      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        const jsonStr = trimmed.substring(jsonStart, jsonEnd + 1);
        try {
          const data = JSON.parse(jsonStr);

          if (data.type === 'telemetry') {
            const telemetry: ESP32Telemetry = {
              type: 'telemetry',
              phase: data.phase || 'IDLE',
              temp_c: typeof data.temp_c === 'number' ? data.temp_c : 25,
              sim_mode: Boolean(data.sim_mode),
              water_ml: typeof data.water_ml === 'number' ? data.water_ml : 0,
              target_water_ml: typeof data.target_water_ml === 'number' ? data.target_water_ml : 400,
              target_temp_c: typeof data.target_temp_c === 'number' ? data.target_temp_c : 90,
              flow_rate_lpm: typeof data.flow_rate_lpm === 'number' ? data.flow_rate_lpm : 0,
              flow_pulses: typeof data.flow_pulses === 'number' ? data.flow_pulses : 0,
              flow_sensor_ok: data.flow_sensor_ok !== undefined ? Boolean(data.flow_sensor_ok) : true,
              heater: data.heater === 'ACTIVE' ? 'ACTIVE' : 'OFF',
              relay_active_low: data.relay_active_low !== undefined ? Boolean(data.relay_active_low) : true,
              pump: data.pump === 'ACTIVE' ? 'ACTIVE' : 'OFF',
              stirrer: data.stirrer === 'ACTIVE' ? 'ACTIVE' : 'OFF',
              stirrer_deg: typeof data.stirrer_deg === 'number' ? data.stirrer_deg : 30,
              pod_deg: typeof data.pod_deg === 'number' ? data.pod_deg : 0,
              buzzer: data.buzzer === 'ACTIVE' ? 'ACTIVE' : 'OFF',
              buzzer_active_low: Boolean(data.buzzer_active_low),
              elapsed_sec: typeof data.elapsed_sec === 'number' ? data.elapsed_sec : 0,
              paused: Boolean(data.paused),
              ds18b20_found: data.ds18b20_found !== undefined ? Boolean(data.ds18b20_found) : (data.temp_sensor_found !== undefined ? Boolean(data.temp_sensor_found) : true),
              temp_sensor_found: data.temp_sensor_found !== undefined ? Boolean(data.temp_sensor_found) : true,
              humidity: typeof data.humidity === 'number' ? data.humidity : undefined,
              sensor_type: typeof data.sensor_type === 'string' ? data.sensor_type : 'DHT11',
              timestamp: new Date(),
            };
            this.latestTelemetry = telemetry;
            this.notifyTelemetry(telemetry);
          } else if (data.type === 'keypad') {
            const key = String(data.key || '');
            this.notifyKeypad(key);
            this.addLog('RX', `[KEYPAD] Pressed '${key}'`);
          } else if (data.type === 'button_event') {
            const event = String(data.event || '');
            this.notifyButtonEvent(event, data);
            this.addLog('RX', `[BUTTON] Hardware Button Event: ${event}`);
          } else {
            this.addLog('RX', trimmed);
          }
        } catch (e) {
          this.addLog('RX', trimmed);
        }
      } else {
        this.addLog('RX', trimmed);
        console.log('[ESP32 RAW]', trimmed);
      }
    }
  }

  private notifyTelemetry(data: ESP32Telemetry) {
    this.telemetryCallbacks.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error('[ESP32] Error in telemetry callback:', err);
      }
    });
  }

  private notifyKeypad(key: string) {
    this.keypadCallbacks.forEach((cb) => {
      try {
        cb(key);
      } catch (err) {
        console.error('[ESP32] Error in keypad callback:', err);
      }
    });
  }

  private notifyButtonEvent(event: string, data: any) {
    this.buttonEventCallbacks.forEach((cb) => {
      try {
        cb(event, data);
      } catch (err) {
        console.error('[ESP32] Error in button event callback:', err);
      }
    });
  }

  private notifyConnection(connected: boolean, portInfo?: string) {
    this.connectionCallbacks.forEach((cb) => {
      try {
        cb(connected, portInfo);
      } catch (err) {
        console.error('[ESP32] Error in connection callback:', err);
      }
    });
  }
}

export const esp32Serial = new ESP32SerialService();
