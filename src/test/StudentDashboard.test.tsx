import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { StudentDashboard } from '@/pages/student/StudentDashboard';
import { sessionService } from '@/services/sessionService';

// Mock AuthContext
vi.mock('@/context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-student-id', email: 'student@mnit.ac.in' },
    profile: {
      id: 'test-student-id',
      email: 'student@mnit.ac.in',
      full_name: 'Alex Rivera',
      institution_id: 'CS-2024-042',
      role: 'student',
      avatar_url: null,
      face_embedding: new Array(128).fill(0.1),
    },
    signOut: vi.fn(),
    updateFaceBiometrics: vi.fn().mockResolvedValue({ error: null }),
    refreshProfile: vi.fn().mockResolvedValue(undefined),
  }),
}));

const mockCourses = [
  {
    courseId: 'c1',
    code: 'CS301',
    name: 'Distributed Computing Systems',
    semester: 'Semester 5',
    academicYear: '2026-2027',
    facultyName: 'Dr. Sarah Jenkins',
    totalSessions: 32,
    attendedSessions: 29,
    attendancePercent: 91,
  },
  {
    courseId: 'c2',
    code: 'MATH240',
    name: 'Applied Linear Algebra & Statistics',
    semester: 'Semester 5',
    academicYear: '2026-2027',
    facultyName: 'Dr. Elena Rostova',
    totalSessions: 30,
    attendedSessions: 21,
    attendancePercent: 70,
  },
];

vi.spyOn(sessionService, 'getStudentCoursesWithStats').mockResolvedValue(mockCourses);
vi.spyOn(sessionService, 'getMyWarnings').mockResolvedValue([]);
vi.spyOn(sessionService, 'getStudentSessionHistory').mockResolvedValue([
  {
    sessionId: 's-1',
    sessionTitle: 'Lecture 12: Distributed Consensus',
    sessionDate: '2026-10-28 10:00 AM',
    status: 'present',
    verifiedAt: '2026-10-28 10:02 AM',
    verificationMethod: 'Biometric Face Match',
  },
]);

describe('StudentDashboard Component', () => {
  it('renders student welcome banner and quorum cards with faculty details', async () => {
    render(
      <BrowserRouter>
        <StudentDashboard />
      </BrowserRouter>
    );

    expect(screen.getByText(/Welcome back, Alex Rivera/i)).toBeInTheDocument();
    expect(screen.getByText(/Roll: CS-2024-042/i)).toBeInTheDocument();
    expect(screen.getByText(/Live Classroom Check-In Terminal/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Verify Face & Check In/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Quick Submit/i })).toBeInTheDocument();

    // Verify course cards render
    await waitFor(() => {
      expect(screen.getByText(/Distributed Computing Systems/i)).toBeInTheDocument();
      expect(screen.getByText(/Dr. Sarah Jenkins/i)).toBeInTheDocument();
      expect(screen.getByText(/MATH240: 70%/i)).toBeInTheDocument();
    });
  });

  it('validates session code input on empty check-in submit', async () => {
    render(
      <BrowserRouter>
        <StudentDashboard />
      </BrowserRouter>
    );

    const submitBtn = screen.getByRole('button', { name: /Verify Face & Check In/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Session code must be at least 4 characters/i)).toBeInTheDocument();
    });
  });

  it('opens Google Classroom join modal when button is clicked', async () => {
    render(
      <BrowserRouter>
        <StudentDashboard />
      </BrowserRouter>
    );

    const joinBtn = screen.getByRole('button', { name: /Join Classroom with Code/i });
    fireEvent.click(joinBtn);

    expect(screen.getByText(/Enter the course join code shared by your professor/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/e.g. A9B4C7D2/i)).toBeInTheDocument();
  });

  it('opens course attendance history modal when Full Log is clicked', async () => {
    render(
      <BrowserRouter>
        <StudentDashboard />
      </BrowserRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Full Log/i).length).toBeGreaterThan(0);
    });

    const fullLogButtons = screen.getAllByText(/Full Log/i);
    fireEvent.click(fullLogButtons[0]!);

    await waitFor(() => {
      expect(screen.getByText(/CS301 — Attendance History/i)).toBeInTheDocument();
      expect(screen.getByText(/Attended Sessions/i)).toBeInTheDocument();
      expect(screen.getByText(/Current Quorum/i)).toBeInTheDocument();
      expect(screen.getByText(/Lecture 12: Distributed Consensus/i)).toBeInTheDocument();
    });
  });
});
