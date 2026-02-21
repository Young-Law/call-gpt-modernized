import type { ISessionStore, SessionState } from '../types/index';
import type { ISessionStore, SessionState } from '../types/index.js';

export class MemorySessionStore implements ISessionStore {
  public enabled = true;
  private sessions = new Map<string, SessionState>();

  async setSessionValue(sessionId: string | null, data: SessionState): Promise<void> {
    if (!sessionId) {
      return;
    }
    this.sessions.set(sessionId, data);
  }
}

export default MemorySessionStore;
