/*
  =============================================================================
  iKwath - Hall Flow Sensor Standalone Quick Test & Calibration Diagnostic
  =============================================================================
  Pinout:
  - RED wire (VCC)    -> ESP32 5V (VIN) or 3.3V
  - BLACK wire (GND)  -> ESP32 GND
  - YELLOW wire (PULSE/SIGNAL) -> ESP32 GPIO 18 (Uses INPUT_PULLUP)
  
  HOW TO TEST:
  1. Gently blow air through the 6mm flow sensor or run a cup of water through it.
  2. Watch the LED flash on each pulse and observe the live volume (mL) & pulse count!
  =============================================================================
*/

#include <Arduino.h>

#define PIN_FLOW_SENSOR   18  // GPIO 18 Interrupt
#define PIN_LED_BUILTIN    2  // Built-in Blue LED flashes on water flow

// Calibration: 18,000 pulses = 400 mL => 18000 / 400 = 45.0 pulses/mL (45,000 pulses/L)
float calibrationFactor = 45.0f; 

volatile unsigned long pulseCount = 0;
volatile unsigned long lastPulseTime = 0;
unsigned long lastPrintTime = 0;
unsigned long previousPulses = 0;

void IRAM_ATTR onFlowPulse() {
  pulseCount++;
  lastPulseTime = millis();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n========================================================");
  Serial.println("       iKwath Flow Sensor Diagnostic & Quick Test       ");
  Serial.println("========================================================");
  Serial.println("[INFO] Initializing Flow Sensor on GPIO 18...");

  pinMode(PIN_FLOW_SENSOR, INPUT_PULLUP);
  pinMode(PIN_LED_BUILTIN, OUTPUT);
  digitalWrite(PIN_LED_BUILTIN, LOW);

  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_SENSOR), onFlowPulse, RISING);

  Serial.printf("[READY] Calibration Factor: %.2f pulses/mL\n", calibrationFactor);
  Serial.println("[TEST] Blow into the sensor or pour water to test pulses!\n");
  Serial.println("--------------------------------------------------------");
}

void loop() {
  unsigned long now = millis();

  // Flash LED if pulse received in last 80ms
  if (now - lastPulseTime < 80) {
    digitalWrite(PIN_LED_BUILTIN, HIGH);
  } else {
    digitalWrite(PIN_LED_BUILTIN, LOW);
  }

  // Print diagnostics every 500ms
  if (now - lastPrintTime >= 500) {
    unsigned long dt = now - lastPrintTime;
    lastPrintTime = now;

    unsigned long total = pulseCount;
    unsigned long delta = total - previousPulses;
    previousPulses = total;

    float totalMl = total / calibrationFactor;
    float flowRateLpm = 0.0f;
    if (dt > 0) {
      flowRateLpm = (float(delta) / calibrationFactor) * (60000.0f / dt) / 1000.0f;
    }

    if (delta > 0) {
      Serial.printf(">> 💧 FLOW DETECTED! Total: %.1f mL | Pulses: %lu | Rate: %.2f L/min\n", 
                    totalMl, total, flowRateLpm);
    } else if (total > 0) {
      Serial.printf("   [IDLE] Total Dispensed: %.1f mL (Pulses: %lu)\n", totalMl, total);
    } else {
      Serial.println("   [WAITING] No flow detected on GPIO 18. Blow air through sensor to test...");
    }

    // Output JSON packet for Web Serial monitor compatibility
    Serial.printf("{\"type\":\"flow_diag\",\"water_ml\":%.1f,\"pulses\":%lu,\"rate_lpm\":%.2f}\n",
                  totalMl, total, flowRateLpm);
  }

  // Handle Serial Commands (e.g. "RESET" or "CAL:5.88")
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    if (cmd.equalsIgnoreCase("RESET") || cmd.indexOf("reset") >= 0) {
      pulseCount = 0;
      previousPulses = 0;
      Serial.println("\n[RESET] Flow pulse counter reset to 0 mL.\n");
    } else if (cmd.startsWith("CAL:") || cmd.startsWith("cal:")) {
      float f = cmd.substring(4).toFloat();
      if (f > 0.1f) {
        calibrationFactor = f;
        Serial.printf("\n[CALIBRATION] Calibration factor set to: %.2f pulses/mL\n\n", calibrationFactor);
      }
    }
  }
}
