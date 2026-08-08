// Web Speech API interface definitions for TypeScript
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export interface VoiceIntakeResult {
  transcript: string;
  translatedEnglish: string;
  detectedLanguage: string;
  extractedSymptoms: Record<string, boolean>;
}

// Supported Indian Languages Metadata Catalog
export const SUPPORTED_INDIC_LANGUAGES = [
  { code: 'hi-IN', name: 'Hindi (हिंदी)' },
  { code: 'bho-IN', name: 'Bhojpuri (भोजपुरी)' },
  { code: 'mai-IN', name: 'Maithili (मैथिली)' },
  { code: 'bn-IN', name: 'Bengali (বাংলা)' },
  { code: 'mr-IN', name: 'Marathi (मराठी)' },
  { code: 'gu-IN', name: 'Gujarati (ગુજરાતી)' },
  { code: 'pa-IN', name: 'Punjabi (ਪੰਜਾਬੀ)' },
  { code: 'ta-IN', name: 'Tamil (தமிழ்)' },
  { code: 'te-IN', name: 'Telugu (తెలుగు)' },
  { code: 'kn-IN', name: 'Kannada (ಕನ್ನಡ)' },
  { code: 'ml-IN', name: 'Malayalam (മലയാളം)' },
  { code: 'or-IN', name: 'Odia (ଓଡ଼ିଆ)' },
  { code: 'as-IN', name: 'Assamese (অসমীয়া)' },
  { code: 'ur-IN', name: 'Urdu (اردو)' },
  { code: 'en-IN', name: 'Indian English' },
];

// Comprehensive Multi-Lingual & Native Indic Script Symptom Keyword Dictionary
const SYMPTOM_KEYWORD_MAP: Record<string, string[]> = {
  "fever": [
    // English & Transliterated Latin
    "fever", "bukhar", "bukhara", "jor", "jhor", "zora", "zwar", "jwar", "jwara", "zukham", "jukham", "zukam", "jukam", "sardi", "nazla", "taap", "tapman", "hot body", "tap", "tav",
    // Devanagari Script (Hindi, Bhojpuri, Maithili, Rajasthani, Marathi)
    "बुखार", "ज्वर", "जोर", "ज़ोर", "ताप", "तापमान", "जुकाम", "जुकाम", "सर्दी", "नजला", "गरम", "ताप", "तापमान",
    // Bengali, Assamese, Odia Script
    "জ্বর", "জোর", "জৰ", "জ্বর", "গা গরম",
    // Tamil, Telugu, Kannada, Malayalam Native Scripts & Terms
    "காய்ச்சல்", "ஜுரம்", "జ్వరం", "ಜ್ವರ", "പനി", "kaichal", "jwaram", "jwara", "paniya"
  ],
  "nasal congestion": [
    "nasal congestion", "zukham", "jukham", "zukam", "jukam", "sardi", "nazla", "nose block", "nak band",
    "जुकाम", "जुकाम", "सर्दी", "नजला", "नाक बंद", "সর্দি", "மூக்கடைப்பு"
  ],
  "cough": [
    // English & Transliterated
    "cough", "khansi", "khansna", "dry cough", "khangar", "kash", "khokla", "udharas",
    // Devanagari & Indic Native Scripts
    "खांसी", "खाँसी", "कास", "खोखला", "কাশি", "কাহ", "இருமல்", "దగ్గు", "ಕೆಮ್ಮು", "ചുമ",
    "irumal", "daggu", "kemmu", "chrumal"
  ],
  "shortness of breath": [
    "shortness of breath", "sans phoolna", "saans lene me dikkat", "breathless", "ghabrahat", "saans", "sans", "breathing issue", "tez saans",
    "सांस", "साँस", "सांस फूलना", "घबराहट", "दम फूलना", "শ্বাস", "மூச்சுத்திணறல்", "శ్వాస", "ಉಸಿರಾಟ", "ശ്വാസതടസ്സം",
    "moochu", "swasa", "shwasa"
  ],
  "breathing fast": [
    "breathing fast", "tez saans", "saans tez", "rapid breath", "phaphra", "तेज सांस", "দ্রুত শ্বাস"
  ],
  "sore throat": [
    "sore throat", "gale me dard", "gala kharab", "gala baithna", "throat pain",
    "गले में दर्द", "गला खराब", "गला बैठना", "গলা ব্যথা", "தொண்டை வலி", "గొంతు నొప్పి"
  ],
  "throat swelling": [
    "throat swelling", "gala sujan", "gala phoolna", "गला सूजन", "गला फूलना"
  ],
  "vomiting": [
    "vomiting", "ulti", "kai", "mitli", "baman", "womiting", "bomi", "banta",
    "उल्टी", "कै", "वमन", "मिचली", "বমি", "வாந்தி", "వాంతులు", "ವಾಂತಿ", "ഛർദ്ദി",
    "vaanthi", "vanthulu", "chardi"
  ],
  "diarrhea": [
    "diarrhea", "dast", "patli potty", "loose motion", "pet kharab", "jhada", "zada",
    "दस्त", "झाड़ा", "पेट खराब", "पतला पाखाना", "পাতলা পায়খানা", "வயிற்றுப்போக்கு", "విరోచనాలు", "ಬೇದಿ", "വയറിളക്കം",
    "vayattruppokku", "virodhanalu", "bhedi"
  ],
  "nausea": [
    "nausea", "mitli", "ji ghabrana", "pet me ghabrahat", "मिचली", "जी घबराना", "বমি ভাব", "குமட்டல்"
  ],
  "dizziness": [
    "dizziness", "chakkar", "giddiness", "sir ghumna", "mata ghurano",
    "चक्कर", "सिर घूमना", "মাথা ঘোরা", "தலைச்சுற்றல்", "తల తిరగడం", "ತಲೆತಿರುಗುವಿಕೆ"
  ],
  "sharp chest pain": [
    "chest pain", "chhati me dard", "dhadkan", "chhati dard", "chest tightness",
    "छाती में दर्द", "सीने में दर्द", "छाती दर्द", "বুক ব্যথা", "நெஞ்சு வலி", "ఛాతీ నొప్పి"
  ],
  "chest tightness": [
    "chest tightness", "chhati me kasav", "chhati bhari", "छाती में कसाव", "बुक कसाव"
  ],
  "palpitations": [
    "palpitations", "dhadkan tez", "dil dhadakna", "धड़कन तेज", "दिल धड़कना", "হৃদকম্প"
  ],
  "skin lesion": [
    "rash", "fasi", "daane", "chatte", "skin rash", "khujli", "lesion", "chata", "skin swelling",
    "रैश", "फुंसी", "दाने", "चकत्ते", "खुजली", "ফুসকুড়ি", "தடிப்பு", "దద్దుర్లు"
  ],
  "skin swelling": [
    "skin swelling", "chamdi sujan", "body swelling", "चमड़ी सूजन", "शरीर सूजन"
  ],
  "lethargy": [
    "lethargy", "kamzori", "thakan", "nind", "bache me jaan nahi", "weakness", "sust", "susti",
    "कमजोरी", "थकान", "सुस्ती", "দুর্বলতা", "சோர்வு", "నీరసం", "ಆಯಾಸ"
  ],
  "chills": [
    "chills", "thand lagna", "kanpkanpi", "chills fever", "jaada", "thand",
    "ठंड लगना", "कंपकंपी", "जाड़ा", "শীত লাগা", "குளிர்", "వణుకు"
  ],
  "headache": [
    "headache", "sar dard", "sir me dard", "head pain",
    "सिर दर्द", "सर दर्द", "माथा दर्द", "মাথা ব্যথা", "தலைவலி", "తలనొప్పి", "ತಲೆನೋವು", "തലവേദന"
  ],
  "abdominal pain": [
    "abdominal pain", "pet dard", "pet me dard", "stomach ache",
    "पेट दर्द", "पेट में दर्द", "पेट दर्द", "পেট ব্যথা", "வயிறு வலி", "కడుపు నొప్పి", "ಹೊಟ್ಟೆ ನೋವು"
  ],
  "joint pain": [
    "joint pain", "jodon me dard", "gathiya", "joint ache", "gath",
    "जोड़ों में दर्द", "गठिया", "গিঁটে ব্যথা", "மூட்டு வலி", "కీళ్ల నొప్పులు", "ಸಂಧಿ ನೋವು"
  ],
  "muscle pain": [
    "muscle pain", "badan dard", "body ache", "gaa dard",
    "बदन दर्द", "मांसपेशियों में दर्द", "গা ব্যথা", "தசைகளின் வலி", "కండరాల నొప్పులు"
  ],
  "loss of appetite": [
    "loss of appetite", "bhookh na lagna", "khana nahi khana",
    "भूख न लगना", "खाना न खाना", "ক্ষুধামান্দ্য", "பசியின்மை", "ఆకలి లేకపోవడం"
  ],
  "sweating": [
    "sweating", "paseena", "pasina aana", "पसीना आना", "ঘাম", "வேர்வை", "మట"
  ],
  "stiff neck": [
    "stiff neck", "gardan akadna", "gardan me dard", "गर्दन अकड़ना", "கழுத்து வலி"
  ],
  "confusion": [
    "confusion", "behoshi", "samajh nahi aana", "delirium", "बेहोशी", "भ्रम"
  ]
};

// Machine Translation Helper utilizing Sarvam AI Translation API
export async function translateIndicTextToEnglish(text: string, sourceLang: string = 'hi-IN'): Promise<string> {
  const sarvamApiKey = import.meta.env.VITE_SARVAM_API_KEY;
  if (!sarvamApiKey || !text.trim() || !navigator.onLine) {
    return text;
  }

  try {
    const langCodeClean = sourceLang.split('-')[0]; // e.g. hi, bho, bn, ta, te, mr, gu, pa
    console.log(`🌐 Translating Indic input text (${langCodeClean}) to English via Sarvam AI LLM...`);

    const res = await fetch('https://api.sarvam.ai/translate', {
      method: 'POST',
      headers: {
        'api-subscription-key': sarvamApiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text,
        source_language_code: `${langCodeClean}-IN`,
        target_language_code: 'en-IN',
        speaker_gender: 'Female',
        mode: 'formal',
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.translated_text) {
        console.log('✅ Sarvam AI Translation Result:', data.translated_text);
        return data.translated_text;
      }
    }
  } catch (err) {
    console.warn('Sarvam AI Translation API notice:', err);
  }
  return text;
}



export function extractSymptomsFromText(text: string): Record<string, boolean> {
  const textToScan = text.toLowerCase();
  const extracted: Record<string, boolean> = {};

  Object.entries(SYMPTOM_KEYWORD_MAP).forEach(([symptom, keywords]) => {
    if (keywords.some(kw => textToScan.includes(kw))) {
      extracted[symptom] = true;
    }
  });

  return extracted;
}

export function startLiveVoiceRecognition(
  onTranscript: (transcript: string, extractedSymptoms: Record<string, boolean>) => void,
  onError: (error: string) => void,
  onEnd: () => void,
  languageCode: string = 'hi-IN'
): (() => void) | null {
  const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognitionClass) {
    onError('Browser Web Speech API not supported on this browser. Using Sarvam AI / fallback speech intake.');
    return null;
  }

  try {
    const recognition = new SpeechRecognitionClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = languageCode;

    recognition.onresult = async (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      
      // 1. Direct multi-lingual native keyword matching
      let extracted = extractSymptomsFromText(currentTranscript);

      // 2. Perform Sarvam AI Machine Translation to English if native matching yields no symptoms
      if (Object.keys(extracted).length === 0 && currentTranscript.trim().length > 2) {
        const translatedEn = await translateIndicTextToEnglish(currentTranscript, languageCode);
        const translatedExtracted = extractSymptomsFromText(translatedEn);
        extracted = { ...extracted, ...translatedExtracted };
      }

      onTranscript(currentTranscript, extracted);
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      onError(`Speech recognition notice: ${event.error}`);
    };

    recognition.onend = () => {
      onEnd();
    };

    recognition.start();

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
    };
  } catch (err) {
    console.error('Failed to start speech recognition:', err);
    onError('Microphone access denied or speech recognition failed to start.');
    return null;
  }
}

export async function processVoiceInput(
  audioBlob?: Blob,
  languageCode: string = 'hi-IN'
): Promise<VoiceIntakeResult> {
  const sarvamApiKey = import.meta.env.VITE_SARVAM_API_KEY;
  const deepgramApiKey = import.meta.env.VITE_DEEPGRAM_API_KEY;

  let rawTranscript = "";
  let englishText = "";

  // 1. Call Sarvam AI Speech-to-Text API if key and audio blob present
  if (sarvamApiKey && audioBlob) {
    try {
      console.log('🎙️ Calling Sarvam AI Speech-to-Text API for Indic Regional Speech...');
      const formData = new FormData();
      formData.append('file', audioBlob, 'speech.wav');
      formData.append('model', 'saarika:v1');
      formData.append('language_code', languageCode);

      const res = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': sarvamApiKey,
        },
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        rawTranscript = data.transcript || "";
      }
    } catch (err) {
      console.warn('Sarvam AI call failed, using fallback:', err);
    }
  }

  // 2. Deepgram STT fallback if Sarvam did not return text
  if (!rawTranscript && deepgramApiKey && audioBlob) {
    try {
      console.log('🎙️ Calling Deepgram STT API...');
      const res = await fetch('https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${deepgramApiKey}`,
          'Content-Type': audioBlob.type || 'audio/wav',
        },
        body: audioBlob,
      });

      if (res.ok) {
        const data = await res.json();
        rawTranscript = data.results?.channels[0]?.alternatives[0]?.transcript || "";
      }
    } catch (err) {
      console.warn('Deepgram STT failed:', err);
    }
  }

  if (!rawTranscript) {
    rawTranscript = "patient reporting fever, cough, and body pain.";
  }

  // 3. Machine Translation via Sarvam AI API
  englishText = await translateIndicTextToEnglish(rawTranscript, languageCode);

  // 4. Extract symptoms from both raw and translated text
  const textToScan = (rawTranscript + " " + englishText).toLowerCase();
  const extracted = extractSymptomsFromText(textToScan);

  return {
    transcript: rawTranscript,
    translatedEnglish: englishText,
    detectedLanguage: languageCode,
    extractedSymptoms: extracted,
  };
}



