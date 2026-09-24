# iKwath ESP32 — Complete Hardware Connections & Wiring Guide

This document contains **detailed, standardized reference tables** for all circuit connections, pinouts, power rails, load switching, and step-by-step operation of the **iKwath Smart Automated Ayurvedic Decoction Machine**.

---

## 1. Master Pinout & Hardware Connection Table

| # | Component | Component Pin / Wire | ESP32 Pin | Power Source / Rail | Wire Color | Signal / Logic Type | Functional Role |
| :-: | :--- | :--- | :---: | :---: | :---: | :--- | :--- |
| **1** | **Push Button** | Terminal 1<br>Terminal 2 | **GPIO 4**<br>**GND** | 3.3V Logic | **Blue**<br>**Black** | `INPUT_PULLUP`<br>(Active LOW) | • **Home Screen**: Awakens machine & opens Kadha catalog<br>• **Selection Screen**: Starts brew cycle<br>• **Active Brew**: Toggles Pause / Resume |
| **2** | **Servo Motor**<br>*(Pod Door Flap)* | Signal (PWM)<br>VCC (+)<br>GND (-) | **GPIO 14**<br>—<br>**GND** | Ext **+5V**<br>Ext **+5V**<br>Common **GND** | **Orange / Yellow**<br>**Red**<br>**Brown / Black** | 50Hz PWM<br>(500–2400µs) | • **0°**: Closed door<br>• **90°**: Opens for **5 seconds** for user pod insertion |
| **3** | **Hall Flow Sensor**<br>*(Water Intake)* | Pulse (Signal)<br>VCC (+)<br>GND (-) | **GPIO 18**<br>—<br>**GND** | **+5V** (Vin)<br>**+5V** (Vin)<br>Common **GND** | **Yellow**<br>**Red**<br>**Black** | Digital Pulse<br>(Hardware Interrupt) | Counts flow pulses (`FALLING`). Shuts Relay 2 pump OFF at **400 mL**. |
| **4** | **DS18B20 Sensor**<br>*(Temp Sensor)* | DATA (Yellow/Signal)<br>VCC (Red/+)<br>GND (Black/-) | **GPIO 15**<br>—<br>**GND** | **+3.3V** (or 5V)<br>**+3.3V** (or 5V)<br>Common **GND** | **Yellow**<br>**Red**<br>**Black** | OneWire Digital Protocol<br>(4.7kΩ pull-up to 3.3V) | High-precision immersion temperature probe (-55°C to +125°C). Shuts Relay 1 heater OFF at **35°C**. |
| **5** | **ULN2003A Driver**<br>*(Stepper Stirrer)* | `IN1`<br>`IN2`<br>`IN3`<br>`IN4`<br>`+` (VCC)<br>`-` (GND) | **GPIO 13**<br>**GPIO 12**<br>**GPIO 19**<br>**GPIO 23**<br>—<br>**GND** | Ext **+5V**<br>Ext **+5V**<br>Ext **+5V**<br>Ext **+5V**<br>Ext **+5V**<br>Common **GND** | **Blue**<br>**Purple**<br>**Grey**<br>**White**<br>**Red**<br>**Black** | 4-Phase Output<br>(Active HIGH) | Drives 28BYJ-48 unipolar stepper in 8-step half-stepping agitation for **10 seconds**, then de-energizes all coils. |
| **6** | **2-Channel Relay**<br>*(2PH63091A)* | `IN1` (Heater)<br>`IN2` (Pump)<br>`VCC`<br>`GND` | **GPIO 27**<br>**GPIO 26**<br>—<br>**GND** | **+5V** (Vin)<br>**+5V** (Vin)<br>**+5V** (Vin)<br>Common **GND** | **Yellow**<br>**Orange**<br>**Red**<br>**Black** | Optocoupler<br>(Active LOW) | • **Relay 1 (GPIO 27)**: Switches AC/DC Heating Element<br>• **Relay 2 (GPIO 26)**: Switches 12V/5V Peristaltic Water Pump |
| **7** | **Active Piezo Buzzer** | Positive (+)<br>Negative (-) | **GPIO 25**<br>**GND** | 3.3V–5V Logic | **Red**<br>**Black** | Active HIGH<br>(2.4 kHz Tone) | Audio chirps on button clicks and 3 victory beeps on completion. |
| **8** | **Onboard Status LED** | Anode | **GPIO 2** | Internal 3.3V | — | Active HIGH | Solid Blue when ESP32 is powered and running. |

---

## 2. Relay Module Terminal & Load-Side Connection Table

| Relay Channel | ESP32 Control Pin | Trigger Logic | Module Terminal | Connected To | Wire / Voltage | Operation |
| :--- | :---: | :---: | :--- | :--- | :--- | :--- |
| **Channel 1**<br>*(Heater)* | **GPIO 27** | **Active LOW**<br>(0V = ON,<br>3.3V = OFF) | **`COM1`**<br>**`NO1`**<br>`NC1` | Power Supply Live / (+)<br>Heater Element Live / (+)<br>*(Unconnected)* | AC Live or DC (+)<br>AC Live or DC (+)<br>— | Closes contact during **Heating Phase** until DS18B20 temperature reaches formulation target (85°C–92°C). |
| **Channel 2**<br>*(Water Pump)* | **GPIO 26** | **Active LOW**<br>(0V = ON,<br>3.3V = OFF) | **`COM2`**<br>**`NO2`**<br>`NC2` | Pump Supply (+12V or +5V)<br>Water Pump (+) Lead<br>*(Unconnected)* | DC (+12V / +5V)<br>DC (+12V / +5V)<br>— | Closes contact during **Water Fill Phase** until flow sensor registers **400 mL**. |

> [!IMPORTANT]
> **Heater / Pump Negative Return**:
> - The **Heater Neutral / (-)** wire connects directly to the power supply Neutral / (-).
> - The **Pump (-) motor wire** connects directly to the pump power supply Ground / (-).
> - Relays only switch the Live / (+) side for safety.

---

## 3. Power Distribution & Common Ground Rails Table

| Power Rail | Voltage Level | Powered By | Supplies Power To | Notes & Precautions |
| :--- | :---: | :--- | :--- | :--- |
| **3.3V Rail** | **3.3V DC** | ESP32 Internal LDO (3V3 Pin) | • Push Button Pull-up<br>• DS18B20 Sensor VCC<br>• Active Buzzer Logic | Max 250mA total draw. Do not connect motors or relays here. |
| **5V Rail** | **5V DC** | ESP32 Vin (USB 5V) OR External 5V 2A–3A Supply | • 2-Channel Relay VCC<br>• Hall Flow Sensor VCC<br>• Pod Flap Servo VCC<br>• ULN2003A Stepper VCC | High current rail. External 5V 2A supply recommended for smooth motor motion. |
| **12V Rail** *(Optional)* | **12V DC** | External 12V 2A DC Adapter | • Peristaltic Pump DC Motor (Switched via Relay 2) | Dedicated motor rail. |
| **Common GND** | **0V (GND)** | Interconnected Common Ground Bus | • ESP32 GND<br>• External 5V GND<br>• External 12V GND<br>• All sensor & driver GNDs | **All grounds MUST be connected together** to maintain a common voltage reference. |

---

## 4. 28BYJ-48 Stepper Motor & ULN2003A Driver Table

| Motor Wire Color | Internal Phase Coil | ULN2003A Driver Output | Driver Input Pin | ESP32 GPIO Pin | Dual-Phase High-Torque Matrix (4-Step @ 12-15 RPM) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **Blue** | Coil 1 | `OUT1` | **`IN1`** | **GPIO 13** | Step 0 (IN1+IN3), Step 3 (IN4+IN1) |
| **Pink** | Coil 3 | `OUT2` | **`IN2`** | **GPIO 12** | Step 1 (IN3+IN2), Step 2 (IN2+IN4) |
| **Yellow** | Coil 2 | `OUT3` | **`IN3`** | **GPIO 19** | Step 0 (IN1+IN3), Step 1 (IN3+IN2) |
| **Orange** | Coil 4 | `OUT4` | **`IN4`** | **GPIO 23** | Step 2 (IN2+IN4), Step 3 (IN4+IN1) |
| **Red** | Center Tap (VCC) | Header Pin 5 | `+` (VCC) | External **+5V** | Constant +5V supply (Jumper cap ON) |

- **Exact Speed Calibration**: **12.0 - 15.0 RPM** (2048 steps per 360° output revolution).
- **High-Torque Dual-Coil Drive**: Two coils are energized simultaneously on every step, delivering 100% higher torque to prevent stalling or vibration.
- **Direction Toggle**: Reverses direction smoothly every 2048 steps (1 full 360° revolution) for thorough fluid agitation.
- **Automatic De-energize**: After stirring, all 4 GPIOs (`13, 12, 19, 23`) are set to `LOW` to completely prevent motor coil and ULN2003 chip heating.

---

## 5. Sensor Thresholds & Calibration Reference Table

| Sensor | ESP32 Pin | Default Calibration | Target / Cutoff Value | Fallback / Timeout Safety | Action on Target Reached |
| :--- | :---: | :--- | :---: | :---: | :--- |
| **Hall Flow Sensor** | **GPIO 18** | `5.88 pulses / mL`<br>(approx. 2352 pulses for 400mL) | **400.0 mL** | 120 seconds timeout | Turns Relay 2 (Pump) OFF; advances to `SOAKING`. |
| **DS18B20 Temperature** | **GPIO 15** | OneWire Digital (°C, 0.25°C precision) | **85.0°C – 92.0°C** | 180 seconds timeout | Turns Relay 1 (Heater) OFF; advances to `STIRRING`. |
| **Push Button** | **GPIO 4** | Internal Pull-up (Active LOW) | Pressed (`LOW`) | 250 ms debounce | Wakes system on Home screen / Locks pod gate & starts water fill. |

---

## 6. End-to-End Automated Step Execution Table

| Step # | Process Phase | Active Actuators & Pins | Monitored Sensor & Pin | Target / Duration | What Happens in the Hardware & Website |
| :-: | :--- | :--- | :--- | :---: | :--- |
| **0** | **`IDLE` / Standby** | Status LED (GPIO 2) ON | Push Button (GPIO 4) | User presses button | Machine awakens; Web displays **Kadha Formulation Catalog**. |
| **1** | **`POD_DROP`** | Servo Motor (GPIO 14) | Push Button (GPIO 4) | Gate 90° | Servo flap opens to **90°**. User inserts herbal pod and presses GPIO 4 button. Flap closes to **0°**. |
| **2** | **`WATER_FILL`** | Relay 2 Pump (GPIO 26) ON | Flow Sensor (GPIO 18) | **400 mL** | Pump fills water chamber. Flow sensor counts pulses. Shuts pump OFF at 400 mL. |
| **3** | **`SOAKING`** | All Actuators OFF | Internal Timer | **10 Seconds** | Timed herbal soaking transition passes by automatically. |
| **4** | **`HEATING`** | Relay 1 Heater (GPIO 27) ON | DS18B20 Sensor (GPIO 15) | **85.0°C – 92.0°C** | Heating element active until decoction liquid reaches target. Heater shuts OFF. |
| **5** | **`STIRRING`** | Stepper Driver (GPIO 13,12,19,23) ON | Internal Timer | **12 Seconds** | 28BYJ-48 stepper agitates chamber for 12s. All 4 driver coils de-energize to LOW. |
| **6** | **`REDUCTION`** | All Actuators OFF | Internal Timer | **15 Seconds** | Timed decoction concentration step displays live mass & reduction curves. |
| **7** | **`FILTRATION`** | All Actuators OFF | Internal Timer | **10 Seconds** | SS316 stainless steel filtration transition step passes by. |
| **8** | **`DISPENSING`** | Relay 2 Pump (GPIO 26) ON | Internal Timer | **10 Seconds** | Pump dispenses freshly filtered Kadha into the cup. |
| **9** | **`READY` / Complete** | Buzzer (GPIO 25) | — | **3 Beeps** | 3 celebratory victory beeps sound; Web displays complete **Brew Passport**! |

---

## 7. Breadboard & Circuit Wire Color Guide

| Connection Group | From | To | Wire Color | Voltage |
| :--- | :--- | :--- | :---: | :---: |
| **Power (+5V)** | External Power Supply (+5V) | Breadboard Red (+) Rail & ESP32 Vin | **RED** | +5V DC |
| **Power (+3.3V)** | ESP32 3V3 Pin | Breadboard Orange Rail | **ORANGE** | +3.3V DC |
| **Ground (GND)** | External Supply GND & ESP32 GND | Breadboard Blue (-) Rail (Common GND) | **BLACK** | 0V |
| **Push Button** | ESP32 GPIO 4 | Button Pin 1 (Pin 2 to GND) | **BLUE** | 3.3V Logic |
| **Servo Signal** | ESP32 GPIO 14 | Servo Yellow/Orange PWM Wire | **YELLOW** | 5V PWM |
| **Flow Sensor Signal** | ESP32 GPIO 18 | Flow Sensor Yellow Pulse Wire | **YELLOW** | 5V Pulse |
| **DS18B20 Data** | ESP32 GPIO 15 | DS18B20 Signal / Yellow Data Wire | **YELLOW / GREEN** | 3.3V OneWire Bus |
| **Stepper IN1** | ESP32 GPIO 13 | ULN2003A IN1 Pin | **BLUE** | 5V Logic |
| **Stepper IN2** | ESP32 GPIO 12 | ULN2003A IN2 Pin | **PURPLE** | 5V Logic |
| **Stepper IN3** | ESP32 GPIO 19 | ULN2003A IN3 Pin | **GREY** | 5V Logic |
| **Stepper IN4** | ESP32 GPIO 23 | ULN2003A IN4 Pin | **WHITE** | 5V Logic |
| **Relay 1 Signal (Heater)** | ESP32 GPIO 27 | Relay Module IN1 Pin | **YELLOW** | 5V Logic (Active LOW) |
| **Relay 2 Signal (Pump)** | ESP32 GPIO 26 | Relay Module IN2 Pin | **ORANGE** | 5V Logic (Active LOW) |
| **Buzzer Positive** | ESP32 GPIO 25 | Buzzer Long Leg (+) | **RED / YELLOW** | 3.3V – 5V |
| **Stepper IN1** | ESP32 GPIO 13 | ULN2003A IN1 Pin | **BLUE** | 5V Logic |
| **Stepper IN2** | ESP32 GPIO 12 | ULN2003A IN2 Pin | **PURPLE** | 5V Logic |
| **Stepper IN3** | ESP32 GPIO 19 | ULN2003A IN3 Pin | **GREY** | 5V Logic |
| **Stepper IN4** | ESP32 GPIO 23 | ULN2003A IN4 Pin | **WHITE** | 5V Logic |
| **Relay 1 Signal (Heater)** | ESP32 GPIO 27 | Relay Module IN1 Pin | **YELLOW** | 5V Logic (Active LOW) |
| **Relay 2 Signal (Pump)** | ESP32 GPIO 26 | Relay Module IN2 Pin | **ORANGE** | 5V Logic (Active LOW) |
| **Buzzer Positive** | ESP32 GPIO 25 | Buzzer Long Leg (+) | **RED / YELLOW** | 3.3V – 5V |

---

## 8. Hardware Testing & Diagnostic Commands Table

You can test each hardware component individually via the **Web App Technician Screen** or by typing commands into the Arduino Serial Monitor (115200 Baud):

| Command (Plain / JSON) | Target Component | Expected Hardware Action |
| :--- | :--- | :--- |
| `{"cmd":"pod_open"}` or `POD:90` | Servo Flap (GPIO 14) | Flap opens to 90° angle. |
| `{"cmd":"pod_close"}` or `POD:0` | Servo Flap (GPIO 14) | Flap returns to 0° closed position. |
| `{"cmd":"pump_on"}` or `PUMP:ON` | Relay 2 / Water Pump (GPIO 26) | Relay 2 clicks ON; pump starts pumping. |
| `{"cmd":"pump_off"}` or `PUMP:OFF` | Relay 2 / Water Pump (GPIO 26) | Relay 2 clicks OFF; pump stops. |
| `{"cmd":"relay_on"}` or `HEATER:ON` | Relay 1 / Heater (GPIO 27) | Relay 1 clicks ON; heater element activates. |
| `{"cmd":"relay_off"}` or `HEATER:OFF` | Relay 1 / Heater (GPIO 27) | Relay 1 clicks OFF; heater element deactivates. |
| `{"cmd":"stirrer_on"}` or `STEPPER:ON`| 28BYJ-48 Stepper (GPIO 13,12,19,23) | Stepper motor begins smooth agitation rotation. |
| `{"cmd":"stirrer_off"}` or `STEPPER:OFF`| 28BYJ-48 Stepper (GPIO 13,12,19,23) | Stepper motor stops and all coils de-energize. |
| `{"cmd":"buzzer_on"}` or `BUZZER:BEEP` | Active Buzzer (GPIO 25) | Emits test beep sound. |
| `{"cmd":"start","set_water":400,"set_temp":35}` | Full Automated Cycle | Executes complete automated decoction sequence! |
