/*
  =============================================================================
  iKwath - Dual Servo Motor Diagnostic Test Tool
  =============================================================================
  Hardware Connections:
  - Servo 1 (Stirrer Agitator)  --> Signal (Orange/Yellow): GPIO 13
  - Servo 2 (Pod Dispenser Flap)--> Signal (Orange/Yellow): GPIO 14
  - Servo Power (Red wires)      --> External 5V Power Supply (+5V)
  - Servo Ground (Brown/Black)   --> External Power Supply GND & ESP32 GND (Common GND)

  Interactive Serial Commands (115200 baud):
  - Send '1' -> Sweep Stirrer Servo 1 (GPIO 13)
  - Send '2' -> Test Pod Dispenser Servo 2 (GPIO 14)
  - Send 'b' -> Test Both Servos Simultaneously
  - Send 'a' -> Toggle Automatic Demonstration Sweep Mode
  - Send '0' -> Reset Both Servos to Home Position (0° / 30°)
  =============================================================================
*/

#include <Arduino.h>
#include <ESP32Servo.h>

#define PIN_SERVO_STIRRER    13   // Stirrer Agitator Servo
#define PIN_SERVO_POD_FLAP   14   // Pod Flap Servo
#define PIN_LED_ONBOARD       2   // ESP32 Status LED

Servo servoStirrer;
Servo servoPodFlap;

bool autoSweep = true;
unsigned long lastSweepTime = 0;
int sweepStep = 0;

void printHelp() {
  Serial.println("\n-------------------------------------------------------------");
  Serial.println("   iKwath DUAL SERVO TEST MENU (Type command + Enter):");
  Serial.println("-------------------------------------------------------------");
  Serial.println("  1 : Test Stirrer Servo (GPIO 13: 30° <-> 150° Sweep)");
  Serial.println("  2 : Test Pod Dispenser Servo (GPIO 14: 0° <-> 90° Flap)");
  Serial.println("  b : Test Both Servos Together");
  Serial.println("  a : Toggle Automatic Sweep Demo (Every 3 seconds)");
  Serial.println("  0 : Reset Both Servos to Home (Stirrer: 30°, Pod: 0°)");
  Serial.println("  h : Show this menu");
  Serial.println("-------------------------------------------------------------\n");
}

void sweepStirrer(int sweeps = 2) {
  Serial.println(">> Testing Stirrer Servo 1 (GPIO 13)...");
  for (int s = 0; s < sweeps; s++) {
    for (int pos = 30; pos <= 150; pos += 5) {
      servoStirrer.write(pos);
      delay(25);
    }
    for (int pos = 150; pos >= 30; pos -= 5) {
      servoStirrer.write(pos);
      delay(25);
    }
  }
  servoStirrer.write(30);
  Serial.println(">> Stirrer Servo test complete. Home at 30°.");
}

void testPodFlap() {
  Serial.println(">> Testing Pod Dispenser Servo 2 (GPIO 14)...");
  Serial.println("   Opening Pod Flap to 90°...");
  servoPodFlap.write(90);
  delay(1200);
  Serial.println("   Closing Pod Flap to 0°...");
  servoPodFlap.write(0);
  delay(500);
  Serial.println(">> Pod Flap test complete. Home at 0°.");
}

void testBothServos() {
  Serial.println(">> Testing Both Servos Simultaneously...");
  servoPodFlap.write(90);
  for (int pos = 30; pos <= 150; pos += 5) {
    servoStirrer.write(pos);
    delay(20);
  }
  for (int pos = 150; pos >= 30; pos -= 5) {
    servoStirrer.write(pos);
    delay(20);
  }
  servoPodFlap.write(0);
  servoStirrer.write(30);
  Serial.println(">> Dual Servo test complete.");
}

void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n=============================================================");
  Serial.println("     iKwath - Dual Servo Motor Diagnostic Tool              ");
  Serial.println("=============================================================");

  pinMode(PIN_LED_ONBOARD, OUTPUT);
  digitalWrite(PIN_LED_ONBOARD, HIGH);

  // Allocate all 4 timers for 100% reliable PWM on ESP32
  ESP32PWM::allocateTimer(0);
  ESP32PWM::allocateTimer(1);
  ESP32PWM::allocateTimer(2);
  ESP32PWM::allocateTimer(3);

  servoStirrer.setPeriodHertz(50);
  servoStirrer.attach(PIN_SERVO_STIRRER, 500, 2400);
  servoStirrer.write(30);

  servoPodFlap.setPeriodHertz(50);
  servoPodFlap.attach(PIN_SERVO_POD_FLAP, 500, 2400);
  servoPodFlap.write(0);

  printHelp();
  Serial.println(">> Automatic sweep demo is RUNNING. Watch the servo arms! <<\n");
}

void loop() {
  // 1. Process Serial Commands
  if (Serial.available() > 0) {
    char c = Serial.read();
    if (c == '1') {
      autoSweep = false;
      sweepStirrer(2);
    } else if (c == '2') {
      autoSweep = false;
      testPodFlap();
    } else if (c == 'b' || c == 'B') {
      autoSweep = false;
      testBothServos();
    } else if (c == '0') {
      autoSweep = false;
      servoStirrer.write(30);
      servoPodFlap.write(0);
      Serial.println("[HOME] Servos moved to home positions.");
    } else if (c == 'a' || c == 'A') {
      autoSweep = !autoSweep;
      Serial.printf("[MODE] Automatic Sweep Demo is now %s\n", autoSweep ? "ENABLED" : "DISABLED");
    } else if (c == 'h' || c == 'H') {
      printHelp();
    }
  }

  // 2. Automatic Sweep Demo
  if (autoSweep) {
    unsigned long now = millis();
    if (now - lastSweepTime >= 3500) {
      lastSweepTime = now;
      sweepStep = (sweepStep + 1) % 3;

      if (sweepStep == 0) {
        sweepStirrer(1);
      } else if (sweepStep == 1) {
        testPodFlap();
      } else if (sweepStep == 2) {
        testBothServos();
      }
    }
  }
}
