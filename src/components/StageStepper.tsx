import React from 'react';
import { BrewStage } from '../types';

const STAGES: { key: BrewStage; label: string; micro: string }[] = [
  { key: 'POD_DETECTED', label: 'Pod & Profile',  micro: 'Formulation loaded' },
  { key: 'WATER_FILL',   label: 'Water Fill',     micro: 'Load Cell measuring' },
  { key: 'SOAKING',      label: 'Soaking',        micro: 'Soak time per formula' },
  { key: 'HEATING',      label: 'Heating',        micro: 'Induction + PT100' },
  { key: 'STIRRING',     label: 'Stirring',       micro: 'Stepper motor active' },
  { key: 'REDUCTION',    label: 'Reduction',      micro: 'Mass-endpoint detection' },
  { key: 'FILTRATION',   label: 'Filter Extract', micro: 'SS316 bottom outlet' },
  { key: 'DISPENSING',   label: 'Dispense',       micro: 'Peristaltic pump' },
  { key: 'CLEANING',     label: 'Cleaning',       micro: 'Flow path rinse' },
  { key: 'READY',        label: 'Ready',          micro: 'System ready' },
];

interface StageStepperProps {
  currentStage: BrewStage;
  paused?: boolean;
}

export const StageStepper: React.FC<StageStepperProps> = ({ currentStage, paused }) => {
  const currentIdx = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="stage-stepper">
      {STAGES.map((stage, idx) => {
        const isDone = idx < currentIdx;
        const isCurrent = idx === currentIdx;
        const isFuture = idx > currentIdx;

        return (
          <React.Fragment key={stage.key}>
            <div
              className={`stage-step ${isDone ? 'done' : ''} ${isCurrent ? 'current' : ''} ${isFuture ? 'future' : ''} ${isCurrent && paused ? 'paused' : ''}`}
            >
              <div className="stage-dot">
                {isDone ? (
                  <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 8 6.5 12 13 4" />
                  </svg>
                ) : isCurrent && paused ? (
                  <svg viewBox="0 0 16 16" fill="currentColor">
                    <rect x="4" y="3" width="3" height="10" rx="1" />
                    <rect x="9" y="3" width="3" height="10" rx="1" />
                  </svg>
                ) : isCurrent ? (
                  <span className="stage-pulse" />
                ) : null}
              </div>
              <div className="stage-label">{stage.label}</div>
              {isCurrent && <div className="stage-micro">{paused ? 'PAUSED' : stage.micro}</div>}
            </div>
            {idx < STAGES.length - 1 && (
              <div className={`stage-connector ${isDone ? 'done' : ''}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
