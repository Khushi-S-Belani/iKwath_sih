import React from 'react';

interface DeviceRailProps {
  currentScreen: number;
  onSelectScreen: (screenIndex: number) => void;
  chamberTemp?: string;
  isLocked?: boolean;
}

export const DeviceRail: React.FC<DeviceRailProps> = ({
  currentScreen,
  onSelectScreen,
  chamberTemp = '88 °C',
  isLocked = true,
}) => {
  const steps = [
    { id: 0, label: 'Recipes' },
    { id: 1, label: 'Details' },
    { id: 2, label: 'Sensor Check' },
    { id: 3, label: 'Result' },
  ];

  return (
    <div className="rail" role="navigation" aria-label="Device Step Navigation">
      {/* Brand */}
      <div className="brand">
        <div className="brand-mark" aria-hidden="true"></div>
        <div>
          <div className="brand-name">iKwath</div>
          <div className="brand-sub">Smart Kwatha Maker</div>
        </div>
      </div>

      {/* Steps */}
      <div className="steps" id="steps">
        {steps.map((step, idx) => {
          const isActive = currentScreen === idx;
          const isDone = currentScreen > idx;
          let stepClass = 'step';
          if (isActive) stepClass += ' active';
          if (isDone) stepClass += ' done';

          return (
            <button
              key={step.id}
              type="button"
              className={stepClass}
              onClick={() => onSelectScreen(idx)}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="step-dot">
                {isDone ? '✓' : step.id + 1}
              </div>
              <div className="step-label">{step.label}</div>
            </button>
          );
        })}
      </div>

      {/* Rail Footer */}
      <div className="rail-foot">
        <div className="rail-foot-title">Chamber</div>
        <div className="pill-status">
          <span className="dot-live"></span>
          {isLocked ? 'Locked' : 'Standby'} · {chamberTemp}
        </div>
      </div>
    </div>
  );
};
