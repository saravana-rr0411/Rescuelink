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
 * Strictly searches within a 5 km radius around (latitude, longitude).
 * Never fabricates or returns fake/mock hospital data.
 */
export async function fetchNearbyHospitalsOverpass(
  latitude: number,
  longitude: number
): Promise<Hospital[]> {
  const results: Hospital[] = [];
  const seenIds = new Set<string>();
  let hasSuccessfulApiCall = false;

  console.log('[DEBUG_HOSPITAL_SHEET] fetchNearbyHospitalsOverpass() started');
  console.log(`[DEBUG_HOSPITAL_SHEET] Accident coords: lat=${latitude}, lng=${longitude}`);
  console.log(`[DEBUG_HOSPITAL] typeof AbortController: ${typeof AbortController}`);
  console.log(`[DEBUG_HOSPITAL] typeof fetch: ${typeof fetch}`);

  const query = `[out:json][timeout:6];nwr["amenity"="hospital"](around:5000,${latitude},${longitude});out center 25;`;
  
  const OVERPASS_ENDPOINTS = [
    'https://overpass-api.de/api/interpreter',
    'https://lz4.overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter'
  ];

  // 1. Query OpenStreetMap Overpass API for real hospitals within 5 km (5000 m) radius
  for (const endpoint of OVERPASS_ENDPOINTS) {
    if (hasSuccessfulApiCall) break;
    
    try {
      const overpassUrl = `${endpoint}?data=${encodeURIComponent(query)}`;
      console.log(`[DEBUG_HOSPITAL] Starting Overpass fetch to ${endpoint} at ${new Date().toISOString()}`);
      
      const startTime = Date.now();
      
      let signal: AbortSignal | undefined = undefined;
      let timeoutId: any;
      if (typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        signal = controller.signal;
        timeoutId = setTimeout(() => controller.abort(), 10000);
      }

      const res = await fetch(overpassUrl, {
        headers: { 'User-Agent': 'RescueLink/1.0 (Emergency Response App)' },
        signal,
      });
      
      if (timeoutId) clearTimeout(timeoutId);
      
      const responseTime = Date.now() - startTime;
      console.log(`[DEBUG_HOSPITAL] Overpass HTTP status: ${res.status}, Response time: ${responseTime}ms`);

      if (res.ok) {
        hasSuccessfulApiCall = true;
        const data = await res.json();
        if (data.elements && Array.isArray(data.elements)) {
          for (const el of data.elements) {
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            if (!lat || !lon) continue;

            const dist = Math.round(calculateHaversineDistance(latitude, longitude, lat, lon));
            if (dist > 5000) continue; // Strictly within 5 km

            const name = el.tags?.name || el.tags?.['name:en'] || el.tags?.['official_name'] || el.tags?.['brand'];
            if (!name || name.trim() === '') continue; // Skip unnamed nodes

            const id = `overpass-${el.type || 'node'}-${el.id}`;
            if (seenIds.has(id)) continue;
            seenIds.add(id);

            const street = el.tags?.['addr:street'] || el.tags?.['addr:suburb'] || el.tags?.['addr:district'] || '';
            const city = el.tags?.['addr:city'] || el.tags?.['addr:town'] || '';
            const fullAddr = el.tags?.['addr:full'] || (street && city ? `${street}, ${city}` : street || city || `GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`);

            results.push({
              id,
              name: name.trim(),
              address: fullAddr.trim(),
              phone: el.tags?.phone || el.tags?.['contact:phone'] || '',
              latitude: lat,
              longitude: lon,
              distanceMeters: dist,
              emergencyDept: el.tags?.['emergency'] !== 'no',
              bedsAvailable: 0,
            });
          }
        }
      } else {
        console.warn(`[DEBUG_HOSPITAL] Overpass API HTTP Error ${res.status} from ${endpoint}`);
      }
    } catch (err: any) {
      console.warn(`[DEBUG_HOSPITAL] Overpass query failed for ${endpoint}:`, err);
      console.log(`[DEBUG_HOSPITAL] Error name: ${err?.name}, message: ${err?.message}`);
      if (err?.name === 'AbortError') {
        console.log('[DEBUG_HOSPITAL] Error type: timeout (AbortError)');
      } else if (err instanceof TypeError) {
        console.log('[DEBUG_HOSPITAL] Error type: TypeError (likely network/CORS or browser compatibility)');
      } else {
        console.log('[DEBUG_HOSPITAL] Error type: other');
      }
    }
  }

  // 2. Secondary Real Map Source: Nominatim Search API if Overpass returned 0 real hospitals
  if (results.length === 0) {
    console.log('[DEBUG_HOSPITAL_SHEET] Nominatim fallback attempted');
    try {
      const viewbox = `${longitude - 0.045},${latitude + 0.045},${longitude + 0.045},${latitude - 0.045}`;
      const nomUrl = `https://nominatim.openstreetmap.org/search?format=json&q=hospital&lat=${latitude}&lon=${longitude}&bounded=1&viewbox=${viewbox}&limit=15`;
      
      let signal: AbortSignal | undefined = undefined;
      let timeoutId: any;
      if (typeof AbortController !== 'undefined') {
        const controller = new AbortController();
        signal = controller.signal;
        timeoutId = setTimeout(() => controller.abort(), 8000);
      }
      
      const startTime = Date.now();
      const nomRes = await fetch(nomUrl, {
        headers: { 'User-Agent': 'RescueLink/1.0 (Emergency Response App)' },
        signal,
      });
      
      if (timeoutId) clearTimeout(timeoutId);
      
      console.log(`[DEBUG_HOSPITAL] Nominatim HTTP status: ${nomRes.status}, Response time: ${Date.now() - startTime}ms`);

      if (nomRes.ok) {
        hasSuccessfulApiCall = true;
        const nomData = await nomRes.json();
        if (Array.isArray(nomData)) {
          for (const item of nomData) {
            const lat = parseFloat(item.lat);
            const lon = parseFloat(item.lon);
            if (isNaN(lat) || isNaN(lon)) continue;

            const dist = Math.round(calculateHaversineDistance(latitude, longitude, lat, lon));
            if (dist > 5000) continue; // Strictly within 5 km

            const nameParts = (item.display_name || '').split(',');
            const name = nameParts[0]?.trim();
            if (!name) continue;

            const id = `nominatim-${item.place_id}`;
            if (seenIds.has(id)) continue;
            seenIds.add(id);

            const address = nameParts.slice(1, 3).join(',').trim() || `GPS (${lat.toFixed(4)}, ${lon.toFixed(4)})`;

            results.push({
              id,
              name,
              address,
              phone: '',
              latitude: lat,
              longitude: lon,
              distanceMeters: dist,
              emergencyDept: true,
              bedsAvailable: 0,
            });
          }
        }
      } else {
        console.warn(`[DEBUG_HOSPITAL] Nominatim API HTTP Error ${nomRes.status}`);
      }
    } catch (err: any) {
      console.warn('[DEBUG_HOSPITAL] Nominatim API Fallback search error:', err);
      console.log(`[DEBUG_HOSPITAL] Nominatim Error name: ${err?.name}, message: ${err?.message}`);
    }
  }

  if (!hasSuccessfulApiCall) {
    console.log('[DEBUG_HOSPITAL_SHEET] Final API_FAILURE reason: All API endpoints (Overpass + Nominatim) failed or timed out.');
    throw new Error('API_FAILURE');
  }

  // 3. Return ONLY real hospitals sorted by nearest distance. If none exist, returns empty array.
  return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
}

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
