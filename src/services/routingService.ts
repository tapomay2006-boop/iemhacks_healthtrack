export interface AmbulanceRouteResult {
  distanceKm: number;
  durationMinutes: number;
  geometryCoordinates?: [number, number][]; // [lng, lat]
}

export async function calculateAmbulanceRoute(
  startGeotag: { lat: number; lng: number },
  endGeotag: { lat: number; lng: number }
): Promise<AmbulanceRouteResult> {
  const orsApiKey = import.meta.env.VITE_OPENROUTE_API_KEY;

  // Haversine fallback distance math
  const R = 6371; // Earth radius km
  const dLat = ((endGeotag.lat - startGeotag.lat) * Math.PI) / 180;
  const dLng = ((endGeotag.lng - startGeotag.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((startGeotag.lat * Math.PI) / 180) *
      Math.cos((endGeotag.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistanceKm = R * c;

  if (orsApiKey && navigator.onLine) {
    try {
      console.log('🗺️ Fetching OpenRouteService ambulance driving route...');
      const url = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsApiKey}&start=${startGeotag.lng},${startGeotag.lat}&end=${endGeotag.lng},${endGeotag.lat}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const route = data.features?.[0];
        if (route) {
          const distMeters = route.properties.summary.distance;
          const durationSec = route.properties.summary.duration;
          return {
            distanceKm: parseFloat((distMeters / 1000).toFixed(2)),
            durationMinutes: Math.round(durationSec / 60),
            geometryCoordinates: route.geometry.coordinates,
          };
        }
      }
    } catch (err) {
      console.warn('OpenRouteService call failed, using GIS direct distance:', err);
    }
  }

  // Fallback direct distance estimate
  return {
    distanceKm: parseFloat((straightDistanceKm * 1.3).toFixed(2)), // 1.3 road curvature factor
    durationMinutes: Math.round((straightDistanceKm * 1.3) * 2), // ~30 km/h rural road speed
  };
}
