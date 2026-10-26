import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Copy, Check, ExternalLink, RefreshCw, Shield, Sparkles, Wifi } from 'lucide-react';
import type { AttendanceSessionData } from '@/services/sessionService';
import { generateSessionCode } from '@/services/sessionService';

interface SessionQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: AttendanceSessionData | null;
  timeLeftFormatted: string;
  onCodeRotated?: (newCode: string, timestamp: number) => void;
}

const ROTATION_INTERVAL_SECONDS = 15;
const DEFAULT_LAN_IP = '192.168.1.3';

export const SessionQrModal: React.FC<SessionQrModalProps> = ({
  isOpen,
  onClose,
  session,
  timeLeftFormatted,
  onCodeRotated,
}) => {
  const [copied, setCopied] = useState(false);
  const [currentOtp, setCurrentOtp] = useState<string>('');
  const [currentOtpTimestamp, setCurrentOtpTimestamp] = useState<number>(Date.now());
  const [secondsUntilRotation, setSecondsUntilRotation] = useState(ROTATION_INTERVAL_SECONDS);

  // If accessed via localhost, default to laptop's Wi-Fi LAN IP so phones can connect
  const defaultNetworkHost =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? `http://${DEFAULT_LAN_IP}:5173`
      : typeof window !== 'undefined'
      ? window.location.origin
      : `http://${DEFAULT_LAN_IP}:5173`;

  const [mobileHost, setMobileHost] = useState(defaultNetworkHost);

  // Initialize or update OTP when session loads or modal opens
  useEffect(() => {
    if (session && isOpen) {
      setCurrentOtp(session.code);
      setCurrentOtpTimestamp(Date.now());
      setSecondsUntilRotation(ROTATION_INTERVAL_SECONDS);
      // Ensure mobileHost is using the LAN IP if currently on localhost
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        setMobileHost(`http://${DEFAULT_LAN_IP}:5173`);
      }
    }
  }, [session, isOpen]);

  // Dynamic QR auto-rotation timer (every 15 seconds)
  useEffect(() => {
    if (!isOpen || !session) return;

    const interval = setInterval(() => {
      setSecondsUntilRotation((prev) => {
        if (prev <= 1) {
          // Generate new dynamic token with fresh timestamp
          const freshCode = generateSessionCode(session.courseCode);
          const freshTs = Date.now();
          setCurrentOtp(freshCode);
          setCurrentOtpTimestamp(freshTs);
          onCodeRotated?.(freshCode, freshTs);
          return ROTATION_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, session, onCodeRotated]);

  if (!session) return null;

  // Real mobile check-in URL encoded in the QR code (with 15s cryptographic timestamp)
  const checkinUrl = `${mobileHost}/student?sessionId=${session.id}&code=${currentOtp}&ts=${currentOtpTimestamp}&course=${encodeURIComponent(session.courseCode)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualRotate = () => {
    const freshCode = generateSessionCode(session.courseCode);
    const freshTs = Date.now();
    setCurrentOtp(freshCode);
    setCurrentOtpTimestamp(freshTs);
    setSecondsUntilRotation(ROTATION_INTERVAL_SECONDS);
    onCodeRotated?.(freshCode, freshTs);
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
      <div className="flex flex-col items-center text-center space-y-5 py-2">
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

        {/* Network Target Host Selector (for phones on Wi-Fi vs local) */}
        <div className="flex flex-wrap items-center justify-center gap-2 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200 w-full max-w-lg">
          <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-brand-600" />
            Phone Target:
          </span>
          <button
            type="button"
            onClick={() => setMobileHost(`http://${DEFAULT_LAN_IP}:5173`)}
            className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all ${
              mobileHost.includes(DEFAULT_LAN_IP)
                ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-700'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            📶 Wi-Fi LAN ({DEFAULT_LAN_IP}:5173)
          </button>
          <button
            type="button"
            onClick={() => setMobileHost(window.location.origin)}
            className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all ${
              !mobileHost.includes(DEFAULT_LAN_IP)
                ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-700'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            💻 Localhost
          </button>
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

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
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
              Scan with your phone camera. Both devices must be on the same Wi-Fi network.
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Step 2: Instant Face Match</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Your phone camera will open to verify your face and mark your verified attendance.
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
            Launch student check-in link ({mobileHost}) <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <Button variant="secondary" size="sm" onClick={onClose}>
            Back to Dashboard Monitor
          </Button>
        </div>
      </div>
    </Modal>
  );
};
