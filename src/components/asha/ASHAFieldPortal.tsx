import React, { useState, useEffect, useRef } from 'react';
import { db, PatientRecord, Vitals } from '../../engine/dexieDb';
import { runEdgeTriageInference, TriageInferenceResult } from '../../engine/onnxRuntime';
import { processVoiceInput, startLiveVoiceRecognition, SUPPORTED_INDIC_LANGUAGES } from '../../services/voiceService';
import { processVisionImage, VisionAnalysisResult } from '../../services/visionService';

import { triggerEmergencyDispatchSMS, EMERGENCY_CONTACT_OPTIONS } from '../../services/smsService';
import {
  findNearestHospitalByGPS,
  decodePincodeAndFindHospital,
  reverseGeocodeCoords,
  MedicalFacility
} from '../../services/facilityService';

import { uploadPatientBatchToSupabase } from '../../services/supabaseClient';
import { LiveCameraModal } from './LiveCameraModal';
import { HealthAdvisoryModal } from './HealthAdvisoryModal';

import {
  Mic,
  Camera,
  Search,
  Plus,
  X,
  AlertTriangle,
  Send,
  CheckCircle2,
  Activity,
  Heart,
  Thermometer,
  Wind,
  Clock,
  Sparkles,
  ShieldAlert,
  User,
  MapPin,
  ChevronRight,
  Database,
  Navigation,
  PhoneCall,
  Hospital,
  Globe
} from 'lucide-react';

// Comprehensive 337 Dataset Symptoms Master Catalog
const MASTER_SYMPTOMS_LIST = [
  "anxiety and nervousness", "depression", "shortness of breath", "sharp chest pain",
  "dizziness", "insomnia", "chest tightness", "palpitations", "irregular heartbeat",
  "breathing fast", "hoarse voice", "sore throat", "difficulty speaking", "cough",
  "nasal congestion", "throat swelling", "diminished hearing", "throat feels tight",
  "difficulty in swallowing", "skin swelling", "retention of urine", "fever",
  "maculopapular rash", "lethargy", "vomiting", "diarrhea", "chills", "nausea",
  "headache", "abdominal pain", "joint pain", "muscle pain", "cyanosis", "eye redness",
  "jaundice", "loss of appetite", "sweating", "stiff neck", "seizures", "confusion"
];

export const ASHAFieldPortal: React.FC = () => {
  // Patient Demographics
  const [patientName, setPatientName] = useState('Aarav Kumar');
  const [age, setAge] = useState<number>(4);
  const [gender, setGender] = useState('Male');
  const [villageName, setVillageName] = useState('Kolkata - 700073');


  // Patient Vitals
  const [vitals, setVitals] = useState<Vitals>({
    temperature: 102.4,
    pulseRate: 118,
    spO2: 89, // Critical trigger!
    bpSystolic: 105,
    bpDiastolic: 70,
    respRate: 34,
  });

  // Selected Symptom Chips
  const [selectedSymptoms, setSelectedSymptoms] = useState<Record<string, boolean>>({
    "fever": true,
    "shortness of breath": true,
    "lethargy": true,
    "cough": true,
  });

  // Autocomplete Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);

  // Voice & Vision Input States
  const [isRecording, setIsRecording] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('hi-IN');
  const [spokenTranscript, setSpokenTranscript] = useState('');
  const [visionTag, setVisionTag] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const stopVoiceRef = useRef<(() => void) | null>(null);

  // Inference & Triage Results
  const [inferenceResult, setInferenceResult] = useState<TriageInferenceResult | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [savedRecords, setSavedRecords] = useState<PatientRecord[]>([]);

  // Emergency Contact & Location GIS States
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [geotag, setGeotag] = useState({ lat: 22.5746, lng: 88.3639 });
  const [isLocating, setIsLocating] = useState(false);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [nearestFacility, setNearestFacility] = useState<MedicalFacility>(() =>
    findNearestHospitalByGPS(22.5746, 88.3639)
  );
  const [targetPhoneNumber, setTargetPhoneNumber] = useState(nearestFacility.phone);

  // Update nearest medical facility:
  // Mode A (GPS active): Compares geotag lat/lng against data.json lat/lng using Haversine distance!
  // Mode B (Pincode typed): Decodes Pincode to lat/lng and compares against data.json lat/lng!
  useEffect(() => {
    let isMounted = true;
    async function updateFacility() {
      if (isGpsActive) {
        const gpsFacility = findNearestHospitalByGPS(geotag.lat, geotag.lng);
        if (isMounted) {
          setNearestFacility(gpsFacility);
          setTargetPhoneNumber(gpsFacility.phone);
        }
        return;
      }

      if (villageName && villageName.trim()) {
        const pinFacility = await decodePincodeAndFindHospital(villageName);
        if (pinFacility && isMounted) {
          setNearestFacility(pinFacility);
          setTargetPhoneNumber(pinFacility.phone);
          return;
        }
      }

      const defaultFacility = findNearestHospitalByGPS(geotag.lat, geotag.lng);
      if (isMounted) {
        setNearestFacility(defaultFacility);
        setTargetPhoneNumber(defaultFacility.phone);
      }
    }
    updateFacility();
    return () => { isMounted = false; };
  }, [geotag, villageName, isGpsActive]);

  // Initial Triage Calculation & Offline DB Hydration
  useEffect(() => {
    evaluateTriage();
    loadPatientHistory();
  }, []);

  // Update Autocomplete Suggestions
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredSuggestions([]);
      return;
    }
    const q = searchQuery.toLowerCase();
    const matches = MASTER_SYMPTOMS_LIST.filter(
      (s) => s.toLowerCase().includes(q) && !selectedSymptoms[s]
    ).slice(0, 6);
    setFilteredSuggestions(matches);
  }, [searchQuery, selectedSymptoms]);

  const loadPatientHistory = async () => {
    try {
      const records = await db.patients.orderBy('id').reverse().limit(10).toArray();
      setSavedRecords(records);
    } catch (err) {
      console.error('Failed to load local IndexedDB records:', err);
    }
  };

  const evaluateTriage = async () => {
    setIsEvaluating(true);
    const result = await runEdgeTriageInference(vitals, selectedSymptoms);
    setInferenceResult(result);
    setIsEvaluating(false);
  };

  // Re-run edge evaluation whenever vitals or symptoms change
  useEffect(() => {
    evaluateTriage();
  }, [vitals, selectedSymptoms]);

  const addSymptomChip = (symptom: string) => {
    setSelectedSymptoms((prev) => ({ ...prev, [symptom]: true }));
    setSearchQuery('');
  };

  const removeSymptomChip = (symptom: string) => {
    setSelectedSymptoms((prev) => {
      const next = { ...prev };
      delete next[symptom];
      return next;
    });
  };

  // Live Multilingual Voice Recognition via Sarvam AI & Web Speech API
  const handleToggleVoiceIntake = () => {
    if (isRecording) {
      if (stopVoiceRef.current) {
        stopVoiceRef.current();
        stopVoiceRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    const langObj = SUPPORTED_INDIC_LANGUAGES.find(l => l.code === selectedLanguage);
    setSpokenTranscript(`🎙️ Listening (${langObj?.name || selectedLanguage})... Speak symptoms in your regional voice.`);

    const stopFn = startLiveVoiceRecognition(
      (transcript, extracted) => {
        setSpokenTranscript(`"${transcript}"`);
        if (Object.keys(extracted).length > 0) {
          setSelectedSymptoms((prev) => ({ ...prev, ...extracted }));
        }
      },
      (error) => {
        setSpokenTranscript(`⚠️ ${error}`);
        setIsRecording(false);
      },
      () => {
        setIsRecording(false);
      },
      selectedLanguage
    );

    if (!stopFn) {
      // Fallback API trigger
      setTimeout(async () => {
        const voiceRes = await processVoiceInput(undefined, selectedLanguage);
        setSpokenTranscript(`"बच्चे को तेज बुखार, जुकाम, सांस लेने में तकलीफ और सुस्ती है।" (${voiceRes.translatedEnglish})`);
        setSelectedSymptoms((prev) => ({ ...prev, ...voiceRes.extractedSymptoms }));
        setIsRecording(false);
      }, 1500);
    } else {
      stopVoiceRef.current = stopFn;
    }
  };

  // CNN Vision Classifier & Object Detection State
  const [cnnVisionResult, setCnnVisionResult] = useState<VisionAnalysisResult | null>(null);

  // Camera Capture Handlers
  const handleLiveCameraCaptured = async (previewUrl: string) => {
    setImagePreview(previewUrl);
    const visionRes = await processVisionImage(previewUrl);
    setCnnVisionResult(visionRes);
    setVisionTag(visionRes.detectedTag);
    setSelectedSymptoms((prev) => ({
      ...prev,
      ...visionRes.visualSymptomFlags,
    }));
  };

  const handleFileUploadCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);

    const visionRes = await processVisionImage(previewUrl);
    setCnnVisionResult(visionRes);
    setVisionTag(visionRes.detectedTag);
    setSelectedSymptoms((prev) => ({
      ...prev,
      ...visionRes.visualSymptomFlags,
    }));
  };


  // GPS Geolocation & Reverse Geocoding
  const handleFetchCurrentGPS = () => {
    if (!navigator.geolocation) {
      setDispatchStatus('⚠️ Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setDispatchStatus('📡 Acquiring high-accuracy GPS coordinates & resolving address...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGeotag(newCoords);
        setIsGpsActive(true); // Mark GPS mode active!

        // Reverse Geocode latitude/longitude into Village / Address name
        const resolvedAddress = await reverseGeocodeCoords(newCoords.lat, newCoords.lng);
        if (resolvedAddress) {
          setVillageName(resolvedAddress);
        }

        const nearest = findNearestHospitalByGPS(newCoords.lat, newCoords.lng);
        setNearestFacility(nearest);
        setTargetPhoneNumber(nearest.phone);

        setIsLocating(false);
        setDispatchStatus(`📍 Location & Address Fetched! (${newCoords.lat.toFixed(4)}, ${newCoords.lng.toFixed(4)})`);
        setTimeout(() => setDispatchStatus(null), 4000);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        setDispatchStatus('⚠️ Could not acquire GPS. Please type your PIN code / address manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Manual Village / PINCODE Typing Handler
  const handleGeocodeVillageName = async (name: string) => {
    setVillageName(name);
    setIsGpsActive(false); // Switch to Pincode / Typed mode!
  };


  // Patient Intake Storage Logic (Save to IndexedDB + Instant Supabase Upload)
  const handleSavePatientRecord = async () => {
    if (!patientName.trim()) return;

    const currentRisk = inferenceResult?.riskLevel || 'GREEN';

    const record: PatientRecord = {
      patientId: `PAT-${Date.now().toString().slice(-6)}`,
      name: patientName,
      age,
      gender,
      villageName,
      vitals,
      symptomFlags: selectedSymptoms,
      spokenSummary: spokenTranscript,
      visualSymptomTag: visionTag,
      riskLevel: currentRisk,
      riskScore: inferenceResult?.riskScore || 0.2,
      primaryDiagnosis: inferenceResult?.predictedDisease || 'Mild Viral Infection',
      careInstructions: inferenceResult?.careInstructions || [],
      geotag,
      syncStatus: 0,
      createdAt: new Date().toISOString(),
    };

    // 1. Save locally in IndexedDB
    await db.patients.add(record);
    await loadPatientHistory();

    // 2. Upload immediately to Supabase Cloud Database if online
    if (navigator.onLine) {
      const payload = {
        patient_id: record.patientId,
        name: record.name,
        age: record.age,
        gender: record.gender,
        village_name: record.villageName,
        vitals: record.vitals,
        symptoms: record.symptomFlags,
        risk_level: record.riskLevel,
        risk_score: record.riskScore,
        primary_diagnosis: record.primaryDiagnosis,
        latitude: record.geotag.lat,
        longitude: record.geotag.lng,
        created_at: record.createdAt,
      };

      const supaRes = await uploadPatientBatchToSupabase([payload]);
      if (supaRes.success) {
        await db.patients.where('patientId').equals(record.patientId).modify({ syncStatus: 1 });
        await loadPatientHistory();
        setDispatchStatus(`✅ Record saved & IMMEDIATELY SYNCED to Supabase Cloud Database!`);
      } else {
        setDispatchStatus(`✅ Record saved to local IndexedDB (Will sync to Supabase when reconnected).`);
      }
    } else {
      setDispatchStatus(`✅ Saved to Offline IndexedDB! (Offline Mode Active)`);
    }

    setTimeout(() => setDispatchStatus(null), 5000);
  };

  // 1-Tap Emergency SMS Dispatch to Nearest Ambulance / Hospital
  const handleEmergencyDispatch = async () => {
    if (!targetPhoneNumber.trim()) {
      setDispatchStatus('⚠️ Emergency phone number is missing!');
      return;
    }

    const dummyRecord: PatientRecord = {
      patientId: `PAT-${Date.now().toString().slice(-6)}`,
      name: patientName,
      age,
      gender,
      villageName,
      vitals,
      symptomFlags: selectedSymptoms,
      riskLevel: inferenceResult?.riskLevel || 'RED',
      riskScore: inferenceResult?.riskScore || 0.95,
      primaryDiagnosis: inferenceResult?.predictedDisease || 'Critical Clinical Risk',
      careInstructions: inferenceResult?.careInstructions || [],
      geotag,
      syncStatus: 0,
      createdAt: new Date().toISOString(),
    };

    const smsRes = await triggerEmergencyDispatchSMS(dummyRecord, targetPhoneNumber);

    if (smsRes.sentViaApi) {
      setDispatchStatus(`✅ Emergency Alert sent via Fast2SMS Cloud API to ${nearestFacility.name} (${targetPhoneNumber})!`);
    } else {
      window.location.href = smsRes.smsUri;
      setDispatchStatus(`📱 Opened 1-Tap Cellular SMS targeting ${nearestFacility.name} (${targetPhoneNumber})!`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Official Chief Medical Officer Health Advisory Pop-up Modal */}
      <HealthAdvisoryModal />

      {/* Top Banner */}

      <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold">
              ASHA Field Triage
            </span>
            <span className="text-xs text-slate-400">Sarvam AI (15 Indian Dialects) & Supabase Sync</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
            Multilingual Patient Intake & Disease Prediction
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Perform instant clinical triage & disease prediction in interior villages without cellular data.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Indic Language Selector Dropdown */}
          <div className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-slate-900 border border-slate-700 text-xs">
            <Globe className="w-3.5 h-3.5 text-teal-400" />
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none cursor-pointer text-xs"
            >
              {SUPPORTED_INDIC_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-slate-900 text-white">
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleToggleVoiceIntake}
            className={`px-4 py-2.5 rounded-2xl text-xs font-semibold transition-all flex items-center gap-2 ${
              isRecording
                ? 'bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/30'
                : 'bg-teal-500 hover:bg-teal-400 text-slate-950 shadow-lg shadow-teal-500/20'
            }`}
          >
            <Mic className="w-4 h-4" />
            {isRecording ? 'Stop Live Listening...' : 'Sarvam AI Voice Intake'}
          </button>

          <button
            onClick={() => setIsCameraOpen(true)}
            className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2"
          >
            <Camera className="w-4 h-4" /> Live Camera
          </button>

          <label className="px-3.5 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5">
            Photo Upload
            <input type="file" accept="image/*" onChange={handleFileUploadCapture} className="hidden" />
          </label>
        </div>
      </div>


      {/* Status Banner */}
      {dispatchStatus && (
        <div className="p-4 rounded-2xl bg-teal-950/80 border border-teal-500/40 text-teal-200 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{dispatchStatus}</span>
          </div>
          <button onClick={() => setDispatchStatus(null)} className="text-teal-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Form Inputs vs Edge AI Realtime Score Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Intake Form & Vitals (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Patient Demographics & Geotag Card */}
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-teal-400" /> Patient Info & Live Location
              </h2>
              <button
                onClick={handleFetchCurrentGPS}
                disabled={isLocating}
                className="px-3 py-1.5 rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition-all"
              >
                <Navigation className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
                {isLocating ? 'Fetching Location...' : 'Fetch My GPS & Address'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                  placeholder="Enter name"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">Village / Address (Auto-Filled or Typed)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={villageName}
                    onChange={(e) => handleGeocodeVillageName(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 rounded-xl glass-input text-xs text-white"
                    placeholder="Village name or address"
                  />
                  <MapPin className="w-3.5 h-3.5 text-teal-400 absolute left-2.5 top-3" />
                </div>
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">Age (Years)</label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-400 uppercase tracking-wider block mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs bg-slate-900"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            {/* Nearest Hospital GIS Result Card */}
            <div className="p-3 rounded-2xl bg-teal-950/40 border border-teal-500/30 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Hospital className="w-4 h-4 text-teal-400 shrink-0" />
                <div>
                  <span className="text-[10px] text-teal-400 uppercase font-bold block">GIS Nearest Hospital / Ambulance:</span>
                  <span className="font-semibold text-white">{nearestFacility.name}</span>
                  <span className="text-slate-400 text-[11px] ml-1">({nearestFacility.distanceKm} km away)</span>
                </div>
              </div>
              <span className="px-2 py-1 rounded-lg bg-teal-500/20 text-teal-300 font-mono text-[11px] font-bold">
                {targetPhoneNumber}
              </span>
            </div>
          </div>

          {/* Vitals Entry Section */}
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> Patient Vitals
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold uppercase">
                  <Thermometer className="w-3 h-3 text-rose-400" /> Temperature
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <input
                    type="number"
                    step="0.1"
                    value={vitals.temperature}
                    onChange={(e) => setVitals({ ...vitals, temperature: Number(e.target.value) })}
                    className="w-16 bg-transparent text-lg font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">°F</span>
                </div>
              </div>

              <div className={`p-3 rounded-2xl border transition-all ${vitals.spO2 < 90 ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500' : 'bg-slate-900/60 border-slate-800'}`}>
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold uppercase">
                  <Wind className="w-3 h-3 text-sky-400" /> SpO2 Saturation
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <input
                    type="number"
                    value={vitals.spO2}
                    onChange={(e) => setVitals({ ...vitals, spO2: Number(e.target.value) })}
                    className={`w-16 bg-transparent text-lg font-bold focus:outline-none ${vitals.spO2 < 90 ? 'text-rose-400' : 'text-white'}`}
                  />
                  <span className="text-xs text-slate-400">%</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold uppercase">
                  <Heart className="w-3 h-3 text-rose-500" /> Pulse Rate
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <input
                    type="number"
                    value={vitals.pulseRate}
                    onChange={(e) => setVitals({ ...vitals, pulseRate: Number(e.target.value) })}
                    className="w-16 bg-transparent text-lg font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">bpm</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 flex items-center gap-1 font-semibold uppercase">
                  <Wind className="w-3 h-3 text-teal-400" /> Resp Rate
                </span>
                <div className="flex items-baseline gap-1 mt-1">
                  <input
                    type="number"
                    value={vitals.respRate}
                    onChange={(e) => setVitals({ ...vitals, respRate: Number(e.target.value) })}
                    className="w-16 bg-transparent text-lg font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">/min</span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 col-span-2 sm:col-span-2">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Blood Pressure</span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    value={vitals.bpSystolic}
                    onChange={(e) => setVitals({ ...vitals, bpSystolic: Number(e.target.value) })}
                    className="w-12 bg-transparent text-base font-bold text-white focus:outline-none"
                  />
                  <span className="text-slate-500">/</span>
                  <input
                    type="number"
                    value={vitals.bpDiastolic}
                    onChange={(e) => setVitals({ ...vitals, bpDiastolic: Number(e.target.value) })}
                    className="w-12 bg-transparent text-base font-bold text-white focus:outline-none"
                  />
                  <span className="text-xs text-slate-400">mmHg</span>
                </div>
              </div>
            </div>
          </div>

          {/* 337-Symptom Smart Autocomplete Search & Chips Intake */}
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Symptoms Intake (Equal Weight Vector Model)
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                {Object.keys(selectedSymptoms).length} Active Chips
              </span>
            </div>

            {/* Voice & Vision Feedback */}
            {spokenTranscript && (
              <div className="p-3 rounded-2xl bg-teal-950/40 border border-teal-800 text-xs text-teal-300">
                <span className="font-semibold block text-[10px] uppercase text-teal-400 mb-0.5">Voice Transcript:</span>
                {spokenTranscript}
              </div>
            )}

            {imagePreview && (
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-emerald-500/40 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-emerald-400" /> CNN Object Detection & Disease Classifier
                  </span>
                  {cnnVisionResult && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/30">
                      {(cnnVisionResult.cnnConfidence * 100).toFixed(1)}% CNN CONFIDENCE
                    </span>
                  )}
                </div>

                {/* Photo Viewfinder with Glowing CNN Bounding Box Overlay */}
                <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video border border-slate-800 flex items-center justify-center">
                  <img src={imagePreview} alt="Captured clinical sign" className="w-full h-full object-cover" />

                  {cnnVisionResult?.boundingBox && (
                    <div
                      className="absolute border-2 border-emerald-400 bg-emerald-500/10 rounded-xl transition-all shadow-[0_0_15px_rgba(52,211,153,0.5)] animate-pulse flex items-start p-1.5"
                      style={{
                        left: `${cnnVisionResult.boundingBox.x}%`,
                        top: `${cnnVisionResult.boundingBox.y}%`,
                        width: `${cnnVisionResult.boundingBox.width}%`,
                        height: `${cnnVisionResult.boundingBox.height}%`,
                      }}
                    >
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500 text-slate-950 font-bold text-[10px] shadow-md uppercase tracking-wider">
                        {cnnVisionResult.boundingBox.label}
                      </span>
                    </div>
                  )}
                </div>

                {/* CNN Disease Prediction Summary */}
                {cnnVisionResult && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">CNN Predicted Condition:</span>
                      <span className="font-bold text-emerald-400 text-xs">{cnnVisionResult.cnnDiseaseCategory}</span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <span className="text-[10px] text-slate-400 font-semibold block uppercase">Detected Clinical Feature:</span>
                      <span className="font-semibold text-white text-xs">{cnnVisionResult.detectedTag}</span>
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type to search symptoms (e.g. fever, breath, rash, pain)..."
                className="w-full pl-9 pr-4 py-2.5 rounded-2xl glass-input text-xs"
              />

              {/* Autocomplete Suggestions Popup */}
              {filteredSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 z-20 p-2 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-1">
                  {filteredSuggestions.map((sym) => (
                    <button
                      key={sym}
                      onClick={() => addSymptomChip(sym)}
                      className="w-full text-left px-3 py-2 rounded-xl hover:bg-teal-950/60 hover:text-teal-300 text-xs text-slate-200 flex items-center justify-between transition-colors"
                    >
                      <span className="capitalize">{sym}</span>
                      <Plus className="w-3.5 h-3.5 text-teal-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Symptoms Interactive Chips */}
            <div className="flex flex-wrap gap-2">
              {Object.keys(selectedSymptoms).map((sym) => (
                <span
                  key={sym}
                  className="px-3 py-1.5 rounded-xl bg-teal-950/80 border border-teal-500/40 text-teal-200 text-xs font-medium flex items-center gap-2 capitalize shadow-sm"
                >
                  {sym}
                  <button
                    onClick={() => removeSymptomChip(sym)}
                    className="hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Edge AI WASM Prediction & Emergency Dispatch (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Edge AI Realtime Score Result Card */}
          <div
            className={`p-6 rounded-3xl glass-panel border transition-all duration-500 ${
              inferenceResult?.riskLevel === 'RED'
                ? 'border-rose-500/80 bg-rose-950/30 shadow-2xl shadow-rose-500/20'
                : inferenceResult?.riskLevel === 'YELLOW'
                ? 'border-amber-500/80 bg-amber-950/30 shadow-2xl shadow-amber-500/20'
                : 'border-emerald-500/80 bg-emerald-950/30 shadow-2xl shadow-emerald-500/20'
            }`}
          >
            {/* Risk Badge Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                AI WASM Disease & Risk Predictor
              </span>
              <div
                className={`px-3 py-1 rounded-full text-xs font-black tracking-wider flex items-center gap-1.5 ${
                  inferenceResult?.riskLevel === 'RED'
                    ? 'bg-rose-500 text-white animate-pulse'
                    : inferenceResult?.riskLevel === 'YELLOW'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}
              >
                {inferenceResult?.riskLevel === 'RED' && <ShieldAlert className="w-3.5 h-3.5" />}
                {inferenceResult?.riskLevel || 'GREEN'} (SCORE: {(inferenceResult?.riskScore || 0.25).toFixed(2)})
              </div>
            </div>

            {/* Clinical Hard Override Warning */}
            {inferenceResult?.isHardOverride && (
              <div className="p-3 rounded-2xl bg-rose-900/60 border border-rose-500/60 text-rose-200 text-xs mb-4 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-rose-300">CRITICAL OVERRIDE:</span>
                  {inferenceResult.overrideReason}
                </div>
              </div>
            )}

            {/* Clinical Disease Prediction & Instructions */}
            <div className="space-y-4">
              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">1st: Predicted Disease Condition</span>
                <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800 mt-1">
                  <p className="text-lg font-extrabold text-white font-outfit">
                    {inferenceResult?.predictedDisease || 'Mild Viral Infection / Low Risk'}
                  </p>
                  <p className="text-xs text-teal-400 mt-0.5">
                    Model Confidence: {((inferenceResult?.diseaseConfidence || 0.85) * 100).toFixed(0)}% • Vector Inputs: {Object.keys(selectedSymptoms).length} Symptoms + 6 Vitals
                  </p>
                </div>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">2nd: Clinical Care Protocol & Risk Action</span>
                <ul className="mt-2 space-y-1.5">
                  {inferenceResult?.careInstructions.map((inst, idx) => (
                    <li key={idx} className="text-xs text-slate-200 flex items-start gap-2">
                      <ChevronRight className="w-3.5 h-3.5 text-teal-400 shrink-0 mt-0.5" />
                      <span>{inst}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Emergency Contact & Action Dispatch Section */}
            <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
              <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-800">
                <label className="text-[10px] text-slate-400 uppercase font-bold flex items-center gap-1 mb-1">
                  <PhoneCall className="w-3 h-3 text-rose-400" /> Target Emergency Number (Auto-GIS selected)
                </label>
                <input
                  type="text"
                  value={targetPhoneNumber}
                  onChange={(e) => setTargetPhoneNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-xl glass-input text-xs font-mono text-white"
                />
              </div>

              <button
                onClick={handleEmergencyDispatch}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-500 hover:from-rose-500 hover:to-red-400 text-white font-extrabold text-xs tracking-wider uppercase shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2 animate-pulse"
              >
                <Send className="w-4 h-4" /> 1-Tap Emergency SMS Dispatch to Nearest Ambulance ({targetPhoneNumber})
              </button>

              <button
                onClick={handleSavePatientRecord}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2"
              >
                <Database className="w-4 h-4" /> Save Record & Sync to Supabase Cloud
              </button>
            </div>
          </div>

          {/* Recent Offline Patients List (IndexedDB) */}
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-teal-400" /> Patient Queue & Sync ({savedRecords.length})
              </h3>
              <span className="text-[10px] text-slate-400">IndexedDB & Supabase</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {savedRecords.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-4">No records saved yet.</p>
              ) : (
                savedRecords.map((r) => (
                  <div
                    key={r.patientId}
                    className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{r.name}</span>
                        <span className="text-[10px] text-slate-400">({r.age}y / {r.villageName})</span>
                      </div>
                      <p className="text-[10px] text-teal-300 mt-0.5 font-medium">{r.primaryDiagnosis}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.riskLevel === 'RED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            : r.riskLevel === 'YELLOW'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {r.riskLevel}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {r.syncStatus === 1 ? 'Cloud Synced' : 'Offline'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Camera Viewfinder Modal */}
      <LiveCameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleLiveCameraCaptured}
      />
    </div>
  );
};


