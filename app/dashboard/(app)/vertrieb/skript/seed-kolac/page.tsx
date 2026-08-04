'use client';

/**
 * Einmaliger Seed des Kolac-Standard-Skripts. Nach dem Klick wird das
 * Skript unten 1:1 als neue Version angelegt und aktiviert.
 *
 * Nach dem Einpflegen kann diese Route gelöscht oder für neue Caller
 * als Onboarding-Werkzeug behalten werden. Ist ohnehin auth-geschützt
 * (Dashboard-Layout).
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createCallScriptVersion } from '@/lib/firestore';
import type { CallScriptBlock, CallScriptObjection } from '@/lib/types';

const nid = (p: string) =>
  `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;

function makeBlocks(): CallScriptBlock[] {
  return [
    {
      id: nid('blk'),
      order: 0,
      title: 'Grundprinzip (vor dem Wählen)',
      body: `<p><strong>Ziel ist NICHT, am Telefon zu verkaufen.</strong> Dein einziges Ziel: ein 15-Minuten-Termin, in dem Yusuf sich den Betrieb anschaut und zeigt, wo der Inhaber Zeit verliert (Zeitfresser-Check). Kostet den Kunden nichts. Mehr willst du am Telefon nicht.</p><p><strong>Drei Regeln:</strong></p><ul><li><strong>Übernimm die Führung.</strong> Am Ende nicht ob, sondern wann. Nimm ihn an die Hand.</li><li><strong>Keine unnötigen Pausen.</strong> In jeder Lücke fängt der Kunde an nachzudenken und sagt Nein. Block 2 und 3 ohne Pause durchziehen.</li><li><strong>Ehrlich statt Schleim.</strong> Kein „hätten Sie ganz kurz drei Sekunden". Sprich offen aus, dass das ein kalter Anruf ist. Das entwaffnet.</li></ul><p><strong>Lesehinweis:</strong> Alles in eckigen Klammern ist Regie für dich, das sagst du NICHT laut. Alles andere liest du so vor.</p>`,
    },
    {
      id: nid('blk'),
      order: 1,
      title: 'Block 1: Einstieg und erstes Ja',
      body: `<p>„Hallo Herr/Frau <strong>[Nachname]</strong>, <strong>[dein Vorname und Nachname]</strong> hier von Kolac Digital, ich grüße Sie. Ich rufe bei Ihnen durch, weil ich gerade auf <strong>[die Website / das Google-Profil]</strong> von <strong>[Betriebsname]</strong> geschaut habe. Sie führen den Laden ja selbst, richtig?"</p><p><strong>[Regie:</strong> Sofort das erste kleine Ja holen. Klingen als hättest du dich mit ihm beschäftigt, nicht wie eine Nummer von der Liste.<strong>]</strong></p><p><em>Er sagt „Ja, genau" oder „Ja, das bin ich."</em></p>`,
    },
    {
      id: nid('blk'),
      order: 2,
      title: 'Block 2: Warum ich anrufe (Pitch)',
      body: `<p><strong>[Regie: Ab hier keine Pause bis Ende Block 3. Durchziehen.]</strong></p><p>„Perfekt, dann sind Sie genau der Richtige. Ganz kurz, warum ich anrufe: Wir bauen für Betriebe wie Ihren Webseiten, die tatsächlich Arbeit abnehmen. Also Terminbuchung, Anfragen, der ganze Verwaltungskram, damit das nicht mehr alles über Ihren Kopf läuft."</p><p><strong>[Regie:</strong> Kein „Feature" verkaufen. Direkt seinen Schmerz benennen. Der Kunde erkennt sich wieder: alles hängt an ihm.<strong>]</strong></p>`,
    },
    {
      id: nid('blk'),
      order: 3,
      title: 'Block 3: Beweis',
      body: `<p>„Das Ganze sorgt am Ende dafür, dass der Inhaber abends den Kopf frei hat, weil der Laden vieles von allein macht. Bei einem Kunden von uns aus dem Ästhetikbereich läuft die komplette Terminbuchung inzwischen online, über 800 Termine ohne einen einzigen Anruf, und die Ausfälle sind massiv zurückgegangen."</p><p><strong>[Regie:</strong> Kundenname bewusst weglassen (Anonymität). Wenn nachgefragt: „Namen darf ich am Telefon nicht rausgeben, aber im Gespräch zeig ich Ihnen gern konkret was wir gebaut haben."<strong>]</strong></p>`,
    },
    {
      id: nid('blk'),
      order: 4,
      title: 'Block 4: Elefant im Raum',
      body: `<p><strong>[Regie:</strong> Kurz durchatmen. Beim nächsten Satz LÄCHELN. Man hört ein Lächeln durchs Telefon, das nimmt den Druck raus.<strong>]</strong></p><p>„Und schauen Sie, mir ist völlig klar, dass so ein Anruf aus dem Nichts erstmal nicht auf Jubelstürme trifft. <strong>[kurz mitlachen]</strong> Deshalb will ich Ihnen am Telefon auch gar nichts verkaufen. Mein Vorschlag wäre nur, dass wir uns 15 Minuten zusammensetzen, ich schau mir an wie Ihr Laden läuft und zeig Ihnen, wo Sie gerade Zeit verlieren. Kostet Sie nichts, und Sie wissen danach mehr als vorher."</p><p><strong>[Regie:</strong> Sprich offen aus was beide denken. Das macht dich nahbar und ehrlich. Kolac-Ton.<strong>]</strong></p>`,
    },
    {
      id: nid('blk'),
      order: 5,
      title: 'Block 5: Abschluss mit Führung',
      body: `<p>„Wann würde es Ihnen die nächsten Tage besser passen, eher vormittags oder eher nachmittags?"</p><p><strong>[Regie:</strong> NIEMALS „Hätten Sie Interesse?" fragen. Das ist eine Ja/Nein-Falle. Zwei Optionen vorgeben, beide führen zum Termin. Wenn er eine wählt, sofort konkret: „Super, sagen wir Donnerstag um 14 Uhr, passt das?"<strong>]</strong></p>`,
    },
    {
      id: nid('blk'),
      order: 6,
      title: 'Einwand-Prinzip (bei jedem Einwand gleich)',
      body: `<p>Drei Schritte, immer gleich:</p><ul><li><strong>1. Recht geben.</strong> Kurz bestätigen, ihn nicht vor den Kopf stoßen.</li><li><strong>2. Umdrehen mit „genau deshalb".</strong> Sein Einwand ist genau der Grund für das Gespräch.</li><li><strong>3. Zurück zur selben Frage:</strong> vormittags oder nachmittags?</li></ul><p>Keine neuen Argumente erfinden. Ruhig dieselbe Kernbotschaft nochmal. Wenn ein Einwand zweimal kommt: nochmal loopen. Erst nach dem <strong>dritten echten Nein</strong> sauber verabschieden: „Alles gut, dann lass ich Sie in Ruhe. Falls sich das ändert, melden Sie sich. Schönen Tag noch."</p>`,
    },
    {
      id: nid('blk'),
      order: 7,
      title: 'Drei Anfängerfehler (vermeiden)',
      body: `<ul><li><strong>Am Telefon verkaufen wollen.</strong> Sobald er mitzieht: Termin festmachen und Gespräch beenden. Nicht weiterreden, sonst redest du den Termin wieder kaputt.</li><li><strong>Um Erlaubnis fragen.</strong> „Darf ich Ihnen kurz was vorstellen?" oder „Hätten Sie Interesse?" gibt ihm die Nein-Tür. Frag nie ob, frag wann.</li><li><strong>Nervös schnell werden.</strong> Ruhig sprechen, lächeln, kleine Fehler ignorieren und weitermachen. Deine Sicherheit überträgt sich mehr als jedes perfekte Wort.</li></ul><p><em>Ein Skript ist nur so gut wie seine Messbarkeit. Sag jedes Mal möglichst dasselbe, dann siehst du nach 50 Calls genau, an welcher Stelle Leute abspringen, und kannst nachschärfen.</em></p>`,
    },
  ];
}

function makeObjections(): CallScriptObjection[] {
  return [
    {
      id: nid('obj'),
      trigger: 'Keine Zeit.',
      response: `<p>„Versteh ich, Sie führen den Laden ja quasi nebenbei alleine. Genau deshalb ruf ich an, es geht ja darum, dass Sie weniger um die Ohren haben. Ich brauch jetzt keine zehn Minuten, nur einen kurzen Termin für die Woche. <strong>Vormittags oder nachmittags besser?</strong>"</p>`,
    },
    {
      id: nid('obj'),
      trigger: 'Kein Interesse.',
      response: `<p>„Total verständlich, die meisten sagen das erstmal, weil sie noch nicht wissen was kommt. Ist ja fair, Sie kennen mich nicht. Genau deshalb wäre der Vorschlag ja nur, dass ich mir 15 Minuten Ihren Ablauf anschau und Ihnen zeig wo Sie Zeit verlieren. Kostet nichts. <strong>Wann passt es, vormittags oder nachmittags?</strong>"</p>`,
    },
    {
      id: nid('obj'),
      trigger: 'Schicken Sie mir was per Mail.',
      response: `<p>„Kann ich machen. Aber ganz ehrlich, eine Mail zeigt Ihnen nicht, wo genau Ihr Betrieb Zeit verliert, das seh ich erst wenn ich kurz mit Ihnen draufschaue. Deshalb lieber 15 Minuten direkt. <strong>Vormittags oder nachmittags besser?</strong>"</p>`,
    },
    {
      id: nid('obj'),
      trigger: 'Wir haben schon eine Website.',
      response: `<p>„Klar, die meisten haben eine. Die Frage ist nur, ob die für Sie arbeitet oder nur schön aussieht. Die meisten Seiten sind ein digitaler Flyer, die nehmen Ihnen keine Arbeit ab. Genau das schau ich mir an. <strong>Vormittags oder nachmittags?</strong>"</p>`,
    },
    {
      id: nid('obj'),
      trigger: 'Was kostet das denn?',
      response: `<p>„Das kann ich seriös erst sagen, wenn ich weiß wie Ihr Laden läuft, alles andere wär geraten. Genau dafür ist das kurze Gespräch da. Und das Erstgespräch selbst kostet Sie nichts. <strong>Wann passt es, vormittags oder nachmittags?</strong>"</p>`,
    },
    {
      id: nid('obj'),
      trigger: 'Gatekeeper: „Worum geht es denn?" (jemand anders am Hörer)',
      response: `<p>„Es geht um die Website und die Abläufe im Betrieb, Terminbuchung und Verwaltung. Ist <strong>[Name des Chefs]</strong> kurz erreichbar?"</p><p><strong>[Regie:</strong> Kurz und selbstbewusst. Du pitchst nicht den Gatekeeper.<strong>]</strong></p>`,
    },
  ];
}

export default function SeedKolacScriptPage() {
  const router = useRouter();
  const [status, setStatus] = useState<
    'idle' | 'running' | 'done' | 'error'
  >('idle');
  const [message, setMessage] = useState<string | null>(null);

  const handleSeed = async () => {
    setStatus('running');
    setMessage(null);
    try {
      const res = await createCallScriptVersion({
        note: 'Kolac Standard-Skript „Webseiten mit System" (Erstversion für neue Caller)',
        blocks: makeBlocks(),
        objections: makeObjections(),
      });
      setStatus('done');
      setMessage(
        `Version V${res.version} angelegt und aktiviert. Weiterleitung zum Skript…`,
      );
      setTimeout(() => router.push('/dashboard/vertrieb/skript'), 1500);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage((err as Error).message);
    }
  };

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/vertrieb/skript"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zum Skript
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">
          Kolac-Standard-Skript einspielen
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Legt das Cold-Call-Skript „Webseiten mit System" als neue,
          aktive Version an. Bestehende Versionen bleiben archiviert
          (Rollback möglich).
        </p>
      </header>

      <div className="card space-y-4">
        <div>
          <p className="text-sm font-medium text-gray-900 mb-2">
            Enthält:
          </p>
          <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
            <li>8 Skript-Blöcke (Grundprinzip → Einstieg → Pitch → Beweis → Elefant im Raum → Abschluss → Einwand-Prinzip → Anfängerfehler)</li>
            <li>6 Einwand-Antworten (Keine Zeit / Kein Interesse / Per Mail / Schon Website / Was kostet das / Gatekeeper)</li>
            <li>Regie-Hinweise fett markiert</li>
          </ul>
        </div>

        <div className="flex justify-end gap-2">
          <Link
            href="/dashboard/vertrieb/skript"
            className="btn-secondary"
          >
            Abbrechen
          </Link>
          <button
            type="button"
            onClick={handleSeed}
            disabled={status === 'running' || status === 'done'}
            className="btn-primary disabled:opacity-50"
          >
            {status === 'running'
              ? 'Lege an…'
              : status === 'done'
                ? 'Fertig ✓'
                : 'Skript als neue Version einspielen'}
          </button>
        </div>

        {message && (
          <div
            className={`px-3 py-2 rounded-lg text-sm ${
              status === 'error'
                ? 'bg-red-50 border border-red-200 text-red-700'
                : 'bg-emerald-50 border border-emerald-200 text-emerald-800'
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
