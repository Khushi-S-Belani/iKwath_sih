/*
  =============================================================================
  iKwath - Smart Automated Ayurvedic Kwatha / Decoction Machine
  ESP32 Master Controller Firmware (v2.5 - DHT11/DS18B20 Temp & Humidity Support)
  =============================================================================
  Pinout Mapping:
  - GPIO 2:  Onboard Blue LED (Solid ON when connected / running)
  - GPIO 4:  Push Button (Active LOW with internal pull-up)
  - GPIO 13: Stirrer Servo 1 (Agitator sweep 30° ↔ 150°)
  - GPIO 14: Pod Flap Servo 2 (0° closed ↔ 90° open)
  - GPIO 15: Temperature / Humidity Sensor (DHT11 / DHT22 / DS18B20 Data Pin)
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
#include <DHT.h>
#include <OneWire.h>
#include <DallasTemperature.h>
#include <ESP32Servo.h>
#include <Keypad.h>

#define ENABLE_KEYPAD true

// =============================================================================
// TEMPERATURE SENSOR SELECTION (Choose DHT11, DS18B20, or DHT22)
// =============================================================================
#define SENSOR_DHT11    1   // DHT11 Temp & Humidity Sensor (Active Default)
#define SENSOR_DS18B20  2   // DS18B20 OneWire Waterproof Temp Sensor
#define SENSOR_DHT22    3   // DHT22 High-Precision Sensor

// Set active sensor model:
#define ACTIVE_TEMP_SENSOR SENSOR_DHT11

// =============================================================================
// PIN DEFINITIONS
// =============================================================================
#define PIN_LED_BUILTIN       2   // Onboard Blue LED
#define PIN_BUTTON_START      4   // Push Button (Active LOW with internal pull-up)
#define PIN_FLOW_SENSOR      18   // Flow Sensor Pulse Input (Interrupt)
#define PIN_TEMP_DATA        15   // Temp/Humidity Sensor Data (GPIO 15 - Adjacent to GND & 3V3)
#define PIN_DS18B20_DATA     15   // Backward compatibility alias
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
// GLOBAL OBJECTS & VARIABLES
// =============================================================================
#if (ACTIVE_TEMP_SENSOR == SENSOR_DHT11)
  DHT dht(PIN_TEMP_DATA, DHT11);
#elif (ACTIVE_TEMP_SENSOR == SENSOR_DHT22)
  DHT dht(PIN_TEMP_DATA, DHT22);
#else
  OneWire oneWire(PIN_TEMP_DATA);
  DallasTemperature ds18b20(&oneWire);
#endif

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

// Live Sensor Readings
float currentTempC = 25.0f;
float currentHumidity = 50.0f;
float simulatedTempC = 25.0f;
bool tempSensorFound = false;
bool ds18b20Found = false; // Backward compatibility alias for UI JSON

// Polarity Settings (Supports both Active-HIGH and Active-LOW modules)
bool relayActiveLow = true;     // Most 5V relay modules trigger on LOW
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
    tone(PIN_BUZZER, 2400); // 2.4kHz acoustic square wave for passive buzzers
    digitalWrite(PIN_BUZZER, buzzerActiveLow ? LOW : HIGH); // DC level for active buzzers
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
// ACTUATOR DRIVER FUNCTIONS
// =============================================================================
void setPump(bool on) {
  pumpState = on;
  digitalWrite(PIN_PUMP_MOSFET, on ? HIGH : LOW);
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
// TEMPERATURE READING (DHT11 / DS18B20 - Sampled Every 1.5s)
// =============================================================================
void updateTemperature() {
  unsigned long now = millis();
  if (now - lastTempReadTime < 1500) return; // DHT11 reads reliably every 1.5s
  lastTempReadTime = now;

#if (ACTIVE_TEMP_SENSOR == SENSOR_DHT11 || ACTIVE_TEMP_SENSOR == SENSOR_DHT22)
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (!isnan(t) && t > -20.0f && t < 90.0f) {
    currentTempC = t;
    if (!isnan(h)) currentHumidity = h;
    tempSensorFound = true;
    ds18b20Found = true;
    Serial.printf("[TEMP] 🌡️ Live DHT11: %.1f °C (%.1f °F) | 💧 Humidity: %.1f %%\n", 
                  currentTempC, (currentTempC * 1.8f) + 32.0f, currentHumidity);
  } else {
    tempSensorFound = false;
    ds18b20Found = false;
    Serial.printf("[TEMP] ⚠️ DHT11 read failed! Check GPIO %d, VCC (3.3V/5V), GND & pullup\n", PIN_TEMP_DATA);
  }
#else
  // Read physical DS18B20 OneWire sensor
  ds18b20.requestTemperatures();
  float t = ds18b20.getTempCByIndex(0);

  // -127.0°C and 85.0°C are DS18B20 error codes for disconnected sensor
  if (t > -50.0f && t < 125.0f && t != 85.0f && t != DEVICE_DISCONNECTED_C) {
    currentTempC = t;
    tempSensorFound = true;
    ds18b20Found = true;
    Serial.printf("[TEMP] 🌡️ Live DS18B20: %.2f °C (%.1f °F)\n", currentTempC, (currentTempC * 1.8f) + 32.0f);
  } else {
    tempSensorFound = false;
    ds18b20Found = false;
    Serial.printf("[TEMP] ⚠️ DS18B20 disconnected (raw: %.1f °C). Check GPIO %d, 4.7kΩ pullup & 3.3V/GND\n", t, PIN_TEMP_DATA);
  }
#endif
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

    // Live log when water is flowing or pump is active
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
  Serial.print(",\"sensor_type\":\"");
#if (ACTIVE_TEMP_SENSOR == SENSOR_DHT11)
  Serial.print("DHT11");
#elif (ACTIVE_TEMP_SENSOR == SENSOR_DHT22)
  Serial.print("DHT22");
#else
  Serial.print("DS18B20");
#endif
  Serial.print("\"");
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
  Serial.print(",\"ds18b20_found\":"); Serial.print(tempSensorFound ? "true" : "false");
  Serial.print(",\"temp_sensor_found\":"); Serial.print(tempSensorFound ? "true" : "false");
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
      setHeater(true);
      setStirrerSweep(false);
      beep(80);
      break;

    case PHASE_HEATING:
      setHeater(true);
      setStirrerSweep(false);
      beep(80);
      break;

    case PHASE_STIRRING:
      setHeater(true);
      setStirrerSweep(true);
      beep(100, 2);
      break;

    case PHASE_REDUCTION:
      setHeater(true);
      setStirrerSweep(true);
      break;

    case PHASE_FILTRATION:
      setHeater(false);
      setStirrerSweep(false);
      setPump(true);
      beep(120);
      break;

    case PHASE_DISPENSING:
      setPump(true);
      break;

    case PHASE_COMPLETE:
      resetAllActuators();
      beep(300, 3, 150);
      break;

    case PHASE_CLEANING:
      setHeater(false);
      setStirrerSweep(true);
      setPump(true);
      beep(100);
      break;

    case PHASE_MANUAL:
      break;
  }

  sendTelemetry();
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
// PHYSICAL PUSH BUTTON HANDLER (Robust Non-blocking Edge Trigger)
// =============================================================================
void handlePushButton() {
  int reading = digitalRead(PIN_BUTTON_START);
  unsigned long now = millis();

  // Active LOW: Button connected between GPIO 4 and GND
  if (reading == LOW && lastButtonState == HIGH && (now - lastButtonPressTime > 200)) {
    lastButtonPressTime = now;
    lastButtonState = LOW;

    beep(120); // Immediate beep feedback on button press!

    if (currentPhase == PHASE_IDLE || currentPhase == PHASE_COMPLETE) {
      Serial.println("{\"type\":\"button_event\",\"event\":\"start_pressed\",\"phase\":\"POD_DETECTED\"}");
      startBrewProcess();
    } else {
      isPaused = !isPaused;
      Serial.printf("{\"type\":\"button_event\",\"event\":\"pause_pressed\",\"paused\":%s}\n", isPaused ? "true" : "false");
      beep(70, isPaused ? 2 : 1);
      sendTelemetry();
    }
  } else if (reading == HIGH && lastButtonState == LOW && (now - lastButtonPressTime > 80)) {
    lastButtonState = HIGH;
  }
}

// =============================================================================
// KEYPAD HANDLER (4x4 Matrix)
// =============================================================================
void handleKeypad() {
  char key = keypad.getKey();
  if (!key) return;

  beep(40);
  Serial.printf("{\"type\":\"keypad\",\"key\":\"%c\"}\n", key);

  switch (key) {
    case '*': // Start / Pause
      if (currentPhase == PHASE_IDLE) startBrewProcess();
      else {
        isPaused = !isPaused;
        sendTelemetry();
      }
      break;
    case '#': // Emergency Stop
      stopBrewProcess();
      break;
    case 'A': // Toggle Pump
      setPump(!pumpState);
      sendTelemetry();
      break;
    case 'B': // Toggle Stirrer
      setStirrerSweep(!stirrerActive);
      sendTelemetry();
      break;
    case 'C': // Toggle Temp Simulation
      tempSimulationMode = !tempSimulationMode;
      beep(150, 2);
      sendTelemetry();
      break;
    case 'D': // Start Cleaning Cycle
      setPhase(PHASE_CLEANING);
      break;
    case '0': // Test Pod Flap
      setPodFlap(90);
      delay(1000);
      setPodFlap(0);
      sendTelemetry();
      break;
    case '1': // Ashwagandha Recipe Preset (400 mL, 90°C)
      targetWaterVolumeMl = 400.0f; 
      targetExtractionTemp = 90.0f;
      beep(60, 1);
      sendTelemetry();
      break;
    case '2': // Giloy Recipe Preset (350 mL, 88°C)
      targetWaterVolumeMl = 350.0f; 
      targetExtractionTemp = 88.0f;
      beep(60, 2);
      sendTelemetry();
      break;
    case '3': // Tulsi Recipe Preset (450 mL, 92°C)
      targetWaterVolumeMl = 450.0f; 
      targetExtractionTemp = 92.0f;
      beep(60, 3);
      sendTelemetry();
      break;
    case '4': // Beep Test
      beep(120, 2);
      break;
    case '5': // Invert Buzzer Polarity
      buzzerActiveLow = !buzzerActiveLow;
      setBuzzer(false);
      sendTelemetry();
      break;
    case '6': // Pod Open 90
      setPodFlap(90);
      sendTelemetry();
      break;
    case '7': // Pod Close 0
      setPodFlap(0);
      sendTelemetry();
      break;
    case '8': // Toggle Heater Relay
      setHeater(!relayState);
      sendTelemetry();
      break;
    default:
      break;
  }
}

// =============================================================================
// SERIAL COMMAND PARSER (Receives JSON / text commands from React Web UI)
// =============================================================================
void handleSerialCommands() {
  if (!Serial.available()) return;

  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.length() == 0) return;

  // Turn ON Built-in LED on any active connection / command
  digitalWrite(PIN_LED_BUILTIN, HIGH);

  // Parse parameters if present in line
  if (line.indexOf("\"set_water\":") >= 0) {
    int idx = line.indexOf("\"set_water\":") + 12;
    float w = line.substring(idx).toFloat();
    if (w >= 10.0f) targetWaterVolumeMl = w;
  }
  if (line.indexOf("\"set_temp\":") >= 0) {
    int idx = line.indexOf("\"set_temp\":") + 11;
    float t = line.substring(idx).toFloat();
    if (t >= 30.0f) targetExtractionTemp = t;
  }

  // 1. Handshake Connect
  if (line.indexOf("connect") >= 0 || line.equalsIgnoreCase("CONNECT")) {
    digitalWrite(PIN_LED_BUILTIN, HIGH);
    setBuzzer(false);
    beep(80, 2);
    Serial.println("{\"status\":\"connected\",\"led\":\"ON\",\"device\":\"iKwath ESP32\"}");
    sendTelemetry();
  } 
  // 2. Recipe Parameter Sync
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
  } else if (line.indexOf("test_buzzer") >= 0 || line.equalsIgnoreCase("BEEP") || line.indexOf("beep") >= 0) {
    beep(150, 2);
    Serial.println("{\"ack\":\"test_buzzer\",\"buzzer\":\"BEEPED\"}");
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

  // Initialize Temperature Sensor (Physical Live Sensor on GPIO 15)
#if (ACTIVE_TEMP_SENSOR == SENSOR_DHT11 || ACTIVE_TEMP_SENSOR == SENSOR_DHT22)
  dht.begin();
  tempSensorFound = true;
  ds18b20Found = true;
  Serial.printf("[SENSOR] DHT%s Initialized on GPIO %d. Live physical monitoring active.\n", 
                ACTIVE_TEMP_SENSOR == SENSOR_DHT11 ? "11" : "22", PIN_TEMP_DATA);
#else
  pinMode(PIN_TEMP_DATA, INPUT_PULLUP);
  ds18b20.begin();
  ds18b20.setResolution(10);
  ds18b20.setWaitForConversion(false); // Non-blocking conversion
  tempSensorFound = true;
  ds18b20Found = true;
  Serial.printf("[SENSOR] DS18B20 Initialized on GPIO %d. Live physical monitoring active.\n", PIN_TEMP_DATA);
#endif
  tempSimulationMode = false;

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
