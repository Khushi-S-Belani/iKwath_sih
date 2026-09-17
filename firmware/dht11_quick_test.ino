/*
  =============================================================================
  iKwath - DHT11 Temperature & Humidity Sensor Standalone Quick Test Tool
  (Zero-Dependency Edition - No External Library Required!)
  =============================================================================
  This sketch tests your DHT11 sensor connected to ESP32 without requiring
  any library installation in Arduino IDE.
  
  WIRING INSTRUCTIONS:
  - VCC  -> ESP32 3.3V
  - GND  -> ESP32 GND
  - DATA -> ESP32 GPIO 15
  =============================================================================
*/

#include <Arduino.h>

#define PIN_DHT_DATA 15 // GPIO 15 (Adjacent to GND & 3V3)

// Standalone DHT11 Driver
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

    // 1. Send Start Signal (Hold LOW for 20ms)
    pinMode(_pin, OUTPUT);
    digitalWrite(_pin, LOW);
    delay(20);
    digitalWrite(_pin, HIGH);
    delayMicroseconds(30);
    pinMode(_pin, INPUT_PULLUP);

    // 2. Wait for Response (80µs LOW, 80µs HIGH)
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

    // 3. Read 40 Data Bits
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

SimpleDHT11 dht(PIN_DHT_DATA);
unsigned long lastReadTime = 0;
int readCount = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n========================================================");
  Serial.println("       iKwath DHT11 Sensor Diagnostic & Quick Test       ");
  Serial.println("========================================================");
  Serial.printf("[INFO] Initializing DHT11 on GPIO %d...\n", PIN_DHT_DATA);
  
  dht.begin();
  
  Serial.println("[INFO] Sensor initialized.");
  Serial.println("[INFO] Sampling every 1 second. Blow warm breath on sensor to test!");
  Serial.println("--------------------------------------------------------\n");
}

void loop() {
  unsigned long now = millis();
  if (now - lastReadTime < 1000) return;
  lastReadTime = now;
  readCount++;

  float tempC = 0.0f;
  float humidity = 0.0f;
  bool ok = dht.read(tempC, humidity);

  if (!ok) {
    Serial.printf("[ERROR] ⚠️ Failed to read from DHT11 on GPIO %d! Check VCC, GND & DATA.\n", PIN_DHT_DATA);
    return;
  }

  float tempF = (tempC * 1.8f) + 32.0f;
  Serial.printf(">> [#%03d] 🌡️ Temp: %.1f °C (%.1f °F)  |  💧 Humidity: %.1f %%  |  Status: ", 
                readCount, tempC, tempF, humidity);

  if (tempC < 25.0) {
    Serial.println("COOL / AMBIENT ROOM");
  } else if (tempC < 32.0) {
    Serial.println("ROOM TEMPERATURE (Warm)");
  } else if (tempC < 42.0) {
    Serial.println("WARMING / BODY HEAT DETECTED 🔥");
  } else {
    Serial.println("HOT / EXTRACTION ZONE ☕");
  }
}
