import React from 'react';
import { StatusChip } from './StatusChip';
import { LiveBrewState } from '../data/machineState';

interface FiltrationScreenProps {
  brewState: LiveBrewState;
  onComplete: () => void;
}

type FiltrationStep = { id: string; label: string; done: boolean; active: boolean };

export const FiltrationScreen: React.FC<FiltrationScreenProps> = ({ brewState, onComplete }) => {
  const { phase, sensor } = brewState;

  const isFiltering = phase === 'FILTRATION';
  const isDispensing = phase === 'DISPENSING';
  const isComplete = phase === 'COMPLETE';

  const steps: FiltrationStep[] = [
    { id: 'reduction', label: 'Reduction complete — target endpoint reached', done: true, active: false },
    { id: 'filter', label: 'Filter Extract — SS316 filter, bottom outlet', done: !isFiltering && !isDispensing && !isComplete ? false : !isFiltering, active: isFiltering },
    { id: 'product', label: 'Product path open — filtrate collected', done: isDispensing || isComplete, active: isFiltering },
    { id: 'dispense', label: 'Dispense Kwatha — Peristaltic pump + valve', done: isComplete, active: isDispensing },
    { id: 'ready', label: 'Brew complete — fresh Kwatha ready', done: isComplete, active: isComplete },
  ];

  return (
    <div className="screen-content filtration-screen">
      <div className="filtration-header">
        <div className="filtration-title">
          {isFiltering ? 'FILTER EXTRACT' : isDispensing ? 'DISPENSE KWATHA' : 'BREW COMPLETE'}
        </div>
        <div className="filtration-sub">
          {isFiltering
            ? 'Removable SS316 filter active — bottom outlet separating spent herbs.'
            : isDispensing
            ? 'Peristaltic pump + valve — controlled and complete dispensing.'
            : 'Fresh Kwatha decoction dispensed and ready.'}
        </div>
      </div>

      {/* Flow Diagram */}
      <div className="filtration-flow">
        {steps.map((step, idx) => (
          <React.Fragment key={step.id}>
            <div className={`filtration-step ${step.done ? 'done' : ''} ${step.active ? 'active' : ''}`}>
              <div className="filtration-step-dot">
                {step.done ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="3 8 6.5 12 13 4" />
                  </svg>
                ) : step.active ? (
                  <div className="filtration-step-spinner" />
                ) : null}
              </div>
              <div className="filtration-step-label">{step.label}</div>
            </div>
            {idx < steps.length - 1 && (
              <div className={`filtration-connector ${step.done ? 'done' : ''}`}>↓</div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Actuator Status */}
      <div className="filtration-actuators">
        <StatusChip label={`Pump: ${sensor.pump}`} variant={sensor.pump === 'ACTIVE' ? 'active' : 'off'} />
        <StatusChip label={`Product valve: ${sensor.product_valve}`} variant={sensor.product_valve === 'OPEN' ? 'open' : 'closed'} />
        <StatusChip label={`Drain valve: ${sensor.drain_valve}`} variant={sensor.drain_valve === 'OPEN' ? 'open' : 'closed'} />
      </div>

      {/* Safety note */}
      {isFiltering && (
        <div className="filtration-note">
          <span>⚠</span> SS316 removable filter is active — keep dispensing area clear during filtration.
        </div>
      )}

      {/* Blockage warning */}
      {phase === 'FILTRATION' && sensor.pump === 'FAULT' && (
        <div className="filtration-blocked">
          Flow restriction detected. Pump has been stopped. Check the filter path and call for service.
        </div>
      )}

      {/* Complete action */}
      {isComplete && (
        <div className="filtration-complete-block">
          <div className="filtration-complete-icon">✓</div>
          <div className="filtration-complete-text">Fresh Kwatha decoction dispensed</div>
          <button id="btn-view-passport" className="btn-primary" onClick={onComplete}>
            VIEW BREW PASSPORT →
          </button>
        </div>
      )}
    </div>
  );
};
