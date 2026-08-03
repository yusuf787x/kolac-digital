'use client';

import { parseRichText, type MdInlineSegment } from '@/lib/simple-markdown';
import type { CallScript } from '@/lib/types';

/**
 * Read-only Anzeige eines Cold-Call-Skripts. Blöcke oben, Einwand-
 * Antworten unten. Nutzt den gemeinsamen parseRichText-Parser fuer
 * fett + Bullets, damit dieselbe Formatierung wie in Angebot/Vertrag
 * greift.
 */
export default function ScriptRenderer({ script }: { script: CallScript }) {
  const blocks = [...script.blocks].sort((a, b) => a.order - b.order);
  const objections = script.objections;

  return (
    <div className="space-y-4">
      {blocks.length === 0 && objections.length === 0 && (
        <div className="card text-sm text-gray-500 italic">
          Noch keine Bloecke. Auf „Bearbeiten" klicken und die ersten
          Skript-Bloecke anlegen.
        </div>
      )}

      {blocks.map((b) => (
        <div key={b.id} className="card">
          <p className="text-xs uppercase text-gray-500 tracking-wider mb-1">
            {b.title}
          </p>
          <RichView text={b.body} />
        </div>
      ))}

      {objections.length > 0 && (
        <div className="card">
          <h3 className="text-base font-semibold text-gray-900 mb-3">
            Einwand-Behandlung
          </h3>
          <div className="space-y-3">
            {objections.map((o) => (
              <div
                key={o.id}
                className="border-l-2 border-amber-400 pl-3 py-1"
              >
                <p className="text-sm font-medium text-amber-900">
                  „{o.trigger}"
                </p>
                <div className="mt-1 text-sm text-gray-700">
                  <RichView text={o.response} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RichView({ text }: { text: string }) {
  const blocks = parseRichText(text);
  const renderInline = (segs: MdInlineSegment[]) =>
    segs.map((s, i) =>
      s.bold ? (
        <strong key={i} className="font-semibold text-gray-900">
          {s.text}
        </strong>
      ) : (
        <span key={i}>{s.text}</span>
      ),
    );
  return (
    <div className="text-sm text-gray-800 leading-relaxed">
      {blocks.map((b, i) =>
        b.type === 'bullet' ? (
          <div key={i} className="flex gap-2">
            <span className="text-gray-400">•</span>
            <span>{renderInline(b.segments)}</span>
          </div>
        ) : (
          <p key={i} className="mb-2 last:mb-0">
            {renderInline(b.segments)}
          </p>
        ),
      )}
    </div>
  );
}
