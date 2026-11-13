import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from './useAppStore';

describe('useAppStore', () => {
  beforeEach(() => {
    // Reset Zustand store state before each test
    useAppStore.setState({
      loop: {
        phase: 'idle',
        loopFrames: null,
        sampleRate: 48000,
        layers: [],
        transportFrame: 0,
        activeSessionId: null,
        activeSessionName: null,
      },
      audio: {
        inputLevel: 0,
        outputLevel: 0,
        playheadFrame: 0,
        loopFrames: null,
        cpuPercentage: 0,
        dropoutCount: 0,
        renderCostMs: 0,
        baseLatencyMs: 0,
        activeLayers: 0,
      },
      gesture: {
        enabled: false,
        isTracking: false,
        confidence: 0,
        lastProposedCommand: null,
        calibrationProgress: 0,
        isCalibrated: false,
      },
      settings: {
        quantize: 'off',
        metronomeEnabled: false,
        bpm: 120,
        timeSignature: '4/4',
        inputVolume: 1.0,
        outputVolume: 1.0,
      },
      diagnostics: {
        lastError: null,
        lastFault: null,
        isMicGranted: false,
        isCameraGranted: false,
        fps: 0,
      },
    });
  });

  it('should initialize with correct default state', () => {
    const state = useAppStore.getState();
    expect(state.loop.phase).toBe('idle');
    expect(state.loop.loopFrames).toBeNull();
    expect(state.settings.bpm).toBe(120);
    expect(state.gesture.enabled).toBe(false);
  });

  it('should update loop state', () => {
    useAppStore.getState().updateLoopState({ phase: 'recording', loopFrames: 48000 });
    const state = useAppStore.getState();
    expect(state.loop.phase).toBe('recording');
    expect(state.loop.loopFrames).toBe(48000);
  });

  it('should update telemetry state', () => {
    const telemetryData = {
      inputLevel: 0.5,
      outputLevel: 0.8,
      playheadFrame: 24000,
      loopFrames: 48000,
      cpuPercentage: 15,
      dropoutCount: 1,
      renderCostMs: 0.4,
      baseLatencyMs: 10,
      activeLayers: 2,
    };
    useAppStore.getState().updateTelemetry(telemetryData);
    const state = useAppStore.getState();
    expect(state.audio).toEqual(telemetryData);
  });

  it('should handle setting faults and errors', () => {
    const fault = {
      code: 'CPU_BUDGET_EXCEEDED' as const,
      message: 'Audio thread overload',
      timestamp: Date.now(),
    };
    useAppStore.getState().setFault(fault);
    expect(useAppStore.getState().diagnostics.lastFault).toEqual(fault);

    useAppStore.getState().clearFault();
    expect(useAppStore.getState().diagnostics.lastFault).toBeNull();

    useAppStore.getState().setError('Mic permission blocked');
    expect(useAppStore.getState().diagnostics.lastError).toBe('Mic permission blocked');
  });
});
