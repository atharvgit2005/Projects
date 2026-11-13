// Define exports to support UMD/CommonJS loading inside a classic Web Worker context
self.exports = {};

// Load the compiled MediaPipe Tasks-Vision bundle from the CDN matching our package version
importScripts('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/vision_bundle.cjs');

const { FilesetResolver, FaceLandmarker } = self.exports;

let landmarker = null;

function distance(a, b) {
  if (!a || !b) return 0;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// Classifier state variables
let lastProposalTime = 0;
let holdCount = 0;
let currentGesture = null;

function classify(landmarks, calibration, cooldownMs = 1500, minHoldFrames = 6) {
  if (!landmarks || landmarks.length < 100) {
    currentGesture = null;
    holdCount = 0;
    return null;
  }

  const now = Date.now();
  const isCoolingDown = now - lastProposalTime < cooldownMs;

  // 1. Calculate face scale normalizing factor (distance between outer eye corners)
  const leftEyeOuter = landmarks[33];
  const rightEyeOuter = landmarks[263];
  const faceScale = distance(leftEyeOuter, rightEyeOuter);
  if (faceScale === 0) return null;

  // 2. Extract normalized features
  const mouthOpenDist = distance(landmarks[13], landmarks[14]) / faceScale;

  const leftBrowEyeDist = distance(landmarks[70], landmarks[159]) / faceScale;
  const rightBrowEyeDist = distance(landmarks[300], landmarks[386]) / faceScale;
  const browHeight = (leftBrowEyeDist + rightBrowEyeDist) / 2;

  const leftEyeHeight = distance(landmarks[159], landmarks[145]) / faceScale;
  const rightEyeHeight = distance(landmarks[386], landmarks[374]) / faceScale;
  const eyeHeight = (leftEyeHeight + rightEyeHeight) / 2;

  // 3. Match against thresholds
  const thresholds = calibration.thresholds;
  let candidateGesture = null;
  let confidence = 0;

  if (thresholds.mouthOpen && mouthOpenDist > thresholds.mouthOpen.triggerValue) {
    candidateGesture = 'RECORD';
    confidence = Math.min(1.0, mouthOpenDist / (thresholds.mouthOpen.triggerValue * 1.5));
  } else if (thresholds.browsRaised && browHeight > thresholds.browsRaised.triggerValue) {
    candidateGesture = 'OVERDUB';
    confidence = Math.min(1.0, browHeight / (thresholds.browsRaised.triggerValue * 1.3));
  } else if (thresholds.eyesBlink && eyeHeight < thresholds.eyesBlink.triggerValue) {
    candidateGesture = 'PAUSE';
    confidence = 1.0 - (eyeHeight / thresholds.eyesBlink.triggerValue);
  }

  // 4. Hold frames logic
  if (candidateGesture && candidateGesture === currentGesture) {
    holdCount++;
  } else {
    currentGesture = candidateGesture;
    holdCount = candidateGesture ? 1 : 0;
  }

  // 5. Trigger proposal if threshold met
  if (candidateGesture && holdCount >= minHoldFrames) {
    if (!isCoolingDown) {
      lastProposalTime = now;
      holdCount = 0;
      currentGesture = null;

      return {
        proposal: { kind: candidateGesture, origin: 'gesture' },
        confidence,
        activeGesture: candidateGesture
      };
    }
  }

  return {
    proposal: null,
    confidence: candidateGesture ? confidence : 0,
    activeGesture: candidateGesture
  };
}

self.onmessage = async (event) => {
  const data = event.data;
  if (!data) return;

  if (data.type === 'init') {
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm'
      );

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
      self.postMessage({ type: 'error', error: err.message || String(err) });
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
      const detectionResult = landmarker.detectForVideo(imageBitmap, timestamp);
      imageBitmap.close();

      if (detectionResult.faceLandmarks && detectionResult.faceLandmarks.length > 0) {
        const landmarks = detectionResult.faceLandmarks[0];
        const classification = classify(landmarks, calibration);

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
      self.postMessage({ type: 'process_error', error: err.message || String(err) });
    }
  }
};
