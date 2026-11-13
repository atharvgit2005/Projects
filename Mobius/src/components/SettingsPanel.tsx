import { useAppStore } from '../stores/useAppStore';
import { QuantizeMode } from '../contracts';
import { LoopController } from '../controllers/LoopController';

interface SettingsPanelProps {
  controller: LoopController;
}

export default function SettingsPanel({ controller }: SettingsPanelProps) {
  const settings = useAppStore(state => state.settings);

  const handleBpmChange = (bpm: number) => {
    useAppStore.getState().updateSettings({ bpm: Math.max(40, Math.min(240, bpm)) });
  };

  const handleQuantizeChange = (quantize: QuantizeMode) => {
    useAppStore.getState().updateSettings({ quantize });
  };

  const handleMetronomeToggle = () => {
    const store = useAppStore.getState();
    store.updateSettings({ metronomeEnabled: !store.settings.metronomeEnabled });
  };

  const handleInputVolumeChange = (vol: number) => {
    useAppStore.getState().updateSettings({ inputVolume: vol });
    controller.setInputGain(vol);
  };

  const handleOutputVolumeChange = (vol: number) => {
    useAppStore.getState().updateSettings({ outputVolume: vol });
    controller.setMasterGain(vol);
  };

  return (
    <div className="flex flex-col gap-5 p-6 rounded-2xl bg-stitch-surface border border-stitch-border h-full">
      <h2 className="text-md font-bold text-stitch-text tracking-wide uppercase">Settings</h2>

      {/* Quantization Modes */}
      <div className="flex flex-col gap-2">
        <label className="text-xs text-stitch-muted uppercase tracking-wider">Quantization</label>
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-stitch-dark rounded-xl border border-stitch-border">
          {(['off', 'beat', 'bar', 'loop'] as QuantizeMode[]).map((mode) => (
            <button
              key={mode}
              id={`btn-quantize-${mode}`}
              onClick={() => handleQuantizeChange(mode)}
              className={`py-1.5 text-xs font-semibold rounded-lg capitalize transition-all duration-150 ${
                settings.quantize === mode
                  ? 'bg-stitch-accent text-stitch-dark font-bold'
                  : 'text-stitch-muted hover:text-stitch-text'
              }`}
              aria-label={`Set quantization to ${mode}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Tempo BPM Control */}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center text-xs text-stitch-muted">
          <label htmlFor="input-settings-bpm">TEMPO (BPM)</label>
          <input
            id="input-settings-bpm"
            type="number"
            min="40"
            max="240"
            value={settings.bpm}
            onChange={(e) => handleBpmChange(parseInt(e.target.value) || 120)}
            className="w-12 bg-stitch-dark text-right border border-stitch-border rounded p-0.5 font-mono text-stitch-text"
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            id="slider-settings-bpm"
            type="range"
            min="40"
            max="240"
            value={settings.bpm}
            onChange={(e) => handleBpmChange(parseInt(e.target.value))}
            className="w-full accent-stitch-accent bg-stitch-dark h-1 rounded"
            aria-label="Tempo BPM slider"
          />
        </div>
      </div>

      {/* Metronome control */}
      <div className="flex justify-between items-center py-1">
        <div className="flex flex-col gap-0.5">
          <label htmlFor="btn-metronome-toggle" className="text-sm font-semibold text-stitch-text">Metronome Click</label>
          <span className="text-xs text-stitch-muted">Provides count-in clicks</span>
        </div>
        <button
          id="btn-metronome-toggle"
          onClick={handleMetronomeToggle}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-stitch-accent ${
            settings.metronomeEnabled ? 'bg-stitch-accent' : 'bg-stitch-border'
          }`}
          aria-label={settings.metronomeEnabled ? 'Disable metronome click' : 'Enable metronome click'}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-stitch-dark transition-transform ${
              settings.metronomeEnabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </div>

      <hr className="border-stitch-border" />

      {/* Levels configuration sliders */}
      <div className="flex flex-col gap-4">
        {/* Input gain control */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-stitch-muted">
            <label htmlFor="slider-input-gain">Input Level</label>
            <span className="font-mono">{Math.round(settings.inputVolume * 100)}%</span>
          </div>
          <input
            id="slider-input-gain"
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={settings.inputVolume}
            onChange={(e) => handleInputVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-stitch-accent bg-stitch-dark h-1 rounded"
            aria-label="Input gain slider"
          />
        </div>

        {/* Master output control */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between text-xs text-stitch-muted">
            <label htmlFor="slider-master-gain">Master Volume</label>
            <span className="font-mono">{Math.round(settings.outputVolume * 100)}%</span>
          </div>
          <input
            id="slider-master-gain"
            type="range"
            min="0"
            max="1.5"
            step="0.05"
            value={settings.outputVolume}
            onChange={(e) => handleOutputVolumeChange(parseFloat(e.target.value))}
            className="w-full accent-stitch-accent bg-stitch-dark h-1 rounded"
            aria-label="Master output gain slider"
          />
        </div>
      </div>
    </div>
  );
}
