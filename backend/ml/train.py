import os
import joblib
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.multioutput import MultiOutputRegressor
from sklearn.metrics import r2_score, mean_absolute_error

try:
    from .model import MODEL_PATH, INPUT_FEATURES, OUTPUT_TARGETS
    from .synthetic_data import generate_dataset
except ImportError:
    from model import MODEL_PATH, INPUT_FEATURES, OUTPUT_TARGETS
    from synthetic_data import generate_dataset

def train():
    data_path = os.path.join(os.path.dirname(__file__), 'training_data.csv')
    
    if os.path.exists(data_path):
        df = pd.read_csv(data_path)
    else:
        df = generate_dataset()
        df.to_csv(data_path, index=False)
        
    X = df[INPUT_FEATURES]
    y = df[OUTPUT_TARGETS]
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    base_rf = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model = MultiOutputRegressor(base_rf)
    
    model.fit(X_train, y_train)
    
    y_pred = model.predict(X_test)
    
    for i, target in enumerate(OUTPUT_TARGETS):
        r2 = r2_score(y_test.iloc[:, i], y_pred[:, i])
        mae = mean_absolute_error(y_test.iloc[:, i], y_pred[:, i])
        print(f"{target}: R2={r2:.4f}, MAE={mae:.4f}")
        
    for i, target in enumerate(OUTPUT_TARGETS):
        print(f"\nFeature importance for {target}:")
        importances = model.estimators_[i].feature_importances_
        for feat, imp in zip(INPUT_FEATURES, importances):
            print(f"  {feat}: {imp:.4f}")
            
    joblib.dump(model, MODEL_PATH)
    print(f"\nModel saved to {MODEL_PATH}")

if __name__ == '__main__':
    train()
