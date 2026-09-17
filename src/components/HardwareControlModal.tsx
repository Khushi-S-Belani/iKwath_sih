import React, { useState, useEffect, useRef } from 'react';
import { esp32Serial, ESP32Telemetry, SerialLogEntry } from '../services/esp32Serial';
import { 
  Cpu, 
  Usb, 
  Activity, 
  Flame, 
  Droplets, 
  RotateCw, 
  Layers, 
  Volume2, 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle,
  Play,
  Square,
  RefreshCw,
  Thermometer,
  Check,
  Terminal,
  Grid
} from 'lucide-react';

interface HardwareControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartHardwareBrew?: () => void;
}

export const HardwareControlModal: React.FC<HardwareControlModalProps> = ({
  isOpen,
  onClose,
  onStartHardwareBrew,
}) => {
  const [isConnected, setIsConnected] = useState(esp32Serial.isConnected());
  const [isSupported, setIsSupported] = useState(false);
  const [portLabel, setPortLabel] = useState<string>('');
  const [telemetry, setTelemetry] = useState<ESP32Telemetry | null>(null);
  const [simTempActive, setSimTempActive] = useState(false);
  const [manualOffset, setManualOffset] = useState(0);
  const [connecting, setConnecting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'actuators' | 'keypad' | 'ds18b20' | 'telemetry' | 'terminal' | 'pinout'>('actuators');
  const [logs, setLogs] = useState<SerialLogEntry[]>([]);
  const [lastKeypadPress, setLastKeypadPress] = useState<{ key: string; time: string } | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsSupported(esp32Serial.isSupported());
    setIsConnected(esp32Serial.isConnected());
    setLogs(esp32Serial.getLogHistory());

    const unsubConn = esp32Serial.onConnectionChange((connected, info) => {
      setIsConnected(connected);
      if (info) setPortLabel(info);
      setConnecting(false);
    });

    const unsubTelem = esp32Serial.onTelemetry((data) => {
      setTelemetry(data);
      setSimTempActive(data.sim_mode);
    });

    const unsubLog = esp32Serial.onLog((entry) => {
      setLogs((prev) => [entry, ...prev.slice(0, 99)]);
      if (entry.text.includes('"type":"keypad"')) {
        try {
          const match = entry.text.match(/"key":"(.)"/);
          if (match && match[1]) {
            setLastKeypadPress({ key: match[1], time: entry.time });
          }
        } catch (e) {}
      }
    });

    return () => {
      unsubConn();
      unsubTelem();
      unsubLog();
    };
  }, []);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleConnect = async () => {
    setErrorMsg(null);
    setConnecting(true);
    try {
      await esp32Serial.connect();
      showFeedback('ESP32 Connected! Built-in Blue LED is ON (GPIO 2)');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to connect to ESP32 serial port.');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await esp32Serial.disconnect();
    setTelemetry(null);
    showFeedback('ESP32 Disconnected');
  };

  const handleToggleSim = async () => {
    await esp32Serial.toggleTempSimulation();
    setSimTempActive(!simTempActive);
    showFeedback(`Temperature Simulation ${!simTempActive ? 'Enabled' : 'Disabled'}`);
  };

  const handleActuatorAction = async (name: string, fn: () => Promise<boolean>) => {
    try {
      const ok = await fn();
      if (ok) {
        showFeedback(`Sent: ${name} ✔️`);
      } else {
        if (!isConnected) {
          setErrorMsg(`Cannot send '${name}': ESP32 is not connected via USB. Click Connect above.`);
        } else {
          showFeedback(`Command sent: ${name}`);
        }
      }
    } catch (e: any) {
      setErrorMsg(`Error executing ${name}: ` + (e.message || e));
    }
  };

  const currentTemp = (telemetry ? telemetry.temp_c : 25.4) + manualOffset;
  const currentTempF = (currentTemp * 9) / 5 + 32;

  const getThermalStatus = (t: number) => {
    if (t < 28) return { label: 'Ambient / Room Temp', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.3)' };
    if (t < 45) return { label: 'Warm / Body Heat Detected 🔥', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.3)' };
    if (t < 75) return { label: 'Gentle Warm Water', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.3)' };
    if (t < 92) return { label: 'Decoction Extraction Range 🌿', color: '#fb923c', bg: 'rgba(251, 146, 60, 0.15)', border: 'rgba(251, 146, 60, 0.3)' };
    return { label: 'Active Rolling Boil (100°C) ☕', color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)', border: 'rgba(244, 63, 94, 0.3)' };
  };

  const thermal = getThermalStatus(currentTemp);

  const KEYPAD_LAYOUT = [
    [
      { key: '1', label: '1: Ashwa', desc: '400mL / 90°C' },
      { key: '2', label: '2: Giloy', desc: '350mL / 88°C' },
      { key: '3', label: '3: Tulsi', desc: '450mL / 92°C' },
      { key: 'A', label: 'A: Pump', desc: 'Toggle Pump', color: '#38bdf8' },
    ],
    [
      { key: '4', label: '4: Beep', desc: 'Test Chime' },
      { key: '5', label: '5: Polarity', desc: 'Invert Buzzer' },
      { key: '6', label: '6: Pod 90°', desc: 'Open Flap' },
      { key: 'B', label: 'B: Stirrer', desc: 'Toggle Agitator', color: '#c084fc' },
    ],
    [
      { key: '7', label: '7: Pod 0°', desc: 'Close Flap' },
      { key: '8', label: '8: Heater', desc: 'Toggle Relay', color: '#fb923c' },
      { key: '9', label: '9: Spare', desc: 'Diagnostic' },
      { key: 'C', label: 'C: Sim Temp', desc: 'Toggle Sim', color: '#34d399' },
    ],
    [
      { key: '*', label: '*: Start/Pause', desc: 'Cycle Toggle', color: '#34d399' },
      { key: '0', label: '0: Pod Drop', desc: 'Test Sweep' },
      { key: '#', label: '#: Stop', desc: 'Emergency Reset', color: '#f43f5e' },
      { key: 'D', label: 'D: Clean', desc: 'Rinse Cycle', color: '#60a5fa' },
    ],
  ];

  return (
    <div className="hw-modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="hw-modal-window">
        
        {/* Modal Header */}
        <div className="hw-modal-header">
          <div className="hw-modal-title-group">
            <div className={`hw-modal-icon-badge ${!isConnected ? 'disconnected' : ''}`}>
              <Cpu style={{ width: 24, height: 24 }} />
            </div>
            <div>
              <div className="hw-modal-title">
                ESP32 Hardware & Actuator Controller
                {isConnected && (
                  <span className="hw-live-badge">
                    ● LIVE 115200 BAUD (LED ON)
                  </span>
                )}
              </div>
              <div className="hw-modal-sub">
                Live Actuator Drivers · 4x4 Keypad Matrix · DS18B20 Temp Probe · Flow Meter · Serial Monitor
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="hw-modal-close-btn"
            title="Close modal"
          >
            <X style={{ width: 18, height: 18 }} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="hw-modal-tabs">
          <button
            onClick={() => setActiveTab('actuators')}
            className={`hw-tab-btn ${activeTab === 'actuators' ? 'active green' : ''}`}
          >
            <RotateCw style={{ width: 16, height: 16 }} /> Actuator Diagnostics
          </button>
          <button
            onClick={() => setActiveTab('keypad')}
            className={`hw-tab-btn green ${activeTab === 'keypad' ? 'active' : ''}`}
          >
            <Grid style={{ width: 16, height: 16 }} /> 4x4 Matrix Keypad
          </button>
          <button
            onClick={() => setActiveTab('ds18b20')}
            className={`hw-tab-btn orange ${activeTab === 'ds18b20' ? 'active' : ''}`}
          >
            <Thermometer style={{ width: 16, height: 16 }} /> {telemetry?.sensor_type ? `${telemetry.sensor_type} Temp Sensor` : 'DHT11 Temp Sensor'}
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`hw-tab-btn green ${activeTab === 'telemetry' ? 'active' : ''}`}
          >
            <Activity style={{ width: 16, height: 16 }} /> System Telemetry
          </button>
          <button
            onClick={() => setActiveTab('terminal')}
            className={`hw-tab-btn ${activeTab === 'terminal' ? 'active' : ''}`}
          >
            <Terminal style={{ width: 16, height: 16 }} /> Serial Terminal Log
          </button>
          <button
            onClick={() => setActiveTab('pinout')}
            className={`hw-tab-btn ${activeTab === 'pinout' ? 'active' : ''}`}
          >
            <Usb style={{ width: 16, height: 16 }} /> Wiring Schematics
          </button>
        </div>

        {/* Modal Body */}
        <div className="hw-modal-body">
          
          {/* Connection Status Bar */}
          <div className="hw-conn-bar">
            <div className="hw-conn-info">
              <div className={`hw-conn-dot ${isConnected ? 'connected' : ''}`} />
              <div>
                <div className="hw-conn-name">
                  {isConnected ? (portLabel || 'ESP32 Connected via USB Serial (115200 Baud)') : 'ESP32 Disconnected'}
                </div>
                <div className="hw-conn-desc">
                  {isConnected 
                    ? 'Built-in Blue LED is ON (GPIO 2). Web Serial bidirectional bridge active.' 
                    : 'Connect ESP32 to PC via USB cable and click Connect.'}
                </div>
              </div>
            </div>

            <div>
              {isConnected ? (
                <button onClick={handleDisconnect} className="hw-btn-disconnect">
                  Disconnect
                </button>
              ) : (
                <button onClick={handleConnect} disabled={connecting} className="hw-btn-connect">
                  <Usb style={{ width: 16, height: 16 }} />
                  {connecting ? 'Connecting...' : 'Connect ESP32 (USB Serial)'}
                </button>
              )}
            </div>
          </div>

          {/* Action Feedback Toast Banner */}
          {actionFeedback && (
            <div style={{ padding: '10px 16px', borderRadius: 8, background: 'rgba(16, 185, 129, 0.2)', border: '1px solid rgba(16, 185, 129, 0.4)', color: '#34d399', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8, animation: 'hwFadeIn 0.15s ease-out' }}>
              <Check style={{ width: 16, height: 16 }} />
              <span>{actionFeedback}</span>
            </div>
          )}

          {errorMsg && (
            <div style={{ padding: '10px 14px', borderRadius: 8, background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.3)', color: '#fda4af', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertTriangle style={{ width: 16, height: 16, color: '#f43f5e' }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 0: ACTUATOR DIAGNOSTICS & MANUAL TESTING */}
          {activeTab === 'actuators' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ fontSize: 12, color: '#94a3b8' }}>
                Click any button below to directly trigger ESP32 hardware pins:
              </div>

              <div className="hw-actuator-grid">
                
                {/* Full Automated Decoction Brew */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header">
                    <Play style={{ width: 16, height: 16, color: '#34d399' }} /> Full 11-Step Automated Decoction
                  </div>
                  <div className="hw-actuator-desc">
                    Runs full sequence: Pod Drop → Water Pump → Heat → Stir → Filter → Dispense.
                  </div>
                  <button
                    onClick={() => handleActuatorAction('Start Brew', async () => {
                      const res = await esp32Serial.startBrew(400);
                      if (onStartHardwareBrew) onStartHardwareBrew();
                      return res;
                    })}
                    className="hw-actuator-btn primary"
                  >
                    Start Automated Hardware Brew
                  </button>
                </div>

                {/* Emergency Stop */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header">
                    <Square style={{ width: 16, height: 16, color: '#f43f5e' }} /> Emergency Stop / Reset
                  </div>
                  <div className="hw-actuator-desc">
                    Instantly turns off heater relay, shuts down pump, silences buzzer, and parks servos.
                  </div>
                  <button 
                    onClick={() => handleActuatorAction('Emergency Stop', () => esp32Serial.stopBrew())} 
                    className="hw-actuator-btn danger"
                  >
                    Stop Hardware / Reset to IDLE
                  </button>
                </div>

                {/* Active Buzzer Controls */}
                <div className="hw-actuator-card" style={{ gridColumn: 'span 2' }}>
                  <div className="hw-actuator-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Volume2 style={{ width: 16, height: 16, color: '#2dd4bf' }} />
                      <span>Active Buzzer (GPIO 25)</span>
                    </div>
                    {telemetry?.buzzer && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: telemetry.buzzer === 'ACTIVE' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(148, 163, 184, 0.2)', color: telemetry.buzzer === 'ACTIVE' ? '#34d399' : '#94a3b8', fontWeight: 700 }}>
                        {telemetry.buzzer === 'ACTIVE' ? 'SOUND ACTIVE' : 'SILENT'} ({telemetry.buzzer_active_low ? 'Active-LOW' : 'Active-HIGH'})
                      </span>
                    )}
                  </div>
                  <div className="hw-actuator-desc">
                    Dedicated ON/OFF sound toggles & module polarity inverter (supports 3-pin KY-012 modules).
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 4 }}>
                    <button 
                      onClick={() => handleActuatorAction('Buzzer ON', () => esp32Serial.buzzerOn())} 
                      className="hw-actuator-btn"
                      style={{ background: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.4)', color: '#34d399' }}
                    >
                      Buzzer ON
                    </button>
                    <button 
                      onClick={() => handleActuatorAction('Buzzer OFF', () => esp32Serial.buzzerOff())} 
                      className="hw-actuator-btn"
                      style={{ background: 'rgba(244, 63, 94, 0.15)', borderColor: 'rgba(244, 63, 94, 0.4)', color: '#fda4af' }}
                    >
                      Buzzer OFF
                    </button>
                    <button 
                      onClick={() => handleActuatorAction('Beep 2x', () => esp32Serial.testBuzzer())} 
                      className="hw-actuator-btn"
                    >
                      Beep 2x
                    </button>
                    <button 
                      onClick={() => handleActuatorAction('Invert Buzzer Polarity', () => esp32Serial.invertBuzzer())} 
                      className="hw-actuator-btn"
                      title="Toggle Active LOW vs Active HIGH logic"
                    >
                      Invert Polarity
                    </button>
                  </div>
                </div>

                {/* Peristaltic Pump */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Droplets style={{ width: 16, height: 16, color: '#38bdf8' }} />
                      <span>Pump (GPIO 26)</span>
                    </div>
                    {telemetry?.pump && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: telemetry.pump === 'ACTIVE' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(148, 163, 184, 0.2)', color: telemetry.pump === 'ACTIVE' ? '#38bdf8' : '#94a3b8', fontWeight: 700 }}>
                        {telemetry.pump}
                      </span>
                    )}
                  </div>
                  <div className="hw-actuator-desc">
                    Peristaltic 6mm water intake / dispensing pump.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    <button 
                      onClick={() => handleActuatorAction('Pump ON', () => esp32Serial.pumpOn())} 
                      className="hw-actuator-btn"
                      style={{ background: 'rgba(56, 189, 248, 0.15)', borderColor: 'rgba(56, 189, 248, 0.4)', color: '#38bdf8' }}
                    >
                      Pump ON
                    </button>
                    <button 
                      onClick={() => handleActuatorAction('Pump OFF', () => esp32Serial.pumpOff())} 
                      className="hw-actuator-btn"
                    >
                      Pump OFF
                    </button>
                  </div>
                </div>

                {/* Hall Flow Sensor (GPIO 18) */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Activity style={{ width: 16, height: 16, color: '#34d399' }} />
                      <span>Flow Sensor (GPIO 18)</span>
                    </div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(52, 211, 153, 0.2)', color: '#34d399', fontWeight: 700 }}>
                      {telemetry?.flow_rate_lpm ? `${telemetry.flow_rate_lpm.toFixed(2)} L/min` : 'IDLE (0.0 L/min)'}
                    </span>
                  </div>
                  <div className="hw-actuator-desc">
                    Volume: <strong style={{ color: '#34d399' }}>{telemetry?.water_ml?.toFixed(1) ?? 0} mL</strong> · Pulses: <strong style={{ color: '#e2e8f0' }}>{telemetry?.flow_pulses ?? 0}</strong>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    <button 
                      onClick={() => handleActuatorAction('Reset Flow Volume', () => esp32Serial.resetFlowCount())} 
                      className="hw-actuator-btn"
                      style={{ background: 'rgba(52, 211, 153, 0.15)', borderColor: 'rgba(52, 211, 153, 0.4)', color: '#34d399' }}
                    >
                      Reset Volume
                    </button>
                    <button 
                      onClick={() => handleActuatorAction('Pump 50mL Test', async () => {
                        await esp32Serial.pumpOn();
                        setTimeout(() => esp32Serial.pumpOff(), 3000);
                        return true;
                      })} 
                      className="hw-actuator-btn"
                    >
                      3s Flow Test
                    </button>
                  </div>
                </div>

                {/* Stirrer Servo 1 */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <RotateCw style={{ width: 16, height: 16, color: '#c084fc' }} />
                      <span>Stirrer Servo 1 (GPIO 13)</span>
                    </div>
                    {telemetry?.stirrer && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: telemetry.stirrer === 'ACTIVE' ? 'rgba(192, 132, 252, 0.2)' : 'rgba(148, 163, 184, 0.2)', color: telemetry.stirrer === 'ACTIVE' ? '#c084fc' : '#94a3b8', fontWeight: 700 }}>
                        {telemetry.stirrer} ({telemetry.stirrer_deg}°)
                      </span>
                    )}
                  </div>
                  <div className="hw-actuator-desc">
                    Oscillating sweep decoction agitator (30° ↔ 150°).
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 4 }}>
                    <button 
                      onClick={() => handleActuatorAction('Stirrer ON', () => esp32Serial.stirrerOn())} 
                      className="hw-actuator-btn"
                      style={{ background: 'rgba(192, 132, 252, 0.15)', borderColor: 'rgba(192, 132, 252, 0.4)', color: '#c084fc' }}
                    >
                      Start Sweep
                    </button>
                    <button 
                      onClick={() => handleActuatorAction('Stirrer OFF', () => esp32Serial.stirrerOff())} 
                      className="hw-actuator-btn"
                    >
                      Stop Stirrer
                    </button>
                  </div>
                </div>

                {/* Pod Dispenser Servo 2 */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header">
                    <Layers style={{ width: 16, height: 16, color: '#fbbf24' }} /> Pod Dispenser Servo 2 (GPIO 14)
                  </div>
                  <div className="hw-actuator-desc">
                    Herbal pod hopper flap (0° closed ↔ 90° drop).
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                    <button 
                      onClick={() => handleActuatorAction('Open Pod (90°)', () => esp32Serial.podOpen())} 
                      className="hw-actuator-btn"
                      style={{ background: 'rgba(251, 191, 36, 0.15)', borderColor: 'rgba(251, 191, 36, 0.4)', color: '#fbbf24' }}
                    >
                      Open 90°
                    </button>
                    <button 
                      onClick={() => handleActuatorAction('Close Pod (0°)', () => esp32Serial.podClose())} 
                      className="hw-actuator-btn"
                    >
                      Close 0°
                    </button>
                    <button 
                      onClick={() => handleActuatorAction('Test Drop Sweep', () => esp32Serial.testPodFlap())} 
                      className="hw-actuator-btn"
                    >
                      Sweep Test
                    </button>
                  </div>
                </div>

                {/* Heater Relay */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header" style={{ justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Flame style={{ width: 16, height: 16, color: '#fb923c' }} />
                      <span>Heater Relay (GPIO 27)</span>
                    </div>
                    {telemetry?.heater && (
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: telemetry.heater === 'ACTIVE' ? 'rgba(251, 146, 60, 0.2)' : 'rgba(148, 163, 184, 0.2)', color: telemetry.heater === 'ACTIVE' ? '#fb923c' : '#94a3b8', fontWeight: 700 }}>
                        {telemetry.heater} ({telemetry.relay_active_low !== false ? 'Active-LOW' : 'Active-HIGH'})
                      </span>
                    )}
                  </div>
                  <div className="hw-actuator-desc">
                    5V Relay coil controlling the heating element.
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 4 }}>
                    <button 
                      onClick={() => handleActuatorAction('Heater ON', () => esp32Serial.relayOn())} 
                      className="hw-actuator-btn"
                      style={{ background: 'rgba(251, 146, 60, 0.15)', borderColor: 'rgba(251, 146, 60, 0.4)', color: '#fb923c' }}
                    >
                      Relay ON
                    </button>
                    <button 
                      onClick={() => handleActuatorAction('Heater OFF', () => esp32Serial.relayOff())} 
                      className="hw-actuator-btn"
                    >
                      Relay OFF
                    </button>
                    <button 
                      onClick={() => handleActuatorAction('Invert Relay Polarity', () => esp32Serial.invertRelay())} 
                      className="hw-actuator-btn"
                      title="Toggle Active LOW vs Active HIGH logic"
                    >
                      Invert Polarity
                    </button>
                  </div>
                </div>

                {/* Test Cleaning Cycle */}
                <div className="hw-actuator-card" style={{ gridColumn: 'span 2' }}>
                  <div className="hw-actuator-header">
                    <RefreshCw style={{ width: 16, height: 16, color: '#60a5fa' }} /> Automatic Flush & Cleaning
                  </div>
                  <div className="hw-actuator-desc">
                    Runs high-flow pump flush with stirrer rinse for 10 seconds.
                  </div>
                  <button 
                    onClick={() => handleActuatorAction('Cleaning Flush', () => esp32Serial.startCleaning())} 
                    className="hw-actuator-btn"
                  >
                    Run Flush & Cleaning Routine
                  </button>
                </div>

              </div>
            </div>
          )}

          {/* TAB 1: 4x4 KEYPAD MATRIX VIEW */}
          {activeTab === 'keypad' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: 13, color: '#94a3b8' }}>
                  Physical 4x4 Matrix Keypad Map & Live Input Monitor:
                </div>
                {lastKeypadPress && (
                  <div style={{ padding: '4px 12px', borderRadius: 6, background: 'rgba(52, 211, 153, 0.2)', border: '1px solid rgba(52, 211, 153, 0.4)', color: '#34d399', fontSize: 12, fontWeight: 700 }}>
                    Last Key Pressed: <span style={{ fontSize: 16 }}>'{lastKeypadPress.key}'</span> @ {lastKeypadPress.time}
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {KEYPAD_LAYOUT.flat().map((item) => {
                  const isPressed = lastKeypadPress?.key === item.key;
                  return (
                    <div 
                      key={item.key}
                      style={{
                        padding: '12px 10px',
                        background: isPressed ? 'rgba(52, 211, 153, 0.25)' : '#090d16',
                        border: isPressed ? '2px solid #34d399' : '1px solid #1e293b',
                        borderRadius: 10,
                        textAlign: 'center',
                        transition: 'all 0.2s ease',
                        boxShadow: isPressed ? '0 0 15px rgba(52, 211, 153, 0.4)' : 'none',
                      }}
                    >
                      <div style={{ fontSize: 22, fontWeight: 800, color: item.color || '#f8fafc', marginBottom: 2 }}>
                        {item.key}
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#cbd5e1' }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                        {item.desc}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ padding: '12px 16px', background: '#090d16', border: '1px solid #1e293b', borderRadius: 10, fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>
                <strong style={{ color: '#f8fafc' }}>Keypad GPIO Pinout:</strong><br />
                • <strong>Rows (R1–R4):</strong> GPIO 32, GPIO 33, GPIO 23, GPIO 22<br />
                • <strong>Columns (C1–C4):</strong> GPIO 21, GPIO 17, GPIO 16, GPIO 5
              </div>
            </div>
          )}

          {/* TAB 2: DS18B20 SPECIALIZED PROBE VIEW */}
          {activeTab === 'ds18b20' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Main Temperature Display & Gauge */}
              <div className="hw-temp-hero">
                <div className="hw-temp-top">
                  <div className="hw-temp-pin-label">
                    <Thermometer style={{ width: 16, height: 16 }} />
                    {telemetry?.sensor_type ? `${telemetry.sensor_type} Temperature Sensor (GPIO 15)` : 'DHT11 Temperature & Humidity Sensor (GPIO 15)'}
                  </div>
                  
                  <span 
                    className="hw-thermal-chip"
                    style={{ background: thermal.bg, borderColor: thermal.border, color: thermal.color }}
                  >
                    {thermal.label}
                  </span>
                </div>

                <div className="hw-temp-val-row">
                  <div>
                    <span className="hw-temp-digits">{currentTemp.toFixed(1)}</span>
                    <span className="hw-temp-unit">°C</span>
                  </div>

                  <div className="hw-temp-fahrenheit">
                    ({currentTempF.toFixed(1)} °F)
                  </div>

                  <div className="hw-mode-source-block">
                    <div className="hw-mode-source-label">Mode Source:</div>
                    <div className="hw-mode-source-val">
                      {simTempActive ? '⚡ Dynamic Simulation Engine' : `📡 Physical ${telemetry?.sensor_type || 'DHT11'} Sensor`}
                    </div>
                  </div>
                </div>

                {/* Progress Visualizer Bar */}
                <div className="hw-bar-wrap">
                  <div className="hw-bar-labels">
                    <span>0°C (Freeze)</span>
                    <span>25°C (Ambient)</span>
                    <span>37°C (Body Heat)</span>
                    <span>85°C (Extract)</span>
                    <span>100°C (Boil)</span>
                  </div>
                  <div className="hw-bar-track">
                    <div 
                      className="hw-bar-fill"
                      style={{ width: `${Math.min(100, Math.max(0, (currentTemp / 100) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* No Lighter / Test Options Panel */}
              <div className="hw-info-grid">
                
                {/* How to test without lighter */}
                <div className="hw-card-panel">
                  <div className="hw-panel-title">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Sparkles style={{ width: 16, height: 16, color: '#34d399' }} />
                      How to Test DS18B20 without a Lighter:
                    </span>
                  </div>
                  <ul className="hw-panel-list">
                    <li>
                      <strong style={{ color: '#6ee7b7' }}>Body Heat Test:</strong> Pinch and hold the metal sensor probe firmly between your fingers. You will see the temperature rise from <strong>~24°C → ~34°C</strong>!
                    </li>
                    <li>
                      <strong style={{ color: '#7dd3fc' }}>Warm Water Cup:</strong> Dip the waterproof probe in a cup of warm water to test higher ranges (50°C–70°C).
                    </li>
                    <li>
                      <strong style={{ color: '#fcd34d' }}>Simulation Mode:</strong> Toggle software simulation to simulate the full <strong>25°C → 90°C</strong> heating curve automatically!
                    </li>
                  </ul>
                </div>

                {/* Simulation & Manual Offsets */}
                <div className="hw-card-panel">
                  <div className="hw-panel-title">
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Flame style={{ width: 16, height: 16, color: '#fb923c' }} />
                      Thermal Simulation & Controls
                    </span>
                    <button
                      onClick={handleToggleSim}
                      className={`hw-sim-toggle-pill ${simTempActive ? 'active' : 'inactive'}`}
                    >
                      {simTempActive ? 'Mode: SIMULATED' : 'Mode: LIVE PROBE'}
                    </button>
                  </div>

                  <p style={{ fontSize: 11, color: '#94a3b8' }}>
                    Inject temperature changes to verify UI decoction thresholds in real time:
                  </p>

                  <div className="hw-offset-btn-row">
                    <button onClick={() => setManualOffset((p) => p + 5)} className="hw-offset-btn warm">
                      +5°C Warm
                    </button>
                    <button onClick={() => setManualOffset((p) => Math.max(-20, p - 5))} className="hw-offset-btn cool">
                      -5°C Cool
                    </button>
                    <button onClick={() => setManualOffset(0)} className="hw-offset-btn">
                      Reset (0°C)
                    </button>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 3: FULL TELEMETRY */}
          {activeTab === 'telemetry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Metric Tiles Grid */}
              <div className="hw-metric-grid">
                <div className="hw-tile">
                  <div className="hw-tile-top">
                    <span>DS18B20 Temp</span>
                    <Flame style={{ width: 16, height: 16, color: '#fb923c' }} />
                  </div>
                  <div className="hw-tile-value">
                    {currentTemp.toFixed(1)} <span style={{ fontSize: 14, color: '#94a3b8' }}>°C</span>
                  </div>
                  <div className="hw-tile-sub" style={{ color: '#34d399' }}>
                    {simTempActive ? 'Simulated Heating Curve' : 'DS18B20 Live Probe'}
                  </div>
                </div>

                <div className="hw-tile">
                  <div className="hw-tile-top">
                    <span>Flow Sensor (6mm)</span>
                    <Droplets style={{ width: 16, height: 16, color: '#38bdf8' }} />
                  </div>
                  <div className="hw-tile-value">
                    {telemetry ? telemetry.water_ml.toFixed(0) : '0'} <span style={{ fontSize: 14, color: '#94a3b8' }}>mL</span>
                  </div>
                  <div className="hw-tile-sub">
                    Target: {telemetry ? telemetry.target_water_ml : '400'} mL
                  </div>
                </div>

                <div className="hw-tile">
                  <div className="hw-tile-top">
                    <span>Decoction Phase</span>
                    <Activity style={{ width: 16, height: 16, color: '#34d399' }} />
                  </div>
                  <div className="hw-tile-value" style={{ color: '#34d399', fontSize: 18, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {telemetry ? telemetry.phase : 'IDLE'}
                  </div>
                  <div className="hw-tile-sub">
                    Elapsed: {telemetry ? telemetry.elapsed_sec : '0'}s
                  </div>
                </div>

                <div className="hw-tile">
                  <div className="hw-tile-top">
                    <span>Stirrer Servo 1</span>
                    <RotateCw style={{ width: 16, height: 16, color: '#c084fc' }} />
                  </div>
                  <div className="hw-tile-value">
                    {telemetry ? telemetry.stirrer_deg : '30'} <span style={{ fontSize: 14, color: '#94a3b8' }}>°</span>
                  </div>
                  <div className="hw-tile-sub" style={{ color: '#c084fc' }}>
                    {telemetry?.stirrer === 'ACTIVE' ? 'Agitating (30°-150°)' : 'Parked'}
                  </div>
                </div>
              </div>

              {/* Actuator Status Grid */}
              <div className="hw-card-panel">
                <div className="hw-panel-title">Live Hardware Actuator States</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: telemetry?.heater === 'ACTIVE' ? 'rgba(251, 146, 60, 0.15)' : '#090d16', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>Heater Relay (27)</span>
                    <strong style={{ color: telemetry?.heater === 'ACTIVE' ? '#fb923c' : '#64748b' }}>{telemetry?.heater || 'OFF'}</strong>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: telemetry?.pump === 'ACTIVE' ? 'rgba(56, 189, 248, 0.15)' : '#090d16', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>Pump (26)</span>
                    <strong style={{ color: telemetry?.pump === 'ACTIVE' ? '#38bdf8' : '#64748b' }}>{telemetry?.pump || 'OFF'}</strong>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: telemetry?.stirrer === 'ACTIVE' ? 'rgba(192, 132, 252, 0.15)' : '#090d16', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>Stirrer (13)</span>
                    <strong style={{ color: telemetry?.stirrer === 'ACTIVE' ? '#c084fc' : '#64748b' }}>{telemetry?.stirrer || 'OFF'}</strong>
                  </div>
                  <div style={{ padding: '10px 14px', borderRadius: 8, background: '#090d16', border: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ color: '#94a3b8' }}>Buzzer (25)</span>
                    <strong style={{ color: telemetry?.buzzer === 'ACTIVE' ? '#34d399' : '#64748b' }}>{telemetry?.buzzer || 'OFF'}</strong>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: LIVE SERIAL TERMINAL MONITOR */}
          {activeTab === 'terminal' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12, color: '#94a3b8' }}>
                <span>Real-time USB Serial stream (115200 Baud):</span>
                <span style={{ color: '#64748b' }}>{logs.length} packet(s) logged</span>
              </div>

              <div 
                ref={logContainerRef}
                style={{
                  height: 320,
                  overflowY: 'auto',
                  background: '#040711',
                  border: '1px solid #1e293b',
                  borderRadius: 8,
                  padding: '10px 14px',
                  fontFamily: 'monospace',
                  fontSize: 11,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                }}
              >
                {logs.length === 0 ? (
                  <div style={{ color: '#64748b', fontStyle: 'italic' }}>No serial packets recorded yet. Connect ESP32 to start streaming.</div>
                ) : (
                  logs.map((l, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, lineHeight: 1.4 }}>
                      <span style={{ color: '#64748b' }}>[{l.time}]</span>
                      <span style={{ 
                        fontWeight: 700, 
                        color: l.direction === 'TX' ? '#38bdf8' : l.direction === 'RX' ? '#34d399' : '#fbbf24',
                        minWidth: 28 
                      }}>
                        {l.direction}:
                      </span>
                      <span style={{ color: l.direction === 'TX' ? '#bae6fd' : l.direction === 'RX' ? '#a7f3d0' : '#fef08a', wordBreak: 'break-all' }}>
                        {l.text}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: PINOUT & WIRING */}
          {activeTab === 'pinout' && (
            <div className="hw-table-wrap">
              <table className="hw-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th>ESP32 Pin</th>
                    <th>Power Rail</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Built-in Blue LED</strong></td>
                    <td><span className="hw-pin-tag">GPIO 2</span></td>
                    <td>Internal</td>
                    <td>Turns ON when connected to Web Serial.</td>
                  </tr>
                  <tr>
                    <td><strong>4x4 Matrix Keypad</strong></td>
                    <td><span className="hw-pin-tag">R: 32,33,23,22 | C: 21,17,16,5</span></td>
                    <td>Internal Pull-ups</td>
                    <td>Physical recipe preset & actuator triggers.</td>
                  </tr>
                  <tr>
                    <td><strong>DS18B20 Temp Probe</strong></td>
                    <td><span className="hw-pin-tag">GPIO 19</span></td>
                    <td>3.3V & GND</td>
                    <td>Requires 4.7kΩ resistor between Data & 3.3V.</td>
                  </tr>
                  <tr>
                    <td><strong>Push Button</strong></td>
                    <td><span className="hw-pin-tag">GPIO 4</span></td>
                    <td>GND</td>
                    <td>Internal pull-up. Button connects GPIO 4 to GND.</td>
                  </tr>
                  <tr>
                    <td><strong>Peristaltic Pump</strong></td>
                    <td><span className="hw-pin-tag">GPIO 26</span></td>
                    <td>Ext 12V/5V</td>
                    <td>Driven via MOSFET (IRF520) or Relay.</td>
                  </tr>
                  <tr>
                    <td><strong>Flow Sensor (6mm)</strong></td>
                    <td><span className="hw-pin-tag">GPIO 18</span></td>
                    <td>5V / 3.3V</td>
                    <td>Interrupt pin counts water pulses (5.88 pulses/mL).</td>
                  </tr>
                  <tr>
                    <td><strong>Servo 1 (Stirrer)</strong></td>
                    <td><span className="hw-pin-tag">GPIO 13</span></td>
                    <td>VIN (5V) & GND</td>
                    <td>Oscillates 30° ↔ 150° during decoction.</td>
                  </tr>
                  <tr>
                    <td><strong>Servo 2 (Pod Flap)</strong></td>
                    <td><span className="hw-pin-tag">GPIO 14</span></td>
                    <td>VIN (5V) & GND</td>
                    <td>Rotates 0° ↔ 90° to dispense herbal pod.</td>
                  </tr>
                  <tr>
                    <td><strong>Heater Relay</strong></td>
                    <td><span className="hw-pin-tag">GPIO 27</span></td>
                    <td>VIN (5V) & GND</td>
                    <td>Active LOW relay triggers heater element.</td>
                  </tr>
                  <tr>
                    <td><strong>Active Buzzer</strong></td>
                    <td><span className="hw-pin-tag">GPIO 25</span></td>
                    <td>3.3V / 5V & GND</td>
                    <td>Active-LOW & HIGH polarity support.</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="hw-modal-footer">
          <span>Firmware: <code style={{ color: '#34d399' }}>firmware/ikwath_esp32_firmware.ino</code></span>
          <button onClick={onClose} className="hw-btn-close">
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
