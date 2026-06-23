import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  onSnapshot,
  updateDoc,
  deleteDoc,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../../../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const dbId = firebaseConfig.firestoreDatabaseId || '(default)';

// Initialize Firestore with modern persistence strategy to remove deprecation warning
let dbInstance;
if (typeof window !== 'undefined') {
  let isIndexedDbAccessible = false;
  try {
    isIndexedDbAccessible = 'indexedDB' in window && !!window.indexedDB;
  } catch (e) {
    console.warn('IndexedDB property in window is not accessible (likely blocked by iframe sandbox restrictions)');
  }

  if (isIndexedDbAccessible) {
    try {
      dbInstance = initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, dbId);
    } catch (err) {
      console.warn('Firestore initializeFirestore with cache failed, falling back to getFirestore:', err);
      dbInstance = getFirestore(app, dbId);
    }
  } else {
    dbInstance = getFirestore(app, dbId);
  }
} else {
  dbInstance = getFirestore(app, dbId);
}

export const db = dbInstance;

export const googleProvider = new GoogleAuthProvider();

// Error handling helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error) {
      const msg = error.message.toLowerCase();
      if (
        msg.includes('offline') || 
        msg.includes('could not reach') || 
        msg.includes('respond within') || 
        msg.includes('network') ||
        msg.includes('failed to get document')
      ) {
        console.warn("Please check your Firebase configuration. If your app database was just created, ensure you have run 'set_up_firebase' to provision the custom database. (Operating in offline fallback mode)");
      } else {
        console.warn("Firestore connection test: " + error.message);
      }
    }
  }
}
testConnection();
