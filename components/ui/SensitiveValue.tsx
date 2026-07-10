'use client';

import { usePrivacy } from '@/lib/privacy-context';

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Ohne diesen Fallback wuerden Screen-Reader die geblurrten
   *  Zahlen trotzdem vorlesen. */
  ariaLabel?: string;
  /** span (default) oder div. Fuer Layout-Faelle wo Inline stoert. */
  as?: 'span' | 'div';
}

/**
 * Wrapper um jeden Betrag / jede sensible Kennzahl.
 * Ist der Privacy-Modus im Context aktiv, wird der Inhalt per CSS
 * geblurred + mit dezentem Akzent hinterlegt, damit klar bleibt dass
 * dort eine Zahl versteckt wurde.
 *
 * Beispiel:
 *   <SensitiveValue>{formatEUR(invoice.totalAmount)}</SensitiveValue>
 */
export default function SensitiveValue({
  children,
  className = '',
  ariaLabel,
  as = 'span',
}: Props) {
  const { privacyMode } = usePrivacy();
  const Tag = as;
  const blurClass = privacyMode ? 'privacy-blurred' : '';
  const combined = [blurClass, className].filter(Boolean).join(' ');

  return (
    <Tag
      className={combined}
      aria-label={privacyMode ? ariaLabel ?? 'Wert versteckt' : undefined}
      data-privacy={privacyMode ? 'hidden' : undefined}
    >
      {children}
    </Tag>
  );
}
