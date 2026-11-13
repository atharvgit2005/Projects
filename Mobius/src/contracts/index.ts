export type LoopPhase = "idle" | "armed" | "recording" | "playing" | "overdubbing" | "paused";

export type CommandKind = "RECORD" | "STOP" | "OVERDUB" | "UNDO" | "CLEAR" | "PAUSE" | "RESUME";

export type QuantizeMode = "off" | "beat" | "bar" | "loop";

export type RejectReason = 
  | "invalid-transition" 
  | "invalid-state" 
  | "stale-command" 
  | "mic-not-initialized" 
  | "no-loop-recorded" 
  | "internal-error";

export interface Command {
  id: string;
  kind: CommandKind;
  origin: "ui" | "keyboard" | "gesture" | "system";
  requestedAtMs: number;
  quantize: QuantizeMode;
  payload?: Record<string, unknown>;
}

export interface CommandResult {
  commandId: string;
  status: "accepted" | "rejected" | "committed";
  reason?: RejectReason;
  targetFrame?: number;
}

export interface CommandProposal {
  kind: CommandKind;
  origin: "ui" | "keyboard" | "gesture" | "system";
  payload?: Record<string, unknown>;
}

export interface LayerMeta {
  id: string;
  order: number;
  gain: number;
  muted: boolean;
  solo?: boolean;
}

export interface LoopSnapshot {
  phase: LoopPhase;
  loopFrames: number | null;
  sampleRate: number;
  layers: readonly LayerMeta[];
  transportFrame: number;
}

// Telemetry structure emitted from the worklet to the main thread
export interface AudioTelemetry {
  inputLevel: number;
  outputLevel: number;
  playheadFrame: number;
  loopFrames: number | null;
  cpuPercentage?: number;
  dropoutCount: number;
  renderCostMs: number;
  baseLatencyMs: number;
  activeLayers: number;
}

// Fault structure representing error events in the audio processor
export interface AudioFault {
  code: "BUFFER_OVERFLOW" | "BUFFER_UNDERFLOW" | "CPU_BUDGET_EXCEEDED" | "RENDER_ERROR";
  message: string;
  timestamp: number;
}

// Effect requested by the controller to be executed by the worklet
export interface AudioEffect {
  kind: "RECORD_START" | "RECORD_STOP" | "OVERDUB_START" | "OVERDUB_STOP" | "UNDO" | "CLEAR" | "PAUSE" | "RESUME";
  commandId: string;
  targetFrame: number;
  layerId?: string; // used for creating a new overdub layer
}

export interface AudioCommit {
  commandId: string;
  kind: CommandKind;
  targetFrame: number;
  actualFrame: number;
}

export interface ProcessorConfig {
  sampleRate: number;
  bufferSize: number;
}

// AudioWorklet bidirectional message protocol definitions
export type MainToWorklet = 
  | { type: "init"; config: ProcessorConfig }
  | { type: "schedule"; commandId: string; effect: AudioEffect; targetFrame: number }
  | { type: "set-layer"; layerId: string; gain?: number; muted?: boolean; solo?: boolean }
  | { type: "dispose" };

export type WorkletToMain = 
  | { type: "ready"; sampleRate: number }
  | { type: "commit"; commandId: string; event: AudioCommit }
  | { type: "telemetry"; data: AudioTelemetry }
  | { type: "fault"; fault: AudioFault };

// Unsubscribe callback
export type Unsubscribe = () => void;

// Facade representing Web Audio interactions
export interface AudioFacade {
  initialize(input: MediaStream): Promise<void>;
  schedule(effect: AudioEffect): Promise<void>;
  dispose(): Promise<void>;
  onTelemetry(listener: (data: AudioTelemetry) => void): Unsubscribe;
  onFault(listener: (fault: AudioFault) => void): Unsubscribe;
  onCommit(listener: (event: AudioCommit) => void): Unsubscribe;
}

// Calibration structure for user gestures
export interface GestureThreshold {
  gestureKind: string;
  minConfidence: number;
  holdDurationMs: number;
  cooldownMs: number;
  baselineValue: number;
  triggerValue: number;
}

export interface Calibration {
  id: string;
  updatedAt: number;
  thresholds: Record<string, GestureThreshold>;
}

// Gesture engine interface
export interface GestureEngine {
  initialize(): Promise<void>;
  start(): Promise<void>;
  stop(): Promise<void>;
  calibrate(): Promise<Calibration>;
  onProposal(listener: (p: CommandProposal) => void): Unsubscribe;
}

// Storage persistence session model
export interface Session {
  id: string;
  name: string;
  sampleRate: number;
  loopFrames: number | null;
  createdAt: number;
  updatedAt: number;
  layers: LayerMeta[];
}

export interface SessionSummary {
  id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
  layerCount: number;
}

// Repository boundary for session saving and retrieval
export interface SessionRepository {
  save(s: Session, audioData?: Record<string, Float32Array[]>): Promise<void>;
  get(id: string): Promise<Session | null>;
  getAudioData(id: string): Promise<Record<string, Float32Array[]> | null>;
  list(): Promise<SessionSummary[]>;
  remove(id: string): Promise<void>;
}
