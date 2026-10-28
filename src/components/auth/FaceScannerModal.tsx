import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  loadFaceDetectionModels,
  detectSingleFaceDescriptor,
  captureVideoSnapshotBlob,
} from '@/lib/faceBiometrics';
import { Camera, RefreshCw, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface FaceScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFaceCaptured: (data: { descriptor: number[]; imageBlob: Blob; previewUrl: string }) => void;
}

export const FaceScannerModal: React.FC<FaceScannerModalProps> = ({
  isOpen,
  onClose,
  onFaceCaptured,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [isLoadingModels, setIsLoadingModels] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [detectionStatus, setDetectionStatus] = useState<string>('Initializing camera & neural models…');
  const [isFaceAligned, setIsFaceAligned] = useState<boolean>(false);
  const [currentDescriptor, setCurrentDescriptor] = useState<number[] | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Stop video stream helper
  const stopStream = useCallback(() => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Initialize camera and face-api models
  const startCameraAndDetection = useCallback(async () => {
    setIsLoadingModels(true);
    setCameraError(null);
    setDetectionStatus('Loading AI Face Biometrics models…');
    setIsFaceAligned(false);
    setCurrentDescriptor(null);

    try {
      await loadFaceDetectionModels();
      setIsLoadingModels(false);
      setDetectionStatus('Requesting webcam access…');

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setDetectionStatus('Position your face inside the oval guide');

      // Detection loop
      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

        try {
          const result = await detectSingleFaceDescriptor(videoRef.current);
          setDetectionStatus(result.message);
          setIsFaceAligned(result.detected);
          if (result.detected && result.descriptor) {
            setCurrentDescriptor(result.descriptor);
          } else {
            setCurrentDescriptor(null);
          }
        } catch (scanErr) {
          console.warn('[FaceScanLoop] Frame detection error:', scanErr);
        }
      }, 350);
    } catch (err: unknown) {
      setIsLoadingModels(false);
      const errorMessage =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'Camera permission was denied. Please allow camera access in your browser settings.'
          : 'Could not initialize camera or face models. Please ensure your webcam is connected.';
      setCameraError(errorMessage);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      startCameraAndDetection();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isOpen, startCameraAndDetection, stopStream]);

  const handleCapture = async () => {
    if (!videoRef.current || !currentDescriptor || !isFaceAligned) return;

    setIsCapturing(true);
    try {
      const blob = await captureVideoSnapshotBlob(videoRef.current);
      if (!blob) {
        setCameraError('Failed to capture image snapshot. Please try again.');
        setIsCapturing(false);
        return;
      }

      const previewUrl = URL.createObjectURL(blob);
      stopStream();
      onFaceCaptured({
        descriptor: currentDescriptor,
        imageBlob: blob,
        previewUrl,
      });
      onClose();
    } catch (err) {
      console.error('[FaceScannerModal] Capture error:', err);
      setCameraError('Error saving face enrollment. Please retry.');
    } finally {
      setIsCapturing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Live Face Biometrics Registration</h3>
              <p className="text-[11px] text-slate-500">Tamper-proof baseline for attendance check-ins</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-slate-950 aspect-[4/3] flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            muted
            playsInline
            className="w-full h-full object-cover transform scale-x-[-1]"
          />

          {/* Oval Alignment Guide Overlay */}
          {!cameraError && !isLoadingModels && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className={`w-48 h-64 sm:w-56 sm:h-72 rounded-[50%] border-2 transition-all duration-300 ${
                  isFaceAligned
                    ? 'border-emerald-400 shadow-[0_0_20px_rgba(52,211,153,0.5)] bg-emerald-500/10'
                    : 'border-white/60 border-dashed bg-black/10'
                }`}
              />
            </div>
          )}

          {/* Loading or Error Overlays */}
          {isLoadingModels && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white p-6 text-center">
              <RefreshCw className="w-8 h-8 text-brand-400 animate-spin mb-3" />
              <p className="text-xs font-semibold">{detectionStatus}</p>
              <p className="text-[11px] text-slate-400 mt-1">Initializing on-device neural biometric pipeline…</p>
            </div>
          )}

          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/95 text-white p-6 text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mb-3" />
              <p className="text-sm font-semibold text-rose-400">{cameraError}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={startCameraAndDetection}
                className="mt-4 border-slate-700 text-slate-200 hover:bg-slate-800"
              >
                Retry Camera
              </Button>
            </div>
          )}

          {/* Status Chip */}
          {!cameraError && !isLoadingModels && (
            <div className="absolute bottom-3 inset-x-4 flex justify-center">
              <div
                className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 backdrop-blur-md transition-colors ${
                  isFaceAligned
                    ? 'bg-emerald-500/90 text-white shadow-lg shadow-emerald-900/50'
                    : 'bg-slate-900/80 text-slate-200 border border-white/20'
                }`}
              >
                {isFaceAligned ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-white shrink-0" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5 text-brand-400 animate-spin shrink-0" />
                )}
                <span>{detectionStatus}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Biometric embeddings are encrypted & stored safely.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="primary"
              size="sm"
              disabled={!isFaceAligned || !currentDescriptor || isCapturing}
              isLoading={isCapturing}
              onClick={handleCapture}
              className={`flex-1 sm:flex-initial gap-1.5 ${
                isFaceAligned ? 'bg-emerald-600 hover:bg-emerald-700' : ''
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Capture Face</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

