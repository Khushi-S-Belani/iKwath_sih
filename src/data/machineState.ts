import { useState, useEffect, useCallback, useRef } from 'react';
import { SensorData, BrewStage, ActuatorState, ValveState } from '../types';

export type BrewPhase =
  | 'IDLE'
  | 'SCANNING'
  | 'DETECTED'
  | 'CONFIRMED'
  | 'WATER_FILL'
  | 'SOAKING'
  | 'HEATING'
  | 'STIRRING'
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
  { phase: 'WATER_FILL',  durationSec:  8 },  //  8 s — load cell measuring water quantity
  { phase: 'SOAKING',    durationSec: 10 },  // 10 s — soak time per formulation
  { phase: 'HEATING',    durationSec: 10 },  // 10 s — induction heating + PT100 feedback
  { phase: 'STIRRING',   durationSec: 10 },  // 10 s — stepper motor stirring during extraction
  { phase: 'REDUCTION',  durationSec: 12 },  // 12 s — mass-driven endpoint detection
  { phase: 'FILTRATION', durationSec:  8 },  //  8 s — SS316 filter, bottom outlet
  { phase: 'DISPENSING', durationSec:  6 },  //  6 s — peristaltic pump dispense
  { phase: 'COMPLETE',   durationSec:  0 },
];
const TOTAL_DEMO_SEC = DEMO_PHASES.reduce((a, b) => a + b.durationSec, 0); // 64 s

// ─── Sensor evolution per phase ───────────────────────────────────────────────
function evolveSensor(prev: SensorData, phase: BrewPhase, elapsed: number): SensorData {
  const s = { ...prev };

  switch (phase) {
    case 'WATER_FILL':
      // Load Cell + HX711 measuring water fill — heating off, no stirring
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'OFF';
      s.product_valve = 'CLOSED';
      s.drain_valve = 'CLOSED';
      s.temperature_c = 24 + (Math.random() - 0.5) * 0.3;
      // Mass rises as water fills (simulate water inlet)
      s.mass_g = Math.min(400, 50 + elapsed * 44 + (Math.random() - 0.5) * 2);
      break;

    case 'SOAKING':
      // Maintain soak time per formulation — gentle warm-up
      s.heater = 'ACTIVE';
      s.stirrer = 'OFF';
      s.pump = 'OFF';
      s.temperature_c = Math.min(60, 25 + elapsed * 3.5 + (Math.random() - 0.5) * 0.5);
      s.mass_g = 400 + (Math.random() - 0.5) * 2;
      break;

    case 'HEATING':
      // Induction heating + PT100 temperature feedback — no stirring yet
      s.heater = 'ACTIVE';
      s.stirrer = 'OFF';
      s.pump = 'OFF';
      s.temperature_c = Math.min(90, 60 + elapsed * 3 + (Math.random() - 0.5) * 0.5);
      s.mass_g = 400 - elapsed * 1.5 + (Math.random() - 0.5) * 1.5;
      break;

    case 'STIRRING':
      // Stepper motor stirring during extraction at profile-based speed
      s.heater = 'ACTIVE';
      s.stirrer = 'ACTIVE';
      s.pump = 'OFF';
      s.temperature_c = 88 + Math.sin(elapsed * 0.3) * 1.5 + (Math.random() - 0.5) * 0.4;
      s.mass_g = Math.max(350, 385 - elapsed * 3.5 + (Math.random() - 0.5) * 2);
      break;

    case 'REDUCTION':
      // Load Cell + HX711 monitoring mass loss to target endpoint
      s.heater = 'ACTIVE';
      s.stirrer = 'ACTIVE';
      s.pump = 'OFF';
      s.temperature_c = 89 + Math.sin(elapsed * 0.2) * 1.0 + (Math.random() - 0.5) * 0.3;
      s.mass_g = Math.max(102, 340 - elapsed * 18 + (Math.random() - 0.5) * 3);
      break;

    case 'FILTRATION':
      // SS316 removable filter — bottom outlet active
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'ACTIVE';
      s.product_valve = 'OPEN';
      s.temperature_c = Math.max(60, prev.temperature_c - 1.5 + (Math.random() - 0.5) * 0.3);
      s.mass_g = Math.max(100, prev.mass_g - 2 + (Math.random() - 0.5));
      break;

    case 'DISPENSING':
      // Peristaltic pump + valve — controlled and complete dispensing
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'ACTIVE';
      s.product_valve = 'OPEN';
      s.temperature_c = Math.max(55, prev.temperature_c - 0.5);
      s.mass_g = prev.mass_g;
      break;

    case 'CLEANING':
      // Washable flow path + filter rinse
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
    WATER_FILL: 'WATER_FILL',
    SOAKING: 'SOAKING',
    HEATING: 'HEATING',
    STIRRING: 'STIRRING',
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
      phase: 'WATER_FILL',
      stage: 'WATER_FILL',
      elapsed_sec: 0,
      estimated_remaining_sec: TOTAL_DEMO_SEC,
      pod_id,
      formulation_id,
      paused: false,
      fault: null,
      sensor: { ...INITIAL_SENSOR, mass_g: 50 }, // starts low, fills up
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
