import type { PatientRecord } from '../engine/dexieDb';

export interface SMSDispatchResult {
  sentViaApi: boolean;
  smsUri: string;
  payloadText: string;
}

export const EMERGENCY_CONTACT_OPTIONS = [
  { label: 'Emergency Ambulance 108', number: '108' },
  { label: 'Sonarpur Rural PHC Health Center', number: '+919876543210' },
  { label: 'District General Hospital Emergency Unit', number: '+919876543211' },
  { label: 'Block Medical Officer (BMO) Direct', number: '+919876543212' },
];

export function generateEmergencySMSPayload(patient: PatientRecord): string {
  const vitalsSummary = `SpO2:${patient.vitals.spO2}% Temp:${patient.vitals.temperature}°F Pulse:${patient.vitals.pulseRate}bpm BP:${patient.vitals.bpSystolic}/${patient.vitals.bpDiastolic}`;
  const gpsLocation = `${patient.geotag.lat.toFixed(4)}, ${patient.geotag.lng.toFixed(4)}`;
  
  return `🚨 EMERGENCY MEDICAL DISPATCH ALERT!\n` +
    `Patient: ${patient.name} (${patient.age}y/${patient.gender})\n` +
    `Location/PIN: ${patient.villageName}\n` +
    `GPS Coords: ${gpsLocation}\n` +
    `Vitals: ${vitalsSummary}\n` +
    `Triage Risk: ${patient.riskLevel} CRITICAL\n` +
    `Diagnosis: ${patient.primaryDiagnosis}\n` +
    `Action: Prepare Emergency ICU Admission immediately.`;
}


export async function triggerEmergencyDispatchSMS(
  patient: PatientRecord,
  ambulancePhone: string = '+919876543210'
): Promise<SMSDispatchResult> {
  const payloadText = generateEmergencySMSPayload(patient);
  const fast2smsKey = import.meta.env.FAST2SMS_API_KEY;

  // Build native sms: URI scheme (Works 100% offline!)
  const encodedBody = encodeURIComponent(payloadText);
  const smsUri = `sms:${ambulancePhone}?body=${encodedBody}`;

  let sentViaApi = false;

  // If Fast2SMS Key is present and network is online, send Cloud SMS
  if (fast2smsKey && navigator.onLine) {
    try {
      console.log('📱 Sending Emergency SMS via Fast2SMS Cloud API to:', ambulancePhone);
      const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          'authorization': fast2smsKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'q',
          message: payloadText,
          language: 'english',
          flash: 0,
          numbers: ambulancePhone.replace('+', ''),
        }),
      });

      if (res.ok) {
        sentViaApi = true;
        console.log('✅ Fast2SMS Alert sent successfully to emergency contact!');
      }
    } catch (err) {
      console.warn('Fast2SMS call failed, falling back to 1-Tap native SMS:', err);
    }
  }

  return {
    sentViaApi,
    smsUri,
    payloadText,
  };
}

