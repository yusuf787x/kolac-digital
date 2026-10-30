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
import type { Auth } from 'firebase-admin/auth';

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

  // Auf Vercel gibt es keine Application Default Credentials. Ohne diesen
  // Abbruch sucht das SDK trotzdem danach und der Prozess stuerzt spaeter
  // asynchron ab (leeres 500 ohne Meldung). So kommt ein klarer Fehler.
  if (process.env.VERCEL) {
    throw new Error(
      'Firebase-Admin-Zugangsdaten fehlen auf Vercel. Bitte FIREBASE_SERVICE_ACCOUNT_JSON setzen (Firebase-Konsole, Projekteinstellungen, Dienstkonten, Neuen privaten Schlüssel generieren) und neu deployen.',
    );
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

/**
 * Admin-Auth, genutzt vom Kundenportal (Magic Link, Session-Cookies).
 *
 * Bewusst erst bei Bedarf geladen: firebase-admin/auth zieht jwks-rsa und
 * damit jose (nur noch als ES-Modul) nach. Auf einer Node-Version ohne
 * require(esm) scheitert schon das Laden. Als statischer Import hat das
 * jede Route mit lib/firebase-admin.ts zum Absturz gebracht (Vertraege,
 * Crons, Webhook), auch wenn sie Auth gar nicht nutzt.
 */
export async function adminAuth(): Promise<Auth> {
  const { getAuth } = await import('firebase-admin/auth');
  return getAuth(init());
}

/** True, wenn explizite Admin-Zugangsdaten in der Umgebung stehen. */
export function hasAdminCredentials(): boolean {
  return !!(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) ||
    process.env.GOOGLE_APPLICATION_CREDENTIALS
  );
}
