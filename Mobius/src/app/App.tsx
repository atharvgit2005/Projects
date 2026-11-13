import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../stores/useAppStore';
import { LoopController } from '../controllers/LoopController';
import { CommandGateway } from '../controllers/CommandGateway';
import { KeyboardController } from '../controllers/KeyboardController';
import { GestureController } from '../gesture/GestureController';
import { WebAudioFacade } from '../audio/AudioFacade';

import TransportCard from '../components/TransportCard';
import LayerList from '../components/LayerList';
import SettingsPanel from '../components/SettingsPanel';
import GestureCameraCard from '../components/GestureCameraCard';
import VolumeMeter from '../components/VolumeMeter';

export default function App() {
  const isMicGranted = useAppStore(state => state.diagnostics.isMicGranted);
  const lastError = useAppStore(state => state.diagnostics.lastError);
  const inputLevel = useAppStore(state => state.audio.inputLevel);
  const outputLevel = useAppStore(state => state.audio.outputLevel);
  
  // High-performance metrics
  const cpuPercentage = useAppStore(state => state.audio.cpuPercentage || 0);
  const dropoutCount = useAppStore(state => state.audio.dropoutCount || 0);

  // Controller states
  const [initError, setInitError] = useState<string | null>(null);

  // Instantiating refs to preserve singleton-bounded controller lifecycles across re-renders
  const loopControllerRef = useRef<LoopController | null>(null);
  const commandGatewayRef = useRef<CommandGateway | null>(null);
  const keyboardControllerRef = useRef<KeyboardController | null>(null);
  const gestureControllerRef = useRef<GestureController | null>(null);
  const audioFacadeRef = useRef<WebAudioFacade | null>(null);

  if (!loopControllerRef.current) {
    const controller = new LoopController();
    const gateway = new CommandGateway(controller);
    
    loopControllerRef.current = controller;
    commandGatewayRef.current = gateway;
    keyboardControllerRef.current = new KeyboardController(gateway);
    gestureControllerRef.current = new GestureController();
    audioFacadeRef.current = new WebAudioFacade();
    
    controller.setAudioFacade(audioFacadeRef.current);
  }

  const gateway = commandGatewayRef.current!;
  const controller = loopControllerRef.current!;
  const keyboard = keyboardControllerRef.current!;
  const gesture = gestureControllerRef.current!;
  const audioFacade = audioFacadeRef.current!;

  // Bind keyboard and gesture listeners on initialization
  useEffect(() => {
    keyboard.initialize();
    const unsubscribeGesture = gesture.onProposal((proposal) => {
      gateway.propose(proposal);
    });
    return () => {
      keyboard.dispose();
      unsubscribeGesture();
      audioFacade.dispose();
    };
  }, [keyboard, gesture, gateway, audioFacade]);

  const handleAudioInit = async () => {
    try {
      setInitError(null);
      console.debug('[App] Requesting microphone access stream...');
      
      // Request mic input. Echo cancellation and noise suppression are ON by
      // default to prevent acoustic feedback when using laptop speakers.
      // Users can disable these via the settings panel if using headphones.
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false  // leave gain control to our input gain node
        }
      });

      // Initialize facade with stream
      await audioFacade.initialize(micStream);

      useAppStore.getState().updateDiagnostics({ isMicGranted: true });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      setInitError(errorMsg);
      console.error('[App] Failed to acquire microphone stream:', err);
    }
  };

  const handleClearError = () => {
    useAppStore.getState().setError(null);
  };

  return (
    <div className="min-h-screen w-screen bg-stitch-dark text-stitch-text font-sans flex flex-col justify-between overflow-x-hidden p-6 gap-6">
      
      {/* Top Header Navigation */}
      <header className="flex justify-between items-center bg-stitch-surface border border-stitch-border px-6 py-4 rounded-2xl w-full max-w-7xl mx-auto shadow-sm">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-wider text-stitch-accent">MÖBIUS</h1>
          <span className="text-[10px] bg-stitch-border text-stitch-muted px-2 py-0.5 rounded uppercase font-semibold font-mono">
            V1.0 LOCAL
          </span>
        </div>

        {isMicGranted && (
          <div className="flex gap-6 items-center text-xs font-mono text-stitch-muted">
            <div className="flex items-center gap-1.5">
              <span>CPU DSP:</span>
              <span className={cpuPercentage > 80 ? 'text-stitch-recording font-bold' : 'text-stitch-text'}>
                {cpuPercentage}%
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span>DROPOUTS:</span>
              <span className={dropoutCount > 0 ? 'text-stitch-recording font-bold animate-pulse' : 'text-stitch-text'}>
                {dropoutCount}
              </span>
            </div>
          </div>
        )}
      </header>

      {/* Global Error Banner Display */}
      {(lastError || initError) && (
        <div className="w-full max-w-7xl mx-auto px-6 py-3 bg-red-950/40 border border-red-500/30 text-red-300 rounded-xl flex justify-between items-center text-sm shadow">
          <span>Error: {lastError || initError}</span>
          <button 
            onClick={handleClearError}
            className="text-xs uppercase font-bold hover:text-white px-2 py-1 rounded bg-red-900/30"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main Core Dashboard Grid Layout */}
      <main className="flex-1 w-full max-w-7xl mx-auto flex flex-col justify-center items-center">
        {!isMicGranted ? (
          // Landing/Activation Screen (requires user interaction before initializing AudioContext)
          <div className="flex flex-col items-center text-center gap-5 p-12 rounded-3xl bg-stitch-surface border border-stitch-border max-w-md shadow-lg">
            <div className="w-16 h-16 rounded-full bg-stitch-accent/15 border border-stitch-accent/30 flex items-center justify-center text-stitch-accent text-3xl font-bold">
              🎤
            </div>
            <div className="flex flex-col gap-2">
              <h2 className="text-2xl font-bold tracking-tight">Activate Audio Engine</h2>
              <p className="text-sm text-stitch-muted px-4 leading-relaxed">
                Möbius requires microphone access to record and overdub loops. No audio leaves your browser same-origin context.
              </p>
            </div>
            <button
              id="btn-activate-audio"
              onClick={handleAudioInit}
              className="w-full mt-3 py-3 px-6 bg-stitch-accent hover:brightness-105 active:scale-95 text-stitch-dark font-bold rounded-2xl shadow transition-all duration-150"
              aria-label="Request microphone access and initialize Web Audio graph"
            >
              Allow Microphone & Start
            </button>
          </div>
        ) : (
          // Active Performance Screen
          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Left Column controls */}
            <div className="flex flex-col gap-6 justify-between h-full">
              <TransportCard gateway={gateway} />
              
              {/* High precision canvas level meters */}
              <div className="p-6 rounded-2xl bg-stitch-surface border border-stitch-border flex flex-col gap-4">
                <VolumeMeter id="meter-audio-in" label="INPUT CAPTURE LEVEL" level={inputLevel} />
                <VolumeMeter id="meter-audio-out" label="MASTER PLAYBACK MIX" level={outputLevel} />
              </div>

              <LayerList gateway={gateway} controller={controller} />
            </div>

            {/* Right Column controls */}
            <div className="flex flex-col gap-6 justify-between h-full">
              <SettingsPanel controller={controller} />
              <GestureCameraCard gestureController={gesture} />
            </div>
          </div>
        )}
      </main>

      {/* Footer shortcut guide */}
      <footer className="text-center w-full max-w-7xl mx-auto py-4 bg-stitch-surface/40 border border-stitch-border/30 rounded-2xl">
        <div className="flex flex-wrap justify-center gap-6 text-[10px] font-mono text-stitch-muted uppercase tracking-wider">
          <span>[Space] Record / stop</span>
          <span>[O] Overdub</span>
          <span>[Ctrl+Z] Undo layer</span>
          <span>[Shift+Backspace] Clear all</span>
          <span>[M] Toggle Metronome</span>
        </div>
      </footer>

    </div>
  );
}
