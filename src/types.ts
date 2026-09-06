// ─── Machine Modes ────────────────────────────────────────────────────────────
export type MachineMode = 'user' | 'technician' | 'research';

// ─── Navigation Sections ──────────────────────────────────────────────────────
export type NavSection =
  | 'home'
  | 'formulations'
  | 'pod'
  | 'brew-confirm'
  | 'water-fill'
  | 'live-brew'
  | 'reduction'
  | 'filtration'
  | 'brew-passport'
  | 'cleaning'
  | 'history'
  | 'validation'
  | 'technician'
  | 'research';

// ─── Brew Stages ─────────────────────────────────────────────────────────────
export type BrewStage =
  | 'POD_DETECTED'
  | 'WATER_FILL'
  | 'SOAKING'
  | 'HEATING'
  | 'STIRRING'
  | 'REDUCTION'
  | 'FILTRATION'
  | 'DISPENSING'
  | 'CLEANING'
  | 'READY';

// ─── Machine Status ───────────────────────────────────────────────────────────
export type MachineStatus = 'READY' | 'BUSY' | 'CLEANING' | 'ATTENTION' | 'OFFLINE' | 'FAULT';

// ─── Pod States ───────────────────────────────────────────────────────────────
export type PodState = 'IDLE' | 'SCANNING' | 'DETECTED' | 'INVALID' | 'READ_FAILED';

// ─── Actuator States ─────────────────────────────────────────────────────────
export type ActuatorState = 'OFF' | 'ACTIVE' | 'FAULT';
export type ValveState = 'OPEN' | 'CLOSED';
export type SensorState = 'CONNECTED' | 'FAULT' | 'CALIBRATION_REQUIRED';

// ─── Alert Severity ───────────────────────────────────────────────────────────
export type AlertSeverity = 'INFO' | 'WARNING' | 'STOP' | 'SERVICE';

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  action: string;
  timestamp: Date;
}

// ─── Sensor Data ─────────────────────────────────────────────────────────────
export interface SensorData {
  temperature_c: number;
  mass_g: number;
  target_mass_g: number;
  heater: ActuatorState;
  stirrer: ActuatorState;
  pump: ActuatorState;
  product_valve: ValveState;
  drain_valve: ValveState;
  cleaning_required: boolean;
}

// ─── Brew Record / Passport ───────────────────────────────────────────────────
export type BrewResult = 'PASS' | 'WARNING' | 'FAILED';

export interface BrewRecord {
  brew_id: string;
  formulation: string;
  pod_id: string;
  timestamp: Date;
  water_input_ml: number;
  final_mass_g: number;
  cycle_time_min: number;
  cycle_time_sec: number;
  temp_profile: { time: number; temp: number }[];
  mass_profile: { time: number; mass: number }[];
  stage_timestamps: Record<BrewStage, number>;
  cleaning_completed: boolean;
  result: BrewResult;
  warnings: string[];
}

// ─── Formulation Profile ─────────────────────────────────────────────────────
export interface FormulationProfile {
  id: string;
  pod_id: string;
  name: string;
  profile_revision: string;
  status: 'ACTIVE' | 'DRAFT' | 'DEPRECATED';
  validated: boolean;
  usage_count: number;
  water_ml: number;
  target_reduction_ml: number;
  soak_time_min: number;
  extraction_temp_c: number;
  extraction_time_min: number;
  reduction_endpoint_g: number;
  stirrer_rpm: number;
  description: string;
  herbs: string[];
  category: string;
  tag: string;
}

// ─── Legacy Recipe (backward compat) ─────────────────────────────────────────
export interface KwathaRecipe {
  id: string;
  name: string;
  tag: string;
  category: string;
  afiCode: string;
  yavakutaCurana: string[];
  coarsePowderDose?: string;
  waterQuantityMl: number | string;
  reductionTargetMl: number | string;
  boilTempRange: string;
  prepTimeMin: number | string;
  servingTemp: string;
  consistencyScore: number;
}

// ─── Subsystem Health (Technician) ────────────────────────────────────────────
export interface SubsystemStatus {
  name: string;
  state: SensorState | ActuatorState | ValveState | 'ONLINE' | 'CONNECTED' | 'LOST';
  last_checked: Date;
  notes?: string;
}

// ─── Research Analytics ───────────────────────────────────────────────────────
export interface AnalyticsCard {
  id: string;
  title: string;
  value: string;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
}

export type ScreenIndex = 0 | 1 | 2 | 3;
