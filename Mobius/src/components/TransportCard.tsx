import { useAppStore } from '../stores/useAppStore';
import { CommandGateway } from '../controllers/CommandGateway';
import { LoopPhase } from '../contracts';

interface TransportCardProps {
  gateway: CommandGateway;
}

export default function TransportCard({ gateway }: TransportCardProps) {
  const phase = useAppStore(state => state.loop.phase);
  const playheadFrame = useAppStore(state => state.audio.playheadFrame);
  const loopFrames = useAppStore(state => state.loop.loopFrames);

  const getLedClass = (currentPhase: LoopPhase) => {
    switch (currentPhase) {
      case 'idle': return 'led-idle';
      case 'armed': return 'led-armed animate-pulse';
      case 'recording': return 'led-recording animate-pulse';
      case 'playing': return 'led-playing';
      case 'overdubbing': return 'led-overdubbing animate-pulse';
      case 'paused': return 'led-paused';
    }
  };

  const getPhaseLabel = (currentPhase: LoopPhase) => {
    return currentPhase.toUpperCase();
  };

  const handleRecordClick = () => {
    gateway.propose({ kind: 'RECORD', origin: 'ui' });
  };

  const handleStopClick = () => {
    gateway.propose({ kind: 'STOP', origin: 'ui' });
  };

  const handleClearClick = () => {
    if (window.confirm('Are you sure you want to clear this loop? This action cannot be undone.')) {
      gateway.propose({ kind: 'CLEAR', origin: 'ui' });
    }
  };

  const progressPercentage = loopFrames && loopFrames > 0 
    ? Math.round((playheadFrame / loopFrames) * 100) 
    : 0;

  return (
    <div className="flex flex-col gap-6 p-6 rounded-2xl bg-stitch-surface border border-stitch-border">
      {/* State LED Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-4 h-4 rounded-full led-indicator ${getLedClass(phase)}`} />
          <span className="text-xl font-bold tracking-wider" aria-live="polite">
            {getPhaseLabel(phase)}
          </span>
        </div>
        <span className="text-xs text-stitch-muted font-mono">
          Playhead: {playheadFrame} / {loopFrames || '0'} frames
        </span>
      </div>

      {/* Looper Playback Progress Bar */}
      <div className="relative w-full h-3 rounded-full bg-stitch-dark overflow-hidden border border-stitch-border">
        <div 
          className="absolute h-full bg-stitch-accent transition-all duration-75"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Button controls (Accessible with unique IDs and ARIA labels) */}
      <div className="grid grid-cols-3 gap-3">
        <button
          id="btn-looper-record"
          onClick={handleRecordClick}
          className={`py-3 px-4 font-semibold rounded-xl text-center shadow transition-all duration-150 active:scale-95 ${
            phase === 'recording' || phase === 'overdubbing'
              ? 'bg-stitch-recording text-stitch-dark hover:brightness-95'
              : 'bg-stitch-accent text-stitch-dark hover:brightness-105'
          }`}
          aria-label={phase === 'idle' ? 'Start recording first loop' : 'Commit layer and play'}
        >
          {phase === 'idle' || phase === 'armed' ? 'Record' : 'Commit'}
        </button>

        <button
          id="btn-looper-stop"
          onClick={handleStopClick}
          disabled={phase === 'idle'}
          className="py-3 px-4 font-semibold bg-stitch-card border border-stitch-border text-stitch-text hover:bg-stitch-border disabled:opacity-40 disabled:pointer-events-none rounded-xl text-center transition-all duration-150 active:scale-95"
          aria-label="Stop recording or playback"
        >
          Stop
        </button>

        <button
          id="btn-looper-clear"
          onClick={handleClearClick}
          disabled={phase === 'idle'}
          className="py-3 px-4 font-semibold bg-red-900/30 border border-red-500/30 text-red-300 hover:bg-red-900/50 disabled:opacity-40 disabled:pointer-events-none rounded-xl text-center transition-all duration-150 active:scale-95"
          aria-label="Reset looper session and delete all loops"
        >
          Clear
        </button>
      </div>
    </div>
  );
}
