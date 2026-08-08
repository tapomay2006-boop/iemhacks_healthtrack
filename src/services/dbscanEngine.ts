import type { PatientRecord } from '../engine/dexieDb';

export interface OutbreakCluster {
  id: string;
  centroid: { lat: number; lng: number };
  radiusKm: number;
  caseCount: number;
  redCases: number;
  yellowCases: number;
  primarySymptoms: string[];
  primaryDisease: string;
  affectedVillages: string[];
  threatLevel: 'HIGH' | 'CRITICAL';
  detectedAt: string;
  patientIds: string[];
}

// Calculate distance between two GPS points using Haversine Formula (in km)
export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Spatial DBSCAN (Density-Based Spatial Clustering of Applications with Noise)
 * Clusters patient records within `eps` (5 km) with a minimum density of `minSamples` (3 cases)
 */
export function runDBSCANOutbreakSurveillance(
  patients: PatientRecord[],
  epsKm: number = 5.0,
  minSamples: number = 3
): OutbreakCluster[] {
  if (patients.length === 0) return [];

  // Filter cases from the last 7 days or all active cases
  const validPatients = patients.filter(
    (p) => p.geotag && typeof p.geotag.lat === 'number' && typeof p.geotag.lng === 'number'
  );

  const visited = new Set<number>();
  const clustered = new Set<number>();
  const clusters: PatientRecord[][] = [];

  // Helper to find all spatial neighbors within epsKm radius
  const getNeighbors = (patientIdx: number): number[] => {
    const p1 = validPatients[patientIdx];
    const neighbors: number[] = [];

    validPatients.forEach((p2, idx) => {
      if (patientIdx === idx) return;
      const dist = haversineDistanceKm(p1.geotag.lat, p1.geotag.lng, p2.geotag.lat, p2.geotag.lng);
      if (dist <= epsKm) {
        neighbors.push(idx);
      }
    });

    return neighbors;
  };

  // DBSCAN Main Loop
  validPatients.forEach((_, idx) => {
    if (visited.has(idx)) return;
    visited.add(idx);

    const neighbors = getNeighbors(idx);

    // If points around this patient >= minSamples, create a new cluster
    if (neighbors.length + 1 >= minSamples) {
      const currentCluster: PatientRecord[] = [validPatients[idx]];
      clustered.add(idx);

      const queue = [...neighbors];

      let qIdx = 0;
      while (qIdx < queue.length) {
        const neighborIdx = queue[qIdx];
        qIdx++;

        if (!visited.has(neighborIdx)) {
          visited.add(neighborIdx);
          const neighborNeighbors = getNeighbors(neighborIdx);
          if (neighborNeighbors.length + 1 >= minSamples) {
            queue.push(...neighborNeighbors.filter((n) => !queue.includes(n)));
          }
        }

        if (!clustered.has(neighborIdx)) {
          clustered.add(neighborIdx);
          currentCluster.push(validPatients[neighborIdx]);
        }
      }

      clusters.push(currentCluster);
    }
  });

  // Convert raw patient clusters to OutbreakCluster data structures
  return clusters.map((clusterPoints, clusterIdx) => {
    // 1. Calculate Centroid (Average Lat/Lng)
    const totalLat = clusterPoints.reduce((sum, p) => sum + p.geotag.lat, 0);
    const totalLng = clusterPoints.reduce((sum, p) => sum + p.geotag.lng, 0);
    const centroid = {
      lat: totalLat / clusterPoints.length,
      lng: totalLng / clusterPoints.length,
    };

    // 2. Count severity levels
    const redCases = clusterPoints.filter((p) => p.riskLevel === 'RED').length;
    const yellowCases = clusterPoints.filter((p) => p.riskLevel === 'YELLOW').length;

    // 3. Extract unique villages
    const affectedVillages = Array.from(new Set(clusterPoints.map((p) => p.villageName)));

    // 4. Determine primary symptoms frequency
    const symptomCounts: Record<string, number> = {};
    clusterPoints.forEach((p) => {
      Object.entries(p.symptomFlags || {}).forEach(([sym, isPresent]) => {
        if (isPresent) {
          symptomCounts[sym] = (symptomCounts[sym] || 0) + 1;
        }
      });
    });

    const topSymptoms = Object.entries(symptomCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([sym]) => sym);

    // 5. Determine primary diagnosis
    const diagnoses = clusterPoints.map((p) => p.primaryDiagnosis).filter(Boolean);
    const primaryDisease = diagnoses[0] || 'Acute Febrile / Respiratory Outbreak';

    return {
      id: `cluster_dbscan_${clusterIdx + 1}_${Date.now()}`,
      centroid,
      radiusKm: epsKm,
      caseCount: clusterPoints.length,
      redCases,
      yellowCases,
      primarySymptoms: topSymptoms.length > 0 ? topSymptoms : ['High Fever', 'Shortness of Breath', 'Lethargy'],
      primaryDisease,
      affectedVillages,
      threatLevel: redCases >= 2 || clusterPoints.length >= 5 ? 'CRITICAL' : 'HIGH',
      detectedAt: new Date().toISOString(),
      patientIds: clusterPoints.map((p) => p.patientId),
    };
  });
}
