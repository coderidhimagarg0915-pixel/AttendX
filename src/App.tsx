import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { GoogleRoleSetupPage } from './pages/GoogleRoleSetupPage';
import { TeacherLayout } from './layouts/TeacherLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Main Portal Selection Landing */}
          <Route path="/" element={<LandingPage />} />

          {/* Centralized Authentication Page */}
          <Route path="/login" element={<LoginPage />} />

          {/* Email / OAuth callback handler (Supabase redirects here) */}
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          {/* Role selection for first-time Google OAuth users */}
          <Route path="/auth/role-setup" element={<GoogleRoleSetupPage />} />

          {/* Teacher / Faculty Dashboard Routes (Protected) */}
          <Route
            path="/teacher"
            element={
              <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                <TeacherLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<TeacherDashboard />} />
            <Route path="sessions" element={<TeacherDashboard />} />
            <Route path="roster" element={<TeacherDashboard />} />
            <Route path="reports" element={<TeacherDashboard />} />
            <Route path="settings" element={<TeacherDashboard />} />
          </Route>

          {/* Student Dashboard Routes (Protected) */}
          <Route
            path="/student"
            element={
              <ProtectedRoute allowedRoles={['student', 'admin']}>
                <StudentLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<StudentDashboard />} />
            <Route path="checkin" element={<StudentDashboard />} />
            <Route path="schedule" element={<StudentDashboard />} />
          </Route>

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
