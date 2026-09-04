import React, { useState, useEffect } from 'react';
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
  // Ingredient checkbox state — all start checked by default
  const [checkedHerbs, setCheckedHerbs] = useState<boolean[]>([]);

  // Reset checkboxes whenever the recipe changes (new selection from catalog)
  useEffect(() => {
    setCheckedHerbs(recipe.yavakutaCurana.map(() => true));
  }, [recipe]);

  const toggleHerb = (index: number) => {
    setCheckedHerbs((prev) => prev.map((v, i) => (i === index ? !v : v)));
  };

  const allHerbsChecked = checkedHerbs.length > 0 && checkedHerbs.every(Boolean);
  const checkedCount = checkedHerbs.filter(Boolean).length;

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
        {/* Left Column: Herb Ingredient Checklist */}
        <div
          className="card"
          style={{
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            padding: '22px',
          }}
        >
          {/* Card header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '14px',
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
                Ingredient List (Coarse Herbal Blend)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                Confirm all herbs are available before brewing
              </div>
            </div>
            {/* Live confirmed / total counter badge */}
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: allHerbsChecked ? 'var(--sage)' : 'var(--amber)',
                background: allHerbsChecked ? '#EDF7EE' : 'var(--amber-dim)',
                padding: '4px 10px',
                borderRadius: '999px',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              {checkedCount}/{recipe.yavakutaCurana.length} confirmed
            </span>
          </div>

          {/* Scrollable checklist — same row style as Screen 3 sensor checklist */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '4px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
            }}
          >
            {recipe.yavakutaCurana.map((herb, index) => {
              const checked = checkedHerbs[index] ?? true;
              return (
                <div
                  key={`${recipe.id}-herb-${index}`}
                  onClick={() => toggleHerb(index)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '11px 14px',
                    borderRadius: '10px',
                    background: checked ? '#F0F9F1' : '#FFF9F4',
                    border: checked
                      ? '1.5px solid var(--sage)'
                      : '1px solid var(--line)',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease, border-color 0.15s ease',
                    userSelect: 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Circular checkbox — matches Screen 3 dot exactly */}
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        background: checked ? 'var(--sage)' : '#FFFFFF',
                        border: `1.5px solid ${checked ? 'var(--sage)' : 'var(--line-strong)'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#FFF',
                        fontWeight: 700,
                        fontSize: '12px',
                        flexShrink: 0,
                        transition: 'background 0.15s ease, border-color 0.15s ease',
                      }}
                    >
                      {checked ? '✓' : ''}
                    </div>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        color: checked ? 'var(--cream)' : 'var(--muted)',
                        transition: 'color 0.15s ease',
                      }}
                    >
                      {herb}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 700,
                      color: checked ? 'var(--sage)' : 'var(--muted)',
                      whiteSpace: 'nowrap',
                      transition: 'color 0.15s ease',
                    }}
                  >
                    {checked ? 'READY' : 'UNAVAIL'}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Pharmacopoeia / AFI reference footer */}
          <div
            style={{
              marginTop: '14px',
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
              {recipe.afiCode} · {recipe.tag}
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
            padding: '22px',
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
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '16px' }}>
              Standard decoction protocol configured per Ayurvedic Formulary
            </div>

            {/* 5 Parameter Tiles — 16px gap */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
              }}
            >
              {/* Water Quantity — appliance constant */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                  Water Quantity
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
                  400 <span style={{ fontSize: '13px', fontWeight: 500 }}>mL</span>
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                  Standard Appliance Charge
                </div>
              </div>

              {/* Reduction Target — appliance constant */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                  Reduction Target
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '22px',
                    fontWeight: 700,
                    color: 'var(--amber)',
                    marginTop: '4px',
                  }}
                >
                  100 <span style={{ fontSize: '13px', fontWeight: 500 }}>mL</span>
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                  Exact 1/4 Classical Decoction
                </div>
              </div>

              {/* Coarse Powder Dose — recipe-specific */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
                  Coarse Powder Dose
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '17px',
                    fontWeight: 700,
                    color: 'var(--cream)',
                    marginTop: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {recipe.coarsePowderDose || '~25 g (per monograph)'}
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                  Coarse grind (10–14 mesh standard)
                </div>
              </div>

              {/* Boil Temperature — appliance constant */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '12px',
                  background: '#F9F8F5',
                  border: '1px solid var(--line)',
                }}
              >
                <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600 }}>
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
                  85–90°C
                </div>
                <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                  PID Thermal Regulation
                </div>
              </div>

              {/* Prep Time — recipe-specific, full-width */}
              <div
                style={{
                  gridColumn: 'span 2',
                  padding: '12px 16px',
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
                    Approximate Prep Time
                  </div>
                  <div style={{ fontSize: '10.5px', color: 'var(--muted)', marginTop: '2px' }}>
                    Calibrated for botanical tissue density (root/bark vs. leaf/flower)
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '20px',
                    fontWeight: 700,
                    color: 'var(--cream)',
                    textAlign: 'right',
                  }}
                >
                  ~{recipe.prepTimeMin}{' '}
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>min</span>
                </div>
              </div>
            </div>

            {/* AFI/API Reference Code banner */}
            <div
              style={{
                marginTop: '16px',
                padding: '12px 16px',
                borderRadius: '12px',
                background: '#FFFAF5',
                border: '1.5px solid var(--amber-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: '11px',
                    fontWeight: 700,
                    color: 'var(--amber)',
                    textTransform: 'uppercase',
                  }}
                >
                  AFI / API Reference Code
                </div>
                <div
                  style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: '14px',
                    fontWeight: 700,
                    color: 'var(--cream)',
                    marginTop: '2px',
                  }}
                >
                  {recipe.afiCode}
                </div>
              </div>
              <div
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--sage)',
                  background: '#EDF7EE',
                  padding: '4px 10px',
                  borderRadius: '999px',
                }}
              >
                Verified Classical Standard
              </div>
            </div>
          </div>

          <div style={{ fontSize: '11.5px', color: 'var(--muted)', lineHeight: 1.4, marginTop: '8px' }}>
            Confirm all herbs in the ingredient list, then tap "Brew this recipe" to begin sensor verification.
          </div>
        </div>
      </div>

      {/* Footer — "Brew" disabled until all herbs are confirmed */}
      <div className="setup-foot" style={{ marginTop: '16px', paddingTop: '16px' }}>
        <button type="button" className="btn btn-ghost" onClick={onBack}>
          ← Back to Recipes
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
          {!allHerbsChecked && (
            <div
              style={{
                fontSize: '11.5px',
                color: 'var(--amber)',
                fontWeight: 600,
              }}
            >
              Confirm all ingredients to continue.
            </div>
          )}
          <button
            type="button"
            className="btn btn-primary"
            onClick={onBrew}
            disabled={!allHerbsChecked}
            style={{
              opacity: allHerbsChecked ? 1 : 0.45,
              cursor: allHerbsChecked ? 'pointer' : 'not-allowed',
              pointerEvents: allHerbsChecked ? 'auto' : 'none',
            }}
          >
            Brew this recipe →
          </button>
        </div>
      </div>
    </div>
  );
};
