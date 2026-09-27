import pandas as pd
import numpy as np
import os

def generate_dataset(n_samples=2000):
    np.random.seed(42)
    
    # Age weighted towards 25-45
    ages = np.random.choice(
        np.concatenate([
            np.random.randint(18, 25, size=int(n_samples * 0.15)),
            np.random.randint(25, 46, size=int(n_samples * 0.60)),
            np.random.randint(46, 66, size=int(n_samples * 0.25))
        ])
    )
    
    fitness_level_score = np.random.randint(1, 6, size=n_samples)
    nutrition_score = np.random.uniform(0, 100, size=n_samples)
    
    avg_speed_last10 = np.clip(3.0 + (fitness_level_score - 1) * 2.5 + np.random.normal(0, 1.0, n_samples), 3.0, 15.0)
    avg_incline_last10 = np.clip((fitness_level_score - 1) * 3 + np.random.normal(0, 1.5, n_samples), 0, 15)
    avg_duration_last10 = np.clip(10 + (fitness_level_score - 1) * 10 + np.random.normal(0, 5, n_samples), 10, 60)
    
    current_machine_load = np.random.uniform(0.5, 5.0, size=n_samples)
    
    # Targets
    nutrition_speed_boost = (nutrition_score / 100) * 0.5
    speed_overload = np.random.uniform(1.02, 1.05, size=n_samples)
    recommended_speed_kmh = (avg_speed_last10 * speed_overload) + nutrition_speed_boost
    
    incline_overload = np.random.uniform(1.0, 1.05, size=n_samples)
    recommended_incline_deg = avg_incline_last10 * incline_overload
    
    nutrition_duration_boost = (nutrition_score / 100) * 2
    duration_overload = np.random.uniform(1.0, 1.05, size=n_samples)
    recommended_duration_min = (avg_duration_last10 * duration_overload) + nutrition_duration_boost
    
    # Add noise
    recommended_speed_kmh *= np.random.uniform(0.95, 1.05, size=n_samples)
    recommended_incline_deg *= np.random.uniform(0.95, 1.05, size=n_samples)
    recommended_duration_min *= np.random.uniform(0.95, 1.05, size=n_samples)
    
    df = pd.DataFrame({
        'age': ages,
        'fitness_level_score': fitness_level_score,
        'nutrition_score': nutrition_score,
        'avg_speed_last10': avg_speed_last10,
        'avg_incline_last10': avg_incline_last10,
        'avg_duration_last10': avg_duration_last10,
        'current_machine_load': current_machine_load,
        'recommended_speed_kmh': recommended_speed_kmh,
        'recommended_incline_deg': recommended_incline_deg,
        'recommended_duration_min': recommended_duration_min
    })
    
    return df

if __name__ == '__main__':
    df = generate_dataset(2000)
    output_path = os.path.join(os.path.dirname(__file__), 'training_data.csv')
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} samples and saved to {output_path}")
