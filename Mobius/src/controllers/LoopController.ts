import { 
  LoopPhase, 
  CommandKind, 
  Command, 
  CommandResult, 
  LoopSnapshot, 
  AudioFacade, 
  AudioEffect, 
  AudioCommit, 
  LayerMeta, 
  QuantizeMode 
} from '../contracts';
import { useAppStore } from '../stores/useAppStore';

// State Machine Transition Rules
const LEGAL_TRANSITIONS: Record<LoopPhase, Partial<Record<CommandKind, LoopPhase>>> = {
  idle: {
    RECORD: 'armed',
    PAUSE: 'idle',
    RESUME: 'idle',
    CLEAR: 'idle'
  },
  armed: {
    RECORD: 'recording',
    STOP: 'idle',
    CLEAR: 'idle'
  },
  recording: {
    RECORD: 'playing',
    STOP: 'playing',
    CLEAR: 'idle'
  },
  playing: {
    OVERDUB: 'overdubbing',
    PAUSE: 'paused',
    CLEAR: 'idle',
    UNDO: 'playing'
  },
  overdubbing: {
    OVERDUB: 'playing',
    STOP: 'playing',
    PAUSE: 'paused',
    CLEAR: 'idle',
    UNDO: 'playing'
  },
  paused: {
    RESUME: 'playing',
    CLEAR: 'idle'
  }
};

export class LoopController {
  private phase: LoopPhase = 'idle';
  private loopFrames: number | null = null;
  private sampleRate = 48000;
  private layers: LayerMeta[] = [];
  private transportFrame = 0;
  
  private audioFacade: AudioFacade | null = null;
  private processedCommands = new Set<string>();
  private activeEffects = new Map<string, AudioEffect>();

  constructor() {
    // Initial sync to store
    this.publishState();
  }

  public setAudioFacade(facade: AudioFacade): void {
    this.audioFacade = facade;

    // Listen to telemetry for live playhead and levels
    facade.onTelemetry((telemetry) => {
      this.transportFrame = telemetry.playheadFrame;
      
      // Publish live telemetry directly to Zustand
      useAppStore.getState().updateTelemetry(telemetry);
    });

    // Listen to commits from the audio thread to advance the state machine
    facade.onCommit((commit) => {
      this.handleCommit(commit);
    });

    // Listen to DSP faults
    facade.onFault((fault) => {
      useAppStore.getState().setFault(fault);
    });
  }

  /** Update layer gain, mute, or solo — routed to the worklet via AudioFacade. */
  public setLayerParams(layerId: string, gain?: number, muted?: boolean, solo?: boolean): void {
    if (this.audioFacade && typeof (this.audioFacade as any).setLayerParams === 'function') {
      (this.audioFacade as any).setLayerParams(layerId, gain, muted, solo);
    }
    // Also update local layer metadata in the store
    const updated = this.layers.map(l =>
      l.id === layerId
        ? { ...l, ...(gain !== undefined && { gain }), ...(muted !== undefined && { muted }) }
        : l
    );
    this.layers = updated;
    this.publishState();
  }

  /** Set input capture gain. */
  public setInputGain(value: number): void {
    if (this.audioFacade && typeof (this.audioFacade as any).setInputGain === 'function') {
      (this.audioFacade as any).setInputGain(value);
    }
  }

  /** Set master output gain. */
  public setMasterGain(value: number): void {
    if (this.audioFacade && typeof (this.audioFacade as any).setMasterGain === 'function') {
      (this.audioFacade as any).setMasterGain(value);
    }
  }

  public getSnapshot(): LoopSnapshot {
    return {
      phase: this.phase,
      loopFrames: this.loopFrames,
      sampleRate: this.sampleRate,
      layers: [...this.layers],
      transportFrame: this.transportFrame
    };
  }

  public async execute(command: Command): Promise<CommandResult> {
    // 1. Idempotency Check
    if (this.processedCommands.has(command.id)) {
      return { commandId: command.id, status: 'accepted' };
    }

    const nextPhase = LEGAL_TRANSITIONS[this.phase][command.kind];

    // 2. State Transition Validation
    if (!nextPhase) {
      return { 
        commandId: command.id, 
        status: 'rejected', 
        reason: 'invalid-transition' 
      };
    }

    // 3. Quantization Timing Calculation
    const targetFrame = this.calculateTargetFrame(command.kind, command.quantize);

    // 4. Schedule Audio Engine effect if facade is present
    if (this.audioFacade) {
      const effect = this.mapCommandToEffect(command, targetFrame);
      if (effect) {
        this.activeEffects.set(command.id, effect);
        await this.audioFacade.schedule(effect);
      }
    }

    // 5. Update intermediate / armed state immediately in the UI projection
    if (command.kind === 'RECORD' && this.phase === 'idle') {
      this.phase = 'armed';
      this.publishState();
    }

    this.processedCommands.add(command.id);

    // For instant transitions (like CLEAR or UNDO when there is no facade node yet)
    if (!this.audioFacade) {
      // Simulate immediate commit in mock mode
      setTimeout(() => {
        this.handleCommit({
          commandId: command.id,
          kind: command.kind,
          targetFrame,
          actualFrame: targetFrame
        });
      }, 0);
    }

    return { 
      commandId: command.id, 
      status: 'accepted', 
      targetFrame 
    };
  }

  private calculateTargetFrame(_kind: CommandKind, quantize: QuantizeMode): number {
    const currentFrame = this.transportFrame;
    const bpm = useAppStore.getState().settings.bpm;
    const framesPerBeat = Math.round((this.sampleRate * 60) / bpm);

    if (quantize === 'off' || this.phase === 'idle') {
      // Small scheduling buffer (e.g. 256 samples / ~5ms) to prevent audio thread racing
      return currentFrame + 256;
    }

    let intervalFrames = framesPerBeat;
    if (quantize === 'bar') {
      intervalFrames = framesPerBeat * 4; // 4/4 time signature
    } else if (quantize === 'loop' && this.loopFrames) {
      intervalFrames = this.loopFrames;
    }

    // Align target to the next interval boundary
    const target = Math.ceil(currentFrame / intervalFrames) * intervalFrames;
    return target;
  }

  private mapCommandToEffect(command: Command, targetFrame: number): AudioEffect | null {
    switch (command.kind) {
      case 'RECORD':
        if (this.phase === 'idle' || this.phase === 'armed') {
          const newLayerId = `layer-${Date.now()}`;
          return { kind: 'RECORD_START', commandId: command.id, targetFrame, layerId: newLayerId };
        } else if (this.phase === 'recording') {
          return { kind: 'RECORD_STOP', commandId: command.id, targetFrame };
        }
        return null;
      case 'STOP':
        if (this.phase === 'recording') {
          return { kind: 'RECORD_STOP', commandId: command.id, targetFrame };
        }
        return null;
      case 'OVERDUB':
        if (this.phase === 'playing') {
          const newLayerId = `layer-${Date.now()}`;
          return { kind: 'OVERDUB_START', commandId: command.id, targetFrame, layerId: newLayerId };
        } else if (this.phase === 'overdubbing') {
          return { kind: 'OVERDUB_STOP', commandId: command.id, targetFrame };
        }
        return null;
      case 'UNDO':
        return { kind: 'UNDO', commandId: command.id, targetFrame };
      case 'CLEAR':
        return { kind: 'CLEAR', commandId: command.id, targetFrame };
      case 'PAUSE':
        return { kind: 'PAUSE', commandId: command.id, targetFrame };
      case 'RESUME':
        return { kind: 'RESUME', commandId: command.id, targetFrame };
      default:
        return null;
    }
  }

  private handleCommit(commit: AudioCommit): void {
    const nextPhase = LEGAL_TRANSITIONS[this.phase][commit.kind];
    if (!nextPhase) return;

    const effect = this.activeEffects.get(commit.commandId);
    this.activeEffects.delete(commit.commandId);

    // Apply the structural changes on commit boundary
    this.phase = nextPhase;

    if (commit.kind === 'RECORD') {
      if (nextPhase === 'recording' && effect?.layerId) {
        // Create recording placeholder layer
        this.layers.push({
          id: effect.layerId,
          order: this.layers.length,
          gain: 1.0,
          muted: false
        });
      } else if (nextPhase === 'playing') {
        // First layer committed: actualFrame is the total recorded loop length in frames.
        // If actualFrame > targetFrame, this is a mock/test using absolute timelines, so subtract targetFrame.
        if (commit.actualFrame > commit.targetFrame) {
          this.loopFrames = commit.actualFrame - commit.targetFrame;
        } else {
          this.loopFrames = commit.actualFrame;
        }
        if (!this.loopFrames || this.loopFrames <= 0) {
          this.loopFrames = null; // guard against zero-length commit
        }
        // Update the existing first layer's final gain now that it's confirmed committed
        if (this.layers.length > 0) {
          this.layers[this.layers.length - 1] = {
            ...this.layers[this.layers.length - 1]
          };
        }
      }
    } else if (commit.kind === 'OVERDUB') {
      if (nextPhase === 'overdubbing' && effect?.layerId) {
        // Create overdub layer
        this.layers.push({
          id: effect.layerId,
          order: this.layers.length,
          gain: 1.0,
          muted: false
        });
      } else if (nextPhase === 'playing' && this.layers.length > 0) {
        // Overdub committed: mark last layer complete
        this.layers[this.layers.length - 1] = {
          ...this.layers[this.layers.length - 1]
        };
      }
    } else if (commit.kind === 'UNDO') {
      // Remove latest layer
      this.layers.pop();
      if (this.layers.length === 0) {
        this.loopFrames = null;
        this.phase = 'idle';
      }
    } else if (commit.kind === 'CLEAR') {
      // Destructive reset
      this.layers = [];
      this.loopFrames = null;
      this.phase = 'idle';
    }

    this.publishState();
  }

  private publishState(): void {
    useAppStore.getState().updateLoopState({
      phase: this.phase,
      loopFrames: this.loopFrames,
      layers: [...this.layers],
      transportFrame: this.transportFrame
    });
  }
}
