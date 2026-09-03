import React from 'react';
import { KwathaRecipe } from '../types';

interface Screen2DetailsProps {
  recipe: KwathaRecipe;
  onBrew: () => void;
  onBack: () => void;
}

export const Screen2Details: React.FC<Screen2DetailsProps> = ({
  recipe,
  onBrew,
  onBack,
}) => {
  return (
    <div
      className="screen show"
      id="screen-details"
      style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}
    >
      {/* Main Content: 2-column layout */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: '20px',
          flex: 1,
          minHeight: 0,
        }}
      >
        {/* Left Column: Yavakuṭa Cūrṇa Components */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '24px',
          }}
        >
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
                Yavakuṭa Cūrṇa Ingredients
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                Coarse herb components (10–14 mesh standard)
              </div>
            </div>
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
              {recipe.yavakutaCurana.length} herbs
            </span>
          </div>

          {/* Scrollable list of herbs */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '6px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {recipe.yavakutaCurana.map((herb, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--panel)',
                      border: '1.5px solid var(--line-strong)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: "'Poppins', sans-serif",
                      fontSize: '11px',
                      fontWeight: 700,
                      color: 'var(--muted)',
                    }}
                  >
                    {index + 1}
                  </div>
                  <span
                    style={{
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: 'var(--cream)',
                    }}
                  >
                    {herb}
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--sage)',
                  }}
                >
                  ✓ Ready
                </span>
              </div>
            ))}
          </div>

          {/* AFI Monograph standard footer note */}
          <div
            style={{
              marginTop: '16px',
              paddingTop: '12px',
              borderTop: '1px solid var(--line)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '12px',
              color: 'var(--muted)',
            }}
          >
            <span>Pharmacopoeia Reference:</span>
            <span style={{ fontWeight: 700, color: 'var(--cream)' }}>
              {recipe.afiCode}
            </span>
          </div>
        </div>

        {/* Right Column: Parameters & Specifications */}
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
              Extraction Parameters
            </div>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '20px' }}>
              Standard decoction protocol configured per Ayurvedic Formulary
            </div>

            {/* Grid of parameter values */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '14px',
              }}
            >
              {/* Water Quantity */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>
                  Water Quantity
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--cream)',
                    marginTop: '4px',
                  }}
                >
                  {recipe.waterQuantityMl} <span style={{ fontSize: '14px', fontWeight: 500 }}>mL</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  Deionized R.O. Water
                </div>
              </div>

              {/* Reduction Target */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>
                  Reduction Target
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--amber)',
                    marginTop: '4px',
                  }}
                >
                  {recipe.reductionTargetMl} <span style={{ fontSize: '14px', fontWeight: 500 }}>mL</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  Exact 1/4th Decoction (Kwātha)
                </div>
              </div>

              {/* Boil Temperature Range */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>
                  Boil Temperature Range
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--cream)',
                    marginTop: '4px',
                  }}
                >
                  {recipe.boilTempRange}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  PID Thermal Regulation
                </div>
              </div>

              {/* Approximate Prep Time */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600 }}>
                  Approximate Prep Time
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '24px',
                    fontWeight: 700,
                    color: 'var(--cream)',
                    marginTop: '4px',
                  }}
                >
                  {recipe.prepTimeMin} <span style={{ fontSize: '14px', fontWeight: 500 }}>min</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>
                  Active extraction duration
                </div>
              </div>
            </div>

            {/* AFI/API Reference Code banner */}
            <div
              style={{
                marginTop: '16px',
                padding: '14px 16px',
                borderRadius: '12px',
                background: '#FFFAF5',
                border: '1.5px solid var(--amber-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--amber)', textTransform: 'uppercase' }}>
                  Monograph Reference
                </div>
                <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: '14px', fontWeight: 700, color: 'var(--cream)', marginTop: '2px' }}>
                  {recipe.afiCode}
                </div>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--sage)',
                  background: '#EDF7EE',
                  padding: '5px 10px',
                  borderRadius: '999px',
                }}
              >
                Verified Standard
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.4 }}>
            Ready to load ingredients into the extraction chamber. Tap "Brew this recipe" to begin sensor verification.
          </div>
        </div>
      </div>

      {/* Screen 2 Footer: Back on left, Exactly one primary orange button on bottom-right */}
      <div className="setup-foot" style={{ marginTop: '16px', paddingTop: '16px' }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back to Recipes
        </button>
        <button type="button" className="btn btn-primary" onClick={onBrew}>
          Brew this recipe →
        </button>
      </div>
    </div>
  );
};
