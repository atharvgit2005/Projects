import { useAppStore } from '../stores/useAppStore';
import { CommandGateway } from '../controllers/CommandGateway';
import { LoopController } from '../controllers/LoopController';

interface LayerListProps {
  gateway: CommandGateway;
  controller: LoopController;
}

export default function LayerList({ gateway, controller }: LayerListProps) {
  const layers = useAppStore(state => state.loop.layers);
  const phase = useAppStore(state => state.loop.phase);
  const loopFrames = useAppStore(state => state.loop.loopFrames);
  const sampleRate = useAppStore(state => state.loop.sampleRate);

  const handleMuteToggle = (layerId: string, currentMuted: boolean) => {
    controller.setLayerParams(layerId, undefined, !currentMuted, undefined);
  };

  const handleSoloToggle = (layerId: string) => {
    // Check if this layer is already solo'd by checking local state
    const layer = layers.find(l => l.id === layerId);
    // We pass solo=true to toggle — worklet handles clearing others
    controller.setLayerParams(layerId, undefined, undefined, layer ? !(layer as any).solo : true);
  };

  const handleVolumeChange = (layerId: string, val: number) => {
    controller.setLayerParams(layerId, val, undefined, undefined);
  };

  const handleUndoClick = () => {
    gateway.propose({ kind: 'UNDO', origin: 'ui' });
  };

  const handleOverdubClick = () => {
    gateway.propose({ kind: 'OVERDUB', origin: 'ui' });
  };

  const handlePauseResumeClick = () => {
    if (phase === 'paused') {
      gateway.propose({ kind: 'RESUME', origin: 'ui' });
    } else {
      gateway.propose({ kind: 'PAUSE', origin: 'ui' });
    }
  };

  const loopDurationSec = loopFrames && sampleRate
    ? (loopFrames / sampleRate).toFixed(2)
    : null;

  return (
    <div className="flex flex-col gap-4 p-6 rounded-2xl bg-stitch-surface border border-stitch-border h-full">
      <div className="flex justify-between items-center">
        <h2 className="text-md font-bold text-stitch-text tracking-wide uppercase">Loop Layers</h2>
        <div className="flex items-center gap-2 text-xs text-stitch-muted font-mono">
          <span>{layers.length} {layers.length === 1 ? 'layer' : 'layers'}</span>
          {loopDurationSec && (
            <span className="px-1.5 py-0.5 rounded bg-stitch-dark border border-stitch-border">
              {loopDurationSec}s
            </span>
          )}
        </div>
      </div>

      {/* Layer stack */}
      <div className="flex-1 overflow-y-auto min-h-[160px] max-h-[320px] flex flex-col gap-2 pr-1">
        {layers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center border-2 border-dashed border-stitch-border rounded-xl text-center p-6">
            <span className="text-sm text-stitch-muted">No layers yet. Press Record to capture your first loop.</span>
          </div>
        ) : (
          [...layers].reverse().map((layer, revIdx) => {
            const order = layers.length - revIdx;
            const isMuted = (layer as any).muted;
            const isSolo = (layer as any).solo;
            const gain = (layer as any).gain ?? 1.0;

            return (
              <div
                key={layer.id}
                className={`flex flex-col gap-2 p-3 rounded-xl border transition-all duration-150 ${
                  isMuted
                    ? 'bg-stitch-dark border-stitch-border opacity-50'
                    : 'bg-stitch-card border-stitch-border'
                }`}
              >
                {/* Layer header */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold font-mono text-stitch-muted">
                    Layer {order}
                  </span>

                  <div className="flex items-center gap-1.5">
                    {/* Solo */}
                    <button
                      id={`btn-solo-${layer.id}`}
                      onClick={() => handleSoloToggle(layer.id)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all duration-100 ${
                        isSolo
                          ? 'bg-stitch-overdubbing text-stitch-dark border-stitch-overdubbing'
                          : 'bg-transparent border-stitch-border text-stitch-muted hover:text-stitch-text'
                      }`}
                      aria-label={isSolo ? `Unsolo layer ${order}` : `Solo layer ${order}`}
                    >
                      S
                    </button>

                    {/* Mute */}
                    <button
                      id={`btn-mute-${layer.id}`}
                      onClick={() => handleMuteToggle(layer.id, isMuted)}
                      className={`px-2 py-0.5 text-[10px] font-bold rounded border transition-all duration-100 ${
                        isMuted
                          ? 'bg-stitch-recording/20 border-stitch-recording/50 text-stitch-recording'
                          : 'bg-transparent border-stitch-border text-stitch-muted hover:text-stitch-text'
                      }`}
                      aria-label={isMuted ? `Unmute layer ${order}` : `Mute layer ${order}`}
                    >
                      M
                    </button>
                  </div>
                </div>

                {/* Volume slider */}
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stitch-muted uppercase w-5">Vol</span>
                  <input
                    id={`layer-vol-${layer.id}`}
                    type="range"
                    min="0"
                    max="1.5"
                    step="0.05"
                    value={gain}
                    onChange={(e) => handleVolumeChange(layer.id, parseFloat(e.target.value))}
                    className="flex-1 accent-stitch-accent bg-stitch-dark h-1 rounded cursor-pointer"
                    aria-label={`Volume for layer ${order}`}
                  />
                  <span className="text-[10px] font-mono text-stitch-muted w-8 text-right">
                    {Math.round(gain * 100)}%
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Transport actions row */}
      <div className="grid grid-cols-3 gap-2">
        <button
          id="btn-looper-overdub"
          onClick={handleOverdubClick}
          disabled={phase === 'idle' || phase === 'armed' || phase === 'recording'}
          className={`py-2 px-2 font-semibold rounded-xl text-xs text-center border shadow transition-all duration-150 active:scale-95 ${
            phase === 'overdubbing'
              ? 'bg-stitch-overdubbing text-stitch-dark border-stitch-overdubbing hover:brightness-95'
              : 'bg-stitch-card border-stitch-border text-stitch-text hover:bg-stitch-border disabled:opacity-40 disabled:pointer-events-none'
          }`}
          aria-label={phase === 'overdubbing' ? 'Stop overdubbing' : 'Start overdubbing layer'}
        >
          {phase === 'overdubbing' ? 'Stop OD' : 'Overdub'}
        </button>

        <button
          id="btn-looper-pause-resume"
          onClick={handlePauseResumeClick}
          disabled={phase === 'idle' || phase === 'armed' || phase === 'recording'}
          className="py-2 px-2 font-semibold bg-stitch-card border border-stitch-border text-stitch-text hover:bg-stitch-border disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs text-center transition-all duration-150 active:scale-95"
          aria-label={phase === 'paused' ? 'Resume playback' : 'Pause playback'}
        >
          {phase === 'paused' ? 'Resume' : 'Pause'}
        </button>

        <button
          id="btn-looper-undo"
          onClick={handleUndoClick}
          disabled={layers.length === 0}
          className="py-2 px-2 font-semibold bg-stitch-card border border-stitch-border text-stitch-text hover:bg-stitch-border disabled:opacity-40 disabled:pointer-events-none rounded-xl text-xs text-center transition-all duration-150 active:scale-95"
          aria-label="Undo last recorded layer"
        >
          Undo
        </button>
      </div>
    </div>
  );
}
