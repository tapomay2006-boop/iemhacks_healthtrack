import React, { useState, useEffect } from 'react';
import { PatientRecord } from '../../engine/dexieDb';
import {
  findNearestHospitalByGPS,
  decodePincodeAndFindHospital,
  reverseGeocodeCoords,
  MedicalFacility,
  getHospitalBedAvailability,
  HospitalBedStatus
} from '../../services/facilityService';
import { triggerEmergencyDispatchSMS, generateEmergencySMSPayload, EMERGENCY_CONTACT_OPTIONS } from '../../services/smsService';
import {
  Send,
  PhoneCall,
  MapPin,
  Hospital,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Search,
  Bed,
  HeartPulse,
  Radio,
  Navigation,
  FileText,
  Smartphone
} from 'lucide-react';

export const EmergencySMSPortal: React.FC = () => {
  // GIS Search & Pincode States
  const [villageName, setVillageName] = useState('700073');
  const [geotag, setGeotag] = useState({ lat: 22.5746, lng: 88.3639 });
  const [isLocating, setIsLocating] = useState(false);
  const [isGpsActive, setIsGpsActive] = useState(false);
  const [nearestFacility, setNearestFacility] = useState<MedicalFacility>(() =>
    findNearestHospitalByGPS(22.5746, 88.3639)
  );
  const [targetPhoneNumber, setTargetPhoneNumber] = useState(nearestFacility.phone);
  const [bedStatus, setBedStatus] = useState<HospitalBedStatus>(() =>
    getHospitalBedAvailability(nearestFacility)
  );

  // Patient Intake States
  const [patientName, setPatientName] = useState('Aarav Kumar');
  const [age, setAge] = useState<number>(4);
  const [gender, setGender] = useState<string>('Male');
  const [temp, setTemp] = useState<number>(102.4);
  const [pulse, setPulse] = useState<number>(118);
  const [spO2, setSpO2] = useState<number>(89);
  const [bpSystolic, setBpSystolic] = useState<number>(100);
  const [bpDiastolic, setBpDiastolic] = useState<number>(65);
  const [symptomSummary, setSymptomSummary] = useState('High Fever (102.4°F), SpO2 89%, Severe Lethargy, Shortness of Breath');
  const [dispatchStatus, setDispatchStatus] = useState<string | null>(null);
  const [isDispatching, setIsDispatching] = useState(false);

  // Sync Facility & Hospital Phone Number dynamically whenever Pincode/GPS changes
  useEffect(() => {
    let isMounted = true;
    async function updateFacility() {
      if (isGpsActive) {
        const facility = findNearestHospitalByGPS(geotag.lat, geotag.lng);
        if (isMounted) {
          setNearestFacility(facility);
          setTargetPhoneNumber(facility.phone);
          setBedStatus(getHospitalBedAvailability(facility));
        }
        return;
      }

      if (villageName && villageName.trim()) {
        const pinFacility = await decodePincodeAndFindHospital(villageName);
        if (pinFacility && isMounted) {
          setNearestFacility(pinFacility);
          setTargetPhoneNumber(pinFacility.phone);
          setBedStatus(getHospitalBedAvailability(pinFacility));
          return;
        }
      }

      const defaultFacility = findNearestHospitalByGPS(geotag.lat, geotag.lng);
      if (isMounted) {
        setNearestFacility(defaultFacility);
        setTargetPhoneNumber(defaultFacility.phone);
        setBedStatus(getHospitalBedAvailability(defaultFacility));
      }
    }
    updateFacility();
    return () => { isMounted = false; };
  }, [geotag, villageName, isGpsActive]);

  // Construct patient record for payload generation
  const currentPatientRecord: PatientRecord = {
    patientId: 'PAT-' + Math.floor(100000 + Math.random() * 900000),
    name: patientName,
    age,
    gender,
    villageName: villageName.trim() ? villageName : (nearestFacility.locality || 'District Sector'),

    vitals: { temperature: temp, pulseRate: pulse, spO2, bpSystolic, bpDiastolic, respRate: 32 },
    symptomFlags: { 'fever': true, 'shortness of breath': true },
    riskLevel: spO2 < 90 || temp > 102 ? 'RED' : 'YELLOW',
    riskScore: spO2 < 90 ? 0.96 : 0.75,
    primaryDiagnosis: symptomSummary || 'Critical Febrile Respiratory Syndrome',
    careInstructions: ['Immediate Oxygen Support', 'Emergency ICU Referral'],
    geotag,
    syncStatus: 0,
    createdAt: new Date().toISOString()
  };

  // Pre-written SMS body automatically generated from patient details & hospital phone number
  const prewrittenSMSBody = generateEmergencySMSPayload(currentPatientRecord);

  // Fetch Current Device GPS
  const handleFetchCurrentGPS = () => {
    if (!navigator.geolocation) {
      setDispatchStatus('⚠️ Geolocation is not supported by your browser.');
      return;
    }
    setIsLocating(true);
    setDispatchStatus('📡 Acquiring high-accuracy GPS coordinates...');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setGeotag(newCoords);
        setIsGpsActive(true);

        const resolvedAddress = await reverseGeocodeCoords(newCoords.lat, newCoords.lng);
        if (resolvedAddress) {
          setVillageName(resolvedAddress);
        }

        const nearest = findNearestHospitalByGPS(newCoords.lat, newCoords.lng);
        setNearestFacility(nearest);
        setTargetPhoneNumber(nearest.phone);
        setBedStatus(getHospitalBedAvailability(nearest));

        setIsLocating(false);
        setDispatchStatus(`📍 GPS Resolved! (${newCoords.lat.toFixed(4)}, ${newCoords.lng.toFixed(4)})`);
        setTimeout(() => setDispatchStatus(null), 4000);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
        setDispatchStatus('⚠️ Could not acquire GPS. Please type your PIN code manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 1-Tap Trigger Dispatch Button (Opens Cellular SMS pre-populated & sends via Fast2SMS)
  const handleSendEmergencySMS = async () => {
    if (!targetPhoneNumber) return;
    setIsDispatching(true);
    setDispatchStatus(`📲 Transmitting 1-Tap Emergency SMS to ${targetPhoneNumber}...`);

    const res = await triggerEmergencyDispatchSMS(currentPatientRecord, targetPhoneNumber);

    setIsDispatching(false);

    // Launch 1-tap native SMS app pre-populated with exact hospital phone & prewritten message body!
    window.location.href = res.smsUri;

    if (res.sentViaApi) {
      setDispatchStatus(`✅ 1-Tap Emergency Alert Transmitted to ${nearestFacility.name} (${targetPhoneNumber})!`);
    } else {
      setDispatchStatus(`📱 Opened Cellular Messages App — 1 Tap away from sending to ${targetPhoneNumber}!`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Title & Status Banner */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold flex items-center gap-1">
              <Radio className="w-3 h-3 text-rose-400 animate-pulse" /> Emergency SMS Gateway
            </span>
            <span className="text-xs text-slate-400">1-Tap Cellular Dispatch & GIS Hospital Solver</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-outfit">1-Tap Pre-Written Emergency SMS Alert</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Enter PIN Code to auto-fetch the nearest hospital's phone number. Patient details are pre-formatted into a 1-tap message ready for instant cellular dispatch.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="p-3 rounded-2xl bg-rose-950/40 border border-rose-500/30 text-center min-w-[130px]">
            <span className="text-[10px] uppercase font-bold text-rose-400 block">Fast2SMS Gateway</span>
            <span className="text-xs font-bold text-slate-200">99.9% Uptime</span>
          </div>
        </div>
      </div>

      {/* Main 2-Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Pincode Solver & Discovered Nearest Hospital Card (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Pincode / Location Search Card */}
          <div className="p-6 rounded-3xl glass-panel border border-slate-800 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-teal-400" /> Enter PIN Code to Resolve Hospital & Phone
            </h2>

            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  value={villageName}
                  onChange={(e) => {
                    setVillageName(e.target.value);
                    setIsGpsActive(false);
                  }}
                  placeholder="Enter PIN Code (e.g. 742137, 700157, 712101, 700073)..."
                  className="w-full py-2.5 pl-10 pr-4 rounded-2xl glass-input text-xs font-semibold"
                />
              </div>

              <button
                onClick={handleFetchCurrentGPS}
                disabled={isLocating}
                className="w-full sm:w-auto py-2.5 px-4 rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-teal-300 font-bold text-xs flex items-center justify-center gap-2 transition-all shrink-0"
              >
                <Navigation className="w-4 h-4 text-teal-400" />
                {isLocating ? 'Acquiring GPS...' : 'Use Auto GPS'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              💡 Decoding Pincode automatically selects the nearest emergency hospital from 300+ West Bengal facilities.
            </p>
          </div>

          {/* Nearest Facility & Phone Card */}
          <div className="p-6 rounded-3xl glass-panel border border-teal-500/50 space-y-5 bg-teal-950/10 relative">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-teal-400 bg-teal-500/20 px-2.5 py-0.5 rounded-full border border-teal-500/30">
                  Auto-Discovered Nearest Hospital
                </span>
                <h3 className="text-xl font-bold text-white mt-1.5 flex items-center gap-2">
                  <Hospital className="w-5 h-5 text-teal-400" /> {nearestFacility.name}
                </h3>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" /> {nearestFacility.locality}, {nearestFacility.district} (PIN: {nearestFacility.pincode})
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Target Distance</span>
                <span className="text-lg font-black text-teal-300 font-outfit">
                  {nearestFacility.distanceKm ? `${nearestFacility.distanceKm.toFixed(1)} km` : 'Nearest'}
                </span>
              </div>
            </div>

            {/* Target Hospital Phone Hotline Display */}
            <div className="p-4 rounded-2xl bg-slate-900/80 border border-teal-500/40 flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-400 block">
                  Target Recipient Phone Number
                </span>
                <span className="text-lg font-mono font-black text-white">{targetPhoneNumber}</span>
              </div>

              <a
                href={`tel:${targetPhoneNumber}`}
                className="py-2.5 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-extrabold text-xs uppercase flex items-center gap-2 shadow-lg shadow-teal-500/20 transition-all"
              >
                <PhoneCall className="w-4 h-4" /> Call Phone Hotline
              </a>
            </div>

            {/* Live Hospital Bed Capacity Metrics */}
            <div className="grid grid-cols-4 gap-3 pt-2">
              <div className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800 text-center">
                <span className="text-[10px] text-slate-400 block font-bold">Total Beds</span>
                <span className="text-sm font-black text-white font-outfit">{bedStatus.totalBeds}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center">
                <span className="text-[10px] text-emerald-400 block font-bold">Available</span>
                <span className="text-sm font-black text-emerald-300 font-outfit">{bedStatus.availableBeds}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-center">
                <span className="text-[10px] text-rose-400 block font-bold">ICU Avail</span>
                <span className="text-sm font-black text-rose-300 font-outfit">{bedStatus.icuBeds.available}/{bedStatus.icuBeds.total}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-center">
                <span className="text-[10px] text-cyan-400 block font-bold">O2 Beds</span>
                <span className="text-sm font-black text-cyan-300 font-outfit">{bedStatus.oxygenBeds.available}/{bedStatus.oxygenBeds.total}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Pre-Written Emergency SMS Generator & 1-Tap Trigger (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="p-6 rounded-3xl glass-panel border border-rose-500/60 space-y-4 bg-rose-950/20 relative">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-rose-400" /> Auto-Generated Pre-Written SMS
              </h2>
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold uppercase">
                1-TAP READY
              </span>
            </div>

            {dispatchStatus && (
              <div className="p-3 rounded-2xl bg-slate-900/90 border border-rose-500/40 text-xs text-rose-300 flex items-center gap-2 animate-in fade-in">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{dispatchStatus}</span>
              </div>
            )}

            {/* Editable Patient Inputs */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Patient Name</label>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl glass-input text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Age / Gender</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-1/2 py-2 px-2 rounded-xl glass-input text-xs font-semibold text-center"
                  />
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-1/2 py-2 px-1 rounded-xl glass-input text-[11px] font-semibold"
                  >
                    <option value="Male">M</option>
                    <option value="Female">F</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Vitals Inputs */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Temp (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  value={temp}
                  onChange={(e) => setTemp(Number(e.target.value))}
                  className="w-full py-1.5 px-2 rounded-xl glass-input text-xs font-semibold text-center"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">SpO2 (%)</label>
                <input
                  type="number"
                  value={spO2}
                  onChange={(e) => setSpO2(Number(e.target.value))}
                  className="w-full py-1.5 px-2 rounded-xl glass-input text-xs font-semibold text-center text-rose-400"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">Pulse (bpm)</label>
                <input
                  type="number"
                  value={pulse}
                  onChange={(e) => setPulse(Number(e.target.value))}
                  className="w-full py-1.5 px-2 rounded-xl glass-input text-xs font-semibold text-center"
                />
              </div>
            </div>

            {/* Auto-Generated Pre-Written Message Payload Preview Box */}
            <div>
              <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1 flex items-center justify-between">
                <span>Pre-Written Message Preview (Sent to {targetPhoneNumber})</span>
                <span className="text-[9px] text-slate-400 lowercase">auto-populated</span>
              </label>
              <textarea
                readOnly
                value={prewrittenSMSBody}
                rows={7}
                className="w-full p-3 rounded-2xl bg-slate-950/80 border border-slate-800 text-slate-200 font-mono text-[11px] leading-relaxed resize-none selection:bg-rose-500/30"
              />
            </div>

            {/* 1-Tap Trigger Dispatch Button */}
            <button
              onClick={handleSendEmergencySMS}
              disabled={isDispatching}
              className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-red-500 to-rose-600 hover:from-rose-400 hover:to-red-400 text-white font-black text-xs uppercase tracking-wider shadow-xl shadow-rose-500/30 flex items-center justify-center gap-2 transition-all transform active:scale-95"
            >
              <Smartphone className="w-4 h-4 text-white" />
              {isDispatching ? 'Transmitting Fast2SMS Alert...' : `1-Tap Send Pre-Written Message to ${targetPhoneNumber}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
