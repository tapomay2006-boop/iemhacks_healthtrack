import os
import sys
import json
import numpy as np
import pandas as pd

# Force UTF-8 encoding for Windows terminal output
sys.stdout.reconfigure(encoding='utf-8')

from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from xgboost import XGBClassifier
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType

def main():
    print("🚀 Loading dataset: Final_Augmented_dataset_Diseases_and_Symptoms.csv...")
    dataset_path = os.path.join(os.path.dirname(__file__), "..", "Final_Augmented_dataset_Diseases_and_Symptoms.csv")
    
    if not os.path.exists(dataset_path):
        print(f"❌ Error: Dataset not found at {dataset_path}")
        return

    df = pd.read_csv(dataset_path)
    print(f"📊 Dataset Shape: {df.shape[0]} rows, {df.shape[1]} columns")

    # Column 0 is 'diseases', remaining columns are symptom binary indicators
    disease_col = df.columns[0]
    symptom_cols = df.columns[1:].tolist()

    print(f"Total diseases: {df[disease_col].nunique()}")
    print(f"Total symptoms: {len(symptom_cols)}")

    # 1. Define Triage Risk Mapping based on Clinical Severity
    # We map target diseases into RED (2), YELLOW (1), and GREEN (0)
    red_diseases = {
        'panic disorder', 'cholera', 'dengue', 'pneumonia', 'acute respiratory distress syndrome',
        'pulmonary embolism', 'sepsis', 'anaphylaxis', 'heart attack', 'myocardial infarction',
        'stroke', 'meningitis', 'tuberculosis', 'severe dehydration', 'asthma exacerbation',
        'acute coronary syndrome', 'appendicitis', 'peritonitis'
    }

    yellow_diseases = {
        'bronchitis', 'gastroenteritis', 'malaria', 'typhoid', 'influenza', 'flu',
        'covid-19', 'hypertension', 'migraine', 'urinary tract infection', 'kidney stone',
        'sinusitis', 'tonsillitis', 'otitis media', 'gallstones', 'gastritis'
    }

    def assign_risk_level(disease_name):
        d_lower = str(disease_name).lower().strip()
        if any(r in d_lower for r in red_diseases):
            return 2  # RED (CRITICAL)
        elif any(y in d_lower for y in yellow_diseases):
            return 1  # YELLOW (MODERATE)
        else:
            # Default heuristic based on severity keywords
            if any(k in d_lower for k in ['acute', 'severe', 'failure', 'shock', 'hemorrhage']):
                return 2
            elif any(k in d_lower for k in ['chronic', 'infection', 'fever', 'pain', 'inflammation']):
                return 1
            return 0  # GREEN (MILD)

    df['risk_level'] = df[disease_col].apply(assign_risk_level)
    print("📈 Risk Distribution:")
    print(df['risk_level'].value_counts())

    # 2. Select top 25 clinical features + vitals for lightweight Edge ONNX model
    # We prioritize common high-impact symptoms across the dataset
    symptom_counts = df[symptom_cols].sum().sort_values(ascending=False)
    selected_symptoms = symptom_counts.head(25).index.tolist()
    
    print("\n🔍 Top 25 Clinical Features Selected for Edge Model:")
    for idx, s in enumerate(selected_symptoms):
        print(f"  {idx+1}. {s}")

    # Feature matrix X and target y
    X = df[selected_symptoms].values.astype(np.float32)
    y = df['risk_level'].values

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    print("\n⚙️ Training XGBoost Triage Model...")
    clf = XGBClassifier(
        n_estimators=100,
        max_depth=5,
        learning_rate=0.1,
        eval_metric='mlogloss',
        random_state=42
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"✅ XGBoost Model Accuracy: {acc * 100:.2f}%")
    print(classification_report(y_test, y_pred, target_names=['GREEN (Mild)', 'YELLOW (Moderate)', 'RED (Critical)']))

    # 3. Export to ONNX Format for browser WASM execution
    print("\n📦 Converting XGBoost Model to ONNX format...")
    initial_types = [('float_input', FloatTensorType([None, len(selected_symptoms)]))]
    onnx_model = onnxmltools.convert_xgboost(clf, initial_types=initial_types)

    # Prepare public output directory
    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "models")
    os.makedirs(out_dir, exist_ok=True)
    
    onnx_path = os.path.join(out_dir, "triage_model.onnx")
    onnxmltools.utils.save_model(onnx_model, onnx_path)
    print(f"🎉 ONNX Model saved to: {onnx_path} ({os.path.getsize(onnx_path) / 1024:.2f} KB)")

    # 4. Save metadata JSON for the React Frontend
    metadata = {
        "features": selected_symptoms,
        "feature_count": len(selected_symptoms),
        "risk_levels": {
            "0": {"label": "GREEN", "description": "Mild condition. Provide basic care & observe."},
            "1": {"label": "YELLOW", "description": "Moderate condition. Schedule PHC visit."},
            "2": {"label": "RED", "description": "CRITICAL RISK! Immediate emergency transport required."}
        },
        "accuracy": round(float(acc), 4)
    }

    meta_path = os.path.join(out_dir, "symptom_features.json")
    with open(meta_path, "w") as f:
        json.dump(metadata, f, indent=2)
    print(f"📋 Metadata saved to: {meta_path}")

if __name__ == "__main__":
    main()
