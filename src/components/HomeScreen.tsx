import React from 'react';
import { MachineStatus, BrewRecord, SensorData } from '../types';
import { StatusChip } from './StatusChip';
import { AlertBanner } from './AlertBanner';
import { Cpu, Flame, Droplets, RotateCw, Activity } from 'lucide-react';

interface HomeScreenProps {
  machineStatus: MachineStatus;
  lastBrew: BrewRecord | null;
  chamberClean: boolean;
  waterReady: boolean;
  sensor?: SensorData;
  hardwareConnected?: boolean;
  onInsertPod: () => void;
  onViewHistory: () => void;
  onOpenHardwareModal?: () => void;
}

const STATUS_CONFIG: Record<MachineStatus, { label: string; color: string; chipVariant: 'active' | 'off' | 'fault' | 'warning' | 'info' }> = {
  READY: { label: 'Ready for a new brew', color: 'var(--success)', chipVariant: 'active' },
  BUSY: { label: 'Brew in progress', color: 'var(--accent)', chipVariant: 'info' },
  CLEANING: { label: 'Cleaning cycle in progress', color: 'var(--amber)', chipVariant: 'warning' },
  ATTENTION: { label: 'Action required before starting', color: 'var(--amber)', chipVariant: 'warning' },
  OFFLINE: { label: 'Local machine available — network unavailable', color: 'var(--text-muted)', chipVariant: 'off' },
  FAULT: { label: 'Fault — service required', color: 'var(--danger)', chipVariant: 'fault' },
};

export const HomeScreen: React.FC<HomeScreenProps> = ({
  machineStatus,
  lastBrew,
  chamberClean,
  waterReady,
  sensor,
  hardwareConnected = false,
  onInsertPod,
  onViewHistory,
  onOpenHardwareModal,
}) => {
  const cfg = STATUS_CONFIG[machineStatus];
  const isReady = machineStatus === 'READY';

  const liveTemp = sensor?.temperature_c ?? 24.2;
  const liveMass = sensor?.mass_g ?? 0;

  return (
    <div className="screen-content home-screen">
      {/* Status Hero */}
      <div className="home-hero">
        <div className="home-brand-mark">
          <span>i</span>
          <div className="home-brand-pulse" />
        </div>
        <div className="home-status-block">
          <div className="home-title">iKwath</div>
          <div className="home-badges">
            <StatusChip label={cfg.label} variant={cfg.chipVariant} />
          </div>
        </div>
      </div>

      <div className="home-sub-text">{cfg.description}</div>

      {/* Live ESP32 Precision Hardware Telemetry Bar */}
      <div className="home-telemetry-grid">
        {/* DS18B20 Temp Sensor */}
        <div className="home-tele-tile temp">
          <div className="home-tele-icon-box temp">
            <Flame style={{ width: 18, height: 18 }} />
          </div>
          <div className="home-tele-data">
            <div className="home-tele-tag">EXTRACTION TEMP</div>
            <div className="home-tele-val temp">
              {liveTemp.toFixed(1)}<span className="home-tele-unit">°C</span>
            </div>
            <div className="home-tele-sub">DS18B20 Sensor Live</div>
          </div>
        </div>

        {/* Chamber Fluid / Mass Sensor */}
        <div className="home-tele-tile fluid">
          <div className="home-tele-icon-box fluid">
            <Droplets style={{ width: 18, height: 18 }} />
          </div>
          <div className="home-tele-data">
            <div className="home-tele-tag">CHAMBER FLUID</div>
            <div className="home-tele-val fluid">
              {liveMass.toFixed(0)}<span className="home-tele-unit">mL</span>
            </div>
            <div className="home-tele-sub">Flow Sensor / Load Cell</div>
          </div>
        </div>

        {/* Process Actuator Status */}
        <div className="home-tele-tile actuators">
          <div className={`home-tele-icon-box actuators ${sensor?.heater === 'ACTIVE' || sensor?.pump === 'ACTIVE' || sensor?.stirrer === 'ACTIVE' ? 'active' : ''}`}>
            <RotateCw style={{ width: 18, height: 18 }} />
          </div>
          <div className="home-tele-data">
            <div className="home-tele-tag">ACTUATOR STATUS</div>
            <div className={`home-tele-val actuators ${sensor?.heater === 'ACTIVE' || sensor?.pump === 'ACTIVE' || sensor?.stirrer === 'ACTIVE' ? 'active' : ''}`}>
              {sensor?.heater === 'ACTIVE' ? 'HEATER ON' : sensor?.pump === 'ACTIVE' ? 'PUMP ON' : sensor?.stirrer === 'ACTIVE' ? 'STIRRER ON' : 'STANDBY'}
            </div>
            <div className="home-tele-sub">Relays & Stepper</div>
          </div>
        </div>

        {/* Controller Connection Link */}
        <div
          className={`home-tele-tile link ${hardwareConnected ? 'connected' : 'disconnected'}`}
          onClick={onOpenHardwareModal}
          title="Click to open ESP32 Hardware Diagnostics Modal"
        >
          <div className={`home-tele-icon-box link ${hardwareConnected ? 'connected' : 'disconnected'}`}>
            <Cpu style={{ width: 18, height: 18 }} />
          </div>
          <div className="home-tele-data">
            <div className="home-tele-tag">ESP32 CONTROLLER</div>
            <div className={`home-tele-val link ${hardwareConnected ? 'connected' : 'disconnected'}`}>
              {hardwareConnected ? 'SYNCED' : 'OFFLINE'}
            </div>
            <div className="home-tele-sub">{hardwareConnected ? '115200 Baud Bridge' : 'Click to Connect'}</div>
          </div>
        </div>
      </div>

      {/* Attention alert */}
      {machineStatus === 'ATTENTION' && (
        <div style={{ marginBottom: 12 }}>
          <AlertBanner
            severity="WARNING"
            message="Action required before starting a new brew."
            action="Check chamber or water level."
          />
        </div>
      )}
      {machineStatus === 'OFFLINE' && (
        <div style={{ marginBottom: 12 }}>
          <AlertBanner
            severity="INFO"
            message="Network unavailable — local brew is still operational."
            action="Check Wi-Fi settings in System."
          />
        </div>
      )}
      {machineStatus === 'FAULT' && (
        <div style={{ marginBottom: 12 }}>
          <AlertBanner
            severity="SERVICE"
            message="A fault has been detected. Brewing is locked."
            action="Open Technician Mode to run diagnostics."
          />
        </div>
      )}

      {/* Readiness Checklist */}
      <div className="home-checklist">
        <div className={`home-check-item ${chamberClean ? 'ok' : 'fail'}`}>
          <span className="home-check-icon">{chamberClean ? '✓' : '✗'}</span>
          <span>Chamber: {chamberClean ? 'CLEAN' : 'NEEDS CLEANING'}</span>
        </div>
        <div className={`home-check-item ${waterReady ? 'ok' : 'fail'}`}>
          <span className="home-check-icon">{waterReady ? '✓' : '✗'}</span>
          <span>Water: {waterReady ? 'READY' : 'REFILL NEEDED'}</span>
        </div>
        <div className={`home-check-item ${hardwareConnected ? 'ok' : ''}`}>
          <span className="home-check-icon">{hardwareConnected ? '✓' : '•'}</span>
          <span>ESP32: {hardwareConnected ? 'CONNECTED' : 'STANDALONE'}</span>
        </div>
      </div>

      {/* Primary CTA */}
      <div className="home-cta">
        <button
          id="btn-select-kwatha"
          className="btn-primary home-cta-btn"
          onClick={onInsertPod}
          disabled={!isReady}
          aria-label="Select Kwatha formulation to start brew"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, height: 20 }}>
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 5h6" />
            <path d="M9 12l2 2 4-4" />
          </svg>
          {isReady ? 'SELECT KWATHA' : machineStatus}
        </button>
      </div>

      {/* Last Brew Card */}
      {lastBrew && (
        <div className="home-last-brew" onClick={onViewHistory} role="button" tabIndex={0} aria-label="View last brew history">
          <div className="home-last-label">Last brew</div>
          <div className="home-last-detail">
            <span className="home-last-name">{lastBrew.formulation}</span>
            <span className="home-last-mass">{lastBrew.final_mass_g} g</span>
            <span
              className={`home-last-result ${lastBrew.result === 'PASS' ? 'pass' : lastBrew.result === 'WARNING' ? 'warn' : 'fail'}`}
            >
              {lastBrew.result}
            </span>
          </div>
          <div className="home-last-time">
            {lastBrew.timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {lastBrew.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      )}
    </div>
  );
};
