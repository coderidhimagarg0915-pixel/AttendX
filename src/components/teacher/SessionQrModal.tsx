import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { QrCode, Copy, Check, Sparkles, ExternalLink } from 'lucide-react';
import type { AttendanceSessionData } from '@/services/sessionService';

interface SessionQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AttendanceSessionData | null;
  timeLeftFormatted: string;
}

export const SessionQrModal: React.FC<SessionQrModalProps> = ({
  isOpen,
  onClose,
  session,
  timeLeftFormatted,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!session) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(session.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Check-in URL for direct mobile scanning
  const checkinUrl = `${window.location.origin}/student?code=${session.code}`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Classroom Projector Presentation"
      description="Display this screen on your classroom projector for instant student check-in."
      maxWidth="lg"
    >
      <div className="flex flex-col items-center text-center space-y-6 py-2">
        {/* Course Header */}
        <div>
          <span className="text-xs font-bold tracking-widest text-brand-600 uppercase bg-brand-50 px-3 py-1 rounded-full border border-brand-200">
            {session.courseCode} • {session.room}
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            {session.title}
          </h2>
        </div>

        {/* Dynamic Projector Code Display */}
        <div className="w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800">
          {/* Subtle background glow */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">
            Dynamic Student Check-In Code
          </p>

          <div className="text-4xl sm:text-6xl font-mono font-black tracking-widest text-emerald-400 drop-shadow-[0_2px_10px_rgba(52,211,153,0.3)] select-all my-2">
            {session.code}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors backdrop-blur-sm"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Code Copied!' : 'Copy Code'}
            </button>

            <span className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ⏳ {timeLeftFormatted} Remaining
            </span>
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 w-full text-left">
          <div className="w-32 h-32 bg-white p-2 rounded-xl shadow-inner border border-slate-200 flex flex-col items-center justify-center relative shrink-0">
            {/* High visual stylized QR placeholder */}
            <div className="grid grid-cols-4 gap-1 w-full h-full p-1 bg-slate-900 rounded-lg">
              <div className="bg-white rounded-sm col-span-2 row-span-2 p-1 flex items-center justify-center">
                <div className="w-3 h-3 bg-slate-900 rounded-xs" />
              </div>
              <div className="bg-white rounded-sm col-span-2" />
              <div className="bg-white rounded-sm" />
              <div className="bg-white rounded-sm" />
              <div className="bg-white rounded-sm col-span-2 row-span-2 p-1 flex items-center justify-center">
                <div className="w-3 h-3 bg-slate-900 rounded-xs" />
              </div>
              <div className="bg-white rounded-sm" />
              <div className="bg-white rounded-sm" />
            </div>
            <span className="text-[9px] font-mono font-bold text-slate-600 mt-1">Scan with Phone</span>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <QrCode className="w-4 h-4 text-brand-600" />
              Instant Mobile Camera Check-In
            </h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Students can point their mobile camera at this screen to launch the AttendX verification terminal with this code pre-filled.
            </p>
            <div className="pt-1">
              <a
                href={checkinUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
              >
                Test student check-in link <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="w-full pt-2">
          <Button variant="secondary" className="w-full" onClick={onClose}>
            Back to Dashboard Monitor
          </Button>
        </div>
      </div>
    </Modal>
  );
};
