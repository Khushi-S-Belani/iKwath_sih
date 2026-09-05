import React, { useEffect, useState } from 'react';
import { StatusChip } from './StatusChip';
import { AlertBanner } from './AlertBanner';

type CleaningPhase = 'REQUIRED' | 'RINSING' | 'DRAINING' | 'COMPLETE' | 'FAILED';

interface CleaningScreenProps {
  cleaningPhase: CleaningPhase;
  onComplete: () => void;
  onBack: () => void;
}

const PHASE_MESSAGES: Record<CleaningPhase, { title: string; sub: string; action?: string }> = {
  REQUIRED: { title: 'Cleaning Required', sub: 'Cleaning must complete before the next brew. The system is locked.' },
  RINSING: { title: 'Rinsing', sub: 'Rinse water is flowing through the extraction path.' },
  DRAINING: { title: 'Draining', sub: 'Draining the process path.' },
  COMPLETE: { title: 'Cleaning Complete', sub: 'System is clean and ready for the next brew.' },
  FAILED: {
    title: 'Cleaning Incomplete',
    sub: 'The cleaning cycle did not complete successfully.',
    action: 'Check drain path. Call service if blocked.',
  },
};

export const CleaningScreen: React.FC<CleaningScreenProps> = ({ cleaningPhase, onComplete, onBack }) => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (cleaningPhase !== 'RINSING' && cleaningPhase !== 'DRAINING') return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          return 100;
        }
        return p + 2;
      });
    }, 120);
    return () => clearInterval(interval);
  }, [cleaningPhase]);

  const msg = PHASE_MESSAGES[cleaningPhase];

  const steps = [
    { label: 'Product path closed', done: cleaningPhase !== 'REQUIRED', active: false },
    { label: 'Rinse water flowing', done: cleaningPhase === 'DRAINING' || cleaningPhase === 'COMPLETE', active: cleaningPhase === 'RINSING' },
    { label: 'Internal path flush', done: cleaningPhase === 'DRAINING' || cleaningPhase === 'COMPLETE', active: cleaningPhase === 'RINSING' },
    { label: 'Drain', done: cleaningPhase === 'COMPLETE', active: cleaningPhase === 'DRAINING' },
    { label: 'System reset', done: cleaningPhase === 'COMPLETE', active: false },
  ];

  return (
    <div className="screen-content cleaning-screen">
      <div className="cleaning-header">
        <div className="cleaning-icon">
          {cleaningPhase === 'COMPLETE' ? '✓' : cleaningPhase === 'FAILED' ? '✗' : '⟳'}
        </div>
        <div className="cleaning-title">{msg.title}</div>
        <div className="cleaning-sub">{msg.sub}</div>
        <div style={{ marginTop: 8 }}>
          <StatusChip
            label={cleaningPhase}
            variant={
              cleaningPhase === 'COMPLETE' ? 'active'
              : cleaningPhase === 'FAILED' ? 'fault'
              : cleaningPhase === 'REQUIRED' ? 'warning'
              : 'info'
            }
          />
        </div>
      </div>

      {/* Progress bar */}
      {(cleaningPhase === 'RINSING' || cleaningPhase === 'DRAINING') && (
        <div className="cleaning-progress-wrap">
          <div className="cleaning-progress-bar">
            <div className="cleaning-progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="cleaning-progress-pct">{progress}%</div>
        </div>
      )}

      {/* Steps */}
      <div className="cleaning-steps">
        {steps.map((step, idx) => (
          <React.Fragment key={step.label}>
            <div className={`cleaning-step ${step.done ? 'done' : ''} ${step.active ? 'active' : ''}`}>
              <span className="cleaning-step-icon">
                {step.done ? '✓' : step.active ? '●' : '○'}
              </span>
              <span>{step.label}</span>
            </div>
            {idx < steps.length - 1 && <div className="cleaning-step-connector" />}
          </React.Fragment>
        ))}
      </div>

      {/* Safety note */}
      {cleaningPhase === 'RINSING' && (
        <AlertBanner severity="INFO" message="Keep the dispensing area clear during cleaning." />
      )}

      {cleaningPhase === 'FAILED' && (
        <AlertBanner severity="SERVICE" message={msg.action ?? 'Service required.'} action="A technician must inspect the drain path." />
      )}

      {/* Actions */}
      <div className="cleaning-actions">
        {cleaningPhase === 'COMPLETE' && (
          <button id="btn-cleaning-done" className="btn-primary" onClick={onComplete}>
            ✓ System Ready — New Brew
          </button>
        )}
        {cleaningPhase === 'REQUIRED' && (
          <button id="btn-back-cleaning" className="btn-secondary" onClick={onBack}>
            Back
          </button>
        )}
      </div>
    </div>
  );
};
