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
                  {/* Ingredient name — left side */}
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
                  {/* Checkbox + label — right side, grouped */}
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
                          background: checked ? 'var(--sage)' : 'transparent',
                          border: `1.5px solid ${checked ? 'var(--sage)' : 'var(--line-strong)'}`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#FFF',
                          fontWeight: 700,
                          fontSize: '13px',
                          transition: 'background 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), border-color 0.12s cubic-bezier(0.34, 1.56, 0.64, 1), transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          transform: checked ? 'scale(1)' : 'scale(0.88)',
                        }}
                      >
                        {checked ? '✓' : ''}
                      </div>
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
            gap: '18px',
            padding: '22px',
          }}
        >
          {/* Card Header */}
          <div style={{ flexShrink: 0 }}>
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
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
              Standard decoction protocol configured per Ayurvedic Formulary
            </div>
          </div>

          {/* 6 Parameter Tiles — uniform 3-column, 2-row grid filling remaining height */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gridTemplateRows: '1fr 1fr',
              gap: '12px',
              flex: 1,
              minHeight: 0,
            }}
          >
            {/* Water Quantity — appliance constant (always 400 mL) */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: '#F9F8F5',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 0,
              }}
            >
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                Water Quantity
              </div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--cream)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '3px',
                  lineHeight: 1.2,
                }}
              >
                400 <span style={{ fontSize: '12px', fontWeight: 500 }}>mL</span>
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--muted)',
                  lineHeight: '13px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <span>Appliance standard</span>
              </div>
            </div>

            {/* Reduction Target — appliance constant (always 100 mL) */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: '#F9F8F5',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 0,
              }}
            >
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                Reduction Target
              </div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--amber)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '3px',
                  lineHeight: 1.2,
                }}
              >
                100 <span style={{ fontSize: '12px', fontWeight: 500 }}>mL</span>
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--muted)',
                  lineHeight: '13px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <span>1/4 classical decoction</span>
              </div>
            </div>

            {/* Boil Temperature — appliance constant (always 85–90°C) */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: '#F9F8F5',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 0,
              }}
            >
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                Boil Temp
              </div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--cream)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '3px',
                  lineHeight: 1.2,
                }}
              >
                85–90°C
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--muted)',
                  lineHeight: '13px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <span>PID thermal regulation</span>
              </div>
            </div>

            {/* Coarse Powder Dose — varies by herb count × ~3 g per herb */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: '#F9F8F5',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 0,
              }}
            >
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                Powder Dose
              </div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--cream)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '3px',
                  lineHeight: 1.2,
                }}
              >
                ~{recipe.yavakutaCurana.length * 3}{' '}
                <span style={{ fontSize: '12px', fontWeight: 500 }}>g</span>
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--muted)',
                  lineHeight: '13px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <span>~3 g × {recipe.yavakutaCurana.length} herbs</span>
              </div>
            </div>

            {/* Prep Time — varies per recipe by tissue density */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: '#F9F8F5',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 0,
              }}
            >
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                Approx. Prep Time
              </div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--cream)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '3px',
                  lineHeight: 1.2,
                }}
              >
                ~{recipe.prepTimeMin}{' '}
                <span style={{ fontSize: '12px', fontWeight: 500 }}>min</span>
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--muted)',
                  lineHeight: '13px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <span>Root/bark blends run longer</span>
              </div>
            </div>

            {/* Serving Temperature — appliance standard (always 60°C) */}
            <div
              style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: '#F9F8F5',
                border: '1px solid var(--line)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                minHeight: 0,
              }}
            >
              <div style={{ fontSize: '10.5px', color: 'var(--muted)', fontWeight: 600, whiteSpace: 'nowrap', lineHeight: 1.2 }}>
                Serving Temp
              </div>
              <div
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontSize: '20px',
                  fontWeight: 700,
                  color: 'var(--cream)',
                  whiteSpace: 'nowrap',
                  display: 'flex',
                  alignItems: 'baseline',
                  gap: '3px',
                  lineHeight: 1.2,
                }}
              >
                60°C
              </div>
              <div
                style={{
                  fontSize: '10px',
                  color: 'var(--muted)',
                  lineHeight: '13px',
                  height: '26px',
                  display: 'flex',
                  alignItems: 'flex-end',
                }}
              >
                <span>Optimal consumption temp</span>
              </div>
            </div>
          </div>

          {/* AFI/API Reference Code banner — middle block */}
          <div
            style={{
              flexShrink: 0,
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

          {/* Footer instruction text — anchored to bottom edge */}
          <div
            style={{
              flexShrink: 0,
              fontSize: '11.5px',
              color: 'var(--muted)',
              lineHeight: 1.4,
            }}
          >
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
