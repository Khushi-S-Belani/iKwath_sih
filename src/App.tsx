import React, { useState, useEffect, useRef } from 'react';
import { DeviceRail } from './components/DeviceRail';
import { Screen1Catalog } from './components/Screen1Catalog';
import { Screen2Details } from './components/Screen2Details';
import { Screen3SensorCheck } from './components/Screen3SensorCheck';
import { Screen4Result } from './components/Screen4Result';
import { KWATHA_RECIPES } from './data/recipes';
import { KwathaRecipe } from './types';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<number>(0);
  const [selectedRecipe, setSelectedRecipe] = useState<KwathaRecipe>(KWATHA_RECIPES[0]);
  const [currentTime, setCurrentTime] = useState<string>('09:14');

  // Scaling logic to make the 1328px hardware bezel fit gracefully in any window/iframe
  const [scale, setScale] = useState<number>(1);
  const [autoScale, setAutoScale] = useState<boolean>(true);
  const outerWrapRef = useRef<HTMLDivElement>(null);

  // Update clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      setCurrentTime(`${hours}:${mins}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  // Compute scale for container
  useEffect(() => {
    const handleResize = () => {
      if (!autoScale) {
        setScale(1);
        return;
      }
      const paddingX = 32;
      const paddingY = 32;
      const targetW = 1328 + paddingX;
      const targetH = 848 + paddingY;
      const availW = window.innerWidth;
      const availH = window.innerHeight;

      const scaleX = availW / targetW;
      const scaleY = availH / targetH;
      const fitted = Math.min(scaleX, scaleY, 1);
      setScale(Math.max(fitted, 0.42));
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [autoScale]);

  // Step navigation helper (Nav arrows)
  const handleStep = (direction: number) => {
    setCurrentScreen((prev) => {
      const next = prev + direction;
      return Math.min(3, Math.max(0, next));
    });
  };

  // Keyboard navigation support
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        handleStep(-1);
      } else if (e.key === 'ArrowRight') {
        handleStep(1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Dynamic titles for each screen
  const screenMeta = [
    {
      title: 'Recipe Catalog',
      sub: `Browse and select from ${KWATHA_RECIPES.length} classical Ayurvedic decoctions.`,
    },
    {
      title: selectedRecipe.name,
      sub: `Classical Decoction Monograph · ${selectedRecipe.afiCode} · Tag: ${selectedRecipe.tag}`,
    },
    {
      title: 'Sensor Fill & Check',
      sub: `Verifying raw materials and chamber conditions for ${selectedRecipe.name} (${selectedRecipe.afiCode}).`,
    },
    {
      title: 'Decoction Complete',
      sub: `Freshly prepared ${selectedRecipe.name} is ready for therapeutic administration.`,
    },
  ];

  return (
    <div
      ref={outerWrapRef}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#0E1510',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Scaling wrapper */}
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: 'center center',
          transition: 'transform 0.15s ease-out',
        }}
      >
        <div className="bezel">
          <div className="device">
            {/* LEFT RAIL (4 Steps: Recipes → Details → Sensor Check → Result) */}
            <DeviceRail
              currentScreen={currentScreen}
              onSelectScreen={(screenIdx) => setCurrentScreen(screenIdx)}
              chamberTemp={
                currentScreen === 0
                  ? '88 °C'
                  : currentScreen === 3
                  ? selectedRecipe.servingTemp
                  : '88.2 °C'
              }
              isLocked={true}
            />

            {/* MAIN CONTENT AREA */}
            <main className="main">
              {/* TOPBAR (Unified header with title, subtitle, topbar nav arrows, and clock) */}
              <div className="topbar">
                <div>
                  <div className="screen-title">{screenMeta[currentScreen].title}</div>
                  <div className="screen-sub">{screenMeta[currentScreen].sub}</div>
                </div>

                {/* Topbar Right: Navigation Arrows + Clock (Never intersects footer buttons) */}
                <div
                  className="topbar-right"
                  style={{ display: 'flex', alignItems: 'center', gap: '14px' }}
                >
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className="arrow-btn"
                      onClick={() => handleStep(-1)}
                      disabled={currentScreen === 0}
                      aria-label="Previous screen"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        opacity: currentScreen === 0 ? 0.35 : 1,
                        cursor: currentScreen === 0 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--cream)"
                        strokeWidth="2"
                        style={{ width: '16px', height: '16px' }}
                      >
                        <path d="M15 18l-6-6 6-6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="arrow-btn"
                      onClick={() => handleStep(1)}
                      disabled={currentScreen === 3}
                      aria-label="Next screen"
                      style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '10px',
                        opacity: currentScreen === 3 ? 0.35 : 1,
                        cursor: currentScreen === 3 ? 'not-allowed' : 'pointer',
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="var(--cream)"
                        strokeWidth="2"
                        style={{ width: '16px', height: '16px' }}
                      >
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </button>
                  </div>
                  <div className="clock mono">{currentTime}</div>
                </div>
              </div>

              {/* SCREEN 1: Recipe Catalog */}
              {currentScreen === 0 && (
                <Screen1Catalog
                  recipes={KWATHA_RECIPES}
                  selectedRecipe={selectedRecipe}
                  onSelectRecipe={(recipe) => setSelectedRecipe(recipe)}
                  onOpenRecipe={(recipe) => {
                    setSelectedRecipe(recipe);
                    setCurrentScreen(1);
                  }}
                />
              )}

              {/* SCREEN 2: Recipe Detail */}
              {currentScreen === 1 && (
                <Screen2Details
                  recipe={selectedRecipe}
                  onBrew={() => setCurrentScreen(2)}
                  onBack={() => setCurrentScreen(0)}
                />
              )}

              {/* SCREEN 3: Sensor Fill & Check */}
              {currentScreen === 2 && (
                <Screen3SensorCheck
                  recipe={selectedRecipe}
                  onProceed={() => setCurrentScreen(3)}
                  onBack={() => setCurrentScreen(1)}
                />
              )}

              {/* SCREEN 4: Result */}
              {currentScreen === 3 && (
                <Screen4Result
                  recipe={selectedRecipe}
                  onPrepareAnother={() => setCurrentScreen(0)}
                />
              )}
            </main>
          </div>
        </div>
      </div>

      {/* Subtle zoom / scale control bar */}
      <div
        style={{
          position: 'fixed',
          top: 14,
          right: 14,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(28, 28, 31, 0.85)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
          padding: '4px 10px',
          zIndex: 100,
          color: '#E0E0E6',
          fontSize: 12,
          fontFamily: "'DM Sans', sans-serif",
          boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
        }}
      >
        <span style={{ color: '#9E9EA8', fontWeight: 500 }}>
          {autoScale ? `Fit (${Math.round(scale * 100)}%)` : '100% 1:1'}
        </span>
        <button
          type="button"
          onClick={() => setAutoScale((prev) => !prev)}
          style={{
            background: autoScale ? 'rgba(252, 128, 25, 0.2)' : 'rgba(255,255,255,0.1)',
            border: autoScale ? '1px solid #FC8019' : '1px solid rgba(255,255,255,0.15)',
            color: autoScale ? '#FF9F45' : '#FFFFFF',
            borderRadius: 5,
            padding: '3px 8px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {autoScale ? 'Auto-Fit' : '1:1 Scale'}
        </button>
      </div>
    </div>
  );
}
