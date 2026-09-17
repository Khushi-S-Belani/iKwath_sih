/*
 * Step 1: Push Button Test
 * Pin: GPIO 4 to GND (internal pull-up)
 */

#define BUTTON_PIN 4

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Use internal pull-up resistor
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  Serial.println("\n==========================================");
  Serial.println("   iKwath - Step 1: Push Button Test");
  Serial.println("==========================================");
  Serial.println("Wiring Check:");
  Serial.println("  - One side of Button -> ESP32 GPIO 4");
  Serial.println("  - Other side of Button -> ESP32 GND");
  Serial.println("------------------------------------------");
  Serial.println("Waiting for button press...\n");
}

int lastState = HIGH;

void loop() {
  int currentState = digitalRead(BUTTON_PIN);
  
  // Detect press transition (HIGH -> LOW)
  if (currentState == LOW && lastState == HIGH) {
    Serial.println(">>> [OK] BUTTON PRESSED! (GPIO 4 connected to GND)");
    delay(200); // Debounce
  } else if (currentState == HIGH && lastState == LOW) {
    Serial.println("--- [INFO] Button Released");
    delay(50);
  }
  
  lastState = currentState;
  delay(20);
}
