// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { WebAudioFacade } from './AudioFacade';
import { AudioTelemetry } from '../contracts';

describe('AudioFacade', () => {
  let mockPort: any;
  let mockWorkletNode: any;
  let mockContext: any;
  let mediaStream: any;

  beforeEach(() => {
    // 1. Setup mock port
    mockPort = {
      postMessage: vi.fn(),
      onmessage: null as any
    };

    // 2. Setup mock AudioWorkletNode
    mockWorkletNode = {
      port: mockPort,
      connect: vi.fn(),
      disconnect: vi.fn()
    };

    // 3. Setup mock AudioContext
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

    // 4. Register mock implementations globally
    vi.stubGlobal('AudioContext', vi.fn().mockImplementation(() => mockContext));
    vi.stubGlobal('AudioWorkletNode', vi.fn().mockImplementation(() => mockWorkletNode));

    // Mock media stream
    mediaStream = {} as MediaStream;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should initialize and connect audio nodes correctly', async () => {
    const facade = new WebAudioFacade();
    await facade.initialize(mediaStream);

    // Context, modules loading check
    expect(mockContext.audioWorklet.addModule).toHaveBeenCalled();
    expect(mockContext.createGain).toHaveBeenCalledTimes(2); // input and master gain
    expect(mockContext.createMediaStreamSource).toHaveBeenCalledWith(mediaStream);

    // Initial message verification
    expect(mockPort.postMessage).toHaveBeenCalledWith({
      type: 'init',
      config: { sampleRate: 48000, bufferSize: 128 }
    });
  });

  it('should post messages on schedule', async () => {
    const facade = new WebAudioFacade();
    await facade.initialize(mediaStream);

    const effect = {
      kind: 'RECORD_START' as const,
      commandId: 'cmd-1',
      targetFrame: 48000
    };

    await facade.schedule(effect);
    expect(mockPort.postMessage).toHaveBeenCalledWith({
      type: 'schedule',
      commandId: 'cmd-1',
      effect,
      targetFrame: 48000
    });
  });

  it('should register listeners and emit telemetry events', async () => {
    const facade = new WebAudioFacade();
    await facade.initialize(mediaStream);

    const telemetrySpy = vi.fn();
    facade.onTelemetry(telemetrySpy);

    const telemetryData: AudioTelemetry = {
      inputLevel: 0.2,
      outputLevel: 0.5,
      playheadFrame: 1000,
      loopFrames: null,
      dropoutCount: 0,
      renderCostMs: 0.1,
      baseLatencyMs: 2,
      activeLayers: 0
    };

    // Simulate worklet posting telemetry message
    mockPort.onmessage({ data: { type: 'telemetry', data: telemetryData } });

    expect(telemetrySpy).toHaveBeenCalledWith(telemetryData);
  });

  it('should clean up nodes and close context on dispose', async () => {
    const facade = new WebAudioFacade();
    await facade.initialize(mediaStream);
    await facade.dispose();

    expect(mockPort.postMessage).toHaveBeenCalledWith({ type: 'dispose' });
    expect(mockWorkletNode.disconnect).toHaveBeenCalled();
    expect(mockContext.close).toHaveBeenCalled();
  });
});
