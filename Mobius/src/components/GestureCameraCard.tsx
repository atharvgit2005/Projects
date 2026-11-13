import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { GestureController } from '../gesture/GestureController';

interface GestureCameraCardProps {
  gestureController: GestureController;
}

export default function GestureCameraCard({ gestureController }: GestureCameraCardProps) {
  const gestureState = useAppStore(state => state.gesture);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  const [streamActive, setStreamActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Initialize MediaPipe worker on mount
  useEffect(() => {
    gestureController.initialize().catch((err) => {
      console.warn('[GestureCameraCard] MP worker initialization error:', err);
    });
  }, [gestureController]);

  const handleCameraToggle = async () => {
    if (streamActive) {
      // Turn off camera
      gestureController.stop();
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      const stream = (gestureController as any).stream;
      if (stream) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      setStreamActive(false);
      return;
    }

    try {
      setCameraError(null);
      console.debug('[GestureCameraCard] Requesting user camera permissions...');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 320,
          height: 240,
          frameRate: { ideal: 30 }
        }
      });

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // setVideoStream in controller
        gestureController.setVideoStream(mediaStream, videoRef.current);
        setStreamActive(true);
        
        // Start classifications processing
        await gestureController.start();
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setCameraError('Camera access denied or unavailable.');
      useAppStore.getState().setError(`Camera initialization failed: ${errorMsg}`);
    }
  };

  const handleCalibrateClick = async () => {
    try {
      await gestureController.calibrate();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl bg-stitch-surface border border-stitch-border h-full">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <h2 className="text-md font-bold text-stitch-text tracking-wide uppercase">Gesture Controller</h2>
          <span className="text-xs text-stitch-muted">Webcam facial gesture triggers</span>
        </div>
        
        {/* Toggle switch */}
        <button
          id="btn-camera-toggle"
          onClick={handleCameraToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-stitch-accent ${
            streamActive ? 'bg-stitch-accent' : 'bg-stitch-border'
          }`}
          aria-label={streamActive ? 'Disable gesture camera control' : 'Enable gesture camera control'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-stitch-dark transition-transform ${
              streamActive ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      {/* Video Feed Box */}
      <div className="relative w-full h-[160px] rounded-xl bg-stitch-dark border border-stitch-border overflow-hidden flex items-center justify-center">
        {!streamActive ? (
          <span className="text-xs text-stitch-muted px-6 text-center">
            {cameraError ? cameraError : 'Camera feed is disabled. Toggle switch to start.'}
          </span>
        ) : (
          <video
            id="webcam-preview"
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
            aria-label="Webcam loop controls preview"
          />
        )}

        {/* Live indicator overlay */}
        {streamActive && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2 py-0.5 rounded bg-black/60 border border-green-500/30 text-[10px] text-green-400 font-semibold uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
            Live Feed
          </div>
        )}
      </div>

      {/* Calibration Controls (FR-009) */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-stitch-muted uppercase">Calibration</span>
          <span className="font-mono text-stitch-muted">
            {gestureState.calibrationProgress > 0 && gestureState.calibrationProgress < 100 
              ? `Calibrating: ${gestureState.calibrationProgress}%` 
              : gestureState.isCalibrated ? 'Ready' : 'Not Calibrated'}
          </span>
        </div>

        {gestureState.calibrationProgress > 0 && gestureState.calibrationProgress < 100 ? (
          <div className="w-full h-2 rounded bg-stitch-dark overflow-hidden border border-stitch-border">
            <div 
              className="h-full bg-stitch-accent transition-all duration-300"
              style={{ width: `${gestureState.calibrationProgress}%` }}
            />
          </div>
        ) : (
          <button
            id="btn-gesture-calibrate"
            onClick={handleCalibrateClick}
            disabled={!streamActive}
            className="w-full py-2 bg-stitch-card border border-stitch-border hover:bg-stitch-border disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs font-semibold text-stitch-text text-center transition-all duration-150"
            aria-label="Recalibrate neutral facial expression"
          >
            {gestureState.isCalibrated ? 'Recalibrate Baseline' : 'Calibrate Baseline Expression'}
          </button>
        )}
      </div>

      {/* Real-time confidence diagnostics */}
      {streamActive && (
        <div className="flex items-center justify-between gap-4 p-3 bg-stitch-card border border-stitch-border rounded-xl">
          <div className="flex flex-col gap-0.5 w-full">
            <span className="text-[10px] font-semibold text-stitch-muted uppercase tracking-wider">Active Gesture</span>
            <span className="text-sm font-bold text-stitch-accent">
              {gestureState.lastProposedCommand || 'NONE'}
            </span>
          </div>

          <div className="flex flex-col gap-1 w-full text-right">
            <span className="text-[10px] font-semibold text-stitch-muted uppercase tracking-wider">Confidence</span>
            <span className="text-sm font-bold font-mono text-stitch-text">
              {Math.round(gestureState.confidence * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
