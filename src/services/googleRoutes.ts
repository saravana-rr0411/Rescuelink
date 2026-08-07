export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteResponse {
  polyline: string;
  distanceMeters: number;
  durationSeconds: number;
  error?: string;
}

export function decodePolyline(encoded: string): LatLng[] {
  if (!encoded) return [];
  const points: LatLng[] = [];
  let index = 0;
  const len = encoded.length;
  let lat = 0;
  let lng = 0;

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += dlng;

    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }

  return points;
}

export async function fetchGoogleRoute(
  origin: LatLng,
  destination: LatLng
): Promise<RouteResponse> {
  const apiKey =
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim() ||
    'AIzaSyA79hWKJ8jS6ACxdtb44LT1oWIACZj1upY';

  if (!apiKey) {
    console.warn('[RescueLink Google Routes] API key missing.');
    return {
      polyline: '',
      distanceMeters: 0,
      durationSeconds: 0,
      error: 'Google Maps API key is missing.',
    };
  }

  try {
    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.lat,
              longitude: origin.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng,
            },
          },
        },
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE',
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn('[RescueLink Google Routes] API call failed:', response.status, errorText);
      return {
        polyline: '',
        distanceMeters: 0,
        durationSeconds: 0,
        error: `Routes API error ${response.status}: ${errorText}`,
      };
    }

    const data = await response.json();
    const route = data.routes?.[0];

    if (!route) {
      return {
        polyline: '',
        distanceMeters: 0,
        durationSeconds: 0,
        error: 'No route found.',
      };
    }

    let durationSecs = 0;
    if (route.duration) {
      durationSecs = parseInt(route.duration.replace('s', ''), 10) || 0;
    }

    return {
      polyline: route.polyline?.encodedPolyline || '',
      distanceMeters: route.distanceMeters || 0,
      durationSeconds: durationSecs,
    };
  } catch (err: any) {
    console.error('[RescueLink Google Routes] Network or execution error:', err);
    return {
      polyline: '',
      distanceMeters: 0,
      durationSeconds: 0,
      error: err.message || 'Failed to fetch Google route.',
    };
  }
}

export default fetchGoogleRoute;
