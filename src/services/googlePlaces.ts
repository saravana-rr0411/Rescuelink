export interface HospitalPlace {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMeters?: number;
  phone?: string;
}

export async function fetchNearbyHospitals(
  location: { lat: number; lng: number },
  radiusMeters: number = 5000
): Promise<HospitalPlace[]> {
  const apiKey =
    (import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '').trim() ||
    'AIzaSyA79hWKJ8jS6ACxdtb44LT1oWIACZj1upY';

  if (!apiKey || !location.lat || !location.lng) {
    return [];
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'places.id,places.displayName,places.formattedAddress,places.location,places.nationalPhoneNumber',
      },
      body: JSON.stringify({
        includedTypes: ['hospital'],
        maxResultCount: 10,
        locationRestriction: {
          circle: {
            center: {
              latitude: location.lat,
              longitude: location.lng,
            },
            radius: radiusMeters,
          },
        },
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.places && Array.isArray(data.places)) {
        return data.places.map((place: any) => {
          const pLat = place.location?.latitude || location.lat;
          const pLng = place.location?.longitude || location.lng;
          return {
            id: place.id || `hosp-${Math.random()}`,
            name: place.displayName?.text || 'Nearby Emergency Hospital',
            address: place.formattedAddress || 'Regional Emergency Trauma Care',
            lat: pLat,
            lng: pLng,
            phone: place.nationalPhoneNumber || '',
          };
        });
      }
    }
  } catch (err) {
    console.warn('[RescueLink Google Places API] Primary searchNearby warning:', err);
  }

  // Fallback Overpass OSM hospital search
  try {
    const query = `[out:json];node["amenity"="hospital"](around:${radiusMeters},${location.lat},${location.lng});out 8;`;
    const res = await fetch(`https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`);
    if (res.ok) {
      const data = await res.json();
      if (data.elements && Array.isArray(data.elements)) {
        return data.elements.map((el: any) => ({
          id: `overpass-${el.id}`,
          name: el.tags?.name || 'Emergency Hospital Center',
          address: el.tags?.['addr:street'] || 'Regional Emergency Care',
          lat: el.lat,
          lng: el.lon,
          phone: el.tags?.phone || '',
        }));
      }
    }
  } catch (err) {
    console.warn('[RescueLink Places API] Fallback query warning:', err);
  }

  return [];
}

export default fetchNearbyHospitals;
