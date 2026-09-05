import React from 'react';
import { FormulationProfile } from '../types';
import { StatusChip } from './StatusChip';

interface BrewConfirmScreenProps {
  formulation: FormulationProfile;
  chamberReady: boolean;
  waterReady: boolean;
  safetyOk: boolean;
  onStart: () => void;
  onBack: () => void;
}

export const BrewConfirmScreen: React.FC<BrewConfirmScreenProps> = ({
  formulation,
  chamberReady,
  waterReady,
  safetyOk,
  onStart,
  onBack,
}) => {
  const allReady = chamberReady && waterReady && safetyOk;

  const params = [
    { label: 'Water input', value: `${formulation.water_ml} mL` },
    { label: 'Temperature target', value: `${formulation.extraction_temp_c} °C` },
    { label: 'Soak time', value: `${formulation.soak_time_min} min` },
    { label: 'Stirrer speed', value: `${formulation.stirrer_rpm} RPM` },
    { label: 'Reduction endpoint', value: `~${formulation.reduction_endpoint_g} g` },
    { label: 'Est. total time', value: `${formulation.soak_time_min + formulation.extraction_time_min + 10} min` },
  ];

  const checks = [
    { label: 'Pod detected', ok: true, id: 'pod' },
    { label: 'Chamber ready', ok: chamberReady, id: 'chamber' },
    { label: 'Water ready', ok: waterReady, id: 'water' },
    { label: 'Safety checks', ok: safetyOk, id: 'safety' },
  ];

  return (
    <div className="screen-content confirm-screen">
      <div className="confirm-layout">
        {/* Left — Profile */}
        <div className="confirm-left">
          <div className="confirm-header">
            <div className="confirm-title">CONFIRM BREW</div>
            <StatusChip label={`PROFILE ${formulation.profile_revision}`} variant="active" />
          </div>

          <div className="confirm-formulation-name">{formulation.name}</div>
          <div className="confirm-pod-id">Pod ID: <span>{formulation.pod_id}</span></div>

          <div className="confirm-params">
            {params.map((p) => (
              <div key={p.label} className="confirm-param-row">
                <span className="confirm-param-label">{p.label}</span>
                <span className="confirm-param-value">{p.value}</span>
              </div>
            ))}
          </div>

          <div className="confirm-note">
            Estimated remaining time will be shown as an adaptive estimate — not a fixed countdown.
          </div>
        </div>

        {/* Right — Checks + Action */}
        <div className="confirm-right">
          <div className="confirm-checks-title">System Readiness</div>
          <div className="confirm-checks">
            {checks.map((c) => (
              <div key={c.id} className={`confirm-check ${c.ok ? 'ok' : 'fail'}`}>
                <span className="confirm-check-icon">{c.ok ? '✓' : '✗'}</span>
                <span>{c.label}</span>
                <StatusChip label={c.ok ? 'OK' : 'NOT READY'} variant={c.ok ? 'active' : 'fault'} size="sm" />
              </div>
            ))}
          </div>

          <div className="confirm-actions">
            <button id="btn-confirm-back" className="btn-secondary" onClick={onBack}>
              Back
            </button>
            <button
              id="btn-start-extraction"
              className="btn-primary btn-start"
              onClick={onStart}
              disabled={!allReady}
            >
              {allReady ? '▶ START EXTRACTION' : 'NOT READY'}
            </button>
          </div>

          {!allReady && (
            <div className="confirm-not-ready-note">
              Resolve the items above before starting extraction.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
