import { z } from 'zod';

export const StudentCheckInSchema = z.object({
  sessionCode: z
    .string()
    .trim()
    .min(4, 'Session code must be at least 4 characters')
    .max(12, 'Session code cannot exceed 12 characters')
    .regex(/^[A-Z0-9-]+$/i, 'Session code must be alphanumeric (letters, numbers, hyphens)'),
  sessionId: z.string().uuid('Invalid session reference').optional(),
  studentNotes: z.string().max(200, 'Notes cannot exceed 200 characters').optional(),
});

export type StudentCheckInInput = z.infer<typeof StudentCheckInSchema>;

export const CreateSessionSchema = z.object({
  courseId: z.string().uuid('Valid course must be selected'),
  title: z
    .string()
    .trim()
    .min(3, 'Session title must be at least 3 characters')
    .max(80, 'Session title cannot exceed 80 characters'),
  expirationMinutes: z
    .number()
    .int()
    .min(1, 'Minimum expiration is 1 minute')
    .max(180, 'Maximum expiration is 180 minutes')
    .default(15),
  requirePasscode: z.boolean().default(true),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

export const ManualAttendanceOverrideSchema = z.object({
  recordId: z.string().uuid('Invalid attendance record ID'),
  newStatus: z.enum(['present', 'absent', 'late', 'excused']),
  reason: z.string().min(5, 'Reason must be provided for audit purposes').max(200),
});

export type ManualAttendanceOverrideInput = z.infer<typeof ManualAttendanceOverrideSchema>;

export const MNIT_EMAIL_DOMAIN = '@mnit.ac.in';

export const MnitEmailSchema = z
  .string()
  .trim()
  .email('Please enter a valid email address')
  .refine(
    (email) => email.toLowerCase().endsWith(MNIT_EMAIL_DOMAIN),
    'Access restricted: You must use an official @mnit.ac.in email ID'
  );

