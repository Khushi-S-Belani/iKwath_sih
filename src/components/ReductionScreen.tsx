import React from 'react';
import { MiniChart } from './MiniChart';
import { LiveBrewState } from '../data/machineState';
import { FormulationProfile } from '../types';

interface ReductionScreenProps {
  brewState: LiveBrewState;
  formulation: FormulationProfile;
  massHistory: { time: number; mass: number }[];
  tempHistory: { time: number; temp: number }[];
  onSkipPhase: () => void;
}

export const ReductionScreen: React.FC<ReductionScreenProps> = ({
  brewState,
  formulation,
  massHistory,
  tempHistory,
  onSkipPhase,
}) => {
  const { sensor } = brewState;
  const reductionPct = sensor.mass_g > 0
    ? Math.max(0, Math.min(100, ((formulation.water_ml - sensor.mass_g) / (formulation.water_ml - sensor.target_mass_g)) * 100))
    : 0;

  const massData = massHistory.map((d) => ({ time: d.time, value: d.mass }));
  const tempData = tempHistory.map((d) => ({ time: d.time, value: d.temp }));

  return (
    <div className="screen-content reduction-screen">
      <div className="reduction-header">
        <div className="reduction-title">MONITOR REDUCTION</div>
        <div className="reduction-sub">
          Load Cell + HX711 tracking mass loss to target endpoint — not a fixed timer.
        </div>
      </div>

      {/* Feedback Loop Badge */}
      <div className={`reduction-feedback-loop ${reductionPct >= 98 ? 'reached' : 'monitoring'}`}>
        <div className="rfl-sensor">Load Cell + HX711</div>
        <div className="rfl-arrow">→</div>
        <div className="rfl-decision">
          <span className="rfl-label">Target Reduction Reached?</span>
        </div>
        <div className="rfl-arrow">→</div>
        <div className={`rfl-status ${reductionPct >= 98 ? 'yes' : 'no'}`}>
          {reductionPct >= 98 ? '✓ Yes — Proceeding to Filter' : 'No — Monitoring…'}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="reduction-metrics">
        <div className="reduction-metric-card primary">
          <div className="rm-label">Current mass</div>
          <div className="rm-value">{sensor.mass_g > 0 ? sensor.mass_g.toFixed(1) : '—'}<span className="rm-unit">g</span></div>
        </div>
        <div className="reduction-metric-card">
          <div className="rm-label">Target endpoint</div>
          <div className="rm-value">{formulation.reduction_endpoint_g}<span className="rm-unit">g</span></div>
        </div>
        <div className="reduction-metric-card">
          <div className="rm-label">Reduction</div>
          <div className="rm-value">{reductionPct.toFixed(0)}<span className="rm-unit">%</span></div>
        </div>
        <div className="reduction-metric-card">
          <div className="rm-label">Temperature</div>
          <div className="rm-value">{sensor.temperature_c.toFixed(1)}<span className="rm-unit">°C</span></div>
        </div>
      </div>

      {/* Reduction Progress Bar */}
      <div className="reduction-bar-section">
        <div className="reduction-bar-label">
          <span>Start ({formulation.water_ml} g)</span>
          <span>Endpoint (~{formulation.reduction_endpoint_g} g)</span>
        </div>
        <div className="reduction-bar-track">
          <div className="reduction-bar-fill" style={{ width: `${reductionPct}%` }}>
            <div className="reduction-bar-glow" />
          </div>
          <div className="reduction-bar-thumb" style={{ left: `${reductionPct}%` }}>
            <span>{sensor.mass_g > 0 ? sensor.mass_g.toFixed(0) : '—'}g</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="reduction-charts">
        <div className="reduction-chart-card">
          <div className="reduction-chart-title">Mass vs Time</div>
          <MiniChart
            series={[
              {
                data: massData,
                color: '#FF9F0A',
                label: 'Mass (g)',
              },
            ]}
            width={380}
            height={160}
            xLabel="Time (min)"
            yLabel="Mass (g)"
          />
        </div>
        <div className="reduction-chart-card">
          <div className="reduction-chart-title">Temperature vs Time</div>
          <MiniChart
            series={[
              {
                data: tempData,
                color: '#FF6B35',
                label: 'Temp (°C)',
              },
            ]}
            width={380}
            height={160}
            xLabel="Time (min)"
            yLabel="Temp (°C)"
          />
        </div>
      </div>

      <div className="reduction-disclaimer">
        Scientific note: The adaptive endpoint is determined by mass measurement. Medicinal equivalence requires experimental comparison with a reference preparation.
      </div>

      <div className="brew-controls" style={{ justifyContent: 'flex-start' }}>
        <button id="btn-skip-reduction" className="btn-skip-phase" onClick={onSkipPhase} title="Skip to Filtration (demo)">
          ⏭ Skip to Filtration
        </button>
      </div>
    </div>
  );
};
