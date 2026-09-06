import React, { useState, useEffect, useRef, useCallback } from 'react';
import { DeviceRail } from './components/DeviceRail';
import { HomeScreen } from './components/HomeScreen';
import { PodScreen } from './components/PodScreen';
import { BrewConfirmScreen } from './components/BrewConfirmScreen';
import { WaterFillScreen } from './components/WaterFillScreen';
import { LiveBrewScreen } from './components/LiveBrewScreen';
import { ReductionScreen } from './components/ReductionScreen';
import { FiltrationScreen } from './components/FiltrationScreen';
import { BrewPassportScreen } from './components/BrewPassportScreen';
import { CleaningScreen } from './components/CleaningScreen';
import { HistoryScreen } from './components/HistoryScreen';
import { ValidationScreen } from './components/ValidationScreen';
import { TechnicianScreen } from './components/TechnicianScreen';
import { ResearchScreen } from './components/ResearchScreen';
import { FormulationsScreen } from './components/FormulationsScreen';
import { useMachineState } from './data/machineState';
import { BREW_HISTORY } from './data/brewHistory';
import { FORMULATIONS } from './data/formulations';
import { NavSection, MachineMode, MachineStatus, FormulationProfile, BrewRecord } from './types';

type PodState = 'IDLE' | 'SCANNING' | 'DETECTED' | 'INVALID' | 'READ_FAILED';
type CleaningPhase = 'REQUIRED' | 'RINSING' | 'DRAINING' | 'COMPLETE' | 'FAILED';

export default function App() {
  const [currentSection, setCurrentSection] = useState<NavSection>('home');
  const [mode, setMode] = useState<MachineMode>('user');
  const [podState, setPodState] = useState<PodState>('IDLE');
  const [selectedFormulation, setSelectedFormulation] = useState<FormulationProfile>(FORMULATIONS[0]);
  const [cleaningPhase, setCleaningPhase] = useState<CleaningPhase>('REQUIRED');
  const [brewHistory, setBrewHistory] = useState<BrewRecord[]>(BREW_HISTORY);
  const [currentBrewRecord, setCurrentBrewRecord] = useState<BrewRecord | null>(null);
  const [massHistory, setMassHistory] = useState<{ time: number; mass: number }[]>([]);
  const [tempHistory, setTempHistory] = useState<{ time: number; temp: number }[]>([]);
  const [currentTime, setCurrentTime] = useState('');
  const [is24Hour, setIs24Hour] = useState(false);
  const [meridiem, setMeridiem] = useState('AM');
  const [scale, setScale] = useState(1);
  const outerWrapRef = useRef<HTMLDivElement>(null);

  const machine = useMachineState();
  const { state: brewState } = machine;

  // Machine status derived from brew phase
  const machineStatus: MachineStatus =
    brewState.phase === 'IDLE' || brewState.phase === 'READY' ? 'READY'
    : brewState.phase === 'CLEANING' ? 'CLEANING'
    : brewState.phase === 'SCANNING' || brewState.phase === 'DETECTED' || brewState.phase === 'CONFIRMED' ? 'ATTENTION'
    : brewState.fault ? 'FAULT'
    : 'BUSY';

  const brewInProgress = ['WATER_FILL', 'SOAKING', 'HEATING', 'STIRRING', 'REDUCTION', 'FILTRATION', 'DISPENSING'].includes(brewState.phase);

  // Track sensor history for charts
  useEffect(() => {
    if (!brewInProgress) return;
    const timeMin = brewState.elapsed_sec / 60;
    setMassHistory((prev) => [...prev.slice(-100), { time: parseFloat(timeMin.toFixed(2)), mass: brewState.sensor.mass_g }]);
    setTempHistory((prev) => [...prev.slice(-100), { time: parseFloat(timeMin.toFixed(2)), temp: brewState.sensor.temperature_c }]);
  }, [brewState.elapsed_sec]);

  // Auto-navigate based on brew phase
  useEffect(() => {
    if (brewState.phase === 'WATER_FILL') {
      setCurrentSection('water-fill');
    } else if (brewState.phase === 'SOAKING' || brewState.phase === 'HEATING' || brewState.phase === 'STIRRING') {
      setCurrentSection('live-brew');
    } else if (brewState.phase === 'REDUCTION') {
      // Don't force nav — let user see reduction screen if they go there
    } else if (brewState.phase === 'FILTRATION' || brewState.phase === 'DISPENSING') {
      setCurrentSection('filtration');
    } else if (brewState.phase === 'COMPLETE') {
      // Build brew record and show passport
      const record: BrewRecord = {
        brew_id: `#${brewState.brew_number}`,
        formulation: selectedFormulation.name,
        pod_id: selectedFormulation.pod_id,
        timestamp: new Date(),
        water_input_ml: selectedFormulation.water_ml,
        final_mass_g: parseFloat(brewState.sensor.mass_g.toFixed(1)) || selectedFormulation.reduction_endpoint_g,
        cycle_time_min: Math.floor(brewState.elapsed_sec / 60),
        cycle_time_sec: brewState.elapsed_sec % 60,
        temp_profile: tempHistory.slice(-60),
        mass_profile: massHistory.slice(-60),
        stage_timestamps: {
          POD_DETECTED: 0,
          WATER_FILL: 0.2,
          SOAKING: 0.5,
          HEATING: selectedFormulation.soak_time_min,
          STIRRING: selectedFormulation.soak_time_min + 2,
          REDUCTION: selectedFormulation.soak_time_min + selectedFormulation.extraction_time_min,
          FILTRATION: brewState.elapsed_sec / 60 - 3,
          DISPENSING: brewState.elapsed_sec / 60 - 1,
          CLEANING: brewState.elapsed_sec / 60,
          READY: brewState.elapsed_sec / 60 + 3,
        },
        cleaning_completed: false,
        result: 'PASS',
        warnings: [],
      };
      setCurrentBrewRecord(record);
      setBrewHistory((prev) => [record, ...prev]);
      setCurrentSection('brew-passport');
    }
  }, [brewState.phase]);

  // Step 1: Select Kwatha — go to formulations screen first
  const handleInsertPod = useCallback(() => {
    setCurrentSection('formulations');
  }, []);

  // Step 2: Formulation selected → load profile + scan pod
  const handleFormulationSelected = useCallback((f: FormulationProfile) => {
    setSelectedFormulation(f);
    setPodState('SCANNING');
    setCurrentSection('pod');
    machine.scanPod(f.pod_id, f.id);
    setTimeout(() => setPodState('DETECTED'), 2000);
  }, [machine]);

  const handlePodRetry = useCallback(() => {
    setPodState('SCANNING');
    setTimeout(() => setPodState('DETECTED'), 2000);
  }, []);

  const handlePodConfirm = useCallback(() => {
    setPodState('IDLE');
    setCurrentSection('brew-confirm');
  }, []);

  const handleStartBrew = useCallback(() => {
    setMassHistory([]);
    setTempHistory([]);
    machine.startBrewSimulation(selectedFormulation.pod_id, selectedFormulation.id);
    setCurrentSection('live-brew');
  }, [selectedFormulation, machine]);

  const handleCancelBrew = useCallback(() => {
    machine.cancelBrew();
    setPodState('IDLE');
    setCurrentSection('home');
  }, [machine]);

  const handleStartCleaning = useCallback(() => {
    setCleaningPhase('RINSING');
    setCurrentSection('cleaning');
    machine.startCleaning();
    setTimeout(() => setCleaningPhase('DRAINING'), 4000);
    setTimeout(() => {
      setCleaningPhase('COMPLETE');
      if (currentBrewRecord) {
        setCurrentBrewRecord((prev) => prev ? { ...prev, cleaning_completed: true } : null);
        setBrewHistory((prev) => prev.map((r) => r.brew_id === currentBrewRecord.brew_id ? { ...r, cleaning_completed: true } : r));
      }
    }, 8000);
  }, [machine, currentBrewRecord]);

  const handleCleaningComplete = useCallback(() => {
    setCleaningPhase('REQUIRED');
    setPodState('IDLE');
    setCurrentSection('home');
    machine.resetToIdle();
  }, [machine]);

  // Clock
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const h = now.getHours(), m = now.getMinutes();
      const am = h >= 12 ? 'PM' : 'AM';
      const h12 = String(h % 12 || 12).padStart(2, '0');
      const h24 = String(h).padStart(2, '0');
      const min = String(m).padStart(2, '0');
      setCurrentTime(is24Hour ? `${h24}:${min}` : `${h12}:${min}`);
      setMeridiem(am);
    };
    update();
    const t = setInterval(update, 10000);
    return () => clearInterval(t);
  }, [is24Hour]);

  // Scale
  useEffect(() => {
    const resize = () => {
      const scaleX = window.innerWidth / (1328 + 32);
      const scaleY = window.innerHeight / (848 + 32);
      setScale(Math.max(Math.min(scaleX, scaleY, 1), 0.42));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const SECTION_TITLES: Record<NavSection, { title: string; sub: string }> = {
    home: { title: 'Home', sub: 'Machine readiness and quick actions.' },
    formulations: { title: 'Step 1 · Select Kwatha', sub: 'Choose a formulation or add a new pod profile.' },
    pod: { title: 'Step 2 · Load Formulation Profile', sub: 'System loads and verifies process parameters.' },
    'brew-confirm': { title: 'Step 3 · Insert Pod & Add Water', sub: `Place herbal pod in vessel and add water — ${selectedFormulation.name}` },
    'water-fill': { title: 'Step 4 · Measure Water Quantity', sub: 'Load Cell + HX711 real-time weight measurement.' },
    'live-brew': { title: 'Live Brew', sub: `${selectedFormulation.name} · BREW #${brewState.brew_number}` },
    reduction: { title: 'Step 8 · Monitor Reduction', sub: 'Load Cell + HX711 — tracking mass loss to target endpoint.' },
    filtration: { title: brewState.phase === 'DISPENSING' ? 'Step 10 · Dispense Kwatha' : 'Step 9 · Filter Extract', sub: brewState.phase === 'DISPENSING' ? 'Peristaltic pump + valve — controlled dispensing.' : 'Removable SS316 filter — bottom outlet.' },
    'brew-passport': { title: 'Brew Passport', sub: `Complete brew record for ${selectedFormulation.name}.` },
    cleaning: { title: 'Step 11 · Cleaning / Rinse Cycle', sub: 'Washable flow path + filter rinse — manual or automated.' },
    history: { title: 'Brew History', sub: 'All recorded brews with search and filters.' },
    validation: { title: 'Validation Mode', sub: 'Traditional vs iKwath comparison.' },
    technician: { title: 'Technician Mode', sub: 'Diagnostics, calibration and actuator tests.' },
    research: { title: 'Research Mode', sub: 'Analytics, repeatability data and export.' },
  };

  const meta = SECTION_TITLES[currentSection];

  const renderScreen = () => {
    switch (currentSection) {
      case 'home':
        return (
          <HomeScreen
            machineStatus={machineStatus}
            lastBrew={brewHistory[0] ?? null}
            chamberClean={!brewState.sensor.cleaning_required}
            waterReady={true}
            onInsertPod={handleInsertPod}
            onViewHistory={() => setCurrentSection('history')}
          />
        );
      case 'formulations':
        return (
          <FormulationsScreen
            onSelectFormulation={handleFormulationSelected}
          />
        );
      case 'pod':
        return (
          <PodScreen
            podState={podState}
            formulation={selectedFormulation}
            onConfirm={handlePodConfirm}
            onRetry={handlePodRetry}
            onBack={() => setCurrentSection('formulations')}
          />
        );
      case 'brew-confirm':
        return (
          <BrewConfirmScreen
            formulation={selectedFormulation}
            chamberReady={!brewState.sensor.cleaning_required}
            waterReady={true}
            safetyOk={true}
            onStart={handleStartBrew}
            onBack={() => setCurrentSection('pod')}
          />
        );
      case 'water-fill':
        return (
          <WaterFillScreen
            brewState={brewState}
            formulation={selectedFormulation}
            onSkipPhase={machine.skipPhase}
          />
        );
      case 'live-brew':
        return (
          <LiveBrewScreen
            brewState={brewState}
            formulation={selectedFormulation}
            brewNumber={brewState.brew_number}
            onPause={() => machine.setPaused(true)}
            onResume={() => machine.setPaused(false)}
            onCancel={handleCancelBrew}
            onViewDetails={() => setCurrentSection('reduction')}
            onSkipPhase={machine.skipPhase}
          />
        );
      case 'reduction':
        return (
          <ReductionScreen
            brewState={brewState}
            formulation={selectedFormulation}
            massHistory={massHistory}
            tempHistory={tempHistory}
            onSkipPhase={machine.skipPhase}
          />
        );
      case 'filtration':
        return (
          <FiltrationScreen
            brewState={brewState}
            onComplete={() => setCurrentSection('brew-passport')}
            onSkipPhase={machine.skipPhase}
          />
        );
      case 'brew-passport':
        return (
          <BrewPassportScreen
            record={currentBrewRecord ?? brewHistory[0]}
            onStartCleaning={handleStartCleaning}
            onNewBrew={() => { machine.resetToIdle(); setPodState('IDLE'); setCurrentSection('home'); }}
            onViewHistory={() => setCurrentSection('history')}
          />
        );
      case 'cleaning':
        return (
          <CleaningScreen
            cleaningPhase={cleaningPhase}
            onComplete={handleCleaningComplete}
            onBack={() => setCurrentSection(currentBrewRecord ? 'brew-passport' : 'home')}
          />
        );
      case 'history':
        return (
          <HistoryScreen
            records={brewHistory}
            onViewPassport={(record) => { setCurrentBrewRecord(record); setCurrentSection('brew-passport'); }}
          />
        );
      case 'validation':
        return <ValidationScreen />;
      case 'technician':
        return <TechnicianScreen />;
      case 'research':
        return <ResearchScreen />;
      default:
        return null;
    }
  };

  return (
    <div
      ref={outerWrapRef}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundColor: '#080C0A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.15s ease-out' }}>
        <div className="bezel">
          <div className="device">
            <DeviceRail
              currentSection={currentSection}
              onSelectSection={setCurrentSection}
              machineStatus={machineStatus}
              mode={mode}
              onModeChange={setMode}
              brewInProgress={brewInProgress}
            />

            <main className="main">
              {/* Topbar */}
              <div className="topbar">
                <div className="topbar-left">
                  <div className="screen-title">{meta.title}</div>
                  <div className="screen-sub">{meta.sub}</div>
                </div>
                <div className="topbar-right">
                  {/* Brew active indicator */}
                  {brewInProgress && (
                    <div className="brew-active-badge">
                      <span className="brew-active-dot" />
                      BREW ACTIVE
                    </div>
                  )}
                  {/* Clock */}
                  <div
                    className="time-bar-capsule"
                    onClick={() => setIs24Hour((p) => !p)}
                    role="timer"
                    aria-label={`Current time ${currentTime}`}
                    title="Click to toggle 12h / 24h"
                  >
                    <span className="time-live-dot" />
                    <svg className="time-clock-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                    <span className="time-digits">{currentTime}</span>
                    {!is24Hour && <span className="time-meridiem">{meridiem}</span>}
                  </div>
                </div>
              </div>

              {/* Screen Content */}
              <div className="screen-area">
                {renderScreen()}
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
