import {
  initializeApp,
  getApps,
  getApp,
  cert,
  applicationDefault,
  type App,
} from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';
import { getStorage, Storage } from 'firebase-admin/storage';

/**
 * Server-side Firebase Admin Instanz. Wird genau einmal beim ersten
 * Zugriff initialisiert. Credentials werden aus folgenden Quellen
 * gelesen (in dieser Reihenfolge):
 *
 *   1. FIREBASE_SERVICE_ACCOUNT_JSON      Vollständige Service-Account JSON
 *   2. FIREBASE_PROJECT_ID +
 *      FIREBASE_CLIENT_EMAIL +
 *      FIREBASE_PRIVATE_KEY               Einzeln gesetzte Felder
 *   3. GOOGLE_APPLICATION_CREDENTIALS     Pfad zur JSON-Datei (lokal)
 *
 * Auf Vercel die JSON als Single Env Var setzen
 * (FIREBASE_SERVICE_ACCOUNT_JSON).
 */

let appInstance: App | null = null;

function init(): App {
  if (appInstance) return appInstance;
  if (getApps().length) {
    appInstance = getApp();
    return appInstance;
  }

  const projectId =
    process.env.FIREBASE_PROJECT_ID ??
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket =
    process.env.FIREBASE_STORAGE_BUCKET ??
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    try {
      const json = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      appInstance = initializeApp({
        credential: cert(json),
        projectId: json.project_id ?? projectId,
        storageBucket,
      });
      return appInstance;
    } catch (err) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT_JSON ist gesetzt, aber kein gültiges JSON.',
      );
    }
  }

  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    appInstance = initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      projectId,
      storageBucket,
    });
    return appInstance;
  }

  // Fallback — Application Default Credentials (für lokale Entwicklung
  // mit gcloud auth application-default login).
  appInstance = initializeApp({
    credential: applicationDefault(),
    projectId,
    storageBucket,
  });
  return appInstance;
}

export function adminDb(): Firestore {
  return getFirestore(init());
}

export function adminStorage(): Storage {
  return getStorage(init());
}
