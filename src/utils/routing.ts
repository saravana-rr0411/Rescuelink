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

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const response = await fetch(osrmUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    
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
 * Returns empty array by default. Static/fake hospital generation is strictly disabled.
 */
export function getNearbyHospitals(_latitude: number, _longitude: number): Hospital[] {
  return [];
}

/**
 * Fetches REAL nearby hospitals using OpenStreetMap Overpass API (with Nominatim fallback).

/**
 * Returns numeric hierarchy rank for emergency mission status to enforce strict one-way progression
 */
export function getStatusRank(status?: string | null): number {
  if (!status) return 1;
  const s = status.trim();
  switch (s) {
    case 'SOS Sent':
    case 'Reported':
    case 'Pending':
      return 1;
    case 'Volunteer Assigned':
    case 'Assigned':
      return 2;
    case 'Volunteer En Route':
    case 'En Route':
      return 3;
    case 'Volunteer Arrived':
    case 'Arrived at Scene':
    case 'Volunteer Arrived at Scene':
      return 4;
    case 'Transporting to Hospital':
    case 'Hospital Transfer':
    case 'To Hospital':
      return 5;
    case 'Hospital Reached':
      return 6;
    case 'Emergency Completed':
    case 'Emergency Resolved':
    case 'Completed':
      return 7;
    default:
      return 1;
  }
}

/**
 * Helper to format duration in minutes/hours with Arrived state support
 */
export function formatETA(seconds: number, distanceMeters?: number): string {
  if (distanceMeters !== undefined && distanceMeters < 30) {
    return 'Arrived';
  }
  if (seconds <= 0) {
    return 'Arrived';
  }
  const mins = Math.round(seconds / 60);
  if (mins < 1) return '1 min';
  if (mins < 60) return `${mins} min`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours} hr ${remMins} min`;
}

export interface StoredHospital {
  id?: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phone?: string;
  internationalPhone?: string;
  rating?: number;
  website?: string;
  distanceMeters?: number;
}

/**
 * Fetches Google Places Details for a hospital (Name, Address, International Phone Number, Rating, Website)
 */
export async function fetchGooglePlacesDetails(
  name: string,
  latitude: number,
  longitude: number
): Promise<{
  name: string;
  address?: string;
  phone?: string;
  internationalPhone?: string;
  rating?: number;
  website?: string;
} | null> {
  return new Promise((resolve) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      resolve(null);
      return;
    }

    try {
      const dummyDiv = document.createElement('div');
      const service = new google.maps.places.PlacesService(dummyDiv);
      const searchRequest: google.maps.places.TextSearchRequest = {
        location: new google.maps.LatLng(latitude, longitude),
        radius: 2000,
        query: name,
      };

      service.textSearch(searchRequest, (results, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results[0] && results[0].place_id) {
          service.getDetails(
            {
              placeId: results[0].place_id,
              fields: ['name', 'formatted_address', 'formatted_phone_number', 'international_phone_number', 'rating', 'website'],
            },
            (place, detailStatus) => {
              if (detailStatus === google.maps.places.PlacesServiceStatus.OK && place) {
                const phoneNum = (place.formatted_phone_number || place.international_phone_number || '').trim();
                resolve({
                  name: place.name || name,
                  address: place.formatted_address || undefined,
                  phone: phoneNum || undefined,
                  internationalPhone: place.international_phone_number || undefined,
                  rating: place.rating || undefined,
                  website: place.website || undefined,
                });
              } else {
                resolve(null);
              }
            }
          );
        } else {
          resolve(null);
        }
      });
    } catch (e) {
      console.warn('[RescueLink Places] Places API search error:', e);
      resolve(null);
    }
  });
}

/**
 * Saves selected hospital separately in localStorage without mutating description
 */
export function saveStoredHospital(accidentId: string, hospital: StoredHospital): void {
  try {
    localStorage.setItem(`rescuelink_hospital_${accidentId}`, JSON.stringify(hospital));
    window.dispatchEvent(new CustomEvent('rescuelink_hospital_updated', { detail: { accidentId, hospital } }));
  } catch (e) {
    console.warn('[RescueLink Hospital Storage] LocalStorage write error:', e);
  }
}

/**
 * Retrieves stored hospital for an accident ID
 */
export function getStoredHospital(accidentId?: string | null): StoredHospital | null {
  if (!accidentId) return null;
  try {
    const raw = localStorage.getItem(`rescuelink_hospital_${accidentId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.name) return parsed;
    }
  } catch (e) {
    // Ignore
  }
  return null;
}

/**
 * Cleans accident description by stripping any previously injected hospital JSON/strings
 */
export function cleanDescriptionText(description?: string | null): string {
  if (!description) return '';
  return description
    .replace(/\[HOSPITAL_DATA:.*?\]/g, '')
    .replace(/Destination Hospital Selected:.*?(\n|$)/gi, '')
    .replace(/\[Hospital:.*?\]/g, '')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}

export interface HospitalData {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

export function encodeHospitalData(_hospital: HospitalData, baseDescription?: string | null): string {
  return cleanDescriptionText(baseDescription);
}

export function parseHospitalData(_description?: string | null): HospitalData | null {
  return null;
}
