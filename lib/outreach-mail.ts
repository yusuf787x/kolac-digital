/**
 * E-Mail an Betriebe ohne (passendes) Instagram: gleicher Aufbau wie die DM
 * (Jans Vorlage), aber mit einer kurzen Auswertung der Website als Aufhaenger
 * und etwas foermlicher. Genutzt von /api/outreach/mail.
 */
import type { OutreachLead } from './outreach';
import { PLAYBOOKS, PROOF, branchOf, type Branch } from './outreach-playbook';

export const MAIL_MAX = 1600;

export const MAIL_SYSTEM = `Du schreibst eine erste E-Mail und eine Nachfass-Mail für Yusuf Kolac (Kolac Digital, Bielefeld). Yusuf baut lokalen Betrieben in OWL ein System aus Website, Anfragen oder Online-Buchung und Automatisierung, komplett für sie (done for you). Er schickt jede Mail selbst aus seinem Postfach, seine Signatur mit Impressum hängt sein Mailprogramm an.

Der Aufhänger ist eine kurze, ehrliche Auswertung der Website des Betriebs (oder dass es keine eigene gibt). Die Mail soll sich lesen wie von einem Menschen, der sich die Seite wirklich angeschaut hat, nicht wie ein Werbebrief.

Aufbau:
1. Anrede: "Hallo Frau <Nachname>," oder "Hallo Herr <Nachname>," wenn ein Ansprechpartner bekannt ist (Geschlecht nur, wenn eindeutig, sonst "Hallo <Vorname> <Nachname>,"), sonst "Hallo zusammen,". Nie einen Namen erfinden.
2. Icebreaker, ein Satz, konkret aus den Daten: Spezialisierung, Standort, Bewertungen. Ehrlich, kein Schleimen.
3. "Ich habe mir Ihre Website angeschaut, dabei sind mir <zwei oder drei> Dinge aufgefallen:" und dann die Funde als kurze Liste mit "- ". Je Punkt: was auffällt und in einem Halbsatz, was es den Betrieb kostet (Anfragen, Anrufe, Zeit, Google-Platz). Nur Funde aus den Daten, in einfachen Worten, ohne Fachbegriffe, nie herablassend. Ohne eigene Website: sagen, dass Sie den Betrieb bei Google gefunden haben, aber keine eigene Seite, und was das bedeutet.
4. "Ich bin Yusuf Kolac aus Bielefeld und baue <Branche> <das System in Kurzform>, komplett fertig."
5. Der Schmerz in ihren Worten: "Viele <Branche>, mit denen ich spreche, sagen mir: „…“" mit EINEM passenden Problem aus der Liste.
6. Das Angebot: kostenlos einen Entwurf für <Name des Betriebs>, damit <Zielbild>. Gefällt er nicht, wird der Link gelöscht, ohne Rechnung und ohne Verkaufsgespräch.
7. Beweis in einem Satz ohne Link: "Für eine Praxis in Bünde habe ich so ein System gebaut, da kamen über 800 Termine online rein, ohne einen einzigen Anruf." Keine anderen Zahlen oder Kunden erfinden.
8. "Ich liefere lieber erst, dann reden wir." und eine kurze Frage, ob Yusuf den Entwurf bauen soll.
9. "Falls das gerade kein Thema ist, reicht eine kurze Antwort, dann melde ich mich nicht wieder."
10. "Viele Grüße" und in der nächsten Zeile "Yusuf Kolac".

Betreff: kurz und konkret, mit dem Namen des Betriebs, wie eine persönliche Mail, z. B. "<Betrieb>: zwei Dinge auf Ihrer Website". Kein "Angebot", keine Großbuchstaben, kein Ausrufezeichen, kein Emoji.

Regeln:
- 900 bis 1500 Zeichen für die Mail, kurze Absätze.
- Sie-Form durchgehend, nicht mischen.
- Kein Link, keine Domain, keine E-Mail-Adresse, kein Preis, keine Emojis.
- Keine Floskeln ("Ich hoffe, es geht Ihnen gut", "kurze Frage", "Sehr geehrte"), keine Versprechen wie "garantiert" oder "100 %".
- Nichts behaupten, was nicht in den Daten steht. "Keine Online-Buchung" heißt nur: auf der Website wurde keine gefunden.
- Die Folge eines Funds nur so stark formulieren, wie er trägt. Keine pauschalen Urteile über Baukästen oder Systeme (z. B. nicht "Joomla ist langsam"), keine erfundenen Messwerte.
- Steht als Website nur ein Buchungsportal oder Linkbaum, gilt das als "keine eigene Website".

Nicht schreiben, wenn der Betrieb nicht passt: Einkaufszentrum, Kette oder Filiale eines Konzerns, Waschstraße statt Aufbereiter, oder die Daten widersprechen sich. Dann nur {"skip": "kurzer Grund für Yusuf"} ausgeben.

Nachfass-Mail: höchstens 450 Zeichen, gleiche Anrede, Bezug auf die erste Mail ("falls meine Mail untergegangen ist"), Entwurf kostenlos, eine Frage, und dass Yusuf sich danach nicht noch einmal meldet, wenn keine Antwort kommt. Mit "Viele Grüße" und "Yusuf Kolac".

Antworte ausschließlich mit einem JSON-Objekt, ohne Text davor oder danach:
{"subject": "…", "body": "…", "followup": "…"} oder {"skip": "…"}`;

/** Messwerte der Website-Pruefung in Worten, damit Claude nichts falsch deutet. */
function scanFacts(lead: OutreachLead): string[] {
  const s = lead.scan;
  if (!s) return [];
  return [
    s.findings.length ? `Funde der Website-Prüfung: ${s.findings.join('; ')}` : '',
    s.https === false ? 'Seite ohne sichere Verbindung (kein https, Browser zeigt "nicht sicher")' : '',
    s.viewport === false ? 'Seite nicht für Handys angepasst' : '',
    typeof s.responseMs === 'number' && s.responseMs > 1500 ? `Antwortzeit der Seite: ${(s.responseMs / 1000).toFixed(1)} Sekunden` : '',
    s.copyrightYear ? `Jahr im Seitenfuß: ${s.copyrightYear}` : '',
    s.platform ? `Baukasten oder System: ${s.platform}` : '',
    s.booking ? `Buchung oder Anfrage über: ${s.booking}` : '',
    typeof s.seoScore === 'number' ? `SEO-Bewertung der Seite: ${s.seoScore} von 100` : '',
    typeof s.top10 === 'number' ? `Suchbegriffe in den Google-Top-10: ${s.top10}` : '',
  ];
}

export function mailContext(lead: OutreachLead, branch: Branch = branchOf(lead)): string {
  const p = PLAYBOOKS[branch];
  const lines = [
    `Branche: ${p.label} (Mehrzahl: ${p.plural}).`,
    `System, das Yusuf dieser Branche baut: ${p.system}.`,
    `Probleme der Branche in ihren Worten:\n${p.pains.map((x) => `- „${x}“`).join('\n')}`,
    `Zielbild: ${p.outcome}.`,
    `Der kostenlose Entwurf zeigt: ${p.freebie}.`,
    `Beweis: ${PROOF.split('. Öffentliche')[0]}.`,
    '',
    `Betrieb: ${lead.name}${lead.city ? `, ${lead.city}` : ''}${lead.category ? ` (${lead.category})` : ''}`,
    lead.contact ? `Ansprechpartner: ${lead.contact}` : 'Ansprechpartner: unbekannt',
    lead.rating ? `Google: ${lead.rating} Sterne bei ${lead.reviews ?? '?'} Bewertungen` : '',
    lead.website ? 'Eigene Website: vorhanden' : 'Keine eigene Website, nur der Google-Eintrag',
    ...scanFacts(lead),
    '',
    'Schreib die erste Mail und die Nachfass-Mail.',
  ];
  return lines.filter((l) => l !== '').join('\n');
}

export function parseMail(text: string): { subject: string; body: string; followup: string } | { skip: string } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as { subject?: unknown; body?: unknown; followup?: unknown; skip?: unknown };
    if (typeof j.skip === 'string' && j.skip.trim()) return { skip: j.skip.trim() };
    if (typeof j.subject !== 'string' || typeof j.body !== 'string' || typeof j.followup !== 'string') return null;
    return { subject: j.subject.trim(), body: j.body.trim(), followup: j.followup.trim() };
  } catch {
    return null;
  }
}
