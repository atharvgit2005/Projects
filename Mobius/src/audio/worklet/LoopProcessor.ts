// Global type declarations for the AudioWorklet scope
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processorClass: any): void;
declare const currentTime: number;

// Simple interface definitions inline to avoid ES imports in the worklet context
interface ProcessorConfig {
  sampleRate: number;
  bufferSize: number;
}

interface AudioEffect {
  kind: "RECORD_START" | "RECORD_STOP" | "OVERDUB_START" | "OVERDUB_STOP" | "UNDO" | "CLEAR" | "PAUSE" | "RESUME";
  commandId: string;
  targetFrame: number;
  layerId?: string;
}

interface AudioCommit {
  commandId: string;
  kind: "RECORD" | "STOP" | "OVERDUB" | "UNDO" | "CLEAR" | "PAUSE" | "RESUME";
  targetFrame: number;
  actualFrame: number;
}

interface LayerBuffer {
  id: string;
  buffer: Float32Array;
  gain: number;
  muted: boolean;
  solo: boolean;
  length: number; // actual recorded length in frames
}

class LoopProcessor extends AudioWorkletProcessor {
  private sampleRate = 48000;
  
  // Looper parameters
  private phase: "idle" | "recording" | "playing" | "overdubbing" | "paused" = "idle";
  private loopFrames = 0;
  private playhead = 0;
  
  // Layer buffers (preallocated to support up to 60 seconds of stereo-equivalent loop size)
  // At 48kHz, 60 seconds is 2,880,000 samples.
  private maxFrames = 48000 * 60; 
  private layers: LayerBuffer[] = [];
  
  // Pool of preallocated Float32Arrays to avoid GC collections during recording
  private maxLayers = 8;
  private freeBuffers: Float32Array[] = [];
  
  // Command scheduling queue
  private scheduledEffects: Array<{ effect: AudioEffect; processed: boolean }> = [];

  // Low-rate telemetry frame counter
  private telemetryCounter = 0;
  private dropoutCount = 0;

  constructor() {
    super();
    this.port.onmessage = this.handleMessage.bind(this);
    
    // Preallocate layers buffers pool synchronously — no init message needed
    for (let i = 0; i < this.maxLayers; i++) {
      this.freeBuffers.push(new Float32Array(this.maxFrames));
    }

    // Immediately report ready — process() runs from the first quantum
    this.port.postMessage({ type: 'ready', sampleRate: this.sampleRate });
  }

  private handleMessage(event: MessageEvent): void {
    const data = event.data;
    if (!data) return;

    switch (data.type) {
      case 'init':
        this.initialize(data.config);
        break;
      case 'schedule':
        this.scheduledEffects.push({ effect: data.effect, processed: false });
        break;
      case 'set-layer':
        this.setLayerParams(data.layerId, data.gain, data.muted, data.solo);
        break;
      case 'dispose':
        this.resetProcessor();
        break;
    }
  }

  private initialize(config: ProcessorConfig): void {
    // Update sampleRate from config if provided — processor already running
    if (config && config.sampleRate) {
      this.sampleRate = config.sampleRate;
    }
  }

  private setLayerParams(layerId: string, gain?: number, muted?: boolean, solo?: boolean): void {
    const layer = this.layers.find(l => l.id === layerId);
    if (layer) {
      if (typeof gain === 'number') layer.gain = gain;
      if (typeof muted === 'boolean') layer.muted = muted;
      if (typeof solo === 'boolean') layer.solo = solo;
    }
  }

  private resetProcessor(): void {
    // Return all layer buffers back to the free pool
    for (let i = 0; i < this.layers.length; i++) {
      this.freeBuffers.push(this.layers[i].buffer);
    }
    this.layers = [];
    this.loopFrames = 0;
    this.playhead = 0;
    this.phase = 'idle';
    this.scheduledEffects = [];
    this.dropoutCount = 0;
  }

  public process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {

    const input = inputs[0];
    const output = outputs[0];

    // Ensure output buffers exist
    if (!output || output.length === 0) {
      return true;
    }

    const inputChannel = input && input.length > 0 ? input[0] : null;
    const outputL = output[0];
    const outputR = output.length > 1 ? output[1] : output[0];

    const bufferSize = outputL.length; // usually 128 frames

    // Track frame deadline diagnostics
    const startTime = currentTime; // worklet high-precision clock

    // 1. Process scheduled effects at their precise sample boundary
    this.checkScheduledEffects(bufferSize);

    // 2. Perform DSP read/write loops
    if (this.phase === 'recording') {
      const activeLayer = this.layers[this.layers.length - 1];
      if (activeLayer && inputChannel) {
        for (let i = 0; i < bufferSize; i++) {
          const sample = inputChannel[i];
          const writeIndex = this.playhead + i;
          
          if (writeIndex < this.maxFrames) {
            activeLayer.buffer[writeIndex] = sample;
            activeLayer.length++;
          } else {
            // Buffer overflow boundary safeguard
            this.dropoutCount++;
            this.port.postMessage({
              type: 'fault',
              fault: {
                code: 'BUFFER_OVERFLOW',
                message: 'Maximum loop duration of 60 seconds exceeded.',
                timestamp: currentTime
              }
            });
            this.phase = 'playing';
            break;
          }
        }
      }
    } else if (this.phase === 'overdubbing') {
      const activeLayer = this.layers[this.layers.length - 1];
      if (activeLayer && inputChannel && this.loopFrames > 0) {
        for (let i = 0; i < bufferSize; i++) {
          const sample = inputChannel[i];
          const absoluteIndex = this.playhead + i;
          const writeIndex = absoluteIndex % this.loopFrames;

          if (writeIndex < this.maxFrames) {
            activeLayer.buffer[writeIndex] = sample;
            activeLayer.length = this.loopFrames;
          }
        }
      }
    }

    // 3. Mixdown playing layers to output buffer
    this.mixLayers(outputL, outputR, bufferSize);

    // 4. Update playhead position
    if (this.phase !== 'paused') {
      this.playhead += bufferSize;
      if (this.loopFrames > 0 && this.phase !== 'recording') {
        this.playhead = this.playhead % this.loopFrames;
      }
    }

    // 5. Emit throttled telemetry updates (30Hz target)
    this.telemetryCounter++;
    if (this.telemetryCounter >= 12) { // 12 * 128 frames = ~32ms (approx 31Hz)
      this.telemetryCounter = 0;
      this.sendTelemetry(inputChannel, outputL, outputR, startTime);
    }

    return true;
  }

  private checkScheduledEffects(bufferSize: number): void {
    const currentFrame = this.playhead;

    for (let idx = 0; idx < this.scheduledEffects.length; idx++) {
      const entry = this.scheduledEffects[idx];
      if (entry.processed) continue;

      const effect = entry.effect;

      // Fire the effect as soon as the playhead reaches or passes the target frame.
      // This handles both on-time delivery and effects whose target frame was
      // scheduled before the worklet started processing (race condition fix).
      if (effect.targetFrame <= currentFrame + bufferSize) {
        this.applyEffect(effect);
        entry.processed = true;
      }
    }

    // Filter out processed items
    this.scheduledEffects = this.scheduledEffects.filter(e => !e.processed);
  }

  private applyEffect(effect: AudioEffect): void {
    console.log('[LoopProcessor] Executing transition effect:', effect.kind, 'at frame:', effect.targetFrame);

    let actualFrame = this.playhead;
    let targetFrame = effect.targetFrame;

    switch (effect.kind) {
      case 'RECORD_START':
        if (effect.layerId && this.freeBuffers.length > 0) {
          const rawBuffer = this.freeBuffers.pop()!;
          rawBuffer.fill(0); // clear dirty samples
          
          this.layers.push({
            id: effect.layerId,
            buffer: rawBuffer,
            gain: 1.0,
            muted: false,
            solo: false,
            length: 0
          });

          this.phase = 'recording';
          this.playhead = 0; // reset playhead to start base loop
        }
        break;

      case 'RECORD_STOP':
        if (this.phase === 'recording') {
          // The loop length is the total frames recorded (current playhead)
          this.loopFrames = this.playhead;
          actualFrame = this.playhead; // report loop length to controller
          targetFrame = effect.targetFrame;
          this.phase = 'playing';
          this.playhead = 0; // reset to start of loop
        }
        break;

      case 'OVERDUB_START':
        if (this.loopFrames > 0 && effect.layerId && this.freeBuffers.length > 0) {
          const rawBuffer = this.freeBuffers.pop()!;
          rawBuffer.fill(0);

          this.layers.push({
            id: effect.layerId,
            buffer: rawBuffer,
            gain: 1.0,
            muted: false,
            solo: false,
            length: this.loopFrames
          });

          this.phase = 'overdubbing';
        }
        break;

      case 'OVERDUB_STOP':
        if (this.phase === 'overdubbing') {
          this.phase = 'playing';
        }
        break;

      case 'UNDO':
        if (this.layers.length > 0) {
          const removed = this.layers.pop()!;
          this.freeBuffers.push(removed.buffer); // return to pool
          
          if (this.layers.length === 0) {
            this.loopFrames = 0;
            this.phase = 'idle';
            this.playhead = 0;
          }
        }
        break;

      case 'CLEAR':
        this.resetProcessor();
        break;

      case 'PAUSE':
        if (this.phase === 'playing' || this.phase === 'overdubbing') {
          this.phase = 'paused';
        }
        break;

      case 'RESUME':
        if (this.phase === 'paused') {
          this.phase = 'playing';
        }
        break;
    }

    // Trigger commit feedback to controller
    let kind: AudioCommit['kind'] = 'RECORD';
    if (effect.kind.includes('OVERDUB')) kind = 'OVERDUB';
    else if (effect.kind === 'UNDO') kind = 'UNDO';
    else if (effect.kind === 'CLEAR') kind = 'CLEAR';
    else if (effect.kind === 'PAUSE') kind = 'PAUSE';
    else if (effect.kind === 'RESUME') kind = 'RESUME';

    this.port.postMessage({
      type: 'commit',
      commandId: effect.commandId,
      event: {
        commandId: effect.commandId,
        kind,
        targetFrame,
        actualFrame
      }
    });
  }

  private mixLayers(outputL: Float32Array, outputR: Float32Array, bufferSize: number): void {
    // Clear outputs first
    outputL.fill(0);
    outputR.fill(0);

    if (this.phase === 'idle' || this.phase === 'paused' || this.layers.length === 0) {
      return;
    }

    // Check if any layer is soloed
    const hasSolo = this.layers.some(l => l.solo);

    // Sum active layers into master output channels
    for (let l = 0; l < this.layers.length; l++) {
      // Do not monitor the live recording/overdubbing layer to prevent acoustic feedback loop
      if ((this.phase === 'recording' || this.phase === 'overdubbing') && l === this.layers.length - 1) {
        continue;
      }

      const layer = this.layers[l];
      if (layer.muted) continue;
      if (hasSolo && !layer.solo) continue;

      const layerBuffer = layer.buffer;
      const layerGain = layer.gain; // no auto-attenuation so volume stays constant

      for (let i = 0; i < bufferSize; i++) {
        const index = (this.playhead + i) % (this.loopFrames || this.maxFrames);
        const sample = layerBuffer[index] * layerGain;

        outputL[i] += sample;
        outputR[i] += sample;
      }
    }

    // Apply soft limiter with a knee starting at 0.95
    // Keeps signal perfectly linear up to 0.95, then smoothly compresses to prevent hard clipping.
    for (let i = 0; i < bufferSize; i++) {
      let l = outputL[i];
      let r = outputR[i];

      if (l > 0.95) l = 0.95 + 0.05 * Math.tanh((l - 0.95) / 0.05);
      else if (l < -0.95) l = -0.95 + 0.05 * Math.tanh((l + 0.95) / 0.05);

      if (r > 0.95) r = 0.95 + 0.05 * Math.tanh((r - 0.95) / 0.05);
      else if (r < -0.95) r = -0.95 + 0.05 * Math.tanh((r + 0.95) / 0.05);

      outputL[i] = l;
      outputR[i] = r;
    }
  }

  private sendTelemetry(
    inputChannel: Float32Array | null,
    outputL: Float32Array,
    outputR: Float32Array,
    startTime: number
  ): void {
    // Compute basic RMS input and output levels
    let inputSum = 0;
    if (inputChannel) {
      for (let i = 0; i < inputChannel.length; i++) {
        inputSum += inputChannel[i] * inputChannel[i];
      }
    }
    const inputLevel = inputChannel ? Math.sqrt(inputSum / inputChannel.length) : 0;

    let outputSum = 0;
    for (let i = 0; i < outputL.length; i++) {
      const mixedSample = (outputL[i] + outputR[i]) / 2;
      outputSum += mixedSample * mixedSample;
    }
    const outputLevel = Math.sqrt(outputSum / outputL.length);

    // Compute execution deadline cost (diagnostics telemetry)
    const renderCostMs = (currentTime - startTime) * 1000;

    this.port.postMessage({
      type: 'telemetry',
      data: {
        inputLevel,
        outputLevel,
        playheadFrame: this.playhead,
        loopFrames: this.loopFrames > 0 ? this.loopFrames : null,
        cpuPercentage: Math.min(100, Math.round((renderCostMs / 2.667) * 100)), // render quantum budget is 2.667ms
        dropoutCount: this.dropoutCount,
        renderCostMs,
        baseLatencyMs: 2.67,
        activeLayers: this.layers.length,
        phase: this.phase // internal worklet phase for debugging
      }
    });
  }
}

registerProcessor('LoopProcessor', LoopProcessor);

export {};
