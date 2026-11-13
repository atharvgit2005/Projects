import { describe, it, expect, beforeEach } from 'vitest';
import { LoopController } from './LoopController';
import { CommandGateway } from './CommandGateway';
import { AudioFacade, AudioTelemetry, AudioCommit, AudioFault } from '../contracts';
import { useAppStore } from '../stores/useAppStore';

class FakeAudioFacade implements AudioFacade {
  public scheduledEffects: any[] = [];
  private telemetryListeners = new Set<(d: AudioTelemetry) => void>();
  private commitListeners = new Set<(c: AudioCommit) => void>();
  private faultListeners = new Set<(f: AudioFault) => void>();

  public async initialize(_input: MediaStream): Promise<void> {}
  
  public async schedule(effect: any): Promise<void> {
    this.scheduledEffects.push(effect);
  }
  
  public async dispose(): Promise<void> {}

  public onTelemetry(listener: (data: AudioTelemetry) => void) {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  public onFault(listener: (fault: AudioFault) => void) {
    this.faultListeners.add(listener);
    return () => this.faultListeners.delete(listener);
  }

  public onCommit(listener: (event: AudioCommit) => void) {
    this.commitListeners.add(listener);
    return () => this.commitListeners.delete(listener);
  }

  // Helper trigger methods for testing
  public triggerTelemetry(telemetry: AudioTelemetry) {
    this.telemetryListeners.forEach(l => l(telemetry));
  }

  public triggerCommit(commit: AudioCommit) {
    this.commitListeners.forEach(l => l(commit));
  }

  public triggerFault(fault: AudioFault) {
    this.faultListeners.forEach(l => l(fault));
  }
}

describe('LoopController & CommandGateway', () => {
  let controller: LoopController;
  let gateway: CommandGateway;
  let fakeFacade: FakeAudioFacade;

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

    controller = new LoopController();
    gateway = new CommandGateway(controller);
    fakeFacade = new FakeAudioFacade();
    controller.setAudioFacade(fakeFacade);
  });

  it('should accept valid transition and reject invalid transition', async () => {
    // Test: UNDO in idle is invalid
    const resultUndo = await gateway.propose({ kind: 'UNDO', origin: 'ui' });
    expect(resultUndo.status).toBe('rejected');
    expect(resultUndo.reason).toBe('invalid-transition');

    // Test: RECORD in idle is valid
    const resultRecord = await gateway.propose({ kind: 'RECORD', origin: 'ui' });
    expect(resultRecord.status).toBe('accepted');
    expect(useAppStore.getState().loop.phase).toBe('armed');
  });

  it('should calculate frame timings and dispatch effects on valid transition', async () => {
    // Propose record command
    const res = await gateway.propose({ kind: 'RECORD', origin: 'ui' });
    expect(res.status).toBe('accepted');

    // Check that RECORD_START was scheduled
    expect(fakeFacade.scheduledEffects).toHaveLength(1);
    expect(fakeFacade.scheduledEffects[0].kind).toBe('RECORD_START');
  });

  it('should update state and layers on commit', async () => {
    const recordResult = await gateway.propose({ kind: 'RECORD', origin: 'ui' });
    const commandId = recordResult.commandId;
    const targetFrame = recordResult.targetFrame || 0;

    // Simulate worklet commit: transition from armed/idle to recording
    fakeFacade.triggerCommit({
      commandId,
      kind: 'RECORD',
      targetFrame,
      actualFrame: targetFrame + 10 // small offset
    });

    // Expect phase to be recording and a layer added
    expect(useAppStore.getState().loop.phase).toBe('recording');
    expect(useAppStore.getState().loop.layers).toHaveLength(1);

    // Stop recording / commit first loop
    const stopResult = await gateway.propose({ kind: 'STOP', origin: 'ui' });
    fakeFacade.triggerCommit({
      commandId: stopResult.commandId,
      kind: 'RECORD',
      targetFrame: stopResult.targetFrame || 0,
      actualFrame: (stopResult.targetFrame || 0) + 48000 // Loop is exactly 1 second long
    });

    // Expect loop length to be established and phase is playing
    expect(useAppStore.getState().loop.phase).toBe('playing');
    expect(useAppStore.getState().loop.loopFrames).toBe(48000);
  });

  it('should ignore duplicate commands idempotently', async () => {
    const commandId = 'static-command-id';

    // Propose first command
    const res1 = await controller.execute({
      id: commandId,
      kind: 'RECORD',
      origin: 'ui',
      requestedAtMs: Date.now(),
      quantize: 'off'
    });
    expect(res1.status).toBe('accepted');
    expect(fakeFacade.scheduledEffects).toHaveLength(1);

    // Propose duplicate command ID
    const res2 = await controller.execute({
      id: commandId,
      kind: 'RECORD',
      origin: 'ui',
      requestedAtMs: Date.now(),
      quantize: 'off'
    });
    expect(res2.status).toBe('accepted');
    
    // Scheduled effects count must remain 1 (no double trigger)
    expect(fakeFacade.scheduledEffects).toHaveLength(1);
  });

  it('should handle and update telemetry dynamically', () => {
    const telemetry: AudioTelemetry = {
      inputLevel: 0.1,
      outputLevel: 0.4,
      playheadFrame: 12000,
      loopFrames: 48000,
      cpuPercentage: 5,
      dropoutCount: 0,
      renderCostMs: 0.1,
      baseLatencyMs: 5,
      activeLayers: 1
    };

    fakeFacade.triggerTelemetry(telemetry);
    expect(useAppStore.getState().audio).toEqual(telemetry);
  });
});
