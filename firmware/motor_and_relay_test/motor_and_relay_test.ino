/*
  =============================================================================
  iKwath - Stepper Motor (28BYJ-48 + ULN2003A) & 2-Channel Relay Diagnostic Tool
  =============================================================================
  Hardware Connections:
  - Stepper IN1: GPIO 13 (Blue)
  - Stepper IN2: GPIO 12 (Pink)
  - Stepper IN3: GPIO 19 (Yellow)
  - Stepper IN4: GPIO 23 (Orange)
  - Stepper VCC (+): +5V (Vin / External 5V)
  - Stepper GND (-): GND (Common)
  - Relay 1 (Heater): GPIO 27 (Active LOW)
  - Relay 2 (Pump):   GPIO 26 (Active LOW)
  
  Interactive Serial Commands (115200 Baud):
  - 1 : Toggle Relay 1 (Heater - GPIO 27)
  - 2 : Toggle Relay 2 (Pump - GPIO 26)
  - s : Start / Stop 28BYJ-48 Stepper Motor (15 RPM Continuous)
  - + : Increase Stepper RPM (+2 RPM)
  - - : Decrease Stepper RPM (-2 RPM)
  - m : Toggle Stepper Sequence (Standard Coil IN1-3-2-4 <-> Sequential IN1-2-3-4)
  - i : Invert Relay Polarity (Active-LOW <-> Active-HIGH)
  - a : Run Auto Diagnostic Loop (Tests relays + stepper sequence)
  - h : Show Help Menu
  =============================================================================
*/

#include <Arduino.h>

#define PIN_LED_ONBOARD       2
#define PIN_RELAY_1_HEATER   27
#define PIN_RELAY_2_PUMP     26
#define PIN_STEPPER_IN1      13
#define PIN_STEPPER_IN2      12
#define PIN_STEPPER_IN3      19
#define PIN_STEPPER_IN4      23

bool relayActiveLow = true;
bool relay1State = false;
bool relay2State = false;

// Stepper Variables
bool stepperActive = false;
float stepperRpm = 15.0f;
unsigned long stepperIntervalMicros = 1953;
unsigned long lastStepperStepMicros = 0;
int stepperStepIndex = 0;
int stepperDirection = 1;
unsigned long stepCounter = 0;
bool useAltMapping = false;

// 4-Step Dual-Phase Matrix: [IN1, IN2, IN3, IN4]
const uint8_t STEPPER_FULL_STEP[4][4] = {
  {1, 0, 1, 0}, // Step 0: IN1 + IN3
  {0, 1, 1, 0}, // Step 1: IN3 + IN2
  {0, 1, 0, 1}, // Step 2: IN2 + IN4
  {1, 0, 0, 1}  // Step 3: IN4 + IN1
};

const uint8_t STEPPER_ALT_STEP[4][4] = {
  {1, 1, 0, 0}, // Step 0: IN1 + IN2
  {0, 1, 1, 0}, // Step 1: IN2 + IN3
  {0, 0, 1, 1}, // Step 2: IN3 + IN4
  {1, 0, 0, 1}  // Step 3: IN4 + IN1
};

void setRelay1(bool on) {
  relay1State = on;
  digitalWrite(PIN_RELAY_1_HEATER, on ? (relayActiveLow ? LOW : HIGH) : (relayActiveLow ? HIGH : LOW));
  Serial.printf("[RELAY 1 - HEATER] %s (GPIO 27 = %s)\n", on ? "⚡ ON (CLOSED)" : "⚪ OFF (OPEN)", digitalRead(PIN_RELAY_1_HEATER) == LOW ? "LOW" : "HIGH");
}

void setRelay2(bool on) {
  relay2State = on;
  digitalWrite(PIN_RELAY_2_PUMP, on ? (relayActiveLow ? LOW : HIGH) : (relayActiveLow ? HIGH : LOW));
  Serial.printf("[RELAY 2 - PUMP] %s (GPIO 26 = %s)\n", on ? "⚡ ON (CLOSED)" : "⚪ OFF (OPEN)", digitalRead(PIN_RELAY_2_PUMP) == LOW ? "LOW" : "HIGH");
}

void setStepperRpm(float rpm) {
  if (rpm < 1.0f) rpm = 1.0f;
  if (rpm > 25.0f) rpm = 25.0f;
  stepperRpm = rpm;
  stepperIntervalMicros = (unsigned long)((60.0f * 1000000.0f) / (stepperRpm * 2048.0f));
  Serial.printf("[STEPPER] Speed set to: %.1f RPM (%lu µs per step)\n", stepperRpm, stepperIntervalMicros);
}

void setStepperActive(bool on) {
  stepperActive = on;
  if (!on) {
    digitalWrite(PIN_STEPPER_IN1, LOW);
    digitalWrite(PIN_STEPPER_IN2, LOW);
    digitalWrite(PIN_STEPPER_IN3, LOW);
    digitalWrite(PIN_STEPPER_IN4, LOW);
    Serial.println("[STEPPER] Motor STOPPED (All coils de-energized).");
  } else {
    lastStepperStepMicros = micros();
    Serial.printf("[STEPPER] Motor RUNNING @ %.1f RPM (%s sequence)\n",
                  stepperRpm, useAltMapping ? "Alt Sequential" : "Standard Dual-Phase");
  }
}

void updateStepper() {
  if (!stepperActive) return;

  unsigned long now = micros();
  if (now - lastStepperStepMicros < stepperIntervalMicros) return;
  lastStepperStepMicros = now;

  stepperStepIndex = (stepperStepIndex + stepperDirection + 4) % 4;
  const uint8_t (*matrix)[4] = useAltMapping ? STEPPER_ALT_STEP : STEPPER_FULL_STEP;

  digitalWrite(PIN_STEPPER_IN1, matrix[stepperStepIndex][0]);
  digitalWrite(PIN_STEPPER_IN2, matrix[stepperStepIndex][1]);
  digitalWrite(PIN_STEPPER_IN3, matrix[stepperStepIndex][2]);
  digitalWrite(PIN_STEPPER_IN4, matrix[stepperStepIndex][3]);

  stepCounter++;
  if (stepCounter >= 2048) { // Reverse every 1 full revolution
    stepCounter = 0;
    stepperDirection = -stepperDirection;
  }
}

void printMenu() {
  Serial.println("\n=============================================================");
  Serial.println("  iKwath - Stepper Motor & Relay Diagnostic Control Menu     ");
  Serial.println("=============================================================");
  Serial.println("  1 : Toggle Relay 1 (GPIO 27 - Heater)");
  Serial.println("  2 : Toggle Relay 2 (GPIO 26 - Water Pump)");
  Serial.println("  s : Start / Stop Stepper Motor (Toggle)");
  Serial.println("  + : Speed Up Stepper (+2 RPM)");
  Serial.println("  - : Slow Down Stepper (-2 RPM)");
  Serial.println("  m : Toggle Stepper Sequence Mapping (Standard <-> Sequential)");
  Serial.println("  i : Invert Relay Polarity (Active-LOW <-> Active-HIGH)");
  Serial.println("  a : Run Automated Diagnostic Routine");
  Serial.println("  h : Display this Menu");
  Serial.println("=============================================================\n");
}

void runAutoDiagnostic() {
  Serial.println("\n>>> Starting Complete Hardware Diagnostic Routine <<<");
  
  // 1. Relay 1 Test
  Serial.println("1. Clicking Relay 1 (Heater - GPIO 27)...");
  setRelay1(true);
  delay(400);
  setRelay1(false);
  delay(200);

  // 2. Relay 2 Test
  Serial.println("2. Clicking Relay 2 (Pump - GPIO 26)...");
  setRelay2(true);
  delay(400);
  setRelay2(false);
  delay(200);

  // 3. Stepper Test @ 15 RPM
  Serial.println("3. Running 28BYJ-48 Stepper @ 15 RPM for 3 seconds...");
  setStepperActive(true);
  unsigned long start = millis();
  while (millis() - start < 3000) {
    updateStepper();
  }
  setStepperActive(false);

  Serial.println(">>> Diagnostic Routine Completed Successfully! <<<\n");
}

void setup() {
  Serial.begin(115200);
  delay(400);

  pinMode(PIN_LED_ONBOARD, OUTPUT);
  digitalWrite(PIN_LED_ONBOARD, HIGH);

  // Relays
  digitalWrite(PIN_RELAY_1_HEATER, relayActiveLow ? HIGH : LOW);
  digitalWrite(PIN_RELAY_2_PUMP, relayActiveLow ? HIGH : LOW);
  pinMode(PIN_RELAY_1_HEATER, OUTPUT);
  pinMode(PIN_RELAY_2_PUMP, OUTPUT);

  // Stepper
  pinMode(PIN_STEPPER_IN1, OUTPUT);
  pinMode(PIN_STEPPER_IN2, OUTPUT);
  pinMode(PIN_STEPPER_IN3, OUTPUT);
  pinMode(PIN_STEPPER_IN4, OUTPUT);
  setStepperActive(false);

  printMenu();
}

void loop() {
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '1') {
      setRelay1(!relay1State);
    } else if (c == '2') {
      setRelay2(!relay2State);
    } else if (c == 's' || c == 'S') {
      setStepperActive(!stepperActive);
    } else if (c == '+') {
      setStepperRpm(stepperRpm + 2.0f);
    } else if (c == '-') {
      setStepperRpm(stepperRpm - 2.0f);
    } else if (c == 'm' || c == 'M') {
      useAltMapping = !useAltMapping;
      Serial.printf("[CONFIG] Sequence is now: %s\n", useAltMapping ? "Alt Sequential (IN1-2-3-4)" : "Standard Dual-Phase (IN1-3-2-4)");
    } else if (c == 'i' || c == 'I') {
      relayActiveLow = !relayActiveLow;
      Serial.printf("[CONFIG] Relay polarity is now: %s\n", relayActiveLow ? "Active-LOW" : "Active-HIGH");
      setRelay1(relay1State);
      setRelay2(relay2State);
    } else if (c == 'a' || c == 'A') {
      runAutoDiagnostic();
    } else if (c == 'h' || c == 'H') {
      printMenu();
    }
  }

  updateStepper();
}
