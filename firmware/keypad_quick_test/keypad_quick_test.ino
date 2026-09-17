/*
  =============================================================================
  iKwath - 4x4 Matrix Keypad Diagnostic Test Tool
  =============================================================================
  Hardware Connections (8-Pin Ribbon Header):
  - Pin 1 (Row 1: 1, 2, 3, A) --> ESP32 GPIO 32
  - Pin 2 (Row 2: 4, 5, 6, B) --> ESP32 GPIO 33
  - Pin 3 (Row 3: 7, 8, 9, C) --> ESP32 GPIO 23
  - Pin 4 (Row 4: *, 0, #, D) --> ESP32 GPIO 22
  - Pin 5 (Col 1: 1, 4, 7, *) --> ESP32 GPIO 21
  - Pin 6 (Col 2: 2, 5, 8, 0) --> ESP32 GPIO 17
  - Pin 7 (Col 3: 3, 6, 9, #) --> ESP32 GPIO 16
  - Pin 8 (Col 4: A, B, C, D) --> ESP32 GPIO 5

  Requirements:
  - Install 'Keypad' library by Mark Stanley, Alexander Brevig in Arduino IDE
    (Sketch -> Include Library -> Manage Libraries... -> search 'Keypad')
  =============================================================================
*/

#include <Arduino.h>
#include <Keypad.h>

const byte ROWS = 4;
const byte COLS = 4;

char keys[ROWS][COLS] = {
  {'1','2','3','A'},
  {'4','5','6','B'},
  {'7','8','9','C'},
  {'*','0','#','D'}
};

// Row & Column Pin Assignments for ESP32
byte rowPins[ROWS] = {32, 33, 23, 22}; // R1, R2, R3, R4
byte colPins[COLS] = {21, 17, 16, 5};  // C1, C2, C3, C4

Keypad keypad = Keypad(makeKeymap(keys), rowPins, colPins, ROWS, COLS);

#define PIN_LED_ONBOARD 2

void setup() {
  Serial.begin(115200);
  delay(500);

  pinMode(PIN_LED_ONBOARD, OUTPUT);
  digitalWrite(PIN_LED_ONBOARD, HIGH);

  Serial.println("\n=============================================================");
  Serial.println("         iKwath - 4x4 Matrix Keypad Diagnostic Test          ");
  Serial.println("=============================================================");
  Serial.println("Wiring Check (Looking at 8-pin ribbon left-to-right):");
  Serial.println("  Pin 1 (R1) -> GPIO 32   |  Pin 5 (C1) -> GPIO 21");
  Serial.println("  Pin 2 (R2) -> GPIO 33   |  Pin 6 (C2) -> GPIO 17");
  Serial.println("  Pin 3 (R3) -> GPIO 23   |  Pin 7 (C3) -> GPIO 16");
  Serial.println("  Pin 4 (R4) -> GPIO 22   |  Pin 8 (C4) -> GPIO 5");
  Serial.println("-------------------------------------------------------------");
  Serial.println(">> Press any key on the membrane keypad to test! <<\n");
}

void loop() {
  char key = keypad.getKey();

  if (key != NO_KEY) {
    // Blink LED on keypress
    digitalWrite(PIN_LED_ONBOARD, LOW);
    delay(30);
    digitalWrite(PIN_LED_ONBOARD, HIGH);

    Serial.printf("[KEYPAD] 🔘 Key Pressed: '%c'\n", key);

    // Show mapped action in iKwath machine
    switch (key) {
      case 'A': Serial.println("          ↳ Action: [START] Start Ayurvedic Kwatha Brew Cycle"); break;
      case 'B': Serial.println("          ↳ Action: [PAUSE] Pause / Resume Cycle"); break;
      case 'C': Serial.println("          ↳ Action: [CLEAN] Run Hot Water Cleaning Routine"); break;
      case 'D': Serial.println("          ↳ Action: [STOP] Emergency Stop / Reset"); break;
      case '*': Serial.println("          ↳ Action: [PUMP] Manual Water Pump Toggle"); break;
      case '#': Serial.println("          ↳ Action: [HEATER] Manual Heater Relay Toggle"); break;
      case '1': Serial.println("          ↳ Action: [PRESET] Set Target Volume: 100 mL"); break;
      case '2': Serial.println("          ↳ Action: [PRESET] Set Target Volume: 200 mL"); break;
      case '3': Serial.println("          ↳ Action: [PRESET] Set Target Volume: 400 mL"); break;
      case '4': Serial.println("          ↳ Action: [TEMP] Set Target Temp: 60 °C (Mild)"); break;
      case '5': Serial.println("          ↳ Action: [TEMP] Set Target Temp: 85 °C (Standard)"); break;
      case '6': Serial.println("          ↳ Action: [TEMP] Set Target Temp: 95 °C (Intense)"); break;
      default: break;
    }
  }
}
