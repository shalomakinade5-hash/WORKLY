import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

export interface FirebaseClientConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

const STORAGE_KEY = 'workly_firebase_custom_config';

export function getStoredFirebaseConfig(): FirebaseClientConfig | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey && parsed.projectId) {
        return parsed;
      }
    }
  } catch {
    // ignore parse error
  }
  return null;
}

export function saveStoredFirebaseConfig(config: FirebaseClientConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  window.location.reload();
}

export function clearStoredFirebaseConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseClientConfig = {
  apiKey: "AIzaSyBsJTIIRHYzoMJenVPODmQDEalgubwqAJ4",
  authDomain: "workly-7d6a0.firebaseapp.com",
  projectId: "workly-7d6a0",
  storageBucket: "workly-7d6a0.firebasestorage.app",
  messagingSenderId: "522549969173",
  appId: "1:522549969173:web:850d9aba494641db15691c"
};

function resolveConfig(): FirebaseClientConfig {
  // 1. Check custom user-provided config from UI
  const stored = getStoredFirebaseConfig();
  if (stored) return stored;

  // 2. Check environment variables
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;

  if (apiKey && projectId && apiKey !== 'your-api-key-here') {
    return {
      apiKey,
      authDomain: authDomain || `${projectId}.firebaseapp.com`,
      projectId,
      storageBucket: storageBucket || `${projectId}.firebasestorage.app`,
      messagingSenderId: messagingSenderId || '',
      appId: appId || ''
    };
  }

  return DEFAULT_FIREBASE_CONFIG;
}

export const activeFirebaseConfig = resolveConfig();
export const isFirebaseConfigured = Boolean(activeFirebaseConfig && activeFirebaseConfig.apiKey);

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

if (isFirebaseConfigured && activeFirebaseConfig) {
  try {
    if (getApps().length === 0) {
      appInstance = initializeApp(activeFirebaseConfig);
    } else {
      appInstance = getApps()[0];
    }
    authInstance = getAuth(appInstance);
    dbInstance = getFirestore(appInstance);
  } catch (err) {
    console.warn('[Workly Firebase] Initialization warning:', err);
  }
}

export const firebaseApp = appInstance;
export const auth = authInstance;
export const db = dbInstance;
