import React, { useState, useEffect } from 'react';
import { esp32Serial, ESP32Telemetry } from '../services/esp32Serial';
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
  Check
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
  const [activeTab, setActiveTab] = useState<'ds18b20' | 'telemetry' | 'actuators' | 'pinout'>('actuators');

  useEffect(() => {
    setIsSupported(esp32Serial.isSupported());

    const unsubConn = esp32Serial.onConnectionChange((connected, info) => {
      setIsConnected(connected);
      if (info) setPortLabel(info);
      setConnecting(false);
    });

    const unsubTelem = esp32Serial.onTelemetry((data) => {
      setTelemetry(data);
      setSimTempActive(data.sim_mode);
    });

    return () => {
      unsubConn();
      unsubTelem();
    };
  }, []);

  if (!isOpen) return null;

  const showFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => setActionFeedback(null), 3000);
  };

  const handleConnect = async () => {
    setErrorMsg(null);
    setConnecting(true);
    try {
      await esp32Serial.connect();
      showFeedback('ESP32 Connected! Built-in LED is ON (GPIO 2)');
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

  const handleActuatorAction = async (name: string, fn: () => any) => {
    try {
      await fn();
      if (isConnected) {
        showFeedback(`Command sent: ${name} ✔️`);
      } else {
        showFeedback(`Simulated ${name} (Connect USB to trigger physical ESP32)`);
      }
    } catch (e: any) {
      setErrorMsg(`Error executing ${name}: ` + e.message);
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
                ESP32 Hardware & DS18B20 Controller
                {isConnected && (
                  <span className="hw-live-badge">
                    ● LIVE 115200 BAUD (LED ON)
                  </span>
                )}
              </div>
              <div className="hw-modal-sub">
                DS18B20 Temp Probe · Actuator Drivers · Flow Meter · Dual Simulation
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
            onClick={() => setActiveTab('ds18b20')}
            className={`hw-tab-btn orange ${activeTab === 'ds18b20' ? 'active' : ''}`}
          >
            <Thermometer style={{ width: 16, height: 16 }} /> DS18B20 Temp Probe
          </button>
          <button
            onClick={() => setActiveTab('telemetry')}
            className={`hw-tab-btn green ${activeTab === 'telemetry' ? 'active' : ''}`}
          >
            <Activity style={{ width: 16, height: 16 }} /> System Telemetry
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
                  {isConnected ? (portLabel || 'ESP32 Connected via USB Serial') : 'ESP32 Disconnected'}
                </div>
                <div className="hw-conn-desc">
                  {isConnected 
                    ? 'Built-in LED is ON (GPIO 2). Actuators ready for control.' 
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
                Click any action below to test hardware actuators in real time:
              </div>

              <div className="hw-actuator-grid">
                
                {/* Start Hardware Brew Sequence */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header">
                    <Play style={{ width: 16, height: 16, color: '#34d399' }} /> Full 11-Step Automated Decoction
                  </div>
                  <div className="hw-actuator-desc">
                    Runs full sequence: Pod Drop → Water Pump → Heat → Stir → Filter → Dispense.
                  </div>
                  <button
                    onClick={() => handleActuatorAction('Start Brew', () => {
                      esp32Serial.startBrew(400);
                      if (onStartHardwareBrew) onStartHardwareBrew();
                    })}
                    className="hw-actuator-btn primary"
                  >
                    Start Automated Hardware Brew
                  </button>
                </div>

                {/* Emergency Stop */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header">
                    <Square style={{ width: 16, height: 16, color: '#f43f5e' }} /> Stop / Reset Actuators
                  </div>
                  <div className="hw-actuator-desc">
                    Instantly turns off heater relay, shuts down pump, and parks both servos.
                  </div>
                  <button 
                    onClick={() => handleActuatorAction('Emergency Stop', () => esp32Serial.stopBrew())} 
                    className="hw-actuator-btn danger"
                  >
                    Stop Hardware / Reset to IDLE
                  </button>
                </div>

                {/* Test Peristaltic Pump */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header">
                    <Droplets style={{ width: 16, height: 16, color: '#38bdf8' }} /> Peristaltic Pump (GPIO 26)
                  </div>
                  <div className="hw-actuator-desc">
                    Toggles 12V/5V DC Pump MOSFET to test water suction & tubing flow.
                  </div>
                  <button 
                    onClick={() => handleActuatorAction('Toggle Pump', () => esp32Serial.testPump())} 
                    className="hw-actuator-btn"
                  >
                    Toggle Peristaltic Pump ON/OFF
                  </button>
                </div>

                {/* Test Stirrer Servo */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header">
                    <RotateCw style={{ width: 16, height: 16, color: '#c084fc' }} /> Stirrer Servo 1 (GPIO 13)
                  </div>
                  <div className="hw-actuator-desc">
                    Starts/stops 30° ↔ 150° continuous oscillation agitator in vessel.
                  </div>
                  <button 
                    onClick={() => handleActuatorAction('Toggle Stirrer', () => esp32Serial.testStirrer())} 
                    className="hw-actuator-btn"
                  >
                    Toggle Stirrer Oscillation
                  </button>
                </div>

                {/* Test Pod Drop Flap Servo */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header">
                    <Layers style={{ width: 16, height: 16, color: '#fbbf24' }} /> Pod Dispenser Servo 2 (GPIO 14)
                  </div>
                  <div className="hw-actuator-desc">
                    Rotates pod drop flap 90° for 1.5s, then returns to 0° home position.
                  </div>
                  <button 
                    onClick={() => handleActuatorAction('Test Pod Flap', () => esp32Serial.testPodFlap())} 
                    className="hw-actuator-btn"
                  >
                    Test Pod Drop Sweep (0° → 90° → 0°)
                  </button>
                </div>

                {/* Test Heater Relay */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header">
                    <Flame style={{ width: 16, height: 16, color: '#fb923c' }} /> Heater Relay (GPIO 27)
                  </div>
                  <div className="hw-actuator-desc">
                    Toggles 5V Relay coil (clicks relay to test heating load circuit).
                  </div>
                  <button 
                    onClick={() => handleActuatorAction('Toggle Heater Relay', () => esp32Serial.testRelay())} 
                    className="hw-actuator-btn"
                  >
                    Toggle Heater Relay ON/OFF
                  </button>
                </div>

                {/* Test Buzzer */}
                <div className="hw-actuator-card">
                  <div className="hw-actuator-header">
                    <Volume2 style={{ width: 16, height: 16, color: '#2dd4bf' }} /> Active Buzzer (GPIO 25)
                  </div>
                  <div className="hw-actuator-desc">
                    Plays dual-beep audio notification chime on piezo buzzer.
                  </div>
                  <button 
                    onClick={() => handleActuatorAction('Beep Buzzer', () => esp32Serial.testBuzzer())} 
                    className="hw-actuator-btn"
                  >
                    Beep Buzzer
                  </button>
                </div>

                {/* Test Cleaning Cycle */}
                <div className="hw-actuator-card">
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

          {/* TAB 1: DS18B20 SPECIALIZED PROBE VIEW */}
          {activeTab === 'ds18b20' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              
              {/* Main Temperature Display & Gauge */}
              <div className="hw-temp-hero">
                <div className="hw-temp-top">
                  <div className="hw-temp-pin-label">
                    <Thermometer style={{ width: 16, height: 16 }} />
                    DS18B20 OneWire Temperature Probe (GPIO 19)
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
                      {simTempActive ? '⚡ Dynamic Simulation Engine' : '📡 Physical DS18B20 Sensor'}
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

              {/* Standalone Diagnostic Tool Note */}
              <div style={{ padding: '10px 16px', background: '#090d16', border: '1px solid #1e293b', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, color: '#94a3b8' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CheckCircle2 style={{ width: 16, height: 16, color: '#34d399' }} />
                  <span>Standalone Diagnostic Sketch: <code style={{ color: '#34d399' }}>firmware/ds18b20_quick_test.ino</code></span>
                </div>
                <span style={{ color: '#64748b' }}>OneWire Pin: GPIO 19 + 4.7kΩ Pullup</span>
              </div>

            </div>
          )}

          {/* TAB 2: FULL TELEMETRY */}
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
                    <span style={{ color: '#94a3b8' }}>Button (4)</span>
                    <strong style={{ color: '#34d399' }}>READY</strong>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: PINOUT & WIRING */}
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
                    <td><strong>DS18B20 Temp</strong></td>
                    <td><span className="hw-pin-tag">GPIO 19</span></td>
                    <td>3.3V / 5V</td>
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
                    <td>Driven via MOSFET (IRF520) or Relay Ch 1.</td>
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
                    <td>Ext 5V</td>
                    <td>Oscillates 30° ↔ 150° during decoction.</td>
                  </tr>
                  <tr>
                    <td><strong>Servo 2 (Pod Flap)</strong></td>
                    <td><span className="hw-pin-tag">GPIO 14</span></td>
                    <td>Ext 5V</td>
                    <td>Rotates 0° ↔ 90° to dispense herbal pod.</td>
                  </tr>
                  <tr>
                    <td><strong>Heater Relay</strong></td>
                    <td><span className="hw-pin-tag">GPIO 27</span></td>
                    <td>5V (Vin)</td>
                    <td>Active LOW relay triggers heater element.</td>
                  </tr>
                  <tr>
                    <td><strong>Active Buzzer</strong></td>
                    <td><span className="hw-pin-tag">GPIO 25</span></td>
                    <td>GND</td>
                    <td>Beeps on Start, Step changes, and Alerts.</td>
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
