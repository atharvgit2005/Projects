// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from './App';
import { useAppStore } from '../stores/useAppStore';

class MockWorker {
  public postMessage = vi.fn();
  public addEventListener = vi.fn().mockImplementation((type, l) => {
    if (type === 'message') setTimeout(() => l({ data: { type: 'ready' } }), 10);
  });
  public removeEventListener = vi.fn();
  public onmessage: any = null;
}



// Mock Canvas context to avoid JSDOM warnings
HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillStyle: ''
}) as any;

describe('App Root Layout and Integration Tests', () => {
  let mockContext: any;
  let mockPort: any;

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

    mockPort = {
      postMessage: vi.fn(),
      onmessage: null as any
    };

    mockContext = {
      state: 'suspended',
      sampleRate: 48000,
      audioWorklet: {
        addModule: vi.fn().mockResolvedValue(undefined)
      },
      createGain: vi.fn().mockReturnValue({
        gain: { value: 1.0 },
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      createMediaStreamSource: vi.fn().mockReturnValue({
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      createAnalyser: vi.fn().mockReturnValue({
        fftSize: 256,
        frequencyBinCount: 128,
        connect: vi.fn(),
        disconnect: vi.fn()
      }),
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      destination: {}
    };

    // Stub AudioContext and Worker
    vi.stubGlobal('Worker', MockWorker);
    vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => mockContext));
    vi.stubGlobal('AudioWorkletNode', vi.fn().mockImplementation(() => ({
      port: mockPort,
      connect: vi.fn(),
      disconnect: vi.fn()
    })));

    // Stub navigator.mediaDevices
    const mockMediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({
        getTracks: vi.fn().mockReturnValue([])
      })
    };
    vi.stubGlobal('navigator', { mediaDevices: mockMediaDevices });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should render the audio engine activation landing page initially', () => {
    render(<App />);

    expect(screen.getByText('Activate Audio Engine')).toBeDefined();
    expect(screen.getByText('Allow Microphone & Start')).toBeDefined();
  });

  it('should transition to performance dashboard on mic permission grant', async () => {
    render(<App />);

    const button = screen.getByText('Allow Microphone & Start');
    
    await act(async () => {
      fireEvent.click(button);
    });

    // Check that we have transitions (mock getUserMedia is triggered)
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    
    // Check that isMicGranted is true in the Zustand store
    expect(useAppStore.getState().diagnostics.isMicGranted).toBe(true);
    
    // Core transport card indicators should be visible now
    expect(screen.getByText('IDLE')).toBeDefined();
  });
});
