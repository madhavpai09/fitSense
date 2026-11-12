from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
import joblib, os, numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'fitsense_model.joblib')

INPUT_FEATURES = ['age', 'fitness_level_score', 'nutrition_score',
                  'avg_speed_last10', 'avg_incline_last10', 
                  'avg_duration_last10', 'current_machine_load']

OUTPUT_TARGETS = ['recommended_speed_kmh', 'recommended_incline_deg', 
                  'recommended_duration_min']

# Exercise physiology baseline constraints
PHYSIOLOGICAL_MIN_DURATION = 15.0  # Minimum 15 minutes for cardio efficacy
PHYSIOLOGICAL_MIN_SPEED = 3.5     # Minimum 3.5 km/h walking pace
PHYSIOLOGICAL_MIN_INCLINE = 1.0   # 1.0 degree minimum road simulation

def load_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None

def apply_injury_risk_guard(prediction, rolling_averages):
    """Ensure recommended workout parameters adhere to progressive overload limits (<115%)
    while strictly enforcing realistic physiological minimums.
    """
    capped = prediction.copy()
    injury_risk_flag = False
    details = []
    
    avg_speed = rolling_averages.get('avg_speed_last10', 0)
    avg_incline = rolling_averages.get('avg_incline_last10', 0)
    avg_duration = rolling_averages.get('avg_duration_last10', 0)

    # 1. Speed Guard: Cap at 115% of historical speed only if baseline is established
    if avg_speed >= PHYSIOLOGICAL_MIN_SPEED and capped['recommended_speed_kmh'] > 1.15 * avg_speed:
        capped['recommended_speed_kmh'] = 1.15 * avg_speed
        injury_risk_flag = True
        details.append("Speed capped to 115% of historical pace.")

    # 2. Incline Guard: Prevent steep jumps > 2.0 degrees over historical grade
    if avg_incline >= PHYSIOLOGICAL_MIN_INCLINE and capped['recommended_incline_deg'] > (avg_incline + 2.0):
        capped['recommended_incline_deg'] = avg_incline + 1.5
        injury_risk_flag = True
        details.append("Incline capped to prevent knee/tendon overexertion.")

    # 3. Duration Guard: Cap at 115% only if previous volume is already a full workout (>=15 min)
    # NEVER cap a workout duration to under 15 minutes due to test runs or premature exits!
    if avg_duration >= PHYSIOLOGICAL_MIN_DURATION and capped['recommended_duration_min'] > 1.15 * avg_duration:
        capped['recommended_duration_min'] = 1.15 * avg_duration
        injury_risk_flag = True
        details.append("Duration capped to 115% of previous endurance volume.")

    # Enforce physiological safety & efficacy bounds
    capped['recommended_speed_kmh'] = float(np.clip(capped['recommended_speed_kmh'], PHYSIOLOGICAL_MIN_SPEED, 16.0))
    capped['recommended_incline_deg'] = float(np.clip(capped['recommended_incline_deg'], PHYSIOLOGICAL_MIN_INCLINE, 15.0))
    capped['recommended_duration_min'] = float(np.clip(capped['recommended_duration_min'], PHYSIOLOGICAL_MIN_DURATION, 60.0))

    # Round to realistic, clean human gym numbers
    capped['recommended_speed_kmh'] = round(capped['recommended_speed_kmh'], 1)
    capped['recommended_incline_deg'] = round(capped['recommended_incline_deg'] * 2) / 2.0  # nearest 0.5 deg
    capped['recommended_duration_min'] = round(capped['recommended_duration_min'])          # nearest integer minute

    capped['injury_risk_flag'] = injury_risk_flag
    capped['injury_risk_details'] = " ".join(details) if details else "Optimal training load verified."
    return capped

def predict(features_dict):
    model = load_model()
    if not model:
        raise ValueError("Model not found")
        
    X = np.array([[features_dict[f] for f in INPUT_FEATURES]])
    y_pred = model.predict(X)[0]
    
    pred_dict = {
        'recommended_speed_kmh': float(y_pred[0]),
        'recommended_incline_deg': float(y_pred[1]),
        'recommended_duration_min': float(y_pred[2])
    }
    
    rolling_averages = {
        'avg_speed_last10': features_dict['avg_speed_last10'],
        'avg_incline_last10': features_dict['avg_incline_last10'],
        'avg_duration_last10': features_dict['avg_duration_last10']
    }
    
    return apply_injury_risk_guard(pred_dict, rolling_averages)

def cold_start_defaults(member):
    fitness_level = getattr(member, 'fitness_level_score', 1) or 1
    
    defaults = {
        1: {'speed': 4.5, 'incline': 1.0, 'duration': 15.0},
        2: {'speed': 5.5, 'incline': 1.5, 'duration': 20.0},
        3: {'speed': 7.0, 'incline': 2.5, 'duration': 25.0},
        4: {'speed': 8.5, 'incline': 4.0, 'duration': 35.0},
        5: {'speed': 10.5, 'incline': 6.0, 'duration': 45.0}
    }
    
    level_defaults = defaults.get(fitness_level, defaults[1])
    return {
        'recommended_speed_kmh': level_defaults['speed'],
        'recommended_incline_deg': level_defaults['incline'],
        'recommended_duration_min': level_defaults['duration'],
        'injury_risk_flag': False,
        'injury_risk_details': "Baseline fitness plan active"
    }

def generate_plan(member, recent_summaries, nutrition_score=50.0):
    """Generate a personalised workout plan.
    
    Args:
        member: SQLAlchemy Member object
        recent_summaries: list of SQLAlchemy SessionSummary objects (most recent first)
        nutrition_score: float, score from nutrition engine (0-100)
    
    Returns:
        dict with recommended_speed_kmh, recommended_incline_deg,
             recommended_duration_min, injury_risk_flag, injury_risk_details
    """
    if not member:
        return cold_start_defaults(None)
    
    fitness_level = getattr(member, 'fitness_level_score', 1) or 1
    baseline = cold_start_defaults(member)
    
    if not recent_summaries or len(recent_summaries) == 0:
        return baseline
    
    # Filter out short test bursts (< 2 min) so they don't artificially collapse training volume
    valid_summaries = [s for s in recent_summaries if getattr(s, 'total_duration_min', 0) and s.total_duration_min >= 2.0]
    
    if valid_summaries:
        avg_speed = sum(s.avg_speed for s in valid_summaries) / len(valid_summaries)
        avg_incline = sum(s.avg_incline for s in valid_summaries) / len(valid_summaries)
        avg_duration = sum(s.total_duration_min for s in valid_summaries) / len(valid_summaries)
    else:
        # If user only ran short sensor tests, anchor features to their fitness tier baseline
        avg_speed = max(sum(s.avg_speed for s in recent_summaries) / len(recent_summaries), baseline['recommended_speed_kmh'])
        avg_incline = max(sum(s.avg_incline for s in recent_summaries) / len(recent_summaries), baseline['recommended_incline_deg'])
        avg_duration = baseline['recommended_duration_min']
    
    # Enforce lower thresholds for feature input
    avg_speed = max(avg_speed, PHYSIOLOGICAL_MIN_SPEED)
    avg_incline = max(avg_incline, PHYSIOLOGICAL_MIN_INCLINE)
    avg_duration = max(avg_duration, PHYSIOLOGICAL_MIN_DURATION)
    
    features = {
        'age': getattr(member, 'age', 30) or 30,
        'fitness_level_score': fitness_level,
        'nutrition_score': float(nutrition_score if nutrition_score is not None else 50.0),
        'avg_speed_last10': avg_speed,
        'avg_incline_last10': avg_incline,
        'avg_duration_last10': avg_duration,
        'current_machine_load': 2.5
    }
    
    try:
        return predict(features)
    except (ValueError, Exception):
        return baseline
