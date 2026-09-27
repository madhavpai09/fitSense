import argparse
import time
import datetime
import random
import requests
import json
import sys

def create_test_member(base_url, rfid_uid):
    member_data = {
        "name": "Test User",
        "age": 30,
        "rfid_uid": rfid_uid,
        "fitness_level_score": 3,
        "weight_kg": 75,
        "height_cm": 175,
        "email": "test@fitsense.local"
    }
    try:
        # Check if member exists
        response = requests.get(f"{base_url}/api/members")
        if response.status_code == 200:
            for member in response.json():
                if member.get("rfid_uid") == rfid_uid:
                    print(f"Test member already exists: {member['id']}")
                    return member["id"]
        
        # Create member
        print(f"Creating test member with RFID: {rfid_uid}")
        response = requests.post(f"{base_url}/api/members", json=member_data)
        response.raise_for_status()
        member = response.json()
        print(f"Created member: {member['id']}")
        return member["id"]
    except Exception as e:
        print(f"Error creating/fetching member: {e}")
        return None

def get_or_create_machine(base_url, requested_id=None):
    try:
        response = requests.get(f"{base_url}/api/machines")
        response.raise_for_status()
        machines = response.json()
        
        if requested_id:
            for m in machines:
                if str(m.get("id")) == requested_id:
                    return m["id"]
            print(f"Warning: Requested machine ID {requested_id} not found.")
            
        if machines:
            print(f"Using existing machine: {machines[0]['id']}")
            return machines[0]["id"]
            
        # Create a test machine if none exists
        machine_data = {
            "name": "Treadmill 1",
            "model": "FitSense Pro X",
            "type": "treadmill",
            "status": "online"
        }
        print("Creating a new test machine")
        response = requests.post(f"{base_url}/api/machines", json=machine_data)
        response.raise_for_status()
        return response.json()["id"]
    except Exception as e:
        print(f"Error getting/creating machine: {e}")
        return None

def start_session(base_url, machine_id, rfid_uid):
    try:
        session_data = {
            "machine_id": machine_id,
            "rfid_uid": rfid_uid
        }
        response = requests.post(f"{base_url}/api/sessions/start", json=session_data)
        response.raise_for_status()
        session = response.json()
        print(f"Started session: {session['id']}")
        return session["id"]
    except Exception as e:
        print(f"Error starting session: {e}")
        return None

def end_session(base_url, session_id):
    if not session_id:
        return
    try:
        response = requests.post(f"{base_url}/api/sessions/{session_id}/end")
        response.raise_for_status()
        print(f"Ended session: {session_id}")
    except Exception as e:
        print(f"Error ending session: {e}")

def send_reading(base_url, machine_id, session_id, rfid_uid, speed, incline, current, vibration):
    try:
        reading = {
            "machine_id": machine_id,
            "rfid_uid": rfid_uid,
            "speed_kmh": round(speed, 2),
            "incline_pct": round(incline, 2),
            "current_a": round(current, 2),
            "vibration_idx": round(vibration, 3),
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        response = requests.post(f"{base_url}/api/ingest", json=reading)
        response.raise_for_status()
        print(f"Sent reading: Speed={reading['speed_kmh']} km/h, Incline={reading['incline_pct']}%, Current={reading['current_a']}A, Vib={reading['vibration_idx']}")
    except Exception as e:
        print(f"Error sending reading: {e}")

def simulate_workout(args, machine_id, member_id):
    session_id = start_session(args.url, machine_id, args.member_rfid)
    if not session_id:
        print("Failed to start session. Exiting.")
        return

    # Simulation parameters
    interval = 2.0 / args.speed_multiplier
    total_steps = int(args.duration / interval)
    
    # Phase calculations
    warmup_steps = int(120 / interval)
    cooldown_steps = int(120 / interval)
    
    if total_steps < warmup_steps + cooldown_steps:
        # Scale down phases if duration is very short
        warmup_steps = int(total_steps * 0.2)
        cooldown_steps = int(total_steps * 0.2)
        
    main_steps = total_steps - warmup_steps - cooldown_steps
    
    target_speed = 3.0
    target_incline = 0.0
    
    current_speed = 0.0
    current_incline = 0.0

    print(f"\nStarting simulation for {args.duration}s (accelerated {args.speed_multiplier}x)")
    print(f"Phases: Warm-up={warmup_steps} steps, Main={main_steps} steps, Cool-down={cooldown_steps} steps")

    try:
        for step in range(total_steps):
            # Determine target values based on phase
            if step < warmup_steps:
                # Warm-up phase: speed ramps from 3 to 5
                progress = step / max(1, warmup_steps)
                target_speed = 3.0 + (2.0 * progress)
                target_incline = 0.0
            elif step < warmup_steps + main_steps:
                # Main workout: speed 5-10, incline 0-8
                if step % (30 * args.speed_multiplier) == 0:  # Change target every ~1 min simulated time
                    target_speed = random.uniform(5.0, 10.0)
                    target_incline = random.choice([0.0, 2.0, 4.0, 6.0, 8.0])
            else:
                # Cool-down phase
                progress = (step - warmup_steps - main_steps) / max(1, cooldown_steps)
                target_speed = max(3.0, current_speed - (current_speed - 3.0) * progress)
                target_incline = max(0.0, current_incline - current_incline * progress)

            # Move current values towards targets smoothly
            current_speed += (target_speed - current_speed) * 0.1
            current_incline += (target_incline - current_incline) * 0.1

            # Add noise
            noisy_speed = max(0.0, current_speed + random.uniform(-0.3, 0.3))
            noisy_incline = max(0.0, current_incline + random.uniform(-0.2, 0.2))
            
            # Current correlates with speed and incline
            base_current = 1.5 + (noisy_speed * 0.25) + (noisy_incline * 0.1)
            noisy_current = max(0.0, base_current + random.uniform(-0.1, 0.1))
            
            # Vibration has a baseline + occasional spikes
            vib_baseline = random.uniform(0.1, 0.3)
            if random.random() < 0.05:
                vib_baseline += random.uniform(0.5, 1.5)
            
            send_reading(
                args.url, 
                machine_id, 
                session_id,
                args.member_rfid, 
                noisy_speed, 
                noisy_incline, 
                noisy_current, 
                vib_baseline
            )
            
            time.sleep(interval)
            
    except KeyboardInterrupt:
        print("\nSimulation interrupted by user.")
    finally:
        print("\nEnding session...")
        end_session(args.url, session_id)
        print("Simulation complete.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="FitSense Sensor Simulator")
    parser.add_argument("--url", default="http://localhost:8000", help="FastAPI backend URL")
    parser.add_argument("--member-rfid", default="AABBCCDD", help="Test member RFID UID")
    parser.add_argument("--machine-id", default=None, help="Specific Machine ID to use")
    parser.add_argument("--duration", type=int, default=300, help="Total duration in seconds")
    parser.add_argument("--speed-multiplier", type=float, default=1.0, help="Speed up simulation time")
    
    args = parser.parse_args()
    
    print(f"Connecting to backend at {args.url}")
    
    member_id = create_test_member(args.url, args.member_rfid)
    if not member_id:
        sys.exit(1)
        
    machine_id = get_or_create_machine(args.url, args.machine_id)
    if not machine_id:
        sys.exit(1)
        
    simulate_workout(args, machine_id, member_id)
