import React, { useState } from 'react';
import { KwathaRecipe } from '../types';

interface Screen4ResultProps {
  recipe: KwathaRecipe;
  onPrepareAnother: () => void;
}

export const Screen4Result: React.FC<Screen4ResultProps> = ({
  recipe,
  onPrepareAnother,
}) => {
  const [dispenseState, setDispenseState] = useState<'idle' | 'dispensing' | 'done'>('idle');

  const handleDispense = () => {
    if (dispenseState === 'dispensing') return;
    setDispenseState('dispensing');
    setTimeout(() => {
      setDispenseState('done');
    }, 2400);
  };

  return (
    <div
      className="screen show"
      id="screen-result"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      {/* Main Content: 2-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '20px',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left Column: Formulation Summary Card */}
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
              <span
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '11.5px',
                  fontWeight: 600,
                  color: 'var(--muted)',
                  letterSpacing: '0.4px',
                }}
              >
                BREWED AGAINST MONOGRAPH
              </span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--amber)',
                  background: 'var(--amber-dim)',
                  padding: '4px 10px',
                  borderRadius: '999px',
                }}
              >
                {recipe.tag}
              </span>
            </div>

            <div
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: '24px',
                fontWeight: 700,
                color: 'var(--cream)',
                marginBottom: '6px',
                lineHeight: 1.2,
              }}
            >
              {recipe.name}
            </div>

            <div
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--muted)',
                marginBottom: '20px',
              }}
            >
              Classical Code: {recipe.afiCode}
            </div>

            {/* Extraction Quality Highlights */}
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                background: '#F9F8F5',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--muted)' }}>Botanical Input</span>
                <span style={{ fontWeight: 600, color: 'var(--cream)' }}>
                  {recipe.yavakutaCurana.length} herbs (Yavakuṭa Cūrṇa)
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--muted)' }}>Initial Water Volume</span>
                <span style={{ fontWeight: 600, color: 'var(--cream)' }}>
                  {recipe.waterQuantityMl} mL
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--muted)' }}>Extraction Method</span>
                <span style={{ fontWeight: 600, color: 'var(--cream)' }}>
                  Controlled Boil ({recipe.boilTempRange})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--muted)' }}>Extraction Yield</span>
                <span style={{ fontWeight: 700, color: 'var(--amber)' }}>
                  1/4 Classical Reduction Target Met
                </span>
              </div>
            </div>
          </div>

          {/* Chamber Status indicator */}
          <div
            style={{
              padding: '12px 16px',
              borderRadius: '10px',
              background: '#F0F9F1',
              border: '1px solid #D5EBD7',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
            }}
          >
            <span className="dot-live"></span>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--sage)' }}>
              Chamber thermal equilibrium locked · Ready to pour
            </span>
          </div>
        </div>

        {/* Right Column: Key Result Metrics & Dispense Status */}
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
              Batch Telemetry
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '18px' }}>
              Final parameters calibrated for therapeutic potency
            </div>

            {/* 3 Main Result Metrics */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              {/* Metric 1: Final Volume */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    FINAL VOLUME
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    1/4 decoction concentration
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '26px',
                    fontWeight: 700,
                    color: 'var(--amber)',
                  }}
                >
                  {recipe.reductionTargetMl}{' '}
                  <span style={{ fontSize: '15px', fontWeight: 500 }}>mL</span>
                </div>
              </div>

              {/* Metric 2: Serve Temperature */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    SERVE TEMPERATURE
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    Optimal bio-availability warmth
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '26px',
                    fontWeight: 700,
                    color: 'var(--cream)',
                  }}
                >
                  {recipe.servingTemp}
                </div>
              </div>

              {/* Metric 3: Process Consistency Score */}
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                    PROCESS CONSISTENCY SCORE
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                    Thermal stability & density match
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '26px',
                    fontWeight: 700,
                    color: 'var(--sage)',
                  }}
                >
                  {recipe.consistencyScore}%
                </div>
              </div>
            </div>
          </div>

          {/* Dispense Status Box */}
          <div
            style={{
              padding: '14px 16px',
              borderRadius: '12px',
              background:
                dispenseState === 'done'
                  ? '#EDF7EE'
                  : dispenseState === 'dispensing'
                  ? '#FFF8F0'
                  : '#F9F8F5',
              border: `1.5px solid ${
                dispenseState === 'done'
                  ? 'var(--sage)'
                  : dispenseState === 'dispensing'
                  ? 'var(--amber)'
                  : 'var(--line)'
              }`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '13px',
                  fontWeight: 700,
                  color: 'var(--cream)',
                }}
              >
                {dispenseState === 'done'
                  ? 'Dispense Complete'
                  : dispenseState === 'dispensing'
                  ? 'Dispensing in Progress...'
                  : 'Place Cup Under Nozzle'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                {dispenseState === 'done'
                  ? 'Cup ready to retrieve. Enjoy your freshly extracted kwatha.'
                  : dispenseState === 'dispensing'
                  ? `Delivering ${recipe.reductionTargetMl} mL at ${recipe.servingTemp}...`
                  : 'Ensure cup volume is at least 150 mL.'}
              </div>
            </div>
            {dispenseState === 'dispensing' && (
              <span className="dot-live" style={{ background: 'var(--amber)' }}></span>
            )}
            {dispenseState === 'done' && (
              <span style={{ color: 'var(--sage)', fontWeight: 700, fontSize: '16px' }}>✓</span>
            )}
          </div>
        </div>
      </div>

      {/* Screen 4 Footer: Secondary on left, Single primary action on bottom-right */}
      <div className="setup-foot" style={{ marginTop: '16px', paddingTop: '16px' }}>
        <button type="button" className="btn btn-ghost" onClick={onPrepareAnother}>
          Prepare another dose
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleDispense}
          disabled={dispenseState === 'dispensing'}
        >
          {dispenseState === 'dispensing'
            ? 'Dispensing...'
            : dispenseState === 'done'
            ? 'Dispense Again'
            : 'Dispense'}
        </button>
      </div>
    </div>
  );
};
