import { useState, useEffect, useCallback, useRef } from 'react';
import { SensorData, BrewStage, ActuatorState, ValveState } from '../types';
import { esp32Serial, ESP32Telemetry } from '../services/esp32Serial';

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
  hardwareConnected: boolean;
  hardwareTelemetry: ESP32Telemetry | null;
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
  hardwareConnected: false,
  hardwareTelemetry: null,
};

// ─── Phase Definitions & Progression Rules ────────────────────────────────────
// SENSOR-GATED STEPS: Only proceed when real-time sensor data meets target
// TIMED GAP STEPS: Proceed after specified duration gap for natural processing
const DEMO_PHASES: { phase: BrewPhase; isSensorGated: boolean; durationSec: number }[] = [
  { phase: 'WATER_FILL',  isSensorGated: true,  durationSec: 12 }, // Sensor-gated: Flow sensor / Load cell to 400 mL
  { phase: 'SOAKING',    isSensorGated: false, durationSec: 10 }, // Timed gap: 10s botanical maceration
  { phase: 'HEATING',    isSensorGated: true,  durationSec: 12 }, // Sensor-gated: Temperature to target °C
  { phase: 'STIRRING',   isSensorGated: false, durationSec: 20 }, // Component agitation: 20s 28BYJ-48 stepper
  { phase: 'REDUCTION',  durationSec: 15, isSensorGated: false }, // Timed gap: 15s decoction mass loss tracking (>= 10s)
  { phase: 'FILTRATION', durationSec: 10, isSensorGated: false }, // Timed gap: 10s SS316 filter separation
  { phase: 'DISPENSING', durationSec: 10, isSensorGated: false }, // Component dispense: 10s peristaltic pump
  { phase: 'COMPLETE',   durationSec:  0, isSensorGated: false },
];
const TOTAL_DEMO_SEC = 87; // ~87 s total baseline

// ─── Sensor evolution per phase (fallback when no physical ESP32 connected) ───
function evolveSensor(prev: SensorData, phase: BrewPhase, elapsed: number, targetWaterMl: number = 400, targetTempC: number = 90): SensorData {
  const s = { ...prev };
  const effectiveTargetTemp = targetTempC || 90;

  switch (phase) {
    case 'WATER_FILL': {
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'ACTIVE';
      s.product_valve = 'CLOSED';
      s.drain_valve = 'CLOSED';
      s.temperature_c = 25.0 + (Math.random() - 0.5) * 0.2;
      // Real-time flow accumulation: ~45 mL/s until target reached
      const newMass = Math.min(targetWaterMl, Math.max(s.mass_g, elapsed * 45 + (Math.random() - 0.5) * 2));
      s.mass_g = parseFloat(newMass.toFixed(1));
      s.water_ml = s.mass_g;
      s.flow_rate_lpm = s.mass_g >= targetWaterMl ? 0 : 2.45 + (Math.random() - 0.5) * 0.15;
      s.flow_pulses = Math.round(s.mass_g * 45.0); // 18,000 pulses = 400 mL
      break;
    }

    case 'SOAKING':
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'OFF';
      s.flow_rate_lpm = 0;
      s.temperature_c = 25.5 + (Math.random() - 0.5) * 0.2;
      s.mass_g = targetWaterMl;
      s.water_ml = targetWaterMl;
      break;

    case 'HEATING': {
      s.heater = 'ACTIVE';
      s.stirrer = 'OFF';
      s.pump = 'OFF';
      s.flow_rate_lpm = 0;
      // Real-time temperature heating curve to formulation target
      const currentT = prev.temperature_c >= 25 ? prev.temperature_c : 25.0;
      const newTemp = Math.min(effectiveTargetTemp, currentT + 3.5 + (Math.random() - 0.5) * 0.4);
      s.temperature_c = parseFloat(newTemp.toFixed(1));
      s.mass_g = Math.max(targetWaterMl * 0.95, targetWaterMl - elapsed * 0.8);
      break;
    }

    case 'STIRRING':
      s.heater = 'OFF';
      s.stirrer = 'ACTIVE';
      s.pump = 'OFF';
      s.temperature_c = effectiveTargetTemp + (Math.random() - 0.5) * 0.2;
      s.mass_g = Math.max(targetWaterMl * 0.85, targetWaterMl - elapsed * 2.0);
      break;

    case 'REDUCTION': {
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'OFF';
      s.temperature_c = parseFloat(Math.max(72, effectiveTargetTemp - elapsed * 0.6 + (Math.random() - 0.5) * 0.3).toFixed(1));
      const targetEndpoint = s.target_mass_g || 102;
      const startReductionMass = targetWaterMl * 0.95;
      const progress = Math.min(1.0, Math.max(0, elapsed / 14));
      const currentMass = startReductionMass - progress * (startReductionMass - targetEndpoint);
      s.mass_g = parseFloat((currentMass + (Math.random() - 0.5) * 0.4).toFixed(1));
      break;
    }

    case 'FILTRATION':
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'ACTIVE';
      s.product_valve = 'OPEN';
      s.drain_valve = 'CLOSED';
      s.temperature_c = Math.max(30, prev.temperature_c - 0.4);
      s.mass_g = Math.max(100, prev.mass_g - 1);
      break;

    case 'DISPENSING':
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'ACTIVE';
      s.product_valve = 'OPEN';
      s.drain_valve = 'CLOSED';
      s.temperature_c = 30.0;
      s.mass_g = prev.mass_g;
      break;

    case 'CLEANING':
      s.heater = 'OFF';
      s.stirrer = 'OFF';
      s.pump = 'ACTIVE';
      s.product_valve = 'CLOSED';
      s.drain_valve = 'OPEN';
      s.temperature_c = Math.max(25, prev.temperature_c - 2);
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

  // Mutable refs for state tracking
  const phaseIdxRef     = useRef(0);
  const phaseElapsedRef = useRef(0);
  const totalElapsedRef = useRef(0);
  const targetWaterRef  = useRef(400);
  const targetTempRef   = useRef(35);

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
      sensor: evolveSensor(prevSensor, next.phase, 0, targetWaterRef.current, targetTempRef.current),
    };
  }, [stopTimer]);

  // ─── Start brew (Physical ESP32 + Real-Time Software prototype) ────────────
  const startBrewSimulation = useCallback((
    pod_id: string,
    formulation_id: string,
    waterMl: number = 400,
    tempC: number = 90
  ) => {
    stopTimer();
    phaseIdxRef.current     = 0;
    phaseElapsedRef.current = 0;
    totalElapsedRef.current = 0;
    const effectiveTemp = tempC || 90;
    targetWaterRef.current  = waterMl;
    targetTempRef.current   = effectiveTemp;

    // Trigger physical hardware brew if ESP32 connected
    if (esp32Serial.isConnected()) {
      esp32Serial.startBrew(waterMl, effectiveTemp);
    }

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
      sensor: { ...INITIAL_SENSOR, mass_g: 0, water_ml: 0, target_mass_g: Math.round(waterMl * 0.25) },
    }));

    // If hardware is NOT connected, run real-time sensor/time-gated progression
    if (!esp32Serial.isConnected()) {
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

          // Evolve real-time sensor state
          const evolvedSensor = evolveSensor(
            prev.sensor,
            cur.phase,
            phaseElapsedRef.current,
            targetWaterRef.current,
            targetTempRef.current
          );

          // Real-time Sensor-Gated vs Timed-Gap Transition Check:
          let canAdvance = false;

          if (cur.phase === 'WATER_FILL') {
            // SENSOR GATED: Only advance after measured water reaches target mL (400 mL)
            canAdvance = evolvedSensor.mass_g >= targetWaterRef.current;
          } else if (cur.phase === 'HEATING') {
            // SENSOR GATED: When temperature touches formulation target, heating ends and stirring starts!
            canAdvance = evolvedSensor.temperature_c >= (targetTempRef.current || 90);
          } else {
            // TIMED GAP STEP: Advances normally after specified duration gap
            canAdvance = phaseElapsedRef.current >= cur.durationSec;
          }

          if (canAdvance) {
            const patch = advancePhase(evolvedSensor);
            return patch ? { ...prev, ...patch } : prev;
          }

          return {
            ...prev,
            elapsed_sec: totalElapsedRef.current,
            estimated_remaining_sec: Math.max(0, TOTAL_DEMO_SEC - totalElapsedRef.current),
            sensor: evolvedSensor,
          };
        });
      }, 1000);
    }
  }, [stopTimer, advancePhase]);

  // ─── Skip current phase instantly ─────────────────────────────────────────
  const skipPhase = useCallback(() => {
    if (esp32Serial.isConnected()) {
      esp32Serial.skipPhase();
    }
    setState((prev) => {
      const patch = advancePhase(prev.sensor);
      return patch ? { ...prev, ...patch } : prev;
    });
  }, [advancePhase]);

  // ─── Cleaning ──────────────────────────────────────────────────────────────
  const startCleaning = useCallback(() => {
    if (esp32Serial.isConnected()) {
      esp32Serial.startCleaning();
    }
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
        sensor: { ...INITIAL_SENSOR, temperature_c: prev.sensor.temperature_c, cleaning_required: false },
        pod_id: null,
        formulation_id: null,
        elapsed_sec: 0,
        estimated_remaining_sec: 0,
      }));
    }, 8000);
  }, [stopTimer]);

  const cancelBrew = useCallback(() => {
    if (esp32Serial.isConnected()) {
      esp32Serial.stopBrew();
    }
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
    if (esp32Serial.isConnected()) {
      esp32Serial.togglePause();
    }
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
    }, 1500);
  }, []);

  const resetToIdle = useCallback(() => {
    if (esp32Serial.isConnected()) {
      esp32Serial.stopBrew();
    }
    stopTimer();
    setState(INITIAL_STATE);
  }, [stopTimer]);

  // ─── Hardware Serial Telemetry Subscription & Real-Time Sync ───────────────
  useEffect(() => {
    const unsubConn = esp32Serial.onConnectionChange((connected) => {
      setState((prev) => ({ ...prev, hardwareConnected: connected }));
    });

    const unsubTelem = esp32Serial.onTelemetry((telemetry: ESP32Telemetry) => {
      setState((prev) => {
        // Map hardware phase name to BrewPhase
        const pUpper = (telemetry.phase || '').toUpperCase();
        let mappedPhase: BrewPhase = prev.phase;

        if (pUpper === 'POD_DETECTED' || pUpper === 'POD_DROP') mappedPhase = 'CONFIRMED';
        else if (pUpper === 'WATER_FILL') mappedPhase = 'WATER_FILL';
        else if (pUpper === 'SOAKING') mappedPhase = 'SOAKING';
        else if (pUpper === 'HEATING') mappedPhase = 'HEATING';
        else if (pUpper === 'STIRRING') mappedPhase = 'STIRRING';
        else if (pUpper === 'REDUCTION') mappedPhase = 'REDUCTION';
        else if (pUpper === 'FILTRATION') mappedPhase = 'FILTRATION';
        else if (pUpper === 'DISPENSING') mappedPhase = 'DISPENSING';
        else if (pUpper === 'CLEANING') mappedPhase = 'CLEANING';
        else if ((pUpper === 'READY' || pUpper === 'COMPLETE') && prev.phase !== 'CLEANING') mappedPhase = 'COMPLETE';
        else if (pUpper === 'IDLE' && prev.phase !== 'IDLE' && prev.phase !== 'READY' && prev.phase !== 'COMPLETE' && prev.phase !== 'CLEANING') {
          mappedPhase = 'IDLE';
        }

        const isDispensing = mappedPhase === 'FILTRATION' || mappedPhase === 'DISPENSING';
        const isCleaning = mappedPhase === 'CLEANING';

        return {
          ...prev,
          phase: mappedPhase,
          stage: phaseToStage(mappedPhase),
          elapsed_sec: telemetry.elapsed_sec,
          estimated_remaining_sec: Math.max(0, TOTAL_DEMO_SEC - telemetry.elapsed_sec),
          paused: telemetry.paused,
          hardwareConnected: true,
          hardwareTelemetry: telemetry,
          sensor: {
            ...prev.sensor,
            temperature_c: telemetry.temp_c,
            mass_g: telemetry.water_ml,
            water_ml: telemetry.water_ml,
            flow_rate_lpm: telemetry.flow_rate_lpm,
            flow_pulses: telemetry.flow_pulses,
            flow_sensor_ok: telemetry.flow_sensor_ok ?? true,
            target_mass_g: Math.round(telemetry.target_water_ml * 0.25),
            heater: telemetry.heater as ActuatorState,
            pump: telemetry.pump as ActuatorState,
            stirrer: telemetry.stirrer as ActuatorState,
            product_valve: isDispensing ? 'OPEN' : 'CLOSED',
            drain_valve: isCleaning ? 'OPEN' : 'CLOSED',
          },
        };
      });
    });

    return () => {
      unsubConn();
      unsubTelem();
      stopTimer();
    };
  }, [stopTimer]);

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
