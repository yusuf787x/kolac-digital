'use client';

import { usePrivacy } from '@/lib/privacy-context';

/**
 * Kleiner Icon-Button in der Dashboard-Topbar zum Umschalten des
 * Privacy-Modus. Zeigt entweder ein offenes Auge (Zahlen sichtbar) oder
 * ein durchgestrichenes Auge (Zahlen versteckt).
 */
export default function PrivacyToggle() {
  const { privacyMode, toggle } = usePrivacy();

  return (
    <button
      type="button"
      onClick={toggle}
      title={
        privacyMode
          ? 'Zahlen einblenden'
          : 'Zahlen verstecken (Privacy-Modus)'
      }
      aria-pressed={privacyMode}
      aria-label={
        privacyMode
          ? 'Privacy-Modus aktiv, Zahlen sind versteckt'
          : 'Privacy-Modus aktivieren, Zahlen verstecken'
      }
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        privacyMode
          ? 'bg-amber-100 text-amber-800 hover:bg-amber-200'
          : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      {privacyMode ? <EyeOffIcon /> : <EyeIcon />}
      <span className="hidden sm:inline text-xs">
        {privacyMode ? 'Zahlen versteckt' : 'Privacy'}
      </span>
    </button>
  );
}

function EyeIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.42 19.42 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.4 19.4 0 0 1-3.17 4.19" />
      <path d="M14.12 14.12A3 3 0 1 1 9.88 9.88" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
