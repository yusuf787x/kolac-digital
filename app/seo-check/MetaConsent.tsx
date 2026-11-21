'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  OPEN_CONSENT_EVENT,
  leadEventId,
  readMarketingConsent,
  saveMarketingConsent,
  type MarketingConsent,
} from '@/lib/seo-check/meta';
import type { LeadEventDetail } from '@/lib/seo-check/lead-event';

/* Meta-Pixel nur auf den SEO-Check-Seiten und nur nach Einwilligung.
   Vor der Zustimmung lädt nichts von Meta. */

type Fbq = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[][];
  push: unknown;
  loaded: boolean;
  version: string;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

function loadPixel(pixelId: string) {
  if (window.fbq) return;
  const n = function (...args: unknown[]) {
    if (n.callMethod) n.callMethod(...args);
    else n.queue.push(args);
  } as Fbq;
  n.queue = [];
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  window.fbq = n;
  if (!window._fbq) window._fbq = n;
  const s = document.createElement('script');
  s.async = true;
  s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  n('init', pixelId);
  n('track', 'PageView');
}

/** Meta-Cookies nach einem Widerruf entfernen. */
function clearMetaCookies() {
  const host = window.location.hostname;
  const domains = ['', host, `.${host}`, `.${host.replace(/^www\./, '')}`];
  for (const name of ['_fbp', '_fbc']) {
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
    }
  }
}

export default function MetaConsent({ pixelId }: { pixelId?: string }) {
  const [consent, setConsent] = useState<MarketingConsent>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!pixelId) return;
    const c = readMarketingConsent();
    setConsent(c);
    if (c === 'granted') loadPixel(pixelId);
    else if (c === null) setOpen(true);

    const onOpen = () => setOpen(true);
    const onLead = (e: Event) => {
      const d = (e as CustomEvent<LeadEventDetail>).detail;
      if (readMarketingConsent() !== 'granted' || !window.fbq || !d?.checkId) return;
      window.fbq('track', 'Lead', d.branche ? { content_category: d.branche } : {}, { eventID: leadEventId(d.checkId) });
    };
    window.addEventListener(OPEN_CONSENT_EVENT, onOpen);
    window.addEventListener('kolac:lead', onLead);
    return () => {
      window.removeEventListener(OPEN_CONSENT_EVENT, onOpen);
      window.removeEventListener('kolac:lead', onLead);
    };
  }, [pixelId]);

  const decide = useCallback(
    (granted: boolean) => {
      if (!pixelId) return;
      const before = consent;
      saveMarketingConsent(granted);
      setConsent(granted ? 'granted' : 'denied');
      setOpen(false);
      if (granted) loadPixel(pixelId);
      else if (before === 'granted') {
        // Geladenes Pixel lässt sich nicht entladen: Cookies weg, Seite neu laden.
        clearMetaCookies();
        window.location.reload();
      }
    },
    [consent, pixelId],
  );

  if (!pixelId || !open) return null;

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="meta-consent-title"
      className="fixed inset-x-2 bottom-2 z-50 rounded-[18px] border border-[#e5e7eb] bg-white p-3 shadow-[0_8px_40px_rgba(0,0,0,0.12)] sm:inset-x-auto sm:left-6 sm:bottom-6 sm:max-w-[440px] sm:p-5"
    >
      <p className="text-[13px] leading-snug text-[var(--color-gray)] sm:text-[14px]">
        <span id="meta-consent-title" className="font-semibold text-[var(--color-black)] sm:block sm:text-[15px]">
          Darf Meta messen, über welche Anzeige du hier gelandet bist?
        </span>{' '}
        Das hilft uns, unsere Werbung zu verbessern. Dabei setzt Meta Cookies.
        <span className="hidden sm:inline"> Du kannst deine Auswahl jederzeit unten auf der Seite ändern.</span>{' '}
        <a href="/datenschutz.html#meta" className="text-[var(--color-blue)] underline">
          Datenschutzerklärung
        </a>
      </p>
      {consent && (
        <p className="mt-1 text-[13px] text-[var(--color-gray)]">
          Deine aktuelle Auswahl: {consent === 'granted' ? 'erlaubt' : 'abgelehnt'}.
        </p>
      )}
      <div className="mt-2 grid grid-cols-2 gap-2 sm:mt-3">
        <button
          type="button"
          onClick={() => decide(true)}
          className="btn btn-primary min-h-[44px] w-full justify-center !px-4 !py-2 text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)]"
        >
          Akzeptieren
        </button>
        <button
          type="button"
          onClick={() => decide(false)}
          className="btn btn-outline min-h-[44px] w-full justify-center !bg-white !px-4 !py-2 text-[15px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)]"
        >
          Ablehnen
        </button>
      </div>
    </div>
  );
}

/** Kleiner Link im Fuß der Check-Seiten, öffnet das Banner erneut. */
export function CookieSettingsLink({ pixelId }: { pixelId?: string }) {
  if (!pixelId) return null;
  return (
    <div className="py-4 text-center">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_CONSENT_EVENT))}
        className="min-h-[44px] px-3 text-[13px] text-[var(--color-gray)] underline hover:text-[var(--color-black)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-blue)]"
      >
        Cookie-Einstellungen
      </button>
    </div>
  );
}
