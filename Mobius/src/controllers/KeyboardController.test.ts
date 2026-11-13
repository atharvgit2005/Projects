// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { KeyboardController } from './KeyboardController';
import { CommandGateway } from './CommandGateway';
import { LoopController } from './LoopController';
import { useAppStore } from '../stores/useAppStore';

describe('KeyboardController', () => {
  let controller: KeyboardController;
  let mockGateway: CommandGateway;
  let proposeSpy: any;

  beforeEach(() => {
    // Setup stores
    useAppStore.setState({
      settings: {
        quantize: 'off',
        metronomeEnabled: false,
        bpm: 120,
        timeSignature: '4/4',
        inputVolume: 1.0,
        outputVolume: 1.0,
      }
    });

    const loopController = new LoopController();
    mockGateway = new CommandGateway(loopController);
    proposeSpy = vi.spyOn(mockGateway, 'propose').mockImplementation(async () => {
      return { commandId: 'test-id', status: 'accepted' };
    });

    controller = new KeyboardController(mockGateway);
    controller.initialize();
  });

  afterEach(() => {
    controller.dispose();
    vi.restoreAllMocks();
  });

  it('should dispatch RECORD proposal when Space is pressed', () => {
    const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
    window.dispatchEvent(event);

    expect(proposeSpy).toHaveBeenCalledWith({ kind: 'RECORD', origin: 'keyboard' });
  });

  it('should dispatch OVERDUB proposal when O is pressed', () => {
    const event = new KeyboardEvent('keydown', { key: 'o', bubbles: true });
    window.dispatchEvent(event);

    expect(proposeSpy).toHaveBeenCalledWith({ kind: 'OVERDUB', origin: 'keyboard' });
  });

  it('should dispatch UNDO proposal when Ctrl+Z is pressed', () => {
    const event = new KeyboardEvent('keydown', { key: 'z', ctrlKey: true, bubbles: true });
    window.dispatchEvent(event);

    expect(proposeSpy).toHaveBeenCalledWith({ kind: 'UNDO', origin: 'keyboard' });
  });

  it('should dispatch CLEAR proposal when Shift+Backspace is pressed', () => {
    const event = new KeyboardEvent('keydown', { key: 'Backspace', shiftKey: true, bubbles: true });
    window.dispatchEvent(event);

    expect(proposeSpy).toHaveBeenCalledWith({ kind: 'CLEAR', origin: 'keyboard' });
  });

  it('should toggle metronome setting when M is pressed without proposing command', () => {
    expect(useAppStore.getState().settings.metronomeEnabled).toBe(false);

    const event = new KeyboardEvent('keydown', { key: 'm', bubbles: true });
    window.dispatchEvent(event);

    expect(proposeSpy).not.toHaveBeenCalled();
    expect(useAppStore.getState().settings.metronomeEnabled).toBe(true);
  });

  it('should ignore keyboard events if focused element is an input', () => {
    // Create a temporary input element, mount it, and focus it
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', { code: 'Space', bubbles: true });
    window.dispatchEvent(event);

    expect(proposeSpy).not.toHaveBeenCalled();

    // Clean up input element
    document.body.removeChild(input);
  });
});
