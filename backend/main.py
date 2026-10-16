from fastapi import FastAPI, Depends, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import uuid
import asyncio
import json
from typing import List

from database import engine, Base, get_db
import models
import schemas
import simulation_engine
from session_manager import start_session, end_session, get_active_sessions
from nutrition_engine import FOOD_DATABASE, calculate_nutrition_score, get_daily_summary, suggest_foods, search_food_database

try:
    from ml.model import generate_plan
except ImportError:
    def generate_plan(member_profile, recent_sessions):
        return {
            "recommended_speed_kmh": 5.0,
            "recommended_incline_deg": 2.0,
            "recommended_duration_min": 30.0,
            "injury_risk_flag": False,
            "injury_risk_details": "No model loaded"
        }

app = FastAPI(title="FitSense Backend Core")

# ---------------------------------------------------------------------------
# WebSocket Connection Manager
# ---------------------------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, data: dict):
        dead = []
        for ws in self.active_connections:
            try:
                await ws.send_json(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)

ws_manager = ConnectionManager()
simulation_engine.set_broadcast_fn(ws_manager.broadcast)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)
    db = next(get_db())
    if db.query(models.Gym).count() == 0:
        default_gym = models.Gym(name="FitSense HQ Gym", location="San Francisco")
        db.add(default_gym)
        db.commit()
        db.refresh(default_gym)
        
        default_owner = models.GymOwner(
            gym_id=default_gym.id,
            name="HQ Admin",
            email="admin@fitsense.com",
            password_hash="hashed_pw_placeholder"
        )
        db.add(default_owner)
        db.commit()

    if db.query(models.Machine).count() == 0:
        default_gym = db.query(models.Gym).first()
        default_machine = models.Machine(
            name="Treadmill 1",
            machine_type="treadmill",
            status="idle",
            location="Zone A",
            gym_id=default_gym.id if default_gym else None
        )
        db.add(default_machine)
        db.commit()

from typing import Optional

# ---------------------------------------------------------------------------
# WebSocket endpoint
# ---------------------------------------------------------------------------
@app.websocket("/ws/telemetry")
async def websocket_telemetry(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep alive
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)

# ---------------------------------------------------------------------------
# Simulation Engine API  (v1)
# ---------------------------------------------------------------------------
class SimStartRequest(schemas.BaseModel):
    gym_id: str
    machine_count: int = 1

class SimFaultRequest(schemas.BaseModel):
    machine_id: str

@app.post("/api/v1/simulation/start")
async def sim_start(req: SimStartRequest, db: Session = Depends(get_db)):
    result = await simulation_engine.start_simulation(
        req.gym_id, req.machine_count, None, None
    )
    return result

@app.post("/api/v1/simulation/stop")
async def sim_stop():
    return await simulation_engine.stop_simulation()

@app.get("/api/v1/simulation/status")
def sim_status():
    return simulation_engine.get_state()

@app.post("/api/v1/simulation/trigger-fault")
def sim_fault(req: SimFaultRequest):
    return simulation_engine.trigger_fault(req.machine_id)

@app.post("/api/v1/simulation/clear-fault")
def sim_clear_fault():
    return simulation_engine.clear_fault()

# --- Gym & Multi-Tenancy ---

@app.post("/api/gyms", response_model=schemas.GymResponse)
def create_gym(gym: schemas.GymCreate, db: Session = Depends(get_db)):
    db_gym = models.Gym(**gym.model_dump())
    db.add(db_gym)
    db.commit()
    db.refresh(db_gym)
    return db_gym

@app.get("/api/gyms", response_model=list[schemas.GymResponse])
def list_gyms(db: Session = Depends(get_db)):
    return db.query(models.Gym).all()

@app.post("/api/gym-owners", response_model=schemas.GymOwnerResponse)
def create_gym_owner(owner: schemas.GymOwnerCreate, db: Session = Depends(get_db)):
    db_owner = models.GymOwner(**owner.model_dump())
    db.add(db_owner)
    db.commit()
    db.refresh(db_owner)
    return db_owner

# --- Sensor Data ---

@app.post("/api/ingest")
def ingest_sensor_data(data: schemas.SensorIngest, db: Session = Depends(get_db)):
    # Find active session for this machine
    session = db.query(models.Session).filter(
        models.Session.machine_id == data.machine_id,
        models.Session.is_active == True
    ).first()
    
    if not session and data.rfid_uid:
        session = start_session(db, data.rfid_uid, str(data.machine_id))
        
    if not session:
        raise HTTPException(status_code=400, detail="No active session found and could not start one.")
        
    reading = models.SessionReading(
        session_id=session.id,
        member_id=session.member_id,
        machine_id=data.machine_id,
        speed_kmh=data.speed_kmh,
        incline_pct=data.incline_pct,
        current_a=data.current_a,
        vibration_idx=data.vibration_idx,
        timestamp=data.timestamp or datetime.utcnow()
    )
    db.add(reading)
    db.commit()
    return {"status": "success"}

@app.get("/api/live-metrics/{machine_id}")
def get_live_metrics(machine_id: str, db: Session = Depends(get_db)):
    machine = None
    try:
        m_uuid = uuid.UUID(machine_id)
        machine = db.query(models.Machine).filter(models.Machine.id == m_uuid).first()
    except Exception:
        machine = db.query(models.Machine).first()

    if not machine:
        machine = db.query(models.Machine).first()

    target_machine_id = machine.id if machine else None
    
    reading = None
    if target_machine_id:
        reading = db.query(models.SessionReading).filter(
            models.SessionReading.machine_id == target_machine_id
        ).order_by(models.SessionReading.timestamp.desc()).first()

    active_session = None
    if target_machine_id:
        active_session = db.query(models.Session).filter(
            models.Session.machine_id == target_machine_id,
            models.Session.is_active == True
        ).first()

    elapsed = 0
    if active_session and active_session.started_at:
        elapsed = int((datetime.utcnow() - active_session.started_at).total_seconds())

    if not reading:
        return {
            "machine_id": str(target_machine_id) if target_machine_id else machine_id,
            "speed_kmh": 0.0,
            "speed": 0.0,
            "incline_pct": 0.0,
            "incline": 0.0,
            "current_a": 0.0,
            "motor_current": 0.0,
            "vibration_idx": 0.0,
            "vibration_status": "normal",
            "elapsed_time": elapsed,
            "is_active": active_session is not None,
            "timestamp": datetime.utcnow()
        }

    vib_status = "warning" if reading.vibration_idx > 0.5 else "normal"
    
    return {
        "machine_id": str(target_machine_id),
        "speed_kmh": reading.speed_kmh,
        "speed": reading.speed_kmh,
        "incline_pct": reading.incline_pct,
        "incline": reading.incline_pct,
        "current_a": reading.current_a,
        "motor_current": reading.current_a,
        "vibration_idx": reading.vibration_idx,
        "vibration_status": vib_status,
        "elapsed_time": elapsed,
        "is_active": active_session is not None,
        "timestamp": reading.timestamp
    }

# --- Sessions ---

class SessionStartRequest(schemas.BaseModel):
    rfid_uid: str
    machine_id: uuid.UUID

@app.post("/api/sessions/start", response_model=schemas.SessionResponse)
def api_start_session(req: SessionStartRequest, db: Session = Depends(get_db)):
    session = start_session(db, req.rfid_uid, str(req.machine_id))
    if not session:
        raise HTTPException(status_code=404, detail="Member or Machine not found")
    return session

@app.post("/api/sessions/{session_id}/end")
def api_end_session(session_id: uuid.UUID, db: Session = Depends(get_db)):
    session = end_session(db, str(session_id))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found or already ended")
        
    # Trigger ML plan
    member = db.query(models.Member).filter(models.Member.id == session.member_id).first()
    recent_summaries = db.query(models.SessionSummary).filter(
        models.SessionSummary.member_id == session.member_id
    ).order_by(models.SessionSummary.created_at.desc()).limit(5).all()
    
    # Note: ML model logic to be fully implemented later, call placeholder for now.
    plan_data = generate_plan(member, recent_summaries)
    
    plan = models.MemberPlan(
        member_id=session.member_id,
        recommended_speed_kmh=plan_data.get("recommended_speed_kmh", 0),
        recommended_incline_deg=plan_data.get("recommended_incline_deg", 0),
        recommended_duration_min=plan_data.get("recommended_duration_min", 0),
        injury_risk_flag=plan_data.get("injury_risk_flag", False),
        injury_risk_details=plan_data.get("injury_risk_details", "")
    )
    db.add(plan)
    db.commit()
    
    return {"status": "success", "session_id": session.id}

@app.get("/api/sessions/active", response_model=list[schemas.SessionResponse])
def api_active_sessions(db: Session = Depends(get_db)):
    return get_active_sessions(db)

@app.get("/api/sessions/history/{member_id}", response_model=list[schemas.SessionSummaryResponse])
def api_session_history(member_id: uuid.UUID, db: Session = Depends(get_db)):
    summaries = db.query(models.SessionSummary).filter(
        models.SessionSummary.member_id == member_id
    ).order_by(models.SessionSummary.created_at.desc()).all()
    return summaries

# --- Members ---

@app.post("/api/members", response_model=schemas.MemberResponse)
def create_member(member: schemas.MemberCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Member).filter(
        (models.Member.email == member.email) | (models.Member.rfid_uid == member.rfid_uid)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Member with this email or RFID already exists")
    db_member = models.Member(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

def populate_member_stats(member: models.Member, db: Session) -> dict:
    summaries = db.query(models.SessionSummary).filter(models.SessionSummary.member_id == member.id).all()
    total_sessions = len(summaries)
    total_calories = round(sum(s.calories_burned or 0.0 for s in summaries), 1)
    avg_duration = round(sum(s.total_duration_min or 0.0 for s in summaries) / total_sessions, 1) if total_sessions > 0 else 0.0
    lifetime_dist = round(sum((s.avg_speed or 0.0) * ((s.total_duration_min or 0.0) / 60.0) for s in summaries), 2)
    
    stride = member.stride_length_cm
    if not stride and member.height_cm:
        ratio = 0.413 if (member.gender or "").lower() == "female" else 0.415
        stride = round(member.height_cm * ratio, 1)
    elif not stride:
        stride = 70.0

    target_wt = member.target_weight_kg if member.target_weight_kg else (round(member.weight_kg - 5, 1) if member.weight_kg else 65.0)

    return {
        "id": member.id,
        "name": member.name,
        "email": member.email,
        "age": member.age,
        "weight_kg": member.weight_kg,
        "height_cm": member.height_cm,
        "target_weight_kg": target_wt,
        "stride_length_cm": stride,
        "gender": member.gender or "not_specified",
        "fitness_goal": member.fitness_goal or "General Fitness",
        "fitness_level_score": member.fitness_level_score or 3,
        "daily_step_target": member.daily_step_target or 10000,
        "rfid_uid": member.rfid_uid,
        "gym_id": member.gym_id,
        "created_at": member.created_at,
        "total_sessions": total_sessions,
        "total_calories_burned": total_calories,
        "avg_session_duration": avg_duration,
        "lifetime_distance_km": lifetime_dist
    }

@app.get("/api/members/{member_id}", response_model=schemas.MemberResponse)
def get_member(member_id: uuid.UUID, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return populate_member_stats(member, db)

@app.put("/api/members/{member_id}", response_model=schemas.MemberResponse)
def update_member(member_id: uuid.UUID, update_data: schemas.MemberUpdate, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    update_dict = update_data.model_dump(exclude_unset=True)
    for key, val in update_dict.items():
        if val is not None and hasattr(member, key):
            setattr(member, key, val)
    
    db.commit()
    db.refresh(member)
    return populate_member_stats(member, db)

@app.get("/api/members", response_model=list[schemas.MemberResponse])
def list_members(db: Session = Depends(get_db)):
    members = db.query(models.Member).all()
    return [populate_member_stats(m, db) for m in members]

class LoginRequest(schemas.BaseModel):
    rfid_uid: str

@app.post("/api/members/login", response_model=schemas.MemberResponse)
def login_member(req: LoginRequest, db: Session = Depends(get_db)):
    member = db.query(models.Member).filter(models.Member.rfid_uid == req.rfid_uid).first()
    if not member:
        raise HTTPException(status_code=404, detail="Member not found")
    return populate_member_stats(member, db)

# --- Plans ---

@app.get("/api/plans/{member_id}")
def get_latest_plan(member_id: uuid.UUID, db: Session = Depends(get_db)):
    plan = db.query(models.MemberPlan).filter(
        models.MemberPlan.member_id == member_id
    ).order_by(models.MemberPlan.created_at.desc()).first()
    if not plan:
        # Fallback default plan
        return {
            "id": str(uuid.uuid4()),
            "member_id": str(member_id),
            "recommended_speed": 6.0,
            "recommended_speed_kmh": 6.0,
            "recommended_incline": 2.0,
            "recommended_incline_deg": 2.0,
            "recommended_duration": 25.0,
            "recommended_duration_min": 25.0,
            "injury_risk_flag": False,
            "injury_risk_details": "Initial plan generated",
            "created_at": datetime.utcnow()
        }
    return {
        "id": str(plan.id),
        "member_id": str(plan.member_id),
        "recommended_speed": plan.recommended_speed_kmh,
        "recommended_speed_kmh": plan.recommended_speed_kmh,
        "recommended_incline": plan.recommended_incline_deg,
        "recommended_incline_deg": plan.recommended_incline_deg,
        "recommended_duration": plan.recommended_duration_min,
        "recommended_duration_min": plan.recommended_duration_min,
        "injury_risk_flag": plan.injury_risk_flag,
        "injury_risk_details": plan.injury_risk_details,
        "created_at": plan.created_at
    }

@app.get("/api/plans/{member_id}/history")
def get_plan_history(member_id: uuid.UUID, db: Session = Depends(get_db)):
    plans = db.query(models.MemberPlan).filter(
        models.MemberPlan.member_id == member_id
    ).order_by(models.MemberPlan.created_at.desc()).all()
    return [
        {
            "id": str(p.id),
            "member_id": str(p.member_id),
            "date": p.created_at.strftime("%b %d"),
            "recommended_speed": p.recommended_speed_kmh,
            "recommended_speed_kmh": p.recommended_speed_kmh,
            "recommended_incline": p.recommended_incline_deg,
            "recommended_incline_deg": p.recommended_incline_deg,
            "recommended_duration": p.recommended_duration_min,
            "recommended_duration_min": p.recommended_duration_min,
            "injury_risk_flag": p.injury_risk_flag,
            "injury_risk_details": p.injury_risk_details,
            "created_at": p.created_at
        }
        for p in plans
    ]

# --- Nutrition ---

@app.post("/api/nutrition/log", response_model=schemas.NutritionLogResponse)
def log_nutrition(
    log: schemas.NutritionLogCreate,
    member_id: Optional[uuid.UUID] = None,
    db: Session = Depends(get_db)
):
    target_member_id = log.member_id or member_id
    if not target_member_id:
        raise HTTPException(status_code=400, detail="member_id is required either in request body or query parameter")
    data = log.model_dump(exclude={"member_id"})
    db_log = models.NutritionLog(**data, member_id=target_member_id)
    db.add(db_log)
    db.commit()
    db.refresh(db_log)
    return db_log

@app.delete("/api/nutrition/log/{log_id}")
def delete_nutrition_log(log_id: uuid.UUID, db: Session = Depends(get_db)):
    db_log = db.query(models.NutritionLog).filter(models.NutritionLog.id == log_id).first()
    if not db_log:
        raise HTTPException(status_code=404, detail="Log entry not found")
    db.delete(db_log)
    db.commit()
    return {"message": "Deleted successfully", "id": str(log_id)}

@app.get("/api/nutrition/{member_id}/today", response_model=schemas.DailyNutritionSummary)
def get_nutrition_today(member_id: uuid.UUID, db: Session = Depends(get_db)):
    return get_daily_summary(db, str(member_id), datetime.utcnow().date())

@app.get("/api/nutrition/{member_id}/history", response_model=list[schemas.DailyNutritionSummary])
def get_nutrition_history(member_id: uuid.UUID, db: Session = Depends(get_db)):
    history = []
    today = datetime.utcnow().date()
    for i in range(7):
        date = today - timedelta(days=i)
        summary = get_daily_summary(db, str(member_id), date)
        history.append(summary)
    return history

@app.get("/api/nutrition/foods")
def search_foods(q: Optional[str] = None, format: Optional[str] = None):
    if q is not None or format == "list":
        return search_food_database(q)
    return FOOD_DATABASE

@app.get("/api/nutrition/foods/search")
def search_foods_endpoint(q: Optional[str] = None):
    return search_food_database(q)

@app.get("/api/nutrition/{member_id}/score")
def get_nutrition_score(member_id: uuid.UUID, db: Session = Depends(get_db)):
    score = calculate_nutrition_score(db, str(member_id))
    summary = get_daily_summary(db, str(member_id), datetime.utcnow().date())
    suggestions = suggest_foods(summary)
    return {
        "score": score,
        "nutrition_score": score,
        "suggestions": suggestions
    }

# --- Manager / Utilisation ---

@app.get("/api/machines", response_model=list[schemas.MachineResponse])
def get_machines(gym_id: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(models.Machine)
    if gym_id:
        try:
            query = query.filter(models.Machine.gym_id == uuid.UUID(gym_id))
        except ValueError:
            pass
    return query.all()

@app.get("/api/machines/{machine_id}/utilisation", response_model=schemas.UtilisationResponse)
def get_machine_utilisation(machine_id: uuid.UUID, db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    summaries = db.query(models.SessionSummary).filter(
        models.SessionSummary.machine_id == machine_id,
        models.SessionSummary.created_at >= datetime.combine(today, datetime.min.time())
    ).all()
    
    sessions_today = len(summaries)
    total_minutes = sum(s.total_duration_min for s in summaries)
    avg_duration = total_minutes / sessions_today if sessions_today > 0 else 0
    
    return {
        "machine_id": machine_id,
        "hours_today": total_minutes / 60.0,
        "sessions_today": sessions_today,
        "avg_duration_min": avg_duration
    }

@app.get("/api/alerts", response_model=list[schemas.AlertResponse])
def get_alerts(db: Session = Depends(get_db)):
    cutoff = datetime.utcnow() - timedelta(hours=1)
    # Very basic alert query based on recent readings
    high_current_readings = db.query(models.SessionReading).filter(
        models.SessionReading.current_a > 15.0,
        models.SessionReading.timestamp > cutoff
    ).all()
    
    alerts = []
    for r in high_current_readings:
        alerts.append({
            "machine_id": r.machine_id,
            "alert_type": "HIGH_CURRENT",
            "message": f"Motor current exceeded threshold (15A): {r.current_a}A",
            "timestamp": r.timestamp
        })
    return alerts

@app.get("/api/analytics/overview")
def get_analytics_overview(db: Session = Depends(get_db)):
    today = datetime.utcnow().date()
    summaries = db.query(models.SessionSummary).filter(
        models.SessionSummary.created_at >= datetime.combine(today, datetime.min.time())
    ).all()
    
    total_sessions_today = len(summaries)
    total_minutes = sum(s.total_duration_min for s in summaries)
    avg_session_duration = total_minutes / total_sessions_today if total_sessions_today > 0 else 0
    
    active_sessions_count = db.query(models.Session).filter(models.Session.is_active == True).count()
    active_machines = db.query(models.Machine).filter(models.Machine.status == 'active').count()
    total_members = db.query(models.Member).count()
    
    return {
        "total_sessions_today": total_sessions_today,
        "total_active_sessions": active_sessions_count,
        "active_machines": active_machines,
        "average_session_duration": f"{int(avg_session_duration)} min" if avg_session_duration else "0 min",
        "avg_session_duration_min": avg_session_duration,
        "total_members": total_members,
        "sessions_per_hour": [
            {"hour": f"{h:02d}:00", "count": sum(1 for s in summaries if s.created_at.hour == h)}
            for h in range(8, 22)
        ],
        "daily_sessions": [
            {"day": "Mon", "sessions": 4},
            {"day": "Tue", "sessions": 7},
            {"day": "Wed", "sessions": 5},
            {"day": "Thu", "sessions": 9},
            {"day": "Fri", "sessions": 6},
            {"day": "Sat", "sessions": 11},
            {"day": "Sun", "sessions": max(1, total_sessions_today)}
        ],
        "utilisation_distribution": [
            {"name": "Treadmills", "value": 65},
            {"name": "Cycles", "value": 20},
            {"name": "Ellipticals", "value": 15}
        ],
        "duration_by_machine": [
            {"name": "Treadmill 1", "duration": round(avg_session_duration, 1)}
        ],
        "peak_hour": "18:00 - 19:00",
        "most_used_machine": "Treadmill 1",
        "total_hours": round(total_minutes / 60.0, 1)
    }
