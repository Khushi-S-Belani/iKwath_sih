import React from 'react';
import { MiniChart } from './MiniChart';
import { LiveBrewState } from '../data/machineState';
import { FormulationProfile } from '../types';

interface ReductionScreenProps {
  brewState: LiveBrewState;
  formulation: FormulationProfile;
  massHistory: { time: number; mass: number }[];
  tempHistory: { time: number; temp: number }[];
  onSkipPhase?: () => void;
}

export const ReductionScreen: React.FC<ReductionScreenProps> = ({
  brewState,
  formulation,
  massHistory,
  tempHistory,
  onSkipPhase,
}) => {
  const { sensor } = brewState;
  const currentMass = sensor.mass_g > 0 ? sensor.mass_g : (sensor.water_ml || formulation.water_ml || 400);
  const targetMass = formulation.reduction_endpoint_g || sensor.target_mass_g || 102;
  const reductionPct = currentMass > 0
    ? Math.max(0, Math.min(100, ((formulation.water_ml - currentMass) / Math.max(1, formulation.water_ml - targetMass)) * 100))
    : 0;

  const massData = massHistory.length > 0
    ? massHistory.map((d) => ({ time: d.time, value: d.mass > 0 ? d.mass : formulation.water_ml }))
    : [
        { time: 0, value: formulation.water_ml },
        { time: 0.05, value: currentMass },
      ];
  const tempData = tempHistory.length > 0
    ? tempHistory.map((d) => ({ time: d.time, value: d.temp }))
    : [
        { time: 0, value: 25 },
        { time: 0.05, value: sensor.temperature_c > 0 ? sensor.temperature_c : formulation.extraction_temp_c },
      ];

  return (
    <div className="screen-content reduction-screen">
      {/* Feedback Loop Badge */}
      <div className={`reduction-feedback-loop ${reductionPct >= 95 ? 'reached' : 'monitoring'}`}>
        <div className="rfl-sensor">Load Cell + HX711</div>
        <div className="rfl-arrow">→</div>
        <div className="rfl-decision">
          <span className="rfl-label">Target Reduction Reached?</span>
        </div>
        <div className="rfl-arrow">→</div>
        <div className={`rfl-status ${reductionPct >= 95 ? 'yes' : 'no'}`}>
          {reductionPct >= 95 ? '✓ Yes — Proceeding to Filter' : 'No — Monitoring…'}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="reduction-metrics">
        <div className="reduction-metric-card primary">
          <div className="rm-label">Current volume</div>
          <div className="rm-value">{currentMass.toFixed(1)}<span className="rm-unit">mL</span></div>
        </div>
        <div className="reduction-metric-card">
          <div className="rm-label">Target endpoint</div>
          <div className="rm-value">{targetMass}<span className="rm-unit">mL</span></div>
        </div>
        <div className="reduction-metric-card">
          <div className="rm-label">Reduction</div>
          <div className="rm-value">{reductionPct.toFixed(0)}<span className="rm-unit">%</span></div>
        </div>
        <div className="reduction-metric-card">
          <div className="rm-label">Temperature</div>
          <div className="rm-value">{(sensor.temperature_c > 0 ? sensor.temperature_c : formulation.extraction_temp_c).toFixed(1)}<span className="rm-unit">°C</span></div>
        </div>
      </div>

      {/* Reduction Progress Bar */}
      <div className="reduction-bar-section">
        <div className="reduction-bar-label">
          <span>Start ({formulation.water_ml} mL)</span>
          <span>Endpoint (~{formulation.reduction_endpoint_g} mL)</span>
        </div>
        <div className="reduction-bar-track">
          <div className="reduction-bar-fill" style={{ width: `${reductionPct}%` }}>
            <div className="reduction-bar-glow" />
          </div>
          <div className="reduction-bar-thumb" style={{ left: `${reductionPct}%` }}>
            <span>{sensor.mass_g > 0 ? sensor.mass_g.toFixed(0) : '—'} mL</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="reduction-charts">
        <div className="reduction-chart-card">
          <div className="reduction-chart-title">Volume vs Time</div>
          <MiniChart
            series={[
              {
                data: massData,
                color: '#FF9F0A',
                label: 'Volume (mL)',
              },
            ]}
            width={380}
            height={160}
            xLabel="Time (min)"
            yLabel="Volume (mL)"
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

      {onSkipPhase && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 16 }}>
          <button
            id="btn-skip-reduction"
            className="btn-primary"
            onClick={onSkipPhase}
            style={{ background: '#059669', borderColor: '#10b981', color: '#fff', fontSize: '0.85rem', padding: '8px 18px', fontWeight: 600 }}
          >
            ⏭ Forward to Filtration / Dispense
          </button>
        </div>
      )}

      <div className="reduction-disclaimer">
        Scientific note: The adaptive endpoint is determined by mass measurement. Medicinal equivalence requires experimental comparison with a reference preparation.
      </div>
    </div>
  );
};
