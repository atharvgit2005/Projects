import { 
  AudioFacade, 
  AudioTelemetry, 
  AudioFault, 
  AudioCommit, 
  AudioEffect, 
  Unsubscribe,
  WorkletToMain,
  MainToWorklet
} from '../contracts';
import processorUrl from './worklet/LoopProcessor?url';

export class WebAudioFacade implements AudioFacade {
  private context: AudioContext | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private inputGain: GainNode | null = null;
  private masterGain: GainNode | null = null;
  private inputAnalyser: AnalyserNode | null = null; // for level metering ONLY — NOT routed to destination
  private mediaSource: MediaStreamAudioSourceNode | null = null;

  private telemetryListeners = new Set<(data: AudioTelemetry) => void>();
  private commitListeners = new Set<(event: AudioCommit) => void>();
  private faultListeners = new Set<(fault: AudioFault) => void>();

  constructor() {}

  public async initialize(input: MediaStream): Promise<void> {
    if (this.context) {
      return; // Already initialized
    }

    try {
      // 1. Create AudioContext (requires secure context in browsers)
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) {
        throw new Error('Web Audio API is not supported in this browser.');
      }

      this.context = new AudioCtx({
        latencyHint: 'interactive',
        sampleRate: 48000 // locked to 48kHz for buffer calculation consistency
      });

      // 2. Load the AudioWorklet Module
      console.debug('[AudioFacade] Loading AudioWorklet module from url:', processorUrl);
      await this.context.audioWorklet.addModule(processorUrl);

      // 3. Create Gain Nodes for I/O control
      this.inputGain = this.context.createGain();
      this.masterGain = this.context.createGain();
      
      this.inputGain.gain.value = 1.0;
      this.masterGain.gain.value = 1.0;

      // 4. Create MediaStreamSource Node from microphone input
      this.mediaSource = this.context.createMediaStreamSource(input);

      // 4b. Create dedicated AnalyserNode for input level metering.
      // This is intentionally NOT connected to the destination — it's a dead-end
      // node used purely for reading input RMS values. This prevents any mic
      // audio from being routed to the speakers.
      this.inputAnalyser = this.context.createAnalyser();
      this.inputAnalyser.fftSize = 256;

      // 5. Instantiate our custom LoopProcessor node
      this.workletNode = new AudioWorkletNode(this.context, 'LoopProcessor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [2] // Output stereo
      });

      // 6. Connect message port listeners BEFORE sending any messages
      this.workletNode.port.onmessage = (event: MessageEvent<WorkletToMain>) => {
        this.handleWorkletMessage(event.data);
      };

      // 7. Establish the audio graph routing.
      //
      // INPUT PATH (capture only — never reaches speakers):
      //   mic stream -> inputGain -> workletNode (for recording capture)
      //   mic stream -> inputAnalyser (dead-end, for level meter reading only)
      //
      // OUTPUT PATH (loop playback — no raw mic passthrough):
      //   workletNode -> masterGain -> destination
      //
      // The workletNode outputs SILENCE in idle/paused, and plays back
      // recorded loop layers in playing/overdubbing. Raw mic audio is NEVER
      // copied to the output buffers — see LoopProcessor.mixLayers().
      this.mediaSource.connect(this.inputGain);
      this.inputGain.connect(this.workletNode);
      this.mediaSource.connect(this.inputAnalyser); // dead-end metering branch
      this.workletNode.connect(this.masterGain);
      this.masterGain.connect(this.context.destination);

      // 8. Send config (sampleRate update only — processor already running)
      this.postToWorklet({
        type: 'init',
        config: {
          sampleRate: this.context.sampleRate,
          bufferSize: 128
        }
      });

      // 9. Resume context if suspended (browser security autoplays check)
      if (this.context.state === 'suspended') {
        await this.context.resume();
      }

      console.debug('[AudioFacade] Web Audio graph successfully initialized.');
    } catch (error) {
      this.disposeInternal();
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`AUDIO_INIT_FAILED: ${message}`);
    }
  }

  public async schedule(effect: AudioEffect): Promise<void> {
    if (!this.workletNode) {
      throw new Error('AudioFacade is not initialized or has been disposed.');
    }

    this.postToWorklet({
      type: 'schedule',
      commandId: effect.commandId,
      effect,
      targetFrame: effect.targetFrame
    });
  }

  /** Send gain/mute/solo update for a single layer to the worklet. */
  public setLayerParams(layerId: string, gain?: number, muted?: boolean, solo?: boolean): void {
    this.postToWorklet({
      type: 'set-layer',
      layerId,
      gain,
      muted,
      solo
    });
  }

  /** Set the input capture gain (0.0 – 1.5). */
  public setInputGain(value: number): void {
    if (this.inputGain) {
      this.inputGain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1.5, value)),
        (this.context?.currentTime ?? 0) + 0.01
      );
    }
  }

  /** Set the master playback gain (0.0 – 1.5). */
  public setMasterGain(value: number): void {
    if (this.masterGain) {
      this.masterGain.gain.linearRampToValueAtTime(
        Math.max(0, Math.min(1.5, value)),
        (this.context?.currentTime ?? 0) + 0.01
      );
    }
  }

  public async dispose(): Promise<void> {
    await this.disposeInternal();
  }

  public onTelemetry(listener: (data: AudioTelemetry) => void): Unsubscribe {
    this.telemetryListeners.add(listener);
    return () => this.telemetryListeners.delete(listener);
  }

  public onFault(listener: (fault: AudioFault) => void): Unsubscribe {
    this.faultListeners.add(listener);
    return () => this.faultListeners.delete(listener);
  }

  public onCommit(listener: (event: AudioCommit) => void): Unsubscribe {
    this.commitListeners.add(listener);
    return () => this.commitListeners.delete(listener);
  }

  // --- Internals ---

  private postToWorklet(msg: MainToWorklet): void {
    if (this.workletNode) {
      this.workletNode.port.postMessage(msg);
    }
  }

  private handleWorkletMessage(message: WorkletToMain): void {
    switch (message.type) {
      case 'ready':
        console.debug('[AudioFacade] Worklet processor reported ready.');
        break;
      case 'commit':
        this.commitListeners.forEach((l) => l(message.event));
        break;
      case 'telemetry':
        this.telemetryListeners.forEach((l) => l(message.data));
        break;
      case 'fault':
        console.error(`[AudioFacade] Worklet processor fault:`, message.fault);
        this.faultListeners.forEach((l) => l(message.fault));
        break;
      default:
        console.warn('[AudioFacade] Unknown message from worklet:', message);
    }
  }

  private async disposeInternal(): Promise<void> {
    console.debug('[AudioFacade] Disposing Web Audio graph...');

    if (this.workletNode) {
      this.postToWorklet({ type: 'dispose' });
      this.workletNode.disconnect();
      this.workletNode = null;
    }

    if (this.inputAnalyser) {
      this.inputAnalyser.disconnect();
      this.inputAnalyser = null;
    }

    if (this.mediaSource) {
      this.mediaSource.disconnect();
      this.mediaSource = null;
    }

    if (this.inputGain) {
      this.inputGain.disconnect();
      this.inputGain = null;
    }

    if (this.masterGain) {
      this.masterGain.disconnect();
      this.masterGain = null;
    }

    if (this.context) {
      try {
        await this.context.close();
      } catch (e) {
        console.warn('[AudioFacade] Error closing AudioContext:', e);
      }
      this.context = null;
    }

    this.telemetryListeners.clear();
    this.commitListeners.clear();
    this.faultListeners.clear();
    console.debug('[AudioFacade] Web Audio graph successfully disposed.');
  }
}
