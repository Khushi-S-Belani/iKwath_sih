import React, { useState, useEffect } from 'react';
import { KwathaRecipe } from '../types';

interface Screen3SensorCheckProps {
  recipe: KwathaRecipe;
  onProceed: () => void;
  onBack: () => void;
  onStatusChange?: (passed: boolean) => void;
}

export const Screen3SensorCheck: React.FC<Screen3SensorCheckProps> = ({
  recipe,
  onProceed,
  onBack,
  onStatusChange,
}) => {
  // Required water target from selected recipe (fallback to classical 400 mL if per AFI monograph)
  const targetWaterMl =
    typeof recipe.waterQuantityMl === 'number' ? recipe.waterQuantityMl : 400;

  // Sensor states start unverified — user must complete all checks before proceeding
  const [isPodDetected, setIsPodDetected] = useState(false);
  const [detectedWaterMl, setDetectedWaterMl] = useState<number>(0);
  const [isChamberLocked, setIsChamberLocked] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);

  // Reset sensor states when recipe changes
  useEffect(() => {
    setIsPodDetected(false);
    setDetectedWaterMl(0);
    setIsChamberLocked(false);
    setIsAutoFilling(false);
  }, [recipe.id]);

  // Check conditions - auto-ticks when thresholds are met
  const isWaterReady = detectedWaterMl >= targetWaterMl;
  const allChecksPassed = isPodDetected && isWaterReady && isChamberLocked;

  // Notify parent container of sensor check status
  useEffect(() => {
    onStatusChange?.(allChecksPassed);
  }, [allChecksPassed, onStatusChange]);

  const fillPercentage = Math.min(100, Math.round((detectedWaterMl / targetWaterMl) * 100));

  // Active brew & reduction process state
  const [isBrewing, setIsBrewing] = useState(false);
  const [brewProgress, setBrewProgress] = useState(0);
  const [brewStage, setBrewStage] = useState('Chamber sealed · Rapid heating to 88°C PID setpoint...');
  const [currentVolumeMl, setCurrentVolumeMl] = useState(400);

  const handleStartBrewing = () => {
    if (!allChecksPassed) return;
    setIsBrewing(true);
    setBrewProgress(0);

    const stages = [
      { at: 0, msg: 'Chamber sealed · Rapid heating to 88°C PID setpoint...', vol: 400 },
      { at: 25, msg: 'Active decoction · Extracting water-soluble botanical constituents...', vol: 320 },
      { at: 55, msg: 'Standard simmer & reduction · Concentrating to 1/4th classical target...', vol: 200 },
      { at: 80, msg: 'Final reduction reached · 100 mL target volume verified...', vol: 100 },
      { at: 96, msg: 'Clarification & thermal stabilization · Ready to dispense...', vol: 100 },
    ];

    const duration = 3400; // 3.4 seconds smooth process
    const intervalTime = 50;
    const totalSteps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(() => {
      currentStep++;
      const pct = Math.min(100, Math.round((currentStep / totalSteps) * 100));
      setBrewProgress(pct);

      const stage = [...stages].reverse().find((s) => pct >= s.at);
      if (stage) {
        setBrewStage(stage.msg);
        setCurrentVolumeMl(stage.vol);
      }

      if (currentStep >= totalSteps) {
        clearInterval(timer);
        setTimeout(() => {
          onProceed();
        }, 300);
      }
    }, intervalTime);
  };

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
    }, 45);
  };

  return (
    <div
      className="screen show"
      id="screen-sensor"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      {isBrewing ? (
        <div
          className="card"
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '26px 30px',
            minHeight: 0,
          }}
        >
          {/* Header */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--cream)',
                }}
              >
                Decoction & Reduction in Progress
              </div>
              <span
                style={{
                  fontSize: '11.5px',
                  fontWeight: 700,
                  color: 'var(--amber)',
                  background: 'var(--amber-dim)',
                  padding: '4px 12px',
                  borderRadius: '999px',
                }}
              >
                Active Cycle · {recipe.afiCode}
              </span>
            </div>
            <div style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
              Extracting and concentrating {recipe.name} per classical Ayurvedic Formulary monograph protocol
            </div>
          </div>

          {/* Central Live Telemetry Dashboard */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: '16px',
              margin: '16px 0',
            }}
          >
            {/* Chamber Temperature */}
            <div
              style={{
                padding: '16px 18px',
                borderRadius: '14px',
                background: '#F9F8F5',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Chamber Temperature
              </div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '26px',
                  fontWeight: 700,
                  color: 'var(--amber)',
                  marginTop: '4px',
                }}
              >
                88.2°C
              </div>
              <div style={{ fontSize: '11px', color: 'var(--sage)', fontWeight: 600, marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="dot-live" /> PID Thermal Simmer Active
              </div>
            </div>

            {/* Volume Reduction */}
            <div
              style={{
                padding: '16px 18px',
                borderRadius: '14px',
                background: '#F9F8F5',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Volume Reduction
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
                {currentVolumeMl} <span style={{ fontSize: '15px', fontWeight: 500 }}>mL</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                Concentrating 400 mL → 100 mL target
              </div>
            </div>

            {/* Botanical Input */}
            <div
              style={{
                padding: '16px 18px',
                borderRadius: '14px',
                background: '#F9F8F5',
                border: '1px solid var(--line)',
              }}
            >
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                Botanical Charge
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
                ~{recipe.yavakutaCurana.length * 3} <span style={{ fontSize: '15px', fontWeight: 500 }}>g</span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                {recipe.yavakutaCurana.length} herbs at 10–14 mesh
              </div>
            </div>
          </div>

          {/* Active Process Progress Bar & Stage description */}
          <div
            style={{
              padding: '18px 22px',
              borderRadius: '14px',
              background: '#FFFDF9',
              border: '1.5px solid var(--amber-dim)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--cream)' }}>
                {brewStage}
              </span>
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '15px',
                  fontWeight: 700,
                  color: 'var(--amber)',
                }}
              >
                {brewProgress}%
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '14px',
                borderRadius: '999px',
                background: '#ECEAE4',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${brewProgress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--amber), #FF9E42)',
                  borderRadius: '999px',
                  transition: 'width 0.08s linear',
                }}
              />
            </div>
          </div>

          {/* Footer Controls for Brewing State */}
          <div className="setup-foot" style={{ marginTop: '16px', paddingTop: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--muted)', fontSize: '12.5px' }}>
              <span className="dot-live" style={{ background: 'var(--amber)' }} />
              Chamber hermetically locked during thermal reduction
            </div>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => onProceed()}
              style={{ fontSize: '13px' }}
            >
              Skip to Result →
            </button>
          </div>
        </div>
      ) : (
        <>
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
                {isAutoFilling
                  ? 'Filling...'
                  : isWaterReady
                  ? '↺ Re-test Fill'
                  : '⚡ Auto-Fill Chamber'}
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
                  Chamber Sensor Checklist
                </div>
                <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                  Confirming ingredients and physical thresholds for {recipe.name}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: allChecksPassed ? 'var(--sage)' : 'var(--amber)',
                    background: allChecksPassed ? '#EDF7EE' : 'var(--amber-dim)',
                    padding: '4px 10px',
                    borderRadius: '999px',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {[isPodDetected, isWaterReady, isChamberLocked].filter(Boolean).length}/3 confirmed
                </span>
                {!allChecksPassed && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setIsPodDetected(true);
                      setDetectedWaterMl(targetWaterMl);
                      setIsChamberLocked(true);
                    }}
                    style={{
                      padding: '4px 10px',
                      fontSize: '11px',
                      borderRadius: '999px',
                      height: 'auto',
                    }}
                  >
                    Verify All
                  </button>
                )}
              </div>
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
                {/* Label — left side */}
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
                {/* Checkbox + status — right side, grouped */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Tap target wrapper — 24×24 min, visual box 20×20 */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        background: isPodDetected ? 'var(--sage)' : 'transparent',
                        border: `1.5px solid ${isPodDetected ? 'var(--sage)' : 'var(--line-strong)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 700,
                        fontSize: '13px',
                        transition: 'background 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: isPodDetected ? 'scale(1)' : 'scale(0.88)',
                      }}
                    >
                      {isPodDetected ? '✓' : ''}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isPodDetected ? 'var(--sage)' : 'var(--amber)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isPodDetected ? 'PASSED' : 'TAP TO LOAD'}
                  </span>
                </div>
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
                {/* Label — left side */}
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
                {/* Checkbox + status — right side, grouped */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Tap target wrapper — 24×24 min, visual box 20×20 */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        background: isWaterReady ? 'var(--sage)' : 'transparent',
                        border: `1.5px solid ${isWaterReady ? 'var(--sage)' : 'var(--line-strong)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 700,
                        fontSize: '13px',
                        transition: 'background 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: isWaterReady ? 'scale(1)' : 'scale(0.88)',
                      }}
                    >
                      {isWaterReady ? '✓' : ''}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isWaterReady ? 'var(--sage)' : 'var(--amber)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isWaterReady ? 'PASSED' : 'TAP TO FILL'}
                  </span>
                </div>
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
                {/* Label — left side */}
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
                {/* Checkbox + status — right side, grouped */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                  {/* Tap target wrapper — 24×24 min, visual box 20×20 */}
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '6px',
                        background: isChamberLocked ? 'var(--sage)' : 'transparent',
                        border: `1.5px solid ${isChamberLocked ? 'var(--sage)' : 'var(--line-strong)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 700,
                        fontSize: '13px',
                        transition: 'background 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
                        transform: isChamberLocked ? 'scale(1)' : 'scale(0.88)',
                      }}
                    >
                      {isChamberLocked ? '✓' : ''}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: isChamberLocked ? 'var(--sage)' : 'var(--amber)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {isChamberLocked ? 'PASSED' : 'TAP TO LOCK'}
                  </span>
                </div>
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
              ? '✓ All sensor checks passed. Ready to initiate decoction.'
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
          onClick={handleStartBrewing}
          disabled={!allChecksPassed}
          style={{
            opacity: allChecksPassed ? 1 : 0.35,
            cursor: allChecksPassed ? 'pointer' : 'not-allowed',
            pointerEvents: allChecksPassed ? 'auto' : 'none',
          }}
        >
          Start Brewing →
        </button>
      </div>
    </>
      )}
    </div>
  );
};
