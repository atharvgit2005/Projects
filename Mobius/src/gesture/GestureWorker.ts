import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { GestureClassifier } from './GestureClassifier';

let landmarker: FaceLandmarker | null = null;
const classifier = new GestureClassifier();

self.onmessage = async (event: MessageEvent) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'init') {
    try {
      // 1. Fetch WASM file resolvers from CDN (as requested by NFR-007 context permission boundaries)
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
      );

      // 2. Load the light-weight FaceLandmarker model in the worker thread
      landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU'
        },
        outputFaceBlendshapes: false,
        runningMode: 'VIDEO',
        numFaces: 1
      });

      self.postMessage({ type: 'ready' });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      self.postMessage({ type: 'error', error: message });
    }
  } else if (data.type === 'process') {
    if (!landmarker) {
      if (data.imageBitmap && typeof data.imageBitmap.close === 'function') {
        data.imageBitmap.close();
      }
      return;
    }

    const { imageBitmap, timestamp, calibration } = data;

    try {
      // Detect landmarks on the transferred ImageBitmap
      const detectionResult = landmarker.detectForVideo(imageBitmap, timestamp);
      
      // Close the ImageBitmap immediately to release memory and prevent memory leaks
      imageBitmap.close();

      if (detectionResult.faceLandmarks && detectionResult.faceLandmarks.length > 0) {
        const landmarks = detectionResult.faceLandmarks[0];
        
        // Execute frame classification against calibration baseline
        const classification = classifier.classify(landmarks, calibration);

        self.postMessage({
          type: 'result',
          landmarks,
          classification
        });
      } else {
        self.postMessage({
          type: 'result',
          landmarks: null,
          classification: null
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      self.postMessage({ type: 'process_error', error: message });
    }
  }
};

export {};
