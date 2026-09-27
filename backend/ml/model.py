from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
import joblib, os, numpy as np

MODEL_PATH = os.path.join(os.path.dirname(__file__), 'fitsense_model.joblib')

INPUT_FEATURES = ['age', 'fitness_level_score', 'nutrition_score',
                  'avg_speed_last10', 'avg_incline_last10', 
                  'avg_duration_last10', 'current_machine_load']

OUTPUT_TARGETS = ['recommended_speed_kmh', 'recommended_incline_deg', 
                  'recommended_duration_min']

def load_model():
    if os.path.exists(MODEL_PATH):
        return joblib.load(MODEL_PATH)
    return None

def apply_injury_risk_guard(prediction, rolling_averages):
    capped_prediction = prediction.copy()
    injury_risk_flag = False
    details = []
    
    for i, target in enumerate(OUTPUT_TARGETS):
        rolling_key = INPUT_FEATURES[i+3] # maps to avg_speed, avg_incline, avg_duration
        rolling_val = rolling_averages.get(rolling_key, 0)
        
        if rolling_val > 0 and capped_prediction[target] > 1.15 * rolling_val:
            capped_prediction[target] = 1.15 * rolling_val
            injury_risk_flag = True
            details.append(f"{target} capped to 115% of rolling average.")
            
    capped_prediction['injury_risk_flag'] = injury_risk_flag
    capped_prediction['injury_risk_details'] = " ".join(details)
    return capped_prediction

def predict(features_dict):
    model = load_model()
    if not model:
        raise ValueError("Model not found")
        
    X = np.array([[features_dict[f] for f in INPUT_FEATURES]])
    y_pred = model.predict(X)[0]
    
    pred_dict = {
        'recommended_speed_kmh': y_pred[0],
        'recommended_incline_deg': y_pred[1],
        'recommended_duration_min': y_pred[2]
    }
    
    # Extract rolling averages from features for guard
    rolling_averages = {
        'avg_speed_last10': features_dict['avg_speed_last10'],
        'avg_incline_last10': features_dict['avg_incline_last10'],
        'avg_duration_last10': features_dict['avg_duration_last10']
    }
    
    return apply_injury_risk_guard(pred_dict, rolling_averages)

def cold_start_defaults(member):
    fitness_level = getattr(member, 'fitness_level_score', 1)
    
    defaults = {
        1: {'speed': 4, 'incline': 1, 'duration': 15},
        2: {'speed': 5.5, 'incline': 2, 'duration': 20},
        3: {'speed': 7, 'incline': 4, 'duration': 25},
        4: {'speed': 9, 'incline': 6, 'duration': 35},
        5: {'speed': 11, 'incline': 8, 'duration': 45}
    }
    
    level_defaults = defaults.get(fitness_level, defaults[1])
    return {
        'recommended_speed_kmh': level_defaults['speed'],
        'recommended_incline_deg': level_defaults['incline'],
        'recommended_duration_min': level_defaults['duration'],
        'injury_risk_flag': False,
        'injury_risk_details': "Cold start defaults applied"
    }

def generate_plan(member, recent_summaries):
    """Generate a personalised workout plan.
    
    Args:
        member: SQLAlchemy Member object
        recent_summaries: list of SQLAlchemy SessionSummary objects (most recent first)
    
    Returns:
        dict with recommended_speed_kmh, recommended_incline_deg,
             recommended_duration_min, injury_risk_flag, injury_risk_details
    """
    if not member:
        return cold_start_defaults(None)
    
    if len(recent_summaries) < 10:
        return cold_start_defaults(member)
    
    avg_speed = sum(s.avg_speed for s in recent_summaries) / len(recent_summaries)
    avg_incline = sum(s.avg_incline for s in recent_summaries) / len(recent_summaries)
    avg_duration = sum(s.total_duration_min for s in recent_summaries) / len(recent_summaries)
    
    features = {
        'age': getattr(member, 'age', 30),
        'fitness_level_score': getattr(member, 'fitness_level_score', 1),
        'nutrition_score': 50.0,  # Default; can be enriched with nutrition engine
        'avg_speed_last10': avg_speed,
        'avg_incline_last10': avg_incline,
        'avg_duration_last10': avg_duration,
        'current_machine_load': 2.5  # Placeholder
    }
    
    try:
        return predict(features)
    except (ValueError, Exception):
        # If model not loaded, fall back to cold start
        return cold_start_defaults(member)

