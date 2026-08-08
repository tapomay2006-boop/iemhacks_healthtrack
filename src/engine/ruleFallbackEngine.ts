import type { Vitals } from './dexieDb';

export interface DiseaseScore {
  diseaseName: string;
  confidence: number; // 0.0 to 1.0
  matchedSymptoms: string[];
}

export interface RuleEvaluationResult {
  isHardOverride: boolean;
  forcedRiskLevel?: 'RED' | 'YELLOW' | 'GREEN';
  predictedDisease: string;
  diseaseConfidence: number;
  reason?: string;
  careInstructions: string[];
}

// Clinical Disease Profile Scoring Matrix (Symptoms + Vitals Weighted Vector)
const CLINICAL_DISEASE_RULES = [
  {
    name: 'Pneumonia / Severe Acute Respiratory Infection (ARI)',
    requiredVitals: (v: Vitals) => v.spO2 < 93 || v.respRate > 28,
    symptomWeights: ['shortness of breath', 'breathing fast', 'cough', 'sore throat', 'fever', 'sharp chest pain', 'chest tightness', 'lethargy'],
    minMatch: 2,
    baseRisk: 'RED',
  },
  {
    name: 'Dengue Fever / Febrile Vector-Borne Illness',
    requiredVitals: (v: Vitals) => v.temperature >= 100.8,
    symptomWeights: ['fever', 'maculopapular rash', 'skin lesion', 'joint pain', 'muscle pain', 'chills', 'headache', 'eye redness', 'vomiting'],
    minMatch: 2,
    baseRisk: 'RED',
  },
  {
    name: 'Cholera / Severe Acute Gastroenteritis',
    requiredVitals: (v: Vitals) => v.bpSystolic < 100 || v.pulseRate > 110,
    symptomWeights: ['vomiting', 'diarrhea', 'nausea', 'abdominal pain', 'lethargy', 'dizziness'],
    minMatch: 2,
    baseRisk: 'RED',
  },
  {
    name: 'Malaria / Paroxysmal Febrile Illness',
    requiredVitals: (v: Vitals) => v.temperature >= 101.0,
    symptomWeights: ['fever', 'chills', 'sweating', 'headache', 'lethargy', 'vomiting'],
    minMatch: 2,
    baseRisk: 'YELLOW',
  },
  {
    name: 'COVID-19 / Severe Viral Syndrome',
    requiredVitals: (v: Vitals) => v.temperature >= 100.4,
    symptomWeights: ['fever', 'cough', 'shortness of breath', 'sore throat', 'loss of appetite', 'headache', 'dizziness'],
    minMatch: 2,
    baseRisk: 'YELLOW',
  },
  {
    name: 'Acute Hyperpyrexia High Fever',
    requiredVitals: (v: Vitals) => v.temperature > 103.5,
    symptomWeights: ['fever', 'chills', 'confusion', 'seizures'],
    minMatch: 1,
    baseRisk: 'RED',
  }
];

export function evaluateDeterministicRules(vitals: Vitals, symptoms: Record<string, boolean>): RuleEvaluationResult {
  const instructions: string[] = [];
  const activeSymptoms = Object.keys(symptoms).filter(s => symptoms[s]);

  // 1. HARD OVERRIDE: Hypoxia SpO2 < 90%
  if (vitals.spO2 > 0 && vitals.spO2 < 90) {
    instructions.push('Provide immediate supplemental oxygen if available.');
    instructions.push('Keep patient seated upright to reduce respiratory distress.');
    instructions.push('Emergency dispatch to nearest Primary Health Center (PHC).');
    return {
      isHardOverride: true,
      forcedRiskLevel: 'RED',
      predictedDisease: 'Severe Pneumonia / Hypoxic Respiratory Failure',
      diseaseConfidence: 0.96,
      reason: `Critical Hypoxia (SpO2: ${vitals.spO2}% < 90%)`,
      careInstructions: instructions
    };
  }

  // 2. EQUAL WEIGHT SYMPTOM + VITALS CLINICAL DISEASE MATCHING
  let bestMatch: DiseaseScore | null = null;
  let highestScore = 0;
  let matchBaseRisk: string = 'GREEN';

  CLINICAL_DISEASE_RULES.forEach((rule) => {
    const matched = rule.symptomWeights.filter(sym => symptoms[sym]);
    const vitalsPass = rule.requiredVitals(vitals);
    
    // Weight calculation: symptom count + vitals check bonus
    let score = matched.length / rule.symptomWeights.length;
    if (vitalsPass) score += 0.35;

    if (matched.length >= rule.minMatch || (vitalsPass && matched.length >= 1)) {
      if (score > highestScore) {
        highestScore = score;
        bestMatch = {
          diseaseName: rule.name,
          confidence: Math.min(0.95, parseFloat(score.toFixed(2))),
          matchedSymptoms: matched,
        };
        matchBaseRisk = rule.baseRisk;
      }
    }
  });

  // 3. GENERATE TAILORED CARE INSTRUCTIONS & FINAL RISK LEVEL
  if (bestMatch) {
    const match = bestMatch as DiseaseScore;
    const isRedRisk = matchBaseRisk === 'RED' || vitals.temperature > 103.0 || vitals.spO2 < 92;
    
    if (isRedRisk) {
      instructions.push(`Immediate medical evaluation required for suspected ${match.diseaseName}.`);
      instructions.push('Administer oral rehydration fluids and antipyretics under clinical guidance.');
      instructions.push('Prepare for emergency ambulance referral if vitals deteriorate.');
      return {
        isHardOverride: true,
        forcedRiskLevel: 'RED',
        predictedDisease: match.diseaseName,
        diseaseConfidence: match.confidence,
        reason: `Clinical match for ${match.diseaseName} (${match.matchedSymptoms.length} matching symptoms + vitals)`,
        careInstructions: instructions
      };
    } else {
      instructions.push(`Monitor symptoms closely for ${match.diseaseName}.`);
      instructions.push('Ensure frequent oral hydration (ORS) and rest.');
      instructions.push('Consult nearby PHC within 24 hours if fever or symptoms worsen.');
      return {
        isHardOverride: false,
        forcedRiskLevel: 'YELLOW',
        predictedDisease: match.diseaseName,
        diseaseConfidence: match.confidence,
        reason: `Moderate match for ${match.diseaseName}`,
        careInstructions: instructions
      };
    }
  }



  // 4. DEFAULT GREEN / MILD VIRAL INFECTION
  instructions.push('Maintain hydration and routine nutrition.');
  instructions.push('Re-evaluate if symptoms persist over 48 hours.');

  return {
    isHardOverride: false,
    forcedRiskLevel: 'GREEN',
    predictedDisease: activeSymptoms.length > 0 ? 'Mild Upper Viral Infection' : 'Low Risk / Normal Vitals',
    diseaseConfidence: 0.75,
    careInstructions: instructions
  };
}


