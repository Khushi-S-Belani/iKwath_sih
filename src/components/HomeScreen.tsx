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
          <div className="home-title">iKWATH</div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <StatusChip
              label={machineStatus}
              variant={cfg.chipVariant}
            />
            {hardwareConnected && (
              <span
                onClick={onOpenHardwareModal}
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  color: '#34d399',
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.4)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  boxShadow: '0 0 8px rgba(16, 185, 129, 0.2)',
                }}
                title="ESP32 Bidirectional Hardware Bridge Active"
              >
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                ESP32 SYNCED
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="home-sub-text">{cfg.label}</div>

      {/* Live ESP32 Hardware Telemetry Bar */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '10px',
          margin: '10px 0 14px 0',
        }}
      >
        {/* DS18B20 Probe */}
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(251, 146, 60, 0.08)',
            border: '1px solid rgba(251, 146, 60, 0.25)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Flame style={{ width: 16, height: 16, color: '#fb923c', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              DS18B20 Temp
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#fb923c' }}>
              {liveTemp.toFixed(1)} <span style={{ fontSize: '11px', fontWeight: 500 }}>°C</span>
            </div>
          </div>
        </div>

        {/* Water / Mass Sensor */}
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(56, 189, 248, 0.08)',
            border: '1px solid rgba(56, 189, 248, 0.25)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Droplets style={{ width: 16, height: 16, color: '#38bdf8', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Chamber Fluid
            </div>
            <div style={{ fontSize: '15px', fontWeight: 800, color: '#38bdf8' }}>
              {liveMass.toFixed(0)} <span style={{ fontSize: '11px', fontWeight: 500 }}>mL</span>
            </div>
          </div>
        </div>

        {/* Actuator Status */}
        <div
          style={{
            padding: '10px 12px',
            background: 'rgba(192, 132, 252, 0.08)',
            border: '1px solid rgba(192, 132, 252, 0.25)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <RotateCw style={{ width: 16, height: 16, color: '#c084fc', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              Actuators
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: sensor?.heater === 'ACTIVE' || sensor?.pump === 'ACTIVE' || sensor?.stirrer === 'ACTIVE' ? '#c084fc' : '#64748b' }}>
              {sensor?.heater === 'ACTIVE' ? 'HEATER ON' : sensor?.pump === 'ACTIVE' ? 'PUMP ON' : sensor?.stirrer === 'ACTIVE' ? 'STIRRER ON' : 'STANDBY'}
            </div>
          </div>
        </div>

        {/* Controller Link */}
        <div
          onClick={onOpenHardwareModal}
          style={{
            padding: '10px 12px',
            background: hardwareConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(30, 41, 59, 0.4)',
            border: hardwareConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(71, 85, 105, 0.4)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
          title="Click to open ESP32 hardware modal"
        >
          <Cpu style={{ width: 16, height: 16, color: hardwareConnected ? '#34d399' : '#94a3b8', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 600 }}>
              ESP32 Link
            </div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: hardwareConnected ? '#34d399' : '#94a3b8' }}>
              {hardwareConnected ? '115200 BAUD' : 'DISCONNECTED'}
            </div>
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
