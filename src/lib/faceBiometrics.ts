import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Loads face detection, landmarks, and recognition models from /models
 */
export async function loadFaceDetectionModels(): Promise<void> {
  if (modelsLoaded) return;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const MODEL_URL = '/models';
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
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
}

/**
 * Analyzes video element frame to find single centered face & extract 128-d descriptor
 */
export async function detectSingleFaceDescriptor(
  videoElement: HTMLVideoElement
): Promise<FaceScanResult> {
  if (!modelsLoaded) {
    await loadFaceDetectionModels();
  }

  const detection = await faceapi
    .detectSingleFace(
      videoElement,
      new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
    )
    .withFaceLandmarks(true)
    .withFaceDescriptor();

  if (!detection) {
    return {
      detected: false,
      message: 'No face detected. Look directly into the camera.',
    };
  }

  const { box } = detection.detection;
  const videoWidth = videoElement.videoWidth || 640;
  const videoHeight = videoElement.videoHeight || 480;

  // Basic check: face should be reasonably centered and large enough
  const boxArea = box.width * box.height;
  const frameArea = videoWidth * videoHeight;
  const coverage = boxArea / frameArea;

  if (coverage < 0.05) {
    return {
      detected: false,
      message: 'Please move closer to the camera.',
    };
  }

  if (coverage > 0.65) {
    return {
      detected: false,
      message: 'Please move slightly back from the camera.',
    };
  }

  // Convert Float32Array (128 elements) to standard number array for JSON storage
  const descriptorArray = Array.from(detection.descriptor);

  return {
    detected: true,
    message: 'Face aligned! Hold still to capture.',
    descriptor: descriptorArray,
  };
}

/**
 * Calculates Euclidean distance between two face descriptors.
 * Typically distance < 0.45 or 0.5 indicates a valid match.
 */
export function calculateFaceMatchDistance(
  descriptor1: number[],
  descriptor2: number[]
): number {
  if (descriptor1.length !== descriptor2.length) {
    throw new Error('Face descriptors must have matching dimensions');
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
    }, 'image/jpeg', 0.82);
  });
}
