from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from models import NutritionLog, Member

FOOD_DATABASE = {
    "chicken breast": {"calories": 165, "protein_g": 31, "carbs_g": 0, "fats_g": 3.6},
    "rice": {"calories": 130, "protein_g": 2.7, "carbs_g": 28, "fats_g": 0.3},
    "banana": {"calories": 89, "protein_g": 1.1, "carbs_g": 23, "fats_g": 0.3},
    "egg": {"calories": 155, "protein_g": 13, "carbs_g": 1.1, "fats_g": 11},
    "milk": {"calories": 42, "protein_g": 3.4, "carbs_g": 5, "fats_g": 1},
    "bread": {"calories": 265, "protein_g": 9, "carbs_g": 49, "fats_g": 3.2},
    "oats": {"calories": 389, "protein_g": 16.9, "carbs_g": 66.3, "fats_g": 6.9},
    "salmon": {"calories": 208, "protein_g": 20, "carbs_g": 0, "fats_g": 13},
    "broccoli": {"calories": 34, "protein_g": 2.8, "carbs_g": 6.6, "fats_g": 0.4},
    "apple": {"calories": 52, "protein_g": 0.3, "carbs_g": 14, "fats_g": 0.2},
}

def get_daily_summary(db: Session, member_id: str, date: datetime.date):
    logs = db.query(NutritionLog).filter(
        NutritionLog.member_id == member_id,
        NutritionLog.logged_at >= datetime.combine(date, datetime.min.time()),
        NutritionLog.logged_at < datetime.combine(date + timedelta(days=1), datetime.min.time())
    ).all()
    
    total_calories = sum(log.calories for log in logs)
    total_protein = sum(log.protein_g for log in logs)
    total_carbs = sum(log.carbs_g for log in logs)
    total_fats = sum(log.fats_g for log in logs)
    
    return {
        "total_calories": total_calories,
        "total_protein_g": total_protein,
        "total_carbs_g": total_carbs,
        "total_fats_g": total_fats,
        "date": date.isoformat()
    }

def calculate_nutrition_score(db: Session, member_id: str):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return 0
        
    summary = get_daily_summary(db, member_id, datetime.utcnow().date())
    
    # Target values
    target_calories = member.weight_kg * 24 * 1.55 # Basic TDEE approx
    target_protein = member.weight_kg * 1.6
    
    score = 100
    
    # Caloric balance
    if summary["total_calories"] == 0:
        return 0
    cal_ratio = summary["total_calories"] / target_calories
    if cal_ratio < 0.8 or cal_ratio > 1.2:
        score -= 20
        
    # Protein adequacy
    if summary["total_protein_g"] < target_protein:
        score -= 30
        
    # Macro distribution (roughly 40/30/30)
    total_macros = summary["total_protein_g"] + summary["total_carbs_g"] + summary["total_fats_g"]
    if total_macros > 0:
        p_pct = summary["total_protein_g"] / total_macros
        c_pct = summary["total_carbs_g"] / total_macros
        f_pct = summary["total_fats_g"] / total_macros
        
        if not (0.25 <= p_pct <= 0.35): score -= 10
        if not (0.35 <= c_pct <= 0.45): score -= 10
        if not (0.25 <= f_pct <= 0.35): score -= 10
        
    return max(0, score)

def suggest_foods(current_summary):
    # Very basic suggestion
    suggestions = []
    if current_summary["total_protein_g"] < 50:
        suggestions.append("chicken breast")
        suggestions.append("egg")
    if current_summary["total_carbs_g"] < 100:
        suggestions.append("rice")
        suggestions.append("oats")
    return suggestions
