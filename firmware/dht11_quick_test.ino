/*
  =============================================================================
  iKwath - DHT11 Temperature & Humidity Sensor Standalone Quick Test Tool
  =============================================================================
  This sketch verifies and tests your DHT11 sensor connected to the ESP32.
  
  WIRING INSTRUCTIONS:
  -----------------------------------------------------------------------------
  For 3-PIN DHT11 MODULE (Breakout Board with built-in pullup resistor):
    - Pin '+' / 'VCC'  -> ESP32 3.3V (or 5V / Vin)
    - Pin '-' / 'GND'  -> ESP32 GND
    - Pin 'S' / 'DATA' -> ESP32 GPIO 15 (or GPIO 19)
    (No external resistor needed for 3-pin module!)

  For 4-PIN RAW DHT11 SENSOR (Blue grid casing, pins facing down):
    - Pin 1 (VCC - Leftmost)   -> ESP32 3.3V
    - Pin 2 (DATA)             -> ESP32 GPIO 15 (or GPIO 19)
    - Pin 3 (NC)               -> Not Connected (Leave floating)
    - Pin 4 (GND - Rightmost)  -> ESP32 GND
    - Resistor: Place a 10kΩ (or 4.7kΩ) resistor between Pin 1 (VCC) and Pin 2 (DATA).
  -----------------------------------------------------------------------------
  
  REQUIRED ARDUINO LIBRARIES:
  1. "DHT sensor library" by Adafruit (Install via Arduino Library Manager)
  2. "Adafruit Unified Sensor" by Adafruit (Dependency automatically prompted)
  =============================================================================
*/

#include <Arduino.h>
#include <DHT.h>

// =============================================================================
// PIN CONFIGURATION
// =============================================================================
#define DHTPIN        15      // GPIO 15 (Adjacent to GND & 3V3 on ESP32 DevKit)
#define DHTTYPE       DHT11   // DHT 11 (Change to DHT22 if using white DHT22 sensor)

DHT dht(DHTPIN, DHTTYPE);

unsigned long lastReadTime = 0;
unsigned long readInterval = 1000; // DHT11 sampling interval: 1 second
int readCount = 0;
int failCount = 0;

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n========================================================");
  Serial.println("       iKwath DHT11 Sensor Diagnostic & Quick Test       ");
  Serial.println("========================================================");
  Serial.printf("[INFO] Initializing DHT11 on GPIO %d...\n", DHTPIN);
  
  dht.begin();
  
  Serial.println("[INFO] Sensor initialized.");
  Serial.println("[INFO] Note: DHT11 reads temperature (0-50°C) and humidity (20-90% RH).");
  Serial.println("[INFO] Sampling every 1 second. Blow warm breath on sensor to test!");
  Serial.println("--------------------------------------------------------\n");
}

void loop() {
  unsigned long now = millis();
  if (now - lastReadTime < readInterval) {
    return;
  }
  lastReadTime = now;
  readCount++;

  // Reading temperature or humidity takes about 250 milliseconds!
  // Sensor readings may also be up to 2 seconds 'old' (it's a very slow sensor)
  float humidity = dht.readHumidity();
  // Read temperature as Celsius (the default)
  float tempC = dht.readTemperature();
  // Read temperature as Fahrenheit (isFahrenheit = true)
  float tempF = dht.readTemperature(true);

  // Check if any reads failed and exit early (to try again).
  if (isnan(humidity) || isnan(tempC) || isnan(tempF)) {
    failCount++;
    Serial.printf("[ERROR #%d] ⚠️ Failed to read from DHT11 sensor on GPIO %d!\n", failCount, DHTPIN);
    Serial.println("  Troubleshooting Checklist:");
    Serial.println("  1. Verify VCC is connected to ESP32 3.3V (or 5V) and GND to ESP32 GND.");
    Serial.println("  2. Verify DATA wire is plugged into GPIO 15.");
    Serial.println("  3. If using a 4-pin raw sensor, ensure a 4.7kΩ to 10kΩ pull-up is placed between VCC and DATA.");
    Serial.println("  4. Check for loose jumper wires on the breadboard.\n");

    // Output JSON for Web Serial monitor compatibility
    Serial.printf("{\"type\":\"dht11_diag\",\"status\":\"ERROR\",\"gpio\":%d,\"fails\":%d}\n", DHTPIN, failCount);
    return;
  }

  // Compute heat index in Celsius (isFahreheit = false)
  float heatIndexC = dht.computeHeatIndex(tempC, humidity, false);
  float heatIndexF = dht.computeHeatIndex(tempF, humidity);

  Serial.printf(">> [#%03d] 🌡️ Temp: %.1f °C (%.1f °F)  |  💧 Humidity: %.1f %%  |  🔥 Heat Index: %.1f °C  |  Status: ", 
                readCount, tempC, tempF, humidity, heatIndexC);

  if (tempC < 25.0) {
    Serial.println("COOL / AMBIENT ROOM");
  } else if (tempC < 32.0) {
    Serial.println("ROOM TEMPERATURE (Warm)");
  } else if (tempC < 42.0) {
    Serial.println("WARMING / BODY HEAT DETECTED 🔥");
  } else {
    Serial.println("HOT / EXTRACTION ZONE ☕");
  }

  // JSON output for Web Serial Console / Dashboard
  Serial.printf("{\"type\":\"dht11_diag\",\"status\":\"OK\",\"temp_c\":%.1f,\"temp_f\":%.1f,\"humidity\":%.1f,\"heat_index_c\":%.1f,\"gpio\":%d}\n",
                tempC, tempF, humidity, heatIndexC, DHTPIN);
}
