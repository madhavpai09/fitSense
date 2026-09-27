import uuid
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from database import Base

class Gym(Base):
    __tablename__ = "gyms"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, index=True)
    location = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owners = relationship("GymOwner", back_populates="gym")
    machines = relationship("Machine", back_populates="gym")
    members = relationship("Member", back_populates="gym")

class GymOwner(Base):
    __tablename__ = "gym_owners"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    gym_id = Column(UUID(as_uuid=True), ForeignKey("gyms.id"), index=True)
    name = Column(String)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String) # For real implementation, store hashed password
    created_at = Column(DateTime, default=datetime.utcnow)

    gym = relationship("Gym", back_populates="owners")

class Member(Base):
    __tablename__ = "members"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, index=True)
    email = Column(String, unique=True, index=True)
    age = Column(Integer)
    weight_kg = Column(Float)
    height_cm = Column(Float)
    fitness_level_score = Column(Integer)
    rfid_uid = Column(String, unique=True, index=True, nullable=True)
    gym_id = Column(UUID(as_uuid=True), ForeignKey("gyms.id"), nullable=True, index=True) # Optional global roaming
    created_at = Column(DateTime, default=datetime.utcnow)

    gym = relationship("Gym", back_populates="members")
    sessions = relationship("Session", back_populates="member")
    plans = relationship("MemberPlan", back_populates="member")
    nutrition_logs = relationship("NutritionLog", back_populates="member")

class Machine(Base):
    __tablename__ = "machines"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    name = Column(String, index=True)
    machine_type = Column(String, default='treadmill')
    status = Column(String, default='idle')
    location = Column(String)
    gym_id = Column(UUID(as_uuid=True), ForeignKey("gyms.id"), index=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    gym = relationship("Gym", back_populates="machines")
    sessions = relationship("Session", back_populates="machine")

class Session(Base):
    __tablename__ = "sessions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), index=True)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id"), index=True)
    rfid_uid = Column(String)
    started_at = Column(DateTime, default=datetime.utcnow)
    ended_at = Column(DateTime, nullable=True)
    is_active = Column(Boolean, default=True)

    member = relationship("Member", back_populates="sessions")
    machine = relationship("Machine", back_populates="sessions")
    readings = relationship("SessionReading", back_populates="session")
    summary = relationship("SessionSummary", back_populates="session", uselist=False)

class SessionReading(Base):
    __tablename__ = "session_readings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), index=True)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id"), index=True)
    speed_kmh = Column(Float)
    incline_pct = Column(Float)
    current_a = Column(Float)
    vibration_idx = Column(Float)
    timestamp = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="readings")

class SessionSummary(Base):
    __tablename__ = "session_summaries"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.id"), index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), index=True)
    machine_id = Column(UUID(as_uuid=True), ForeignKey("machines.id"), index=True)
    avg_speed = Column(Float)
    avg_incline = Column(Float)
    max_current = Column(Float)
    avg_current = Column(Float)
    total_duration_min = Column(Float)
    vibration_index = Column(Float)
    calories_burned = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("Session", back_populates="summary")

class MemberPlan(Base):
    __tablename__ = "member_plans"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), index=True)
    recommended_speed_kmh = Column(Float)
    recommended_incline_deg = Column(Float)
    recommended_duration_min = Column(Float)
    injury_risk_flag = Column(Boolean, default=False)
    injury_risk_details = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    member = relationship("Member", back_populates="plans")

class NutritionLog(Base):
    __tablename__ = "nutrition_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), index=True)
    food_name = Column(String)
    serving_size = Column(String)
    calories = Column(Float)
    protein_g = Column(Float)
    carbs_g = Column(Float)
    fats_g = Column(Float)
    fiber_g = Column(Float, default=0)
    logged_at = Column(DateTime, default=datetime.utcnow)

    member = relationship("Member", back_populates="nutrition_logs")
