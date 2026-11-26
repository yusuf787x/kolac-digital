'use client';

import { Eye, EyeOff } from 'lucide-react';
import { usePrivacy } from '@/lib/privacy-context';

/**
 * Runder Knopf in der Kopfzeile: Beträge verstecken (z. B. beim
 * Bildschirm teilen) oder wieder zeigen.
 */
export default function PrivacyToggle() {
  const { privacyMode, toggle } = usePrivacy();

  return (
    <button
      type="button"
      onClick={toggle}
      title={privacyMode ? 'Zahlen einblenden' : 'Zahlen verstecken'}
      aria-pressed={privacyMode}
      aria-label={privacyMode ? 'Zahlen sind versteckt, einblenden' : 'Zahlen verstecken'}
      className={`dash-pill justify-center px-0 w-9 lg:w-auto lg:px-3 ${
        privacyMode ? '!border-amber-300 !bg-amber-50 !text-amber-900' : ''
      }`}
    >
      {privacyMode ? <EyeOff size={16} strokeWidth={1.75} aria-hidden /> : <Eye size={16} strokeWidth={1.75} aria-hidden />}
      <span className="hidden text-[13px] lg:inline">{privacyMode ? 'Zahlen versteckt' : 'Zahlen'}</span>
    </button>
  );
}
