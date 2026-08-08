import React, { useState, useEffect } from 'react';
import { db, PatientRecord, HealthAdvisory } from '../../engine/dexieDb';
import { runDBSCANOutbreakSurveillance, OutbreakCluster } from '../../services/dbscanEngine';
import {
  findNearestHospitalByGPS,
  getHospitalBedAvailability,
  reserveHospitalBed,
  MedicalFacility,
  HospitalBedStatus
} from '../../services/facilityService';
import { OutbreakMap } from './OutbreakMap';
import { OutbreakAnalytics } from './OutbreakAnalytics';
import {
  ShieldAlert,
  Radio,
  MapPin,
  Send,
  AlertTriangle,
  Users,
  Activity,
  CheckCircle2,
  Building2,
  PhoneCall,
  Bed,
  HeartPulse,
  Sparkles,
  ChevronRight
} from 'lucide-react';

export const AdminOutbreakPortal: React.FC = () => {
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [clusters, setClusters] = useState<OutbreakCluster[]>([]);
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [reservationTick, setReservationTick] = useState(0);


  // Health Advisory Creation State
  const [advisoryTitle, setAdvisoryTitle] = useState('🚨 DENGUE & FEBRILE CONTAGION DIRECTIVE');
  const [advisoryPriority, setAdvisoryPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM'>('CRITICAL');
  const [advisoryText, setAdvisoryText] = useState('Contaminated water sources detected in outbreak cluster sector. Mandate immediate ORS packet distribution and Rapid NS1 Antigen Cards for all febrile pediatric patients.');
  const [advisoryActionSteps, setAdvisoryActionSteps] = useState('Distribute ORS Packets; Conduct Rapid NS1 Dengue Cards; Isolate Febrile Cases');
  const [broadcastSent, setBroadcastSent] = useState(false);

  // Cluster Bed Booking State
  const [bookingStatus, setBookingStatus] = useState<string | null>(null);

  // Seed sample patient records if local DB is empty
  useEffect(() => {
    const initData = async () => {
      let existing = await db.patients.toArray();

      if (existing.length === 0) {
        const mockPatients: PatientRecord[] = [
          {
            patientId: 'PAT-881021',
            name: 'Aarav Kumar',
            age: 4,
            gender: 'Male',
            villageName: 'Sonarpur Sector 4',
            vitals: { temperature: 103.2, pulseRate: 122, spO2: 88, bpSystolic: 102, bpDiastolic: 68, respRate: 36 },
            symptomFlags: { 'fever': true, 'shortness of breath': true, 'lethargy': true, 'cough': true },
            riskLevel: 'RED',
            riskScore: 0.96,
            primaryDiagnosis: 'Acute Respiratory Distress Syndrome',
            careInstructions: ['Provide supplemental O2', 'Immediate hospital transport'],
            geotag: { lat: 22.5746, lng: 88.3639 },
            syncStatus: 1,
            createdAt: new Date().toISOString(),
          },
          {
            patientId: 'PAT-881022',
            name: 'Suman Devi',
            age: 5,
            gender: 'Female',
            villageName: 'Sonarpur Sector 4',
            vitals: { temperature: 102.8, pulseRate: 116, spO2: 89, bpSystolic: 100, bpDiastolic: 65, respRate: 34 },
            symptomFlags: { 'fever': true, 'shortness of breath': true, 'diarrhea': true, 'vomiting': true },
            riskLevel: 'RED',
            riskScore: 0.94,
            primaryDiagnosis: 'Cholera / Severe Febrile Dehydration',
            careInstructions: ['ORS rehydration', 'Isolation advisory'],
            geotag: { lat: 22.5780, lng: 88.3680 },
            syncStatus: 1,
            createdAt: new Date().toISOString(),
          },
          {
            patientId: 'PAT-881023',
            name: 'Rohit Singh',
            age: 3,
            gender: 'Male',
            villageName: 'Adisaptagram',
            vitals: { temperature: 103.0, pulseRate: 120, spO2: 87, bpSystolic: 98, bpDiastolic: 62, respRate: 38 },
            symptomFlags: { 'fever': true, 'shortness of breath': true, 'lethargy': true },
            riskLevel: 'RED',
            riskScore: 0.97,
            primaryDiagnosis: 'Dengue Hemorrhagic / Febrile Cluster',
            careInstructions: ['Oxygen therapy', 'ICU referral'],
            geotag: { lat: 22.9514, lng: 88.3711 },
            syncStatus: 1,
            createdAt: new Date().toISOString(),
          },
          {
            patientId: 'PAT-881024',
            name: 'Neha Kumari',
            age: 6,
            gender: 'Female',
            villageName: 'Adisaptagram',
            vitals: { temperature: 101.5, pulseRate: 108, spO2: 93, bpSystolic: 104, bpDiastolic: 70, respRate: 28 },
            symptomFlags: { 'fever': true, 'cough': true, 'sore throat': true },
            riskLevel: 'YELLOW',
            riskScore: 0.65,
            primaryDiagnosis: 'Moderate Febrile Virus',
            careInstructions: ['Paracetamol dosage', 'Hydration'],
            geotag: { lat: 22.9530, lng: 88.3730 },
            syncStatus: 1,
            createdAt: new Date().toISOString(),
          },
          {
            patientId: 'PAT-881025',
            name: 'Vikas Yadav',
            age: 2,
            gender: 'Male',
            villageName: 'Habra',
            vitals: { temperature: 103.5, pulseRate: 124, spO2: 89, bpSystolic: 95, bpDiastolic: 60, respRate: 35 },
            symptomFlags: { 'fever': true, 'shortness of breath': true, 'vomiting': true },
            riskLevel: 'RED',
            riskScore: 0.95,
            primaryDiagnosis: 'Acute Encephalitis Vector Outbreak',
            careInstructions: ['Airway clearance', 'Emergency dispatch'],
            geotag: { lat: 22.8364, lng: 88.6322 },
            syncStatus: 1,
            createdAt: new Date().toISOString(),
          },
        ];

        for (const p of mockPatients) {
          await db.patients.add(p);
        }
        existing = await db.patients.toArray();
      }

      setPatients(existing);

      // Run DBSCAN Spatial Clustering
      const detectedClusters = runDBSCANOutbreakSurveillance(existing, 5.0, 2);
      setClusters(detectedClusters);
      if (detectedClusters.length > 0) {
        setSelectedClusterId(detectedClusters[0].id);
      }
    };

    initData();
  }, []);

  const selectedCluster = clusters.find((c) => c.id === selectedClusterId);

  // Compute Nearest Hospital in data.json & Live Bed Availability for the Selected Cluster
  const nearestHospital: MedicalFacility | null = selectedCluster
    ? findNearestHospitalByGPS(selectedCluster.centroid.lat, selectedCluster.centroid.lng)
    : (patients.length > 0 ? findNearestHospitalByGPS(patients[0].geotag.lat, patients[0].geotag.lng) : null);

  const bedStatus: HospitalBedStatus | null = nearestHospital
    ? getHospitalBedAvailability(nearestHospital)
    : null;

  // Broadcast Advisory to ASHA Workers (Saved to Dexie & Synced to Supabase)
  const handleBroadcastAdvisory = async () => {
    if (!advisoryText.trim()) return;

    const newAdvisory: HealthAdvisory = {
      advisoryId: 'ADV-WB-' + Math.floor(1000 + Math.random() * 9000),
      title: advisoryTitle,
      category: 'OUTBREAK_ALERT',
      targetClusterName: selectedCluster ? `${selectedCluster.primaryDisease} (${selectedCluster.affectedVillages.join(', ')})` : 'All District Sectors',
      targetDistrict: nearestHospital ? nearestHospital.district : 'West Bengal Health Sector',
      priority: advisoryPriority,
      message: advisoryText,
      actionSteps: advisoryActionSteps.split(';').map(s => s.trim()).filter(Boolean),
      issuedBy: 'Chief District Medical Officer (CDMO Command)',
      isRead: false,
      createdAt: new Date().toISOString()
    };

    await db.advisories.add(newAdvisory);

    setBroadcastSent(true);
    setTimeout(() => {
      setBroadcastSent(false);
    }, 4500);
  };

  // Handle Bed Reservation & Real-Time Count Decrementing
  const handleReserveBed = () => {
    if (!nearestHospital || !bedStatus) return;

    if (bedStatus.icuBeds.available <= 0) {
      setBookingStatus(`⚠️ No ICU beds remaining to reserve at ${nearestHospital.name}`);
      return;
    }

    const newReservedTotal = reserveHospitalBed(nearestHospital.id);
    setReservationTick(t => t + 1);

    const remainingBeds = bedStatus.availableBeds - 1;
    const remainingIcu = bedStatus.icuBeds.available - 1;

    setBookingStatus(`✅ Reserved 1 Critical ICU Bed at ${nearestHospital.name}. (Available Beds decreased to ${remainingBeds}, ICU: ${remainingIcu})`);
    setTimeout(() => setBookingStatus(null), 5000);
  };


  return (
    <div className="space-y-6">
      {/* Executive Command Center Header */}
      <div className="p-6 rounded-3xl glass-panel border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold tracking-wider uppercase">
              Chief Medical Officer Command Hub
            </span>
            <span className="text-xs text-slate-400">DBSCAN Spatial GIS • Live Bed Availability</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-outfit">
            Outbreak Epicenter & Hospital Bed Capacity Command
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time cluster selection, hospital bed availability monitoring, and field advisory broadcasting.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs font-bold flex items-center gap-2 animate-pulse">
            <Radio className="w-4 h-4 text-rose-400" />
            <span>{clusters.length} Outbreak Epicenters Tracked</span>
          </div>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl glass-card border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Intake Cases</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-white font-outfit">{patients.length}</span>
            <span className="text-xs text-emerald-400 font-semibold">+12 today</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-rose-900/50 bg-rose-950/20">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400" /> RED Critical Risk
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-rose-400 font-outfit">
              {patients.filter((p) => p.riskLevel === 'RED').length}
            </span>
            <span className="text-xs text-rose-300 font-semibold">Immediate ICU Transport</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Spatial Clusters (DBSCAN)</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-amber-400 font-outfit">{clusters.length}</span>
            <span className="text-xs text-slate-400 font-medium">5 km Radius</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl glass-card border border-slate-800">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nearest Cluster Hospital</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-base font-bold text-white font-outfit truncate">{nearestHospital ? nearestHospital.name.split(' ')[0] : 'N/A'}</span>
            <span className="text-xs text-teal-400 font-semibold">{bedStatus ? `${bedStatus.availableBeds} Beds` : 'Live Beds'}</span>
          </div>
        </div>
      </div>

      {/* Main Grid: GIS Epicenter Map (8 Cols) + Cluster Bed Capacity & Advisory Dispatch (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: GIS Map & Cluster Selector (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <MapPin className="w-4 h-4 text-rose-400" /> Interactive Spatial Epicenter Map & Cluster Selector
            </h2>
            <span className="text-xs text-slate-400">Select cluster below or click map circle</span>
          </div>

          {/* Cluster Dropdown Selector */}
          <div className="p-4 rounded-2xl glass-panel border border-slate-800 flex items-center gap-3">
            <Radio className="w-4 h-4 text-amber-400 shrink-0" />
            <label className="text-xs font-bold text-slate-300 shrink-0">Select Outbreak Cluster:</label>
            <select
              value={selectedClusterId || ''}
              onChange={(e) => setSelectedClusterId(e.target.value)}
              className="w-full py-2 px-3 rounded-xl glass-input text-xs font-semibold"
            >
              {clusters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.primaryDisease} ({c.affectedVillages.join(', ')}) — {c.caseCount} Cases [{c.threatLevel}]
                </option>
              ))}
            </select>
          </div>

          <OutbreakMap
            clusters={clusters}
            patients={patients}
            selectedClusterId={selectedClusterId}
            onSelectCluster={(id) => setSelectedClusterId(id)}
          />
        </div>

        {/* Right Column: Cluster Bed Availability Engine & Advisory Broadcast (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Cluster Hospital Bed Availability Card */}
          {selectedCluster && nearestHospital && bedStatus ? (
            <div className="p-6 rounded-3xl glass-panel border border-teal-500/60 space-y-4 bg-teal-950/20 relative overflow-hidden">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-rose-500 text-white font-extrabold text-[10px] tracking-wider uppercase animate-pulse">
                  {selectedCluster.threatLevel} OUTBREAK
                </span>
                <span className="text-xs font-bold text-teal-400">
                  {nearestHospital.distanceKm} km to Cluster
                </span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nearest Cluster Hospital</span>
                <h3 className="text-lg font-black text-white font-outfit mt-0.5">{nearestHospital.name}</h3>
                <p className="text-xs text-slate-300 mt-1">{nearestHospital.location || nearestHospital.address}</p>
              </div>

              {bookingStatus && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{bookingStatus}</span>
                </div>
              )}

              {/* Real-time Hospital Bed Capacity Grid */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                  <Bed className="w-4 h-4 text-teal-400" /> Live Real-Time Bed Availability
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800">
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Capacity</span>
                    <span className="text-sm font-black text-white font-outfit">{bedStatus.totalBeds} Beds</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-950/50 border border-emerald-500/40">
                    <span className="text-[10px] text-emerald-400 block font-semibold">Total Avail Beds</span>
                    <span className="text-sm font-black text-emerald-300 font-outfit">{bedStatus.availableBeds} Beds</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40">
                    <span className="text-[10px] text-rose-400 block font-semibold">ICU Beds</span>
                    <span className="text-sm font-black text-rose-300 font-outfit">{bedStatus.icuBeds.available} / {bedStatus.icuBeds.total} Avail</span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-cyan-950/50 border border-cyan-500/40">
                    <span className="text-[10px] text-cyan-400 block font-semibold">Oxygen Beds</span>
                    <span className="text-sm font-black text-cyan-300 font-outfit">{bedStatus.oxygenBeds.available} / {bedStatus.oxygenBeds.total} Avail</span>
                  </div>
                </div>
              </div>

              {/* Emergency Bed Allocation Action */}
              <button
                onClick={handleReserveBed}
                className="w-full py-2.5 px-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-teal-500/20 transition-all flex items-center justify-center gap-2"
              >
                <HeartPulse className="w-4 h-4 text-slate-950" /> Reserve Emergency ICU Bed for Cluster
              </button>
            </div>
          ) : (
            <div className="p-6 rounded-3xl glass-card border border-slate-800 text-center py-12 text-slate-400 text-xs">
              Select an epicenter cluster to inspect nearest hospital bed capacity.
            </div>
          )}

          {/* Broadcast Health Advisory Center */}
          <div className="p-6 rounded-3xl glass-card border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-400" /> Issue Official Health Advisory Directive
              </h3>
              <span className="text-[10px] text-slate-400">Pushes to ASHA Logins</span>
            </div>

            {broadcastSent && (
              <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Health Advisory published! ASHA workers will receive pop-up modal upon login.</span>
              </div>
            )}

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Advisory Title</label>
                <input
                  type="text"
                  value={advisoryTitle}
                  onChange={(e) => setAdvisoryTitle(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl glass-input text-xs font-semibold"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Priority Level</label>
                <select
                  value={advisoryPriority}
                  onChange={(e) => setAdvisoryPriority(e.target.value as any)}
                  className="w-full py-2 px-3 rounded-xl glass-input text-xs font-semibold"
                >
                  <option value="CRITICAL">🔴 CRITICAL (Immediate Field Alert)</option>
                  <option value="HIGH">🟠 HIGH (Enhanced Screening)</option>
                  <option value="MEDIUM">🟡 MEDIUM (Standard Guidance)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Advisory Guidance Message</label>
                <textarea
                  value={advisoryText}
                  onChange={(e) => setAdvisoryText(e.target.value)}
                  rows={2}
                  className="w-full p-2.5 rounded-xl glass-input text-xs resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Action Steps (Semicolon Separated)</label>
                <input
                  type="text"
                  value={advisoryActionSteps}
                  onChange={(e) => setAdvisoryActionSteps(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl glass-input text-xs font-semibold"
                />
              </div>
            </div>

            <button
              onClick={handleBroadcastAdvisory}
              disabled={!advisoryText.trim()}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4 text-slate-950" /> Broadcast Advisory Directive to ASHA Workers
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Section: Epidemiological Analytics & Trend Curves */}
      <div className="space-y-4 pt-4 border-t border-slate-800/80">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-400" /> Epidemiological Analytics & Outbreak Curves
        </h2>
        <OutbreakAnalytics patients={patients} />
      </div>
    </div>
  );
};

