'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BLOG_AUTHOR_PROMPT } from '@/lib/blog-prompt';

/**
 * Die Basis-Anweisung ohne konkretes Thema.
 *
 * Gedacht zum einmaligen Hinterlegen in einem Claude-Projekt. Danach
 * reicht im Chat ein kurzer Satz mit dem Thema, der ganze Kontext
 * steht bereits.
 */
export default function BlogPromptPage() {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Der Auftragstext endet mit der Ueberleitung zum Thema. Fuer die
  // Dauer-Anweisung wird die durch eine allgemeine Fassung ersetzt.
  const base =
    BLOG_AUTHOR_PROMPT.split('## Das Thema')[0].trimEnd() +
    `

## Das Thema

Das Thema bekommst du in der jeweiligen Nachricht. Es besteht aus
Arbeitstitel, gewünschter Richtung, Kategorie und Zielbegriffen.
Den Arbeitstitel darfst du zu einer besseren Überschrift umformulieren,
solange das Thema dasselbe bleibt.

Wenn Angaben fehlen, wähle sinnvoll selbst: die Kategorie aus der Liste
oben, die Zielbegriffe so, wie die Zielgruppe tatsächlich sucht.

Antworte immer direkt mit dem JSON, ohne Rückfragen.`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(base);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError(
        'Kopieren nicht möglich. Markiere den Text im Feld und kopiere ihn von Hand.',
      );
    }
  };

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/blog"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zum Blog
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">
          Basis-Anweisung für Claude
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Einmal hinterlegen, danach reicht im Chat der Themenname.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="card mb-4">
        <h2 className="text-base font-semibold text-gray-900 mb-3">
          So richtest du es ein
        </h2>
        <ol className="text-sm text-gray-700 space-y-2 list-decimal pl-5">
          <li>
            In Claude ein neues Projekt anlegen, zum Beispiel
            {' '}<strong>Kolac Blog</strong>.
          </li>
          <li>
            Bei den Projektanweisungen den Text unten einfügen und
            speichern.
          </li>
          <li>
            Ab jetzt im Projekt einen neuen Chat starten und nur noch das
            Thema schreiben. Der ganze Kontext steht schon.
          </li>
          <li>
            Antwort kopieren und unter{' '}
            <Link
              href="/dashboard/blog/einfuegen"
              className="text-brand-blue hover:underline"
            >
              Artikel einfügen
            </Link>{' '}
            einsetzen.
          </li>
        </ol>
        <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 p-3">
          <p className="text-xs text-gray-500 mb-1">
            Beispiel für eine Nachricht im Projekt:
          </p>
          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
{`Thema: Jeder verpasste Anruf kostet dich einen Auftrag
Richtung: Reaktionszeit und Rückrufquote zeigen, warum Anfragende
beim Zweiten landen. Führt zur digitalen Anfragestrecke.
Kategorie: Prozesse digitalisieren
Zielbegriffe: handwerker erreichbarkeit anfragen, verpasste anrufe
kunden verlieren`}
          </pre>
        </div>
      </section>

      <section className="card">
        <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
          <h2 className="text-base font-semibold text-gray-900">
            Die Anweisung
          </h2>
          <button onClick={copy} className="btn-primary">
            {copied ? 'Kopiert' : 'In die Zwischenablage'}
          </button>
        </div>
        <p className="text-sm text-gray-600 mb-3">
          Enthält alle Fakten über den Betrieb, die Preise, die
          Referenzen, die Stilregeln und das Ausgabeformat. Wenn sich
          etwas ändert, wird das in{' '}
          <code className="text-xs">lib/blog-prompt.ts</code> gepflegt
          und hier neu kopiert.
        </p>
        <textarea
          className="input font-mono text-xs"
          rows={20}
          value={base}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
        />
      </section>
    </div>
  );
}
