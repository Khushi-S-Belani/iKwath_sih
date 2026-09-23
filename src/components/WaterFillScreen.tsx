import React from 'react';
import { StageStepper } from './StageStepper';
import { StatusChip } from './StatusChip';
import { LiveBrewState } from '../data/machineState';
import { FormulationProfile } from '../types';

interface WaterFillScreenProps {
  brewState: LiveBrewState;
  formulation: FormulationProfile;
  onSkipPhase?: () => void;
}

export const WaterFillScreen: React.FC<WaterFillScreenProps> = ({
  brewState,
  formulation,
  onSkipPhase,
}) => {
  const { sensor, stage, elapsed_sec } = brewState;
  const targetMass = formulation.water_ml; // mL ≈ g for water
  const currentMass = Math.max(0, sensor.mass_g);
  const fillPct = Math.min(100, (currentMass / targetMass) * 100);
  const targetReached = fillPct >= 98;

  return (
    <div className="screen-content water-fill-screen">
      {/* Stage Stepper */}
      <div className="brew-stepper-row">
        <StageStepper currentStage={stage} />
      </div>

      {/* Main layout */}
      <div className="wf-body">
        {/* Left — live reading */}
        <div className="wf-reading-panel">
          {/* Big mass reading */}
          <div className="wf-mass-card">
            <div className="wf-mass-label">Real-Time Water Volume</div>
            <div className="wf-mass-value">
              {currentMass.toFixed(0)}
              <span className="wf-mass-unit">mL</span>
            </div>
            <div className="wf-mass-target">Target: {targetMass} mL (Auto-Cutoff)</div>
          </div>

          {/* Fill progress bar */}
          <div className="wf-progress-section">
            <div className="wf-progress-labels">
              <span>0 mL</span>
              <span className="wf-progress-pct">{fillPct.toFixed(0)}%</span>
              <span>{targetMass} mL</span>
            </div>
            <div className="wf-progress-track">
              <div
                className={`wf-progress-fill ${targetReached ? 'reached' : ''}`}
                style={{ width: `${fillPct}%` }}
              >
                <div className="wf-progress-glow" />
              </div>
            </div>
          </div>

          {/* Sensor chips */}
          <div className="wf-sensor-row">
            <StatusChip label="Flow Sensor (GPIO 18): ACTIVE" variant="active" />
            <StatusChip label={`Flow Rate: ${sensor.flow_rate_lpm ? sensor.flow_rate_lpm.toFixed(2) : '0.00'} L/min`} variant={sensor.pump === 'ACTIVE' ? 'active' : 'info'} />
            <StatusChip label={`Pulses: ${sensor.flow_pulses ?? 0}`} variant="info" />
            <StatusChip label={`Pump Relay 2 (GPIO 26): ${sensor.pump}`} variant={sensor.pump === 'ACTIVE' ? 'active' : 'off'} />
          </div>
        </div>

        {/* Right — feedback loop */}
        <div className="wf-feedback-panel">
          <div className="wf-feedback-title">Real-Time Closed-Loop Cutoff</div>

          <div className="wf-flow-diagram">
            {/* Decision diamond */}
            <div className="wf-flow-node source">
              <div className="wf-flow-icon">🌊</div>
              <div className="wf-flow-label">Hall Flow Sensor</div>
              <div className="wf-flow-sub">GPIO 18 Interrupt Pulses</div>
            </div>

            <div className="wf-flow-arrow">↓</div>

            <div className={`wf-flow-diamond ${targetReached ? 'reached' : 'checking'}`}>
              <div className="wf-diamond-text">Target 400 mL<br />Measured?</div>
            </div>

            <div className="wf-flow-branches">
              {/* No branch */}
              <div className="wf-branch no-branch">
                <div className="wf-branch-label">No</div>
                <div className="wf-branch-line" />
                <div className="wf-branch-action">Pump Running</div>
              </div>
              {/* Yes branch */}
              <div className={`wf-branch yes-branch ${targetReached ? 'active' : ''}`}>
                <div className="wf-branch-label">Yes</div>
                <div className="wf-branch-line" />
                <div className="wf-branch-action">Relay 2 Cuts OFF</div>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`wf-status-badge ${targetReached ? 'reached' : 'filling'}`}>
            {targetReached ? (
              <>
                <span className="wf-status-icon">✓</span>
                400 mL reached — Relay 2 OFF, proceeding to Soaking
              </>
            ) : (
              <>
                <span className="wf-status-dot" />
                Measuring real time… {(targetMass - currentMass).toFixed(0)} mL remaining
              </>
            )}
          </div>

          {/* Forward Button */}
          {onSkipPhase && (
            <div style={{ marginTop: '12px', display: 'flex', justifyContent: 'center' }}>
              <button
                id="btn-skip-waterfill"
                className="btn-primary"
                onClick={onSkipPhase}
                style={{ background: '#059669', borderColor: '#10b981', color: '#fff', fontSize: '0.85rem', padding: '8px 16px', fontWeight: 600 }}
              >
                ⏭ Forward to Soaking / Heating
              </button>
            </div>
          )}

          {/* Elapsed */}
          <div className="wf-elapsed" style={{ marginTop: 8 }}>
            Elapsed: {Math.floor(elapsed_sec / 60).toString().padStart(2, '0')}:{(elapsed_sec % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>
    </div>
  );
};
