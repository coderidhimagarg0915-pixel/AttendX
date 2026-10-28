import { describe, it, expect } from 'vitest';
import { StudentCheckInSchema, CreateSessionSchema, MnitEmailSchema } from '../lib/validation';

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

  describe('MnitEmailSchema (@mnit.ac.in restriction)', () => {
    it('accepts valid MNIT student email', () => {
      const result = MnitEmailSchema.safeParse('2024ucp1234@mnit.ac.in');
      expect(result.success).toBe(true);
    });

    it('accepts valid MNIT faculty email', () => {
      const result = MnitEmailSchema.safeParse('faculty.cse@mnit.ac.in');
      expect(result.success).toBe(true);
    });

    it('rejects public domain emails like gmail.com', () => {
      const result = MnitEmailSchema.safeParse('alex@gmail.com');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.errors[0]?.message).toContain('@mnit.ac.in');
      }
    });

    it('rejects other university domain emails', () => {
      const result = MnitEmailSchema.safeParse('student@iitd.ac.in');
      expect(result.success).toBe(false);
    });

    it('rejects invalid email formats', () => {
      const result = MnitEmailSchema.safeParse('not-an-email');
      expect(result.success).toBe(false);
    });
  });
});
