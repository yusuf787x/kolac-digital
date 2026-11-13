import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { adminDb } from '@/lib/firebase-admin';
import { isMailLead, isOptOut, type OutreachLead, type OutreachMessage } from '@/lib/outreach';
import { PLAYBOOKS, branchOf, referenceFor } from '@/lib/outreach-playbook';
import { badRequest, requireAdmin, safe } from '@/lib/seo/server/admin-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COL = 'outreachLeads';

/** Fester Teil, damit er gecacht werden kann. Alles Betriebsbezogene steht in der Nutzer-Nachricht. */
const SYSTEM = `Du schreibst Instagram-Antworten für Yusuf Kolac (Kolac Digital, Bielefeld). Yusuf baut lokalen Betrieben in OWL ein System aus Website, Anfragen oder Online-Buchung und Automatisierung, komplett für sie. Er hat den Betrieb per Instagram-DM angeschrieben und ihm einen kostenlosen Entwurf seiner Website angeboten: mit den eigenen Bildern, Leistungen und Google-Bewertungen, als Link zum Anschauen am Handy. Gefällt der Entwurf nicht, wird der Link gelöscht, ohne Rechnung, ohne Vertrag, ohne Verkaufsgespräch. Was Yusuf der jeweiligen Branche baut, welche Probleme sie hat und welche Referenz (mit Link) zu diesem Betrieb passt, steht in der Nutzer-Nachricht. Nur diese Referenz nennen, keine anderen Kunden oder Zahlen erfinden.

Ziel jeder Antwort: das Gespräch einen kleinen Schritt weiterbringen.
- Sagt der Betrieb Ja oder zeigt Interesse: bedanken, kurz sagen, was als Nächstes passiert ("Ich nehm eure Bilder von Insta und die Leistungen von eurer Seite, in ein paar Tagen schick ich euch den Link"), höchstens eine Frage stellen, die Yusuf wirklich braucht (z. B. ob es ein Buchungs- oder Anfragesystem gibt, das bleiben soll).
- Stellt der Betrieb eine Frage: ehrlich und kurz beantworten, dann zurück zum kostenlosen Entwurf.
- Fragt der Betrieb nach dem Preis: ehrlich sagen, dass es vom Umfang abhängt und Yusuf das nach dem Entwurf in 10 Minuten am Telefon sagt, der Entwurf selbst kostet nichts. Keine Zahlen erfinden.
- Ist der Betrieb skeptisch: Verständnis zeigen, das Risiko wegnehmen (kostenlos, Link löschen reicht), nicht drängen.
- Ist es eine Absage oder will es keine Nachrichten mehr: keine Überzeugungsversuche. Ein kurzer, freundlicher Abschluss ("Alles klar, danke dir für die Rückmeldung, dann alles Gute!").

Stil: wie eine echte Instagram-Nachricht von Yusuf. Locker, freundlich, professionell, kurze Sätze, höchstens 3 kurze Absätze, unter 450 Zeichen. Gleiche Anrede wie der Betrieb (du, ihr oder Sie, im Zweifel wie in Yusufs bisherigen Nachrichten). Keine Floskeln wie "Ich hoffe, es geht dir gut". Die erste Nachricht hatte keinen Link: Bei Interesse oder Fragen passt jetzt der Case-Study-Link oben (höchstens einmal im Verlauf), keine anderen Links, keine erfundenen Fakten über den Betrieb, kein Druck, höchstens ein Emoji.

Antworte ausschließlich mit einem JSON-Objekt, ohne Text davor oder danach:
{"intent": "interessiert" | "frage" | "preis" | "skeptisch" | "absage" | "sonstiges", "reply": "die Nachricht für Yusuf zum Kopieren", "next": "ein kurzer Satz für Yusuf, was er als Nächstes tun sollte"}`;

type Intent = 'interessiert' | 'frage' | 'preis' | 'skeptisch' | 'absage' | 'sonstiges';

function context(lead: OutreachLead, thread: OutreachMessage[]): string {
  const branch = branchOf(lead);
  const p = PLAYBOOKS[branch];
  const ref = referenceFor(lead, branch).main;
  const mail = isMailLead(lead);
  const first = mail ? lead.mailBody : lead.dm;
  const followup = mail ? lead.mailFollowup : lead.followup;
  const lines = [
    mail
      ? 'Kanal: E-Mail statt Instagram. Die Antwort ist eine E-Mail: Sie-Form, mit Anrede wie in Yusufs Mail, bis 900 Zeichen, Schluss mit "Viele Grüße" und "Yusuf Kolac". Der Rest gilt wie beschrieben.'
      : '',
    `Branche: ${p.label}. Was Yusuf baut: ${p.system}. Zielbild: ${p.outcome}.`,
    `Probleme der Branche: ${p.pains.join(' / ')}`,
    `Referenz für diesen Betrieb: ${ref.name}. ${ref.proof} Link (der Case-Study-Link oben): ${ref.url}`,
    `Betrieb: ${lead.name}${lead.city ? `, ${lead.city}` : ''}`,
    lead.rating ? `Google: ${lead.rating} Sterne bei ${lead.reviews ?? '?'} Bewertungen` : '',
    lead.instagram ? `Instagram: @${lead.instagram}${lead.ig?.bio ? `, Bio: ${lead.ig.bio.replace(/\n/g, ' / ')}` : ''}` : '',
    lead.website ? `Website: ${lead.website}` : 'Keine eigene Website',
    lead.scan?.findings.length ? `Funde: ${lead.scan.findings.join('; ')}` : '',
    '',
    `Yusufs erste Nachricht:\n${first ?? '(nicht gespeichert)'}`,
    lead.followedUpAt && followup ? `\nYusufs Nachfass-Nachricht:\n${followup}` : '',
    '',
    'Verlauf danach (älteste zuerst):',
    ...thread.map((m) => `${m.from === 'studio' ? 'Betrieb' : 'Yusuf'}: ${m.text}`),
    '',
    'Schreib Yusufs Antwort auf die letzte Nachricht des Betriebs.',
  ];
  return lines.filter((l) => l !== '').join('\n');
}

function parse(text: string): { intent: Intent; reply: string; next: string } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as { intent?: string; reply?: string; next?: string };
    if (typeof j.reply !== 'string') return null;
    const intents: Intent[] = ['interessiert', 'frage', 'preis', 'skeptisch', 'absage', 'sonstiges'];
    return {
      intent: intents.includes(j.intent as Intent) ? (j.intent as Intent) : 'sonstiges',
      reply: j.reply.trim(),
      next: (j.next ?? '').trim(),
    };
  } catch {
    return null;
  }
}

/**
 * POST { id, reply }        neue Antwort des Studios (Dashboard, angemeldet)
 * POST { id, retry: true }   Vorschlag fuer die letzte gespeicherte Antwort neu holen
 * Speichert die Antwort des Studios im Verlauf. Klare Absage: sofort
 * "Kein Interesse", kein Vorschlag. Sonst: Antwortvorschlag von Claude.
 */
async function handlePOST(req: Request) {
  const denied = await requireAdmin(req);
  if (denied) return denied;

  const body = (await req.json().catch(() => null)) as { id?: string; reply?: string; retry?: boolean } | null;
  const id = body?.id?.trim();
  const reply = body?.reply?.trim();
  const retry = body?.retry === true;
  if (!id || (!reply && !retry)) return badRequest('id und reply fehlen.');
  if (reply && reply.length > 4000) return badRequest('Die Antwort ist zu lang.');

  const ref = adminDb().collection(COL).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return badRequest('Betrieb nicht gefunden.', 404);
  const lead = { id, ...snap.data() } as OutreachLead;

  const now = new Date().toISOString();
  if (retry && lead.thread?.at(-1)?.from !== 'studio') return badRequest('Keine offene Antwort des Studios.');
  const thread: OutreachMessage[] = retry ? (lead.thread ?? []) : [...(lead.thread ?? []), { from: 'studio', text: reply!, at: now }];

  if (!retry && isOptOut(reply!)) {
    await ref.update({ thread, status: 'kein-interesse', repliedAt: lead.repliedAt ?? now, updatedAt: now });
    return NextResponse.json({ optOut: true });
  }

  // Antwort sofort festhalten, auch wenn der Vorschlag gleich scheitert
  const statusPatch = ['neu', 'gesendet', 'nachgefasst'].includes(lead.status) ? { status: 'geantwortet', repliedAt: lead.repliedAt ?? now } : {};
  if (!retry) await ref.update({ thread, ...statusPatch, updatedAt: now });

  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: 'claude-opus-5-5',
      max_tokens: 4000,
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: context(lead, thread) }],
    });
    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ saved: true, error: 'Claude hat keinen Vorschlag gemacht. Bitte selbst antworten.' });
    }
    const text = response.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const result = parse(text);
    if (!result) return NextResponse.json({ saved: true, error: 'Der Vorschlag kam unvollständig zurück. Bitte noch einmal versuchen.' });
    return NextResponse.json({ saved: true, ...result });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ saved: true, error: 'Gerade zu viele Anfragen an Claude. In einer Minute noch einmal versuchen.' });
    }
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', err.status, err.message);
      return NextResponse.json({ saved: true, error: `Claude ist gerade nicht erreichbar (${err.status ?? 'Netzwerk'}). Die Antwort ist gespeichert.` });
    }
    throw err;
  }
}

export const POST = safe(handlePOST);
