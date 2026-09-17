/*
  =============================================================================
  iKwath - Smart Automated Ayurvedic Kwatha / Decoction Machine
  ESP32 Master Controller Firmware (v3.0 - Dedicated DHT11 Sensor Edition)
  =============================================================================
  Pinout Mapping:
  - GPIO 2:  Onboard Blue LED (Solid ON when connected / running)
  - GPIO 4:  Push Button (Active LOW with internal pull-up)
  - GPIO 13: Stirrer Servo 1 (Agitator sweep 30° ↔ 150°)
  - GPIO 14: Pod Flap Servo 2 (0° closed ↔ 90° open)
  - GPIO 15: DHT11 Sensor Data (Temperature & Humidity)
  - GPIO 18: Hall Flow Sensor (Interrupt)
  - GPIO 25: Active Buzzer (KY-012 active buzzer)
  - GPIO 26: Peristaltic / Sado Water Pump MOSFET
  - GPIO 27: Heater Relay (5V load)
  
  4x4 Keypad Matrix Pinout (Conflict-Free):
  - Row 1: GPIO 32
  - Row 2: GPIO 33
  - Row 3: GPIO 23
  - Row 4: GPIO 22
  - Col 1: GPIO 21
  - Col 2: GPIO 17
  - Col 3: GPIO 16
  - Col 4: GPIO 5
  =============================================================================
*/

#include <Arduino.h>
#include <ESP32Servo.h>
#include <Keypad.h>

#define ENABLE_KEYPAD true

// =============================================================================
// PIN DEFINITIONS
// =============================================================================
#define PIN_LED_BUILTIN       2   // Onboard Blue LED
#define PIN_BUTTON_START      4   // Push Button (Active LOW with internal pull-up)
#define PIN_FLOW_SENSOR      18   // Flow Sensor Pulse Input (Interrupt)
#define PIN_DHT_DATA         15   // DHT11 Data Pin (GPIO 15 - Adjacent to GND & 3V3)
#define PIN_SERVO_STIRRER    13   // Servo 1: Agitator Stirrer
#define PIN_SERVO_POD_FLAP   14   // Servo 2: Herbal Pod Dispenser Flap
#define PIN_BUZZER           25   // Active Buzzer Positive
#define PIN_PUMP_MOSFET      26   // Peristaltic Pump
#define PIN_HEATER_RELAY     27   // Heater Relay

// Flow Sensor Calibration (Pulses per mL)
#define FLOW_CALIBRATION_FACTOR 5.88f

// =============================================================================
// 4x4 KEYPAD MATRIX CONFIGURATION
// =============================================================================
const byte ROWS = 4;
const byte COLS = 4;
char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};
byte rowPins[ROWS] = {32, 33, 23, 22}; // R1, R2, R3, R4
byte colPins[COLS] = {21, 17, 16, 5};  // C1, C2, C3, C4
Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

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
// STANDALONE ZERO-DEPENDENCY DHT11 SENSOR CLASS (No external libraries required!)
// =============================================================================
class SimpleDHT11 {
private:
  uint8_t _pin;
public:
  SimpleDHT11(uint8_t pin) : _pin(pin) {}

  void begin() {
    pinMode(_pin, INPUT_PULLUP);
  }

  bool read(float &tempC, float &humidity) {
    uint8_t data[5] = {0, 0, 0, 0, 0};

    // 1. Send Start Signal to DHT11 (Hold LOW for 20ms)
    pinMode(_pin, OUTPUT);
    digitalWrite(_pin, LOW);
    delay(20);
    digitalWrite(_pin, HIGH);
    delayMicroseconds(30);
    pinMode(_pin, INPUT_PULLUP);

    // 2. Wait for DHT11 Response (80µs LOW, then 80µs HIGH)
    unsigned long timeout = micros();
    while (digitalRead(_pin) == HIGH) {
      if (micros() - timeout > 120) return false;
    }
    timeout = micros();
    while (digitalRead(_pin) == LOW) {
      if (micros() - timeout > 120) return false;
    }
    timeout = micros();
    while (digitalRead(_pin) == HIGH) {
      if (micros() - timeout > 120) return false;
    }

    // 3. Read 40 Data Bits (5 Bytes)
    for (int i = 0; i < 40; i++) {
      timeout = micros();
      while (digitalRead(_pin) == LOW) {
        if (micros() - timeout > 120) return false;
      }

      unsigned long pulseStart = micros();
      while (digitalRead(_pin) == HIGH) {
        if (micros() - pulseStart > 120) return false;
      }
      unsigned long pulseLen = micros() - pulseStart;

      // Pulse > 40µs represents bit '1', else '0'
      if (pulseLen > 40) {
        data[i / 8] |= (1 << (7 - (i % 8)));
      }
    }

    // 4. Checksum Verification
    uint8_t checksum = (data[0] + data[1] + data[2] + data[3]) & 0xFF;
    if (data[4] != checksum || (data[0] == 0 && data[2] == 0)) {
      return false;
    }

    humidity = (float)data[0] + ((float)data[1] * 0.1f);
    tempC = (float)data[2] + ((float)data[3] * 0.1f);
    return true;
  }
};

// =============================================================================
// GLOBAL OBJECTS & VARIABLES
// =============================================================================
SimpleDHT11 dht(PIN_DHT_DATA);

Servo servoStirrer;
Servo servoPodFlap;

MachinePhase currentPhase = PHASE_IDLE;
bool isPaused = false;
bool tempSimulationMode = false;
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

// Flow Sensor Variables & Calibration
float flowCalibrationFactor = 5.88f; // Default ~5.88 pulses/mL (YF-S401 / YF-S201 6mm ID)
volatile unsigned long flowPulseCount = 0;
unsigned long lastFlowCalcTime = 0;
unsigned long lastCalculatedPulses = 0;
float currentWaterMl = 0.0f;
float flowRateLpm = 0.0f;

// Live Sensor Readings (DHT11)
float currentTempC = 25.0f;
float currentHumidity = 50.0f;
float simulatedTempC = 25.0f;
bool dhtFound = false;

// Polarity Settings (Supports 2PH63091A Active-LOW Relay & Active-HIGH modules)
bool relayActiveLow = true;     // 2PH63091A Relay 1 (Heater - GPIO 27) Active LOW
bool pumpActiveLow = true;      // 2PH63091A Relay 2 (Pump - GPIO 26) Active LOW
bool buzzerActiveLow = false;   // Standard active buzzers trigger on HIGH (HIGH = sound)

// Actuator States
bool relayState = false;
bool buzzerState = false;
bool pumpState = false;
bool stirrerActive = false;
int stirrerAngle = 30;
int stirrerDirection = 5;
int currentPodAngle = 0;

// Button Debounce
int lastButtonState = HIGH;
unsigned long lastButtonPressTime = 0;

// Forward Declarations
void sendTelemetry();

// =============================================================================
// INTERRUPT SERVICE ROUTINE FOR FLOW SENSOR (Hall Effect Sensor on GPIO 18)
// =============================================================================
void IRAM_ATTR flowPulseISR() {
  flowPulseCount++;
}

// =============================================================================
// BUZZER FUNCTIONS (Universal Active & Passive Buzzer Driver)
// =============================================================================
bool toneActive = false;

void setBuzzer(bool on) {
  buzzerState = on;
  if (on) {
    toneActive = true;
    tone(PIN_BUZZER, 2400); // 2.4kHz acoustic square wave
    digitalWrite(PIN_BUZZER, buzzerActiveLow ? LOW : HIGH);
  } else {
    if (toneActive) {
      noTone(PIN_BUZZER);
      toneActive = false;
    }
    digitalWrite(PIN_BUZZER, buzzerActiveLow ? HIGH : LOW);
  }
}

void beep(int durationMs, int count = 1, int pauseMs = 80) {
  for (int i = 0; i < count; i++) {
    setBuzzer(true);
    delay(durationMs);
    setBuzzer(false);
    if (i < count - 1) delay(pauseMs);
  }
}

// =============================================================================
// ACTUATOR DRIVER FUNCTIONS (2PH63091A Dual Relay & Servo Drivers)
// =============================================================================
void setPump(bool on) {
  pumpState = on;
  if (pumpActiveLow) {
    digitalWrite(PIN_PUMP_MOSFET, on ? LOW : HIGH);
  } else {
    digitalWrite(PIN_PUMP_MOSFET, on ? HIGH : LOW);
  }
}

void setHeater(bool on) {
  relayState = on;
  if (relayActiveLow) {
    digitalWrite(PIN_HEATER_RELAY, on ? LOW : HIGH);
  } else {
    digitalWrite(PIN_HEATER_RELAY, on ? HIGH : LOW);
  }
}

void setPodFlap(int angle) {
  currentPodAngle = constrain(angle, 0, 180);
  servoPodFlap.write(currentPodAngle);
}

void setStirrerSweep(bool on) {
  stirrerActive = on;
  if (!on) {
    stirrerAngle = 30;
    servoStirrer.write(30);
  }
}

void resetAllActuators() {
  setPump(false);
  setHeater(false);
  setBuzzer(false);
  setStirrerSweep(false);
  setPodFlap(0);
}

// =============================================================================
// TEMPERATURE & HUMIDITY READING (DHT11 - Sampled Every 1 Second)
// =============================================================================
void updateTemperature() {
  unsigned long now = millis();
  if (now - lastTempReadTime < 1000) return; // Sampled every 1 second (1000ms)
  lastTempReadTime = now;

  float t = 0.0f;
  float h = 0.0f;
  bool success = dht.read(t, h);

  if (success && t > -20.0f && t < 80.0f) {
    currentTempC = t;
    currentHumidity = h;
    dhtFound = true;
    Serial.printf("[TEMP] 🌡️ DHT11 Live: %.1f °C (%.1f °F) | 💧 Humidity: %.1f %%\n", 
                  currentTempC, (currentTempC * 1.8f) + 32.0f, currentHumidity);
  } else {
    dhtFound = false;
    Serial.printf("[TEMP] ⚠️ DHT11 read failed! Check GPIO %d, VCC (3.3V), GND & pull-up.\n", PIN_DHT_DATA);
  }
}

// =============================================================================
// FLOW SENSOR CALCULATION & DIAGNOSTIC LOGGING (GPIO 18)
// =============================================================================
void updateFlowSensor() {
  unsigned long now = millis();
  unsigned long dt = now - lastFlowCalcTime;
  if (dt >= 400) { // Calculate flow rate every 400ms
    unsigned long totalPulses = flowPulseCount;
    unsigned long deltaPulses = (totalPulses >= lastCalculatedPulses) ? (totalPulses - lastCalculatedPulses) : 0;
    lastCalculatedPulses = totalPulses;
    lastFlowCalcTime = now;

    currentWaterMl = totalPulses / flowCalibrationFactor;

    // Instantaneous flow rate in Liters per minute
    if (dt > 0) {
      flowRateLpm = (float(deltaPulses) / flowCalibrationFactor) * (60000.0f / dt) / 1000.0f;
    }

    // Live log when water is flowing
    if (deltaPulses > 0) {
      Serial.printf("[FLOW] 💧 Live Flow: %.1f mL (Pulses: %lu, Rate: %.2f L/min)\n", currentWaterMl, totalPulses, flowRateLpm);
    }
  }
}

// =============================================================================
// SERVO STIRRER SWEEP TASK (Non-blocking)
// =============================================================================
void updateStirrer() {
  if (!stirrerActive) return;
  unsigned long now = millis();
  if (now - lastStirTime < 40) return;
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
  currentWaterMl = flowPulseCount / flowCalibrationFactor;

  unsigned long elapsedSec = (currentPhase != PHASE_IDLE) ? ((millis() - cycleStartTime) / 1000) : 0;

  Serial.print("{\"type\":\"telemetry\"");
  Serial.print(",\"phase\":\""); Serial.print(PHASE_NAMES[currentPhase]); Serial.print("\"");
  Serial.print(",\"temp_c\":"); Serial.print(currentTempC, 1);
  Serial.print(",\"humidity\":"); Serial.print(currentHumidity, 1);
  Serial.print(",\"sensor_type\":\"DHT11\"");
  Serial.print(",\"sim_mode\":"); Serial.print(tempSimulationMode ? "true" : "false");
  Serial.print(",\"water_ml\":"); Serial.print(currentWaterMl, 1);
  Serial.print(",\"flow_pulses\":"); Serial.print(flowPulseCount);
  Serial.print(",\"flow_rate_lpm\":"); Serial.print(flowRateLpm, 2);
  Serial.print(",\"flow_sensor_ok\":true");
  Serial.print(",\"target_water_ml\":"); Serial.print(targetWaterVolumeMl, 0);
  Serial.print(",\"target_temp_c\":"); Serial.print(targetExtractionTemp, 0);
  Serial.print(",\"heater\":"); Serial.print(relayState ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"relay_active_low\":"); Serial.print(relayActiveLow ? "true" : "false");
  Serial.print(",\"pump\":"); Serial.print(pumpState ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"stirrer\":"); Serial.print(stirrerActive ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"stirrer_deg\":"); Serial.print(stirrerAngle);
  Serial.print(",\"pod_deg\":"); Serial.print(currentPodAngle);
  Serial.print(",\"buzzer\":"); Serial.print(buzzerState ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"buzzer_active_low\":"); Serial.print(buzzerActiveLow ? "true" : "false");
  Serial.print(",\"elapsed_sec\":"); Serial.print(elapsedSec);
  Serial.print(",\"paused\":"); Serial.print(isPaused ? "true" : "false");
  Serial.print(",\"dht_found\":"); Serial.print(dhtFound ? "true" : "false");
  Serial.print(",\"ds18b20_found\":"); Serial.print(dhtFound ? "true" : "false");
  Serial.print(",\"temp_sensor_found\":"); Serial.print(dhtFound ? "true" : "false");
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
      setPodFlap(90);
      beep(80, 2);
      break;

    case PHASE_WATER_FILL:
      setPodFlap(0);
      flowPulseCount = 0;
      setPump(true);
      setHeater(false);
      setStirrerSweep(false);
      beep(100);
      break;

    case PHASE_SOAKING:
      setPump(false);
      setHeater(false);
      setStirrerSweep(false);
      beep(100);
      break;

    case PHASE_HEATING:
      setPump(false);
      setHeater(true);
      setStirrerSweep(false);
      beep(120);
      break;

    case PHASE_STIRRING:
      setPump(false);
      setHeater(true);
      setStirrerSweep(true);
      beep(100, 2);
      break;

    case PHASE_REDUCTION:
      setPump(false);
      setHeater(true);
      setStirrerSweep(true);
      beep(100);
      break;

    case PHASE_FILTRATION:
      setPump(false);
      setHeater(false);
      setStirrerSweep(false);
      beep(100);
      break;

    case PHASE_DISPENSING:
      setPump(true);
      setHeater(false);
      setStirrerSweep(false);
      beep(100);
      break;

    case PHASE_COMPLETE:
      resetAllActuators();
      beep(200, 3, 100); // 3 victory beeps
      break;

    case PHASE_CLEANING:
      setPump(true);
      setHeater(false);
      setStirrerSweep(true);
      beep(150, 2);
      break;

    case PHASE_MANUAL:
      // Leave actuators in their manual states
      break;
  }

  Serial.printf("[STATE] Switched to Phase: %s\n", PHASE_NAMES[currentPhase]);
  sendTelemetry();
}

void startBrewProcess() {
  cycleStartTime = millis();
  isPaused = false;
  flowPulseCount = 0;
  Serial.println("[CYCLE] Starting Ayurvedic Kwatha Decoction Cycle...");
  setPhase(PHASE_POD_DROP);
}

void stopBrewProcess() {
  Serial.println("[CYCLE] Emergency Stop / Cycle Reset Triggered.");
  setPhase(PHASE_IDLE);
}

// =============================================================================
// STATE MACHINE EXECUTION ENGINE
// =============================================================================
void runStateMachine() {
  if (currentPhase == PHASE_IDLE || currentPhase == PHASE_COMPLETE || currentPhase == PHASE_MANUAL || isPaused) {
    return;
  }

  unsigned long elapsedInPhase = (millis() - phaseStartTime) / 1000;

  switch (currentPhase) {
    case PHASE_POD_DROP:
      if (elapsedInPhase >= 3) {
        setPodFlap(0);
        setPhase(PHASE_WATER_FILL);
      }
      break;

    case PHASE_WATER_FILL:
      // Transition when target water volume is reached or timeout after 25s
      if (currentWaterMl >= targetWaterVolumeMl || elapsedInPhase >= 25) {
        setPump(false);
        setPhase(PHASE_SOAKING);
      }
      break;

    case PHASE_SOAKING:
      if (elapsedInPhase >= targetSoakTimeSec) {
        setPhase(PHASE_HEATING);
      }
      break;

    case PHASE_HEATING:
      // Transition when target temperature is reached or max heating timeout (20s)
      if (currentTempC >= (targetExtractionTemp - 4.0f) || elapsedInPhase >= 20) {
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
      if (elapsedInPhase >= 6) {
        setPhase(PHASE_DISPENSING);
      }
      break;

    case PHASE_DISPENSING:
      if (elapsedInPhase >= 8) {
        setPump(false);
        setPhase(PHASE_COMPLETE);
      }
      break;

    case PHASE_CLEANING:
      if (elapsedInPhase >= 12) {
        resetAllActuators();
        setPhase(PHASE_IDLE);
      }
      break;

    default:
      break;
  }
}

// =============================================================================
// PHYSICAL PUSH BUTTON HANDLER (Multi-function: Click / Double-Click / Long-Press)
// =============================================================================
void handlePushButton() {
  int reading = digitalRead(PIN_BUTTON_START);
  unsigned long now = millis();

  // Button Pressed (Transition from HIGH to LOW)
  if (reading == LOW && lastButtonState == HIGH && (now - lastButtonPressTime > 200)) {
    lastButtonPressTime = now;

    if (currentPhase == PHASE_IDLE) {
      startBrewProcess();
    } else if (currentPhase == PHASE_COMPLETE) {
      setPhase(PHASE_IDLE);
    } else {
      // Pause / Resume Toggle
      isPaused = !isPaused;
      beep(80, isPaused ? 2 : 1);
      Serial.printf("[BUTTON] Cycle %s\n", isPaused ? "PAUSED" : "RESUMED");
      sendTelemetry();
    }
  }
  lastButtonState = reading;
}

// =============================================================================
// 4x4 KEYPAD MATRIX HANDLER
// =============================================================================
void handleKeypad() {
#if ENABLE_KEYPAD
  char key = keypad.getKey();
  if (key != NO_KEY) {
    beep(50);
    Serial.printf("{\"type\":\"keypad\",\"key\":\"%c\"}\n", key);

    switch (key) {
      case 'A': // Start Decoction Cycle
        if (currentPhase == PHASE_IDLE) startBrewProcess();
        break;
      case 'B': // Pause / Resume
        isPaused = !isPaused;
        beep(70, isPaused ? 2 : 1);
        sendTelemetry();
        break;
      case 'C': // Cleaning Routine
        setPhase(PHASE_CLEANING);
        break;
      case 'D': // Emergency Stop
        stopBrewProcess();
        break;
      case '*': // Toggle Pump
        setPump(!pumpState);
        sendTelemetry();
        break;
      case '#': // Toggle Heater
        setHeater(!relayState);
        sendTelemetry();
        break;
      case '1': // Target 100 mL
        targetWaterVolumeMl = 100.0f;
        beep(60);
        sendTelemetry();
        break;
      case '2': // Target 200 mL
        targetWaterVolumeMl = 200.0f;
        beep(60);
        sendTelemetry();
        break;
      case '3': // Target 400 mL
        targetWaterVolumeMl = 400.0f;
        beep(60);
        sendTelemetry();
        break;
      default:
        break;
    }
  }
#endif
}

// =============================================================================
// SERIAL COMMAND INTERPRETER (JSON & Plaintext Commands from Web App)
// =============================================================================
void handleSerialCommands() {
  if (!Serial.available()) return;

  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  // 1. Handshake / Ping
  if (line.indexOf("ping") >= 0 || line.equalsIgnoreCase("PING")) {
    Serial.println("{\"type\":\"pong\",\"status\":\"connected\",\"led\":\"ON\",\"device\":\"iKwath ESP32\",\"sensor\":\"DHT11\"}");
    sendTelemetry();
  }
  // 2. Sync Recipe Parameters
  else if (line.indexOf("sync_recipe") >= 0) {
    Serial.printf("{\"ack\":\"sync_recipe\",\"target_water_ml\":%.0f,\"target_temp_c\":%.0f}\n", targetWaterVolumeMl, targetExtractionTemp);
    sendTelemetry();
  }
  // 3. Automated Brew Start
  else if (line.indexOf("\"cmd\":\"start\"") >= 0 || line.equalsIgnoreCase("START")) {
    beep(100);
    startBrewProcess();
    Serial.printf("{\"ack\":\"start\",\"target_water_ml\":%.0f,\"target_temp_c\":%.0f}\n", targetWaterVolumeMl, targetExtractionTemp);
  } 
  // 4. Emergency Stop
  else if (line.indexOf("stop") >= 0 || line.equalsIgnoreCase("STOP")) {
    stopBrewProcess();
    Serial.println("{\"ack\":\"stop\"}");
  } 
  // 5. Pause / Resume Toggle
  else if (line.indexOf("pause") >= 0 || line.equalsIgnoreCase("PAUSE")) {
    isPaused = !isPaused;
    beep(70, isPaused ? 2 : 1);
    Serial.printf("{\"ack\":\"pause\",\"paused\":%s}\n", isPaused ? "true" : "false");
    sendTelemetry();
  } 
  // 6. Cleaning Routine
  else if (line.indexOf("clean") >= 0 || line.equalsIgnoreCase("CLEAN")) {
    setPhase(PHASE_CLEANING);
    Serial.println("{\"ack\":\"clean\"}");
  } 
  // 7. Temperature Simulation Toggle
  else if (line.indexOf("toggle_sim") >= 0 || line.equalsIgnoreCase("TOGGLE_SIM")) {
    tempSimulationMode = !tempSimulationMode;
    beep(120, 2);
    Serial.printf("{\"ack\":\"toggle_sim\",\"sim_mode\":%s}\n", tempSimulationMode ? "true" : "false");
    sendTelemetry();
  } 
  // 8. PUMP CONTROLS
  else if (line.indexOf("pump_on") >= 0 || line.equalsIgnoreCase("PUMP_ON")) {
    setPump(true);
    Serial.println("{\"ack\":\"pump_on\",\"pump\":\"ACTIVE\"}");
    sendTelemetry();
  } else if (line.indexOf("pump_off") >= 0 || line.equalsIgnoreCase("PUMP_OFF")) {
    setPump(false);
    Serial.println("{\"ack\":\"pump_off\",\"pump\":\"OFF\"}");
    sendTelemetry();
  } else if (line.indexOf("test_pump") >= 0 || line.equalsIgnoreCase("PUMP_TOGGLE")) {
    setPump(!pumpState);
    Serial.printf("{\"ack\":\"test_pump\",\"pump\":%s}\n", pumpState ? "\"ACTIVE\"" : "\"OFF\"");
    sendTelemetry();
  } else if (line.indexOf("invert_pump") >= 0 || line.equalsIgnoreCase("PUMP_INVERT")) {
    pumpActiveLow = !pumpActiveLow;
    setPump(false);
    Serial.printf("{\"ack\":\"invert_pump\",\"pump_active_low\":%s}\n", pumpActiveLow ? "true" : "false");
    sendTelemetry();
  }
  // 9. STIRRER SERVO CONTROLS
  else if (line.indexOf("stirrer_on") >= 0 || line.equalsIgnoreCase("STIRRER_ON")) {
    setStirrerSweep(true);
    Serial.println("{\"ack\":\"stirrer_on\",\"stirrer\":\"ACTIVE\"}");
    sendTelemetry();
  } else if (line.indexOf("stirrer_off") >= 0 || line.equalsIgnoreCase("STIRRER_OFF")) {
    setStirrerSweep(false);
    Serial.println("{\"ack\":\"stirrer_off\",\"stirrer\":\"OFF\"}");
    sendTelemetry();
  } else if (line.indexOf("test_stirrer") >= 0 || line.equalsIgnoreCase("STIRRER_TOGGLE")) {
    setStirrerSweep(!stirrerActive);
    Serial.printf("{\"ack\":\"test_stirrer\",\"stirrer\":%s}\n", stirrerActive ? "\"ACTIVE\"" : "\"OFF\"");
    sendTelemetry();
  }
  // 10. POD DISPENSER FLAP SERVO CONTROLS
  else if (line.indexOf("pod_open") >= 0 || line.equalsIgnoreCase("POD_OPEN")) {
    setPodFlap(90);
    Serial.println("{\"ack\":\"pod_open\",\"pod_deg\":90}");
    sendTelemetry();
  } else if (line.indexOf("pod_close") >= 0 || line.equalsIgnoreCase("POD_CLOSE")) {
    setPodFlap(0);
    Serial.println("{\"ack\":\"pod_close\",\"pod_deg\":0}");
    sendTelemetry();
  } else if (line.indexOf("test_pod") >= 0 || line.equalsIgnoreCase("POD_TEST")) {
    setPodFlap(90);
    delay(1200);
    setPodFlap(0);
    Serial.println("{\"ack\":\"test_pod\",\"pod_deg\":0}");
    sendTelemetry();
  }
  // 11. HEATER RELAY CONTROLS
  else if (line.indexOf("relay_on") >= 0 || line.equalsIgnoreCase("RELAY_ON")) {
    setHeater(true);
    Serial.println("{\"ack\":\"relay_on\",\"heater\":\"ACTIVE\"}");
    sendTelemetry();
  } else if (line.indexOf("relay_off") >= 0 || line.equalsIgnoreCase("RELAY_OFF")) {
    setHeater(false);
    Serial.println("{\"ack\":\"relay_off\",\"heater\":\"OFF\"}");
    sendTelemetry();
  } else if (line.indexOf("test_relay") >= 0 || line.equalsIgnoreCase("RELAY_TOGGLE")) {
    setHeater(!relayState);
    Serial.printf("{\"ack\":\"test_relay\",\"heater\":%s}\n", relayState ? "\"ACTIVE\"" : "\"OFF\"");
    sendTelemetry();
  } else if (line.indexOf("invert_relay") >= 0 || line.equalsIgnoreCase("RELAY_INVERT")) {
    relayActiveLow = !relayActiveLow;
    setHeater(false);
    Serial.printf("{\"ack\":\"invert_relay\",\"relay_active_low\":%s}\n", relayActiveLow ? "true" : "false");
    sendTelemetry();
  }
  // 12. BUZZER CONTROLS
  else if (line.indexOf("buzzer_on") >= 0 || line.equalsIgnoreCase("BUZZER_ON")) {
    setBuzzer(true);
    Serial.println("{\"ack\":\"buzzer_on\",\"buzzer\":\"ACTIVE\"}");
    sendTelemetry();
  } else if (line.indexOf("buzzer_off") >= 0 || line.equalsIgnoreCase("BUZZER_OFF")) {
    setBuzzer(false);
    Serial.println("{\"ack\":\"buzzer_off\",\"buzzer\":\"OFF\"}");
    sendTelemetry();
  } else if (line.indexOf("test_buzzer") >= 0 || line.equalsIgnoreCase("BUZZER_TOGGLE")) {
    setBuzzer(!buzzerState);
    Serial.printf("{\"ack\":\"test_buzzer\",\"buzzer\":%s}\n", buzzerState ? "\"ACTIVE\"" : "\"OFF\"");
    sendTelemetry();
  } else if (line.indexOf("invert_buzzer") >= 0 || line.equalsIgnoreCase("BUZZER_INVERT")) {
    buzzerActiveLow = !buzzerActiveLow;
    setBuzzer(false);
    Serial.printf("{\"ack\":\"invert_buzzer\",\"buzzer_active_low\":%s}\n", buzzerActiveLow ? "true" : "false");
    sendTelemetry();
  }
  // 13. FLOW SENSOR CONTROLS (GPIO 18)
  else if (line.indexOf("reset_flow") >= 0 || line.equalsIgnoreCase("RESET_FLOW")) {
    flowPulseCount = 0;
    lastCalculatedPulses = 0;
    currentWaterMl = 0.0f;
    flowRateLpm = 0.0f;
    Serial.println("{\"ack\":\"reset_flow\",\"water_ml\":0,\"flow_pulses\":0}");
    sendTelemetry();
  } else if (line.indexOf("set_flow_cal") >= 0 || line.startsWith("SET_FLOW_CAL:")) {
    int idx = line.indexOf(":");
    if (idx < 0) idx = line.indexOf("\"factor\":") + 8;
    float f = line.substring(idx + 1).toFloat();
    if (f > 0.1f) {
      flowCalibrationFactor = f;
      Serial.printf("{\"ack\":\"set_flow_cal\",\"factor\":%.2f}\n", flowCalibrationFactor);
      sendTelemetry();
    }
  } else if (line.indexOf("test_flow") >= 0 || line.equalsIgnoreCase("TEST_FLOW")) {
    Serial.printf("{\"ack\":\"test_flow\",\"water_ml\":%.1f,\"pulses\":%lu,\"rate_lpm\":%.2f,\"cal\":%.2f}\n",
      currentWaterMl, flowPulseCount, flowRateLpm, flowCalibrationFactor);
  }
}

// =============================================================================
// SETUP
// =============================================================================
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(15);
  delay(500);

  Serial.println("\n\n================================================");
  Serial.println("  iKwath Decoction Machine - ESP32 Controller  ");
  Serial.println("================================================");

  // Configure GPIO Modes
  pinMode(PIN_LED_BUILTIN, OUTPUT);
  pinMode(PIN_BUTTON_START, INPUT_PULLUP);
  pinMode(PIN_FLOW_SENSOR, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_PUMP_MOSFET, OUTPUT);
  pinMode(PIN_HEATER_RELAY, OUTPUT);

  // Initial Pin States
  digitalWrite(PIN_LED_BUILTIN, HIGH);
  setBuzzer(false);
  setPump(false);
  setHeater(false);

  // Attach Flow Sensor Interrupt
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_SENSOR), flowPulseISR, RISING);

  // Initialize Servos (Allocate all 4 timers for 100% reliable PWM on ESP32)
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  servoStirrer.setPeriodHertz(50);
  servoStirrer.attach(PIN_SERVO_STIRRER, 500, 2400);
  servoStirrer.write(30);

  servoPodFlap.setPeriodHertz(50);
  servoPodFlap.attach(PIN_SERVO_POD_FLAP, 500, 2400);
  servoPodFlap.write(0);

  // Initialize DHT11 Temperature & Humidity Sensor on GPIO 15
  dht.begin();
  dhtFound = true;
  tempSimulationMode = false;
  Serial.println("[SENSOR] DHT11 Initialized on GPIO 15. Live physical monitoring active.");

  // Initialize Flow Sensor (GPIO 18)
  Serial.printf("[SENSOR] Hall Flow Sensor active on GPIO 18 (Cal Factor: %.2f pulses/mL)\n", flowCalibrationFactor);

  // Welcome Beep
  beep(80, 2, 60);
  Serial.println("[SYSTEM] iKwath ESP32 Controller Ready. Built-in LED ON. 115200 Baud.");

  // Send Initial Telemetry Packet
  sendTelemetry();
}

// =============================================================================
// MAIN LOOP
// =============================================================================
void loop() {
  handlePushButton();
  handleSerialCommands();
  handleKeypad();

  updateTemperature();
  updateFlowSensor();
  updateStirrer();
  runStateMachine();

  // Send periodic JSON telemetry packet every 350ms
  unsigned long now = millis();
  if (now - lastTelemetryTime >= 350) {
    lastTelemetryTime = now;
    sendTelemetry();
  }
}
