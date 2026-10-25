import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TeacherLayout } from './layouts/TeacherLayout';
import { StudentLayout } from './layouts/StudentLayout';
import { LandingPage } from './pages/LandingPage';
import { TeacherDashboard } from './pages/teacher/TeacherDashboard';
import { StudentDashboard } from './pages/student/StudentDashboard';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Main Portal Selection Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Teacher / Faculty Dashboard Routes */}
        <Route path="/teacher" element={<TeacherLayout />}>
          <Route index element={<TeacherDashboard />} />
          <Route path="sessions" element={<TeacherDashboard />} />
          <Route path="roster" element={<TeacherDashboard />} />
          <Route path="reports" element={<TeacherDashboard />} />
          <Route path="settings" element={<TeacherDashboard />} />
        </Route>

        {/* Student Dashboard Routes */}
        <Route path="/student" element={<StudentLayout />}>
          <Route index element={<StudentDashboard />} />
          <Route path="checkin" element={<StudentDashboard />} />
          <Route path="schedule" element={<StudentDashboard />} />
        </Route>

        {/* Catch-all fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
