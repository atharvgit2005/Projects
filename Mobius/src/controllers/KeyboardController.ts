import { CommandGateway } from './CommandGateway';
import { CommandProposal } from '../contracts';
import { useAppStore } from '../stores/useAppStore';

export class KeyboardController {
  private gateway: CommandGateway;
  private handleKeyDownBound: (e: KeyboardEvent) => void;

  constructor(gateway: CommandGateway) {
    this.gateway = gateway;
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
  }

  public initialize(): void {
    window.addEventListener('keydown', this.handleKeyDownBound);
    console.debug('[KeyboardController] Initialized global keyboard listeners.');
  }

  public dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDownBound);
    console.debug('[KeyboardController] Disposed global keyboard listeners.');
  }

  private async handleKeyDown(event: KeyboardEvent): Promise<void> {
    // 1. Check if user is typing in an input control or form element
    if (this.isUserTyping()) {
      return;
    }

    let proposal: CommandProposal | null = null;
    let handled = false;

    const key = event.key.toLowerCase();
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;

    // 2. Map hotkeys to command proposals according to Volume V accessibility guidelines
    if (event.code === 'Space') {
      // Space -> Record / Stop
      proposal = { kind: 'RECORD', origin: 'keyboard' };
      handled = true;
    } else if (key === 'o') {
      // O -> Overdub
      proposal = { kind: 'OVERDUB', origin: 'keyboard' };
      handled = true;
    } else if (key === 'z' && isCtrlOrCmd) {
      // Ctrl/Cmd+Z -> Undo
      proposal = { kind: 'UNDO', origin: 'keyboard' };
      handled = true;
    } else if (event.key === 'Backspace' && event.shiftKey) {
      // Shift+Backspace -> Clear
      proposal = { kind: 'CLEAR', origin: 'keyboard' };
      handled = true;
    } else if (key === 'm') {
      // M -> Metronome persistent toggle (direct settings update)
      const store = useAppStore.getState();
      store.updateSettings({ metronomeEnabled: !store.settings.metronomeEnabled });
      handled = true;
    } else if (event.key === ',') {
      // , -> Settings Modal toggle
      console.debug('[KeyboardController] Settings modal shortcut triggered.');
      handled = true;
    }

    if (handled) {
      event.preventDefault();
      if (proposal) {
        await this.gateway.propose(proposal);
      }
    }
  }

  private isUserTyping(): boolean {
    const activeEl = document.activeElement;
    if (!activeEl) return false;

    const tagName = activeEl.tagName.toUpperCase();
    const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT';
    const isContentEditable = activeEl.getAttribute('contenteditable') === 'true';

    return isInput || isContentEditable;
  }
}
