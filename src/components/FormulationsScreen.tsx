import React, { useState } from 'react';
import { FormulationProfile } from '../types';
import { FORMULATIONS } from '../data/formulations';
import { StatusChip } from './StatusChip';

interface FormulationsScreenProps {
  onSelectFormulation?: (f: FormulationProfile) => void;
}

export const FormulationsScreen: React.FC<FormulationsScreenProps> = ({ onSelectFormulation }) => {
  const [selected, setSelected] = useState<FormulationProfile | null>(null);

  return (
    <div className="screen-content formulations-screen">
      <div className="formulations-header">
        <div className="formulations-title">Formulation Library</div>
        <div className="formulations-sub">Validated profiles · Read-only for normal users</div>
      </div>

      <div className="formulations-layout">
        {/* List */}
        <div className="formulations-list">
          {FORMULATIONS.map((f) => (
            <div
              key={f.id}
              className={`formulations-row ${selected?.id === f.id ? 'active' : ''}`}
              onClick={() => setSelected(f)}
              role="button"
              tabIndex={0}
              aria-label={`View ${f.name}`}
            >
              <div className="formulations-row-name">{f.name}</div>
              <div className="formulations-row-meta">
                <span>{f.pod_id}</span>
                <span>·</span>
                <span>{f.profile_revision}</span>
                <span>·</span>
                <span>{f.usage_count} runs</span>
              </div>
              <div style={{ marginTop: 4, display: 'flex', gap: 6 }}>
                <StatusChip
                  label={f.status}
                  variant={f.status === 'ACTIVE' ? 'active' : f.status === 'DEPRECATED' ? 'fault' : 'warning'}
                  size="sm"
                />
                {f.validated && <StatusChip label="VALIDATED" variant="active" size="sm" />}
              </div>
            </div>
          ))}
        </div>

        {/* Detail */}
        <div className="formulations-detail">
          {selected ? (
            <>
              <div className="formulations-detail-name">{selected.name}</div>
              <div className="formulations-detail-sub">{selected.description}</div>

              <div className="formulations-params">
                {[
                  { label: 'Profile revision', value: selected.profile_revision },
                  { label: 'Pod ID', value: selected.pod_id },
                  { label: 'Category', value: selected.category },
                  { label: 'Status', value: selected.status },
                  { label: 'Water input', value: `${selected.water_ml} mL` },
                  { label: 'Temp target', value: `${selected.extraction_temp_c} °C` },
                  { label: 'Soak time', value: `${selected.soak_time_min} min` },
                  { label: 'Extraction time', value: `${selected.extraction_time_min} min` },
                  { label: 'Stirrer speed', value: `${selected.stirrer_rpm} RPM` },
                  { label: 'Reduction endpoint', value: `~${selected.reduction_endpoint_g} g` },
                  { label: 'Total runs', value: `${selected.usage_count}` },
                ].map((p) => (
                  <div key={p.label} className="formulations-param-row">
                    <span className="formulations-param-label">{p.label}</span>
                    <span className="formulations-param-value">{p.value}</span>
                  </div>
                ))}
              </div>

              <div className="formulations-herbs-label">Herbs</div>
              <ul className="formulations-herbs-list">
                {selected.herbs.map((h) => <li key={h}>{h}</li>)}
              </ul>

              <div className="formulations-note">
                Normal users cannot edit validated parameters. A change creates a new revision and enters the validation workflow.
              </div>

              {onSelectFormulation && selected.validated && selected.status === 'ACTIVE' && (
                <button
                  id={`btn-select-formulation-${selected.id}`}
                  className="btn-primary"
                  style={{ marginTop: 14 }}
                  onClick={() => onSelectFormulation(selected)}
                >
                  Use this formulation →
                </button>
              )}
            </>
          ) : (
            <div className="formulations-empty">
              <div className="formulations-empty-icon">📋</div>
              <div>Select a formulation to view its profile.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
