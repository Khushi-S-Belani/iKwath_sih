import React, { useState } from 'react';
import { MiniChart } from './MiniChart';
import { BREW_HISTORY, TRADITIONAL_REFERENCE } from '../data/brewHistory';

interface ValidationScreenProps {}

export const ValidationScreen: React.FC<ValidationScreenProps> = () => {
  const [selectedRunId, setSelectedRunId] = useState<string>(BREW_HISTORY[0].brew_id);

  const selectedRun = BREW_HISTORY.find((r) => r.brew_id === selectedRunId) ?? BREW_HISTORY[0];

  const ikwathMass = selectedRun.mass_profile.map((d) => ({ time: d.time, value: d.mass }));
  const tradMass = TRADITIONAL_REFERENCE.map((d) => ({ time: d.time, value: d.mass }));
  const ikwathTemp = selectedRun.temp_profile.map((d) => ({ time: d.time, value: d.temp }));
  const tradTemp = TRADITIONAL_REFERENCE.map((d) => ({ time: d.time, value: d.temp }));

  const metrics = [
    {
      label: 'Water input',
      traditional: '400 mL (measured)',
      ikwath: `${selectedRun.water_input_ml} mL (measured)`,
      comparison: 'Equal',
    },
    {
      label: 'Final mass',
      traditional: `${TRADITIONAL_REFERENCE[TRADITIONAL_REFERENCE.length - 1].mass} g (measured)`,
      ikwath: `${selectedRun.final_mass_g} g (measured)`,
      comparison: 'Δ ' + Math.abs(selectedRun.final_mass_g - TRADITIONAL_REFERENCE[TRADITIONAL_REFERENCE.length - 1].mass).toFixed(1) + ' g',
    },
    {
      label: 'Cycle time',
      traditional: `${TRADITIONAL_REFERENCE[TRADITIONAL_REFERENCE.length - 1].time} min (recorded)`,
      ikwath: `${selectedRun.cycle_time_min} min ${selectedRun.cycle_time_sec} sec`,
      comparison: `${(TRADITIONAL_REFERENCE[TRADITIONAL_REFERENCE.length - 1].time - selectedRun.cycle_time_min).toFixed(0)} min faster`,
    },
    {
      label: 'Temperature profile',
      traditional: 'Recorded manually',
      ikwath: 'Sensor-logged',
      comparison: 'Graph overlay →',
    },
    {
      label: 'Marker constituents',
      traditional: 'Lab data (pending)',
      ikwath: 'Lab data (pending)',
      comparison: 'Scientific result pending',
    },
  ];

  return (
    <div className="screen-content validation-screen">
      <div className="validation-header">
        <div className="validation-title">Traditional vs iKwath — Validation Mode</div>
        <div className="validation-sub">
          Measurement comparison for the research team. Acceptance criteria come from experimental protocol and reference methods.
        </div>
      </div>

      {/* Run selector */}
      <div className="validation-run-selector">
        <div className="validation-run-label">iKwath Run:</div>
        <div className="validation-run-tabs">
          {BREW_HISTORY.filter((r) => r.result !== 'FAILED').slice(0, 4).map((r) => (
            <button
              key={r.brew_id}
              id={`run-${r.brew_id.replace('#', '')}`}
              className={`validation-run-tab ${selectedRunId === r.brew_id ? 'active' : ''}`}
              onClick={() => setSelectedRunId(r.brew_id)}
            >
              {r.brew_id} — {r.formulation.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="validation-charts">
        <div className="validation-chart-card">
          <div className="validation-chart-title">Mass vs Time</div>
          <MiniChart
            series={[
              { data: tradMass, color: '#8E8E93', label: 'Traditional' },
              { data: ikwathMass, color: '#FF9F0A', label: 'iKwath' },
            ]}
            width={420}
            height={170}
            xLabel="Time (min)"
            yLabel="Mass (g)"
          />
        </div>
        <div className="validation-chart-card">
          <div className="validation-chart-title">Temperature vs Time</div>
          <MiniChart
            series={[
              { data: tradTemp, color: '#8E8E93', label: 'Traditional' },
              { data: ikwathTemp, color: '#FF6B35', label: 'iKwath' },
            ]}
            width={420}
            height={170}
            xLabel="Time (min)"
            yLabel="Temp (°C)"
          />
        </div>
      </div>

      {/* Metrics Table */}
      <div className="validation-table">
        <div className="validation-table-header">
          <div className="vt-col-metric">Metric</div>
          <div className="vt-col">Traditional</div>
          <div className="vt-col">iKwath</div>
          <div className="vt-col">Comparison</div>
        </div>
        {metrics.map((m) => (
          <div key={m.label} className="validation-table-row">
            <div className="vt-col-metric">{m.label}</div>
            <div className="vt-col">{m.traditional}</div>
            <div className="vt-col highlight">{m.ikwath}</div>
            <div className="vt-col comparison">{m.comparison}</div>
          </div>
        ))}
      </div>

      <div className="validation-disclaimer">
        Scientific note: This interface shows measured data. Do not infer medicinal equivalence without experimental evidence from your research protocol.
      </div>
    </div>
  );
};
