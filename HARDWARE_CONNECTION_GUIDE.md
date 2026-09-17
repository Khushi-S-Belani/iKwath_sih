# iKwath ESP32 Hardware Connection & Wiring Guide

This guide details the complete circuit connections, pinouts, power distribution, and component specifications for interfacing your physical hardware with the **iKwath SIH Decoction Machine System**.

---

## 1. Components List & Specifications

| Component | Quantity | Operating Voltage | Purpose / Role |
| :--- | :---: | :---: | :--- |
| **ESP32 DevKit V1 (30 or 38 pin)** | 1 | 5V (MicroUSB/Vin) / 3.3V Logic | Main Microcontroller |
| **Push Button** | 1 | 3.3V Logic | Start / Pause / Reset Trigger (Internal Pull-Up) |
| **Peristaltic / Sado DC Pump** | 1 | 12V DC (or 5V DC) | Water intake & dispensing through 6mm ID pipe |
| **Hall Flow Sensor (6mm ID)** | 1 | 5V / 3.3V DC | Real-time water volume pulse counter |
| **Micro Servo 1 (SG90 / MG90S / MG995)** | 1 | 5V DC | Herbal Decoction Stirring Agitator Arm |
| **Micro Servo 2 (SG90 / MG90S / MG995)** | 1 | 5V DC | Herbal Pod Dispenser / Hopper Flap (0° - 90°) |
| **DHT11 Temp & Humidity Sensor** *(or DS18B20)* | 1 | 3.3V or 5V DC | Real-time temperature (°C) & ambient humidity (% RH) monitor |
| **4.7kΩ / 10kΩ Resistor** | 1 | - | Pull-up resistor for DHT11 data line (only needed for 4-pin raw sensor) |
| **1-Channel or 2-Channel 5V Relay** | 1 | 5V VCC, 3.3V Signal | Heater / Induction plate / Hotplate controller |
| **Active Piezo Buzzer (5V)** | 1 | 3.3V - 5V DC | Audible notification & alarm beeper |
| **4x4 Matrix Keypad (Optional)** | 1 | 3.3V Logic | Recipe selection & manual controls |
| **N-Channel MOSFET (e.g. IRF520 / IRLZ44N) OR Relay Ch 2** | 1 | 5V - 12V DC | For switching the Peristaltic Pump DC motor |
| **Flyback Diode (1N4007)** | 1 | - | Protection diode across DC Pump terminals |
| **External 5V/12V DC Power Supply** | 1 | 2A - 3A | Powering Servos & Pump (Common Ground) |
| **Silicone Pipe (6mm ID, 8-9mm OD)** | 1 | - | Food-grade fluid transfer tubing |

---

## 2. Complete ESP32 Pinout Mapping

```
                         ESP32 DEVKIT V1 (30-PIN)
                              +-----------+
                        EN ---|           |--- GPIO 23 (Keypad Row 3)
     (Keypad Row 1) GPIO 36---|           |--- GPIO 22 (Keypad Row 4)
     (Keypad Row 2) GPIO 39---|           |--- TX0 (Serial Debug)
                    GPIO 34---|           |--- RX0 (Serial Debug)
                    GPIO 35---|           |--- GPIO 21 (Keypad Col 1)
(Keypad Row 1) [*]  GPIO 32---|           |--- GPIO 15 (DHT11 / DS18B20 Temp Sensor Data)
(Keypad Row 2) [*]  GPIO 33---|           |--- GPIO 18 (Flow Sensor Pulse Interrupt)
(Buzzer Positive)   GPIO 25---|           |--- GPIO 5  (Keypad Col 4)
(Pump MOSFET/Relay) GPIO 26---|           |--- GPIO 17 (Optional / Spare)
(Heater Relay)      GPIO 27---|           |--- GPIO 16 (Optional / Spare)
(Stirrer Servo 1)   GPIO 13---|           |--- GPIO 4  (Push Button to GND)
(Pod Drop Servo 2)  GPIO 14---|           |--- GPIO 0  (Boot - Keep Free)
(Keypad Col 2)      GPIO 12---|           |--- GPIO 2  (Keypad Col 3)
(Keypad Col 2) [*]  GPIO 15---|           |--- GPIO 19 (Alternative Temp Data / Spare)
                        GND---|           |--- GND (Common Ground)
                        VIN---|           |--- 3V3 (3.3V Rail)
                              +-----------+
```
*Note: Keypad pin assignments can be configured in firmware or disabled if running with Web UI + Push Button.*

---

## 3. Step-by-Step Wiring & Circuit Schematic

### A. Push Button (Start / Pause Trigger)
- **Pin 1 of Button**: Connect to **ESP32 GPIO 4**
- **Pin 2 of Button**: Connect to **ESP32 GND**
*(The firmware uses the internal pull-up resistor `INPUT_PULLUP`, so NO external resistor is needed for the button! Pressing it grounds GPIO 4).*

---

### B. DHT11 Temperature & Humidity Sensor Wiring

The DHT11 measures ambient temperature (0°C–50°C) and relative humidity (20%–90% RH).

#### Option 1: 3-Pin DHT11 Module (PCB Breakout Board - Most Popular)
*(This module already has a pull-up resistor soldered on the PCB!)*
- **Pin `+` / `VCC`**: Connect to **ESP32 3.3V** (or 5V)
- **Pin `-` / `GND`**: Connect to **ESP32 GND**
- **Pin `S` / `DATA` / `OUT`**: Connect to **ESP32 GPIO 15** *(Adjacent to GND & 3V3)*

```
  3-Pin DHT11 Module            ESP32 DevKit V1
  +------------------+         +----------------+
  |  [ + / VCC ] ----|-------->| 3.3V           |
  |  [ - / GND ] ----|-------->| GND            |
  |  [ S / DATA ] ---|-------->| GPIO 15        |
  +------------------+         +----------------+
  *(No external resistor needed!)*
```

#### Option 2: 4-Pin Raw DHT11 Sensor (Blue Grille with 4 legs)
Looking at the sensor from the front (blue grille facing you, pins pointing down):
- **Pin 1 (VCC - Leftmost)**: Connect to **ESP32 3.3V**
- **Pin 2 (DATA)**: Connect to **ESP32 GPIO 15**
- **Pin 3 (NC)**: Leave disconnected / floating
- **Pin 4 (GND - Rightmost)**: Connect to **ESP32 GND**
- **Pull-up Resistor**: Place a **10kΩ** (or 4.7kΩ) resistor between **Pin 1 (3.3V)** and **Pin 2 (DATA / GPIO 15)**.

```
       4-Pin DHT11                     ESP32 DevKit V1
      +-----------+                   +----------------+
      | 1 2  3  4 |                   |                |
      +-----------+                   |                |
        | |  |  |                     |                |
(VCC) --+ |  |  +-------------------->| GND            |
        | |  +--- [NC - Do not connect]|               |
        | +-------------------------->| GPIO 15        |
        |    ^                        |                |
        |    | 10k Resistor           |                |
        +--[ 10k ]--+                 |                |
        |                             |                |
        +---------------------------->| 3.3V           |
                                      +----------------+
```

> [!TIP]
> **Temperature Simulation Mode:**
> The system has a built-in **Temperature Simulation Mode**. When active, the firmware dynamically simulates the decoction heating curve (from 25°C to 90°C) when the relay is active. You can switch between physical sensor and simulated mode with one click in the Web UI or a double-press of the physical push button!

---

### C. Flow Sensor (6mm ID Pipe Inline)
- **RED Wire (VCC)**: Connect to **5V (Vin / External 5V)**
- **BLACK Wire (GND)**: Connect to **ESP32 GND**
- **YELLOW Wire (Signal / Pulse)**: Connect to **ESP32 GPIO 18**

---

### D. Servo Motors (Stirrer & Pod Dispenser)
> [!WARNING]
> **Do not power servos directly from ESP32 3.3V pin.** Servos draw peak currents up to 800mA–1A which will cause the ESP32 to brownout/reset. Use the 5V power supply or Vin with USB 2A+.
- **Servo 1 (Stirrer - Stirring Arm in Vessel)**:
  - **Brown / Black (GND)** $\rightarrow$ **External 5V Power Supply GND & ESP32 GND**
  - **Red (VCC)** $\rightarrow$ **External 5V Power Supply (+5V)**
  - **Orange / Yellow (PWM Signal)** $\rightarrow$ **ESP32 GPIO 13**
- **Servo 2 (Pod Dispenser - Herb Hopper Flap)**:
  - **Brown / Black (GND)** $\rightarrow$ **External 5V Power Supply GND & ESP32 GND**
  - **Red (VCC)** $\rightarrow$ **External 5V Power Supply (+5V)**
  - **Orange / Yellow (PWM Signal)** $\rightarrow$ **ESP32 GPIO 14**

---

### E. Peristaltic / Sado Pump (12V / 5V DC)
You can drive the DC pump using an **N-Channel MOSFET module** (e.g. IRF520 / D4184) or **Relay Channel 2**:

**Using MOSFET Module**:
- **SIG / IN**: Connect to **ESP32 GPIO 26**
- **VCC (Module Logic)**: Connect to **ESP32 3.3V / 5V**
- **GND**: Connect to **ESP32 GND**
- **VIN+ / VIN- (Power Input)**: Connect to your **12V / 5V DC Power Supply**
- **VOUT+ / VOUT- (Load Output)**: Connect to the **Pump (+) and (-)** terminals.
- **Flyback Diode (1N4007)**: Place across pump terminals (Cathode/Stripe to (+), Anode to (-)) to prevent inductive kickback.

---

### F. Relay Module (Heater / Heating Coil / Lamp)
- **VCC**: Connect to **ESP32 5V (Vin)**
- **GND**: Connect to **ESP32 GND**
- **IN1 / Signal**: Connect to **ESP32 GPIO 27**
- **COM (Common)** & **NO (Normally Open)**: Wired in series with your heating element power line.

---

### G. Active Buzzer
- **Positive (+) Long Pin**: Connect to **ESP32 GPIO 25**
- **Negative (-) Short Pin**: Connect to **ESP32 GND**

---

### H. 4x4 Keypad (Optional)
If using the 8-pin 4x4 matrix keypad:
- **Row 1 to Row 4**: Connect to **GPIO 32, 33, 23, 22**
- **Col 1 to Col 4**: Connect to **GPIO 21, 15, 2, 5**

---

## 4. Master Breadboard / Wiring Schematic Diagram

```
+---------------------------------------------------------------------------------------------+
|                                    iKwath ESP32 CIRCUIT DIAGRAM                             |
+---------------------------------------------------------------------------------------------+

                      +5V External Power Supply --------+---------------+----------------+
                                                        |               |                |
                      GND External Power Supply ---+    |               |                |
                                                   |    |               |                |
                                                   |    |               |                |
                     +-----------------------+     |    |               |                |
                     |     ESP32 DevKit      |     |    |               |                |
                     |                       |     |    |               |                |
     Push Button <---| GPIO 4            5V  |<----+----+               |                |
          |          |                   GND |<----+ (Common GND)       |                |
         GND         |                   3V3 |--+                       |                |
                     |                       |  |                       |                |
    Flow Sensor <----| GPIO 18 (Interrupt)   |  |                       |                |
      (Yellow)       |                       |  | (4.7k Pull-up)        |                |
                     |                       |  |  +--[ 4.7k ]--+       |                |
   DS18B20 Data <----| GPIO 19 (OneWire) ----+--|---------------+       |                |
      (Yellow)       |                       |  |                       |                |
                     |                       |  |                       |                |
    Servo 1 PWM <----| GPIO 13 (Stirrer)     |  |                       |                |
    Servo 2 PWM <----| GPIO 14 (Pod Flap)    |  |                       |                |
                     |                       |  |                       |                |
   Buzzer (+)   <----| GPIO 25               |  |                       |                |
   Pump MOSFET  <----| GPIO 26               |  |                       |                |
   Relay Signal <----| GPIO 27 (Heater)      |  |                       |                |
                     +-----------------------+  |                       |                |
                                                |                       |                |
                                                |                       |                |
     DS18B20 Temp Sensor:                       |                       |                |
       - RED (VCC) -----------------------------+                       |                |
       - BLACK (GND) ---------------------------+ (GND)                 |                |
                                                                        |                |
     Flow Sensor (6mm):                                                 |                |
       - RED (VCC) -----------------------------------------------------+                |
       - BLACK (GND) ---------------------------+ (GND)                 |                |
                                                                        |                |
     Servo 1 (Stirrer) & Servo 2 (Pod):                                 |                |
       - RED (VCC) -----------------------------------------------------+                |
       - BROWN/BLACK (GND) ---------------------+ (GND)                                  |
                                                                                         |
     Relay Module (5V):                                                                  |
       - VCC ----------------------------------------------------------------------------+
       - GND -----------------------------------+ (GND)

     MOSFET / Pump Module:
       - VCC / VIN+ --------------------------- +12V/+5V External Supply
       - GND ---------------------------------- + (GND)
       - Load Out ----------------------------- Peristaltic Pump (+/-)
+---------------------------------------------------------------------------------------------+
```

---

## 5. Pipe & Fluid Routing (6mm Inner Diameter)

1. **Water Reservoir** $\rightarrow$ [6mm Pipe] $\rightarrow$ **Peristaltic Pump Inlet**
2. **Peristaltic Pump Outlet** $\rightarrow$ [6mm Pipe] $\rightarrow$ **Flow Sensor Inlet** (Observe flow arrow direction on sensor casing)
3. **Flow Sensor Outlet** $\rightarrow$ [6mm Pipe] $\rightarrow$ **Brewing / Boiling Chamber**
4. **Boiling Chamber Bottom Outlet** $\rightarrow$ **SS316 Filter Basket** $\rightarrow$ **Dispense Nozzle / Cup**

---

## 6. How to Connect to the Web Software

1. **Direct USB Web Serial (Recommended)**:
   - Connect ESP32 to your PC using a MicroUSB data cable.
   - In the iKwath Web App, click **"Connect ESP32 (USB Serial)"** in the top bar or Technician Screen.
   - Select the ESP32 COM port and click **Connect**.
   - The Web App immediately receives live temperature, flow volume, button presses, and sends automated brew controls!

2. **WiFi Mode**:
   - In `ikwath_esp32_firmware.ino`, enter your WiFi SSID & Password (or leave AP mode enabled).
   - ESP32 connects to WiFi and opens a WebSocket server on port `81` / HTTP REST server on port `80`.
