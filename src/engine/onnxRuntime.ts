import * as ort from 'onnxruntime-web';
import { evaluateDeterministicRules, type RuleEvaluationResult } from './ruleFallbackEngine';
import type { Vitals } from './dexieDb';

export interface ModelMetadata {
  features: string[];
  feature_count: number;
  risk_levels: Record<string, { label: string; description: string }>;
  accuracy: number;
}

let session: ort.InferenceSession | null = null;
let metadata: ModelMetadata | null = null;
let diseaseLabels: Record<string, { risk_level: string; risk_code: number }> | null = null;
let isInitializing = false;

export async function loadONNXModel(): Promise<boolean> {
  if (session && metadata) return true;
  if (isInitializing) return false;

  try {
    isInitializing = true;
    console.log('⏳ Loading 377-Feature Full ONNX Disease Model & Metadata...');
    
    // Load metadata JSON
    const metaRes = await fetch('/models/symptom_features.json');
    if (metaRes.ok) {
      metadata = await metaRes.json();
    }

    const diseaseRes = await fetch('/models/disease_labels.json');
    if (diseaseRes.ok) {
      diseaseLabels = await diseaseRes.json();
    }

    // Configure ONNX WASM options
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.simd = true;

    // Load 377-Feature ONNX binary
    session = await ort.InferenceSession.create('/models/triage_model.onnx', {
      executionProviders: ['wasm'],
    });

    console.log(`✅ 377-Feature Edge ONNX Model successfully initialized! (${metadata?.feature_count || 377} symptom inputs)`);
    isInitializing = false;
    return true;
  } catch (error) {
    console.error('❌ Failed to load ONNX model (using rule fallback):', error);
    isInitializing = false;
    return false;
  }
}

export interface TriageInferenceResult {
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
  riskScore: number; // 0 to 1
  predictedDisease: string;
  diseaseConfidence: number;
  isHardOverride: boolean;
  overrideReason?: string;
  careInstructions: string[];
  featuresUsed: string[];
  activeFeatureCount: number;
}

export async function runEdgeTriageInference(
  vitals: Vitals,
  symptoms: Record<string, boolean>
): Promise<TriageInferenceResult> {
  // 1. Evaluate deterministic clinical rules & disease vector scoring first
  const ruleResult: RuleEvaluationResult = evaluateDeterministicRules(vitals, symptoms);
  const activeCount = Object.keys(symptoms).filter(s => symptoms[s]).length;

  if (ruleResult.isHardOverride && ruleResult.forcedRiskLevel === 'RED') {
    return {
      riskLevel: 'RED',
      riskScore: 0.99,
      predictedDisease: ruleResult.predictedDisease,
      diseaseConfidence: ruleResult.diseaseConfidence,
      isHardOverride: true,
      overrideReason: ruleResult.reason,
      careInstructions: ruleResult.careInstructions,
      featuresUsed: Object.keys(symptoms),
      activeFeatureCount: activeCount
    };
  }

  // 2. Try running 377-Feature Edge ONNX inference
  const loaded = await loadONNXModel();
  const featureList = metadata?.features || [];

  if (loaded && session && featureList.length > 0) {
    try {
      // Build float input tensor for all 377 features
      const inputArray = new Float32Array(featureList.length);
      featureList.forEach((feat, idx) => {
        inputArray[idx] = symptoms[feat] ? 1.0 : 0.0;
      });

      const tensor = new ort.Tensor('float32', inputArray, [1, featureList.length]);
      const feeds: Record<string, ort.Tensor> = { float_input: tensor };
      const results = await session.run(feeds);

      // Parse model prediction outputs
      const outputKey = Object.keys(results)[0];
      const outputData = results[outputKey].data as Float32Array | Int32Array | BigInt64Array;
      
      let predictedClass = 0;
      if (outputData.length > 0) {
        predictedClass = Number(outputData[0]);
      }

      let riskLevel: 'GREEN' | 'YELLOW' | 'RED' = 'GREEN';
      let riskScore = 0.3;

      if (predictedClass === 2) {
        riskLevel = 'RED';
        riskScore = 0.92;
      } else if (predictedClass === 1) {
        riskLevel = 'YELLOW';
        riskScore = 0.65;
      } else {
        riskLevel = 'GREEN';
        riskScore = 0.25;
      }

      const modelAccuracy = metadata?.accuracy ? metadata.accuracy : 0.904;

      return {
        riskLevel: ruleResult.forcedRiskLevel || riskLevel,
        riskScore,
        predictedDisease: ruleResult.predictedDisease,
        diseaseConfidence: Math.max(ruleResult.diseaseConfidence, modelAccuracy),
        isHardOverride: false,
        careInstructions: ruleResult.careInstructions,
        featuresUsed: featureList,
        activeFeatureCount: activeCount
      };
    } catch (err) {
      console.error('377-Feature ONNX inference error, reverting to clinical vector engine:', err);
    }
  }

  // Fallback if ONNX fails or is loading
  const fallbackLevel = ruleResult.forcedRiskLevel || 'GREEN';
  return {
    riskLevel: fallbackLevel,
    riskScore: fallbackLevel === 'RED' ? 0.95 : (fallbackLevel === 'YELLOW' ? 0.6 : 0.2),
    predictedDisease: ruleResult.predictedDisease,
    diseaseConfidence: ruleResult.diseaseConfidence,
    isHardOverride: false,
    careInstructions: ruleResult.careInstructions,
    featuresUsed: Object.keys(symptoms),
    activeFeatureCount: activeCount
  };
}


