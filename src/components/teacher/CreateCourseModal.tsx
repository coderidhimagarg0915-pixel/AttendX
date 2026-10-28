import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { sessionService, Course } from '@/services/sessionService';
import { BookOpen, Hash, Calendar, GraduationCap, AlertCircle, CheckCircle2, Copy, Check, UserPlus, Link } from 'lucide-react';

interface CreateCourseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCourseCreated: (course: Course) => void;
}

export const CreateCourseModal: React.FC<CreateCourseModalProps> = ({ isOpen, onClose, onCourseCreated }) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [semester, setSemester] = useState('Semester 5');
  const [academicYear, setAcademicYear] = useState('2026-2027');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<Course | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code.trim() || !name.trim()) {
      setError('Course code and name are required.');
      return;
    }

    setIsSubmitting(true);
    const newCourse = await sessionService.createCourse({
      code: code.trim().toUpperCase(),
      name: name.trim(),
      semester,
      academicYear,
    });
    setIsSubmitting(false);

    if (!newCourse) {
      setError('Failed to create course. A course with this code may already exist for this semester.');
      return;
    }

    setCreated(newCourse);
    onCourseCreated(newCourse);
  };

  const handleCopyCode = () => {
    if (created?.joinCode) {
      navigator.clipboard.writeText(created.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setCode('');
    setName('');
    setCreated(null);
    setError(null);
    onClose();
  };

  const semesters = ['Semester 1', 'Semester 2', 'Semester 3', 'Semester 4', 'Semester 5', 'Semester 6', 'Semester 7', 'Semester 8'];
  const years = ['2024-2025', '2025-2026', '2026-2027', '2027-2028'];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={created ? 'Course Created!' : 'Create New Classroom'} maxWidth="md">
      {created ? (
        <div className="space-y-5">
          {/* Success state */}
          <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
            <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-emerald-900">{created.code}: {created.name}</p>
              <p className="text-xs text-emerald-700">{created.semester} • {created.academicYear}</p>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
              <Link className="w-4 h-4 text-brand-600" />
              Student Join Code
            </p>
            <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border-2 border-dashed border-brand-300">
              <span className="font-mono text-2xl font-black tracking-widest text-brand-700 flex-1 text-center">
                {created.joinCode}
              </span>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg hover:bg-brand-50 text-brand-600 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2 text-center">
              Share this code with students. They enter it in the Student Portal to join this classroom.
            </p>
          </div>

          <Button variant="primary" className="w-full" onClick={handleClose}>
            Open Classroom
          </Button>
        </div>
      ) : (
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                <Hash className="w-3.5 h-3.5 inline mr-1" />Course Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. CS301"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono font-bold uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-brand-500"
                maxLength={10}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                <Calendar className="w-3.5 h-3.5 inline mr-1" />Semester
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {semesters.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              <BookOpen className="w-3.5 h-3.5 inline mr-1" />Course Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Distributed Computing Systems"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">
              <GraduationCap className="w-3.5 h-3.5 inline mr-1" />Academic Year
            </label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {years.map((y) => <option key={y}>{y}</option>)}
            </select>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg p-3">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="flex-1 gap-2" isLoading={isSubmitting}>
              <UserPlus className="w-4 h-4" />
              Create Classroom
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
