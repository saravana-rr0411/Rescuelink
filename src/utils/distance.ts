/**
 * Calculates straight-line geographic distance between two sets of coordinates using the Haversine Formula.
 * Returns distance in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Radius of Earth in meters
  const toRad = Math.PI / 180;

  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats distance according to user specifications:
 * - If distance is less than 1000 meters, displays "850 m"
 * - Otherwise displays "2.35 km"
 */
export function formatDistance(distanceMeters: number): string {
  if (distanceMeters < 1000) {
    return `${Math.round(distanceMeters)} m`;
  }
  const distanceKm = distanceMeters / 1000;
  return `${distanceKm.toFixed(2)} km`;
}
