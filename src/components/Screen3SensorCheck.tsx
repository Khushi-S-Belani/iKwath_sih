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
  // Required water target from selected recipe (fallback to classical 400 mL if per AFI monograph)
  const targetWaterMl =
    typeof recipe.waterQuantityMl === 'number' ? recipe.waterQuantityMl : 400;

  // Sensor states driven by selected recipe
  const [isPodDetected, setIsPodDetected] = useState(true);
  const [detectedWaterMl, setDetectedWaterMl] = useState<number>(targetWaterMl);
  const [isChamberLocked, setIsChamberLocked] = useState(true);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Update detected water when recipe changes
  useEffect(() => {
    const target = typeof recipe.waterQuantityMl === 'number' ? recipe.waterQuantityMl : 400;
    setDetectedWaterMl(target);
    setIsPodDetected(true);
    setIsChamberLocked(true);
  }, [recipe]);

  // Check conditions - auto-ticks when thresholds are met
  const isWaterReady = detectedWaterMl >= targetWaterMl;
  const allChecksPassed = isPodDetected && isWaterReady && isChamberLocked;

  const fillPercentage = Math.min(100, Math.round((detectedWaterMl / targetWaterMl) * 100));

  // Simulation handler to demonstrate live sensor fill
  const handleSimulateFill = () => {
    if (isAutoFilling) return;
    setDetectedWaterMl(0);
    setIsAutoFilling(true);

    const start = 0;
    const end = targetWaterMl;
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
                  Calibrated for {recipe.name} ({recipe.afiCode})
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

            {/* Required vs Detected Stats from selected recipe */}
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
                  Required Water Volume
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: typeof recipe.waterQuantityMl === 'number' ? '26px' : '20px',
                    fontWeight: 700,
                    color: 'var(--cream)',
                    marginTop: '4px',
                  }}
                >
                  {typeof recipe.waterQuantityMl === 'number' ? (
                    <>
                      {recipe.waterQuantityMl}{' '}
                      <span style={{ fontSize: '14px', fontWeight: 500 }}>mL</span>
                    </>
                  ) : (
                    recipe.waterQuantityMl
                  )}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  AFI Monograph Target
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
                  Transducer Reading
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
                <span style={{ color: 'var(--muted)' }}>Fill Progress Meter</span>
                <span style={{ color: isWaterReady ? 'var(--sage)' : 'var(--amber)' }}>
                  {fillPercentage}% ({detectedWaterMl}/{targetWaterMl} mL)
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
            <span>Target Reduction Volume:</span>
            <span style={{ fontWeight: 700, color: 'var(--cream)' }}>
              {typeof recipe.reductionTargetMl === 'number'
                ? `${recipe.reductionTargetMl} mL (1/4 decoction)`
                : recipe.reductionTargetMl}
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
              Chamber Sensor Checklist
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '18px' }}>
              Confirming ingredients and physical thresholds for {recipe.name}
            </div>

            {/* Checklist Items: Auto-ticks as thresholds are met */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Checklist 1: Pod / Herb Detected */}
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
                      Botanical Pod Loaded
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                      {isPodDetected
                        ? `Confirmed ${recipe.coarsePowderDose || '~25 g'} coarse powder (${recipe.yavakutaCurana.length} herbs) for ${recipe.name}`
                        : 'Insert coarse herbal pod into chamber'}
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
                  {isPodDetected ? 'PASSED' : 'TAP TO LOAD'}
                </span>
              </div>

              {/* Checklist 2: Water at required mL */}
              <div
                onClick={() =>
                  setDetectedWaterMl((prev) => (prev >= targetWaterMl ? 0 : targetWaterMl))
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
                      Water at Required Volume
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                      {isWaterReady
                        ? `${detectedWaterMl} mL filled (Threshold met: ${targetWaterMl} mL)`
                        : `Current: ${detectedWaterMl} mL (Requires ${targetWaterMl} mL)`}
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
                      Chamber Sealed & Temperature
                    </div>
                    <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '2px' }}>
                      {isChamberLocked
                        ? `Hermetic lock engaged · Regulated to ${recipe.boilTempRange}`
                        : 'Chamber unsealed'}
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

          {/* Status summary */}
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
              ? '✓ All sensor thresholds confirmed. Primary button enabled.'
              : 'Waiting for all 3 sensor checks to pass before brewing can be initiated.'}
          </div>
        </div>
      </div>

      {/* Screen 3 Footer: Back on left, Exactly ONE primary orange button on bottom-right */}
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
            opacity: allChecksPassed ? 1 : 0.35,
            cursor: allChecksPassed ? 'pointer' : 'not-allowed',
          }}
        >
          Start Brewing →
        </button>
      </div>
    </div>
  );
};
