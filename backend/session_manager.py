from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from database import get_db
from models import Session as DBSession, SessionReading, SessionSummary, Member, Machine

def start_session(db: Session, rfid_uid: str, machine_id: str):
    member = db.query(Member).filter(Member.rfid_uid == rfid_uid).first()
    if not member:
        return None
    machine = db.query(Machine).filter(Machine.id == machine_id).first()
    if not machine:
        return None
        
    # Mark machine as active
    machine.status = 'active'
        
    db_session = DBSession(
        member_id=member.id,
        machine_id=machine_id,
        rfid_uid=rfid_uid,
        is_active=True
    )
    db.add(db_session)
    db.commit()
    db.refresh(db_session)
    return db_session

def end_session(db: Session, session_id: str):
    session = db.query(DBSession).filter(DBSession.id == session_id).first()
    if not session or not session.is_active:
        return None
        
    session.is_active = False
    session.ended_at = datetime.utcnow()
    
    # Mark machine idle
    machine = db.query(Machine).filter(Machine.id == session.machine_id).first()
    if machine:
        machine.status = 'idle'
    
    readings = db.query(SessionReading).filter(SessionReading.session_id == session.id).all()
    if not readings:
        db.commit()
        return session
        
    avg_speed = sum(r.speed_kmh for r in readings) / len(readings)
    avg_incline = sum(r.incline_pct for r in readings) / len(readings)
    max_current = max(r.current_a for r in readings)
    avg_current = sum(r.current_a for r in readings) / len(readings)
    vibration_index = sum(r.vibration_idx for r in readings) / len(readings)
    
    duration = session.ended_at - session.started_at
    total_duration_min = duration.total_seconds() / 60.0
    
    member = db.query(Member).filter(Member.id == session.member_id).first()
    weight = member.weight_kg if member else 70.0
    
    # Simple MET calculation: Calories = MET * weight_kg * duration_hours
    # Approximate MET for running = 8.0 (can be refined)
    met = 8.0
    calories_burned = met * weight * (total_duration_min / 60.0)
    
    summary = SessionSummary(
        session_id=session.id,
        member_id=session.member_id,
        machine_id=session.machine_id,
        avg_speed=avg_speed,
        avg_incline=avg_incline,
        max_current=max_current,
        avg_current=avg_current,
        total_duration_min=total_duration_min,
        vibration_index=vibration_index,
        calories_burned=calories_burned
    )
    db.add(summary)
    db.commit()
    db.refresh(session)
    return session

def check_session_timeout(db: Session):
    cutoff = datetime.utcnow() - timedelta(seconds=60)
    active_sessions = db.query(DBSession).filter(DBSession.is_active == True).all()
    for session in active_sessions:
        last_reading = db.query(SessionReading).filter(SessionReading.session_id == session.id).order_by(SessionReading.timestamp.desc()).first()
        if not last_reading and (datetime.utcnow() - session.started_at) > timedelta(seconds=60):
            end_session(db, session.id)
        elif last_reading and last_reading.timestamp < cutoff:
            end_session(db, session.id)

def get_active_sessions(db: Session):
    return db.query(DBSession).filter(DBSession.is_active == True).all()
