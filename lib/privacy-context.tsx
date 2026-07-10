'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

const STORAGE_KEY = 'dashboard.privacyMode';

interface PrivacyState {
  privacyMode: boolean;
  toggle: () => void;
  set: (value: boolean) => void;
}

const Ctx = createContext<PrivacyState | null>(null);

/**
 * Globaler Privacy-Modus fuer das Dashboard. Persistiert in
 * localStorage, damit er nach Reload / Session-Wechsel erhalten bleibt.
 * Wird im Dashboard-Layout um alle Kinder gelegt.
 */
export function PrivacyProvider({ children }: { children: React.ReactNode }) {
  const [privacyMode, setPrivacyMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Persistierten State beim Mount laden. Bewusst *nach* dem ersten
  // Render, damit Server- und Client-Render identisch sind (kein
  // Hydration-Mismatch).
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === '1') setPrivacyMode(true);
    } catch {
      /* localStorage evtl. blockiert (Safari private) — silent */
    }
    setHydrated(true);
  }, []);

  const set = useCallback((value: boolean) => {
    setPrivacyMode(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      /* silent */
    }
  }, []);

  const toggle = useCallback(() => {
    set(!privacyMode);
  }, [privacyMode, set]);

  // Bis hydration abgeschlossen ist: Server-Werte anzeigen (also NICHT
  // versteckt). Erst danach ggf. auf true umschalten.
  const effectiveMode = hydrated ? privacyMode : false;

  return (
    <Ctx.Provider
      value={{ privacyMode: effectiveMode, toggle, set }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePrivacy(): PrivacyState {
  const ctx = useContext(Ctx);
  if (!ctx) {
    // Kein Provider gefunden — kein Fehler werfen, damit die App auch
    // ohne Wrapper laeuft (z.B. Legacy-Seiten). Default: Werte sichtbar.
    return {
      privacyMode: false,
      toggle: () => {},
      set: () => {},
    };
  }
  return ctx;
}
