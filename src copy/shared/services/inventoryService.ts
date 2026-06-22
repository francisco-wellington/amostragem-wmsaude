import Papa from 'papaparse';
import { InventoryItem, InspectionSession, CorrectiveAction } from '../types';
import { 
  db, 
  auth, 
  handleFirestoreError, 
  OperationType 
} from './firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  updateDoc,
  onSnapshot,
  deleteDoc
} from 'firebase/firestore';
import { offlineDb } from './offlineDb';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vT0v9vAAd_txX0HISxNlv1884xBPB6qhnwVLd_fHhSUb5JtN18pLWaHvLeDMLDOPsBjWwsKOSrmUffo/pub?gid=1907639308&single=true&output=csv';
// const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vR4-9IndEB7igdYCD7x-3U45wVHoa8WVQAt3xosBx-W7alL2wkZnTih9WM2RVMYW9F3xUMcE2nt5vHx/pub?gid=1907639308&single=true&output=csv';

const STORAGE_KEY_INVENTORY = 'wm_saude_inventory';

export async function fetchInventoryData(): Promise<InventoryItem[]> {
  const cacheBuster = `&t=${Date.now()}`;
  
  return new Promise((resolve, reject) => {
    // Try to load from cache first for immediate UI update if needed
    const cached = localStorage.getItem(STORAGE_KEY_INVENTORY);
    let cachedData: InventoryItem[] = [];
    if (cached) {
      try {
        cachedData = JSON.parse(cached);
      } catch (e) {
        console.error('Error parsing cached inventory:', e);
      }
    }

    Papa.parse(CSV_URL + cacheBuster, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const mappedData = (results.data as any[])
          .map(row => {
            const estabelecimento = row['NOME DO ESTABELECIMENTO'] || '';
            const instalacao = row['LOCAL DE INSTALAÇÃO'] || '';
            const localidadeCompleta = (instalacao && instalacao !== estabelecimento)
              ? `${estabelecimento} - ${instalacao}` 
              : estabelecimento;

            return {
              Localidade: localidadeCompleta,
              Cidade: row['MUNICÍPIO'] || '',
              Patrimônio: row['PATRIMÔNIO'] || '',
              Descrição: `${row['TIPO DE EQUIPAMENTO'] || ''} ${row['MARCA'] || ''} ${row['MODELO'] || ''}`.trim(),
              Localização: instalacao,
              Status: row['STATUS'] || '',
              Marca: row['MARCA'] || '',
              Modelo: row['MODELO'] || '',
              ...row
            };
          })
          .filter(item => {
            // Regra de exclusão para Teresina
            if (item.Cidade.toUpperCase() === 'TERESINA') {
              const excluded = [
                "Sede WM - Não localizado", 
                "Sede WM - Vendido", 
                "Substituido"
              ];
              return !excluded.includes(item.Localidade);
            }
            return true;
          });
        
        // Update cache
        localStorage.setItem(STORAGE_KEY_INVENTORY, JSON.stringify(mappedData));
        resolve(mappedData as InventoryItem[]);
      },
      error: (error) => {
        if (cachedData.length > 0) {
          console.warn('Using cached inventory due to fetch error:', error);
          resolve(cachedData);
        } else {
          reject(error);
        }
      }
    });

    // Fallback if network is slow - check offline status
    if (!navigator.onLine && cachedData.length > 0) {
      resolve(cachedData);
    }
  });
}

export function generateSample(
  items: InventoryItem[],
  mode: 'aleatoria' | 'completo'
): InventoryItem[] {
  if (mode === 'completo') {
    return [...items];
  }

  const total = items.length;
  const sampleSize = Math.ceil(total * 0.3);

  const shuffled = [...items].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, sampleSize);
}

const STORAGE_KEY_SESSIONS = 'wm_saude_sessions';
const STORAGE_KEY_ACTIONS = 'wm_saude_actions';

export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export async function saveSession(session: InspectionSession) {
  const path = 'sessions';
  try {
    // Save to Firestore (handled by persistence if offline)
    await setDoc(doc(db, path, session.id), session);
    
    // Manage local IndexedDB draft as a redundant layer
    if (session.completed) {
      await offlineDb.deleteDraftSession(session.id);
    } else {
      await offlineDb.saveDraftSession(session);
    }
  } catch (error) {
    // Even if firestore fails (e.g. permission or extreme error), ensure local draft is updated
    if (!session.completed) {
      await offlineDb.saveDraftSession(session);
    }
    handleFirestoreError(error, OperationType.WRITE, `${path}/${session.id}`);
  }
}

export async function deleteSession(sessionId: string) {
  const path = 'sessions';
  try {
    await deleteDoc(doc(db, path, sessionId));
    await offlineDb.deleteDraftSession(sessionId);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `${path}/${sessionId}`);
  }
}

export async function getLocalDraftsByUser(userId: string) {
  return await offlineDb.getDraftSessions(userId);
}

export function subscribeToSessions(callback: (sessions: InspectionSession[]) => void) {
  const path = 'sessions';
  const q = collection(db, path);
  
  return onSnapshot(q, (snapshot) => {
    const sessions = snapshot.docs.map(doc => doc.data() as InspectionSession);
    callback(sessions);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function saveAction(action: CorrectiveAction) {
  const path = 'actions';
  try {
    await setDoc(doc(db, path, action.id), action);
    await offlineDb.saveAction(action);
  } catch (error) {
    await offlineDb.saveAction(action);
    handleFirestoreError(error, OperationType.WRITE, `${path}/${action.id}`);
  }
}

export function subscribeToActions(callback: (actions: CorrectiveAction[]) => void) {
  const path = 'actions';
  const q = collection(db, path);

  return onSnapshot(q, (snapshot) => {
    const actions = snapshot.docs.map(doc => doc.data() as CorrectiveAction);
    callback(actions);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

export async function updateAction(action: CorrectiveAction) {
  const path = 'actions';
  try {
    const actionRef = doc(db, path, action.id);
    await updateDoc(actionRef, { ...action });
    await offlineDb.saveAction(action);
  } catch (error) {
    await offlineDb.saveAction(action);
    handleFirestoreError(error, OperationType.UPDATE, `${path}/${action.id}`);
  }
}
