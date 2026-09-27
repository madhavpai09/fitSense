import os
import subprocess
import time
from database import SessionLocal
from models import Machine, Member

def seed_machines_and_members():
    db = SessionLocal()
    
    # 1. Seed members
    test_members = [
        {"name": "Alice Smith", "email": "alice@fitsense.local", "rfid_uid": "AABBCCDD", "fitness_level_score": 3, "weight_kg": 65, "height_cm": 170},
        {"name": "Bob Jones", "email": "bob@fitsense.local", "rfid_uid": "11223344", "fitness_level_score": 4, "weight_kg": 85, "height_cm": 185},
        {"name": "Charlie Brown", "email": "charlie@fitsense.local", "rfid_uid": "55667788", "fitness_level_score": 2, "weight_kg": 95, "height_cm": 175},
        {"name": "Diana Prince", "email": "diana@fitsense.local", "rfid_uid": "9900AABB", "fitness_level_score": 5, "weight_kg": 60, "height_cm": 168}
    ]
    
    for tm in test_members:
        member = db.query(Member).filter(Member.rfid_uid == tm["rfid_uid"]).first()
        if not member:
            member = Member(**tm)
            db.add(member)
            print(f"Created Member: {tm['name']}")
    
    # 2. Seed machines
    machines = [
        {"name": "Treadmill 1", "machine_type": "treadmill"},
        {"name": "Treadmill 2", "machine_type": "treadmill"},
        {"name": "Elliptical 1", "machine_type": "elliptical"},
        {"name": "Bike 1", "machine_type": "bike"}
    ]
    
    created_machines = []
    
    for m in machines:
        machine = db.query(Machine).filter(Machine.name == m["name"]).first()
        if not machine:
            machine = Machine(name=m["name"], machine_type=m["machine_type"], status="idle", location="Cardio Zone")
            db.add(machine)
            db.commit()
            db.refresh(machine)
            print(f"Created Machine: {m['name']} with ID: {machine.id}")
        else:
            print(f"Found Machine: {m['name']} with ID: {machine.id}")
        created_machines.append(machine)
    
    machine_dicts = [{"id": str(m.id), "name": m.name} for m in created_machines]
    db.commit()
    db.close()
    return machine_dicts, [tm["rfid_uid"] for tm in test_members]

if __name__ == "__main__":
    print("Seeding database with fleet data...")
    machines, rfids = seed_machines_and_members()
    
    processes = []
    
    print("\nStarting simulators for fleet...")
    # Let's start simulators for 3 machines and leave 1 idle
    for i in range(3):
        m = machines[i]
        rfid = rfids[i]
        cmd = [
            "python3", "simulator.py", 
            "--duration", "900", 
            "--speed-multiplier", "1.0", 
            "--machine-id", m["id"], 
            "--member-rfid", rfid
        ]
        print(f"Starting {m['name']} for user with RFID {rfid}...")
        p = subprocess.Popen(cmd)
        processes.append(p)
        time.sleep(3) # stagger starts to make graphs look natural
        
    print(f"\nRunning {len(processes)} simulators in the background.")
    print("You can view them active on the Manager Dashboard.")
    print("Press Ctrl+C to stop.")
    try:
        for p in processes:
            p.wait()
    except KeyboardInterrupt:
        for p in processes:
            p.terminate()
        print("\nAll simulators stopped.")
