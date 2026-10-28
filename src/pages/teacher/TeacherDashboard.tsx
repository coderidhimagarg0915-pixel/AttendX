import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CreateCourseModal } from '@/components/teacher/CreateCourseModal';
import { sessionService, Course } from '@/services/sessionService';
import { useAuth } from '@/context/AuthContext';
import {
  BookOpen, Users, CalendarDays, Plus, ChevronRight, GraduationCap,
  Search, TrendingDown, Play, RefreshCw, Copy, Check
} from 'lucide-react';

const courseColorPalette = [
  'from-violet-600 to-purple-700',
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-rose-600 to-pink-700',
  'from-amber-500 to-orange-600',
  'from-sky-600 to-cyan-700',
];

export const TeacherDashboard: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadCourses = async () => {
    setIsLoading(true);
    const data = await sessionService.getCourses();
    setCourses(data);
    setIsLoading(false);
  };

  useEffect(() => { loadCourses(); }, []);

  const handleCourseCreated = (course: Course) => {
    setCourses((prev) => [course, ...prev]);
  };

  const handleCopyCode = (e: React.MouseEvent, courseId: string, joinCode: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(joinCode);
    setCopiedId(courseId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const firstName = profile?.full_name?.split(' ')[0] || 'Professor';
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const filtered = courses.filter((c) => {
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.semester.toLowerCase().includes(q);
  });

  const totalStudents = courses.reduce((acc, c) => acc + c.enrolledCount, 0);

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500 font-medium">{greeting},</p>
          <h1 className="text-2xl font-black text-slate-900">{firstName} 👋</h1>
          <p className="text-xs text-slate-400 mt-1">
            {courses.length} course{courses.length !== 1 ? 's' : ''} · {totalStudents} total students enrolled
          </p>
        </div>
        <Button
          variant="primary"
          size="md"
          onClick={() => setIsCreateModalOpen(true)}
          className="gap-2 shadow-lg shrink-0"
        >
          <Plus className="w-4 h-4" />
          Create Course
        </Button>
      </div>

      {/* Summary Stats */}
      {courses.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Courses', value: courses.length, icon: BookOpen, color: 'text-brand-700 bg-brand-50' },
            { label: 'Students', value: totalStudents, icon: Users, color: 'text-emerald-700 bg-emerald-50' },
            { label: 'At Risk (<75%)', value: '—', icon: TrendingDown, color: 'text-amber-700 bg-amber-50', note: 'Click a course to see details' },
          ].map(({ label, value, icon: Icon, color, note }) => (
            <Card key={label} className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xl font-black text-slate-900">{value}</div>
                <div className="text-xs text-slate-500">{label}</div>
                {note && <div className="text-[10px] text-slate-400">{note}</div>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Search bar */}
      {courses.length > 3 && (
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses by name, code, or semester..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400"
          />
        </div>
      )}

      {/* Course Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-52 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-100 to-indigo-100 flex items-center justify-center mb-4">
            <GraduationCap className="w-10 h-10 text-brand-600" />
          </div>
          <h3 className="text-lg font-black text-slate-900">
            {courses.length === 0 ? 'Create your first classroom' : 'No courses match your search'}
          </h3>
          <p className="text-sm text-slate-500 max-w-sm mt-2 mb-6">
            {courses.length === 0
              ? 'Set up a Google Classroom-style course. Students join with a shareable code and you launch attendance sessions inside.'
              : 'Try adjusting your search query.'}
          </p>
          {courses.length === 0 && (
            <Button variant="primary" size="md" onClick={() => setIsCreateModalOpen(true)} className="gap-2 shadow-lg">
              <Plus className="w-4 h-4" />
              Create Your First Course
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((course, idx) => {
            const gradient = courseColorPalette[idx % courseColorPalette.length];
            return (
              <button
                key={course.id}
                onClick={() => navigate(`/teacher/classroom/${course.id}`)}
                className="text-left rounded-2xl overflow-hidden border border-slate-200/80 shadow-card hover:shadow-md transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
              >
                {/* Colorful top header */}
                <div className={`bg-gradient-to-br ${gradient} p-5 relative overflow-hidden`}>
                  {/* Decorative circles */}
                  <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/10" />
                  <div className="absolute -bottom-6 -right-2 w-32 h-32 rounded-full bg-white/10" />

                  <div className="relative">
                    <span className="text-[10px] font-bold tracking-widest text-white/70 uppercase">{course.semester} · {course.academicYear}</span>
                    <div className="flex items-start justify-between mt-1 gap-2">
                      <div>
                        <p className="text-white font-mono font-black text-lg tracking-wider">{course.code}</p>
                        <h3 className="text-white font-bold text-sm leading-snug mt-0.5 line-clamp-2">{course.name}</h3>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Body */}
                <div className="bg-white p-4 space-y-3">
                  {/* Stats row */}
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-semibold">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {course.enrolledCount} students
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                      {course.totalSessions} sessions
                    </span>
                  </div>

                  {/* Join code */}
                  {course.joinCode && (
                    <div className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-dashed border-slate-200">
                      <div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Join Code</p>
                        <span className="font-mono font-black tracking-widest text-slate-800 text-sm">{course.joinCode}</span>
                      </div>
                      <button
                        onClick={(e) => handleCopyCode(e, course.id, course.joinCode!)}
                        className="p-1.5 rounded-lg hover:bg-slate-200 transition-colors text-slate-500"
                        title="Copy join code"
                      >
                        {copiedId === course.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}

                  {/* Open button */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="flex items-center gap-1 text-xs text-brand-600 font-bold group-hover:gap-2 transition-all">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Open Classroom
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-500 group-hover:translate-x-0.5 transition-all" />
                  </div>
                </div>
              </button>
            );
          })}

          {/* Create new card */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="rounded-2xl border-2 border-dashed border-slate-200 p-6 flex flex-col items-center justify-center gap-3 text-slate-400 hover:border-brand-300 hover:text-brand-600 hover:bg-brand-50/30 transition-all min-h-[200px] group focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-brand-100 flex items-center justify-center transition-colors">
              <Plus className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold">New Course</p>
              <p className="text-xs mt-0.5">Create another classroom</p>
            </div>
          </button>
        </div>
      )}

      {/* Refresh button */}
      {courses.length > 0 && (
        <div className="flex justify-center pt-2">
          <button onClick={loadCourses} className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh courses
          </button>
        </div>
      )}

      {/* Create Course Modal */}
      <CreateCourseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCourseCreated={handleCourseCreated}
      />
    </div>
  );
};
