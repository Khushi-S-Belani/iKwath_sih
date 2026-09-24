import React, { useState, useEffect } from 'react';
import { StatusChip } from './StatusChip';
import { AlertBanner } from './AlertBanner';
import { esp32Serial, ESP32Telemetry } from '../services/esp32Serial';

interface SubsystemRow {
  name: string;
  state: string;
  variant: 'active' | 'off' | 'fault' | 'warning' | 'connected' | 'lost' | 'info';
  notes?: string;
}

interface TechnicianScreenProps {
  onOpenHardwareModal?: () => void;
}

export const TechnicianScreen: React.FC<TechnicianScreenProps> = ({ onOpenHardwareModal }) => {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [runLog, setRunLog] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(esp32Serial.isConnected());
  const [telemetry, setTelemetry] = useState<ESP32Telemetry | null>(esp32Serial.getLatestTelemetry());

  useEffect(() => {
    const unsubConn = esp32Serial.onConnectionChange((connected) => {
      setIsConnected(connected);
    });

    const unsubTelem = esp32Serial.onTelemetry((data) => {
      setTelemetry(data);
    });

    return () => {
      unsubConn();
      unsubTelem();
    };
  }, []);

  const runTest = async (action: string) => {
    setConfirmAction(null);
    if (esp32Serial.isConnected()) {
      if (action.includes('Pump')) await esp32Serial.testPump();
      else if (action.includes('Stirrer')) await esp32Serial.testStirrer();
      else if (action.includes('Heater')) await esp32Serial.testRelay();
      else if (action.includes('Rinse')) await esp32Serial.startCleaning();
      else if (action.includes('Buzzer')) await esp32Serial.testBuzzer();
      else if (action.includes('Pod')) await esp32Serial.testPodFlap();
      else if (action.includes('Simulate')) await esp32Serial.toggleTempSimulation();
      setRunLog((prev) => [`[${new Date().toLocaleTimeString()}] ${action} — sent to ESP32 ✔️`, ...prev.slice(0, 19)]);
    } else {
      setRunLog((prev) => [`[${new Date().toLocaleTimeString()}] ${action} (ESP32 not connected - standalone mode)`, ...prev.slice(0, 19)]);
    }
  };

  const subsystems: SubsystemRow[] = [
    {
      name: telemetry?.sensor_type ? `${telemetry.sensor_type} Temp Sensor (GPIO 15)` : 'DS18B20 Temp Sensor (GPIO 15)',
      state: telemetry
        ? `${telemetry.temp_c.toFixed(1)}°C ${telemetry.humidity !== undefined ? `| ${telemetry.humidity.toFixed(0)}% RH` : ''} (${telemetry.sim_mode ? 'Simulated' : 'Physical'})`
        : isConnected ? 'CONNECTED (25.0°C)' : 'STANDALONE',
      variant: telemetry ? (telemetry.temp_c > 40 ? 'warning' : 'connected') : 'info',
    },
    {
      name: 'Flow Sensor 6mm (GPIO 18)',
      state: telemetry ? `${telemetry.water_ml.toFixed(0)} mL (Target: ${telemetry.target_water_ml} mL)` : 'READY',
      variant: 'connected',
    },
    {
      name: 'Heater Relay (GPIO 27)',
      state: telemetry?.heater === 'ACTIVE' ? 'ACTIVE (RELAY ON)' : 'OFF',
      variant: telemetry?.heater === 'ACTIVE' ? 'active' : 'off',
    },
    {
      name: 'Stirrer Servo 1 (GPIO 13)',
      state: telemetry?.stirrer === 'ACTIVE' ? `ACTIVE (${telemetry.stirrer_deg}°)` : `PARKED (${telemetry?.stirrer_deg ?? 30}°)`,
      variant: telemetry?.stirrer === 'ACTIVE' ? 'active' : 'off',
    },
    {
      name: 'Peristaltic Pump (GPIO 26)',
      state: telemetry?.pump === 'ACTIVE' ? 'ACTIVE (PUMPING)' : 'OFF',
      variant: telemetry?.pump === 'ACTIVE' ? 'active' : 'off',
    },
    {
      name: 'Pod Flap Servo 2 (GPIO 14)',
      state: telemetry?.pod_deg && telemetry.pod_deg > 0 ? `OPEN (${telemetry.pod_deg}°)` : 'CLOSED (0°)',
      variant: telemetry?.pod_deg && telemetry.pod_deg > 0 ? 'active' : 'off',
    },
    {
      name: 'Active Buzzer (GPIO 25)',
      state: telemetry?.buzzer === 'ACTIVE' ? 'SOUND ACTIVE' : 'READY (SILENT)',
      variant: telemetry?.buzzer === 'ACTIVE' ? 'warning' : 'connected',
    },
    {
      name: 'Start Push Button (GPIO 4)',
      state: 'READY (PULL-UP)',
      variant: 'connected',
    },
    {
      name: 'ESP32 Controller',
      state: isConnected ? 'LIVE @ 115200 BAUD' : 'OFFLINE (CLICK TO CONNECT)',
      variant: isConnected ? 'active' : 'off',
    },
  ];

  const ACTIONS = [
    { id: 'esp32-bridge', label: '⚡ Open ESP32 Live Hardware Modal', highlight: true },
    { id: 'sim-temp', label: '🔥 Toggle Temp Simulation Mode', highlight: false },
    { id: 'pump-prime', label: 'Pump prime / test (GPIO 26)', confirm: true },
    { id: 'stirrer-test', label: 'Stirrer Servo test (GPIO 13)', confirm: true },
    { id: 'pod-test', label: 'Pod Drop Flap Servo test (GPIO 14)', confirm: true },
    { id: 'heater-test', label: 'Heater Relay test (GPIO 27)', confirm: true },
    { id: 'buzzer-test', label: 'Active Buzzer chime test (GPIO 25)', confirm: true },
    { id: 'rinse-test', label: 'Rinse & Flush cycle', confirm: true },
  ];

  return (
    <div className="screen-content technician-screen">
      <div className="tech-header">
        <div className="tech-title">TECHNICIAN MODE</div>
        <div className="tech-sub">ESP32 Hardware Diagnostics, Calibration and Actuator Tests.</div>
      </div>

      <AlertBanner
        severity="WARNING"
        message="Actuator tests operate real hardware (Pump, Servos, Heater Relay). Ensure machine is safe before testing."
        action="Confirm each action in the dialog before proceeding."
      />

      <div className="tech-layout">
        {/* Subsystem Health */}
        <div className="tech-subsystems">
          <div className="tech-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>Hardware Subsystem Health</span>
            {isConnected && (
              <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>● ESP32 TELEMETRY LIVE</span>
            )}
          </div>
          <div className="tech-subsystem-grid">
            {subsystems.map((s) => (
              <div key={s.name} className="tech-subsystem-row">
                <span className="tech-subsystem-name">{s.name}</span>
                <StatusChip label={s.state} variant={s.variant} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="tech-actions-col">
          <div className="tech-section-title">Hardware Actions & Tests</div>
          <div className="tech-action-list">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                id={`tech-${action.id}`}
                className={`tech-action-btn ${action.highlight ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300 font-bold' : ''}`}
                onClick={() => {
                  if (action.id === 'esp32-bridge' && onOpenHardwareModal) {
                    onOpenHardwareModal();
                  } else if (action.id === 'sim-temp') {
                    runTest('Toggle Temperature Simulation');
                  } else if (action.confirm) {
                    setConfirmAction(action.label);
                  } else {
                    runTest(action.label);
                  }
                }}
              >
                {action.label}
              </button>
            ))}
          </div>

          {/* Run log */}
          {runLog.length > 0 && (
            <div className="tech-log">
              <div className="tech-log-title">Action Log</div>
              {runLog.map((entry, i) => (
                <div key={i} className="tech-log-entry">{entry}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Confirm Dialog */}
      {confirmAction && (
        <div className="brew-cancel-overlay">
          <div className="brew-cancel-dialog">
            <div className="brew-cancel-title">Run: {confirmAction}?</div>
            <div className="brew-cancel-body">
              This will trigger real hardware actuators via ESP32. Confirm that tubing and electrical connections are secure.
            </div>
            <div className="brew-cancel-actions">
              <button id="btn-tech-cancel" className="btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
              <button id="btn-tech-confirm" className="btn-primary" onClick={() => runTest(confirmAction)}>
                Confirm & Run
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
