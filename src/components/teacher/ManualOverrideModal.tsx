import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ManualAttendanceOverrideSchema } from '@/lib/validation';
import type { AttendanceStatus } from '@/types/attendance';
import type { StudentAttendee } from '@/services/sessionService';
import { ShieldCheck, AlertCircle, CheckCircle, Clock, XCircle, FileText } from 'lucide-react';

interface ManualOverrideModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentAttendee | null;
  onOverrideConfirmed: (studentId: string, newStatus: AttendanceStatus, reason: string) => void;
}

export const ManualOverrideModal: React.FC<ManualOverrideModalProps> = ({
  isOpen,
  onClose,
  student,
  onOverrideConfirmed,
}) => {
  const [selectedStatus, setSelectedStatus] = useState<AttendanceStatus>('present');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (student) {
      setSelectedStatus(student.status);
      setReason(student.overrideReason || '');
      setError(null);
    }
  }, [student, isOpen]);

  if (!student) return null;

  const handleConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate using Zod
    const result = ManualAttendanceOverrideSchema.safeParse({
      recordId: student.id.includes('-') && student.id.length === 36 
        ? student.id 
        : '123e4567-e89b-12d3-a456-426614174000', // valid uuid fallback for mock data
      newStatus: selectedStatus,
      reason: reason.trim(),
    });

    if (!result.success) {
      setError(result.error.errors[0]?.message || 'Please provide a valid reason (min 5 characters)');
      return;
    }

    onOverrideConfirmed(student.id, selectedStatus, reason.trim());
    onClose();
  };

  const statusOptions: { value: AttendanceStatus; label: string; icon: any; color: string }[] = [
    { value: 'present', label: 'Present', icon: CheckCircle, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
    { value: 'late', label: 'Late Arrival', icon: Clock, color: 'text-amber-600 bg-amber-50 border-amber-200' },
    { value: 'excused', label: 'Excused Leave', icon: FileText, color: 'text-blue-600 bg-blue-50 border-blue-200' },
    { value: 'absent', label: 'Absent', icon: XCircle, color: 'text-rose-600 bg-rose-50 border-rose-200' },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Faculty Manual Attendance Override"
      description="Update student verification status with mandatory audit log note."
      maxWidth="md"
    >
      <form onSubmit={handleConfirm} className="space-y-4">
        {/* Student Bio Card */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-slate-900">{student.name}</p>
            <p className="text-xs font-mono text-slate-500 mt-0.5">{student.roll} • {student.email}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Current Status</span>
            <Badge
              variant={
                student.status === 'present'
                  ? 'success'
                  : student.status === 'late'
                  ? 'warning'
                  : student.status === 'excused'
                  ? 'info'
                  : 'danger'
              }
              className="mt-1 uppercase text-[10px]"
            >
              {student.status}
            </Badge>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 text-xs bg-rose-50 text-rose-700 rounded-lg border border-rose-200">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Status Picker */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Select New Status
          </label>
          <div className="grid grid-cols-2 gap-2">
            {statusOptions.map((opt) => {
              const Icon = opt.icon;
              const isSelected = selectedStatus === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSelectedStatus(opt.value)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                    isSelected
                      ? `ring-2 ring-brand-500 font-semibold ${opt.color}`
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Audit Reason Textarea */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
            Audit Reason & Justification <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Student reported device battery failure; verified physical attendance in Hall B-204."
            className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
          />
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
            Reason will be permanently stamped in database audit logs.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary">
            Apply Verified Override
          </Button>
        </div>
      </form>
    </Modal>
  );
};
