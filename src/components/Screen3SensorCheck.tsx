import React, { useState, useEffect } from 'react';
import { KwathaRecipe } from '../types';

interface Screen3SensorCheckProps {
  recipe: KwathaRecipe;
  onProceed: () => void;
  onBack: () => void;
}

export const Screen3SensorCheck: React.FC<Screen3SensorCheckProps> = ({
  recipe,
  onProceed,
  onBack,
}) => {
  // Sensor states driven by selected recipe
  const [isPodDetected, setIsPodDetected] = useState(true);
  const [detectedWaterMl, setDetectedWaterMl] = useState<number>(recipe.waterQuantityMl);
  const [isChamberLocked, setIsChamberLocked] = useState(true);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Update detected water if recipe changes
  useEffect(() => {
    setDetectedWaterMl(recipe.waterQuantityMl);
    setIsPodDetected(true);
    setIsChamberLocked(true);
  }, [recipe]);

  // Check conditions
  const requiredWater = recipe.waterQuantityMl;
  const isWaterReady = detectedWaterMl >= requiredWater;
  const allChecksPassed = isPodDetected && isWaterReady && isChamberLocked;

  const fillPercentage = Math.min(100, Math.round((detectedWaterMl / requiredWater) * 100));

  // Simulation handler to demonstrate live sensor fill
  const handleSimulateFill = () => {
    if (isAutoFilling) return;
    setDetectedWaterMl(0);
    setIsAutoFilling(true);

    const start = 0;
    const end = requiredWater;
    const steps = 20;
    let step = 0;

    const interval = setInterval(() => {
      step++;
      const current = Math.round(start + ((end - start) * step) / steps);
      setDetectedWaterMl(current);

      if (step >= steps) {
        clearInterval(interval);
        setIsAutoFilling(false);
      }
    }, 60);
  };

  return (
    <div
      className="screen show"
      id="screen-sensor"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      {/* Main Content: 2 Columns */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          gap: '20px',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left Column: Required vs. Sensor-Detected Water Quantity & Fill Meter */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
          }}
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '16px',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--cream)',
                  }}
                >
                  Water Load Sensor
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  Load-cell weight & optical volume transducer
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleSimulateFill}
                disabled={isAutoFilling}
                style={{
                  padding: '7px 14px',
                  fontSize: '12px',
                  borderRadius: '999px',
                }}
              >
                {isAutoFilling ? 'Filling...' : '↺ Re-test Fill'}
              </button>
            </div>

            {/* Required vs Detected Stats */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
                marginBottom: '20px',
              }}
            >
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                  Required Quantity
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '26px',
                    fontWeight: 700,
                    color: 'var(--cream)',
                    marginTop: '4px',
                  }}
                >
                  {requiredWater} <span style={{ fontSize: '14px', fontWeight: 500 }}>mL</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  AFI Recipe Specification
                </div>
              </div>

              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: isWaterReady ? '#F0F9F1' : '#FFF9F4',
                  border: isWaterReady ? '1.5px solid var(--sage)' : '1.5px solid var(--amber)',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                  Sensor-Detected
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '26px',
                    fontWeight: 700,
                    color: isWaterReady ? 'var(--sage)' : 'var(--amber)',
                    marginTop: '4px',
                  }}
                >
                  {detectedWaterMl} <span style={{ fontSize: '14px', fontWeight: 500 }}>mL</span>
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: isWaterReady ? 'var(--sage)' : 'var(--amber)',
                    marginTop: '2px',
                    fontWeight: 600,
                  }}
                >
                  {isWaterReady ? '✓ Volume Target Met' : 'Filling to Target...'}
                </div>
              </div>
            </div>

            {/* Visual Fill Progress Indicator */}
            <div style={{ marginBottom: '14px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}
              >
                <span style={{ color: 'var(--muted)' }}>Fill Progress Indicator</span>
                <span style={{ color: isWaterReady ? 'var(--sage)' : 'var(--amber)' }}>
                  {fillPercentage}% ({detectedWaterMl}/{requiredWater} mL)
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '14px',
                  borderRadius: '999px',
                  background: '#ECEAE4',
                  overflow: 'hidden',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${fillPercentage}%`,
                    background: isWaterReady ? 'var(--sage)' : 'var(--amber)',
                    transition: 'width 0.2s ease, background 0.2s ease',
                    borderRadius: '999px',
                  }}
                />
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#F9F8F5',
              border: '1px solid var(--line)',
              fontSize: '12px',
              color: 'var(--muted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <span>Target Reduction:</span>
            <span style={{ fontWeight: 700, color: 'var(--cream)' }}>
              {recipe.reductionTargetMl} mL (1/4 volume extraction)
            </span>
          </div>
        </div>

        {/* Right Column: Sensor Checklist Items (Auto-tick as thresholds are met) */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '24px',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '17px',
                fontWeight: 700,
                color: 'var(--cream)',
                marginBottom: '4px',
              }}
            >
              Chamber Pre-Flight Checklist
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '18px' }}>
              All 3 sensor thresholds must be satisfied to unlock extraction
            </div>

            {/* Checklist Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Checklist 1: Pod Detected */}
              <div
                onClick={() => setIsPodDetected((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isPodDetected ? '#F0F9F1' : '#FFF9F4',
                  border: isPodDetected ? '1.5px solid var(--sage)' : '1px solid var(--line)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isPodDetected ? 'var(--sage)' : '#FFF',
                      border: `1.5px solid ${isPodDetected ? 'var(--sage)' : 'var(--line-strong)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    {isPodDetected ? '✓' : ''}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--cream)',
                      }}
                    >
                      Pod Detected
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                      {isPodDetected ? `RFID Matched: ${recipe.name}` : 'Insert herb pod into tray'}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isPodDetected ? 'var(--sage)' : 'var(--amber)',
                  }}
                >
                  {isPodDetected ? 'PASSED' : 'TAP TO DETECT'}
                </span>
              </div>

              {/* Checklist 2: Water at required mL */}
              <div
                onClick={() =>
                  setDetectedWaterMl((prev) => (prev >= requiredWater ? 0 : requiredWater))
                }
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isWaterReady ? '#F0F9F1' : '#FFF9F4',
                  border: isWaterReady ? '1.5px solid var(--sage)' : '1px solid var(--line)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isWaterReady ? 'var(--sage)' : '#FFF',
                      border: `1.5px solid ${isWaterReady ? 'var(--sage)' : 'var(--line-strong)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    {isWaterReady ? '✓' : ''}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--cream)',
                      }}
                    >
                      Water at Required mL
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                      {isWaterReady
                        ? `${detectedWaterMl} mL loaded (Exact requirement: ${requiredWater} mL)`
                        : `Current: ${detectedWaterMl} mL (Requires ${requiredWater} mL)`}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isWaterReady ? 'var(--sage)' : 'var(--amber)',
                  }}
                >
                  {isWaterReady ? 'PASSED' : 'TAP TO FILL'}
                </span>
              </div>

              {/* Checklist 3: Chamber locked */}
              <div
                onClick={() => setIsChamberLocked((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: isChamberLocked ? '#F0F9F1' : '#FFF9F4',
                  border: isChamberLocked ? '1.5px solid var(--sage)' : '1px solid var(--line)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '26px',
                      height: '26px',
                      borderRadius: '50%',
                      background: isChamberLocked ? 'var(--sage)' : '#FFF',
                      border: `1.5px solid ${isChamberLocked ? 'var(--sage)' : 'var(--line-strong)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFF',
                      fontWeight: 700,
                      fontSize: '12px',
                    }}
                  >
                    {isChamberLocked ? '✓' : ''}
                  </div>
                  <div>
                    <div
                      style={{
                        fontFamily: "'Poppins', sans-serif",
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--cream)',
                      }}
                    >
                      Chamber Locked
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                      {isChamberLocked ? 'Hermetic pneumatic clamp engaged' : 'Chamber unsealed'}
                    </div>
                  </div>
                </div>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: isChamberLocked ? 'var(--sage)' : 'var(--amber)',
                  }}
                >
                  {isChamberLocked ? 'PASSED' : 'TAP TO LOCK'}
                </span>
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: allChecksPassed ? '#EDF7EE' : '#FFF8F0',
              border: `1px solid ${allChecksPassed ? 'var(--sage)' : 'var(--amber-dim)'}`,
              fontSize: '12px',
              color: allChecksPassed ? 'var(--sage)' : 'var(--amber)',
              fontWeight: 600,
            }}
          >
            {allChecksPassed
              ? '✓ All sensor thresholds confirmed. Ready to start extraction.'
              : 'Waiting for all sensor checks to pass before brewing can start.'}
          </div>
        </div>
      </div>

      {/* Screen 3 Footer: Back on left, Exactly one primary orange button on bottom-right */}
      <div className="setup-foot" style={{ marginTop: '16px', paddingTop: '16px' }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back to Details
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={onProceed}
          disabled={!allChecksPassed}
          style={{
            opacity: allChecksPassed ? 1 : 0.45,
            cursor: allChecksPassed ? 'pointer' : 'not-allowed',
          }}
        >
          Start Brewing →
        </button>
      </div>
    </div>
  );
};
