// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { IndexedDbRepository } from './IndexedDbRepository';
import { Session } from '../contracts';

describe('IndexedDbRepository Unit Tests', () => {
  let repository: IndexedDbRepository;
  let mockSessions: Map<string, any>;
  let mockAssets: Map<string, any>;

  let mockDB: any;
  let mockTransaction: any;
  let mockOpenRequest: any;

  beforeEach(() => {
    mockSessions = new Map();
    mockAssets = new Map();

    const mockStore = (name: string) => {
      const map = name === 'sessions' ? mockSessions : mockAssets;
      return {
        put: vi.fn().mockImplementation((val) => {
          map.set(val.id, val);
          return { onsuccess: null };
        }),
        get: vi.fn().mockImplementation((id) => {
          const req = { onsuccess: null as any, result: map.get(id) };
          setTimeout(() => {
            if (req.onsuccess) req.onsuccess();
          }, 0);
          return req;
        }),
        getAll: vi.fn().mockImplementation(() => {
          const req = { onsuccess: null as any, result: Array.from(mockSessions.values()) };
          setTimeout(() => {
            if (req.onsuccess) req.onsuccess();
          }, 0);
          return req;
        }),
        delete: vi.fn().mockImplementation((id) => {
          map.delete(id);
          return { onsuccess: null };
        })
      };
    };

    let oncompleteCallback: any = null;
    mockTransaction = {
      objectStore: vi.fn().mockImplementation((name) => mockStore(name)),
      get oncomplete() {
        return oncompleteCallback;
      },
      set oncomplete(val) {
        oncompleteCallback = val;
        if (val) {
          setTimeout(() => {
            if (oncompleteCallback === val) {
              val();
            }
          }, 0);
        }
      },
      onerror: null as any
    };

    mockDB = {
      transaction: vi.fn().mockReturnValue(mockTransaction),
      objectStoreNames: { contains: vi.fn().mockReturnValue(true) }
    };

    mockOpenRequest = {
      onsuccess: null as any,
      onerror: null as any,
      result: mockDB
    };

    const mockIndexedDB = {
      open: vi.fn().mockReturnValue(mockOpenRequest)
    };

    vi.stubGlobal('indexedDB', mockIndexedDB);

    repository = new IndexedDbRepository();

    // Trigger open success
    setTimeout(() => {
      if (mockOpenRequest.onsuccess) {
        mockOpenRequest.onsuccess();
      }
    }, 0);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('should successfully save and get a session', async () => {
    const session: Session = {
      id: 'session-123',
      name: 'My Cool Loop',
      sampleRate: 48000,
      loopFrames: 96000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layers: [
        { id: 'layer-1', order: 0, gain: 1.0, muted: false }
      ]
    };

    const audioData = {
      'layer-1': [new Float32Array(128).fill(0.9)]
    };

    await repository.save(session, audioData);

    // Expect session to be stored in the map
    expect(mockSessions.get('session-123')).toEqual(session);

    // Fetch session back
    const retrieved = await repository.get('session-123');
    expect(retrieved).toEqual(session);
  });

  it('should retrieve serialised Float32Array channels successfully', async () => {
    const session: Session = {
      id: 'session-123',
      name: 'Loop 2',
      sampleRate: 48000,
      loopFrames: 96000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layers: [
        { id: 'layer-1', order: 0, gain: 1.0, muted: false }
      ]
    };

    const rawBuffer = new Float32Array(128).fill(0.4);
    // Mimic database structure: assets store ArrayBuffers
    mockAssets.set('layer-1', {
      id: 'layer-1',
      sessionId: 'session-123',
      channels: [rawBuffer.buffer]
    });
    mockSessions.set('session-123', session);

    const retrievedAudio = await repository.getAudioData('session-123');
    expect(retrievedAudio).toBeDefined();
    expect(retrievedAudio!['layer-1']).toBeDefined();
    expect(retrievedAudio!['layer-1'][0]).toBeInstanceOf(Float32Array);
    expect(retrievedAudio!['layer-1'][0][0]).toBeCloseTo(0.4, 5);
  });

  it('should delete sessions and corresponding audio layers on remove', async () => {
    const session: Session = {
      id: 'session-delete',
      name: 'To Delete',
      sampleRate: 48000,
      loopFrames: 96000,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      layers: [
        { id: 'layer-del-1', order: 0, gain: 1.0, muted: false }
      ]
    };

    mockSessions.set('session-delete', session);
    mockAssets.set('layer-del-1', { id: 'layer-del-1' });

    await repository.remove('session-delete');

    expect(mockSessions.has('session-delete')).toBe(false);
    expect(mockAssets.has('layer-del-1')).toBe(false);
  });
});
