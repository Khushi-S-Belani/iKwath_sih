/*
  =============================================================================
  iKwath - DS18B20 Temperature Sensor Standalone Quick Test & Diagnostic Tool
  =============================================================================
  This sketch tests your DS18B20 temperature sensor connected to the ESP32.
  
  WIRING:
  - RED wire (VCC)    -> ESP32 3.3V (or 5V)
  - BLACK wire (GND)  -> ESP32 GND
  - YELLOW wire (DATA)-> ESP32 GPIO 15 (Adjacent to GND & 3.3V)
  - 4.7kΩ Resistor    -> Between VCC (3.3V) and DATA (GPIO 15)
  
  HOW TO TEST WITHOUT A LIGHTER / FLAME:
  1. Touch and hold the metal sensor probe firmly in your hand/fingers.
  2. Watch the temperature rise from room temperature (~24-27°C) to body temperature (~33-36°C)!
  3. Or dip the waterproof probe in a cup of warm water!
  =============================================================================
*/

#include <Arduino.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define ONE_WIRE_BUS 15 // GPIO 15 on ESP32 (Adjacent to GND & 3V3)

OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

DeviceAddress tempDeviceAddress;
int numberOfDevices = 0;

// Helper to print 64-bit DS18B20 ROM Address
void printAddress(DeviceAddress deviceAddress) {
  for (uint8_t i = 0; i < 8; i++) {
    if (deviceAddress[i] < 16) Serial.print("0");
    Serial.print(deviceAddress[i], HEX);
    if (i < 7) Serial.print(":");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n\n========================================================");
  Serial.println("     iKwath DS18B20 Temperature Sensor Quick Test      ");
  Serial.println("========================================================");
  Serial.println("[INFO] Initializing OneWire bus on GPIO 19...");

  sensors.begin();
  numberOfDevices = sensors.getDeviceCount();

  Serial.print("[INFO] Found ");
  Serial.print(numberOfDevices, DEC);
  Serial.println(" OneWire device(s).");

  if (numberOfDevices == 0) {
    Serial.println("\n[ERROR] No DS18B20 sensor found! Please check:");
    Serial.println("  1. Is the 4.7kΩ pull-up resistor connected between 3.3V and GPIO 19?");
    Serial.println("  2. Is RED wire to 3.3V, BLACK to GND, and YELLOW to GPIO 19?");
    Serial.println("  3. Are all breadboard connections firm?");
  } else {
    for (int i = 0; i < numberOfDevices; i++) {
      if (sensors.getAddress(tempDeviceAddress, i)) {
        Serial.print("[INFO] Sensor #");
        Serial.print(i);
        Serial.print(" ROM Address: ");
        printAddress(tempDeviceAddress);
        Serial.println();

        // Set 10-bit resolution (fast 187ms conversion time, 0.25°C precision)
        sensors.setResolution(tempDeviceAddress, 10);
        Serial.print("[INFO] Resolution set to: ");
        Serial.print(sensors.getResolution(tempDeviceAddress), DEC);
        Serial.println(" bits.");
      }
    }
    Serial.println("\n[READY] Starting continuous temperature reading. (Touch probe to see temp rise!)");
    Serial.println("--------------------------------------------------------");
  }
}

void loop() {
  if (numberOfDevices == 0) {
    // Retry finding device every 2 seconds
    sensors.begin();
    numberOfDevices = sensors.getDeviceCount();
    if (numberOfDevices > 0) {
      Serial.println("\n[SUCCESS] DS18B20 sensor detected!");
    } else {
      Serial.println("[WAITING] Still searching for DS18B20 on GPIO 19 (check wiring & 4.7k resistor)...");
    }
    delay(2000);
    return;
  }

  // Request temperature from all sensors on bus
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);
  float tempF = DallasTemperature::toFahrenheit(tempC);

  if (tempC == DEVICE_DISCONNECTED_C || tempC == -127.0f) {
    Serial.println("[ERROR] Sensor disconnected or communication error (-127°C). Check wiring!");
  } else if (tempC == 85.0f) {
    Serial.println("[WARNING] Sensor returned power-on reset value (85.0°C). Check VCC power connection.");
  } else {
    Serial.print(">> Live Temp: ");
    Serial.print(tempC, 2);
    Serial.print(" °C  |  ");
    Serial.print(tempF, 2);
    Serial.print(" °F  |  Status: ");

    if (tempC < 28.0) {
      Serial.println("ROOM TEMPERATURE (Ambient)");
    } else if (tempC < 38.0) {
      Serial.println("WARMING / BODY HEAT DETECTED 🔥");
    } else if (tempC < 70.0) {
      Serial.println("WARM WATER");
    } else if (tempC < 95.0) {
      Serial.println("EXTRACTION / SIMMERING RANGE 🌿");
    } else {
      Serial.println("BOILING / DECOCTION READY ☕");
    }
  }

  // Output JSON packet for Web Serial monitor compatibility
  Serial.print("{\"type\":\"ds18b20_diag\",\"temp_c\":");
  Serial.print(tempC, 2);
  Serial.print(",\"temp_f\":");
  Serial.print(tempF, 2);
  Serial.print(",\"devices\":");
  Serial.print(numberOfDevices);
  Serial.println("}");

  delay(1000); // 1-second update interval
}
