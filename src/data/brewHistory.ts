import { BrewRecord } from '../types';

// Helper to generate a realistic temp+mass profile
function genProfiles(startMass: number, endMass: number, durationMin: number) {
  const tempProfile: { time: number; temp: number }[] = [];
  const massProfile: { time: number; mass: number }[] = [];
  const steps = durationMin * 2;
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * durationMin;
    const temp =
      i < steps * 0.1
        ? 25 + ((90 - 25) * i) / (steps * 0.1)
        : i < steps * 0.85
        ? 88 + Math.sin(i * 0.4) * 1.5
        : 90 - ((i - steps * 0.85) / (steps * 0.15)) * 5;
    const mass =
      i < steps * 0.15
        ? startMass
        : startMass - ((startMass - endMass) * (i - steps * 0.15)) / (steps * 0.85);
    tempProfile.push({ time: parseFloat(t.toFixed(1)), temp: parseFloat(temp.toFixed(1)) });
    massProfile.push({ time: parseFloat(t.toFixed(1)), mass: parseFloat(mass.toFixed(1)) });
  }
  return { tempProfile, massProfile };
}

const p421 = genProfiles(400, 101.8, 18.7);
const p420 = genProfiles(400, 100.4, 21.2);
const p419 = genProfiles(400, 102.1, 18.6);
const p418 = genProfiles(400, 98.3, 19.1);
const p417 = genProfiles(400, 101.2, 22.5);
const p416 = genProfiles(400, 99.8, 21.8);

export const BREW_HISTORY: BrewRecord[] = [
  {
    brew_id: '#421',
    formulation: 'Ashwagandha Kwatha',
    pod_id: 'AKW-000421',
    timestamp: new Date('2026-09-04T14:32:00'),
    water_input_ml: 400,
    final_mass_g: 101.8,
    cycle_time_min: 18,
    cycle_time_sec: 42,
    temp_profile: p421.tempProfile,
    mass_profile: p421.massProfile,
    stage_timestamps: {
      POD_DETECTED: 0,
      SOAKING: 0.5,
      EXTRACTION: 10.5,
      REDUCTION: 13.5,
      FILTRATION: 17.0,
      DISPENSING: 17.8,
      CLEANING: 18.7,
      READY: 21.0,
    },
    cleaning_completed: true,
    result: 'PASS',
    warnings: [],
  },
  {
    brew_id: '#420',
    formulation: 'Dashamoola Kwatha',
    pod_id: 'DKW-000038',
    timestamp: new Date('2026-09-04T10:15:00'),
    water_input_ml: 400,
    final_mass_g: 100.4,
    cycle_time_min: 21,
    cycle_time_sec: 10,
    temp_profile: p420.tempProfile,
    mass_profile: p420.massProfile,
    stage_timestamps: {
      POD_DETECTED: 0,
      SOAKING: 0.8,
      EXTRACTION: 15.8,
      REDUCTION: 18.8,
      FILTRATION: 20.0,
      DISPENSING: 20.5,
      CLEANING: 21.2,
      READY: 24.0,
    },
    cleaning_completed: true,
    result: 'PASS',
    warnings: [],
  },
  {
    brew_id: '#419',
    formulation: 'Ashwagandha Kwatha',
    pod_id: 'AKW-000421',
    timestamp: new Date('2026-09-03T16:05:00'),
    water_input_ml: 400,
    final_mass_g: 102.1,
    cycle_time_min: 18,
    cycle_time_sec: 35,
    temp_profile: p419.tempProfile,
    mass_profile: p419.massProfile,
    stage_timestamps: {
      POD_DETECTED: 0,
      SOAKING: 0.5,
      EXTRACTION: 10.5,
      REDUCTION: 13.5,
      FILTRATION: 16.8,
      DISPENSING: 17.5,
      CLEANING: 18.6,
      READY: 21.0,
    },
    cleaning_completed: true,
    result: 'PASS',
    warnings: [],
  },
  {
    brew_id: '#418',
    formulation: 'Triphala Kwatha',
    pod_id: 'TKW-000012',
    timestamp: new Date('2026-09-03T09:30:00'),
    water_input_ml: 400,
    final_mass_g: 98.3,
    cycle_time_min: 19,
    cycle_time_sec: 6,
    temp_profile: p418.tempProfile,
    mass_profile: p418.massProfile,
    stage_timestamps: {
      POD_DETECTED: 0,
      SOAKING: 0.4,
      EXTRACTION: 8.4,
      REDUCTION: 14.4,
      FILTRATION: 17.5,
      DISPENSING: 18.2,
      CLEANING: 19.1,
      READY: 22.0,
    },
    cleaning_completed: true,
    result: 'WARNING',
    warnings: ['Final mass 1.7% below target endpoint — temperature fluctuation detected at 14:22'],
  },
  {
    brew_id: '#417',
    formulation: 'Dashamoola Kwatha',
    pod_id: 'DKW-000038',
    timestamp: new Date('2026-09-02T15:00:00'),
    water_input_ml: 400,
    final_mass_g: 101.2,
    cycle_time_min: 22,
    cycle_time_sec: 30,
    temp_profile: p417.tempProfile,
    mass_profile: p417.massProfile,
    stage_timestamps: {
      POD_DETECTED: 0,
      SOAKING: 0.8,
      EXTRACTION: 15.8,
      REDUCTION: 18.8,
      FILTRATION: 21.0,
      DISPENSING: 21.7,
      CLEANING: 22.5,
      READY: 25.5,
    },
    cleaning_completed: true,
    result: 'PASS',
    warnings: [],
  },
  {
    brew_id: '#416',
    formulation: 'Ashwagandha Kwatha',
    pod_id: 'AKW-000421',
    timestamp: new Date('2026-09-02T11:20:00'),
    water_input_ml: 400,
    final_mass_g: 99.8,
    cycle_time_min: 21,
    cycle_time_sec: 48,
    temp_profile: p416.tempProfile,
    mass_profile: p416.massProfile,
    stage_timestamps: {
      POD_DETECTED: 0,
      SOAKING: 0.5,
      EXTRACTION: 10.5,
      REDUCTION: 13.5,
      FILTRATION: 20.0,
      DISPENSING: 20.8,
      CLEANING: 21.8,
      READY: 24.5,
    },
    cleaning_completed: false,
    result: 'WARNING',
    warnings: ['Cleaning cycle was manually skipped — service required before next brew'],
  },
];

// Traditional kwath reference data for Validation Mode
export const TRADITIONAL_REFERENCE: { time: number; temp: number; mass: number }[] = [
  { time: 0, temp: 25, mass: 400 },
  { time: 5, temp: 55, mass: 398 },
  { time: 10, temp: 82, mass: 390 },
  { time: 15, temp: 89, mass: 370 },
  { time: 20, temp: 90, mass: 340 },
  { time: 25, temp: 90, mass: 310 },
  { time: 30, temp: 90, mass: 280 },
  { time: 35, temp: 90, mass: 250 },
  { time: 40, temp: 90, mass: 210 },
  { time: 45, temp: 89, mass: 170 },
  { time: 50, temp: 88, mass: 135 },
  { time: 55, temp: 87, mass: 108 },
  { time: 58, temp: 86, mass: 100 },
];
