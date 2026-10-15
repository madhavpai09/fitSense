from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from models import NutritionLog, Member

FOOD_CATALOG: List[Dict[str, Any]] = [
    {
        "id": "chicken_breast_cooked",
        "name": "Chicken Breast (Cooked)",
        "category": "Poultry & Meat",
        "calories_per_100g": 165,
        "protein_per_100g": 31.0,
        "carbs_per_100g": 0.0,
        "fats_per_100g": 3.6,
        "fiber_per_100g": 0.0,
        "serving_unit": "1 breast (150g)",
        "serving_weight_g": 150,
        "synonyms": ["chicken", "grilled chicken", "boiled chicken", "murgh", "meat"]
    },
    {
        "id": "boiled_egg_whole",
        "name": "Boiled Egg (Whole, Large)",
        "category": "Eggs & Dairy",
        "calories_per_100g": 155,
        "protein_per_100g": 13.0,
        "carbs_per_100g": 1.1,
        "fats_per_100g": 11.0,
        "fiber_per_100g": 0.0,
        "serving_unit": "1 egg (50g)",
        "serving_weight_g": 50,
        "synonyms": ["egg", "hard boiled egg", "anda", "boiled egg"]
    },
    {
        "id": "egg_whites_boiled",
        "name": "Egg Whites (Boiled)",
        "category": "Eggs & Dairy",
        "calories_per_100g": 52,
        "protein_per_100g": 11.0,
        "carbs_per_100g": 0.7,
        "fats_per_100g": 0.2,
        "fiber_per_100g": 0.0,
        "serving_unit": "1 white (33g)",
        "serving_weight_g": 33,
        "synonyms": ["egg white", "albumen", "egg whites"]
    },
    {
        "id": "roti_chapati",
        "name": "Roti / Chapati (Whole Wheat)",
        "category": "Indian Breads",
        "calories_per_100g": 260,
        "protein_per_100g": 9.2,
        "carbs_per_100g": 50.0,
        "fats_per_100g": 3.0,
        "fiber_per_100g": 6.8,
        "serving_unit": "1 roti (40g)",
        "serving_weight_g": 40,
        "synonyms": ["roti", "chapati", "phulka", "fulka", "wheat roti", "bread"]
    },
    {
        "id": "white_rice_cooked",
        "name": "White Rice (Cooked)",
        "category": "Grains & Cereals",
        "calories_per_100g": 130,
        "protein_per_100g": 2.7,
        "carbs_per_100g": 28.2,
        "fats_per_100g": 0.3,
        "fiber_per_100g": 0.4,
        "serving_unit": "1 katori / bowl (150g)",
        "serving_weight_g": 150,
        "synonyms": ["rice", "steamed rice", "chawal", "boiled rice", "white rice"]
    },
    {
        "id": "paneer_fresh",
        "name": "Paneer (Cottage Cheese)",
        "category": "Dairy & Veg",
        "calories_per_100g": 265,
        "protein_per_100g": 18.3,
        "carbs_per_100g": 3.4,
        "fats_per_100g": 20.8,
        "fiber_per_100g": 0.0,
        "serving_unit": "1 cup cubed (100g)",
        "serving_weight_g": 100,
        "synonyms": ["paneer", "cottage cheese", "panir"]
    },
    {
        "id": "whey_protein_powder",
        "name": "Whey Protein Powder",
        "category": "Supplements",
        "calories_per_100g": 390,
        "protein_per_100g": 80.0,
        "carbs_per_100g": 4.0,
        "fats_per_100g": 2.5,
        "fiber_per_100g": 1.0,
        "serving_unit": "1 scoop (32g)",
        "serving_weight_g": 32,
        "synonyms": ["whey", "protein powder", "shake", "protein shake", "isolate"]
    },
    {
        "id": "banana_fresh",
        "name": "Banana (Fresh, Medium)",
        "category": "Fruits",
        "calories_per_100g": 89,
        "protein_per_100g": 1.1,
        "carbs_per_100g": 22.8,
        "fats_per_100g": 0.3,
        "fiber_per_100g": 2.6,
        "serving_unit": "1 medium (118g)",
        "serving_weight_g": 118,
        "synonyms": ["banana", "kela", "fruit"]
    },
    {
        "id": "dal_tadka",
        "name": "Yellow Dal Tadka (Cooked)",
        "category": "Lentils & Legumes",
        "calories_per_100g": 118,
        "protein_per_100g": 6.8,
        "carbs_per_100g": 15.2,
        "fats_per_100g": 3.6,
        "fiber_per_100g": 3.2,
        "serving_unit": "1 katori / bowl (150g)",
        "serving_weight_g": 150,
        "synonyms": ["dal", "daal", "yellow dal", "toor dal", "moong dal", "sambar"]
    },
    {
        "id": "rolled_oats_raw",
        "name": "Rolled Oats (Raw)",
        "category": "Breakfast & Cereals",
        "calories_per_100g": 389,
        "protein_per_100g": 16.9,
        "carbs_per_100g": 66.3,
        "fats_per_100g": 6.9,
        "fiber_per_100g": 10.6,
        "serving_unit": "1 serving (40g)",
        "serving_weight_g": 40,
        "synonyms": ["oats", "oatmeal", "quaker oats", "porridge"]
    },
    {
        "id": "curd_dahi",
        "name": "Curd / Dahi (Plain)",
        "category": "Dairy",
        "calories_per_100g": 61,
        "protein_per_100g": 3.5,
        "carbs_per_100g": 4.7,
        "fats_per_100g": 3.3,
        "fiber_per_100g": 0.0,
        "serving_unit": "1 katori (150g)",
        "serving_weight_g": 150,
        "synonyms": ["curd", "dahi", "yogurt", "plain curd"]
    },
    {
        "id": "greek_yogurt",
        "name": "Greek Yogurt (High Protein)",
        "category": "Dairy",
        "calories_per_100g": 59,
        "protein_per_100g": 10.0,
        "carbs_per_100g": 3.6,
        "fats_per_100g": 0.4,
        "fiber_per_100g": 0.0,
        "serving_unit": "1 cup (150g)",
        "serving_weight_g": 150,
        "synonyms": ["greek yogurt", "yogurt", "epigamia"]
    },
    {
        "id": "apple_fresh",
        "name": "Apple (Fresh, Medium)",
        "category": "Fruits",
        "calories_per_100g": 52,
        "protein_per_100g": 0.3,
        "carbs_per_100g": 13.8,
        "fats_per_100g": 0.2,
        "fiber_per_100g": 2.4,
        "serving_unit": "1 medium (180g)",
        "serving_weight_g": 180,
        "synonyms": ["apple", "seb", "fruit"]
    },
    {
        "id": "milk_toned",
        "name": "Toned Milk (Low Fat)",
        "category": "Dairy",
        "calories_per_100g": 42,
        "protein_per_100g": 3.4,
        "carbs_per_100g": 5.0,
        "fats_per_100g": 1.0,
        "fiber_per_100g": 0.0,
        "serving_unit": "1 glass (240ml)",
        "serving_weight_g": 240,
        "synonyms": ["milk", "doodh", "toned milk", "skim milk"]
    },
    {
        "id": "peanut_butter",
        "name": "Peanut Butter (Unsweetened)",
        "category": "Nuts & Spreads",
        "calories_per_100g": 588,
        "protein_per_100g": 25.0,
        "carbs_per_100g": 20.0,
        "fats_per_100g": 50.0,
        "fiber_per_100g": 6.0,
        "serving_unit": "1 tbsp (16g)",
        "serving_weight_g": 16,
        "synonyms": ["peanut butter", "pb", "spread"]
    },
    {
        "id": "almonds_raw",
        "name": "Almonds (Raw / Soaked)",
        "category": "Nuts & Seeds",
        "calories_per_100g": 579,
        "protein_per_100g": 21.2,
        "carbs_per_100g": 21.6,
        "fats_per_100g": 49.9,
        "fiber_per_100g": 12.5,
        "serving_unit": "10 almonds (12g)",
        "serving_weight_g": 12,
        "synonyms": ["badam", "nuts", "almonds"]
    },
    {
        "id": "salmon_cooked",
        "name": "Salmon Fillet (Grilled)",
        "category": "Fish & Seafood",
        "calories_per_100g": 208,
        "protein_per_100g": 20.4,
        "carbs_per_100g": 0.0,
        "fats_per_100g": 13.4,
        "fiber_per_100g": 0.0,
        "serving_unit": "1 fillet (150g)",
        "serving_weight_g": 150,
        "synonyms": ["salmon", "fish", "grilled fish", "machli"]
    },
    {
        "id": "broccoli_steamed",
        "name": "Broccoli (Steamed)",
        "category": "Vegetables",
        "calories_per_100g": 34,
        "protein_per_100g": 2.8,
        "carbs_per_100g": 6.6,
        "fats_per_100g": 0.4,
        "fiber_per_100g": 2.6,
        "serving_unit": "1 cup florets (90g)",
        "serving_weight_g": 90,
        "synonyms": ["broccoli", "steamed broccoli", "green veggies"]
    },
    {
        "id": "bread_whole_wheat",
        "name": "Whole Wheat Bread (Brown)",
        "category": "Breads & Toast",
        "calories_per_100g": 265,
        "protein_per_100g": 9.0,
        "carbs_per_100g": 49.0,
        "fats_per_100g": 3.2,
        "fiber_per_100g": 5.5,
        "serving_unit": "2 slices (60g)",
        "serving_weight_g": 60,
        "synonyms": ["bread", "brown bread", "wheat bread", "toast"]
    },
    {
        "id": "brown_rice_cooked",
        "name": "Brown Rice (Cooked)",
        "category": "Grains & Cereals",
        "calories_per_100g": 111,
        "protein_per_100g": 2.6,
        "carbs_per_100g": 23.0,
        "fats_per_100g": 0.9,
        "fiber_per_100g": 1.8,
        "serving_unit": "1 katori / bowl (150g)",
        "serving_weight_g": 150,
        "synonyms": ["brown rice", "healthy rice"]
    },
    {
        "id": "sweet_potato_boiled",
        "name": "Sweet Potato (Boiled)",
        "category": "Vegetables & Tubers",
        "calories_per_100g": 86,
        "protein_per_100g": 1.6,
        "carbs_per_100g": 20.1,
        "fats_per_100g": 0.1,
        "fiber_per_100g": 3.0,
        "serving_unit": "1 medium (130g)",
        "serving_weight_g": 130,
        "synonyms": ["sweet potato", "shakarkandi", "yam"]
    },
    {
        "id": "tofu_firm",
        "name": "Tofu (Firm / Organic)",
        "category": "Vegan & Plant Protein",
        "calories_per_100g": 76,
        "protein_per_100g": 8.0,
        "carbs_per_100g": 1.9,
        "fats_per_100g": 4.8,
        "fiber_per_100g": 0.3,
        "serving_unit": "1 cup cubed (120g)",
        "serving_weight_g": 120,
        "synonyms": ["tofu", "soya tofu", "bean curd"]
    },
    {
        "id": "idli_steamed",
        "name": "Idli (Steamed Rice & Lentil)",
        "category": "South Indian Staples",
        "calories_per_100g": 140,
        "protein_per_100g": 4.5,
        "carbs_per_100g": 28.0,
        "fats_per_100g": 0.5,
        "fiber_per_100g": 1.5,
        "serving_unit": "2 pieces (100g)",
        "serving_weight_g": 100,
        "synonyms": ["idli", "idly", "steamed idli"]
    },
    {
        "id": "plain_dosa",
        "name": "Plain Dosa (Crispy)",
        "category": "South Indian Staples",
        "calories_per_100g": 168,
        "protein_per_100g": 3.9,
        "carbs_per_100g": 29.0,
        "fats_per_100g": 3.7,
        "fiber_per_100g": 1.2,
        "serving_unit": "1 medium (100g)",
        "serving_weight_g": 100,
        "synonyms": ["dosa", "dosai", "sada dosa"]
    },
    {
        "id": "poha_cooked",
        "name": "Poha (Flattened Rice)",
        "category": "Breakfast Staples",
        "calories_per_100g": 180,
        "protein_per_100g": 3.2,
        "carbs_per_100g": 33.0,
        "fats_per_100g": 4.0,
        "fiber_per_100g": 2.0,
        "serving_unit": "1 plate / bowl (150g)",
        "serving_weight_g": 150,
        "synonyms": ["poha", "aval", "flattened rice", "chuda"]
    },
    {
        "id": "rajma_masala",
        "name": "Rajma Masala (Kidney Beans)",
        "category": "Lentils & Legumes",
        "calories_per_100g": 140,
        "protein_per_100g": 7.5,
        "carbs_per_100g": 22.0,
        "fats_per_100g": 2.5,
        "fiber_per_100g": 6.4,
        "serving_unit": "1 katori / bowl (150g)",
        "serving_weight_g": 150,
        "synonyms": ["rajma", "kidney beans", "red beans", "beans"]
    },
    {
        "id": "chana_chickpeas",
        "name": "Boiled Chana / Chickpeas",
        "category": "Lentils & Legumes",
        "calories_per_100g": 164,
        "protein_per_100g": 8.9,
        "carbs_per_100g": 27.4,
        "fats_per_100g": 2.6,
        "fiber_per_100g": 7.6,
        "serving_unit": "1 katori / bowl (150g)",
        "serving_weight_g": 150,
        "synonyms": ["chana", "chickpeas", "chole", "kala chana", "kabuli chana"]
    }
]

# Legacy dictionary format preserved for backward compatibility and test_api
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

for item in FOOD_CATALOG:
    FOOD_DATABASE[item["name"].lower()] = {
        "calories": item["calories_per_100g"],
        "protein_g": item["protein_per_100g"],
        "carbs_g": item["carbs_per_100g"],
        "fats_g": item["fats_per_100g"],
        "fiber_g": item.get("fiber_per_100g", 0.0),
    }

def search_food_database(query: Optional[str] = None) -> List[Dict[str, Any]]:
    if not query or not query.strip():
        # Return popular quick-picks
        return FOOD_CATALOG[:12]

    q = query.strip().lower()
    matches = []

    for item in FOOD_CATALOG:
        name_lower = item["name"].lower()
        cat_lower = item["category"].lower()
        synonyms = [s.lower() for s in item.get("synonyms", [])]

        score = 0
        if name_lower.startswith(q):
            score = 100
        elif any(word.startswith(q) for word in name_lower.split()):
            score = 80
        elif q in name_lower:
            score = 60
        elif any(s.startswith(q) for s in synonyms):
            score = 50
        elif any(q in s for s in synonyms):
            score = 40
        elif q in cat_lower:
            score = 30

        if score > 0:
            matches.append((score, item))

    matches.sort(key=lambda x: x[0], reverse=True)
    return [item for score, item in matches]

def get_daily_summary(db: Session, member_id: str, date: datetime.date):
    logs = db.query(NutritionLog).filter(
        NutritionLog.member_id == member_id,
        NutritionLog.logged_at >= datetime.combine(date, datetime.min.time()),
        NutritionLog.logged_at < datetime.combine(date + timedelta(days=1), datetime.min.time())
    ).order_by(NutritionLog.logged_at.desc()).all()

    total_calories = round(sum(log.calories for log in logs), 1)
    total_protein = round(sum(log.protein_g for log in logs), 1)
    total_carbs = round(sum(log.carbs_g for log in logs), 1)
    total_fats = round(sum(log.fats_g for log in logs), 1)
    total_fiber = round(sum(log.fiber_g or 0 for log in logs), 1)

    member = db.query(Member).filter(Member.id == member_id).first()
    weight = member.weight_kg if member and member.weight_kg else 70.0
    target_calories = round(weight * 24 * 1.35)
    target_protein = round(weight * 1.8)
    target_carbs = round((target_calories * 0.45) / 4)
    target_fats = round((target_calories * 0.25) / 9)
    target_fiber = 30.0

    return {
        "total_calories": total_calories,
        "total_protein_g": total_protein,
        "total_carbs_g": total_carbs,
        "total_fats_g": total_fats,
        "total_protein": total_protein,
        "total_carbs": total_carbs,
        "total_fats": total_fats,
        "total_fiber_g": total_fiber,
        "target_calories": target_calories,
        "target_protein": target_protein,
        "target_carbs": target_carbs,
        "target_fats": target_fats,
        "target_fiber": target_fiber,
        "remaining_calories": max(0.0, round(target_calories - total_calories, 1)),
        "date": date.isoformat(),
        "items": logs
    }

def calculate_nutrition_score(db: Session, member_id: str):
    member = db.query(Member).filter(Member.id == member_id).first()
    if not member:
        return 0

    summary = get_daily_summary(db, member_id, datetime.utcnow().date())

    target_calories = summary.get("target_calories") or (member.weight_kg * 24 * 1.35)
    target_protein = summary.get("target_protein") or (member.weight_kg * 1.6)

    score = 100

    if summary["total_calories"] == 0:
        return 0
    cal_ratio = summary["total_calories"] / target_calories
    if cal_ratio < 0.8 or cal_ratio > 1.2:
        score -= 20

    if summary["total_protein_g"] < target_protein:
        score -= 30

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
    suggestions = []
    if current_summary.get("total_protein_g", 0) < 50:
        suggestions.append("Chicken Breast (Cooked)")
        suggestions.append("Boiled Egg (Whole)")
        suggestions.append("Whey Protein Powder")
    if current_summary.get("total_carbs_g", 0) < 100:
        suggestions.append("White Rice (Cooked)")
        suggestions.append("Rolled Oats (Raw)")
        suggestions.append("Roti / Chapati")
    return suggestions
