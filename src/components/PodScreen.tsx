import React, { useEffect, useState } from 'react';
import { FormulationProfile } from '../types';
import { StatusChip } from './StatusChip';

type PodState = 'IDLE' | 'SCANNING' | 'DETECTED' | 'INVALID' | 'READ_FAILED';

interface PodScreenProps {
  podState: PodState;
  formulation: FormulationProfile | null;
  onConfirm: () => void;
  onRetry: () => void;
  onBack: () => void;
}

export const PodScreen: React.FC<PodScreenProps> = ({ podState, formulation, onConfirm, onRetry, onBack }) => {
  const [dots, setDots] = useState('');

  useEffect(() => {
    if (podState !== 'SCANNING') return;
    const interval = setInterval(() => {
      setDots((d) => (d.length >= 3 ? '' : d + '.'));
    }, 400);
    return () => clearInterval(interval);
  }, [podState]);

  return (
    <div className="screen-content pod-screen">
      {/* NFC Scan Visual */}
      <div className="pod-visual">
        <div className={`pod-ring ${podState === 'SCANNING' ? 'scanning' : podState === 'DETECTED' ? 'detected' : podState === 'INVALID' || podState === 'READ_FAILED' ? 'error' : ''}`}>
          <div className="pod-ring-inner">
            <svg viewBox="0 0 64 64" fill="none" style={{ width: 48, height: 48 }}>
              {podState === 'DETECTED' ? (
                <polyline points="12 32 26 46 52 18" stroke="var(--success)" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              ) : podState === 'INVALID' || podState === 'READ_FAILED' ? (
                <>
                  <line x1="20" y1="20" x2="44" y2="44" stroke="var(--danger)" strokeWidth="4" strokeLinecap="round" />
                  <line x1="44" y1="20" x2="20" y2="44" stroke="var(--danger)" strokeWidth="4" strokeLinecap="round" />
                </>
              ) : (
                // NFC / pod icon
                <>
                  <rect x="20" y="14" width="24" height="36" rx="5" stroke="var(--accent)" strokeWidth="2.5" />
                  <rect x="26" y="20" width="12" height="8" rx="2" fill="var(--accent)" fillOpacity="0.25" stroke="var(--accent)" strokeWidth="1.5" />
                  <line x1="32" y1="38" x2="32" y2="42" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" />
                </>
              )}
            </svg>
          </div>
          {podState === 'SCANNING' && (
            <>
              <div className="pod-scan-wave pod-scan-wave-1" />
              <div className="pod-scan-wave pod-scan-wave-2" />
              <div className="pod-scan-wave pod-scan-wave-3" />
            </>
          )}
        </div>
      </div>

      {/* State Messages */}
      {podState === 'IDLE' && (
        <div className="pod-state-block">
          <div className="pod-state-title">Insert a validated pod</div>
          <div className="pod-state-sub">Place the pod in the pod bay to begin NFC detection.</div>
        </div>
      )}

      {podState === 'SCANNING' && (
        <div className="pod-state-block">
          <div className="pod-state-title">Loading formulation profile{dots}</div>
          <div className="pod-state-sub">System is loading and verifying process parameters for the selected Kwatha.</div>
        </div>
      )}

      {podState === 'DETECTED' && formulation && (
        <div className="pod-detected-block">
          <div className="pod-detected-header">
            <StatusChip label="PROFILE LOADED" variant="active" />
            <StatusChip label={`REV ${formulation.profile_revision}`} variant="info" />
          </div>
          <div className="pod-formulation-name">{formulation.name}</div>
          <div className="pod-id-row">Pod ID: <span>{formulation.pod_id}</span></div>

          <div className="pod-params-grid">
            <div className="pod-param">
              <div className="pod-param-label">Water Target</div>
              <div className="pod-param-value">{formulation.water_ml} mL</div>
            </div>
            <div className="pod-param">
              <div className="pod-param-label">Temp Target</div>
              <div className="pod-param-value">{formulation.extraction_temp_c} °C</div>
            </div>
            <div className="pod-param">
              <div className="pod-param-label">Soak Time</div>
              <div className="pod-param-value">{formulation.soak_time_min} min</div>
            </div>
            <div className="pod-param">
              <div className="pod-param-label">Endpoint</div>
              <div className="pod-param-value">~{formulation.reduction_endpoint_g} g</div>
            </div>
          </div>

          <div className="pod-herbs">
            <div className="pod-herbs-label">Herbs</div>
            <div className="pod-herbs-list">{formulation.herbs.join(' · ')}</div>
          </div>

          <div className="pod-profile-verified-note">
            ✓ Profile verified — ready for pod insertion and water fill
          </div>

          <div className="pod-cta-row">
            <button id="btn-pod-back" className="btn-secondary" onClick={onBack}>Back</button>
            <button id="btn-pod-confirm" className="btn-primary" onClick={onConfirm}>
              INSERT POD & ADD WATER →
            </button>
          </div>
        </div>
      )}

      {podState === 'INVALID' && (
        <div className="pod-state-block error">
          <div className="pod-state-title">Pod not supported</div>
          <div className="pod-state-sub">This pod is not recognized. Please use a validated iKwath pod.</div>
          <div className="pod-cta-row">
            <button id="btn-pod-back-invalid" className="btn-secondary" onClick={onBack}>Back</button>
            <button id="btn-pod-retry-invalid" className="btn-primary" onClick={onRetry}>Try Again</button>
          </div>
        </div>
      )}

      {podState === 'READ_FAILED' && (
        <div className="pod-state-block error">
          <div className="pod-state-title">Pod could not be read</div>
          <div className="pod-state-sub">Remove and reinsert the pod, ensuring it is seated correctly.</div>
          <div className="pod-cta-row">
            <button id="btn-pod-back-failed" className="btn-secondary" onClick={onBack}>Back</button>
            <button id="btn-pod-retry-failed" className="btn-primary" onClick={onRetry}>Retry</button>
          </div>
        </div>
      )}
    </div>
  );
};
