import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, ExternalLink, RefreshCw, Shield, Sparkles } from 'lucide-react';
import type { AttendanceSessionData } from '@/services/sessionService';
import { generateSessionCode } from '@/services/sessionService';

interface SessionQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AttendanceSessionData | null;
  timeLeftFormatted: string;
}

const ROTATION_INTERVAL_SECONDS = 15;

export const SessionQrModal: React.FC<SessionQrModalProps> = ({
  isOpen,
  onClose,
  session,
  timeLeftFormatted,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentOtp, setCurrentOtp] = useState<string>('');
  const [secondsUntilRotation, setSecondsUntilRotation] = useState(ROTATION_INTERVAL_SECONDS);

  // Initialize or update OTP when session loads or modal opens
  useEffect(() => {
    if (session && isOpen) {
      setCurrentOtp(session.code);
      setSecondsUntilRotation(ROTATION_INTERVAL_SECONDS);
    }
  }, [session, isOpen]);

  // Dynamic QR auto-rotation timer (every 15 seconds)
  useEffect(() => {
    if (!isOpen || !session) return;

    const interval = setInterval(() => {
      setSecondsUntilRotation((prev) => {
        if (prev <= 1) {
          // Generate new dynamic token
          const freshCode = generateSessionCode(session.courseCode);
          setCurrentOtp(freshCode);
          return ROTATION_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, session]);

  if (!session) return null;

  // Real mobile check-in URL encoded in the QR code
  const checkinUrl = `${window.location.origin}/student?sessionId=${session.id}&code=${currentOtp}&course=${encodeURIComponent(session.courseCode)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualRotate = () => {
    const freshCode = generateSessionCode(session.courseCode);
    setCurrentOtp(freshCode);
    setSecondsUntilRotation(ROTATION_INTERVAL_SECONDS);
  };

  const progressPercent = ((ROTATION_INTERVAL_SECONDS - secondsUntilRotation) / ROTATION_INTERVAL_SECONDS) * 100;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Classroom Projector: Dynamic Rotating QR"
      description="Students scan this live QR with their mobile camera to launch face verification check-in."
      maxWidth="xl"
    >
      <div className="flex flex-col items-center text-center space-y-6 py-2">
        {/* Course & Session Info */}
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-bold tracking-widest text-brand-700 uppercase bg-brand-50 px-3.5 py-1 rounded-full border border-brand-200">
            <span>{session.courseCode}</span>
            <span>•</span>
            <span>{session.room}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
            {session.title}
          </h2>
        </div>

        {/* Live Rotating QR Code Showcase */}
        <div className="w-full bg-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-slate-800 flex flex-col items-center">
          {/* Ambient background glows */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Anti-Proxy Badge & Rotation countdown */}
          <div className="flex items-center justify-between w-full max-w-sm mb-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
              <Shield className="w-3.5 h-3.5" />
              Anti-Proxy Active
            </span>
            <span className="text-slate-400 font-mono flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-brand-400" style={{ animationDuration: '4s' }} />
              Rotates in <strong className="text-white">{secondsUntilRotation}s</strong>
            </span>
          </div>

          {/* Progress bar showing rotation cycle */}
          <div className="w-full max-w-sm h-1.5 bg-slate-800 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${100 - progressPercent}%` }}
            />
          </div>

          {/* REAL SCANNABLE QR CODE */}
          <div className="p-4 bg-white rounded-2xl shadow-2xl border-4 border-slate-700/60 inline-block transition-transform transform hover:scale-[1.02]">
            <QRCodeSVG
              value={checkinUrl}
              size={220}
              level="H"
              includeMargin={true}
              className="rounded-lg"
            />
          </div>

          {/* Dynamic OTP Code display */}
          <div className="mt-5 text-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold block mb-1">
              Alternative 6-Digit Check-In OTP
            </span>
            <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-emerald-400 select-all">
              {currentOtp}
            </span>
          </div>

          {/* Action Bar */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors border border-white/10"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Code Copied!' : 'Copy Code'}
            </button>

            <button
              onClick={handleManualRotate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand-400" />
              Force Rotate QR
            </button>

            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ⏳ Session Closes: {timeLeftFormatted}
            </span>
          </div>
        </div>

        {/* Instructions for Students */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left text-xs text-slate-600">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <QrCode className="w-4 h-4 text-brand-600" />
              <span>Step 1: Scan Live QR</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Open phone camera or scanner to read this rotating QR code. The token expires every 15 seconds to prevent sharing.
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Step 2: Instant Face Match</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              The student's camera activates for biometric face alignment before marking verified attendance in PostgreSQL.
            </p>
          </div>
        </div>

        {/* Test Direct Link & Close */}
        <div className="flex items-center justify-between w-full pt-2 border-t border-slate-100">
          <a
            href={checkinUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-brand-600 hover:text-brand-800 inline-flex items-center gap-1"
          >
            Launch student camera test window <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <Button variant="secondary" size="sm" onClick={onClose}>
            Back to Dashboard Monitor
          </Button>
        </div>
      </div>
    </Modal>
  );
};
