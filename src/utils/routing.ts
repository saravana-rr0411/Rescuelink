import { calculateHaversineDistance } from './distance';

export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] for Leaflet Polyline
  distanceMeters: number;
  durationSeconds: number;
}

export interface Hospital {
  id: string;
  name: string;
  address: string;
  phone: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
  emergencyDept: boolean;
  bedsAvailable: number;
}

/**
 * Fetches driving route polyline from OpenRouteService / OSRM public API.
 * Falls back to interpolated curved waypoints if the API call fails or is unreachable.
 */
export async function fetchOSRMRoute(
  origin: [number, number],
  destination: [number, number]
): Promise<RouteResult> {
  const [origLat, origLng] = origin;
  const [destLat, destLng] = destination;

  // Direct straight line distance as fallback base
  const directDistance = calculateHaversineDistance(origLat, origLng, destLat, destLng);

  try {
    // OSRM format: lng,lat;lng,lat
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${origLng},${origLat};${destLng},${destLat}?overview=full&geometries=geojson`;

    const response = await fetch(osrmUrl, { signal: AbortSignal.timeout(4000) });
    if (response.ok) {
      const data = await response.json();
      if (data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        // OSRM geojson returns coordinates as [lng, lat] -> convert to Leaflet [lat, lng]
        const leafletCoords: [number, number][] = route.geometry.coordinates.map(
          (c: [number, number]) => [c[1], c[0]]
        );
        return {
          coordinates: leafletCoords,
          distanceMeters: route.distance,
          durationSeconds: route.duration,
        };
      }
    }
  } catch (err) {
    console.warn('[RescueLink Routing] OSRM API request timed out or failed, using fallback route generator:', err);
  }

  // Fallback: Generate curved waypoint polyline between points
  const waypointsCount = 8;
  const coordinates: [number, number][] = [];

  // Slight perpendicular offset for natural route curvature
  const midLat = (origLat + destLat) / 2;
  const midLng = (origLng + destLng) / 2;
  const offsetLat = (destLng - origLng) * 0.15;
  const offsetLng = (origLat - destLat) * 0.15;

  for (let i = 0; i <= waypointsCount; i++) {
    const t = i / waypointsCount;
    // Quadratic Bezier curve interpolation
    const lat = (1 - t) * (1 - t) * origLat + 2 * (1 - t) * t * (midLat + offsetLat) + t * t * destLat;
    const lng = (1 - t) * (1 - t) * origLng + 2 * (1 - t) * t * (midLng + offsetLng) + t * t * destLng;
    coordinates.push([lat, lng]);
  }

  const estimatedDistance = directDistance * 1.25; // 25% road curvature factor
  const estimatedDuration = (estimatedDistance / 1000 / 40) * 3600; // ~40 km/h average speed in city

  return {
    coordinates,
    distanceMeters: estimatedDistance,
    durationSeconds: estimatedDuration,
  };
}

/**
 * Returns nearby hospitals relative to accident coordinates
 */
export function getNearbyHospitals(latitude: number, longitude: number): Hospital[] {
  // Offset relative to accident location to create realistic nearby medical centers
  return [
    {
      id: 'hosp-1',
      name: 'City General Trauma & Emergency Center',
      address: '120 Healthcare Plaza, Sector 4',
      phone: '+1 (555) 911-4000',
      latitude: latitude + 0.0085,
      longitude: longitude - 0.0062,
      distanceMeters: Math.round(calculateHaversineDistance(latitude, longitude, latitude + 0.0085, longitude - 0.0062)),
      emergencyDept: true,
      bedsAvailable: 14,
    },
    {
      id: 'hosp-2',
      name: 'St. Jude Memorial Hospital',
      address: '459 Relief Ave, District 2',
      phone: '+1 (555) 911-8820',
      latitude: latitude - 0.0072,
      longitude: longitude + 0.0094,
      distanceMeters: Math.round(calculateHaversineDistance(latitude, longitude, latitude - 0.0072, longitude + 0.0094)),
      emergencyDept: true,
      bedsAvailable: 6,
    },
    {
      id: 'hosp-3',
      name: 'Red Cross Urgent Care Clinic',
      address: '88 Emergency Way, Sector 5',
      phone: '+1 (555) 911-1200',
      latitude: latitude + 0.012,
      longitude: longitude + 0.0041,
      distanceMeters: Math.round(calculateHaversineDistance(latitude, longitude, latitude + 0.012, longitude + 0.0041)),
      emergencyDept: true,
      bedsAvailable: 22,
    },
  ];
}

/**
 * Helper to format duration in minutes/hours
 */
export function formatETA(seconds: number): string {
  if (seconds < 60) return '< 1 min';
  const mins = Math.round(seconds / 60);
  if (mins < 60) return `${mins} min${mins > 1 ? 's' : ''}`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours} hr ${remMins} min`;
}
