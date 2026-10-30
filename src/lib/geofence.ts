// MNIT Jaipur Main Campus Coordinates
export const MNIT_CAMPUS_COORDS = {
  latitude: 26.8631,
  longitude: 75.8106,
  campusRadiusMeters: 2500, // 2.5km radius covers all academic blocks & hostels
};

export interface GeofenceResult {
  supported: boolean;
  permissionGranted: boolean;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  isWithinCampus: boolean;
  statusText: string;
}

/**
 * Calculates Great Circle distance between two points in meters using Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth's mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Checks student's device GPS against MNIT Jaipur campus geofence
 */
export async function checkCampusGeofence(): Promise<GeofenceResult> {
  if (typeof window === 'undefined' || !navigator.geolocation) {
    return {
      supported: false,
      permissionGranted: false,
      latitude: null,
      longitude: null,
      distanceMeters: null,
      isWithinCampus: true, // Graceful fallback
      statusText: 'GPS not supported on device',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        const dist = calculateHaversineDistance(
          latitude,
          longitude,
          MNIT_CAMPUS_COORDS.latitude,
          MNIT_CAMPUS_COORDS.longitude
        );
        const isWithin = dist <= MNIT_CAMPUS_COORDS.campusRadiusMeters;
        const distText = dist < 1000 ? `${dist}m` : `${(dist / 1000).toFixed(1)}km`;

        resolve({
          supported: true,
          permissionGranted: true,
          latitude,
          longitude,
          distanceMeters: dist,
          isWithinCampus: isWithin,
          statusText: isWithin
            ? `MNIT Campus Verified (${distText} from academic zone)`
            : `Remote location (${distText} from MNIT campus)`,
        });
      },
      (err) => {
        resolve({
          supported: true,
          permissionGranted: false,
          latitude: null,
          longitude: null,
          distanceMeters: null,
          isWithinCampus: true, // Don't block student if permission was dismissed
          statusText: err.code === 1 ? 'Location permission not enabled' : 'Location unavailable',
        });
      },
      { timeout: 6000, enableHighAccuracy: false, maximumAge: 60000 }
    );
  });
}

