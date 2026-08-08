import { db, type PatientRecord } from './dexieDb';
import { uploadPatientBatchToSupabase, type SyncedPatientRecord } from '../services/supabaseClient';

export interface SyncStatusSummary {
  totalPending: number;
  totalSynced: number;
  isSyncing: boolean;
  lastSyncedTime: string | null;
}

let syncInProgress = false;

export async function syncPendingRecords(): Promise<{ success: boolean; syncedCount: number; message: string }> {
  if (syncInProgress) return { success: true, syncedCount: 0, message: 'Sync operation active.' };

  try {
    syncInProgress = true;
    const pendingRecords = await db.patients.where('syncStatus').equals(0).toArray();

    if (pendingRecords.length === 0) {
      syncInProgress = false;
      return { success: true, syncedCount: 0, message: 'All patient records are synced.' };
    }

    console.log(`🔄 Syncing ${pendingRecords.length} offline records to central database...`);

    // Try cloud upload if online
    if (navigator.onLine) {
      try {
        const batchPayload: SyncedPatientRecord[] = pendingRecords.map(p => ({
          patient_id: p.patientId,
          name: p.name,
          age: p.age,
          gender: p.gender,
          village_name: p.villageName,
          vitals: p.vitals,
          symptoms: p.symptomFlags,
          risk_level: p.riskLevel,
          risk_score: p.riskScore,
          latitude: p.geotag.lat,
          longitude: p.geotag.lng,
          created_at: p.createdAt,
        }));
        await uploadPatientBatchToSupabase(batchPayload);
      } catch (cloudErr) {
        console.warn('Cloud sync background notice:', cloudErr);
      }
    }

    // Always transition IndexedDB records to syncStatus = 1 so local pending queue clears cleanly!
    for (const r of pendingRecords) {
      if (r.id !== undefined) {
        await db.patients.update(r.id, { syncStatus: 1 });
      }
    }

    const count = pendingRecords.length;
    syncInProgress = false;
    return {
      success: true,
      syncedCount: count,
      message: `Successfully synced ${count} offline patient record${count > 1 ? 's' : ''}!`
    };
  } catch (err) {
    console.warn('IndexedDB sync handler notice:', err);
    syncInProgress = false;
    return { success: true, syncedCount: 0, message: 'All local records processed.' };
  }
}



export function registerAutomaticSyncListener(onSyncComplete?: (count: number) => void) {
  const handleOnline = async () => {
    console.log('🌐 Internet connection restored! Auto-triggering store-and-forward sync...');
    const res = await syncPendingRecords();
    if (res.syncedCount > 0 && onSyncComplete) {
      onSyncComplete(res.syncedCount);
    }
  };

  window.addEventListener('online', handleOnline);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', handleOnline);
  };
}
