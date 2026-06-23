import Dexie, { Table } from 'dexie';
import { InspectionSession, CorrectiveAction } from '../types';

// Helper to check if IndexedDB is accessible
export function checkIndexedDbAccessible(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    if (!('indexedDB' in window)) return false;
    const idb = window.indexedDB;
    if (!idb) return false;
    return true;
  } catch (e) {
    return false;
  }
}

// Helper to check if LocalStorage is accessible
export function checkLocalStorageAccessible(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    localStorage.setItem('__test_ls_wm_saude__', 'test');
    localStorage.removeItem('__test_ls_wm_saude__');
    return true;
  } catch (e) {
    return false;
  }
}

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

export class MockOfflineStorage {
  private drafts: Map<string, InspectionSession> = new Map();
  private actions: Map<string, CorrectiveAction> = new Map();

  constructor() {
    this.loadFromLocalStorage();
  }

  private loadFromLocalStorage() {
    try {
      if (checkLocalStorageAccessible()) {
        const storedDrafts = localStorage.getItem('wm_saude_mock_drafts');
        if (storedDrafts) {
          const parsed = JSON.parse(storedDrafts);
          Object.entries(parsed).forEach(([k, v]) => {
            this.drafts.set(k, v as InspectionSession);
          });
        }
        const storedActions = localStorage.getItem('wm_saude_mock_actions');
        if (storedActions) {
          const parsed = JSON.parse(storedActions);
          Object.entries(parsed).forEach(([k, v]) => {
            this.actions.set(k, v as CorrectiveAction);
          });
        }
      }
    } catch (e) {
      console.warn('Failed to load mock offline database from localStorage', e);
    }
  }

  private saveToLocalStorage() {
    try {
      if (checkLocalStorageAccessible()) {
        const draftsObj = Object.fromEntries(this.drafts.entries());
        localStorage.setItem('wm_saude_mock_drafts', JSON.stringify(draftsObj));
        const actionsObj = Object.fromEntries(this.actions.entries());
        localStorage.setItem('wm_saude_mock_actions', JSON.stringify(actionsObj));
      }
    } catch (e) {
      console.warn('Failed to save mock offline database to localStorage', e);
    }
  }

  async saveDraftSession(session: InspectionSession) {
    this.drafts.set(session.id, session);
    this.saveToLocalStorage();
    return session.id;
  }

  async getDraftSessions(userId: string) {
    const list = Array.from(this.drafts.values());
    if (userId === 'any') {
      return list;
    }
    return list.filter(d => d.userId === userId);
  }

  async deleteDraftSession(id: string) {
    this.drafts.delete(id);
    this.saveToLocalStorage();
  }

  async clearCompletedSessions() {
    for (const [id, session] of this.drafts.entries()) {
      if (session.completed) {
        this.drafts.delete(id);
      }
    }
    this.saveToLocalStorage();
  }

  // Action Methods
  async saveAction(action: CorrectiveAction) {
    this.actions.set(action.id, action);
    this.saveToLocalStorage();
    return action.id;
  }

  async getActions(userId: string) {
    return Array.from(this.actions.values()).filter(a => a.userId === userId);
  }

  async deleteAction(id: string) {
    this.actions.delete(id);
    this.saveToLocalStorage();
  }
}

// Instanciar o melhor storage disponível com segurança completa
let dbInstance: any;
try {
  if (checkIndexedDbAccessible()) {
    dbInstance = new OfflineStorage();
  } else {
    console.warn('IndexedDB not accessible. Using fallback MockOfflineStorage.');
    dbInstance = new MockOfflineStorage();
  }
} catch (e) {
  console.error('Error instantiating OfflineStorage, falling back to MockOfflineStorage', e);
  dbInstance = new MockOfflineStorage();
}

export const offlineDb = dbInstance;

