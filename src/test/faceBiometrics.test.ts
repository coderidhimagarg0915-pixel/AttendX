import { describe, it, expect } from 'vitest';
import {
  calculateFaceMatchDistance,
  computeMatchSimilarity,
  STRICT_MATCH_THRESHOLD,
} from '@/lib/faceBiometrics';

describe('Face Biometrics - Matching & Distance Algorithms', () => {
  it('returns 0 distance and 100% similarity for identical face descriptors', () => {
    const descriptor = new Array(128).fill(0.2);
    const dist = calculateFaceMatchDistance(descriptor, descriptor);
    expect(dist).toBeCloseTo(0, 5);

    const similarity = computeMatchSimilarity(dist);
    expect(similarity).toBe(100);
  });

  it('correctly identifies biometric match for minor variations below threshold', () => {
    // Descriptor with small noise (distance ~ 0.22)
    const d1 = new Array(128).fill(0.1);
    const d2 = d1.map((v, i) => (i % 2 === 0 ? v + 0.02 : v - 0.02));

    const dist = calculateFaceMatchDistance(d1, d2);
    expect(dist).toBeLessThan(STRICT_MATCH_THRESHOLD);
    expect(dist).toBeGreaterThan(0);

    const similarity = computeMatchSimilarity(dist);
    expect(similarity).toBeGreaterThan(70);
  });

  it('correctly rejects different people with distance exceeding strict threshold', () => {
    // Orthogonal or significantly different descriptors (representing different individuals)
    const student1 = new Array(128).fill(0.1);
    const differentPerson = new Array(128).fill(0.1).map((_, i) => (i < 64 ? 0.25 : -0.05));

    const dist = calculateFaceMatchDistance(student1, differentPerson);
    expect(dist).toBeGreaterThanOrEqual(STRICT_MATCH_THRESHOLD);

    const similarity = computeMatchSimilarity(dist);
    expect(similarity).toBeLessThan(70);
  });

  it('throws an error if descriptors have mismatched dimensions', () => {
    const d1 = new Array(128).fill(0.1);
    const dInvalid = [0.1, 0.2, 0.3];

    expect(() => calculateFaceMatchDistance(d1, dInvalid)).toThrow(
      'Face descriptors must have matching 128 dimensions'
    );
  });
});
