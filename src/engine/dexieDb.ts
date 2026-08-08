import Dexie, { type Table } from 'dexie';

export interface Vitals {
  temperature: number; // in Fahrenheit
  pulseRate: number;    // bpm
  spO2: number;         // percentage (e.g. 95)
  bpSystolic: number;   // mmHg
  bpDiastolic: number;  // mmHg
  respRate: number;     // breaths/min
}

export interface PatientRecord {
  id?: number;
  patientId: string;
  name: string;
  age: number;
  gender: string;
  villageName: string;
  vitals: Vitals;
  symptomFlags: Record<string, boolean>;
  spokenSummary?: string;
  visualSymptomTag?: string;
  imageBlobUrl?: string;
  riskLevel: 'GREEN' | 'YELLOW' | 'RED';
  riskScore: number;
  primaryDiagnosis: string;
  careInstructions: string[];
  geotag: {
    lat: number;
    lng: number;
  };
  syncStatus: 0 | 1; // 0 = pending, 1 = synced
  createdAt: string;
}

export interface HealthAdvisory {
  id?: number;
  advisoryId: string;
  title: string;
  category: 'OUTBREAK_ALERT' | 'CONTAGION_WARNING' | 'MEDICAL_DIRECTIVE';
  targetClusterName: string;
  targetDistrict: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  message: string;
  actionSteps: string[];
  issuedBy: string;
  isRead?: boolean;
  createdAt: string;
}

export class HealthTrackDB extends Dexie {
  patients!: Table<PatientRecord>;
  advisories!: Table<HealthAdvisory>;

  constructor() {
    super('HealthTrackDB');
    this.version(2).stores({
      patients: '++id, patientId, riskLevel, syncStatus, createdAt, [geotag.lat+geotag.lng]',
      advisories: '++id, advisoryId, priority, targetClusterName, isRead, createdAt'
    });
  }
}

export const db = new HealthTrackDB();

