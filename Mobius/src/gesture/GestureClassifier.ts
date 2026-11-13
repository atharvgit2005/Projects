import { CommandProposal, Calibration } from '../contracts';

export interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

export class GestureClassifier {
  private lastProposalTime = 0;
  private holdCount = 0;
  private currentGesture: string | null = null;

  constructor() {}

  /**
   * Normalize and classify face landmarks, checking thresholds, holds, and cooldowns.
   */
  public classify(
    landmarks: FaceLandmark[],
    calibration: Calibration,
    cooldownMs = 1500,
    minHoldFrames = 6
  ): { proposal: CommandProposal | null; confidence: number; activeGesture: string | null } {
    if (!landmarks || landmarks.length < 100) {
      this.currentGesture = null;
      this.holdCount = 0;
      return { proposal: null, confidence: 0, activeGesture: null };
    }

    const now = Date.now();
    const isCoolingDown = now - this.lastProposalTime < cooldownMs;

    // 1. Calculate face scale normalizing factor (distance between outer eye corners)
    // Left eye outer: index 33, Right eye outer: index 263
    const leftEyeOuter = landmarks[33];
    const rightEyeOuter = landmarks[263];
    const faceScale = this.distance(leftEyeOuter, rightEyeOuter);
    if (faceScale === 0) {
      return { proposal: null, confidence: 0, activeGesture: null };
    }

    // 2. Extract normalized features
    // Mouth open: top inner lip (13) to bottom inner lip (14) normalized by face scale
    const mouthOpenDist = this.distance(landmarks[13], landmarks[14]) / faceScale;
    
    // Eyebrows raised: average brow position to eye position
    // Left brow: 70, Left eye top: 159
    // Right brow: 300, Right eye top: 386
    const leftBrowEyeDist = this.distance(landmarks[70], landmarks[159]) / faceScale;
    const rightBrowEyeDist = this.distance(landmarks[300], landmarks[386]) / faceScale;
    const browHeight = (leftBrowEyeDist + rightBrowEyeDist) / 2;

    // Eyelid aspect ratio (blink detection): left eye 159-145, right eye 386-374
    const leftEyeHeight = this.distance(landmarks[159], landmarks[145]) / faceScale;
    const rightEyeHeight = this.distance(landmarks[386], landmarks[374]) / faceScale;
    const eyeHeight = (leftEyeHeight + rightEyeHeight) / 2;

    // 3. Compare against calibration thresholds
    const thresholds = calibration.thresholds;
    let candidateGesture: string | null = null;
    let confidence = 0;

    // Classifier strategies as specified in SDS
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

    // 4. Implement hold gate (stabilize inputs)
    if (candidateGesture && candidateGesture === this.currentGesture) {
      this.holdCount++;
    } else {
      this.currentGesture = candidateGesture;
      this.holdCount = candidateGesture ? 1 : 0;
    }

    // 5. Emit command proposal if hold threshold reached and not in cooldown
    if (candidateGesture && this.holdCount >= minHoldFrames) {
      if (!isCoolingDown) {
        this.lastProposalTime = now;
        this.holdCount = 0; // reset after trigger
        this.currentGesture = null;

        return {
          proposal: { kind: this.mapGestureToCommand(candidateGesture), origin: 'gesture' },
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

  private mapGestureToCommand(gesture: string): CommandProposal['kind'] {
    switch (gesture) {
      case 'RECORD': return 'RECORD';
      case 'OVERDUB': return 'OVERDUB';
      case 'PAUSE': return 'PAUSE';
      default: return 'STOP';
    }
  }

  private distance(a: FaceLandmark, b: FaceLandmark): number {
    if (!a || !b) return 0;
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }
}
