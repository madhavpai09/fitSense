import argparse
import time
import serial
import serial.tools.list_ports
import json
import requests
import datetime
import sys

class SerialListener:
    def __init__(self, port, baud, url):
        self.port = port
        self.baud = baud
        self.url = url
        self.serial_conn = None
        self.current_session_id = None
        self.last_rfid = None
        self.last_rfid_time = 0
        self.session_timeout = 60  # seconds
        self.machine_id = self.get_machine_id()

    def get_machine_id(self):
        print(f"Fetching machine info from {self.url}...")
        try:
            response = requests.get(f"{self.url}/api/machines")
            response.raise_for_status()
            machines = response.json()
            if machines:
                print(f"Using machine ID: {machines[0]['id']}")
                return machines[0]["id"]
            else:
                print("No machines found on backend. Please create one.")
                return 1 # Fallback
        except Exception as e:
            print(f"Error fetching machines: {e}")
            return 1 # Fallback

    def find_arduino_port(self):
        ports = list(serial.tools.list_ports.comports())
        for p in ports:
            if "usbmodem" in p.device or "USB" in p.description:
                return p.device
        return None

    def connect(self):
        if not self.port:
            print("Auto-detecting Arduino port...")
            self.port = self.find_arduino_port()
            
        if not self.port:
            print("Could not find Arduino port automatically.")
            return False

        try:
            print(f"Connecting to {self.port} at {self.baud} baud...")
            self.serial_conn = serial.Serial(self.port, self.baud, timeout=1)
            print("Connected successfully.")
            return True
        except Exception as e:
            print(f"Failed to connect to serial port: {e}")
            self.port = None # Reset so we try auto-detect again if needed
            return False

    def handle_session(self, rfid_uid):
        now = time.time()
        
        # Start new session if RFID appears
        if rfid_uid and rfid_uid != "null" and rfid_uid != "":
            self.last_rfid_time = now
            if self.last_rfid != rfid_uid:
                self.last_rfid = rfid_uid
                self.start_session(rfid_uid)
        
        # End session on timeout
        elif self.last_rfid and (now - self.last_rfid_time > self.session_timeout):
            print(f"Session timeout for RFID {self.last_rfid}")
            self.end_session()
            self.last_rfid = None

    def start_session(self, rfid_uid):
        if self.current_session_id:
            self.end_session()
            
        print(f"Starting session for RFID: {rfid_uid}")
        try:
            # Note: We need member_id. Assuming backend can lookup or we need to GET members.
            # For simplicity, we just lookup members by RFID.
            member_response = requests.get(f"{self.url}/api/members")
            member_id = None
            if member_response.status_code == 200:
                for m in member_response.json():
                    if m.get("rfid_uid") == rfid_uid:
                        member_id = m.get("id")
                        break
            
            if not member_id:
                print(f"Warning: Member with RFID {rfid_uid} not found on backend.")
                return

            session_data = {
                "machine_id": self.machine_id,
                "rfid_uid": rfid_uid
            }
            response = requests.post(f"{self.url}/api/sessions/start", json=session_data)
            response.raise_for_status()
            self.current_session_id = response.json()["id"]
            print(f"Started session ID: {self.current_session_id}")
        except Exception as e:
            print(f"Error starting session: {e}")

    def end_session(self):
        if not self.current_session_id:
            return
            
        print(f"Ending session ID: {self.current_session_id}")
        try:
            end_data = {
                "end_time": datetime.datetime.utcnow().isoformat()
            }
            requests.post(f"{self.url}/api/sessions/{self.current_session_id}/end", json=end_data)
            print("Session ended successfully.")
        except Exception as e:
            print(f"Error ending session: {e}")
        finally:
            self.current_session_id = None

    def process_reading(self, data):
        try:
            rfid = data.get("rfid_uid")
            self.handle_session(rfid)
            
            if not self.current_session_id:
                # Discard readings if no active session
                return

            reading = {
                "machine_id": self.machine_id,
                "session_id": self.current_session_id,
                "rfid_uid": rfid,
                "speed_kmh": data.get("speed_kmh", 0.0),
                "incline_pct": data.get("incline_pct", 0.0),
                "current_a": data.get("current_a", 0.0),
                "vibration_idx": data.get("vibration_idx", 0.0),
                "timestamp": datetime.datetime.utcnow().isoformat()
            }
            
            response = requests.post(f"{self.url}/api/ingest", json=reading)
            response.raise_for_status()
            print(f"Sent reading: Speed={reading['speed_kmh']} km/h, Incline={reading['incline_pct']}%")
        except Exception as e:
            print(f"Error processing reading: {e}")

    def run(self):
        while True:
            if not self.serial_conn or not self.serial_conn.is_open:
                if not self.connect():
                    time.sleep(5)
                    continue

            try:
                line = self.serial_conn.readline().decode('utf-8').strip()
                if not line:
                    continue
                    
                try:
                    data = json.loads(line)
                    self.process_reading(data)
                except json.JSONDecodeError:
                    print(f"Invalid JSON received: {line}")
                    
            except serial.SerialException as e:
                print(f"Serial port error: {e}")
                self.serial_conn = None
            except Exception as e:
                print(f"Unexpected error: {e}")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="FitSense Arduino Serial Listener")
    parser.add_argument("--port", default=None, help="Serial port (default: auto-detect)")
    parser.add_argument("--baud", type=int, default=9600, help="Baud rate (default: 9600)")
    parser.add_argument("--url", default="http://localhost:8000", help="FastAPI backend URL")
    
    args = parser.parse_args()
    
    listener = SerialListener(args.port, args.baud, args.url)
    try:
        listener.run()
    except KeyboardInterrupt:
        print("\nListener stopped by user.")
        listener.end_session()
        sys.exit(0)
