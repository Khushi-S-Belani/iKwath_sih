import React, { useState, useMemo } from 'react';
import { BrewRecord } from '../types';
import { StatusChip } from './StatusChip';
import { MiniChart } from './MiniChart';

interface HistoryScreenProps {
  records: BrewRecord[];
  onViewPassport: (record: BrewRecord) => void;
}

type ResultFilter = 'ALL' | 'PASS' | 'WARNING' | 'FAILED';

export const HistoryScreen: React.FC<HistoryScreenProps> = ({ records, onViewPassport }) => {
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState<ResultFilter>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<BrewRecord | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r) => {
      const matchSearch = !q || r.formulation.toLowerCase().includes(q) || r.brew_id.toLowerCase().includes(q) || r.pod_id.toLowerCase().includes(q);
      const matchResult = resultFilter === 'ALL' || r.result === resultFilter;
      return matchSearch && matchResult;
    });
  }, [records, search, resultFilter]);

  const handleExport = (record: BrewRecord) => {
    const csv = [
      'Field,Value',
      `Brew ID,${record.brew_id}`,
      `Formulation,${record.formulation}`,
      `Pod ID,${record.pod_id}`,
      `Timestamp,${record.timestamp.toISOString()}`,
      `Water input (mL),${record.water_input_ml}`,
      `Final mass (g),${record.final_mass_g}`,
      `Cycle time,${record.cycle_time_min}m ${record.cycle_time_sec}s`,
      `Result,${record.result}`,
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brew_${record.brew_id.replace('#', '')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="screen-content history-screen">
      {selectedRecord ? (
        // Detail View
        <div className="history-detail">
          <button id="btn-history-back" className="btn-secondary btn-sm" onClick={() => setSelectedRecord(null)} style={{ marginBottom: 14 }}>
            ← Back to History
          </button>
          <div className="history-detail-header">
            <div className="history-detail-name">{selectedRecord.formulation}</div>
            <div className="history-detail-id">{selectedRecord.brew_id} · {selectedRecord.pod_id}</div>
            <StatusChip
              label={selectedRecord.result}
              variant={selectedRecord.result === 'PASS' ? 'active' : selectedRecord.result === 'WARNING' ? 'warning' : 'fault'}
            />
          </div>
          <div className="history-detail-meta">
            <span>{selectedRecord.timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            <span>Final mass: {selectedRecord.final_mass_g} g</span>
            <span>Cycle: {selectedRecord.cycle_time_min}m {selectedRecord.cycle_time_sec}s</span>
          </div>

          {selectedRecord.warnings.length > 0 && (
            <div className="history-warnings">
              {selectedRecord.warnings.map((w, i) => (
                <div key={i} className="history-warning-item">⚠ {w}</div>
              ))}
            </div>
          )}

          <div className="history-charts">
            <div className="history-chart-card">
              <div className="history-chart-title">Mass Profile</div>
              <MiniChart
                series={[{ data: selectedRecord.mass_profile.map(d => ({ time: d.time, value: d.mass })), color: '#FF9F0A', label: 'Mass (g)' }]}
                width={360}
                height={150}
                xLabel="Time (min)"
              />
            </div>
            <div className="history-chart-card">
              <div className="history-chart-title">Temperature Profile</div>
              <MiniChart
                series={[{ data: selectedRecord.temp_profile.map(d => ({ time: d.time, value: d.temp })), color: '#FF6B35', label: 'Temp (°C)' }]}
                width={360}
                height={150}
                xLabel="Time (min)"
              />
            </div>
          </div>

          <div className="history-detail-actions">
            <button id="btn-view-passport-detail" className="btn-secondary" onClick={() => onViewPassport(selectedRecord)}>View Passport</button>
            <button id="btn-export-detail" className="btn-secondary" onClick={() => handleExport(selectedRecord)}>Export CSV</button>
          </div>
        </div>
      ) : (
        // List View
        <>
          <div className="history-toolbar">
            <div className="history-search-wrap">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: 16, height: 16, color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              <input
                id="history-search"
                className="history-search"
                type="text"
                placeholder="Search by name, ID, pod…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="history-filters">
              {(['ALL', 'PASS', 'WARNING', 'FAILED'] as ResultFilter[]).map((f) => (
                <button
                  key={f}
                  id={`filter-${f.toLowerCase()}`}
                  className={`history-filter-btn ${resultFilter === f ? 'active' : ''}`}
                  onClick={() => setResultFilter(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="history-empty">
              <div className="history-empty-icon">📋</div>
              <div className="history-empty-title">No brew records found</div>
              <div className="history-empty-sub">Try adjusting the search or filter.</div>
            </div>
          ) : (
            <div className="history-list">
              {filtered.map((record) => (
                <div
                  key={record.brew_id}
                  className="history-row"
                  onClick={() => setSelectedRecord(record)}
                  role="button"
                  tabIndex={0}
                  aria-label={`View brew ${record.brew_id}`}
                >
                  <div className="history-row-id">{record.brew_id}</div>
                  <div className="history-row-name">{record.formulation}</div>
                  <div className="history-row-mass">{record.final_mass_g} g</div>
                  <div className="history-row-time">{record.cycle_time_min}:{String(record.cycle_time_sec).padStart(2, '0')}</div>
                  <StatusChip
                    label={record.result}
                    variant={record.result === 'PASS' ? 'active' : record.result === 'WARNING' ? 'warning' : 'fault'}
                    size="sm"
                  />
                  <div className="history-row-actions">
                    <button id={`btn-view-${record.brew_id.replace('#', '')}`} className="btn-link" onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); }}>VIEW</button>
                    <button id={`btn-export-${record.brew_id.replace('#', '')}`} className="btn-link" onClick={(e) => { e.stopPropagation(); handleExport(record); }}>EXPORT</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
