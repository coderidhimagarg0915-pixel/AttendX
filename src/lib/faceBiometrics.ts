import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Calibrated distance threshold for 128-d L2-normalized FaceRecognitionNet embeddings.
 * Euclidean distance < 0.60 is the official dlib / face-api benchmark for same-person verification.
 * Same person across mobile vs webcam typically ranges 0.35 - 0.58.
 * Different persons consistently score >= 0.68 (average 0.75 - 0.95).
 */
export const STRICT_MATCH_THRESHOLD = 0.60;

/**
 * Loads face detection, high-resolution landmarks, and recognition models from /models
 */
export async function loadFaceDetectionModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const MODEL_URL = '/models';
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
    } catch (err) {
      console.error('[FaceService] Failed to load face recognition models:', err);
      loadPromise = null;
      throw new Error('Could not load facial recognition neural networks.');
    }
  })();

  return loadPromise;
}

export interface FaceScanResult {
  detected: boolean;
  message: string;
  descriptor?: number[];
  alignedFaceCanvas?: HTMLCanvasElement;
  multipleFaces?: boolean;
}

export type FaceInputMedia = HTMLVideoElement | HTMLImageElement | HTMLCanvasElement;

/**
 * Analyzes video or image frame to find a single centered face and extract 128-d descriptor.
 * Rejects frames with multiple faces (anti-proxy protection) or no faces.
 */
export async function detectSingleFaceDescriptor(
  input: FaceInputMedia
): Promise<FaceScanResult> {
  if (!modelsLoaded) {
    await loadFaceDetectionModels();
  }

  // Detect ALL faces to prevent proxy spoofing (e.g. holding a photo while student is present)
  let detections: any[];
  try {
    detections = await faceapi
      .detectAllFaces(
        input,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.4 })
      )
      .withFaceLandmarks(false)
      .withFaceDescriptors();
  } catch {
    // Fallback with tiny landmarks if standard landmark net encounters format issues
    try {
      detections = await faceapi
        .detectAllFaces(
          input,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 })
        )
        .withFaceLandmarks(true)
        .withFaceDescriptors();
    } catch (err) {
      console.error('[FaceBiometrics] Face detection error:', err);
      return {
        detected: false,
        message: 'Could not process video frame. Ensure camera is unobstructed.',
      };
    }
  }

  if (!detections || detections.length === 0) {
    return {
      detected: false,
      message: 'No face detected. Please look directly into the camera.',
    };
  }

  // Anti-proxy check: Reject if multiple individuals are detected in camera frame
  if (detections.length > 1) {
    return {
      detected: false,
      message: 'Multiple faces detected! Only the enrolled student must be in view.',
      multipleFaces: true,
    };
  }

  const detection = detections[0];
  const { box } = detection.detection;

  // Retrieve proper element dimensions across video, image, or canvas
  let inputWidth = 640;
  let inputHeight = 480;

  if (typeof HTMLVideoElement !== 'undefined' && input instanceof HTMLVideoElement) {
    inputWidth = input.videoWidth || 640;
    inputHeight = input.videoHeight || 480;
  } else if (typeof HTMLImageElement !== 'undefined' && input instanceof HTMLImageElement) {
    inputWidth = input.naturalWidth || input.width || 640;
    inputHeight = input.naturalHeight || input.height || 480;
  } else if (typeof HTMLCanvasElement !== 'undefined' && input instanceof HTMLCanvasElement) {
    inputWidth = input.width || 640;
    inputHeight = input.height || 480;
  }

  // Check face coverage inside frame (balanced for mobile and desktop)
  const boxArea = box.width * box.height;
  const frameArea = inputWidth * inputHeight;
  const coverage = boxArea / frameArea;

  if (coverage < 0.02) {
    return {
      detected: false,
      message: 'Face is too far away. Please move closer to the camera.',
    };
  }

  if (coverage > 0.90) {
    return {
      detected: false,
      message: 'Face is too close. Please move slightly back from the camera.',
    };
  }

  // Convert Float32Array (128 elements) to standard number array for storage & JSON serialization
  const descriptorArray = Array.from(detection.descriptor) as number[];

  return {
    detected: true,
    message: 'Face aligned! Hold still to complete biometric check.',
    descriptor: descriptorArray,
  };
}

/**
 * Calculates Euclidean distance between two 128-d face descriptors.
 * In face-api / dlib: distance < 0.60 indicates a valid biometric match.
 */
export function calculateFaceMatchDistance(
  descriptor1: number[],
  descriptor2: number[]
): number {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
    throw new Error('Face descriptors must have matching 128 dimensions');
  }
  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    const val1 = descriptor1[i] ?? 0;
    const val2 = descriptor2[i] ?? 0;
    const diff = val1 - val2;
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Computes calibrated match similarity percentage from Euclidean distance.
 * Returns 72% - 100% for valid biometric matches (< STRICT_MATCH_THRESHOLD).
 * Drops sharply towards 0% for mismatches (>= STRICT_MATCH_THRESHOLD).
 */
export function computeMatchSimilarity(
  distance: number,
  threshold = STRICT_MATCH_THRESHOLD
): number {
  if (distance <= 0) return 100;
  if (distance <= threshold) {
    // 0 to threshold maps to 100% -> 72%
    return Math.round(100 - (distance / threshold) * 28);
  }
  // Above threshold drops rapidly from 72% down to 0% at distance >= 0.82
  const drop = ((distance - threshold) / (0.82 - threshold)) * 72;
  return Math.max(0, Math.round(72 - drop));
}

/**
 * Captures image from video stream as a JPEG Blob
 */
export function captureVideoSnapshotBlob(videoElement: HTMLVideoElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    const rawW = videoElement.videoWidth || 640;
    const rawH = videoElement.videoHeight || 480;

    // Crop center square for a clean portrait avatar
    const minDim = Math.min(rawW, rawH);
    const startX = (rawW - minDim) / 2;
    const startY = (rawH - minDim) / 2;

    const targetSize = 320;
    const canvas = document.createElement('canvas');
    canvas.width = targetSize;
    canvas.height = targetSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      resolve(null);
      return;
    }
    // Flip horizontally so the captured photo matches the mirror webcam preview
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoElement, startX, startY, minDim, minDim, 0, 0, targetSize, targetSize);

    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.85);
  });
}
