/*
  =============================================================================
  iKwath - ESP32 Built-in LED & Serial Test Sketch
  =============================================================================
  This quick test sketch blinks the onboard LED to verify your ESP32 board
  and USB connection.
  
  How to upload:
  1. Open this file in Arduino IDE.
  2. Select: Tools -> Board -> ESP32 Dev Module
  3. Select: Tools -> Port -> (Your COM port)
  4. Click the Upload (➡️) button.
  =============================================================================
*/

#include <Arduino.h>

// Common built-in LED pins across ESP32 board variants
#define LED_PIN_1  2   // Standard ESP32 DevKit onboard blue LED
#define LED_PIN_2  5   // Alternate ESP32 variant LED
#define LED_PIN_3  4   // Alternate ESP32 variant LED

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n\n========================================");
  Serial.println("  ESP32 Onboard LED & Serial Test Ready ");
  Serial.println("========================================");

  pinMode(LED_PIN_1, OUTPUT);
  pinMode(LED_PIN_2, OUTPUT);
  pinMode(LED_PIN_3, OUTPUT);
}

void loop() {
  // Turn LEDs ON
  digitalWrite(LED_PIN_1, HIGH);
  digitalWrite(LED_PIN_2, HIGH);
  digitalWrite(LED_PIN_3, HIGH);
  Serial.println(">> LED is ON (GPIO 2, 4, 5 HIGH)");
  delay(500);

  // Turn LEDs OFF (in case board is active-LOW)
  digitalWrite(LED_PIN_1, LOW);
  digitalWrite(LED_PIN_2, LOW);
  digitalWrite(LED_PIN_3, LOW);
  Serial.println(">> LED is OFF (GPIO 2, 4, 5 LOW)");
  delay(500);
}
