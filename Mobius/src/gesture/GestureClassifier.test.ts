import { describe, it, expect, beforeEach } from 'vitest';
import { GestureClassifier, FaceLandmark } from './GestureClassifier';
import { Calibration } from '../contracts';

describe('GestureClassifier', () => {
  let classifier: GestureClassifier;
  let mockCalibration: Calibration;
  let baseLandmarks: FaceLandmark[];

  beforeEach(() => {
    classifier = new GestureClassifier();

    mockCalibration = {
      id: 'test-cal',
      updatedAt: Date.now(),
      thresholds: {
        mouthOpen: { gestureKind: 'RECORD', minConfidence: 0.6, holdDurationMs: 200, cooldownMs: 1000, baselineValue: 0.05, triggerValue: 0.2 },
        browsRaised: { gestureKind: 'OVERDUB', minConfidence: 0.6, holdDurationMs: 200, cooldownMs: 1000, baselineValue: 0.1, triggerValue: 0.2 },
        eyesBlink: { gestureKind: 'PAUSE', minConfidence: 0.6, holdDurationMs: 200, cooldownMs: 1000, baselineValue: 0.1, triggerValue: 0.05 }
      }
    };

    // Construct a base array of 300 face landmarks
    baseLandmarks = Array.from({ length: 300 }, () => ({ x: 0, y: 0, z: 0 }));

    // Set stable distance scales:
    // Left eye outer: index 33, Right eye outer: index 263 (Face scale is distance between these)
    // Let's set FaceScale = 1.0 (right eye.x = 1.0, left eye.x = 0)
    baseLandmarks[33] = { x: 0, y: 0, z: 0 };
    baseLandmarks[263] = { x: 1.0, y: 0, z: 0 };

    // Set neutral mouth: index 13 (top inner lip) and 14 (bottom inner lip) at distance 0.05
    baseLandmarks[13] = { x: 0.5, y: 0.1, z: 0 };
    baseLandmarks[14] = { x: 0.5, y: 0.15, z: 0 };

    // Set neutral brows: left 70, left eye top 159; right 300, right eye top 386. Brow height = 0.1
    baseLandmarks[70] = { x: 0.2, y: 0.2, z: 0 };
    baseLandmarks[159] = { x: 0.2, y: 0.1, z: 0 };
    baseLandmarks[145] = { x: 0.2, y: 0.02, z: 0 }; // left eye bottom (EAR = 0.08)

    baseLandmarks[300] = { x: 0.8, y: 0.2, z: 0 };
    baseLandmarks[386] = { x: 0.8, y: 0.1, z: 0 };
    baseLandmarks[374] = { x: 0.8, y: 0.02, z: 0 }; // right eye bottom (EAR = 0.08)
  });

  it('should return no gesture for a stable neutral face', () => {
    const result = classifier.classify(baseLandmarks, mockCalibration, 1000, 3);
    expect(result.proposal).toBeNull();
    expect(result.activeGesture).toBeNull();
  });

  it('should detect mouth open and trigger RECORD after hold frames', () => {
    // Open the mouth: distance 13-14 is set to 0.3 (> 0.2 threshold)
    baseLandmarks[13] = { x: 0.5, y: 0.1, z: 0 };
    baseLandmarks[14] = { x: 0.5, y: 0.4, z: 0 }; // distance = 0.3

    // Process first frame (hold count = 1)
    let res = classifier.classify(baseLandmarks, mockCalibration, 1000, 3);
    expect(res.activeGesture).toBe('RECORD');
    expect(res.proposal).toBeNull(); // not yet met hold frames count 3

    // Process second frame (hold count = 2)
    res = classifier.classify(baseLandmarks, mockCalibration, 1000, 3);
    expect(res.proposal).toBeNull();

    // Process third frame (hold count = 3 -> trigger)
    res = classifier.classify(baseLandmarks, mockCalibration, 1000, 3);
    expect(res.proposal).not.toBeNull();
    expect(res.proposal!.kind).toBe('RECORD');
    expect(res.proposal!.origin).toBe('gesture');
  });

  it('should detect brows raised and trigger OVERDUB', () => {
    // Raise brows: increase distance 70-159 and 300-386 to 0.25 (> 0.2 threshold)
    baseLandmarks[70] = { x: 0.2, y: 0.35, z: 0 };
    baseLandmarks[300] = { x: 0.8, y: 0.35, z: 0 }; // distance = 0.25

    // Run hold loop
    classifier.classify(baseLandmarks, mockCalibration, 1000, 2);
    const res = classifier.classify(baseLandmarks, mockCalibration, 1000, 2);

    expect(res.proposal).not.toBeNull();
    expect(res.proposal!.kind).toBe('OVERDUB');
  });

  it('should enforce cooldown blocks on quick repeated frames', () => {
    // Open mouth to trigger RECORD
    baseLandmarks[13] = { x: 0.5, y: 0.1, z: 0 };
    baseLandmarks[14] = { x: 0.5, y: 0.4, z: 0 };

    classifier.classify(baseLandmarks, mockCalibration, 1000, 2);
    const resTrigger = classifier.classify(baseLandmarks, mockCalibration, 1000, 2);
    expect(resTrigger.proposal).not.toBeNull(); // triggered

    // Try triggering again immediately
    classifier.classify(baseLandmarks, mockCalibration, 1000, 2);
    const resCooldown = classifier.classify(baseLandmarks, mockCalibration, 1000, 2);
    expect(resCooldown.proposal).toBeNull(); // blocked by cooldown gate
  });
});
