/**
 * Einzige Adresse mit Admin-Rechten, identisch zu firestore.rules und
 * storage.rules. Seit es das Kundenportal gibt, existieren weitere
 * Firebase-Konten (Magic-Link-Logins). Deren ID-Tokens sind gueltig,
 * duerfen aber nie Admin-Rechte bekommen. Darum pruefen Server-Routen
 * und Dashboard-Layout zusaetzlich zur UID immer diese Adresse.
 */
export const OWNER_EMAIL = 'yusuf@kolac-digital.de';
