# FitSense Treadmill Sensor Node Firmware

Firmware for the **FitSense IoT-Based Smart Gym Equipment Monitoring System** running on **Arduino UNO** (ATmega328P).

This firmware reads 6 real-time treadmill sensors and transmits JSON-formatted telemetry over USB Serial (9600 baud) every 2.0 seconds.

---

## 1. Hardware Specifications & Pin Mapping

| Sensor / Peripheral | Model / Type | Interface | Arduino Uno Pin | Description |
|---|---|---|---|---|
| **Belt Speed Sensor** | Reed Switch | Digital (Interrupt 0) | **D2** | Active LOW, internal `INPUT_PULLUP`. Triggered on `FALLING` edge by roller magnet. |
| **Current Sensor** | ACS712-20A | Analogue | **A0** | 100 mV/A sensitivity, 2.50V zero-current offset. Measures treadmill motor draw. |
| **Deck Incline Sensor**| 10kΩ Potentiometer | Analogue | **A1** | Maps 0 - 1023 ADC readings linearly to 0.00% - 15.00% grade. |
| **Deck Vibration IMU** | MPU-6050 (GY-521) | I²C | **A4 (SDA), A5 (SCL)** | 6-axis accelerometer/gyro. Address 0x69 (AD0=HIGH) or 0x68 (AD0=LOW). |
| **Real-Time Clock** | DS3231 RTC | I²C | **A4 (SDA), A5 (SCL)** | High-precision TCXO RTC. Fixed I²C address 0x68. UNIX epoch timestamps. |
| **User RFID Reader** | RC522 (MFRC522) | SPI | **D10 (SS), D11 (MOSI), D12 (MISO), D13 (SCK), D8 (RST)** | 13.56MHz Mifare RFID reader for gym member check-in/session tracking. |
| **Incline Actuator** | SG90 / MG996R | PWM | **D9 (Optional)** | Optional servo for physical deck incline visualization/simulation. |

> [!IMPORTANT]
> **I²C Address Conflict Resolution:**
> The DS3231 RTC has a factory-hardcoded I²C address of `0x68`. By default, the MPU-6050 also uses `0x68` when its `AD0` pin is connected to GND. To avoid I²C bus collisions on the shared A4/A5 lines:
> - **Connect MPU-6050 pin `AD0` to 3.3V (VCC)**. This switches the MPU-6050 address to `0x69`.
> - The firmware automatically probes `0x69` first, falling back to `0x68` if only the IMU is present.

---

## 2. Required Arduino Libraries

Install the following libraries via **Arduino IDE -> Tools -> Manage Libraries...**:

1. **MFRC522** (by *GithubCommunity / Miguel Balboa*) - Version 1.4.10 or newer.
2. **RTClib** (by *Adafruit*) - Version 2.1.1 or newer.
3. **Wire** and **SPI** - Built into the Arduino AVR Core.
4. **Servo** - Built into the Arduino AVR Core.

---

## 3. Telemetry Output Format

Every 2000 milliseconds (2.0 seconds), the Arduino UNO emits a single-line JSON string followed by `\r\n`:

### Active User Session (RFID Card Present):
```json
{"rfid_uid":"AABBCCDD","rfid_present":true,"speed_kmh":5.23,"incline_pct":3.50,"current_a":2.14,"vibration_idx":0.15,"timestamp":1789689600}
```

### Idle / Guest Session (No RFID Card):
```json
{"rfid_uid":"","rfid_present":false,"speed_kmh":5.23,"incline_pct":3.50,"current_a":2.14,"vibration_idx":0.15,"timestamp":1789689600}
```

### JSON Fields Definition:
| Field | Type | Unit | Description |
|---|---|---|---|
| `rfid_uid` | `string` | Hex | 4-byte (8 chars) or 7-byte hex UID of detected gym RFID card. Empty string if no card. |
| `rfid_present` | `boolean` | - | `true` if RFID card is currently in RF field, `false` otherwise. |
| `speed_kmh` | `float` | km/h | Treadmill belt speed calculated from roller pulse frequency (2 decimal places). |
| `incline_pct` | `float` | % | Treadmill incline percentage grade from 0.00% to 15.00% (2 decimal places). |
| `current_a` | `float` | A | Motor current draw magnitude measured by ACS712-20A (2 decimal places). |
| `vibration_idx`| `float` | m/s² | RMS deck acceleration minus 1g Earth gravity filtered over 5 samples (2 decimal places). |
| `timestamp` | `integer` | seconds | 32-bit UNIX epoch timestamp from DS3231 RTC. |

---

## 4. Sensor Logic & Calculations

### 1. Reed Switch Speed Sensor (D2)
- **Interrupt Mode**: Hardware interrupt (`INT0`, Pin D2) with `INPUT_PULLUP` configured for `FALLING` edge.
- **Debounce**: 15ms software lockout in ISR to reject mechanical reed bounce.
- **Formula**:
  $$\text{speed (km/h)} = \frac{\text{pulse\_count} \times \text{roller\_circumference (m)} \times 3.6}{\Delta t \text{ (seconds)}}$$
- **Atomic Access**: Pulse counts are retrieved and reset inside an atomic critical section (`noInterrupts() ... interrupts()`).

### 2. ACS712 Current Sensor (A0)
- **Sampling**: Averages 10 consecutive ADC samples with 2ms settling delay.
- **Formula**:
  $$V_{\text{measured}} = \frac{\text{ADC}}{1023.0} \times 5.0\text{V}$$
  $$I (\text{Amperes}) = \left| \frac{V_{\text{measured}} - 2.50\text{V}}{0.100\text{ V/A}} \right|$$
- **Deadband**: Readings under $0.05\text{A}$ are suppressed to $0.00\text{A}$ to eliminate ADC resting noise.

### 3. MPU-6050 Deck Vibration Index (I²C)
- **Sampling**: Collects 10 samples spaced 50ms apart across a ~500ms window.
- **Conversion**: Raw 16-bit signed integer values at $\pm 2g$ ($16384\text{ LSB}/g$) converted to $m/s^2$:
  $$a = \frac{\text{raw}}{16384.0} \times 9.81$$
- **RMS Acceleration**:
  $$\text{RMS} = \sqrt{\frac{1}{10} \sum_{i=1}^{10} (a_{xi}^2 + a_{yi}^2 + a_{zi}^2)}$$
- **Gravity Baseline Subtraction**:
  $$\text{vibration\_raw} = \max(0.0, \text{RMS} - 9.81)$$
- **Filter**: 5-sample moving average circular buffer attenuates transient electrical motor noise.

### 4. DS3231 RTC (I²C)
- **Interface**: I²C bus at 100 kHz.
- **Time Representation**: Standard 32-bit unsigned integer UNIX epoch timestamp.
- **Fallback**: In case of RTC disconnect, automatically synthesizes timestamps based on boot uptime (`millis()`) added to the baseline fallback epoch.

### 5. RC522 RFID Card Reader (SPI)
- **Interface**: Hardware SPI (D10, D11, D12, D13) + D8 reset.
- **Continuous Session Support**: Utilizes `PICC_WakeupA` (WUPA command) in tandem with `PICC_IsNewCardPresent`. This allows cards left resting on the scanner throughout a 45-minute workout to maintain continuous `rfid_present: true` status without timing out.

### 6. Potentiometer Incline Sensor (A1)
- **Sampling**: 5-sample ADC average.
- **Formula**:
  $$\text{incline\_pct} = \frac{\text{ADC}}{1023.0} \times 15.0\%$$

---

## 5. Firmware Configuration & Calibration Constants

All sensor calibration parameters can be adjusted directly at the top of [treadmill_firmware.ino](file:///Users/ashmaavsharma/Desktop/Treadmill/firmware/treadmill_firmware/treadmill_firmware.ino):

```cpp
// Telemetry Interval (ms)
const unsigned long TELEMETRY_INTERVAL_MS = 2000;

// Treadmill Roller Calibration
const float ROLLER_CIRCUMFERENCE_M = 0.40f; // Roller circumference in meters
const unsigned long REED_DEBOUNCE_MS = 15;  // Debounce window in ms

// Current Sensor Calibration (ACS712-20A)
const float ADC_VREF            = 5.0f;   // Measured Uno 5V rail voltage
const float ACS712_ZERO_VOLTAGE = 2.50f;  // Quiescent voltage at 0A (Vcc / 2)
const float ACS712_SENSITIVITY  = 0.100f; // 0.100 V/A for 20A model
const float CURRENT_DEADBAND_A  = 0.05f;  // Noise cutoff in Amperes

// Deck Incline Calibration
const float MAX_INCLINE_PERCENT = 15.0f;  // Maximum grade percentage

// MPU-6050 Calibration
const int   IMU_SAMPLE_COUNT    = 10;     // 10 samples per cycle
const unsigned long IMU_SAMPLE_DELAY = 50; // 50ms interval (~500ms total)
const int   VIB_MOVING_AVG_WINDOW = 5;    // Moving average window size

// Optional Servo Actuator
const bool  ENABLE_SERVO        = false;  // Set to true to activate Pin D9 servo
```

---

## 6. How to Flash Firmware

1. Connect Arduino UNO to your computer using a USB Type-A to Type-B cable.
2. Open Arduino IDE.
3. Open `firmware/treadmill_firmware/treadmill_firmware.ino`.
4. Select **Tools -> Board -> Arduino AVR Boards -> Arduino Uno**.
5. Select **Tools -> Port -> [Your Arduino Port]** (e.g., `/dev/cu.usbmodem...` on macOS or `COM3` on Windows).
6. Click **Upload** (Ctrl+U or Cmd+U).
7. Open **Serial Monitor** at **9600 baud** to view live JSON telemetry stream.
