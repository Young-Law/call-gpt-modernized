import { createSessionStore } from '../src/state/createSessionStore.js';
import { RedisSessionStore } from '../src/state/RedisSessionStore.js';
import { FirestoreSessionStore } from '../src/state/FirestoreSessionStore.js';
import { MemorySessionStore } from '../src/state/MemorySessionStore.js';

describe('createSessionStore', () => {
  const oldEnv = process.env;

  beforeEach(() => {
    process.env = { ...oldEnv };
    delete process.env.SESSION_STORE_BACKEND;
    delete process.env.REDIS_URL;
    delete process.env.GOOGLE_CLOUD_PROJECT;
  });

  afterAll(() => {
    process.env = oldEnv;
  });

  it('returns redis store for redis backend', () => {
    process.env.SESSION_STORE_BACKEND = 'redis';
    process.env.REDIS_URL = 'redis://localhost:6379';
    const store = createSessionStore();
    expect(store).toBeInstanceOf(RedisSessionStore);
  });

  it('returns firestore store for firestore backend', () => {
    process.env.SESSION_STORE_BACKEND = 'firestore';
    process.env.GOOGLE_CLOUD_PROJECT = 'project-a';
    const store = createSessionStore();
    expect(store).toBeInstanceOf(FirestoreSessionStore);
  });

  it('defaults to memory backend with no env configured', () => {
    const store = createSessionStore();
    expect(store).toBeInstanceOf(MemorySessionStore);
  });
});
