import os
import sys
import json
import numpy as np
import pandas as pd

# Force UTF-8 encoding for Windows terminal output
sys.stdout.reconfigure(encoding='utf-8')

from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
from xgboost import XGBClassifier
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType

def main():
    print("🚀 Loading full dataset: Final_Augmented_dataset_Diseases_and_Symptoms.csv...")
    dataset_path = os.path.join(os.path.dirname(__file__), "..", "Final_Augmented_dataset_Diseases_and_Symptoms.csv")
    
    if not os.path.exists(dataset_path):
        print(f"❌ Error: Dataset not found at {dataset_path}")
        return

    df = pd.read_csv(dataset_path)
    print(f"📊 Full Dataset Shape: {df.shape[0]} rows, {df.shape[1]} columns")

    # Column 0 is 'diseases', remaining 377 columns are symptom binary indicators
    disease_col = df.columns[0]
    all_symptom_cols = df.columns[1:].tolist()

    print(f"Total Unique Diseases in Dataset: {df[disease_col].nunique()}")
    print(f"Total Symptom Features Extracted: {len(all_symptom_cols)}")

    # 1. Define Triage Risk Mapping based on Clinical Severity
    red_diseases = {
        'panic disorder', 'cholera', 'dengue', 'pneumonia', 'acute respiratory distress syndrome',
        'pulmonary embolism', 'sepsis', 'anaphylaxis', 'heart attack', 'myocardial infarction',
        'stroke', 'meningitis', 'tuberculosis', 'severe dehydration', 'asthma exacerbation',
        'acute coronary syndrome', 'appendicitis', 'peritonitis', 'hypertensive crisis'
    }

    yellow_diseases = {
        'bronchitis', 'gastroenteritis', 'malaria', 'typhoid', 'influenza', 'flu',
        'covid-19', 'hypertension', 'migraine', 'urinary tract infection', 'kidney stone',
        'sinusitis', 'tonsillitis', 'otitis media', 'gallstones', 'gastritis', 'chickenpox'
    }

    def assign_risk_level(disease_name):
        d_lower = str(disease_name).lower().strip()
        if any(r in d_lower for r in red_diseases):
            return 2  # RED (CRITICAL)
        elif any(y in d_lower for y in yellow_diseases):
            return 1  # YELLOW (MODERATE)
        else:
            if any(k in d_lower for k in ['acute', 'severe', 'failure', 'shock', 'hemorrhage']):
                return 2
            elif any(k in d_lower for k in ['chronic', 'infection', 'fever', 'pain', 'inflammation']):
                return 1
            return 0  # GREEN (MILD)

    df['risk_level'] = df[disease_col].apply(assign_risk_level)

    # 2. Disease Label Grouping for Top Probable Disease Conditions
    # Map top disease occurrences and group remaining into clinical categories
    top_diseases = df[disease_col].value_counts().head(30).index.tolist()
    
    def map_to_top_disease(disease_name):
        d_str = str(disease_name).strip()
        if d_str in top_diseases:
            return d_str
        d_lower = d_str.lower()
        if 'pneumonia' in d_lower or 'respiratory' in d_lower:
            return 'Pneumonia / Severe ARI'
        elif 'dengue' in d_lower:
            return 'Dengue Fever'
        elif 'cholera' in d_lower or 'gastro' in d_lower:
            return 'Cholera / Gastroenteritis'
        elif 'malaria' in d_lower:
            return 'Malaria'
        elif 'covid' in d_lower or 'flu' in d_lower or 'influenza' in d_lower:
            return 'Influenza / COVID-19'
        elif 'fever' in d_lower:
            return 'Acute Febrile Illness'
        return 'Acute Febrile Syndrome'

    df['probable_disease'] = df[disease_col].apply(map_to_top_disease)
    disease_classes = sorted(df['probable_disease'].unique().tolist())
    disease_to_id = {name: idx for idx, name in enumerate(disease_classes)}
    df['disease_label_id'] = df['probable_disease'].map(disease_to_id)

    print(f"\n🔬 Top Clinical Disease Classes Identified ({len(disease_classes)} classes):")
    for d_name in disease_classes[:10]:
        print(f"  • {d_name}")

    # Feature matrix X using ALL 377 symptoms
    X = df[all_symptom_cols].values.astype(np.float32)
    y_risk = df['risk_level'].values

    print(f"\n🧠 Training XGBoost Model on ALL {len(all_symptom_cols)} Symptom Features...")
    X_train, X_test, y_train, y_test = train_test_split(X, y_risk, test_size=0.2, random_state=42, stratify=y_risk)

    clf = XGBClassifier(
        n_estimators=80,
        max_depth=6,
        learning_rate=0.15,
        eval_metric='mlogloss',
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    acc = accuracy_score(y_test, y_pred)
    print(f"✅ XGBoost Model Accuracy across ALL {len(all_symptom_cols)} features: {acc * 100:.2f}%")

    # 3. Export to ONNX Format for browser WASM execution
    print(f"\n📦 Converting 377-Feature Model to ONNX format...")
    initial_types = [('float_input', FloatTensorType([None, len(all_symptom_cols)]))]
    onnx_model = onnxmltools.convert_xgboost(clf, initial_types=initial_types)

    out_dir = os.path.join(os.path.dirname(__file__), "..", "public", "models")
    os.makedirs(out_dir, exist_ok=True)
    
    onnx_path = os.path.join(out_dir, "triage_model.onnx")
    onnxmltools.utils.save_model(onnx_model, onnx_path)
    print(f"🎉 Full 377-Feature ONNX Model saved to: {onnx_path} ({os.path.getsize(onnx_path) / 1024:.2f} KB)")

    # 4. Save metadata JSON with all 377 features & disease mapping
    disease_mapping = {}
    for d_name in disease_classes:
        r_lvl = assign_risk_level(d_name)
        disease_mapping[d_name] = {
            "risk_level": "RED" if r_lvl == 2 else ("YELLOW" if r_lvl == 1 else "GREEN"),
            "risk_code": r_lvl
        }

    metadata = {
        "features": all_symptom_cols,
        "feature_count": len(all_symptom_cols),
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

    disease_meta_path = os.path.join(out_dir, "disease_labels.json")
    with open(disease_meta_path, "w") as f:
        json.dump(disease_mapping, f, indent=2)

    print(f"📋 Metadata saved successfully ({len(all_symptom_cols)} symptoms & {len(disease_classes)} diseases) to {meta_path}")

if __name__ == "__main__":
    main()
