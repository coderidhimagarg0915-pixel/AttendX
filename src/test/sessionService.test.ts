import { describe, it, expect } from 'vitest';
import { generateSessionCode, sessionService } from '../services/sessionService';
import { CreateSessionSchema, ManualAttendanceOverrideSchema } from '../lib/validation';

describe('Teacher Session Engine', () => {
  describe('generateSessionCode', () => {
    it('generates a session code with correct prefix format', () => {
      const code = generateSessionCode('CS301');
      expect(code).toMatch(/^CS-\d{3}$/);
    });

    it('handles custom department prefixes', () => {
      const code = generateSessionCode('DISTRIBUTED');
      expect(code).toMatch(/^DIST-\d{3}$/);
    });

    it('falls back to ATT prefix if given empty string', () => {
      const code = generateSessionCode('');
      expect(code).toMatch(/^ATT-\d{3}$/);
    });
  });

  describe('CreateSessionSchema Validation', () => {
    it('successfully validates a valid session creation request', () => {
      const validPayload = {
        courseId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Distributed Consensus & Raft Protocol',
        expirationMinutes: 15,
        requirePasscode: true,
      };
      const res = CreateSessionSchema.safeParse(validPayload);
      expect(res.success).toBe(true);
    });

    it('rejects titles that are too short (<3 chars)', () => {
      const invalidPayload = {
        courseId: '123e4567-e89b-12d3-a456-426614174000',
        title: 'AB',
        expirationMinutes: 15,
        requirePasscode: true,
      };
      const res = CreateSessionSchema.safeParse(invalidPayload);
      expect(res.success).toBe(false);
    });
  });

  describe('ManualAttendanceOverrideSchema', () => {
    it('accepts valid status and audit reason', () => {
      const res = ManualAttendanceOverrideSchema.safeParse({
        recordId: '123e4567-e89b-12d3-a456-426614174000',
        newStatus: 'late',
        reason: 'Student arrived 10 mins late due to transport delay',
      });
      expect(res.success).toBe(true);
    });

    it('rejects audit reasons that are too brief (<5 chars)', () => {
      const res = ManualAttendanceOverrideSchema.safeParse({
        recordId: '123e4567-e89b-12d3-a456-426614174000',
        newStatus: 'present',
        reason: 'ok',
      });
      expect(res.success).toBe(false);
    });
  });

  describe('sessionService fallback queries', () => {
    it('returns an array for courses query', async () => {
      const courses = await sessionService.getCourses();
      expect(Array.isArray(courses)).toBe(true);
    });

    it('creates a local session with generated OTP and expiration time', async () => {
      const session = await sessionService.createSession({
        courseId: 'c1111111-1111-1111-1111-111111111111',
        courseCode: 'CS301',
        courseName: 'Distributed Computing',
        title: 'Lab 4',
        room: 'Lab 2',
        expirationMinutes: 10,
      });

      expect(session.code).toContain('CS-');
      expect(session.state).toBe('active');
      expect(new Date(session.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });
});
