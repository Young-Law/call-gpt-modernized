import type { ISessionStore } from '../types/index.js';
import { RedisSessionStore } from './RedisSessionStore.js';
import { FirestoreSessionStore } from './FirestoreSessionStore.js';
import { MemorySessionStore } from './MemorySessionStore.js';

export type SessionStoreBackend = 'redis' | 'firestore' | 'memory';

function getBackend(): SessionStoreBackend {
  const backend = (process.env.SESSION_STORE_BACKEND || '').trim().toLowerCase();
  if (backend === 'redis' || backend === 'firestore' || backend === 'memory') {
    return backend;
  }

  if (process.env.REDIS_URL) {
    return 'redis';
  }

  return 'memory';
}

export function createSessionStore(): ISessionStore {
  const backend = getBackend();

  if (backend === 'redis') {
    return new RedisSessionStore();
  }

  if (backend === 'firestore') {
    return new FirestoreSessionStore();
  }

  return new MemorySessionStore();
}
