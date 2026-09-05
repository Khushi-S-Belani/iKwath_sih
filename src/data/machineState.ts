import { useState, useEffect, useCallback, useRef } from 'react';
import { SensorData, BrewStage, ActuatorState, ValveState } from '../types';

export type BrewPhase =
  | 'IDLE'
  | 'SCANNING'
  | 'DETECTED'
  | 'CONFIRMED'
  | 'SOAKING'
  | 'EXTRACTION'
  | 'REDUCTION'
  | 'FILTRATION'
  | 'DISPENSING'
  | 'COMPLETE'
  | 'CLEANING'
  | 'READY';

export interface LiveBrewState {
  phase: BrewPhase;
  stage: BrewStage;
  elapsed_sec: number;
  estimated_remaining_sec: number;
  sensor: SensorData;
  pod_id: string | null;
  formulation_id: string | null;
  brew_number: number;
  paused: boolean;
  fault: string | null;
}

const INITIAL_SENSOR: SensorData = {
  temperature_c: 24.2,
  mass_g: 0,
  target_mass_g: 102,
  heater: 'OFF',
  stirrer: 'OFF',
  pump: 'OFF',
  product_valve: 'CLOSED',
  drain_valve: 'CLOSED',
  cleaning_required: false,
};

const INITIAL_STATE: LiveBrewState = {
  phase: 'IDLE',
  stage: 'READY',
  elapsed_sec: 0,
  estimated_remaining_sec: 0,
  sensor: INITIAL_SENSOR,
  pod_id: null,
  formulation_id: null,
  brew_number: 422,
  paused: false,
  fault: null,
};

// ─── DEMO phase definitions (whole seconds, clearly visible) ──────────────────
const DEMO_PHASES: { phase: BrewPhase; durationSec: number }[] = [
  { phase: 'SOAKING',    durationSec: 10 },  // 10 s — heating up
  { phase: 'EXTRACTION', durationSec: 12 },  // 12 s — controlled extraction
  { phase: 'REDUCTION',  durationSec: 12 },  // 12 s — mass reducing
  { phase: 'FILTRATION', durationSec:  8 },  //  8 s — pump active
  { phase: 'DISPENSING', durationSec:  6 },  //  6 s — final dispense
  { phase: 'COMPLETE',   durationSec:  0 },
];
const TOTAL_DEMO_SEC = DEMO_PHASES.reduce((a, b) => a + b.durationSec, 0); // 48 s

// ─── Sensor evolution per phase ───────────────────────────────────────────────
function evolveSensor(prev: SensorData, phase: BrewPhase, elapsed: number): SensorData {
  const s = { ...prev };

  switch (phase) {
    case 'SOAKING':
      s.heater = 'ACTIVE';
      s.stirrer = 'OFF';
      s.pump = 'OFF';
      s.temperature_c = Math.min(90, 25 + elapsed * 6 + (Math.random() - 0.5) * 0.5);
      s.mass_g = 400 + (Math.random() - 0.5) * 2;
      break;

    case 'EXTRACTION':
      s.heater = 'ACTIVE';
      s.stirrer = 'ACTIVE';
      s.pump = 'OFF';
      s.temperature_c = 88 + Math.sin(elapsed * 0.3) * 1.5 + (Math.random() - 0.5) * 0.4;
      s.mass_g = Math.max(350, 400 - elapsed * 4 + (Math.random() - 0.5) * 2);
      break;

    case 'REDUCTION':
      s.heater = 'ACTIVE';
      s.stirrer = 'ACTIVE';
      s.pump = 'OFF';
      s.temperature_c = 89 + Math.sin(elapsed * 0.2) * 1.0 + (Math.random() - 0.5) * 0.3;
      s.mass_g = Math.max(102, 340 - elapsed * 18 + (Math.random() - 0.5) * 3);
      break;

    case 'FILTRATION':
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'ACTIVE';
      s.product_valve = 'OPEN';
      s.temperature_c = Math.max(60, prev.temperature_c - 1.5 + (Math.random() - 0.5) * 0.3);
      s.mass_g = Math.max(100, prev.mass_g - 2 + (Math.random() - 0.5));
      break;

    case 'DISPENSING':
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'ACTIVE';
      s.product_valve = 'OPEN';
      s.temperature_c = Math.max(55, prev.temperature_c - 0.5);
      s.mass_g = prev.mass_g;
      break;

    case 'CLEANING':
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'ACTIVE';
      s.product_valve = 'CLOSED';
      s.drain_valve = 'OPEN';
      s.temperature_c = Math.max(30, prev.temperature_c - 2);
      s.mass_g = 0;
      s.cleaning_required = true;
      break;

    case 'IDLE':
    case 'READY':
    default:
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'OFF';
      s.product_valve = 'CLOSED';
      s.drain_valve = 'CLOSED';
      s.cleaning_required = false;
      break;
  }

  return s;
}

export function phaseToStage(phase: BrewPhase): BrewStage {
  const map: Partial<Record<BrewPhase, BrewStage>> = {
    SOAKING: 'SOAKING',
    EXTRACTION: 'EXTRACTION',
    REDUCTION: 'REDUCTION',
    FILTRATION: 'FILTRATION',
    DISPENSING: 'DISPENSING',
    CLEANING: 'CLEANING',
    COMPLETE: 'READY',
    READY: 'READY',
    IDLE: 'POD_DETECTED',
    SCANNING: 'POD_DETECTED',
    DETECTED: 'POD_DETECTED',
    CONFIRMED: 'POD_DETECTED',
  };
  return map[phase] ?? 'READY';
}

export type { SensorData };

export function useMachineState() {
  const [state, setState] = useState<LiveBrewState>(INITIAL_STATE);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Mutable refs — allow skipPhase to read/write without stale closures
  const phaseIdxRef     = useRef(0);
  const phaseElapsedRef = useRef(0);
  const totalElapsedRef = useRef(0);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // ─── Advance to next phase (shared by timer and skipPhase) ─────────────────
  const advancePhase = useCallback((prevSensor: SensorData): Partial<LiveBrewState> | null => {
    phaseIdxRef.current += 1;
    phaseElapsedRef.current = 0;
    const next = DEMO_PHASES[phaseIdxRef.current];
    if (!next || next.phase === 'COMPLETE') {
      stopTimer();
      return { phase: 'COMPLETE', stage: 'READY', estimated_remaining_sec: 0 };
    }
    return {
      phase: next.phase,
      stage: phaseToStage(next.phase),
      elapsed_sec: totalElapsedRef.current,
      estimated_remaining_sec: Math.max(0, TOTAL_DEMO_SEC - totalElapsedRef.current),
      sensor: evolveSensor(prevSensor, next.phase, 0),
    };
  }, [stopTimer]);

  // ─── Start brew ────────────────────────────────────────────────────────────
  const startBrewSimulation = useCallback((pod_id: string, formulation_id: string) => {
    stopTimer();
    phaseIdxRef.current     = 0;
    phaseElapsedRef.current = 0;
    totalElapsedRef.current = 0;

    setState((prev) => ({
      ...prev,
      phase: 'SOAKING',
      stage: 'SOAKING',
      elapsed_sec: 0,
      estimated_remaining_sec: TOTAL_DEMO_SEC,
      pod_id,
      formulation_id,
      paused: false,
      fault: null,
      sensor: { ...INITIAL_SENSOR, mass_g: 400 },
    }));

    timerRef.current = setInterval(() => {
      setState((prev) => {
        if (prev.paused) return prev;

        phaseElapsedRef.current += 1;
        totalElapsedRef.current += 1;

        const cur = DEMO_PHASES[phaseIdxRef.current];
        if (!cur || cur.phase === 'COMPLETE') {
          stopTimer();
          return { ...prev, phase: 'COMPLETE', stage: 'READY', estimated_remaining_sec: 0 };
        }

        // Phase finished? advance
        if (phaseElapsedRef.current >= cur.durationSec) {
          const patch = advancePhase(prev.sensor);
          return patch ? { ...prev, ...patch } : prev;
        }

        return {
          ...prev,
          elapsed_sec: totalElapsedRef.current,
          estimated_remaining_sec: Math.max(0, TOTAL_DEMO_SEC - totalElapsedRef.current),
          sensor: evolveSensor(prev.sensor, cur.phase, phaseElapsedRef.current),
        };
      });
    }, 1000);
  }, [stopTimer, advancePhase]);

  // ─── Skip current phase instantly ─────────────────────────────────────────
  const skipPhase = useCallback(() => {
    setState((prev) => {
      const patch = advancePhase(prev.sensor);
      return patch ? { ...prev, ...patch } : prev;
    });
  }, [advancePhase]);

  // ─── Cleaning ──────────────────────────────────────────────────────────────
  const startCleaning = useCallback(() => {
    stopTimer();
    setState((prev) => ({
      ...prev,
      phase: 'CLEANING',
      stage: 'CLEANING',
      sensor: { ...prev.sensor, pump: 'ACTIVE', drain_valve: 'OPEN', cleaning_required: true },
    }));

    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        phase: 'READY',
        stage: 'READY',
        sensor: { ...INITIAL_SENSOR, temperature_c: 24, cleaning_required: false },
        pod_id: null,
        formulation_id: null,
        elapsed_sec: 0,
        estimated_remaining_sec: 0,
      }));
    }, 8000);
  }, [stopTimer]);

  const cancelBrew = useCallback(() => {
    stopTimer();
    setState((prev) => ({
      ...prev,
      phase: 'IDLE',
      stage: 'READY',
      paused: false,
      sensor: { ...INITIAL_SENSOR, temperature_c: prev.sensor.temperature_c },
    }));
  }, [stopTimer]);

  const setPaused = useCallback((paused: boolean) => {
    setState((prev) => ({ ...prev, paused }));
  }, []);

  const scanPod = useCallback((pod_id: string, formulation_id: string) => {
    setState((prev) => ({
      ...prev,
      phase: 'SCANNING',
      pod_id,
      formulation_id,
      fault: null,
    }));
    setTimeout(() => {
      setState((prev) => ({ ...prev, phase: 'DETECTED' }));
    }, 2000);
  }, []);

  const resetToIdle = useCallback(() => {
    stopTimer();
    setState(INITIAL_STATE);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  return {
    state,
    startBrewSimulation,
    skipPhase,
    startCleaning,
    cancelBrew,
    setPaused,
    scanPod,
    resetToIdle,
  };
}
