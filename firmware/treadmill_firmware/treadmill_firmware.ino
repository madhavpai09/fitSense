/**
 * ============================================================================
 * FitSense IoT-Based Smart Gym Equipment Monitoring System
 * Treadmill Sensor Node Firmware
 * ============================================================================
 * Target Microcontroller: Arduino UNO (ATmega328P, 16MHz, 5V)
 * Target File: firmware/treadmill_firmware/treadmill_firmware.ino
 *
 * System Description:
 *   This firmware interfaces with 6 real-time sensors mounted on an IoT-enabled
 *   commercial treadmill:
 *     1. Reed Switch (D2)         - Digital pulse counter via hardware interrupt
 *                                   for belt speed calculation (km/h).
 *     2. ACS712-20A (A0)          - Hall-effect current sensor for AC/DC motor
 *                                   power draw and load monitoring (Amperes).
 *     3. MPU-6050 (I2C: A4/A5)    - 6-axis IMU for deck/motor vibration analysis
 *                                   with RMS gravity compensation and a 5-sample
 *                                   moving average noise filter.
 *     4. DS3231 (I2C: A4/A5)      - High-precision Real-Time Clock providing
 *                                   synchronized UNIX epoch timestamps.
 *     5. RC522 RFID (SPI)         - 13.56MHz contactless reader for user session
 *                                   detection and gym member authentication.
 *     6. Potentiometer (A1)       - Analogue incline angle sensor (0 - 15% grade).
 *     7. Optional Servo (D9)      - PWM actuator for physical incline simulation.
 *
 * Telemetry Output:
 *   Transmits a compact, single-line JSON string over USB Serial (9600 baud)
 *   every 2000 milliseconds (2.0 seconds):
 *     {"rfid_uid":"AABBCCDD","rfid_present":true,"speed_kmh":5.23,"incline_pct":3.50,"current_a":2.14,"vibration_idx":0.15,"timestamp":1726660000}
 *
 * Pin Connections:
 *   - Reed Switch:      Digital Pin 2 (External Interrupt 0, active LOW with INPUT_PULLUP)
 *   - ACS712 Sensor:    Analog Pin A0 (Analogue input, 0-5V)
 *   - Potentiometer:    Analog Pin A1 (Analogue input, 0-5V)
 *   - I2C SDA:          Analog Pin A4 (Shared: MPU-6050 & DS3231 RTC)
 *   - I2C SCL:          Analog Pin A5 (Shared: MPU-6050 & DS3231 RTC)
 *   - RC522 SS / SDA:   Digital Pin 10 (SPI Chip Select)
 *   - RC522 MOSI:       Digital Pin 11 (SPI Master Out Slave In)
 *   - RC522 MISO:       Digital Pin 12 (SPI Master In Slave Out)
 *   - RC522 SCK:        Digital Pin 13 (SPI Clock)
 *   - RC522 RST:        Digital Pin 8  (RFID Hardware Reset)
 *   - Incline Servo:    Digital Pin 9  (Optional PWM Actuator)
 *
 * Author: FitSense IoT Engineering Team
 * License: MIT
 * ============================================================================
 */

#include <Wire.h>       // Arduino standard I2C library (A4=SDA, A5=SCL)
#include <SPI.h>        // Arduino standard SPI library (D11=MOSI, D12=MISO, D13=SCK)
#include <MFRC522.h>    // RC522 RFID reader library (by GithubCommunity / Miguel Balboa)
#include <RTClib.h>     // Adafruit RTC library for DS3231 Real-Time Clock
#include <Servo.h>      // Standard Arduino Servo library for optional actuator
#include <WiFi.h>       // ESP32 Wi-Fi library
#include <HTTPClient.h> // ESP32 HTTP Client

// ============================================================================
// WIFI & BACKEND CONFIGURATION
// ============================================================================
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
// Replace with the IP address of your backend server
const char* backend_url = "http://192.168.1.100:8000/api/ingest"; 
// You must provide a UUID from the backend's /api/machines endpoint
const char* machine_id_uuid = "00000000-0000-0000-0000-000000000000";

// ============================================================================
// HARDWARE PIN ASSIGNMENTS
// ============================================================================
const uint8_t PIN_REED_SWITCH     = 2;   // Reed switch input (D2 = External Interrupt 0)
const uint8_t PIN_CURRENT_SENSOR  = A0;  // ACS712 Current sensor analogue input
const uint8_t PIN_INCLINE_POT     = A1;  // Incline potentiometer analogue input
const uint8_t PIN_RFID_SS         = 10;  // RC522 SPI Slave Select (SDA)
const uint8_t PIN_RFID_RST        = 8;   // RC522 Reset pin (D8 dedicated to avoid D9 servo conflict)
const uint8_t PIN_SERVO           = 9;   // Optional Servo PWM signal pin

// ============================================================================
// CALIBRATION AND CONFIGURATION CONSTANTS
// ============================================================================

// --- Telemetry Interval ---
const unsigned long TELEMETRY_INTERVAL_MS = 2000; // Reporting interval: 2000 ms (2.0 seconds)

// --- Reed Switch & Speed Calculation ---
// Outer circumference of the treadmill roller in meters (default: 0.40 m)
const float ROLLER_CIRCUMFERENCE_M = 0.40f;
// Hardware interrupt debounce window in milliseconds to reject mechanical contact bounce
const unsigned long REED_DEBOUNCE_MS = 15;

// --- ACS712 Current Sensor ---
// ADC reference voltage (5.0V for standard Arduino Uno regulated VCC)
const float ADC_VREF                = 5.0f;
// Quiescent zero-current output voltage (nominally VCC / 2 = 2.50V)
const float ACS712_ZERO_VOLTAGE     = 2.50f;
// Sensitivity in Volts per Ampere (0.100 V/A for ACS712-20A; 0.185 for 5A; 0.066 for 30A)
const float ACS712_SENSITIVITY      = 0.100f;
// Number of ADC oversampling cycles for noise averaging
const int   CURRENT_SAMPLE_COUNT    = 10;
// Noise deadband in Amperes: readings below this threshold are clamped to 0.00 A
const float CURRENT_DEADBAND_A      = 0.05f;

// --- Potentiometer Incline Sensor ---
// Treadmill maximum deck incline grade percentage corresponding to full ADC range (0 - 15%)
const float MAX_INCLINE_PERCENT     = 15.0f;
// Number of ADC samples averaged for smooth incline readings
const int   POT_SAMPLE_COUNT        = 5;

// --- MPU-6050 IMU & Vibration Analysis ---
// I2C addresses:
// Note: DS3231 RTC is factory-fixed at 0x68.
// If MPU-6050 AD0 pin is tied to 3.3V, its address is 0x69 (prevents address collision).
// If MPU-6050 AD0 pin is tied to GND, its address is 0x68.
// The firmware automatically probes 0x69 first, then falls back to 0x68.
const uint8_t MPU6050_PRIMARY_ADDR   = 0x69; // Address when AD0 = HIGH (recommended with DS3231)
const uint8_t MPU6050_FALLBACK_ADDR  = 0x68; // Address when AD0 = LOW
const int     IMU_SAMPLE_COUNT       = 10;   // Number of accelerometer samples per telemetry cycle
const unsigned long IMU_SAMPLE_DELAY = 50;   // Delay between samples in ms (10 samples across ~500ms)
const float   STANDARD_GRAVITY_MSS   = 9.81f;// Standard Earth gravitational acceleration (m/s^2)
const float   MPU6050_LSB_PER_G_2G   = 16384.0f; // Scale factor for +/-2g range (16384 LSB / g)
const int     VIB_MOVING_AVG_WINDOW  = 5;    // Moving average filter window size (5 samples)

// --- Fallback RTC Epoch (Used if RTC hardware is disconnected) ---
// Base timestamp: September 18, 2026, 00:00:00 UTC (1789689600)
const uint32_t RTC_FALLBACK_EPOCH = 1789689600UL;

// --- Optional Servo Configuration ---
// Set to true if an analog or digital servo is physically attached to Pin D9
const bool ENABLE_SERVO = false;

// ============================================================================
// GLOBAL SENSOR OBJECTS & STATE VARIABLES
// ============================================================================

// RFID Instance
MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);

// DS3231 RTC Instance
RTC_DS3231 rtc;
bool rtc_available = false;

// Optional Servo Instance
Servo inclineServo;

// MPU-6050 Resolved I2C Address
uint8_t mpu6050_address = 0; // Set to actual detected address during setup() (0x69 or 0x68)

// Reed Switch Interrupt State Variables
// Declared volatile because they are modified inside the interrupt service routine (ISR)
volatile unsigned long isr_pulse_count      = 0;
volatile unsigned long isr_last_pulse_ms    = 0;

// IMU Vibration Moving Average Filter State
float vibration_filter_buffer[VIB_MOVING_AVG_WINDOW] = {0.0f};
uint8_t vibration_filter_index = 0;
uint8_t vibration_sample_count = 0;

// Telemetry Timing State
unsigned long last_telemetry_timestamp_ms = 0;

// ============================================================================
// FUNCTION DECLARATIONS
// ============================================================================
void reedSwitchISR();
unsigned long getAndResetPulseCount();
float readSpeedKmh(unsigned long pulse_count, float interval_seconds);
float readCurrentAmperes();
float readInclinePercentage();
bool initMPU6050();
bool readMPU6050RawAccel(int16_t &raw_ax, int16_t &raw_ay, int16_t &raw_az);
float readVibrationIndex();
float updateVibrationMovingAverage(float new_sample);
bool checkRFIDCard(char *uid_buffer, size_t buffer_size);
uint32_t getTimestamp();
void updateServoPosition(float incline_percent);

// ============================================================================
// ARDUINO SETUP ROUTINE
// ============================================================================
void setup() {
    // 1. Initialize USB Serial interface at 9600 baud
    Serial.begin(9600);
    // Allow transient serial voltages to settle
    while (!Serial && millis() < 1000) {
        ; // Wait up to 1 second for native USB ports (e.g. Leonardo/Micro); Uno proceeds immediately
    }

    // Connect to Wi-Fi
    Serial.print("Connecting to WiFi: ");
    Serial.println(ssid);
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi connected");

    // 2. Initialize I2C Communication as Bus Master
    Wire.begin();
    Wire.setClock(100000); // Standard I2C clock frequency: 100 kHz for high noise immunity

    // 3. Initialize SPI Communication Bus for RC522 RFID
    SPI.begin();
    rfid.PCD_Init(); // Initialize MFRC522 chip registers

    // 4. Initialize Hardware Interrupt for Reed Switch
    // Use internal pull-up resistor: switch connects Pin 2 to GND when magnet passes
    pinMode(PIN_REED_SWITCH, INPUT_PULLUP);
    attachInterrupt(digitalPinToInterrupt(PIN_REED_SWITCH), reedSwitchISR, FALLING);

    // 5. Initialize Analogue Sensor Pins
    pinMode(PIN_CURRENT_SENSOR, INPUT);
    pinMode(PIN_INCLINE_POT, INPUT);

    // 6. Initialize DS3231 RTC
    if (rtc.begin()) {
        rtc_available = true;
        if (rtc.lostPower()) {
            // If the RTC lost power (e.g. new battery), set to firmware build date/time
            rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
        }
    } else {
        rtc_available = false;
    }

    // 7. Initialize MPU-6050 6-Axis Motion Tracking Sensor
    initMPU6050();

    // 8. Initialize Optional Servo Actuator
    if (ENABLE_SERVO) {
        inclineServo.attach(PIN_SERVO);
        inclineServo.write(0); // Initialize at 0 degrees
    }

    // Seed telemetry timer to begin first transmission exactly after 2000 ms
    last_telemetry_timestamp_ms = millis();
}

// ============================================================================
// ARDUINO MAIN LOOP ROUTINE
// ============================================================================
void loop() {
    unsigned long current_millis = millis();

    // Enforce non-blocking 2000ms periodic execution
    if (current_millis - last_telemetry_timestamp_ms >= TELEMETRY_INTERVAL_MS) {
        // Calculate exact elapsed seconds since the last measurement cycle
        float elapsed_seconds = (float)(current_millis - last_telemetry_timestamp_ms) / 1000.0f;
        last_telemetry_timestamp_ms = current_millis;

        // --------------------------------------------------------------------
        // 1. REED SWITCH: Belt Speed (km/h)
        // --------------------------------------------------------------------
        unsigned long pulses = getAndResetPulseCount();
        float speed_kmh = readSpeedKmh(pulses, elapsed_seconds);

        // --------------------------------------------------------------------
        // 2. ACS712: Motor Current (Amperes)
        // --------------------------------------------------------------------
        float current_a = readCurrentAmperes();

        // --------------------------------------------------------------------
        // 3. POTENTIOMETER: Deck Incline Percentage (0.00 - 15.00%)
        // --------------------------------------------------------------------
        float incline_pct = readInclinePercentage();

        // --------------------------------------------------------------------
        // 4. MPU-6050 IMU: Deck/Motor Vibration Index (RMS - Gravity)
        //    (Takes 10 samples across ~500ms and filters via 5-point moving average)
        // --------------------------------------------------------------------
        float vibration_idx = readVibrationIndex();

        // --------------------------------------------------------------------
        // 5. DS3231 RTC: Real-Time UNIX Epoch Timestamp
        // --------------------------------------------------------------------
        uint32_t timestamp = getTimestamp();

        // --------------------------------------------------------------------
        // 6. RC522 RFID: User Session Card Detection & UID Extraction
        // --------------------------------------------------------------------
        char rfid_uid[17] = ""; // Buffer for up to 8-byte hex string + null terminator
        bool rfid_present = checkRFIDCard(rfid_uid, sizeof(rfid_uid));

        // --------------------------------------------------------------------
        // 7. OPTIONAL SERVO: Mirror Incline Position (0 - 180 degrees)
        // --------------------------------------------------------------------
        if (ENABLE_SERVO) {
            updateServoPosition(incline_pct);
        }

        // --------------------------------------------------------------------
        // 8. BUILD & EMIT JSON TELEMETRY PACKET OVER SERIAL
        // --------------------------------------------------------------------
        // Format floating-point numbers with 2 decimal places using dtostrf()
        // (Ensures 100% compatibility across all AVR compiler toolchains)
        char speed_str[10];
        char incline_str[10];
        char current_str[10];
        char vib_str[10];

        dtostrf(speed_kmh, 1, 2, speed_str);
        dtostrf(incline_pct, 1, 2, incline_str);
        dtostrf(current_a, 1, 2, current_str);
        dtostrf(vibration_idx, 1, 2, vib_str);

        // Assemble single-line JSON string into a fixed stack buffer (zero dynamic heap allocation)
        char json_buffer[256];
        snprintf(json_buffer, sizeof(json_buffer),
            "{\"machine_id\":\"%s\",\"rfid_uid\":\"%s\",\"rfid_present\":%s,\"speed_kmh\":%s,\"incline_pct\":%s,\"current_a\":%s,\"vibration_idx\":%s,\"timestamp\":%lu}",
            machine_id_uuid,
            rfid_uid,
            rfid_present ? "true" : "false",
            speed_str,
            incline_str,
            current_str,
            vib_str,
            (unsigned long)timestamp
        );

        // Output JSON message followed by newline (\r\n)
        Serial.println(json_buffer);

        // Send over HTTP POST
        if (WiFi.status() == WL_CONNECTED) {
            HTTPClient http;
            http.begin(backend_url);
            http.addHeader("Content-Type", "application/json");
            
            int httpResponseCode = http.POST(json_buffer);
            
            if (httpResponseCode > 0) {
                Serial.printf("HTTP POST Response code: %d\n", httpResponseCode);
            } else {
                Serial.printf("HTTP POST Error code: %d\n", httpResponseCode);
            }
            http.end();
        } else {
            Serial.println("WiFi Disconnected. Cannot send telemetry.");
        }
    }
}

// ============================================================================
// SENSOR HELPER FUNCTIONS
// ============================================================================

/**
 * Interrupt Service Routine (ISR) for Reed Switch Pulse Counting
 * Triggered on FALLING edge when the magnet mounted on the treadmill roller
 * passes the stationary reed switch and pulls D2 to ground.
 * Includes software debounce lockout to eliminate mechanical bounce spikes.
 */
void reedSwitchISR() {
    unsigned long current_time = millis();
    if (current_time - isr_last_pulse_ms >= REED_DEBOUNCE_MS) {
        isr_pulse_count++;
        isr_last_pulse_ms = current_time;
    }
}

/**
 * Atomically retrieves and resets the interrupt pulse count.
 * Disables interrupts momentarily to prevent a race condition where the ISR
 * fires midway through reading the 32-bit unsigned long.
 */
unsigned long getAndResetPulseCount() {
    noInterrupts(); // Enter atomic critical section
    unsigned long count = isr_pulse_count;
    isr_pulse_count = 0;
    interrupts();   // Exit atomic critical section
    return count;
}

/**
 * Calculates linear belt speed in kilometers per hour (km/h).
 * Formula:
 *   Distance (meters) = pulse_count * roller_circumference
 *   Linear Speed (m/s) = Distance / interval_seconds
 *   Speed (km/h) = Linear Speed * 3.6
 *   Combined: speed = (pulse_count * roller_circumference * 3.6) / interval_seconds
 */
float readSpeedKmh(unsigned long pulse_count, float interval_seconds) {
    if (interval_seconds <= 0.001f || pulse_count == 0) {
        return 0.00f;
    }
    float speed = (pulse_count * ROLLER_CIRCUMFERENCE_M * 3.6f) / interval_seconds;
    return speed;
}

/**
 * Reads the ACS712 Hall-Effect Current Sensor on Pin A0.
 * Averages 10 consecutive ADC samples spaced 2ms apart for noise rejection.
 * Computes actual current in Amperes:
 *   voltage = (ADC / 1023.0) * 5.0V
 *   current = abs((voltage - 2.50V) / 0.100 V/A)
 */
float readCurrentAmperes() {
    float voltage_sum = 0.0f;
    for (int i = 0; i < CURRENT_SAMPLE_COUNT; i++) {
        int raw_adc = analogRead(PIN_CURRENT_SENSOR);
        voltage_sum += ((float)raw_adc / 1023.0f) * ADC_VREF;
        delay(2); // Short delay for ADC sample-and-hold capacitor recovery
    }
    float avg_voltage = voltage_sum / (float)CURRENT_SAMPLE_COUNT;
    float current = fabs((avg_voltage - ACS712_ZERO_VOLTAGE) / ACS712_SENSITIVITY);

    // Apply noise floor suppression threshold
    if (current < CURRENT_DEADBAND_A) {
        current = 0.00f;
    }
    return current;
}

/**
 * Reads the deck incline potentiometer on Pin A1.
 * Maps raw 10-bit ADC reading (0 - 1023) linearly to incline grade percentage (0.00 - 15.00%).
 * Formula:
 *   incline_pct = (raw / 1023.0) * 15.0
 */
float readInclinePercentage() {
    long raw_sum = 0;
    for (int i = 0; i < POT_SAMPLE_COUNT; i++) {
        raw_sum += analogRead(PIN_INCLINE_POT);
        delay(2);
    }
    float avg_raw = (float)raw_sum / (float)POT_SAMPLE_COUNT;
    float incline = (avg_raw / 1023.0f) * MAX_INCLINE_PERCENT;

    // Constrain within valid physical boundaries
    if (incline < 0.00f) incline = 0.00f;
    if (incline > MAX_INCLINE_PERCENT) incline = MAX_INCLINE_PERCENT;

    return incline;
}

/**
 * Initializes the MPU-6050 IMU over I2C using direct register manipulation.
 * Detects whether the device is present on 0x69 (AD0=HIGH) or 0x68 (AD0=LOW).
 * Wakes the sensor from default sleep state and configures +/-2g accelerometer range.
 */
bool initMPU6050() {
    // 1. Check recommended address 0x69 first (avoids conflict with DS3231 at 0x68)
    Wire.beginTransmission(MPU6050_PRIMARY_ADDR);
    if (Wire.endTransmission() == 0) {
        mpu6050_address = MPU6050_PRIMARY_ADDR;
    } else {
        // Fallback: Check standard default address 0x68
        Wire.beginTransmission(MPU6050_FALLBACK_ADDR);
        if (Wire.endTransmission() == 0) {
            mpu6050_address = MPU6050_FALLBACK_ADDR;
        } else {
            mpu6050_address = 0; // Device not detected on I2C bus
            return false;
        }
    }

    // 2. Wake up MPU-6050 (Register 0x6B: PWR_MGMT_1, write 0x00 to clear SLEEP bit)
    Wire.beginTransmission(mpu6050_address);
    Wire.write(0x6B); // Power Management 1 register
    Wire.write(0x00); // Wake up device, use internal 8MHz oscillator
    if (Wire.endTransmission(true) != 0) {
        return false;
    }

    // 3. Configure Accelerometer Full-Scale Range (Register 0x1C: ACCEL_CONFIG)
    // Bits [4:3] = 00 -> +/- 2g full scale (16384 LSB / g sensitivity)
    Wire.beginTransmission(mpu6050_address);
    Wire.write(0x1C); // Accelerometer Configuration register
    Wire.write(0x00); // Set range to +/- 2g
    if (Wire.endTransmission(true) != 0) {
        return false;
    }

    return true;
}

/**
 * Reads 6 raw accelerometer registers (0x3B through 0x40) from MPU-6050.
 * Output: 16-bit signed integer values for X, Y, and Z acceleration.
 */
bool readMPU6050RawAccel(int16_t &raw_ax, int16_t &raw_ay, int16_t &raw_az) {
    if (mpu6050_address == 0) {
        return false;
    }

    // Point to register 0x3B (ACCEL_XOUT_H)
    Wire.beginTransmission(mpu6050_address);
    Wire.write(0x3B);
    if (Wire.endTransmission(false) != 0) { // Send repeated START to maintain bus hold
        return false;
    }

    // Request 6 consecutive bytes: X_H, X_L, Y_H, Y_L, Z_H, Z_L
    uint8_t bytesReceived = Wire.requestFrom((uint8_t)mpu6050_address, (size_t)6, (bool)true);
    if (bytesReceived < 6) {
        return false;
    }

    raw_ax = (int16_t)((Wire.read() << 8) | Wire.read());
    raw_ay = (int16_t)((Wire.read() << 8) | Wire.read());
    raw_az = (int16_t)((Wire.read() << 8) | Wire.read());

    return true;
}

/**
 * Computes Deck/Motor Vibration Index using MPU-6050:
 *   1. Collects 10 accelerometer samples spaced ~50ms apart over a 500ms window.
 *   2. Converts raw ADC values to acceleration in m/s^2 (at +/-2g: raw / 16384 * 9.81).
 *   3. Computes Root Mean Square (RMS) acceleration magnitude: sqrt(mean(ax² + ay² + az²)).
 *   4. Subtracts static 1g Earth gravity (9.81 m/s^2): vibration_raw = RMS - 9.81.
 *   5. Feeds vibration_raw into a 5-sample moving average filter to eliminate transient motor spikes.
 */
float readVibrationIndex() {
    if (mpu6050_address == 0) {
        // Fallback if IMU is unavailable: maintain filter state with 0.00
        return updateVibrationMovingAverage(0.00f);
    }

    float sum_magnitude_squared = 0.0f;
    int successful_samples = 0;

    for (int i = 0; i < IMU_SAMPLE_COUNT; i++) {
        int16_t raw_ax = 0, raw_ay = 0, raw_az = 0;
        if (readMPU6050RawAccel(raw_ax, raw_ay, raw_az)) {
            // Convert to engineering units (m/s^2)
            float ax = ((float)raw_ax / MPU6050_LSB_PER_G_2G) * STANDARD_GRAVITY_MSS;
            float ay = ((float)raw_ay / MPU6050_LSB_PER_G_2G) * STANDARD_GRAVITY_MSS;
            float az = ((float)raw_az / MPU6050_LSB_PER_G_2G) * STANDARD_GRAVITY_MSS;

            float mag_squared = (ax * ax) + (ay * ay) + (az * az);
            sum_magnitude_squared += mag_squared;
            successful_samples++;
        }

        // Delay between samples to distribute 10 samples evenly across 500ms
        if (i < IMU_SAMPLE_COUNT - 1) {
            delay(IMU_SAMPLE_DELAY);
        }
    }

    float raw_vibration = 0.00f;
    if (successful_samples > 0) {
        float mean_mag_sq = sum_magnitude_squared / (float)successful_samples;
        float rms_magnitude = sqrt(mean_mag_sq);

        // Subtract gravity baseline (static 1g vector)
        raw_vibration = rms_magnitude - STANDARD_GRAVITY_MSS;
        if (raw_vibration < 0.00f) {
            raw_vibration = 0.00f; // Clamp negative offsets due to sensor bias/noise
        }
    }

    // Apply moving average filter (5-sample window) to attenuate mechanical motor hum
    return updateVibrationMovingAverage(raw_vibration);
}

/**
 * 5-Sample Circular Moving Average Filter for Vibration Data
 */
float updateVibrationMovingAverage(float new_sample) {
    vibration_filter_buffer[vibration_filter_index] = new_sample;
    vibration_filter_index = (vibration_filter_index + 1) % VIB_MOVING_AVG_WINDOW;

    if (vibration_sample_count < VIB_MOVING_AVG_WINDOW) {
        vibration_sample_count++;
    }

    float sum = 0.0f;
    for (uint8_t i = 0; i < vibration_sample_count; i++) {
        sum += vibration_filter_buffer[i];
    }

    return sum / (float)vibration_sample_count;
}

/**
 * Detects presence of an RFID card and extracts its 4-byte or 7-byte UID.
 * Supports both newly tapped cards and cards that remain resting on the reader
 * throughout an entire workout session (using WakeupA / WUPA command).
 *
 * Output:
 *   - Returns true if card is present, false otherwise.
 *   - Formats UID as uppercase hexadecimal string in uid_buffer (e.g. "AABBCCDD").
 *   - If no card is present, sets uid_buffer to "" (empty string).
 */
bool checkRFIDCard(char *uid_buffer, size_t buffer_size) {
    byte bufferATQA[2];
    byte bufferSize = sizeof(bufferATQA);

    // Reset RC522 transceiver baud and modulation registers
    rfid.PCD_WriteRegister(rfid.TxModeReg, 0x00);
    rfid.PCD_WriteRegister(rfid.RxModeReg, 0x00);
    rfid.PCD_WriteRegister(rfid.ModWidthReg, 0x26);

    bool card_found = false;

    // Check for both newly presented cards (REQA) and previously halted cards (WUPA)
    if (rfid.PICC_IsNewCardPresent() || (rfid.PICC_WakeupA(bufferATQA, &bufferSize) == MFRC522::STATUS_OK)) {
        if (rfid.PICC_ReadCardSerial()) {
            card_found = true;
            uid_buffer[0] = '\0';

            // Convert card UID bytes to uppercase hexadecimal string
            for (byte i = 0; i < rfid.uid.size && (i * 2 + 2) < buffer_size; i++) {
                char hex_byte[3];
                snprintf(hex_byte, sizeof(hex_byte), "%02X", rfid.uid.uidByte[i]);
                strcat(uid_buffer, hex_byte);
            }

            // Put card in HALT state to minimize power draw and allow WakeupA detection on next cycle
            rfid.PICC_HaltA();
            rfid.PCD_StopCrypto1();
        }
    }

    if (!card_found) {
        uid_buffer[0] = '\0'; // Empty string when no card is present
    }

    return card_found;
}

/**
 * Retrieves the current UNIX timestamp from the DS3231 Real-Time Clock.
 * If the RTC hardware is disconnected or uninitialized, falls back to a calculated
 * timestamp based on system millis() and the base fallback epoch.
 */
uint32_t getTimestamp() {
    if (rtc_available) {
        DateTime now = rtc.now();
        return now.unixtime();
    } else {
        // Fallback: elapsed seconds since boot added to base epoch
        return RTC_FALLBACK_EPOCH + (millis() / 1000UL);
    }
}

/**
 * Controls the optional incline servo actuator on Pin D9.
 * Maps incline percentage (0.00 - 15.00%) to servo travel angle (0 - 180 degrees).
 */
void updateServoPosition(float incline_percent) {
    if (!ENABLE_SERVO) return;
    int target_angle = (int)((incline_percent / MAX_INCLINE_PERCENT) * 180.0f);
    target_angle = constrain(target_angle, 0, 180);
    inclineServo.write(target_angle);
}
