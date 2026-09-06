import React from 'react';
import { StageStepper } from './StageStepper';
import { StatusChip } from './StatusChip';
import { LiveBrewState } from '../data/machineState';
import { FormulationProfile } from '../types';

interface WaterFillScreenProps {
  brewState: LiveBrewState;
  formulation: FormulationProfile;
  onSkipPhase: () => void;
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

      {/* Header */}
      <div className="wf-header">
        <div className="wf-title">MEASURE WATER QUANTITY</div>
        <div className="wf-sub">Load Cell + HX711 — real-time weight measurement via inlet or manual fill</div>
      </div>

      {/* Main layout */}
      <div className="wf-body">
        {/* Left — live reading */}
        <div className="wf-reading-panel">
          {/* Big mass reading */}
          <div className="wf-mass-card">
            <div className="wf-mass-label">Current Water Mass</div>
            <div className="wf-mass-value">
              {currentMass.toFixed(0)}
              <span className="wf-mass-unit">g</span>
            </div>
            <div className="wf-mass-target">Target: {targetMass} g</div>
          </div>

          {/* Fill progress bar */}
          <div className="wf-progress-section">
            <div className="wf-progress-labels">
              <span>0 g</span>
              <span className="wf-progress-pct">{fillPct.toFixed(0)}%</span>
              <span>{targetMass} g</span>
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
            <StatusChip label="Load Cell: ACTIVE" variant="active" />
            <StatusChip label="HX711: CONNECTED" variant="active" />
            <StatusChip label={`Pump: ${sensor.pump}`} variant={sensor.pump === 'ACTIVE' ? 'active' : 'off'} />
          </div>
        </div>

        {/* Right — feedback loop */}
        <div className="wf-feedback-panel">
          <div className="wf-feedback-title">Feedback Loop</div>

          <div className="wf-flow-diagram">
            {/* Decision diamond */}
            <div className="wf-flow-node source">
              <div className="wf-flow-icon">⚖️</div>
              <div className="wf-flow-label">Measure Water</div>
              <div className="wf-flow-sub">Load Cell + HX711</div>
            </div>

            <div className="wf-flow-arrow">↓</div>

            <div className={`wf-flow-diamond ${targetReached ? 'reached' : 'checking'}`}>
              <div className="wf-diamond-text">Target Water<br />Reached?</div>
            </div>

            <div className="wf-flow-branches">
              {/* No branch */}
              <div className="wf-branch no-branch">
                <div className="wf-branch-label">No</div>
                <div className="wf-branch-line" />
                <div className="wf-branch-action">Continue filling</div>
              </div>
              {/* Yes branch */}
              <div className={`wf-branch yes-branch ${targetReached ? 'active' : ''}`}>
                <div className="wf-branch-label">Yes</div>
                <div className="wf-branch-line" />
                <div className="wf-branch-action">Proceed to Soaking</div>
              </div>
            </div>
          </div>

          {/* Status badge */}
          <div className={`wf-status-badge ${targetReached ? 'reached' : 'filling'}`}>
            {targetReached ? (
              <>
                <span className="wf-status-icon">✓</span>
                Target water quantity reached — proceeding to soaking
              </>
            ) : (
              <>
                <span className="wf-status-dot" />
                Measuring… {(targetMass - currentMass).toFixed(0)} g remaining
              </>
            )}
          </div>

          {/* Elapsed */}
          <div className="wf-elapsed">
            Elapsed: {Math.floor(elapsed_sec / 60).toString().padStart(2, '0')}:{(elapsed_sec % 60).toString().padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Demo skip */}
      <div className="brew-controls" style={{ justifyContent: 'flex-start', marginTop: 8 }}>
        <button
          id="btn-skip-water-fill"
          className="btn-skip-phase"
          onClick={onSkipPhase}
          title="Skip water fill phase (demo)"
        >
          ⏭ Skip to Soaking
        </button>
      </div>
    </div>
  );
};
