import { describe, it, expect } from 'vitest';
import { calculateHaversineDistance, MNIT_CAMPUS_COORDS } from '@/lib/geofence';

describe('Geofence & Location Validation', () => {
  it('calculates 0 meters for identical coordinates', () => {
    const dist = calculateHaversineDistance(
      MNIT_CAMPUS_COORDS.latitude,
      MNIT_CAMPUS_COORDS.longitude,
      MNIT_CAMPUS_COORDS.latitude,
      MNIT_CAMPUS_COORDS.longitude
    );
    expect(dist).toBe(0);
  });

  it('correctly calculates distances within campus perimeter (~500m)', () => {
    // Point ~500m north of campus center
    const latNearby = MNIT_CAMPUS_COORDS.latitude + 0.0045;
    const lonNearby = MNIT_CAMPUS_COORDS.longitude;

    const dist = calculateHaversineDistance(
      MNIT_CAMPUS_COORDS.latitude,
      MNIT_CAMPUS_COORDS.longitude,
      latNearby,
      lonNearby
    );
    expect(dist).toBeGreaterThan(400);
    expect(dist).toBeLessThan(600);
    expect(dist).toBeLessThan(MNIT_CAMPUS_COORDS.campusRadiusMeters);
  });

  it('correctly detects remote locations outside campus (>10km away)', () => {
    // Jaipur city center / Railway station (~11km away)
    const latRemote = 26.9196;
    const lonRemote = 75.7878;

    const dist = calculateHaversineDistance(
      MNIT_CAMPUS_COORDS.latitude,
      MNIT_CAMPUS_COORDS.longitude,
      latRemote,
      lonRemote
    );
    expect(dist).toBeGreaterThan(6000);
    expect(dist).toBeGreaterThan(MNIT_CAMPUS_COORDS.campusRadiusMeters);
  });
});

