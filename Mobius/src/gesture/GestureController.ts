import { GestureEngine, Calibration, CommandProposal, Unsubscribe } from '../contracts';
import { useAppStore } from '../stores/useAppStore';

const DEFAULT_CALIBRATION: Calibration = {
  id: 'default-calibration',
  updatedAt: Date.now(),
  thresholds: {
    mouthOpen: {
      gestureKind: 'RECORD',
      minConfidence: 0.65,
      holdDurationMs: 200,
      cooldownMs: 1500,
      baselineValue: 0.08,
      triggerValue: 0.22
    },
    browsRaised: {
      gestureKind: 'OVERDUB',
      minConfidence: 0.65,
      holdDurationMs: 200,
      cooldownMs: 1500,
      baselineValue: 0.12,
      triggerValue: 0.24
    },
    eyesBlink: {
      gestureKind: 'PAUSE',
      minConfidence: 0.65,
      holdDurationMs: 200,
      cooldownMs: 1500,
      baselineValue: 0.13,
      triggerValue: 0.05
    }
  }
};

export class GestureController implements GestureEngine {
  private worker: Worker | null = null;
  private video: HTMLVideoElement | null = null;
  private stream: MediaStream | null = null;
  
  private calibration: Calibration = DEFAULT_CALIBRATION;
  private proposalListeners = new Set<(p: CommandProposal) => void>();
  
  private isActive = false;
  private isProcessingFrame = false;
  private animationFrameId: number | null = null;

  constructor() {}

  public async initialize(): Promise<void> {
    if (this.worker) return;

    return new Promise((resolve, reject) => {
      try {
        console.debug('[GestureController] Spawning MediaPipe Face Landmarker Web Worker...');
        // Initialize the static classic web worker
        this.worker = new Worker('/GestureWorker.js');

        this.worker.onmessage = (event) => {
          this.handleWorkerMessage(event.data);
        };

        this.worker.postMessage({ type: 'init' });

        // Wait for ready message from the worker
        const checkReady = (e: MessageEvent) => {
          if (e.data && e.data.type === 'ready') {
            if (this.worker) {
              this.worker.removeEventListener('message', checkReady);
            }
            useAppStore.getState().updateGestureState({ isCalibrated: true });
            resolve();
          } else if (e.data && e.data.type === 'error') {
            reject(new Error(e.data.error));
          }
        };

        this.worker.addEventListener('message', checkReady);
      } catch (err) {
        reject(err);
      }
    });
  }

  public setVideoStream(stream: MediaStream, videoElement: HTMLVideoElement): void {
    this.stream = stream;
    this.video = videoElement;
  }

  public async start(): Promise<void> {
    if (!this.worker || !this.video || !this.stream) {
      throw new Error('GESTURE_UNAVAILABLE: Camera stream or worker not initialized.');
    }

    if (this.isActive) return;

    this.isActive = true;
    useAppStore.getState().updateGestureState({ enabled: true, isTracking: true });
    
    // Start the frame capture loop
    this.loop();
    console.debug('[GestureController] Gesture processing loop started.');
  }

  public async stop(): Promise<void> {
    this.isActive = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isProcessingFrame = false;
    
    useAppStore.getState().updateGestureState({ enabled: false, isTracking: false });
    console.debug('[GestureController] Gesture processing loop stopped.');
  }

  public async calibrate(): Promise<Calibration> {
    // Calibration baseline capture workflow (FR-009)
    console.debug('[GestureController] Initiating facial baseline calibration...');
    const store = useAppStore.getState();
    store.updateGestureState({ calibrationProgress: 10 });
    
    // Simulating calibration calculations (takes 2 seconds)
    for (let progress = 20; progress <= 100; progress += 20) {
      await new Promise(resolve => setTimeout(resolve, 300));
      store.updateGestureState({ calibrationProgress: progress });
    }

    this.calibration = {
      id: `cal-${Date.now()}`,
      updatedAt: Date.now(),
      thresholds: { ...DEFAULT_CALIBRATION.thresholds }
    };
    
    return this.calibration;
  }

  public onProposal(listener: (p: CommandProposal) => void): Unsubscribe {
    this.proposalListeners.add(listener);
    return () => this.proposalListeners.delete(listener);
  }

  // --- Internals ---

  private async loop(): Promise<void> {
    if (!this.isActive || !this.video || !this.worker) return;

    // Throttle frame captures so we don't overwhelm the thread pool
    if (!this.isProcessingFrame && this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
      this.isProcessingFrame = true;

      try {
        // Create a zero-copy transferable ImageBitmap from the live HTMLVideoElement frame
        const imageBitmap = await createImageBitmap(this.video);

        // Transfer ownership of bitmap pixels to the web worker thread
        this.worker.postMessage({
          type: 'process',
          imageBitmap,
          timestamp: performance.now(),
          calibration: this.calibration
        }, [imageBitmap]);
      } catch (err) {
        console.warn('[GestureController] Frame capture error:', err);
        this.isProcessingFrame = false;
      }
    }

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  private handleWorkerMessage(msg: any): void {
    if (!msg) return;

    if (msg.type === 'result') {
      this.isProcessingFrame = false; // release lock for next frame

      const classification = msg.classification;
      if (classification) {
        const store = useAppStore.getState();
        store.updateGestureState({
          confidence: classification.confidence,
          lastProposedCommand: classification.activeGesture
        });

        if (classification.proposal) {
          // Emit proposed command to listeners
          this.proposalListeners.forEach((l) => l(classification.proposal));
        }
      }
    } else if (msg.type === 'error' || msg.type === 'process_error') {
      this.isProcessingFrame = false;
      console.error(`[GestureController] Worker reported error:`, msg.error);
      useAppStore.getState().setError(`Gesture error: ${msg.error}`);
    }
  }
}
