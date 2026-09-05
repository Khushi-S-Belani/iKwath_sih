import React from 'react';
import { MiniChart } from './MiniChart';
import { BREW_HISTORY } from '../data/brewHistory';

interface ResearchScreenProps {}

export const ResearchScreen: React.FC<ResearchScreenProps> = () => {
  const passRuns = BREW_HISTORY.filter((r) => r.result === 'PASS');
  const allRuns = BREW_HISTORY;

  const avgCycleTime = (allRuns.reduce((a, b) => a + b.cycle_time_min + b.cycle_time_sec / 60, 0) / allRuns.length).toFixed(1);
  const avgFinalMass = (passRuns.reduce((a, b) => a + b.final_mass_g, 0) / passRuns.length).toFixed(1);
  const passRate = ((passRuns.length / allRuns.length) * 100).toFixed(0);
  const cleaningCompliance = ((allRuns.filter((r) => r.cleaning_completed).length / allRuns.length) * 100).toFixed(0);

  const analyticsCards = [
    { title: 'Endpoint consistency', value: avgFinalMass, unit: 'g avg', description: 'Mean final mass across PASS runs', icon: '⚖' },
    { title: 'Avg. cycle time', value: avgCycleTime, unit: 'min', description: 'Practical preparation time', icon: '⏱' },
    { title: 'Brew repeatability', value: passRate + '%', unit: '', description: 'PASS rate across all runs', icon: '🔁' },
    { title: 'Cleaning compliance', value: cleaningCompliance + '%', unit: '', description: 'Completed cleaning cycles', icon: '✓' },
  ];

  // Multi-run mass overlays for repeatability chart
  const multiRunSeries = BREW_HISTORY.slice(0, 3).map((r, i) => ({
    data: r.mass_profile.map((d) => ({ time: d.time, value: d.mass })),
    color: ['#FF9F0A', '#0A84FF', '#34C759'][i],
    label: r.brew_id,
  }));

  const exportAll = () => {
    const rows = allRuns.map((r) =>
      [r.brew_id, r.formulation, r.pod_id, r.timestamp.toISOString(), r.water_input_ml, r.final_mass_g, r.cycle_time_min, r.result].join(',')
    );
    const csv = ['Brew ID,Formulation,Pod ID,Timestamp,Water (mL),Final Mass (g),Cycle Time (min),Result', ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ikwath_research_export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="screen-content research-screen">
      <div className="research-header">
        <div className="research-title">RESEARCH MODE</div>
        <div className="research-sub">Analytics, repeatability data and experimental export for the research team.</div>
      </div>

      {/* Analytics Cards */}
      <div className="research-cards">
        {analyticsCards.map((card) => (
          <div key={card.title} className="research-card">
            <div className="research-card-icon">{card.icon}</div>
            <div className="research-card-title">{card.title}</div>
            <div className="research-card-value">
              {card.value}
              {card.unit && <span className="research-card-unit"> {card.unit}</span>}
            </div>
            <div className="research-card-desc">{card.description}</div>
          </div>
        ))}
      </div>

      {/* Run Comparison Chart */}
      <div className="research-chart-section">
        <div className="research-chart-title">Brew Repeatability — Mass Profiles</div>
        <div className="research-chart-card">
          <MiniChart
            series={multiRunSeries}
            width={740}
            height={180}
            xLabel="Time (min)"
            yLabel="Mass (g)"
          />
        </div>
      </div>

      {/* Run Table */}
      <div className="research-run-table">
        <div className="research-run-header">
          <span>Brew ID</span>
          <span>Formulation</span>
          <span>Pod ID</span>
          <span>Timestamp</span>
          <span>Final Mass (g)</span>
          <span>Cycle Time</span>
          <span>Result</span>
        </div>
        {allRuns.map((r) => (
          <div key={r.brew_id} className="research-run-row">
            <span className="research-run-id">{r.brew_id}</span>
            <span>{r.formulation.split(' ')[0]}</span>
            <span className="mono">{r.pod_id}</span>
            <span>{r.timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
            <span>{r.final_mass_g}</span>
            <span>{r.cycle_time_min}:{String(r.cycle_time_sec).padStart(2, '0')}</span>
            <span className={`research-result ${r.result.toLowerCase()}`}>{r.result}</span>
          </div>
        ))}
      </div>

      {/* Export */}
      <div className="research-export">
        <button id="btn-export-csv" className="btn-primary" onClick={exportAll}>Export All — CSV</button>
        <span className="research-export-note">{allRuns.length} runs · JSON/API export available when web dashboard is connected</span>
      </div>
    </div>
  );
};
