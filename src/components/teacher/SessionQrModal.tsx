import React, { useState, useEffect, useRef, useCallback } from 'react';
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
const HOTSPOT_IP = '192.168.137.1';
const ETHERNET_IP = '172.22.45.49';

export const SessionQrModal: React.FC<SessionQrModalProps> = ({
  isOpen,
  onClose,
  session,
  timeLeftFormatted,
  onCodeRotated,
}) => {
  const [copied, setCopied] = useState(false);
  // Use refs for mutable values accessed inside setInterval — prevents closure bugs
  const currentOtpRef = useRef<string>(session?.code || '');
  const currentTimestampRef = useRef<number>(Date.now());
  const onCodeRotatedRef = useRef(onCodeRotated);
  const sessionRef = useRef(session);

  // Always keep refs in sync with latest props without triggering interval re-creation
  useEffect(() => { onCodeRotatedRef.current = onCodeRotated; }, [onCodeRotated]);
  useEffect(() => { sessionRef.current = session; }, [session]);

  // Separate display state from ref (for React rendering)
  const [displayOtp, setDisplayOtp] = useState(session?.code || '');
  const [displayTimestamp, setDisplayTimestamp] = useState(Date.now());
  const [secondsUntilRotation, setSecondsUntilRotation] = useState(ROTATION_INTERVAL_SECONDS);

  const defaultHost = typeof window !== 'undefined'
    ? (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
      ? `http://${HOTSPOT_IP}:5173`
      : window.location.origin)
    : `http://${HOTSPOT_IP}:5173`;

  const [mobileHost, setMobileHost] = useState(defaultHost);
  const [customHostInput, setCustomHostInput] = useState('');
  const [showCustomHost, setShowCustomHost] = useState(false);

  // Initialize when modal opens
  useEffect(() => {
    if (isOpen && session) {
      const code = session.code;
      const ts = Date.now();
      currentOtpRef.current = code;
      currentTimestampRef.current = ts;
      setDisplayOtp(code);
      setDisplayTimestamp(ts);
      setSecondsUntilRotation(ROTATION_INTERVAL_SECONDS);
    }
  }, [isOpen, session?.id]); // only react to session id change, not code (avoids loop)

  // Auto-rotation interval — uses refs so it NEVER needs to be recreated on each render
  useEffect(() => {
    if (!isOpen || !session) return;

    const interval = setInterval(() => {
      setSecondsUntilRotation((prev) => {
        if (prev <= 1) {
          const currentSession = sessionRef.current;
          if (!currentSession) return ROTATION_INTERVAL_SECONDS;

          const freshCode = generateSessionCode(currentSession.courseCode);
          const freshTs = Date.now();

          currentOtpRef.current = freshCode;
          currentTimestampRef.current = freshTs;
          setDisplayOtp(freshCode);
          setDisplayTimestamp(freshTs);
          onCodeRotatedRef.current?.(freshCode, freshTs);
          return ROTATION_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, session?.id]); // only restart if session changes identity

  if (!session) return null;

  const checkinUrl = `${mobileHost}/student?sessionId=${session.id}&code=${displayOtp}&ts=${displayTimestamp}&course=${encodeURIComponent(session.courseCode)}`;
  const progressPercent = ((ROTATION_INTERVAL_SECONDS - secondsUntilRotation) / ROTATION_INTERVAL_SECONDS) * 100;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayOtp);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleManualRotate = useCallback(() => {
    const s = sessionRef.current;
    if (!s) return;
    const freshCode = generateSessionCode(s.courseCode);
    const freshTs = Date.now();
    currentOtpRef.current = freshCode;
    currentTimestampRef.current = freshTs;
    setDisplayOtp(freshCode);
    setDisplayTimestamp(freshTs);
    setSecondsUntilRotation(ROTATION_INTERVAL_SECONDS);
    onCodeRotatedRef.current?.(freshCode, freshTs);
  }, []);

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
            <span>{session.room || 'Classroom'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">{session.title}</h2>
        </div>

        {/* Network Target Host Selector */}
        <div className="flex flex-col items-center gap-2 text-xs bg-slate-50 p-3 rounded-2xl border border-slate-200 w-full max-w-xl">
          <div className="flex flex-wrap items-center justify-center gap-2 w-full">
            <span className="text-[11px] font-bold text-slate-500 uppercase flex items-center gap-1">
              <Wifi className="w-3.5 h-3.5 text-brand-600" />
              Phone Target:
            </span>
            <button
              type="button"
              onClick={() => { setMobileHost(`http://${HOTSPOT_IP}:5173`); setShowCustomHost(false); }}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all ${
                mobileHost.includes(HOTSPOT_IP)
                  ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              📱 Hotspot ({HOTSPOT_IP})
            </button>
            <button
              type="button"
              onClick={() => { setMobileHost(`http://${ETHERNET_IP}:5173`); setShowCustomHost(false); }}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all ${
                mobileHost.includes(ETHERNET_IP)
                  ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              🌐 Campus LAN ({ETHERNET_IP})
            </button>
            <button
              type="button"
              onClick={() => { setMobileHost(window.location.origin); setShowCustomHost(false); }}
              className={`px-3 py-1 rounded-lg font-mono text-xs font-semibold transition-all ${
                mobileHost === window.location.origin
                  ? 'bg-brand-600 text-white shadow-sm ring-1 ring-brand-700'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              💻 Localhost
            </button>
            <button
              type="button"
              onClick={() => setShowCustomHost(!showCustomHost)}
              className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200"
            >
              ✏️ Custom
            </button>
          </div>

          {showCustomHost && (
            <div className="flex items-center gap-2 w-full max-w-md pt-2 border-t border-slate-200">
              <input
                type="text"
                placeholder="e.g. http://192.168.1.100:5173"
                value={customHostInput}
                onChange={(e) => setCustomHostInput(e.target.value)}
                className="flex-1 px-3 py-1 text-xs rounded-lg border border-slate-300 font-mono"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (customHostInput.trim()) {
                    let h = customHostInput.trim();
                    if (!h.startsWith('http://') && !h.startsWith('https://')) h = `http://${h}`;
                    setMobileHost(h);
                  }
                }}
              >
                Apply
              </Button>
            </div>
          )}

          <p className="text-[11px] text-slate-500 text-center leading-relaxed">
            💡 <strong>Why did mobile take time to open?</strong> Campus Wi-Fi blocks phone-to-laptop connections. Connect your phone to your <strong>PC&apos;s Mobile Hotspot ({HOTSPOT_IP})</strong>, or test directly by clicking <strong>&quot;Open Student Check-In in New Tab&quot;</strong> below!
          </p>
        </div>

        {/* Live Rotating QR Code Showcase */}
        <div className="w-full bg-slate-950 p-6 sm:p-8 rounded-3xl text-white shadow-2xl relative overflow-hidden border border-slate-800 flex flex-col items-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Anti-Proxy Badge & Countdown */}
          <div className="flex items-center justify-between w-full max-w-sm mb-4 text-xs">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded-full">
              <Shield className="w-3.5 h-3.5" />
              Anti-Proxy Active
            </span>
            <span className="text-slate-400 font-mono flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5 text-brand-400" style={{ animation: 'spin 4s linear infinite' }} />
              Rotates in <strong className="text-white ml-1">{secondsUntilRotation}s</strong>
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full max-w-sm h-1.5 bg-slate-800 rounded-full overflow-hidden mb-5">
            <div
              className="h-full bg-gradient-to-r from-brand-500 to-emerald-400 rounded-full"
              style={{
                width: `${100 - progressPercent}%`,
                transition: 'width 1s linear',
              }}
            />
          </div>

          {/* QR Code */}
          <div className="p-4 bg-white rounded-2xl shadow-2xl border-4 border-slate-700/60 inline-block">
            <QRCodeSVG
              value={checkinUrl}
              size={220}
              level="H"
              includeMargin={true}
              className="rounded-lg"
            />
          </div>

          {/* OTP display */}
          <div className="mt-5 text-center">
            <span className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold block mb-1">
              Alternative Check-In OTP
            </span>
            <span className="text-3xl sm:text-4xl font-mono font-black tracking-widest text-emerald-400 select-all">
              {displayOtp}
            </span>
          </div>

          {/* Action Bar */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors border border-white/10"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copied!' : 'Copy Code'}
            </button>

            <button
              onClick={handleManualRotate}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors border border-white/10"
            >
              <RefreshCw className="w-3.5 h-3.5 text-brand-400" />
              Force Rotate
            </button>

            <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-mono font-semibold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30">
              ⏳ Closes: {timeLeftFormatted}
            </span>
          </div>
        </div>

        {/* Student instructions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full text-left text-xs text-slate-600">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <QrCode className="w-4 h-4 text-brand-600" />
              <span>Step 1: Scan Live QR</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Both devices must be on the same Wi-Fi network (use the LAN IP button above).
            </p>
          </div>
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-slate-900">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Step 2: Biometric Face Match</span>
            </div>
            <p className="text-slate-500 leading-relaxed text-[11px]">
              Camera opens on student's phone to verify presence and record attendance.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between w-full pt-3 border-t border-slate-100 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(checkinUrl, '_blank')}
            className="text-xs font-semibold text-brand-700 bg-brand-50 hover:bg-brand-100 border-brand-200 inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            ⚡ Open Student Check-In in New Tab
          </Button>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Back to Monitor
          </Button>
        </div>
      </div>
    </Modal>
  );
};
