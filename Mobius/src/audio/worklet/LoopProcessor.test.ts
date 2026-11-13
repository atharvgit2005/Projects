// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest';

// Declare a placeholder class to capture the processor
let capturedProcessorClass: any = null;

// Assign mocks directly to globalThis before any code executes dynamically
(globalThis as any).AudioWorkletProcessor = class MockAudioWorkletProcessor {
  public port = {
    postMessage: vi.fn(),
    onmessage: null as any
  };
};

(globalThis as any).registerProcessor = (_name: string, processorClass: any) => {
  capturedProcessorClass = processorClass;
};

(globalThis as any).currentTime = 0.0;

describe('LoopProcessor DSP Unit Tests', () => {
  let processor: any;
  let mockPort: any;

  beforeEach(async () => {
    vi.restoreAllMocks();
    (globalThis as any).currentTime = 0.0;

    // Load LoopProcessor dynamically to ensure globalThis is populated first
    if (!capturedProcessorClass) {
      await import('./LoopProcessor');
    }
    
    // Create new processor instance — this also emits 'ready' immediately from constructor
    processor = new capturedProcessorClass();
    mockPort = processor.port;
    // Note: no 'init' message needed — processor is ready immediately
  });

  it('should initialize and report ready status from constructor', () => {
    // 'ready' is posted synchronously from the constructor
    expect(mockPort.postMessage).toHaveBeenCalledWith({
      type: 'ready',
      sampleRate: 48000
    });
  });

  it('should transition to recording and record mic input', () => {
    // Schedule RECORD_START
    mockPort.onmessage({
      data: {
        type: 'schedule',
        commandId: 'cmd-rec-1',
        effect: { kind: 'RECORD_START', commandId: 'cmd-rec-1', targetFrame: 0, layerId: 'layer-1' }
      }
    });

    const mockInput = [new Float32Array(128).fill(0.5)];
    const mockOutput = [[new Float32Array(128), new Float32Array(128)]];

    // Process first chunk (effect triggers immediately at frame 0)
    processor.process([mockInput], mockOutput);

    // Expect commit message for transition
    expect(mockPort.postMessage).toHaveBeenCalledWith({
      type: 'commit',
      commandId: 'cmd-rec-1',
      event: {
        commandId: 'cmd-rec-1',
        kind: 'RECORD',
        targetFrame: 0,
        actualFrame: 0
      }
    });

    // Check layer count is 1
    expect(processor.layers).toHaveLength(1);
    expect(processor.phase).toBe('recording');

    // Confirm input sample recording
    const recordedBuffer = processor.layers[0].buffer;
    expect(recordedBuffer[0]).toBe(0.5);
    expect(recordedBuffer[127]).toBe(0.5);
  });

  it('should establish loop length and repeat playhead on stop', () => {
    // 1. Start recording
    mockPort.onmessage({
      data: {
        type: 'schedule',
        commandId: 'cmd-rec-1',
        effect: { kind: 'RECORD_START', commandId: 'cmd-rec-1', targetFrame: 0, layerId: 'layer-1' }
      }
    });
    const mockInput = [new Float32Array(128).fill(0.75)];
    const mockOutput = [[new Float32Array(128), new Float32Array(128)]];
    processor.process([mockInput], mockOutput); // records frames 0-127

    // 2. Schedule stop at frame 128
    mockPort.onmessage({
      data: {
        type: 'schedule',
        commandId: 'cmd-stop-1',
        effect: { kind: 'RECORD_STOP', commandId: 'cmd-stop-1', targetFrame: 128 }
      }
    });

    // Process second chunk (which reaches targetFrame 128 at start of process)
    processor.process([mockInput], mockOutput); // stops recording, loops playhead

    expect(processor.phase).toBe('playing');
    expect(processor.loopFrames).toBe(128); // Loop established at 128 frames

    // Output L/R should now play back the recorded samples
    expect(mockOutput[0][0][0]).toBe(0.75);
    expect(mockOutput[0][1][127]).toBe(0.75);
  });

  it('should mix layers and apply master soft limiter', () => {
    // Mock pre-existing layers directly in the instance state to isolate the mixing DSP
    const layer1 = new Float32Array(128).fill(0.6);
    const layer2 = new Float32Array(128).fill(0.5);

    processor.layers = [
      { id: 'l1', buffer: layer1, gain: 1.0, muted: false, solo: false, length: 128 },
      { id: 'l2', buffer: layer2, gain: 1.0, muted: false, solo: false, length: 128 }
    ];
    processor.loopFrames = 128;
    processor.phase = 'playing';

    const mockOutput = [[new Float32Array(128), new Float32Array(128)]];
    processor.process([[]], mockOutput);

    // Mixed value L/R should be soft-limited to approximately 1.0 (via tanh soft knee)
    expect(mockOutput[0][0][0]).toBeCloseTo(1.0, 3);
    expect(mockOutput[0][1][0]).toBeCloseTo(1.0, 3);
  });

  it('should support layer mute/solo state modifications', () => {
    const layer1 = new Float32Array(128).fill(0.5);
    const layer2 = new Float32Array(128).fill(0.3);

    processor.layers = [
      { id: 'l1', buffer: layer1, gain: 1.0, muted: false, solo: false, length: 128 },
      { id: 'l2', buffer: layer2, gain: 1.0, muted: true, solo: false, length: 128 } // layer 2 muted
    ];
    processor.loopFrames = 128;
    processor.phase = 'playing';

    const mockOutput = [[new Float32Array(128), new Float32Array(128)]];
    processor.process([[]], mockOutput);

    // Muted layer 2 must be excluded from mix (output = 0.5 only)
    expect(mockOutput[0][0][0]).toBe(0.5);
  });
});
