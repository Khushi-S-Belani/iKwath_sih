import React, { useState } from 'react';
import { StatusChip } from './StatusChip';
import { AlertBanner } from './AlertBanner';

interface SubsystemRow {
  name: string;
  state: string;
  variant: 'active' | 'off' | 'fault' | 'warning' | 'connected' | 'lost' | 'info';
  notes?: string;
}

const SUBSYSTEMS: SubsystemRow[] = [
  { name: 'Temperature sensor', state: 'CONNECTED', variant: 'connected' },
  { name: 'Load cell', state: 'CONNECTED', variant: 'connected' },
  { name: 'Heater', state: 'OFF', variant: 'off' },
  { name: 'Stirrer', state: 'OFF', variant: 'off' },
  { name: 'Pump', state: 'OFF', variant: 'off' },
  { name: 'Product valve', state: 'CLOSED', variant: 'off' },
  { name: 'Drain valve', state: 'CLOSED', variant: 'off' },
  { name: 'Pod reader (NFC)', state: 'CONNECTED', variant: 'connected' },
  { name: 'Raspberry Pi', state: 'ONLINE', variant: 'active' },
  { name: 'ESP32', state: 'CONNECTED', variant: 'connected' },
];

interface TechnicianScreenProps {}

export const TechnicianScreen: React.FC<TechnicianScreenProps> = () => {
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [runLog, setRunLog] = useState<string[]>([]);

  const runTest = (action: string) => {
    setConfirmAction(null);
    setRunLog((prev) => [`[${new Date().toLocaleTimeString()}] ${action} — completed OK`, ...prev]);
  };

  const ACTIONS = [
    { id: 'sensor-diag', label: 'Sensor diagnostics', confirm: true },
    { id: 'loadcell-cal', label: 'Load-cell calibration', confirm: true },
    { id: 'temp-cal', label: 'Temperature calibration', confirm: true },
    { id: 'pump-prime', label: 'Pump prime / test', confirm: true },
    { id: 'valve-test', label: 'Valve test', confirm: true },
    { id: 'stirrer-test', label: 'Stirrer test', confirm: true },
    { id: 'heater-test', label: 'Heater test (interlock)', confirm: true },
    { id: 'rinse-test', label: 'Rinse test', confirm: true },
    { id: 'controller-restart', label: 'Controller restart', confirm: true },
  ];

  return (
    <div className="screen-content technician-screen">
      <div className="tech-header">
        <div className="tech-title">TECHNICIAN MODE</div>
        <div className="tech-sub">Diagnostics, calibration and actuator tests. All actions require confirmation.</div>
      </div>

      <AlertBanner
        severity="WARNING"
        message="Actuator tests operate real hardware. Ensure the machine is safe before running any test."
        action="Confirm each action in the dialog before proceeding."
      />

      <div className="tech-layout">
        {/* Subsystem Health */}
        <div className="tech-subsystems">
          <div className="tech-section-title">Subsystem Health</div>
          <div className="tech-subsystem-grid">
            {SUBSYSTEMS.map((s) => (
              <div key={s.name} className="tech-subsystem-row">
                <span className="tech-subsystem-name">{s.name}</span>
                <StatusChip label={s.state} variant={s.variant} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="tech-actions-col">
          <div className="tech-section-title">Actions</div>
          <div className="tech-action-list">
            {ACTIONS.map((action) => (
              <button
                key={action.id}
                id={`tech-${action.id}`}
                className="tech-action-btn"
                onClick={() => setConfirmAction(action.label)}
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
              This will operate real hardware. Confirm that the machine is in a safe state before proceeding.
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
