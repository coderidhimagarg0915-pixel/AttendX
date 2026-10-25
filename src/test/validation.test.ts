import { describe, it, expect } from 'vitest';
import { StudentCheckInSchema, CreateSessionSchema } from '../lib/validation';

describe('Validation Schemas (Zod)', () => {
  describe('StudentCheckInSchema', () => {
    it('accepts valid alphanumeric session codes with hyphens', () => {
      const result = StudentCheckInSchema.safeParse({ sessionCode: 'DIST-849' });
      expect(result.success).toBe(true);
    });

    it('accepts valid alphanumeric session codes', () => {
      const result = StudentCheckInSchema.safeParse({ sessionCode: 'DIST849' });
      expect(result.success).toBe(true);
    });

    it('rejects short session codes less than 4 chars', () => {
      const result = StudentCheckInSchema.safeParse({ sessionCode: 'ABC' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('at least 4 characters');
      }
    });

    it('rejects invalid characters in session codes', () => {
      const result = StudentCheckInSchema.safeParse({ sessionCode: 'CODE@!#' });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateSessionSchema', () => {
    it('validates a valid session configuration', () => {
      const result = CreateSessionSchema.safeParse({
        courseId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Distributed Consensus Lecture',
        expirationMinutes: 15,
        requirePasscode: true,
      });
      expect(result.success).toBe(true);
    });

    it('rejects expiration minutes out of bounds (> 180 min)', () => {
      const result = CreateSessionSchema.safeParse({
        courseId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Overlong Session',
        expirationMinutes: 240,
        requirePasscode: true,
      });
      expect(result.success).toBe(false);
    });
  });
});
