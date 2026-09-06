import React, { useState } from 'react';
import { StageStepper } from './StageStepper';
import { MetricTile } from './MetricTile';
import { StatusChip } from './StatusChip';
import { AlertBanner } from './AlertBanner';
import { LiveBrewState } from '../data/machineState';
import { FormulationProfile } from '../types';

interface LiveBrewScreenProps {
  brewState: LiveBrewState;
  formulation: FormulationProfile;
  brewNumber: number;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onViewDetails: () => void;
  onSkipPhase: () => void;
}

function formatTime(sec: number): string {
  const total = Math.floor(sec);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const STAGE_MICROCOPY: Record<string, string> = {
  WATER_FILL: 'Measuring water quantity via Load Cell + HX711.',
  SOAKING: 'Maintaining soak time as per formulation profile.',
  HEATING: 'Induction heating with PT100 temperature feedback.',
  STIRRING: 'Stepper motor running at profile-based speed.',
  REDUCTION: 'Load Cell + HX711 monitoring mass loss to target endpoint.',
  FILTRATION: 'SS316 filter — separating spent coarse powder via bottom outlet.',
  DISPENSING: 'Peristaltic pump dispensing fresh Kwatha decoction.',
  CLEANING: 'Rinsing the extraction chamber — washable flow path.',
};

export const LiveBrewScreen: React.FC<LiveBrewScreenProps> = ({
  brewState,
  formulation,
  brewNumber,
  onPause,
  onResume,
  onCancel,
  onViewDetails,
  onSkipPhase,
}) => {
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const { sensor, stage, phase, paused, elapsed_sec, estimated_remaining_sec, fault } = brewState;

  const reductionPercent = sensor.mass_g > 0 && sensor.target_mass_g > 0
    ? Math.max(0, Math.min(100, ((formulation.water_ml - sensor.mass_g) / (formulation.water_ml - sensor.target_mass_g)) * 100))
    : 0;

  const microcopy = STAGE_MICROCOPY[phase] ?? 'Brew in progress.';

  return (
    <div className="screen-content live-brew-screen">
      {/* Header Row */}
      <div className="brew-header">
        <div className="brew-header-left">
          <div className="brew-title">{formulation.name.toUpperCase()}</div>
          <div className="brew-subtitle">BREW #{brewNumber} · {paused ? '⏸ PAUSED' : microcopy}</div>
        </div>
        <div className="brew-header-right">
          {fault && <AlertBanner severity="STOP" message={fault} action="Cancel brew to return safely." />}
        </div>
      </div>

      {/* Stage Stepper */}
      <div className="brew-stepper-row">
        <StageStepper currentStage={stage} paused={paused} />
      </div>

      {/* Main Metrics Grid */}
      <div className="brew-metrics-grid">
        {/* Temperature — Large */}
        <div className="brew-temp-card">
          <div className="brew-temp-label">
            Temperature
            {(brewState.phase === 'HEATING' || brewState.phase === 'STIRRING') && (
              <span className="brew-sensor-tag"> · PT100</span>
            )}
          </div>
          <div className="brew-temp-value">
            {sensor.temperature_c.toFixed(1)}
            <span className="brew-temp-unit">°C</span>
          </div>
          <div className="brew-temp-target">Target: {formulation.extraction_temp_c} °C</div>
          {/* Temp bar */}
          <div className="brew-temp-bar-wrap">
            <div
              className="brew-temp-bar-fill"
              style={{ width: `${Math.min(100, (sensor.temperature_c / 100) * 100)}%` }}
            />
          </div>
        </div>

        {/* Mass — Large */}
        <div className="brew-mass-card">
          <div className="brew-mass-label">Mass</div>
          <div className="brew-mass-value">
            {sensor.mass_g > 0 ? sensor.mass_g.toFixed(0) : '–'}
            <span className="brew-mass-unit">g</span>
          </div>
          <div className="brew-mass-target">Target endpoint: {sensor.target_mass_g} g</div>
          {/* Reduction progress */}
          <div className="brew-reduction-wrap">
            <div className="brew-reduction-label">Reduction</div>
            <div className="brew-reduction-bar">
              <div className="brew-reduction-fill" style={{ width: `${reductionPercent}%` }} />
            </div>
            <div className="brew-reduction-pct">{reductionPercent.toFixed(0)}%</div>
          </div>
        </div>

        {/* Time + Actuator Column */}
        <div className="brew-side-col">
          <MetricTile
            label="Elapsed"
            value={formatTime(elapsed_sec)}
            size="md"
            accent="muted"
          />
          <MetricTile
            label="Est. remaining"
            value={formatTime(estimated_remaining_sec)}
            size="md"
            accent="default"
          />

          {/* Actuator chips */}
          <div className="brew-actuators">
            <div className="brew-actuator-title">Actuators</div>
            <div className="brew-actuator-chips">
              <StatusChip
                label={`Heater: ${sensor.heater}`}
                variant={sensor.heater === 'ACTIVE' ? 'active' : sensor.heater === 'FAULT' ? 'fault' : 'off'}
                size="sm"
              />
              <StatusChip
                label={`Stirrer: ${sensor.stirrer}`}
                variant={sensor.stirrer === 'ACTIVE' ? 'active' : sensor.stirrer === 'FAULT' ? 'fault' : 'off'}
                size="sm"
              />
              <StatusChip
                label={`Pump: ${sensor.pump}`}
                variant={sensor.pump === 'ACTIVE' ? 'active' : sensor.pump === 'FAULT' ? 'fault' : 'off'}
                size="sm"
              />
            </div>
            <div className="brew-actuator-chips" style={{ marginTop: 6 }}>
              <StatusChip
                label={`Prod.Valve: ${sensor.product_valve}`}
                variant={sensor.product_valve === 'OPEN' ? 'open' : 'closed'}
                size="sm"
              />
              <StatusChip
                label={`Drain: ${sensor.drain_valve}`}
                variant={sensor.drain_valve === 'OPEN' ? 'open' : 'closed'}
                size="sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="brew-controls">
        <button id="btn-view-details" className="btn-secondary btn-sm" onClick={onViewDetails}>
          View Details
        </button>
        <button
          id="btn-pause-resume"
          className="btn-secondary btn-sm"
          onClick={paused ? onResume : onPause}
        >
          {paused ? '▶ Resume' : '⏸ Pause'}
        </button>

        {/* Demo skip button */}
        <button
          id="btn-skip-phase"
          className="btn-skip-phase"
          onClick={onSkipPhase}
          title="Skip to next brew stage (demo)"
        >
          ⏭ Skip Phase
        </button>

        <button
          id="btn-cancel-brew"
          className="btn-danger btn-sm"
          onClick={() => setShowCancelConfirm(true)}
        >
          Cancel Brew
        </button>
      </div>

      {/* Cancel Confirm Dialog */}
      {showCancelConfirm && (
        <div className="brew-cancel-overlay">
          <div className="brew-cancel-dialog">
            <div className="brew-cancel-title">Cancel this brew?</div>
            <div className="brew-cancel-body">
              The active brew will be safely stopped. The chamber may still be hot — cleaning will be required.
            </div>
            <div className="brew-cancel-actions">
              <button id="btn-cancel-no" className="btn-secondary" onClick={() => setShowCancelConfirm(false)}>
                Continue Brew
              </button>
              <button id="btn-cancel-yes" className="btn-danger" onClick={() => { setShowCancelConfirm(false); onCancel(); }}>
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
