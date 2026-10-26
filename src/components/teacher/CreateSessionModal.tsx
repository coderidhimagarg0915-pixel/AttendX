import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { CreateSessionSchema } from '@/lib/validation';
import { sessionService, Course } from '@/services/sessionService';
import { Clock, BookOpen, MapPin, Sparkles, AlertCircle } from 'lucide-react';

interface CreateSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSessionCreated: (session: any) => void;
}

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  isOpen,
  onClose,
  onSessionCreated,
}) => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');
  const [title, setTitle] = useState('');
  const [room, setRoom] = useState('Hall B-204');
  const [expirationMinutes, setExpirationMinutes] = useState<number>(15);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (isOpen) {
      sessionService.getCourses().then((list) => {
        setCourses(list);
        if (list.length > 0 && !selectedCourseId) {
          setSelectedCourseId(list[0].id);
        }
      });
      setErrors({});
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // 1. Zod Validation
    const validationResult = CreateSessionSchema.safeParse({
      courseId: selectedCourseId,
      title,
      expirationMinutes,
      requirePasscode: true,
    });

    if (!validationResult.success) {
      const fieldErrors: { [key: string]: string } = {};
      validationResult.error.errors.forEach((err) => {
        if (err.path[0]) {
          fieldErrors[err.path[0].toString()] = err.message;
        }
      });
      setErrors(fieldErrors);
      return;
    }

    // 2. Locate course details
    const course = courses.find((c) => c.id === selectedCourseId) || courses[0];

    try {
      setIsSubmitting(true);
      const newSession = await sessionService.createSession({
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        title: title.trim(),
        room: room.trim() || 'Hall B-204',
        expirationMinutes,
      });

      onSessionCreated(newSession);
      onClose();
    } catch (err: any) {
      setErrors({ form: err?.message || 'Failed to initialize attendance session' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Launch New Attendance Session"
      description="Create a live attendance verification window with dynamic OTP rotation."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        {/* Course Selection */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Select Course & Cohort
          </label>
          <div className="relative">
            <BookOpen className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 font-medium text-slate-800"
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code} — {c.name} ({c.enrolledCount} enrolled)
                </option>
              ))}
            </select>
          </div>
          {errors.courseId && (
            <p className="text-xs text-rose-600 mt-1">{errors.courseId}</p>
          )}
        </div>

        {/* Session Topic / Title */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Lecture Topic / Session Title
          </label>
          <input
            type="text"
            placeholder="e.g. Lecture 12: Byzantine Fault Tolerance & Raft"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {errors.title && (
            <p className="text-xs text-rose-600 mt-1">{errors.title}</p>
          )}
        </div>

        {/* Room / Location */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Classroom / Room Location
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="e.g. Hall B-204 or Lab 3"
              value={room}
              onChange={(e) => setRoom(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Expiration Duration */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Attendance Window Duration
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 15, 30].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setExpirationMinutes(mins)}
                className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all flex items-center justify-center gap-1.5 ${
                  expirationMinutes === mins
                    ? 'border-brand-600 bg-brand-50 text-brand-700 ring-2 ring-brand-500/20 shadow-sm'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {mins} Mins
              </button>
            ))}
          </div>
          {errors.expirationMinutes && (
            <p className="text-xs text-rose-600 mt-1">{errors.expirationMinutes}</p>
          )}
        </div>

        {/* Security Policy Preview Card */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-1.5 text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-semibold text-slate-800">
            <Sparkles className="w-3.5 h-3.5 text-brand-600" />
            <span>Anti-Proxy Protection Protocol</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Generates a high-entropy check-in code prefixed by{' '}
            <span className="font-mono font-bold text-brand-700">{selectedCourse?.code || 'ATT'}</span>. 
            Students must be enrolled in the course and within the active window to record attendance.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            Start Attendance Window
          </Button>
        </div>
      </form>
    </Modal>
  );
};
