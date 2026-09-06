import React from 'react';
import { MachineStatus, BrewRecord } from '../types';
import { StatusChip } from './StatusChip';
import { AlertBanner } from './AlertBanner';

interface HomeScreenProps {
  machineStatus: MachineStatus;
  lastBrew: BrewRecord | null;
  chamberClean: boolean;
  waterReady: boolean;
  onInsertPod: () => void;
  onViewHistory: () => void;
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
  onInsertPod,
  onViewHistory,
}) => {
  const cfg = STATUS_CONFIG[machineStatus];
  const isReady = machineStatus === 'READY';

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
          <StatusChip
            label={machineStatus}
            variant={cfg.chipVariant}
          />
        </div>
      </div>

      <div className="home-sub-text">{cfg.label}</div>

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
        <div className="home-check-item ok">
          <span className="home-check-icon">✓</span>
          <span>System: ONLINE</span>
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
