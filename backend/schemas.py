from pydantic import BaseModel, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional, List

class SensorIngest(BaseModel):
    member_id: Optional[UUID] = None
    rfid_uid: Optional[str] = None
    machine_id: UUID
    speed_kmh: float
    incline_pct: float
    current_a: float
    vibration_idx: float
    timestamp: datetime = None

class GymCreate(BaseModel):
    name: str
    location: str

class GymResponse(BaseModel):
    id: UUID
    name: str
    location: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class GymOwnerCreate(BaseModel):
    gym_id: UUID
    name: str
    email: str
    password: str

class GymOwnerResponse(BaseModel):
    id: UUID
    gym_id: UUID
    name: str
    email: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class MemberCreate(BaseModel):
    name: str
    email: str
    age: int
    weight_kg: float
    height_cm: float
    fitness_level_score: int
    rfid_uid: Optional[str] = None
    gym_id: Optional[UUID] = None
    target_weight_kg: Optional[float] = None
    stride_length_cm: Optional[float] = None
    gender: Optional[str] = "not_specified"
    fitness_goal: Optional[str] = "General Fitness"
    daily_step_target: Optional[int] = 10000

class MemberUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    target_weight_kg: Optional[float] = None
    stride_length_cm: Optional[float] = None
    gender: Optional[str] = None
    fitness_goal: Optional[str] = None
    fitness_level_score: Optional[int] = None
    daily_step_target: Optional[int] = None
    rfid_uid: Optional[str] = None

class MemberResponse(BaseModel):
    id: UUID
    name: str
    email: str
    age: Optional[int] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    target_weight_kg: Optional[float] = None
    stride_length_cm: Optional[float] = None
    gender: Optional[str] = "not_specified"
    fitness_goal: Optional[str] = "General Fitness"
    fitness_level_score: Optional[int] = None
    daily_step_target: Optional[int] = 10000
    rfid_uid: Optional[str] = None
    gym_id: Optional[UUID] = None
    created_at: datetime
    total_sessions: Optional[int] = 0
    total_calories_burned: Optional[float] = 0.0
    avg_session_duration: Optional[float] = 0.0
    lifetime_distance_km: Optional[float] = 0.0
    model_config = ConfigDict(from_attributes=True)

class SessionResponse(BaseModel):
    id: UUID
    member_id: UUID
    machine_id: UUID
    rfid_uid: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    is_active: bool
    model_config = ConfigDict(from_attributes=True)

class SessionSummaryResponse(BaseModel):
    id: UUID
    session_id: UUID
    member_id: UUID
    machine_id: UUID
    avg_speed: float
    avg_incline: float
    max_current: float
    avg_current: float
    total_duration_min: float
    vibration_index: float
    calories_burned: float
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class PlanResponse(BaseModel):
    id: UUID
    member_id: UUID
    recommended_speed_kmh: float
    recommended_incline_deg: float
    recommended_duration_min: float
    injury_risk_flag: bool
    injury_risk_details: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

    @property
    def recommended_speed(self) -> float:
        return self.recommended_speed_kmh

    @property
    def recommended_incline(self) -> float:
        return self.recommended_incline_deg

    @property
    def recommended_duration(self) -> float:
        return self.recommended_duration_min


class NutritionLogCreate(BaseModel):
    member_id: Optional[UUID] = None
    food_name: str
    serving_size: str
    calories: float
    protein_g: float
    carbs_g: float
    fats_g: float
    fiber_g: Optional[float] = 0.0
    meal_type: Optional[str] = "Breakfast"

class NutritionLogResponse(BaseModel):
    id: UUID
    member_id: UUID
    food_name: str
    serving_size: str
    calories: float
    protein_g: float
    carbs_g: float
    fats_g: float
    fiber_g: Optional[float] = 0.0
    meal_type: Optional[str] = "Breakfast"
    logged_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DailyNutritionSummary(BaseModel):
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fats_g: float
    total_protein: Optional[float] = None
    total_carbs: Optional[float] = None
    total_fats: Optional[float] = None
    total_fiber_g: Optional[float] = 0.0
    target_calories: Optional[float] = 2000.0
    target_protein: Optional[float] = 120.0
    target_carbs: Optional[float] = 220.0
    target_fats: Optional[float] = 60.0
    target_fiber: Optional[float] = 30.0
    remaining_calories: Optional[float] = 0.0
    date: str
    items: Optional[list[NutritionLogResponse]] = []

class MachineResponse(BaseModel):
    id: UUID
    name: str
    machine_type: str
    status: str
    location: str
    gym_id: Optional[UUID] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class UtilisationResponse(BaseModel):
    machine_id: UUID
    hours_today: float
    sessions_today: int
    avg_duration_min: float

class AlertResponse(BaseModel):
    machine_id: UUID
    alert_type: str
    message: str
    timestamp: datetime

class LiveMetricsResponse(BaseModel):
    machine_id: UUID
    speed_kmh: float
    incline_pct: float
    current_a: float
    vibration_idx: float
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
