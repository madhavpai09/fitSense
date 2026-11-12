import sys
import uuid
from database import SessionLocal
import models

def reset_user(rfid="AABBCCDD"):
    db = SessionLocal()
    try:
        member = db.query(models.Member).filter(models.Member.rfid_uid == rfid).first()
        if not member:
            print(f"Member with RFID {rfid} not found. Creating clean test member...")
            gym = db.query(models.Gym).first()
            member = models.Member(
                name="Alice Smith",
                email="alice@fitsense.local",
                age=28,
                weight_kg=65.0,
                height_cm=170.0,
                fitness_level_score=3,
                rfid_uid=rfid,
                gym_id=gym.id if gym else None,
                target_weight_kg=60.0,
                stride_length_cm=70.0,
                gender="female",
                fitness_goal="Fat Loss & Endurance",
                daily_step_target=10000
            )
            db.add(member)
            db.commit()
            db.refresh(member)
        else:
            print(f"Purging all sessions, readings, plans & logs for {member.name} ({rfid})...")
            db.query(models.SessionReading).filter(models.SessionReading.member_id == member.id).delete(synchronize_session=False)
            db.query(models.SessionSummary).filter(models.SessionSummary.member_id == member.id).delete(synchronize_session=False)
            db.query(models.Session).filter(models.Session.member_id == member.id).delete(synchronize_session=False)
            db.query(models.MemberPlan).filter(models.MemberPlan.member_id == member.id).delete(synchronize_session=False)
            db.query(models.NutritionLog).filter(models.NutritionLog.member_id == member.id).delete(synchronize_session=False)
            
            member.name = "Alice Smith"
            member.age = 28
            member.weight_kg = 65.0
            member.height_cm = 170.0
            member.fitness_level_score = 3
            member.target_weight_kg = 60.0
            member.stride_length_cm = 70.0
            member.gender = "female"
            member.fitness_goal = "Fat Loss & Endurance"
            member.daily_step_target = 10000
            db.commit()
            db.refresh(member)

        # Reset all machine statuses back to idle
        for m in db.query(models.Machine).all():
            m.status = "idle"
        db.commit()

        # Seed clean initial plan
        plan = models.MemberPlan(
            member_id=member.id,
            recommended_speed_kmh=6.5,
            recommended_incline_deg=2.0,
            recommended_duration_min=25.0,
            injury_risk_flag=False,
            injury_risk_details="Initial baseline plan ready"
        )
        db.add(plan)
        db.commit()
        
        print(f"✅ Successfully reset database for user {rfid}!")
        print(f"   • Name:         {member.name}")
        print(f"   • Biometrics:   {member.weight_kg}kg, {member.height_cm}cm, Tier {member.fitness_level_score}")
        print(f"   • Clean Plan:   6.5 km/h, 2.0°, 25 min")
        print(f"   • Status:       Ready for demo")
        return member
    finally:
        db.close()

if __name__ == "__main__":
    rfid_target = sys.argv[1] if len(sys.argv) > 1 else "AABBCCDD"
    reset_user(rfid_target)

