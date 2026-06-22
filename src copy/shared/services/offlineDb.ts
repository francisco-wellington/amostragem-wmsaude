import Dexie, { Table } from 'dexie';
import { InspectionSession, CorrectiveAction } from '../types';

export class OfflineStorage extends Dexie {
  draftSessions!: Table<InspectionSession>;
  pendingActions!: Table<CorrectiveAction>;

  constructor() {
    super('WMSaudeOfflineCache');
    this.version(1).stores({
      draftSessions: 'id, userId, completed, locality',
      pendingActions: 'id, sessionId, userId, resolved'
    });
  }

  async saveDraftSession(session: InspectionSession) {
    return await this.draftSessions.put(session);
  }

  async getDraftSessions(userId: string) {
    if (userId === 'any') return await this.draftSessions.toArray();
    return await this.draftSessions.where('userId').equals(userId).toArray();
  }

  async deleteDraftSession(id: string) {
    return await this.draftSessions.delete(id);
  }

  async clearCompletedSessions() {
    return await this.draftSessions.where('completed').equals(1).delete();
  }

  // Action Methods
  async saveAction(action: CorrectiveAction) {
    return await this.pendingActions.put(action);
  }

  async getActions(userId: string) {
    return await this.pendingActions.where('userId').equals(userId).toArray();
  }

  async deleteAction(id: string) {
    return await this.pendingActions.delete(id);
  }
}

export const offlineDb = new OfflineStorage();
