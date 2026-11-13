import { create } from 'zustand';
import { 
  LoopPhase, 
  LayerMeta, 
  AudioTelemetry, 
  AudioFault, 
  QuantizeMode 
} from '../contracts';

export interface LoopViewState {
  phase: LoopPhase;
  loopFrames: number | null;
  sampleRate: number;
  layers: readonly LayerMeta[];
  transportFrame: number;
  activeSessionId: string | null;
  activeSessionName: string | null;
}

export interface GestureViewState {
  enabled: boolean;
  isTracking: boolean;
  confidence: number;
  lastProposedCommand: string | null;
  calibrationProgress: number; // 0 to 100
  isCalibrated: boolean;
}

export interface SettingsViewState {
  quantize: QuantizeMode;
  metronomeEnabled: boolean;
  bpm: number;
  timeSignature: string;
  inputVolume: number;
  outputVolume: number;
}

export interface DiagnosticsViewState {
  lastError: string | null;
  lastFault: AudioFault | null;
  isMicGranted: boolean;
  isCameraGranted: boolean;
  fps: number;
}

export interface AppState {
  loop: LoopViewState;
  audio: AudioTelemetry;
  gesture: GestureViewState;
  settings: SettingsViewState;
  diagnostics: DiagnosticsViewState;

  // Actions for controllers/facades to update the store projection
  updateLoopState: (loop: Partial<LoopViewState>) => void;
  updateTelemetry: (audio: AudioTelemetry) => void;
  updateGestureState: (gesture: Partial<GestureViewState>) => void;
  updateSettings: (settings: Partial<SettingsViewState>) => void;
  updateDiagnostics: (diagnostics: Partial<DiagnosticsViewState>) => void;
  setFault: (fault: AudioFault) => void;
  clearFault: () => void;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
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

  updateLoopState: (loopUpdate) => 
    set((state) => ({ loop: { ...state.loop, ...loopUpdate } })),

  updateTelemetry: (audioTelemetry) => 
    set(() => ({ audio: audioTelemetry })),

  updateGestureState: (gestureUpdate) => 
    set((state) => ({ gesture: { ...state.gesture, ...gestureUpdate } })),

  updateSettings: (settingsUpdate) => 
    set((state) => ({ settings: { ...state.settings, ...settingsUpdate } })),

  updateDiagnostics: (diagnosticsUpdate) => 
    set((state) => ({ diagnostics: { ...state.diagnostics, ...diagnosticsUpdate } })),

  setFault: (fault) => 
    set((state) => ({ diagnostics: { ...state.diagnostics, lastFault: fault } })),

  clearFault: () => 
    set((state) => ({ diagnostics: { ...state.diagnostics, lastFault: null } })),

  setError: (error) => 
    set((state) => ({ diagnostics: { ...state.diagnostics, lastError: error } })),
}));
