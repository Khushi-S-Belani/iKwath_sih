import React from 'react';
import { BrewRecord, BrewResult } from '../types';
import { StatusChip } from './StatusChip';
import { AlertBanner } from './AlertBanner';
import { FORMULATIONS } from '../data/formulations';

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
  const formulation = FORMULATIONS.find(f => f.name === record.formulation || f.pod_id === record.pod_id) || FORMULATIONS[0];

  const fields = [
    { label: 'Brew ID', value: record.brew_id },
    { label: 'Formulation', value: record.formulation },
    { label: 'Pod ID', value: record.pod_id },
    {
      label: 'Timestamp',
      value: record.timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
        ' · ' + record.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
    },
    { label: 'Water Input', value: `${record.water_input_ml} mL (measured)` },
    { label: 'Final Mass', value: `${record.final_mass_g} g (measured)` },
    { label: 'Cycle Time', value: `${record.cycle_time_min} min ${record.cycle_time_sec} sec` },
    { label: 'Extraction Temp', value: `${formulation.extraction_temp_c} °C Target (DS18B20)` },
    { label: 'Soak Duration', value: `${formulation.soak_time_min} min (maceration)` },
    { label: 'Agitation Speed', value: `${formulation.stirrer_rpm} RPM (unipolar stepper)` },
  ];

  return (
    <div className="screen-content passport-screen">
      {/* Result Hero */}
      <div className={`passport-hero ${record.result.toLowerCase()}`}>
        <div className="passport-result-icon">{cfg.emoji}</div>
        <div className="passport-hero-content">
          <div className="passport-formulation">{record.formulation}</div>
          <div className="passport-sub">Authentic Classical Decoction Ready · AFI Standard</div>
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

      {/* Formulation Technical Process Breakdown Table */}
      <div className="passport-section" style={{ marginTop: '16px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '8px', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>🌿</span> Classical Formulation Process Specifications ({formulation.name})
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', fontSize: '0.85rem' }}>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Target Temperature</div>
            <div style={{ fontWeight: 600, color: '#f59e0b', fontSize: '1rem' }}>{formulation.extraction_temp_c} °C</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Soak Maceration Time</div>
            <div style={{ fontWeight: 600, color: '#60a5fa', fontSize: '1rem' }}>{formulation.soak_time_min} min</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Extraction Agitation Time</div>
            <div style={{ fontWeight: 600, color: '#34d399', fontSize: '1rem' }}>{formulation.extraction_time_min} min</div>
          </div>
          <div style={{ background: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Endpoint Reduction Target</div>
            <div style={{ fontWeight: 600, color: '#a78bfa', fontSize: '1rem' }}>{formulation.target_reduction_ml} mL (~{formulation.reduction_endpoint_g}g)</div>
          </div>
        </div>
        <div style={{ marginTop: '10px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <strong>Extracted Botanicals:</strong> {formulation.herbs.join(', ')}
        </div>
      </div>

      {/* Cleaning Status */}
      {!record.cleaning_completed && (
        <div className="passport-cleaning-notice" style={{ marginTop: '14px' }}>
          <AlertBanner
            severity="WARNING"
            message="Cleaning recommended before next decoction cycle."
            action="Start automated rinse below."
          />
        </div>
      )}

      {/* Actions */}
      <div className="passport-actions" style={{ marginTop: '16px' }}>
        <button id="btn-view-history" className="btn-secondary" onClick={onViewHistory}>
          View History
        </button>
        <button
          id="btn-start-cleaning"
          type="button"
          className={record.cleaning_completed ? 'btn-secondary' : 'btn-primary'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onStartCleaning();
          }}
        >
          {record.cleaning_completed ? '✓ Cleaning Done' : '⟳ START CLEANING'}
        </button>
        <button
          id="btn-new-brew"
          className="btn-primary"
          onClick={onNewBrew}
        >
          ✓ Start New Brew
        </button>
      </div>
    </div>
  );
};
