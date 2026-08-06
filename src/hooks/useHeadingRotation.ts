import { useState, useEffect, useRef, useCallback } from 'react';

// Helper function to calculate movement bearing between two GPS coordinates
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLng = (lng2 - lng1) * rad;
  const y = Math.sin(dLng) * Math.cos(lat2 * rad);
  const x =
    Math.cos(lat1 * rad) * Math.sin(lat2 * rad) -
    Math.sin(lat1 * rad) * Math.cos(lat2 * rad) * Math.cos(dLng);
  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

export function useHeadingRotation(
  active: boolean,
  currentCoords?: { lat: number; lng: number } | null
) {
  const [heading, setHeading] = useState<number>(0);
  const prevCoordsRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastStableHeadingRef = useRef<number>(0);

  // Compass orientation listener
  useEffect(() => {
    if (!active) {
      setHeading(0);
      lastStableHeadingRef.current = 0;
      return;
    }

    const handleOrientation = (e: DeviceOrientationEvent) => {
      let compassHeading: number | null = null;

      if ('webkitCompassHeading' in e && typeof (e as any).webkitCompassHeading === 'number') {
        // iOS Webkit compass heading
        compassHeading = (e as any).webkitCompassHeading;
      } else if (e.alpha !== null && typeof e.alpha === 'number') {
        // Android / standard compass alpha
        compassHeading = (360 - e.alpha) % 360;
      }

      if (compassHeading !== null && !isNaN(compassHeading)) {
        lastStableHeadingRef.current = compassHeading;
        setHeading(compassHeading);
      }
    };

    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }

    return () => {
      if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
        window.removeEventListener('deviceorientation', handleOrientation, true);
      }
    };
  }, [active]);

  // GPS Movement bearing fallback
  useEffect(() => {
    if (!active || !currentCoords) return;

    if (prevCoordsRef.current) {
      const prev = prevCoordsRef.current;
      const distLat = Math.abs(currentCoords.lat - prev.lat);
      const distLng = Math.abs(currentCoords.lng - prev.lng);

      // Only calculate bearing if moved significantly (> 2 meters ~ 0.00002 deg)
      if (distLat > 0.00002 || distLng > 0.00002) {
        const movementHeading = calculateBearing(prev.lat, prev.lng, currentCoords.lat, currentCoords.lng);
        lastStableHeadingRef.current = movementHeading;
        setHeading(movementHeading);
      }
    }

    prevCoordsRef.current = currentCoords;
  }, [active, currentCoords]);

  const resetToNorth = useCallback(() => {
    setHeading(0);
    lastStableHeadingRef.current = 0;
  }, []);

  return {
    heading: active ? heading : 0,
    resetToNorth,
  };
}
