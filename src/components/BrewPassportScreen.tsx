import React from 'react';
import { BrewRecord, BrewResult } from '../types';
import { StatusChip } from './StatusChip';
import { AlertBanner } from './AlertBanner';

interface BrewPassportScreenProps {
  record: BrewRecord;
  onStartCleaning: () => void;
  onNewBrew: () => void;
  onViewHistory: () => void;
}

const RESULT_CONFIG: Record<BrewResult, { variant: 'active' | 'warning' | 'fault'; label: string; emoji: string }> = {
  PASS: { variant: 'active', label: 'PASS', emoji: '✓' },
  WARNING: { variant: 'warning', label: 'WARNING', emoji: '⚠' },
  FAILED: { variant: 'fault', label: 'FAILED', emoji: '✗' },
};

export const BrewPassportScreen: React.FC<BrewPassportScreenProps> = ({
  record,
  onStartCleaning,
  onNewBrew,
  onViewHistory,
}) => {
  const cfg = RESULT_CONFIG[record.result];

  const fields = [
    { label: 'Brew ID', value: record.brew_id },
    { label: 'Formulation', value: record.formulation },
    { label: 'Pod ID', value: record.pod_id },
    {
      label: 'Timestamp',
      value: record.timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' · ' + record.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    },
    { label: 'Water input', value: `${record.water_input_ml} mL (measured)` },
    { label: 'Final mass', value: `${record.final_mass_g} g (measured)` },
    { label: 'Cycle time', value: `${record.cycle_time_min} min ${record.cycle_time_sec} sec` },
    { label: 'Cleaning', value: record.cleaning_completed ? 'Completed' : 'Pending' },
  ];

  return (
    <div className="screen-content passport-screen">
      {/* Result Hero */}
      <div className={`passport-hero ${record.result.toLowerCase()}`}>
        <div className="passport-result-icon">{cfg.emoji}</div>
        <div className="passport-hero-content">
          <div className="passport-formulation">{record.formulation}</div>
          <div className="passport-sub">Fresh decoction ready</div>
          <StatusChip label={`RESULT: ${cfg.label}`} variant={cfg.variant} />
        </div>
      </div>

      {/* Warnings */}
      {record.warnings.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          {record.warnings.map((w, i) => (
            <AlertBanner key={i} severity="WARNING" message={w} />
          ))}
        </div>
      )}

      {/* Fields Grid */}
      <div className="passport-fields">
        {fields.map((f) => (
          <div key={f.label} className="passport-field">
            <div className="passport-field-label">{f.label}</div>
            <div className="passport-field-value">{f.value}</div>
          </div>
        ))}
      </div>

      {/* Cleaning Status */}
      {!record.cleaning_completed && (
        <div className="passport-cleaning-notice">
          <AlertBanner
            severity="WARNING"
            message="Cleaning required before the next brew. The system is locked until cleaning completes."
            action="Start cleaning cycle below."
          />
        </div>
      )}

      {/* Actions */}
      <div className="passport-actions">
        <button id="btn-view-history" className="btn-secondary" onClick={onViewHistory}>
          View History
        </button>
        <button
          id="btn-start-cleaning"
          className={record.cleaning_completed ? 'btn-secondary' : 'btn-primary'}
          onClick={onStartCleaning}
        >
          {record.cleaning_completed ? '✓ Cleaning Done' : '⟳ START CLEANING'}
        </button>
        <button
          id="btn-new-brew"
          className="btn-primary"
          onClick={onNewBrew}
          disabled={!record.cleaning_completed}
        >
          New Brew
        </button>
      </div>
    </div>
  );
};
