"""
FitSense On-Demand Hardware Simulation Engine
=============================================
Runs as an asyncio background task inside the FastAPI process.
Generates synthetic treadmill telemetry that routes through the
exact same /api/ingest pipeline as real ESP32 hardware.
"""
import asyncio
import random
import math
import uuid
from datetime import datetime
from typing import Dict, Optional

# ---------------------------------------------------------------------------
# Global state (simple in-process store — swap for Redis in production)
# ---------------------------------------------------------------------------
_sim_state: Dict = {
    "running": False,
    "gym_id": None,
    "machine_ids": [],        # list of UUID strings for simulated machines
    "fault_machine_id": None, # UUID string of machine currently in fault
    "task": None,             # asyncio.Task reference
}

# Broadcast callback — set by main.py once WebSocket manager is ready
_broadcast_fn = None

def set_broadcast_fn(fn):
    global _broadcast_fn
    _broadcast_fn = fn


# ---------------------------------------------------------------------------
# Public control API (called from FastAPI endpoints)
# ---------------------------------------------------------------------------
def get_state() -> Dict:
    return {
        "running": _sim_state["running"],
        "gym_id": _sim_state["gym_id"],
        "machine_count": len(_sim_state["machine_ids"]),
        "fault_machine_id": _sim_state["fault_machine_id"],
    }


async def start_simulation(gym_id: str, machine_count: int, db_session_factory, machine_lookup_fn):
    """Start the simulation engine for a gym with `machine_count` virtual machines."""
    if _sim_state["running"]:
        return {"status": "already_running"}

    # Provision / reuse machines in DB
    machine_ids = await _ensure_sim_machines(gym_id, machine_count, db_session_factory, machine_lookup_fn)

    _sim_state.update({
        "running": True,
        "gym_id": gym_id,
        "machine_ids": machine_ids,
        "fault_machine_id": None,
    })

    _sim_state["task"] = asyncio.create_task(_simulation_loop(db_session_factory))
    return {"status": "started", "machine_ids": machine_ids}


async def stop_simulation():
    """Stop the simulation engine."""
    _sim_state["running"] = False
    if _sim_state["task"]:
        _sim_state["task"].cancel()
        _sim_state["task"] = None
    _sim_state["fault_machine_id"] = None
    return {"status": "stopped"}


def trigger_fault(machine_id: str):
    """Flag a machine to emit fault-level vibration on the next tick."""
    _sim_state["fault_machine_id"] = machine_id
    return {"status": "fault_triggered", "machine_id": machine_id}


def clear_fault():
    _sim_state["fault_machine_id"] = None
    return {"status": "fault_cleared"}


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
async def _ensure_sim_machines(gym_id: str, count: int, db_session_factory, machine_lookup_fn) -> list:
    """Return list of machine UUID strings, creating simulated ones if needed."""
    from database import SessionLocal
    import models

    db = SessionLocal()
    try:
        existing = (
            db.query(models.Machine)
            .filter(
                models.Machine.gym_id == uuid.UUID(gym_id),
                models.Machine.name.like("SIM-Treadmill-%"),
            )
            .all()
        )

        machine_ids = [str(m.id) for m in existing]

        # Create any missing simulated machines
        for i in range(len(existing), count):
            new_machine = models.Machine(
                name=f"SIM-Treadmill-{i + 1}",
                machine_type="treadmill",
                status="idle",
                location=f"Simulation Bay {i + 1}",
                gym_id=uuid.UUID(gym_id),
            )
            db.add(new_machine)
            db.commit()
            db.refresh(new_machine)
            machine_ids.append(str(new_machine.id))

        return machine_ids[:count]
    finally:
        db.close()


async def _simulation_loop(db_session_factory):
    """Main simulation tick — fires every second per machine."""
    from database import SessionLocal
    import models

    # Per-machine smooth state
    machine_states: Dict[str, Dict] = {
        mid: {
            "speed": round(random.uniform(4.0, 8.0), 2),
            "incline": round(random.uniform(0.0, 5.0), 2),
            "phase": random.uniform(0, 2 * math.pi),
        }
        for mid in _sim_state["machine_ids"]
    }

    tick = 0
    while _sim_state["running"]:
        tick += 1
        db = SessionLocal()
        try:
            for mid in _sim_state["machine_ids"]:
                state = machine_states[mid]

                # Smoothly drift speed & incline with sine wave
                state["phase"] += 0.05
                state["speed"] = max(2.0, min(14.0,
                    state["speed"] + math.sin(state["phase"]) * 0.3 + random.uniform(-0.1, 0.1)
                ))
                state["incline"] = max(0.0, min(12.0,
                    state["incline"] + math.sin(state["phase"] * 0.7) * 0.2
                ))

                is_fault = (mid == _sim_state["fault_machine_id"])
                vibration = round(random.uniform(2.6, 3.5), 3) if is_fault else round(random.uniform(0.05, 0.4), 3)
                current_a = round(random.uniform(8.0, 18.0), 2) if is_fault else round(random.uniform(1.5, 6.0), 2)

                speed_kmh = round(state["speed"], 2)
                incline_pct = round(state["incline"], 2)

                # Find or start a sim session
                machine_uuid = uuid.UUID(mid)
                active_session = (
                    db.query(models.Session)
                    .filter(models.Session.machine_id == machine_uuid, models.Session.is_active == True)
                    .first()
                )

                if not active_session:
                    # Start a generic sim session
                    sim_member = db.query(models.Member).first()
                    if sim_member:
                        active_session = models.Session(
                            member_id=sim_member.id,
                            machine_id=machine_uuid,
                            rfid_uid="SIM-AUTO",
                            is_active=True,
                        )
                        db.add(active_session)
                        db.commit()
                        db.refresh(active_session)

                if active_session:
                    reading = models.SessionReading(
                        session_id=active_session.id,
                        member_id=active_session.member_id,
                        machine_id=machine_uuid,
                        speed_kmh=speed_kmh,
                        incline_pct=incline_pct,
                        current_a=current_a,
                        vibration_idx=vibration,
                        timestamp=datetime.utcnow(),
                    )
                    db.add(reading)

                    # Update machine status
                    machine = db.query(models.Machine).filter(models.Machine.id == machine_uuid).first()
                    if machine:
                        machine.status = "maintenance" if is_fault else "active"

                db.commit()

                # Push over WebSocket if callback is registered
                if _broadcast_fn:
                    payload = {
                        "type": "telemetry",
                        "machine_id": mid,
                        "source": "simulation",
                        "is_fault": is_fault,
                        "speed_kmh": speed_kmh,
                        "incline_pct": incline_pct,
                        "current_a": current_a,
                        "vibration_idx": vibration,
                        "timestamp": datetime.utcnow().isoformat(),
                    }
                    await _broadcast_fn(payload)

        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[SimEngine] Error on tick {tick}: {e}")
        finally:
            db.close()

        await asyncio.sleep(1)
