/*
  =============================================================================
  iKwath - Smart Automated Ayurvedic Kwatha / Decoction Machine
  ESP32 Master Controller Firmware (v4.3 - Active Batch Agitation @ 15 RPM)
  =============================================================================
  Hardware Pinout Mapping:
  - GPIO 2:  Onboard Blue Status LED (Solid ON when running)
  - GPIO 4:  Push Button (Active LOW with internal pull-up)
  - GPIO 14: Servo Motor (Pod Flap / Door 0° closed ↔ 90° open)
  - GPIO 15: DHT11 Sensor Data (Temperature & Humidity)
  - GPIO 18: Hall Flow Sensor (Hardware Interrupt)
  - GPIO 25: Active Piezo Buzzer (2.4kHz notification beeper)
  - GPIO 26: Relay Channel 2 (Peristaltic / Water Pump - Active LOW)
  - GPIO 27: Relay Channel 1 (Heating Element / Hotplate - Active LOW)
  
  28BYJ-48 Stepper Motor + ULN2003A Driver Pins (Stepper.h Order):
  - IN1: GPIO 13 (Blue)
  - IN2: GPIO 12 (Pink)
  - IN3: GPIO 19 (Yellow)
  - IN4: GPIO 23 (Orange)
  Stepper motor(STEPS_PER_REV, IN1, IN3, IN2, IN4); // Order: 13, 19, 12, 23
  
  Workflow Execution Sequence:
  1. Push Button (GPIO 4) pressed -> Awaken / Start trigger emitted to website.
  2. Recipe Selection from website -> Start command sent to ESP32.
  3. Pod Insertion: Servo opens to 90° for 5 seconds, then closes to 0°.
  4. Water Fill: Relay 2 turns pump ON; flows 400 mL via flow sensor on GPIO 18.
  5. Soaking: 5-second timed soaking step.
  6. Heating: Relay 1 turns heater ON; DHT11 on GPIO 15 monitors until 35°C is reached.
  7. Stirring: 28BYJ-48 stepper motor stirs continuously in one direction for 10 seconds.
  8. Reduction, Filtration & Dispense: 5s pause each, then ready & 3 victory beeps!
  =============================================================================
*/

#include <Arduino.h>
#include <ESP32Servo.h>
#include <Stepper.h>

// =============================================================================
// PIN DEFINITIONS
// =============================================================================
#define PIN_LED_BUILTIN       2   // Onboard Blue LED
#define PIN_BUTTON_START      4   // Push Button (Active LOW with internal pull-up)
#define PIN_SERVO_POD_FLAP   14   // Servo: Herbal Pod Dispenser Flap
#define PIN_DHT_DATA         15   // DHT11 Data Pin
#define PIN_FLOW_SENSOR      18   // Flow Sensor Pulse Input (Interrupt)
#define PIN_BUZZER           25   // Active Buzzer Positive
#define PIN_PUMP_RELAY       26   // Relay Channel 2 (Water Pump)
#define PIN_HEATER_RELAY     27   // Relay Channel 1 (Heater)

// 28BYJ-48 Stepper + ULN2003A Driver Pins
const int IN1 = 13; // Blue
const int IN2 = 12; // Pink
const int IN3 = 19; // Yellow
const int IN4 = 23; // Orange

// 28BYJ-48: 2048 full steps per 360° output shaft revolution
const int STEPS_PER_REV = 2048;

// IMPORTANT ORDER: IN1 (13), IN3 (19), IN2 (12), IN4 (23) for 28BYJ-48 unipolar coils
Stepper motor(STEPS_PER_REV, IN1, IN3, IN2, IN4);

// Flow Sensor Calibration (Pulses per mL)
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
// ZERO-DEPENDENCY DHT11 SENSOR CLASS
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
Servo servoPodFlap;

MachinePhase currentPhase = PHASE_IDLE;
bool isPaused = false;
bool tempSimulationMode = false;
unsigned long phaseStartTime = 0;
unsigned long cycleStartTime = 0;
unsigned long lastTelemetryTime = 0;
unsigned long lastTempReadTime = 0;

// Recipe / Target Parameters
float targetWaterVolumeMl = 400.0f;
float targetExtractionTemp = 35.0f; // Target Heating Temperature: 35°C
float targetReductionMl = 100.0f;
String currentRecipeName = "Ashwagandha Kwatha";

// Flow Sensor Variables & Calibration
float flowCalibrationFactor = FLOW_CALIBRATION_FACTOR;
volatile unsigned long flowPulseCount = 0;
unsigned long lastFlowCalcTime = 0;
unsigned long lastCalculatedPulses = 0;
float currentWaterMl = 0.0f;
float flowRateLpm = 0.0f;

// Live Sensor Readings (DHT11)
float currentTempC = 26.0f;
float currentHumidity = 50.0f;
float simulatedTempC = 26.0f;
bool dhtFound = false;

// Relay Polarity Settings (2PH63091A is Active LOW)
bool relayActiveLow = true;   // Relay 1 (Heater - GPIO 27) Active LOW
bool pumpActiveLow = true;    // Relay 2 (Pump - GPIO 26) Active LOW
bool buzzerActiveLow = false; // Active Buzzer triggers on HIGH

// Actuator States
bool relayState = false;
bool buzzerState = false;
bool pumpState = false;
int currentPodAngle = 0;

// Stepper Motor State via Stepper.h
bool stepperActive = false;
float stepperSpeedRpm = 12.0f; // 12-15 RPM agitation speed

// Button Debounce
int lastButtonState = HIGH;
unsigned long lastButtonPressTime = 0;

// Forward Declarations
void sendTelemetry();
void setPhase(MachinePhase nextPhase);

// =============================================================================
// INTERRUPT SERVICE ROUTINE FOR FLOW SENSOR (GPIO 18)
// =============================================================================
void IRAM_ATTR flowPulseISR() {
  flowPulseCount++;
}

// =============================================================================
// BUZZER FUNCTIONS
// =============================================================================
void setBuzzer(bool on) {
  buzzerState = on;
  digitalWrite(PIN_BUZZER, on ? (buzzerActiveLow ? LOW : HIGH) : (buzzerActiveLow ? HIGH : LOW));
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
// STEPPER MOTOR CONTROLLER (Stepper.h Driver @ 12-15 RPM)
// =============================================================================
void setStepperSpeed(float rpm) {
  if (rpm < 1.0f) rpm = 1.0f;
  if (rpm > 25.0f) rpm = 25.0f;
  stepperSpeedRpm = rpm;
  motor.setSpeed((long)stepperSpeedRpm);
  Serial.printf("[STEPPER] Speed set to: %.0f RPM\n", stepperSpeedRpm);
}

void setStepperActive(bool on) {
  stepperActive = on;
  if (!on) {
    // Completely de-energize all 4 coils to prevent motor and ULN2003 driver heating
    digitalWrite(IN1, LOW);
    digitalWrite(IN2, LOW);
    digitalWrite(IN3, LOW);
    digitalWrite(IN4, LOW);
    Serial.println("[STEPPER] Motor STOPPED & all coils de-energized (LOW).");
  } else {
    motor.setSpeed((long)stepperSpeedRpm);
    Serial.printf("[STEPPER] Motor STARTING @ %.0f RPM...\n", stepperSpeedRpm);
  }
}

// =============================================================================
// ACTUATOR DRIVER FUNCTIONS (RELAYS & SERVO)
// =============================================================================
void setPump(bool on) {
  pumpState = on;
  digitalWrite(PIN_PUMP_RELAY, on ? (pumpActiveLow ? LOW : HIGH) : (pumpActiveLow ? HIGH : LOW));
  Serial.printf("[RELAY 2 - PUMP] %s (GPIO %d = %s | Logic: %s)\n", 
                on ? "⚡ ACTIVE (ON)" : "⚪ OFF", PIN_PUMP_RELAY, 
                digitalRead(PIN_PUMP_RELAY) == LOW ? "LOW (0V)" : "HIGH (3.3V)",
                pumpActiveLow ? "Active-LOW" : "Active-HIGH");
}

void setHeater(bool on) {
  relayState = on;
  digitalWrite(PIN_HEATER_RELAY, on ? (relayActiveLow ? LOW : HIGH) : (relayActiveLow ? HIGH : LOW));
  Serial.printf("[RELAY 1 - HEATER] %s (GPIO %d = %s | Logic: %s)\n", 
                on ? "⚡ ACTIVE (ON)" : "⚪ OFF", PIN_HEATER_RELAY, 
                digitalRead(PIN_HEATER_RELAY) == LOW ? "LOW (0V)" : "HIGH (3.3V)",
                relayActiveLow ? "Active-LOW" : "Active-HIGH");
}

void setPodFlap(int angle) {
  currentPodAngle = constrain(angle, 0, 180);
  servoPodFlap.write(currentPodAngle);
  Serial.printf("[SERVO - POD FLAP] Set to %d°\n", currentPodAngle);
}

void resetAllActuators() {
  setPump(false);
  setHeater(false);
  setBuzzer(false);
  setStepperActive(false);
  setPodFlap(0);
}

// =============================================================================
// TEMPERATURE & HUMIDITY READING (DHT11 - Sampled Every 800ms)
// =============================================================================
void updateTemperature() {
  unsigned long now = millis();
  if (now - lastTempReadTime < 800) return;
  lastTempReadTime = now;

  float t = 0.0f;
  float h = 0.0f;
  bool success = dht.read(t, h);

  if (success && t > -10.0f && t < 80.0f) {
    currentTempC = t;
    currentHumidity = h;
    dhtFound = true;
  } else {
    dhtFound = false;
  }

  // Simulation mode support (simulates heating curve if sensor is ambient or disconnected)
  if (tempSimulationMode) {
    if (relayState && simulatedTempC < 40.0f) {
      simulatedTempC += 0.5f;
    } else if (!relayState && simulatedTempC > 26.0f) {
      simulatedTempC -= 0.2f;
    }
    currentTempC = simulatedTempC;
  }
}

// =============================================================================
// FLOW SENSOR CALCULATION & TRACKING (GPIO 18)
// =============================================================================
void updateFlowSensor() {
  unsigned long now = millis();
  unsigned long dt = now - lastFlowCalcTime;
  if (dt >= 300) {
    unsigned long totalPulses = flowPulseCount;
    unsigned long deltaPulses = (totalPulses >= lastCalculatedPulses) ? (totalPulses - lastCalculatedPulses) : 0;
    lastCalculatedPulses = totalPulses;
    lastFlowCalcTime = now;

    currentWaterMl = totalPulses / flowCalibrationFactor;

    if (dt > 0) {
      flowRateLpm = (float(deltaPulses) / flowCalibrationFactor) * (60000.0f / dt) / 1000.0f;
    }
  }
}

// =============================================================================
// TELEMETRY BROADCAST (JSON over USB Serial @ 115200 Baud)
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
  Serial.print(",\"recipe\":\""); Serial.print(currentRecipeName); Serial.print("\"");
  Serial.print(",\"heater\":"); Serial.print(relayState ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"relay_active_low\":"); Serial.print(relayActiveLow ? "true" : "false");
  Serial.print(",\"pump\":"); Serial.print(pumpState ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"pump_active_low\":"); Serial.print(pumpActiveLow ? "true" : "false");
  Serial.print(",\"stirrer\":"); Serial.print(stepperActive ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"stepper_active\":"); Serial.print(stepperActive ? "true" : "false");
  Serial.print(",\"stepper_rpm\":"); Serial.print(stepperSpeedRpm, 0);
  Serial.print(",\"pod_deg\":"); Serial.print(currentPodAngle);
  Serial.print(",\"buzzer\":"); Serial.print(buzzerState ? "\"ACTIVE\"" : "\"OFF\"");
  Serial.print(",\"elapsed_sec\":"); Serial.print(elapsedSec);
  Serial.print(",\"paused\":"); Serial.print(isPaused ? "true" : "false");
  Serial.print(",\"dht_found\":"); Serial.print(dhtFound ? "true" : "false");
  Serial.println("}");
}

// =============================================================================
// STATE MACHINE TRANSITION ENGINE
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
      // 1. Servo opens to 90° and WAITS for user to insert pod & press push button on GPIO 4
      setPodFlap(90);
      setStepperActive(false);
      setPump(false);
      setHeater(false);
      beep(80, 2);
      Serial.println("[STEP 1] Kadha selected! Pod Door OPEN (90°). Waiting for pod insertion & Push Button (GPIO 4) press...");
      break;

    case PHASE_WATER_FILL:
      // 2. Servo closed (0°), Relay 2 ON -> Pump runs until flow sensor measures 400 mL in real time
      setPodFlap(0);
      flowPulseCount = 0;
      currentWaterMl = 0.0f;
      setPump(true);
      setHeater(false);
      setStepperActive(false);
      beep(100);
      Serial.println("[STEP 2] Pod Door CLOSED (0°). Relay 2 ON -> Pump filling water. Flow sensor measuring to 400 mL in real time...");
      break;

    case PHASE_SOAKING:
      // 3. Soaking step (5-second timed transition)
      setPump(false);
      setHeater(false);
      setStepperActive(false);
      beep(100);
      Serial.println("[STEP 3] Soaking step active (5 seconds)...");
      break;

    case PHASE_HEATING:
      // 4. Relay 1 Heater ON, DHT11 monitors until 35°C
      setPump(false);
      setHeater(true);
      setStepperActive(false);
      beep(120);
      Serial.println("[STEP 4] Relay 1 ON -> Heating in progress. Waiting for DHT11 >= 35°C...");
      break;

    case PHASE_STIRRING:
      // 5. 28BYJ-48 Stepper motor active stirring in one single direction for 10 seconds
      setPump(false);
      setHeater(false);
      stepperActive = true;
      beep(100, 2);
      Serial.println("[STEP 5] Stepper Motor (28BYJ-48 + ULN2003A) STIRRING in one direction for 10 seconds...");
      sendTelemetry();

      // Active Stirring Execution for exactly 10 seconds in one single direction (Clockwise)
      {
        unsigned long stirringStart = millis();
        motor.setSpeed(12); // Smooth 12 RPM speed
        
        while (millis() - stirringStart < 10000) {
          motor.step(256); // Rotate continuously in one direction (Clockwise)
          sendTelemetry();
        }
      }

      setStepperActive(false);
      Serial.println("[STIRRING COMPLETE] 10s one-direction stirring finished.");
      setPhase(PHASE_REDUCTION);
      return;

    case PHASE_REDUCTION:
      // 6. Reduction step (5 seconds)
      setPump(false);
      setHeater(false);
      setStepperActive(false);
      beep(100);
      Serial.println("[STEP 6] Reduction step active (5 seconds)...");
      break;

    case PHASE_FILTRATION:
      // 7. Filtration step (5 seconds)
      setPump(false);
      setHeater(false);
      setStepperActive(false);
      beep(100);
      Serial.println("[STEP 7] SS316 Filtration active (5 seconds)...");
      break;

    case PHASE_DISPENSING:
      // 8. Dispensing step (5 seconds pump)
      setPump(true);
      setHeater(false);
      setStepperActive(false);
      beep(100);
      Serial.println("[STEP 8] Dispensing fresh Kadha via pump (5 seconds)...");
      break;

    case PHASE_COMPLETE:
      // 9. Complete & Ready
      resetAllActuators();
      beep(200, 3, 100); // 3 victory beeps
      Serial.println("[STEP 9] Kadha Decoction COMPLETE! Ready to serve.");
      break;

    case PHASE_CLEANING:
      setPump(true);
      setHeater(false);
      setStepperActive(true);
      beep(150, 2);
      break;

    case PHASE_MANUAL:
      break;
  }

  Serial.printf("[STATE] Phase changed to: %s\n", PHASE_NAMES[currentPhase]);
  sendTelemetry();
}

void startBrewProcess() {
  cycleStartTime = millis();
  isPaused = false;
  flowPulseCount = 0;
  currentWaterMl = 0.0f;
  Serial.println("\n[CYCLE] >>> Starting iKwath Automated Ayurvedic Decoction Process <<<");
  setPhase(PHASE_POD_DROP);
}

void stopBrewProcess() {
  Serial.println("[CYCLE] Cycle stopped / Reset to IDLE.");
  setPhase(PHASE_IDLE);
}

// =============================================================================
// MAIN STATE MACHINE LOOP EXECUTION
// =============================================================================
void runStateMachine() {
  if (currentPhase == PHASE_IDLE || currentPhase == PHASE_COMPLETE || currentPhase == PHASE_MANUAL || isPaused) {
    return;
  }

  unsigned long elapsedInPhase = (millis() - phaseStartTime) / 1000;

  switch (currentPhase) {
    case PHASE_POD_DROP:
      // 1. Pod door stays open 90° waiting indefinitely until user inserts pod and presses GPIO 4 button or dashboard confirms
      break;

    case PHASE_WATER_FILL:
      // 2. Pump fills water until flow sensor reaches target 400 mL in real time (safety watchdog: 120s)
      if (currentWaterMl >= targetWaterVolumeMl || elapsedInPhase >= 120) {
        setPump(false);
        beep(120);
        Serial.printf("[FLOW COMPLETE] Flow sensor measured %.1f mL in real time (Pulses: %lu). Relay 2 OFF.\n", currentWaterMl, flowPulseCount);
        setPhase(PHASE_SOAKING);
      }
      break;

    case PHASE_SOAKING:
      // 3. Soaking step passes by in 5 seconds
      if (elapsedInPhase >= 5) {
        setPhase(PHASE_HEATING);
      }
      break;

    case PHASE_HEATING:
      // 4. Heater ON until DHT11 temperature reaches target °C (with safety watchdog)
      if (currentTempC >= targetExtractionTemp || elapsedInPhase >= 120) {
        setHeater(false);
        Serial.printf("[HEATING COMPLETE] Reached %.1f °C!\n", currentTempC);
        setPhase(PHASE_STIRRING);
      }
      break;

    case PHASE_STIRRING:
      // Handled inside setPhase(PHASE_STIRRING)
      break;

    case PHASE_REDUCTION:
      // 6. Reduction step passes by in 5 seconds
      if (elapsedInPhase >= 5) {
        setPhase(PHASE_FILTRATION);
      }
      break;

    case PHASE_FILTRATION:
      // 7. Filtration step passes by in 5 seconds
      if (elapsedInPhase >= 5) {
        setPhase(PHASE_DISPENSING);
      }
      break;

    case PHASE_DISPENSING:
      // 8. Dispenses for 5 seconds
      if (elapsedInPhase >= 5) {
        setPump(false);
        setPhase(PHASE_COMPLETE);
      }
      break;

    case PHASE_CLEANING:
      if (elapsedInPhase >= 10) {
        resetAllActuators();
        setPhase(PHASE_IDLE);
      }
      break;

    default:
      break;
  }
}

// =============================================================================
// PHYSICAL PUSH BUTTON HANDLER (GPIO 4)
// =============================================================================
void handlePushButton() {
  int reading = digitalRead(PIN_BUTTON_START);
  unsigned long now = millis();

  // Button pressed (Active LOW)
  if (reading == LOW && lastButtonState == HIGH && (now - lastButtonPressTime > 250)) {
    lastButtonPressTime = now;
    beep(80);
    Serial.println("BUTTON_EVENT:start_pressed");
    Serial.println("{\"type\":\"button_event\",\"event\":\"start_pressed\"}");

    if (currentPhase == PHASE_POD_DROP) {
      // User inserted the pod and pressed push button on GPIO 4!
      Serial.println("[POD INSERTED] Button pressed on GPIO 4 -> Locking pod door (0°) & starting Water Fill...");
      setPodFlap(0);
      beep(100);
      setPhase(PHASE_WATER_FILL);
      return;
    } else if (currentPhase == PHASE_IDLE || currentPhase == PHASE_COMPLETE) {
      // Awaken and start
      startBrewProcess();
    } else {
      // Toggle pause/resume during active brew
      isPaused = !isPaused;
      Serial.printf("[PAUSE] Brew %s\n", isPaused ? "PAUSED" : "RESUMED");
      if (isPaused) {
        setPump(false);
        setHeater(false);
        setStepperActive(false);
      } else {
        setPhase(currentPhase);
      }
    }
  }
  lastButtonState = reading;
}

// =============================================================================
// Helper: Extract string value from JSON without third-party library
String getJsonString(const String& json, const String& key) {
  int keyIndex = json.indexOf("\"" + key + "\"");
  if (keyIndex == -1) return "";
  int colonIndex = json.indexOf(':', keyIndex);
  if (colonIndex == -1) return "";
  int quoteStart = json.indexOf('\"', colonIndex);
  if (quoteStart == -1) return "";
  int quoteEnd = json.indexOf('\"', quoteStart + 1);
  if (quoteEnd == -1) return "";
  return json.substring(quoteStart + 1, quoteEnd);
}

// Helper: Extract float value from JSON
float getJsonFloat(const String& json, const String& key, float defaultVal) {
  int keyIndex = json.indexOf("\"" + key + "\"");
  if (keyIndex == -1) return defaultVal;
  int colonIndex = json.indexOf(':', keyIndex);
  if (colonIndex == -1) return defaultVal;
  int valStart = colonIndex + 1;
  while (valStart < (int)json.length() && (json[valStart] == ' ' || json[valStart] == '\"')) valStart++;
  int valEnd = valStart;
  while (valEnd < (int)json.length() && (isDigit(json[valEnd]) || json[valEnd] == '.' || json[valEnd] == '-')) valEnd++;
  if (valEnd > valStart) {
    return json.substring(valStart, valEnd).toFloat();
  }
  return defaultVal;
}

// =============================================================================
// SERIAL COMMAND PARSER (Bidirectional Web Serial Protocol - JSON + Plain Text)
// =============================================================================
void processSerialCommand(String cmd) {
  cmd.trim();
  if (cmd.length() == 0) return;

  Serial.printf("[CMD] Received: %s\n", cmd.c_str());

  // Check if command is in JSON format
  if (cmd.startsWith("{")) {
    String action = getJsonString(cmd, "cmd");
    action.toLowerCase();

    if (action == "start" || action == "start_brew" || action == "prepare_pod" || action == "select_recipe") {
      targetWaterVolumeMl = getJsonFloat(cmd, "set_water", 400.0f);
      targetExtractionTemp = getJsonFloat(cmd, "set_temp", 35.0f);
      String rName = getJsonString(cmd, "recipe");
      if (rName.length() > 0) currentRecipeName = rName;
      if (targetWaterVolumeMl <= 0) targetWaterVolumeMl = 400.0f;
      if (targetExtractionTemp <= 0 || targetExtractionTemp > 35.0f) targetExtractionTemp = 35.0f;
      Serial.printf("[CONFIG] Kadha: %s | Target Water: %.0f mL | Target Temp: %.0f °C (35°C Limit)\n",
                    currentRecipeName.c_str(), targetWaterVolumeMl, targetExtractionTemp);
      startBrewProcess(); // Enters PHASE_POD_DROP, opens servo to 90° and waits for pod insertion & push button press
      return;
    } else if (action == "pod_inserted" || action == "confirm_pod" || action == "pod_close" || action == "start_fill") {
      Serial.println("[POD INSERTED] Pod confirmed inserted! Closing pod door (0°) and starting Water Fill...");
      setPodFlap(0);
      beep(100);
      setPhase(PHASE_WATER_FILL);
      return;
    } else if (action == "sync_recipe") {
      targetWaterVolumeMl = getJsonFloat(cmd, "set_water", 400.0f);
      targetExtractionTemp = getJsonFloat(cmd, "set_temp", 35.0f);
      String rName = getJsonString(cmd, "recipe");
      if (rName.length() > 0) currentRecipeName = rName;
      if (targetWaterVolumeMl <= 0) targetWaterVolumeMl = 400.0f;
      if (targetExtractionTemp <= 0 || targetExtractionTemp > 35.0f) targetExtractionTemp = 35.0f;
      Serial.printf("[CONFIG] Synced recipe: %s | Water: %.0f mL | Target Temp: %.0f °C (35°C Limit)\n",
                    currentRecipeName.c_str(), targetWaterVolumeMl, targetExtractionTemp);
      sendTelemetry();
      return;
    } else if (action == "stop" || action == "stop_brew" || action == "reset") {
      stopBrewProcess();
      return;
    } else if (action == "pause" || action == "toggle_pause") {
      isPaused = !isPaused;
      Serial.printf("[PAUSE] Brew is now %s\n", isPaused ? "PAUSED" : "RESUMED");
      if (isPaused) {
        setPump(false);
        setHeater(false);
        setStepperActive(false);
      } else {
        setPhase(currentPhase);
      }
      sendTelemetry();
      return;
    } else if (action == "clean") {
      setPhase(PHASE_CLEANING);
      return;
    } else if (action == "pump_on" || action == "test_pump") {
      setPump(true);
      return;
    } else if (action == "pump_off") {
      setPump(false);
      return;
    } else if (action == "relay_on" || action == "heater_on" || action == "test_relay") {
      setHeater(true);
      return;
    } else if (action == "relay_off" || action == "heater_off") {
      setHeater(false);
      return;
    } else if (action == "stirrer_on" || action == "stepper_on" || action == "test_stirrer" || action == "test_stepper") {
      Serial.println("[TEST] Running Stepper Motor in one direction for 10 seconds...");
      stepperActive = true;
      sendTelemetry();
      motor.setSpeed(12);
      unsigned long tStart = millis();
      while (millis() - tStart < 10000) {
        motor.step(256);
        sendTelemetry();
      }
      setStepperActive(false);
      sendTelemetry();
      return;
    } else if (action == "stirrer_off" || action == "stepper_off") {
      setStepperActive(false);
      return;
    } else if (action == "set_stepper_rpm") {
      float rpm = getJsonFloat(cmd, "rpm", 12.0f);
      setStepperSpeed(rpm);
      return;
    } else if (action == "pod_open" || action == "test_pod") {
      setPodFlap(90);
      return;
    } else if (action == "pod_close") {
      setPodFlap(0);
      return;
    } else if (action == "buzzer_on" || action == "test_buzzer") {
      setBuzzer(true);
      return;
    } else if (action == "buzzer_off") {
      setBuzzer(false);
      return;
    } else if (action == "invert_relay" || action == "invert_heater") {
      relayActiveLow = !relayActiveLow;
      Serial.printf("[CONFIG] Relay 1 Polarity: %s\n", relayActiveLow ? "Active LOW" : "Active HIGH");
      setHeater(relayState);
      return;
    } else if (action == "invert_pump") {
      pumpActiveLow = !pumpActiveLow;
      Serial.printf("[CONFIG] Relay 2 (Pump) Polarity: %s\n", pumpActiveLow ? "Active LOW" : "Active HIGH");
      setPump(pumpState);
      return;
    } else if (action == "toggle_sim") {
      tempSimulationMode = !tempSimulationMode;
      Serial.printf("[CONFIG] Temp Simulation: %s\n", tempSimulationMode ? "ENABLED" : "DISABLED");
      return;
    } else if (action == "connect" || action == "ping") {
      beep(60, 1);
      sendTelemetry();
      return;
    }
  }

  // Plain text command parser fallback
  if (cmd.equalsIgnoreCase("START_BREW") || cmd.equalsIgnoreCase("START")) {
    startBrewProcess();
  } else if (cmd.startsWith("START:")) {
    int firstColon = cmd.indexOf(':');
    int secondColon = cmd.indexOf(':', firstColon + 1);
    int thirdColon = cmd.indexOf(':', secondColon + 1);

    if (firstColon != -1 && secondColon != -1) {
      if (thirdColon != -1) {
        targetWaterVolumeMl = cmd.substring(secondColon + 1, thirdColon).toFloat();
        targetExtractionTemp = cmd.substring(thirdColon + 1).toFloat();
      } else {
        targetWaterVolumeMl = cmd.substring(secondColon + 1).toFloat();
      }
      if (targetWaterVolumeMl <= 0) targetWaterVolumeMl = 400.0f;
      if (targetExtractionTemp <= 0 || targetExtractionTemp > 35.0f) targetExtractionTemp = 35.0f;
    }
    startBrewProcess();
  } else if (cmd.equalsIgnoreCase("STOP_BREW") || cmd.equalsIgnoreCase("STOP") || cmd.equalsIgnoreCase("RESET")) {
    stopBrewProcess();
  } else if (cmd.equalsIgnoreCase("PAUSE_BREW") || cmd.equalsIgnoreCase("PAUSE")) {
    isPaused = !isPaused;
    Serial.printf("[PAUSE] Brew is now %s\n", isPaused ? "PAUSED" : "RESUMED");
  } else if (cmd.equalsIgnoreCase("PUMP:ON")) {
    setPump(true);
  } else if (cmd.equalsIgnoreCase("PUMP:OFF")) {
    setPump(false);
  } else if (cmd.equalsIgnoreCase("HEATER:ON") || cmd.equalsIgnoreCase("RELAY:ON") || cmd.equalsIgnoreCase("RELAY1:ON")) {
    setHeater(true);
  } else if (cmd.equalsIgnoreCase("HEATER:OFF") || cmd.equalsIgnoreCase("RELAY:OFF") || cmd.equalsIgnoreCase("RELAY1:OFF")) {
    setHeater(false);
  } else if (cmd.equalsIgnoreCase("STEPPER:ON") || cmd.equalsIgnoreCase("STIRRER:ON")) {
    stepperActive = true;
    sendTelemetry();
    motor.setSpeed(12);
    unsigned long tStart = millis();
    while (millis() - tStart < 10000) {
      motor.step(256);
      sendTelemetry();
    }
    setStepperActive(false);
    sendTelemetry();
  } else if (cmd.equalsIgnoreCase("STEPPER:OFF") || cmd.equalsIgnoreCase("STIRRER:OFF")) {
    setStepperActive(false);
  } else if (cmd.startsWith("STEPPER:RPM:")) {
    float rpm = cmd.substring(12).toFloat();
    setStepperSpeed(rpm);
  } else if (cmd.equalsIgnoreCase("STEPPER:15RPM")) {
    setStepperSpeed(15.0f);
  } else if (cmd.startsWith("POD:")) {
    int angle = cmd.substring(4).toInt();
    setPodFlap(angle);
  } else if (cmd.equalsIgnoreCase("BUZZER:BEEP")) {
    beep(100);
  } else if (cmd.equalsIgnoreCase("RELAY:INVERT")) {
    relayActiveLow = !relayActiveLow;
    Serial.printf("[CONFIG] Relay 1 Polarity: %s\n", relayActiveLow ? "Active LOW" : "Active HIGH");
    setHeater(relayState);
  } else if (cmd.equalsIgnoreCase("PUMP:INVERT")) {
    pumpActiveLow = !pumpActiveLow;
    Serial.printf("[CONFIG] Relay 2 Polarity: %s\n", pumpActiveLow ? "Active LOW" : "Active HIGH");
    setPump(pumpState);
  } else if (cmd.equalsIgnoreCase("SIM_TEMP:TOGGLE")) {
    tempSimulationMode = !tempSimulationMode;
    Serial.printf("[CONFIG] Temp Simulation: %s\n", tempSimulationMode ? "ENABLED" : "DISABLED");
  } else if (cmd.equalsIgnoreCase("PING")) {
    Serial.println("{\"type\":\"pong\",\"version\":\"4.3\"}");
  }
}

// =============================================================================
// SETUP
// =============================================================================
void setup() {
  Serial.begin(115200);
  delay(400);

  Serial.println("\n=============================================================");
  Serial.println("   iKwath - Smart Automated Ayurvedic Decoction Machine       ");
  Serial.println("   ESP32 Master Controller Firmware v4.3                      ");
  Serial.println("=============================================================");

  // Initialize GPIO Pins
  pinMode(PIN_LED_BUILTIN, OUTPUT);
  digitalWrite(PIN_LED_BUILTIN, HIGH); // Solid blue on startup

  pinMode(PIN_BUTTON_START, INPUT_PULLUP);
  pinMode(PIN_BUZZER, OUTPUT);

  // Initialize Relays cleanly as OFF prior to enabling output
  digitalWrite(PIN_PUMP_RELAY, pumpActiveLow ? HIGH : LOW);
  digitalWrite(PIN_HEATER_RELAY, relayActiveLow ? HIGH : LOW);
  pinMode(PIN_PUMP_RELAY, OUTPUT);
  pinMode(PIN_HEATER_RELAY, OUTPUT);

  // Initialize Stepper Motor Speed
  motor.setSpeed((long)stepperSpeedRpm);
  setStepperActive(false);

  // Quick Stepper Startup Self-Test using Stepper.h (Clockwise 512 steps)
  Serial.println("[DIAGNOSTICS] Testing Stepper Motor via Stepper.h @ 12 RPM (One direction)...");
  motor.setSpeed(12);
  Serial.println("  -> Clockwise rotation (512 steps)...");
  motor.step(512);
  setStepperActive(false);
  Serial.println("[DIAGNOSTICS] Stepper self-test complete.");

  // Flow Sensor Pin + Hardware Interrupt
  pinMode(PIN_FLOW_SENSOR, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_SENSOR), flowPulseISR, FALLING);

  // DHT11 Sensor
  dht.begin();

  // Servo Attachment
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  servoPodFlap.setPeriodHertz(50);
  servoPodFlap.attach(PIN_SERVO_POD_FLAP, 500, 2400);
  setPodFlap(0);

  // Safely initialize all actuators to OFF
  resetAllActuators();

  // Startup chirp
  beep(80, 2, 60);

  Serial.println("[SYSTEM] All sensors & actuators initialized. Ready for brew!\n");
}

// =============================================================================
// MAIN LOOP
// =============================================================================
void loop() {
  // 1. Process Serial Inputs from Web UI
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    processSerialCommand(command);
  }

  // 2. Physical Button Handling
  handlePushButton();

  // 3. Sensor Updates
  updateTemperature();
  updateFlowSensor();

  // 4. Automated Decoction State Machine
  runStateMachine();

  // 5. Broadcast Telemetry Every 250ms
  unsigned long now = millis();
  if (now - lastTelemetryTime >= 250) {
    lastTelemetryTime = now;
    sendTelemetry();
  }
}
