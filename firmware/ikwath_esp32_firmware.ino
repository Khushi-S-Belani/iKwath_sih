/*
  =============================================================================
  iKwath - Smart Automated Ayurvedic Kwatha / Decoction Machine
  ESP32 Master Controller Firmware
  =============================================================================
  Features:
  - Push Button Trigger (Single click: Start/Pause, Double click: Toggle Temp Sim)
  - Peristaltic / Sado Pump (Water intake & dispensing via 6mm pipe)
  - Hall-effect Flow Sensor (Interrupt-driven pulse counter for precise mL)
  - 2x Servos:
      * Servo 1 (GPIO 13): Decoction Stirring Agitator (oscillating sweep)
      * Servo 2 (GPIO 14): Pod Hopper / Flap Dispenser (0° - 90°)
  - DS18B20 Digital Temperature Sensor (OneWire on GPIO 19 + 4.7k pull-up)
  - Built-in Temperature Simulation Engine:
      * When active (or if no flame/lighter is present), simulates realistic
        heating curve (25°C -> 90°C) when Relay is ON.
      * Toggled via Web UI command, Push Button double click, or Keypad 'C'.
  - 5V Relay Module (Heater / Induction element on GPIO 27)
  - Active Buzzer (Audible notifications on GPIO 25)
  - Optional 4x4 Keypad (Recipe selection, Start/Stop, Diagnostics)
  - Bi-directional USB Web Serial & WiFi WebSocket JSON Communication
  =============================================================================
*/

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ESP32Servo.h>

// Set to true if you have attached the 4x4 Keypad
#define ENABLE_KEYPAD false

#if ENABLE_KEYPAD
#include <Keypad.h>
#endif

// =============================================================================
// PIN DEFINITIONS
// =============================================================================
#define PIN_BUTTON_START      4   // Push Button (Active LOW with internal pull-up)
#define PIN_FLOW_SENSOR      18   // Flow Sensor Pulse Input (Interrupt)
#define PIN_DS18B20_DATA     19   // DS18B20 Temperature Data (Needs 4.7k pullup to 3.3V)
#define PIN_SERVO_STIRRER    13   // Servo 1: Agitator Stirrer
#define PIN_SERVO_POD_FLAP   14   // Servo 2: Herbal Pod Dispenser Flap
#define PIN_BUZZER           25   // Active Buzzer Positive
#define PIN_PUMP_MOSFET      26   // Peristaltic Pump (MOSFET or Relay Ch 1)
#define PIN_HEATER_RELAY     27   // Heater Relay (Active LOW or HIGH)

// Relay Logic Configuration (Set HIGH if active HIGH, or LOW if active LOW)
#define RELAY_ACTIVE_STATE   LOW
#define RELAY_INACTIVE_STATE HIGH

// Flow Sensor Calibration: Pulses per Liter (Typical 6mm hall flow sensor: 5880 pulses/L = 5.88 pulses/mL)
#define FLOW_CALIBRATION_FACTOR 5.88f

// =============================================================================
// STATE MACHINE DEFINITION
// =============================================================================
enum MachinePhase {
  PHASE_IDLE = 0,
  PHASE_POD_DROP,
  PHASE_WATER_FILL,
  PHASE_SOAKING,
  PHASE_HEATING,
  PHASE_STIRRING,
  PHASE_REDUCTION,
  PHASE_FILTRATION,
  PHASE_DISPENSING,
  PHASE_COMPLETE,
  PHASE_CLEANING,
  PHASE_MANUAL
};

const char* PHASE_NAMES[] = {
  "IDLE",
  "POD_DETECTED",
  "WATER_FILL",
  "SOAKING",
  "HEATING",
  "STIRRING",
  "REDUCTION",
  "FILTRATION",
  "DISPENSING",
  "READY",
  "CLEANING",
  "MANUAL"
};

// =============================================================================
// GLOBAL OBJECTS & VARIABLES
// =============================================================================
OneWire oneWire(PIN_DS18B20_DATA);
DallasTemperature ds18b20(&oneWire);

Servo servoStirrer;
Servo servoPodFlap;

// State Machine Variables
MachinePhase currentPhase = PHASE_IDLE;
bool isPaused = false;
bool tempSimulationMode = false; // Set true to simulate heating if no lighter available
unsigned long phaseStartTime = 0;
unsigned long cycleStartTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastTempReadTime = 0;
unsigned long lastStirTime = 0;

// Recipe / Target Parameters
float targetWaterVolumeMl = 400.0f;
float targetExtractionTemp = 90.0f;
float targetReductionMl = 100.0f;
unsigned long targetSoakTimeSec = 10;
unsigned long targetExtractionTimeSec = 15;
unsigned long targetReductionTimeSec = 18;

// Live Sensor Readings
volatile unsigned long flowPulseCount = 0;
float currentWaterMl = 0.0f;
float currentTempC = 25.0f;
float simulatedTempC = 25.0f;
bool ds18b20Found = false;

// Stirrer Servo Control
int stirrerAngle = 30;
int stirrerDirection = 5;
bool stirrerActive = false;

// Button Debounce
int lastButtonState = HIGH;
unsigned long lastButtonPressTime = 0;
unsigned long buttonPressCount = 0;

// Keypad Configuration (Optional)
#if ENABLE_KEYPAD
const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {32, 33, 23, 22};
byte colPins[COLS] = {21, 15, 2, 5};
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);
#endif

// =============================================================================
// INTERRUPT SERVICE ROUTINE FOR FLOW SENSOR
// =============================================================================
void IRAM_ATTR flowPulseISR() {
  flowPulseCount++;
}

// =============================================================================
// BUZZER FUNCTIONS
// =============================================================================
void beep(int durationMs, int count = 1, int pauseMs = 80) {
  for (int i = 0; i < count; i++) {
    digitalWrite(PIN_BUZZER, HIGH);
    delay(durationMs);
    digitalWrite(PIN_BUZZER, LOW);
    if (i < count - 1) delay(pauseMs);
  }
}

// =============================================================================
// ACTUATOR DRIVER FUNCTIONS
// =============================================================================
void setPump(bool on) {
  digitalWrite(PIN_PUMP_MOSFET, on ? HIGH : LOW);
}

void setHeater(bool on) {
  digitalWrite(PIN_HEATER_RELAY, on ? RELAY_ACTIVE_STATE : RELAY_INACTIVE_STATE);
}

void setPodFlap(int angle) {
  servoPodFlap.write(constrain(angle, 0, 180));
}

void resetAllActuators() {
  setPump(false);
  setHeater(false);
  stirrerActive = false;
  servoStirrer.write(30);
  setPodFlap(0);
}

// =============================================================================
// TEMPERATURE READING & SIMULATION ENGINE
// =============================================================================
void updateTemperature() {
  unsigned long now = millis();
  if (now - lastTempReadTime < 500) return;
  lastTempReadTime = now;

  // 1. Read physical DS18B20 sensor
  if (ds18b20Found) {
    ds18b20.requestTemperatures();
    float t = ds18b20.getTempCByIndex(0);
    if (t > -55.0f && t < 125.0f) {
      currentTempC = t;
    }
  }

  // 2. Dynamic Thermal Simulation Engine (Realistic heating & cooling curve)
  bool heaterIsOn = (digitalRead(PIN_HEATER_RELAY) == RELAY_ACTIVE_STATE);
  if (heaterIsOn) {
    // Heating rate: rises smoothly towards 96°C
    if (simulatedTempC < 96.0f) {
      simulatedTempC += (0.8f + (rand() % 10) * 0.04f);
    }
  } else {
    // Cooling rate: slowly drops towards ambient 25°C
    if (simulatedTempC > 25.5f) {
      simulatedTempC -= 0.3f;
    }
  }

  // If simulation mode is active or no sensor found, use simulated temperature
  if (tempSimulationMode || !ds18b20Found) {
    currentTempC = simulatedTempC;
  }
}

// =============================================================================
// SERVO STIRRER SWEEP TASK (Non-blocking)
// =============================================================================
void updateStirrer() {
  if (!stirrerActive) return;
  unsigned long now = millis();
  if (now - lastStirTime < 40) return; // 40ms interval per step
  lastStirTime = now;

  stirrerAngle += stirrerDirection;
  if (stirrerAngle >= 150) {
    stirrerAngle = 150;
    stirrerDirection = -5;
  } else if (stirrerAngle <= 30) {
    stirrerAngle = 30;
    stirrerDirection = 5;
  }
  servoStirrer.write(stirrerAngle);
}

// =============================================================================
// TELEMETRY BROADCAST (JSON over USB Serial)
// =============================================================================
void sendTelemetry() {
  currentWaterMl = flowPulseCount / FLOW_CALIBRATION_FACTOR;

  bool heaterOn = (digitalRead(PIN_HEATER_RELAY) == RELAY_ACTIVE_STATE);
  bool pumpOn   = (digitalRead(PIN_PUMP_MOSFET) == HIGH);

  unsigned long elapsedSec = (currentPhase != PHASE_IDLE) ? ((millis() - cycleStartTime) / 1000) : 0;

  Serial.print("{\"type\":\"telemetry\"");
  Serial.print(",\"phase\":\""); Serial.print(PHASE_NAMES[currentPhase]); Serial.print("\"");
  Serial.print(",\"temp_c\":"); Serial.print(currentTempC, 1);
  Serial.print(",\"sim_mode\":"); Serial.print(tempSimulationMode ? "true" : "false");
  Serial.print(",\"water_ml\":"); Serial.print(currentWaterMl, 1);
  Serial.print(",\"target_water_ml\":"); Serial.print(targetWaterVolumeMl, 0);
  Serial.print(",\"heater\":"); Serial.print(heaterOn ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"pump\":"); Serial.print(pumpOn ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"stirrer\":"); Serial.print(stirrerActive ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"stirrer_deg\":"); Serial.print(stirrerAngle);
  Serial.print(",\"elapsed_sec\":"); Serial.print(elapsedSec);
  Serial.print(",\"paused\":"); Serial.print(isPaused ? "true" : "false");
  Serial.println("}");
}

// =============================================================================
// DECOCTION PROCESS CONTROL
// =============================================================================
void setPhase(MachinePhase nextPhase) {
  currentPhase = nextPhase;
  phaseStartTime = millis();

  switch (nextPhase) {
    case PHASE_IDLE:
      resetAllActuators();
      beep(150);
      break;

    case PHASE_POD_DROP:
      // Drop herbal pod: rotate servo 2 to 90 degrees
      setPodFlap(90);
      beep(80, 2);
      break;

    case PHASE_WATER_FILL:
      setPodFlap(0); // Close pod flap
      flowPulseCount = 0; // Reset water measurement
      setPump(true);
      setHeater(false);
      stirrerActive = false;
      beep(100);
      break;

    case PHASE_SOAKING:
      setPump(false);
      setHeater(true); // Gentle soak heating
      stirrerActive = false;
      beep(80);
      break;

    case PHASE_HEATING:
      setHeater(true); // Full boiling induction
      stirrerActive = false;
      beep(80);
      break;

    case PHASE_STIRRING:
      setHeater(true);
      stirrerActive = true; // Oscillating decoction agitation
      beep(100, 2);
      break;

    case PHASE_REDUCTION:
      setHeater(true);
      stirrerActive = true;
      break;

    case PHASE_FILTRATION:
      setHeater(false);
      stirrerActive = false;
      servoStirrer.write(30);
      setPump(true); // Pump through SS316 filter
      beep(120);
      break;

    case PHASE_DISPENSING:
      setPump(true);
      break;

    case PHASE_COMPLETE:
      resetAllActuators();
      beep(300, 3, 150); // Completion fanfare
      break;

    case PHASE_CLEANING:
      setHeater(false);
      stirrerActive = true;
      setPump(true);
      beep(100);
      break;

    case PHASE_MANUAL:
      break;
  }
}

void startBrewProcess() {
  cycleStartTime = millis();
  simulatedTempC = 25.0f;
  flowPulseCount = 0;
  isPaused = false;
  setPhase(PHASE_POD_DROP);
}

void stopBrewProcess() {
  setPhase(PHASE_IDLE);
}

// =============================================================================
// MAIN DECOCTION STATE MACHINE
// =============================================================================
void runStateMachine() {
  if (isPaused || currentPhase == PHASE_IDLE || currentPhase == PHASE_MANUAL) {
    return;
  }

  unsigned long elapsedInPhase = (millis() - phaseStartTime) / 1000;
  currentWaterMl = flowPulseCount / FLOW_CALIBRATION_FACTOR;

  switch (currentPhase) {
    case PHASE_POD_DROP:
      if (elapsedInPhase >= 3) {
        setPhase(PHASE_WATER_FILL);
      }
      break;

    case PHASE_WATER_FILL:
      // Fill until flow sensor reaches target mL or safety timeout
      if (currentWaterMl >= targetWaterVolumeMl || elapsedInPhase >= 30) {
        setPhase(PHASE_SOAKING);
      }
      break;

    case PHASE_SOAKING:
      if (elapsedInPhase >= targetSoakTimeSec) {
        setPhase(PHASE_HEATING);
      }
      break;

    case PHASE_HEATING:
      // Advance when temperature reaches extraction threshold or timeout
      if (currentTempC >= (targetExtractionTemp - 5.0f) || elapsedInPhase >= 20) {
        setPhase(PHASE_STIRRING);
      }
      break;

    case PHASE_STIRRING:
      if (elapsedInPhase >= targetExtractionTimeSec) {
        setPhase(PHASE_REDUCTION);
      }
      break;

    case PHASE_REDUCTION:
      if (elapsedInPhase >= targetReductionTimeSec) {
        setPhase(PHASE_FILTRATION);
      }
      break;

    case PHASE_FILTRATION:
      if (elapsedInPhase >= 8) {
        setPhase(PHASE_DISPENSING);
      }
      break;

    case PHASE_DISPENSING:
      if (elapsedInPhase >= 6) {
        setPhase(PHASE_COMPLETE);
      }
      break;

    case PHASE_COMPLETE:
      // Stay in complete until user resets or starts new
      break;

    case PHASE_CLEANING:
      if (elapsedInPhase >= 10) {
        setPhase(PHASE_IDLE);
      }
      break;

    default:
      break;
  }
}

// =============================================================================
// PHYSICAL PUSH BUTTON HANDLER
// =============================================================================
void handlePushButton() {
  int reading = digitalRead(PIN_BUTTON_START);
  unsigned long now = millis();

  // Detect falling edge (Button Pressed down)
  if (reading == LOW && lastButtonState == HIGH && (now - lastButtonPressTime > 200)) {
    lastButtonPressTime = now;
    buttonPressCount++;

    // Single click: Start brew if idle, or Toggle Pause
    if (currentPhase == PHASE_IDLE) {
      startBrewProcess();
    } else if (currentPhase == PHASE_COMPLETE) {
      setPhase(PHASE_IDLE);
    } else {
      isPaused = !isPaused;
      beep(80, isPaused ? 2 : 1);
    }
  }

  // Detect double click to toggle Temperature Simulation Mode
  // If button was pressed twice within 600ms
  static unsigned long lastClickWindow = 0;
  static int clickSeq = 0;
  if (reading == LOW && lastButtonState == HIGH && (now - lastButtonPressTime <= 600)) {
    clickSeq++;
    if (clickSeq >= 2) {
      tempSimulationMode = !tempSimulationMode;
      beep(200, 3, 50); // Feedback beep for mode toggle
      clickSeq = 0;
    }
  }
  if (now - lastButtonPressTime > 600) {
    clickSeq = 0;
  }

  lastButtonState = reading;
}

// =============================================================================
// KEYPAD HANDLER (Optional)
// =============================================================================
#if ENABLE_KEYPAD
void handleKeypad() {
  char key = keypad.getKey();
  if (!key) return;

  beep(40);
  switch (key) {
    case '*': // START / PAUSE
      if (currentPhase == PHASE_IDLE) startBrewProcess();
      else isPaused = !isPaused;
      break;
    case '#': // STOP / RESET
      stopBrewProcess();
      break;
    case 'A': // PUMP TEST
      digitalWrite(PIN_PUMP_MOSFET, !digitalRead(PIN_PUMP_MOSFET));
      break;
    case 'B': // STIRRER TEST
      stirrerActive = !stirrerActive;
      break;
    case 'C': // TOGGLE TEMP SIMULATION
      tempSimulationMode = !tempSimulationMode;
      beep(150, 2);
      break;
    case 'D': // CLEANING CYCLE
      setPhase(PHASE_CLEANING);
      break;
    case '1': targetWaterVolumeMl = 400.0f; targetExtractionTemp = 90.0f; break;
    case '2': targetWaterVolumeMl = 350.0f; targetExtractionTemp = 88.0f; break;
    case '3': targetWaterVolumeMl = 450.0f; targetExtractionTemp = 92.0f; break;
    default: break;
  }
}
#endif

// =============================================================================
// SERIAL COMMAND PARSER (Receives JSON / text commands from React Web UI)
// =============================================================================
void handleSerialCommands() {
  if (!Serial.available()) return;

  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  // Quick text commands or JSON parser
  if (line.indexOf("\"cmd\":\"start\"") >= 0 || line.equalsIgnoreCase("START")) {
    startBrewProcess();
  } else if (line.indexOf("\"cmd\":\"stop\"") >= 0 || line.equalsIgnoreCase("STOP")) {
    stopBrewProcess();
  } else if (line.indexOf("\"cmd\":\"pause\"") >= 0 || line.equalsIgnoreCase("PAUSE")) {
    isPaused = true;
  } else if (line.indexOf("\"cmd\":\"resume\"") >= 0 || line.equalsIgnoreCase("RESUME")) {
    isPaused = false;
  } else if (line.indexOf("\"cmd\":\"clean\"") >= 0 || line.equalsIgnoreCase("CLEAN")) {
    setPhase(PHASE_CLEANING);
  } else if (line.indexOf("\"cmd\":\"toggle_sim\"") >= 0 || line.equalsIgnoreCase("TOGGLE_SIM")) {
    tempSimulationMode = !tempSimulationMode;
    beep(100, 2);
  } else if (line.indexOf("\"cmd\":\"test_pump\"") >= 0) {
    bool state = (digitalRead(PIN_PUMP_MOSFET) == LOW);
    setPump(state);
  } else if (line.indexOf("\"cmd\":\"test_stirrer\"") >= 0) {
    stirrerActive = !stirrerActive;
  } else if (line.indexOf("\"cmd\":\"test_pod\"") >= 0) {
    setPodFlap(90);
    delay(1000);
    setPodFlap(0);
  } else if (line.indexOf("\"cmd\":\"test_relay\"") >= 0) {
    bool cur = (digitalRead(PIN_HEATER_RELAY) == RELAY_ACTIVE_STATE);
    setHeater(!cur);
  } else if (line.indexOf("\"cmd\":\"test_buzzer\"") >= 0) {
    beep(150, 2);
  } else if (line.indexOf("\"set_water\":") >= 0) {
    int idx = line.indexOf("\"set_water\":") + 12;
    float w = line.substring(idx).toFloat();
    if (w > 10) targetWaterVolumeMl = w;
  }
}

// =============================================================================
// SETUP
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n\n================================================");
  Serial.println("  iKwath Decoction Machine - ESP32 Controller  ");
  Serial.println("================================================");

  // Configure GPIO Modes
  pinMode(PIN_BUTTON_START, INPUT_PULLUP);
  pinMode(PIN_FLOW_SENSOR, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_PUMP_MOSFET, OUTPUT);
  pinMode(PIN_HEATER_RELAY, OUTPUT);

  // Initial Pin States
  digitalWrite(PIN_BUZZER, LOW);
  digitalWrite(PIN_PUMP_MOSFET, LOW);
  digitalWrite(PIN_HEATER_RELAY, RELAY_INACTIVE_STATE);

  // Attach Flow Sensor Interrupt
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_SENSOR), flowPulseISR, RISING);

  // Initialize Servos
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  servoStirrer.setPeriodHertz(50);
  servoStirrer.attach(PIN_SERVO_STIRRER, 500, 2400);
  servoStirrer.write(30);

  servoPodFlap.setPeriodHertz(50);
  servoPodFlap.attach(PIN_SERVO_POD_FLAP, 500, 2400);
  servoPodFlap.write(0);

  // Initialize DS18B20 Temp Sensor
  ds18b20.begin();
  int deviceCount = ds18b20.getDeviceCount();
  if (deviceCount > 0) {
    ds18b20Found = true;
    ds18b20.setResolution(10); // 10-bit resolution (~187ms conversion)
    Serial.printf("[SENSOR] DS18B20 found: %d sensor(s)\n", deviceCount);
  } else {
    ds18b20Found = false;
    tempSimulationMode = true; // Auto-fallback to simulation mode if not wired yet
    Serial.println("[SENSOR] DS18B20 not detected -> Temperature Simulation Mode AUTO-ENABLED.");
  }

  // Welcome Beep
  beep(100, 2, 80);
  Serial.println("[SYSTEM] iKwath ESP32 Controller Ready. 115200 Baud.");
}

// =============================================================================
// MAIN LOOP
// =============================================================================
void loop() {
  handlePushButton();
  handleSerialCommands();
#if ENABLE_KEYPAD
  handleKeypad();
#endif

  updateTemperature();
  updateStirrer();
  runStateMachine();

  // Send periodic JSON telemetry packet every 500ms
  unsigned long now = millis();
  if (now - lastTelemetryTime >= 500) {
    lastTelemetryTime = now;
    sendTelemetry();
  }
}
