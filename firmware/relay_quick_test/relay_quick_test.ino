/*
  =============================================================================
  iKwath - 2PH63091A 2-Channel Relay Module Diagnostic Test Tool
  =============================================================================
  Hardware Connections:
  - 2PH63091A VCC  --> ESP32 5V (VIN)
  - 2PH63091A GND  --> ESP32 GND
  - 2PH63091A IN1  --> ESP32 GPIO 27 (Relay 1 - Heater)
  - 2PH63091A IN2  --> ESP32 GPIO 26 (Relay 2 - Water Pump)
  - JD-VCC Jumper  --> Keep jumper cap connected across JD-VCC and VCC

  Active-LOW Logic:
  - LOW  (0V)   = Relay ON  (Coil energized, COM connects to NO, LED lights up)
  - HIGH (3.3V) = Relay OFF (Coil de-energized, COM disconnects from NO)

  Interactive Serial Commands (115200 baud):
  - Send '1' -> Toggle Relay 1 (GPIO 27)
  - Send '2' -> Toggle Relay 2 (GPIO 26)
  - Send 'b' -> Toggle Both Relays
  - Send 'a' -> Start/Stop Automated 2-second clicking cycle
  - Send 'i' -> Invert Trigger Polarity (Active-LOW <-> Active-HIGH)
  =============================================================================
*/

#include <Arduino.h>

#define PIN_RELAY_1_HEATER   27   // Relay Channel 1 (IN1)
#define PIN_RELAY_2_PUMP     26   // Relay Channel 2 (IN2)
#define PIN_LED_ONBOARD       2   // ESP32 Blue Status LED

// Active LOW: LOW = ON, HIGH = OFF
bool activeLow = true;
bool relay1State = false;
bool relay2State = false;
bool autoCycleMode = true;
unsigned long lastCycleTime = 0;
int cycleStep = 0;

void applyRelays() {
  if (activeLow) {
    digitalWrite(PIN_RELAY_1_HEATER, relay1State ? LOW : HIGH);
    digitalWrite(PIN_RELAY_2_PUMP,   relay2State ? LOW : HIGH);
  } else {
    digitalWrite(PIN_RELAY_1_HEATER, relay1State ? HIGH : LOW);
    digitalWrite(PIN_RELAY_2_PUMP,   relay2State ? HIGH : LOW);
  }
  
  // ESP32 onboard LED reflects if ANY relay is active
  digitalWrite(PIN_LED_ONBOARD, (relay1State || relay2State) ? HIGH : LOW);

  Serial.printf("[STATUS] Relay 1 (GPIO 27 - Heater): %s | Relay 2 (GPIO 26 - Pump): %s | Logic: %s\n",
                relay1State ? "⚡ ON  [CLOSED]" : "⚪ OFF [OPEN]  ",
                relay2State ? "⚡ ON  [CLOSED]" : "⚪ OFF [OPEN]  ",
                activeLow ? "ACTIVE-LOW" : "ACTIVE-HIGH");
}

void setRelay1(bool on) {
  relay1State = on;
  applyRelays();
}

void setRelay2(bool on) {
  relay2State = on;
  applyRelays();
}

void printHelp() {
  Serial.println("\n-------------------------------------------------------------");
  Serial.println("  2PH63091A 2-CHANNEL RELAY TEST MENU (Type command + Enter):");
  Serial.println("-------------------------------------------------------------");
  Serial.println("  1 : Toggle Relay 1 (GPIO 27 - Heater)");
  Serial.println("  2 : Toggle Relay 2 (GPIO 26 - Pump)");
  Serial.println("  b : Toggle Both Relays Together");
  Serial.println("  a : Toggle Automatic Cycle Mode (Click Test Every 2s)");
  Serial.println("  i : Invert Trigger Logic (Current: " + String(activeLow ? "Active-LOW" : "Active-HIGH") + ")");
  Serial.println("  h : Show this menu");
  Serial.println("-------------------------------------------------------------\n");
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=============================================================");
  Serial.println("  iKwath - 2PH63091A 2-Channel Relay Module Test Tool  ");
  Serial.println("=============================================================");

  pinMode(PIN_LED_ONBOARD, OUTPUT);
  pinMode(PIN_RELAY_1_HEATER, OUTPUT);
  pinMode(PIN_RELAY_2_PUMP, OUTPUT);

  // Safely initialize relays to OFF
  relay1State = false;
  relay2State = false;
  applyRelays();

  printHelp();
  Serial.println(">> Automatic cycle test is RUNNING. Listen for relay clicks! <<\n");
}

void loop() {
  // 1. Process Serial Commands
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '1') {
      autoCycleMode = false;
      relay1State = !relay1State;
      applyRelays();
    } else if (c == '2') {
      autoCycleMode = false;
      relay2State = !relay2State;
      applyRelays();
    } else if (c == 'b' || c == 'B') {
      autoCycleMode = false;
      bool target = !(relay1State || relay2State);
      relay1State = target;
      relay2State = target;
      applyRelays();
    } else if (c == 'a' || c == 'A') {
      autoCycleMode = !autoCycleMode;
      Serial.printf("[MODE] Auto-Cycle Mode is now %s\n", autoCycleMode ? "ENABLED (Testing every 2s)" : "DISABLED (Manual Mode)");
      if (!autoCycleMode) {
        relay1State = false;
        relay2State = false;
        applyRelays();
      }
    } else if (c == 'i' || c == 'I') {
      activeLow = !activeLow;
      Serial.printf("[CONFIG] Trigger polarity set to: %s\n", activeLow ? "ACTIVE-LOW (Default for 2PH63091A)" : "ACTIVE-HIGH");
      applyRelays();
    } else if (c == 'h' || c == 'H') {
      printHelp();
    }
  }

  // 2. Automated Test Cycle (Demonstrates both relays clicking cleanly)
  if (autoCycleMode) {
    unsigned long now = millis();
    if (now - lastCycleTime >= 2000) { // Step every 2 seconds
      lastCycleTime = now;
      cycleStep = (cycleStep + 1) % 4;

      switch (cycleStep) {
        case 0:
          Serial.println("\n--- Step 1: Turning Relay 1 (Heater - GPIO 27) ON ---");
          relay1State = true;
          relay2State = false;
          applyRelays();
          break;

        case 1:
          Serial.println("\n--- Step 2: Turning Relay 2 (Pump - GPIO 26) ON ---");
          relay1State = false;
          relay2State = true;
          applyRelays();
          break;

        case 2:
          Serial.println("\n--- Step 3: Turning BOTH Relays ON ---");
          relay1State = true;
          relay2State = true;
          applyRelays();
          break;

        case 3:
          Serial.println("\n--- Step 4: Turning BOTH Relays OFF ---");
          relay1State = false;
          relay2State = false;
          applyRelays();
          break;
      }
    }
  }
}
