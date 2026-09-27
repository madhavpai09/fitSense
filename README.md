# FitSense — IoT-Based Smart Gym Equipment Monitoring & Personalised Workout Management System

FitSense bridges physical gym equipment telemetry with machine learning-guided workout recommendations and nutrition tracking. It features an Arduino UNO sensor suite, a FastAPI backend with PostgreSQL, a Scikit-Learn MultiOutput Random Forest engine, and two React applications (Member App & Manager Dashboard).

---

## 🏗️ System Architecture

```
┌────────────────────────────────────────────────────────┐
│                      HARDWARE LAYER                    │
│  Arduino UNO R3 + 6 Sensors (Reed, ACS712, MPU-6050,   │
│  DS3231 RTC, RC522 RFID, Incline Potentiometer)        │
└───────────────────────────┬────────────────────────────┘
                            │ USB Serial (9600 baud JSON)
                            ▼
┌────────────────────────────────────────────────────────┐
│                   BACKEND & ML LAYER                   │
│  FastAPI (REST API) + PostgreSQL 17 + Serial Listener  │
│  ML Engine: MultiOutputRegressor(RandomForest)         │
└───────────────────────────┬────────────────────────────┘
                            │ REST / Polling
             ┌──────────────┴──────────────┐
             ▼                             ▼
┌────────────────────────┐    ┌────────────────────────┐
│       MEMBER APP       │    │   MANAGER DASHBOARD    │
│  • Real-time Metrics   │    │  • Machine Utilisation │
│  • Personalised Plan   │    │  • Maintenance Alerts  │
│  • Nutrition Logger    │    │  • Session Analytics   │
│  • Session History     │    │  • Active Gym Sessions │
└────────────────────────┘    └────────────────────────┘
```

---

## 🔌 Hardware Layer & Sensor Wiring

The Arduino UNO firmware is located in `firmware/treadmill_firmware/treadmill_firmware.ino`.

| Sensor | Metric Measured | Interface | Operating Voltage | Arduino UNO Pin |
|---|---|---|---|---|
| **Reed Switch** | Belt Speed (km/h) | Digital Pulse (Interrupt) | 5V | `D2` |
| **ACS712 (20A)** | Motor Current (A) | Analogue Voltage | 5V | `A0` |
| **MPU-6050** | Frame Vibration Index | I²C Bus | 3.3V | `A4` (SDA), `A5` (SCL) |
| **DS3231** | Precision RTC Timestamp | I²C Bus (Shared) | 3.3V | `A4` (SDA), `A5` (SCL) |
| **RC522 RFID** | Member RFID Card UID | SPI Bus | 3.3V | `D10` (SS), `D11` (MOSI), `D12` (MISO), `D13` (SCK), `D8` (RST) |
| **Potentiometer** | Incline Grade (0–15%) | Analogue Voltage | 5V | `A1` |
| **Servo (Optional)** | Incline Mechanical Mirror | PWM Output | 5V | `D9` |

Firmware outputs JSON telemetry packets over USB Serial every 2 seconds:
```json
{"rfid_uid":"AABBCCDD","rfid_present":true,"speed_kmh":6.20,"incline_pct":4.00,"current_a":2.45,"vibration_idx":0.18,"timestamp":1789689600}
```

---

## 🚀 Running on macOS

### 1. Database (PostgreSQL 17)
PostgreSQL is configured on port `5433`:
- Database: `fitsense_db`
- User: `fitsense_user`
- Password: `fitsense_pass`
- Port: `5433`

To manage the PostgreSQL service:
```bash
brew services start postgresql@17
```

### 2. Backend API
Install dependencies and run FastAPI with Uvicorn:
```bash
cd backend
pip3 install -r requirements.txt

# Start backend on port 8000
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000
```
Interactive Swagger docs: http://localhost:8000/docs

### 3. Machine Learning Model Training
Train the multi-output Random Forest regressor on exercise physiology progression data:
```bash
cd backend
python3 -m ml.train
```
This generates and saves the model artifact to `backend/ml/fitsense_model.joblib`.

### 4. Running Without Hardware (Sensor Simulator)
Run the automated workout simulation (warmup → main workout → cooldown):
```bash
cd backend
# Runs a 5-minute session in real-time or accelerated
python3 simulator.py --duration 120 --speed-multiplier 2.0 --member-rfid AABBCCDD
```

If Arduino hardware is connected:
```bash
cd backend
python3 serial_listener.py --baud 9600
```

### 5. Frontend Apps

#### Member Application (Port 5173)
```bash
cd frontend/member-app
npm install
npm run dev
```
Open http://localhost:5173 in your browser. Enter RFID UID `AABBCCDD` to log in, view live treadmill telemetry, log food items, view nutritional balance, and monitor ML-recommended workouts.

#### Manager Dashboard (Port 5174)
```bash
cd frontend/manager-dashboard
npm install
npm run dev
```
Open http://localhost:5174 in your browser to monitor real-time equipment utilisation, motor current anomalies, session volume analytics, and active gym sessions.

---

## 🛡️ ML Personalisation & Injury Risk Guard
- **Cold-Start Fallback**: If a member has fewer than 10 recorded workouts, rule-based baseline recommendations derived from their onboarding questionnaire fitness level score (1–5) and nutrition status are applied.
- **15% Injury Risk Threshold Guard**: If any recommended parameter (speed, incline, duration) exceeds the member's rolling average by >15%, the recommendation is capped at 115% and an injury risk warning flag is triggered.

---

## ⚡ Quick Start Script

You can start the entire FitSense system (Database verification, FastAPI backend, Member App, and Manager Dashboard) with a single command:

```bash
cd /Users/ashmaavsharma/Desktop/Treadmill
./start_fitsense.sh
```

To run the automated integration tests:
```bash
cd /Users/ashmaavsharma/Desktop/Treadmill/backend
PYTHONPATH="/Users/ashmaavsharma/Library/Python/3.12/lib/python/site-packages:." python3 tests/run_tests.py
```
# fitSense
