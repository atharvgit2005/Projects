// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { GestureController } from './GestureController';
import { useAppStore } from '../stores/useAppStore';

class MockWorker {
  public postMessage = vi.fn();
  private listeners = new Set<any>();

  public addEventListener = vi.fn().mockImplementation((type: string, listener: any) => {
    if (type === 'message') this.listeners.add(listener);
  });

  public removeEventListener = vi.fn().mockImplementation((type: string, listener: any) => {
    if (type === 'message') this.listeners.delete(listener);
  });

  public onmessage: any = null;

  public triggerMessage(data: any) {
    if (this.onmessage) {
      this.onmessage({ data });
    }
    this.listeners.forEach((l) => l({ data }));
  }
}



describe('GestureController', () => {
  let controller: GestureController;
  let mockWorkerInstance: any;

  beforeEach(() => {
    vi.stubGlobal('Worker', MockWorker);
    useAppStore.setState({
      gesture: {
        enabled: false,
        isTracking: false,
        confidence: 0,
        lastProposedCommand: null,
        calibrationProgress: 0,
        isCalibrated: false,
      },
      diagnostics: {
        lastError: null,
        lastFault: null,
        isMicGranted: false,
        isCameraGranted: false,
        fps: 0,
      }
    });

    controller = new GestureController();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize and spawn the worker successfully', async () => {
    const initPromise = controller.initialize();

    // Retrieve worker mock instance created by the controller
    mockWorkerInstance = (controller as any).worker;
    expect(mockWorkerInstance).toBeDefined();

    // Verify init message was posted
    expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({ type: 'init' });

    // Simulate worker ready callback to resolve promise
    mockWorkerInstance.triggerMessage({ type: 'ready' });

    await initPromise;

    // Check store is updated to calibrated
    expect(useAppStore.getState().gesture.isCalibrated).toBe(true);
  });

  it('should report worker errors to the Zustand diagnostics store', async () => {
    const initPromise = controller.initialize();
    mockWorkerInstance = (controller as any).worker;

    // Simulate worker error callback
    mockWorkerInstance.triggerMessage({ type: 'error', error: 'MediaPipe model download failure' });

    await expect(initPromise).rejects.toThrow('MediaPipe model download failure');
  });

  it('should register proposal listeners and forward classifications', async () => {
    const initPromise = controller.initialize();
    mockWorkerInstance = (controller as any).worker;
    mockWorkerInstance.triggerMessage({ type: 'ready' });
    await initPromise;

    const proposalSpy = vi.fn();
    controller.onProposal(proposalSpy);

    // Simulate worker outputting a classification result proposal
    const mockResultMsg = {
      type: 'result',
      classification: {
        confidence: 0.95,
        activeGesture: 'RECORD',
        proposal: { kind: 'RECORD', origin: 'gesture' }
      }
    };

    mockWorkerInstance.triggerMessage(mockResultMsg);

    // Assert that listener was called with command proposal
    expect(proposalSpy).toHaveBeenCalledWith({ kind: 'RECORD', origin: 'gesture' });

    // Assert Zustand store projection was updated
    expect(useAppStore.getState().gesture.confidence).toBe(0.95);
    expect(useAppStore.getState().gesture.lastProposedCommand).toBe('RECORD');
  });
});
