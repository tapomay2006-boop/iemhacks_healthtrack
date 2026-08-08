import React from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import { OutbreakCluster } from '../../services/dbscanEngine';
import { PatientRecord } from '../../engine/dexieDb';

interface OutbreakMapProps {
  clusters: OutbreakCluster[];
  patients: PatientRecord[];
  selectedClusterId: string | null;
  onSelectCluster: (id: string) => void;
}

// Custom Leaflet Icons for RED / YELLOW / GREEN Patient Markers
const createCustomIcon = (color: string) =>
  L.divIcon({
    className: 'custom-leaflet-marker',
    html: `<div style="
      background-color: ${color};
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid white;
      box-shadow: 0 0 10px ${color};
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const redIcon = createCustomIcon('#ef4444');
const yellowIcon = createCustomIcon('#f59e0b');
const greenIcon = createCustomIcon('#10b981');

export const OutbreakMap: React.FC<OutbreakMapProps> = ({
  clusters,
  patients,
  selectedClusterId,
  onSelectCluster,
}) => {
  // Default Map Centroid (Sonarpur Cluster Center)
  const defaultCenter: [number, number] = [25.5941, 85.1376];

  return (
    <div className="w-full h-[450px] sm:h-[520px] rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full"
      >
        {/* Dark Mode CartoDB Tile Layer */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        />

        {/* 1. Render DBSCAN Outbreak Epicenter Circle Overlays */}
        {clusters.map((cluster) => {
          const isSelected = selectedClusterId === cluster.id;
          return (
            <Circle
              key={cluster.id}
              center={[cluster.centroid.lat, cluster.centroid.lng]}
              radius={cluster.radiusKm * 1000} // Radius in meters
              pathOptions={{
                color: cluster.threatLevel === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                fillColor: cluster.threatLevel === 'CRITICAL' ? '#ef4444' : '#f59e0b',
                fillOpacity: isSelected ? 0.35 : 0.2,
                weight: isSelected ? 3 : 1.5,
                dashArray: '6, 6',
              }}
              eventHandlers={{
                click: () => onSelectCluster(cluster.id),
              }}
            >
              <Popup>
                <div className="p-1 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <span className="font-extrabold text-xs text-rose-400 uppercase">
                      DBSCAN Outbreak Cluster
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-white">{cluster.primaryDisease}</h4>
                  <p className="text-xs text-slate-300">
                    <strong>Total Cases:</strong> {cluster.caseCount} ({cluster.redCases} RED Critical)
                  </p>
                  <p className="text-xs text-slate-300">
                    <strong>Villages:</strong> {cluster.affectedVillages.join(', ')}
                  </p>
                  <p className="text-[11px] text-teal-400 font-semibold mt-1">
                    Primary Symptoms: {cluster.primarySymptoms.join(', ')}
                  </p>
                </div>
              </Popup>
            </Circle>
          );
        })}

        {/* 2. Render Individual Patient Pin Markers */}
        {patients.map((p) => {
          if (!p.geotag || typeof p.geotag.lat !== 'number') return null;

          const icon =
            p.riskLevel === 'RED' ? redIcon : p.riskLevel === 'YELLOW' ? yellowIcon : greenIcon;

          return (
            <Marker key={p.patientId} position={[p.geotag.lat, p.geotag.lng]} icon={icon}>
              <Popup>
                <div className="p-1 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">{p.villageName} Village</span>
                  <h4 className="font-bold text-xs text-white">{p.name} ({p.age}y / {p.gender})</h4>
                  <p className="text-xs text-slate-300">
                    Risk: <span className="font-bold text-rose-400">{p.riskLevel}</span> (SpO2: {p.vitals?.spO2}%, Temp: {p.vitals?.temperature}°F)
                  </p>
                  <p className="text-[10px] text-slate-400">{p.primaryDiagnosis}</p>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};
