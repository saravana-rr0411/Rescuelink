export function isValidGpsCoordinate(lat?: number | null, lng?: number | null): boolean {
  if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false;
  return true;
}

export function formatSupabaseError(error: any, fallbackMessage: string): string {
  if (!error) return fallbackMessage;
  const msg = error.message || error.error_description || String(error);
  if (msg.includes('timeout') || msg.includes('Timeout') || msg.includes('AbortError')) {
    return 'Request timed out. Please check your internet connection and try again.';
  }
  if (msg.includes('FetchError') || msg.includes('Failed to fetch') || msg.includes('network')) {
    return 'Network connection error. Please check your internet and try again.';
  }
  if (msg.includes('JWT') || msg.includes('auth') || msg.includes('session')) {
    return 'Authentication expired. Please log in again.';
  }
  return fallbackMessage;
}
