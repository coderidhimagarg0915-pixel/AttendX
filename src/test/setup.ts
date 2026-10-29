import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock face-api for jsdom node test environment
vi.mock('@vladmandic/face-api', () => ({
  nets: {
    tinyFaceDetector: { loadFromUri: vi.fn().mockResolvedValue(true) },
    faceLandmark68Net: { loadFromUri: vi.fn().mockResolvedValue(true) },
    faceLandmark68TinyNet: { loadFromUri: vi.fn().mockResolvedValue(true) },
    faceRecognitionNet: { loadFromUri: vi.fn().mockResolvedValue(true) },
  },
  TinyFaceDetectorOptions: vi.fn(),
  detectAllFaces: vi.fn().mockReturnValue({
    withFaceLandmarks: vi.fn().mockReturnValue({
      withFaceDescriptors: vi.fn().mockResolvedValue([
        {
          detection: { box: { width: 100, height: 100 } },
          descriptor: new Float32Array(128).fill(0.1),
        },
      ]),
    }),
  }),
  detectSingleFace: vi.fn().mockReturnValue({
    withFaceLandmarks: vi.fn().mockReturnValue({
      withFaceDescriptor: vi.fn().mockResolvedValue({
        detection: { box: { width: 100, height: 100 } },
        descriptor: new Float32Array(128).fill(0.1),
      }),
    }),
  }),
}));

// Mock mediaDevices for jsdom
if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'mediaDevices', {
    writable: true,
    value: {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: () => [{ stop: vi.fn() }],
      }),
    },
  });
}
