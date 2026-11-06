'use client';

import { useRef, useState } from 'react';

interface Props {
  /** Komplettes HTML-Dokument der Mail. */
  html: string;
  /** Kopfzeilen wie im Mailprogramm (optional). */
  from?: string;
  to?: string;
  subject?: string;
  attachment?: string;
}

/**
 * Zeigt eine Mail so, wie sie beim Empfänger ankommt: Kopfzeilen oben,
 * darunter das HTML in einem abgeschotteten iframe (keine Skripte).
 * Die Höhe passt sich dem Inhalt an.
 */
export default function EmailPreviewFrame({ html, from, to, subject, attachment }: Props) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(560);

  const fit = () => {
    const doc = ref.current?.contentDocument;
    if (doc?.body) setHeight(Math.max(doc.documentElement.scrollHeight, 300));
  };

  const headers: Array<[string, string | undefined]> = [
    ['Von', from],
    ['An', to],
    ['Betreff', subject],
    ['Anhang', attachment],
  ];
  const shown = headers.filter(([, v]) => v);

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden">
      {shown.length > 0 && (
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 px-4 py-3 text-sm bg-white border-b border-gray-200">
          {shown.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-gray-500">{k}</dt>
              <dd className={`min-w-0 break-words ${k === 'Betreff' ? 'font-semibold text-gray-900' : 'text-gray-800'}`}>
                {k === 'Anhang' ? `📎 ${v}` : v}
              </dd>
            </div>
          ))}
        </dl>
      )}
      <iframe
        ref={ref}
        title="Mail-Vorschau"
        srcDoc={html}
        onLoad={fit}
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
        className="block w-full bg-gray-100"
        style={{ height }}
      />
    </div>
  );
}
