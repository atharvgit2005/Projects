import { Session, SessionSummary, SessionRepository } from '../contracts';

const DB_NAME = 'mobius';
const DB_VERSION = 1;
const SESSIONS_STORE = 'sessions';
const ASSETS_STORE = 'assets';

export class IndexedDbRepository implements SessionRepository {
  private dbPromise: Promise<IDBDatabase> | null = null;

  constructor() {}

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) {
      return this.dbPromise;
    }

    this.dbPromise = new Promise((resolve, reject) => {
      // Check for browser indexedDB support
      const indexedDB = window.indexedDB || (window as any).mozIndexedDB || (window as any).webkitIndexedDB || (window as any).msIndexedDB;
      if (!indexedDB) {
        reject(new Error('IndexedDB is not supported in this browser.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (_event) => {
        const db = request.result;
        
        // 1. Sessions store
        if (!db.objectStoreNames.contains(SESSIONS_STORE)) {
          const sessionsStore = db.createObjectStore(SESSIONS_STORE, { keyPath: 'id' });
          sessionsStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        }

        // 2. Audio assets store (PCM channels keyed by layerId)
        if (!db.objectStoreNames.contains(ASSETS_STORE)) {
          db.createObjectStore(ASSETS_STORE, { keyPath: 'id' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        this.dbPromise = null;
        reject(request.error || new Error('Failed to open IndexedDB.'));
      };
    });

    return this.dbPromise;
  }

  public async save(session: Session, audioData?: Record<string, Float32Array[]>): Promise<void> {
    const db = await this.getDB();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([SESSIONS_STORE, ASSETS_STORE], 'readwrite');

      transaction.onerror = () => {
        const error = transaction.error;
        if (error && (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
          reject(new Error('STORAGE_QUOTA: Storage quota exceeded. Save failed.'));
        } else {
          reject(error || new Error('Failed to save session.'));
        }
      };

      // 1. Write session metadata
      const sessionsStore = transaction.objectStore(SESSIONS_STORE);
      sessionsStore.put(session);

      // 2. Write audio data if provided
      if (audioData) {
        const assetsStore = transaction.objectStore(ASSETS_STORE);
        for (const layerId in audioData) {
          const channels = audioData[layerId];
          
          // Map Float32Arrays to ArrayBuffers for direct structural cloning persistence
          const serializedChannels = channels.map(arr => arr.buffer);
          
          assetsStore.put({
            id: layerId,
            sessionId: session.id,
            channels: serializedChannels
          });
        }
      }

      transaction.oncomplete = () => {
        resolve();
      };
    });
  }

  public async get(id: string): Promise<Session | null> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SESSIONS_STORE], 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error || new Error(`Failed to load session ${id}`));
      };
    });
  }

  public async getAudioData(sessionId: string): Promise<Record<string, Float32Array[]> | null> {
    const db = await this.getDB();
    const session = await this.get(sessionId);
    if (!session) return null;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([ASSETS_STORE], 'readonly');
      const store = transaction.objectStore(ASSETS_STORE);
      
      const audioData: Record<string, Float32Array[]> = {};
      let loadedCount = 0;

      if (session.layers.length === 0) {
        resolve(audioData);
        return;
      }

      session.layers.forEach((layer) => {
        const request = store.get(layer.id);
        
        request.onsuccess = () => {
          const result = request.result;
          if (result && result.channels) {
            // Reconstruct Float32Arrays from stored ArrayBuffers
            audioData[layer.id] = (result.channels as ArrayBuffer[]).map(
              buf => new Float32Array(buf)
            );
          }
          
          loadedCount++;
          if (loadedCount === session.layers.length) {
            resolve(audioData);
          }
        };

        request.onerror = () => {
          reject(request.error || new Error(`Failed to load audio layer ${layer.id}`));
        };
      });
    });
  }

  public async list(): Promise<SessionSummary[]> {
    const db = await this.getDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([SESSIONS_STORE], 'readonly');
      const store = transaction.objectStore(SESSIONS_STORE);
      const request = store.getAll();

      request.onsuccess = () => {
        const sessions: Session[] = request.result || [];
        const summaries: SessionSummary[] = sessions.map(s => ({
          id: s.id,
          name: s.name,
          updatedAt: s.updatedAt,
          createdAt: s.createdAt,
          layerCount: s.layers.length
        }));
        
        // Sort by updatedAt descending
        summaries.sort((a, b) => b.updatedAt - a.updatedAt);
        resolve(summaries);
      };

      request.onerror = () => {
        reject(request.error || new Error('Failed to list sessions.'));
      };
    });
  }

  public async remove(id: string): Promise<void> {
    const db = await this.getDB();
    const session = await this.get(id);

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([SESSIONS_STORE, ASSETS_STORE], 'readwrite');
      
      transaction.onerror = () => {
        reject(transaction.error || new Error(`Failed to delete session ${id}`));
      };

      // 1. Delete session metadata
      const sessionsStore = transaction.objectStore(SESSIONS_STORE);
      sessionsStore.delete(id);

      // 2. Delete all related assets
      if (session && session.layers.length > 0) {
        const assetsStore = transaction.objectStore(ASSETS_STORE);
        session.layers.forEach((layer) => {
          assetsStore.delete(layer.id);
        });
      }

      transaction.oncomplete = () => {
        resolve();
      };
    });
  }
}
