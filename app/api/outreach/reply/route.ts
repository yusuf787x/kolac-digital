import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { adminDb } from '@/lib/firebase-admin';
import { isOptOut, type OutreachLead, type OutreachMessage } from '@/lib/outreach';
import { badRequest, requireAdmin, safe } from '@/lib/seo/server/admin-route';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const COL = 'outreachLeads';

/** Fester Teil, damit er gecacht werden kann. Alles Betriebsbezogene steht in der Nutzer-Nachricht. */
const SYSTEM = `Du schreibst Instagram-Antworten für Yusuf Kolac (Kolac Digital, Bielefeld). Yusuf baut Websites mit Online-Buchung für kleine Kosmetik- und Beauty-Studios in OWL. Er hat das Studio per Instagram-DM angeschrieben und ihm einen kostenlosen Entwurf seiner Website angeboten: mit den eigenen Bildern, Behandlungen und Google-Bewertungen, als Link zum Anschauen am Handy. Gefällt der Entwurf nicht, wird der Link gelöscht, ohne Rechnung, ohne Vertrag, ohne Verkaufsgespräch. Beweis, den er nennen darf: Bacara Ästhetik in Bünde (öffentliche Case Study: kolac-digital.de/case-studys/bacara-aesthetik). Über 800 Termine online gebucht, ohne einen einzigen Anruf, ein System statt fünf, Einwilligungen digital, Erinnerungen automatisch. Das System, das Yusuf baut: Kundinnen buchen selbst in freie Zeiten, bekommen am Vortag automatisch eine Erinnerung, füllen Anamnese und Einwilligung vorher am Handy aus, und das Studio hat alles in einem Kalender statt verteilt auf Instagram, WhatsApp und Telefon, ohne Provision wie bei Treatwell.

Ziel jeder Antwort: das Gespräch einen kleinen Schritt weiterbringen.
- Sagt das Studio Ja oder zeigt Interesse: bedanken, kurz sagen, was als Nächstes passiert ("Ich nehm deine Bilder von Insta und die Behandlungen von deiner Seite, in ein paar Tagen schick ich dir den Link"), höchstens eine Frage stellen, die Yusuf wirklich braucht (z. B. ob es ein Buchungssystem gibt, das bleiben soll).
- Stellt das Studio eine Frage: ehrlich und kurz beantworten, dann zurück zum kostenlosen Entwurf.
- Fragt das Studio nach dem Preis: ehrlich sagen, dass es vom Umfang abhängt und Yusuf das nach dem Entwurf in 10 Minuten am Telefon sagt, der Entwurf selbst kostet nichts. Keine Zahlen erfinden.
- Ist das Studio skeptisch: Verständnis zeigen, das Risiko wegnehmen (kostenlos, Link löschen reicht), nicht drängen.
- Ist es eine Absage oder will es keine Nachrichten mehr: keine Überzeugungsversuche. Ein kurzer, freundlicher Abschluss ("Alles klar, danke dir für die Rückmeldung, dann alles Gute!").

Stil: wie eine echte Instagram-Nachricht von Yusuf. Locker, freundlich, professionell, kurze Sätze, höchstens 3 kurze Absätze, unter 450 Zeichen. Gleiche Anrede wie das Studio (du, ihr oder Sie, im Zweifel wie in Yusufs bisherigen Nachrichten). Keine Floskeln wie "Ich hoffe, es geht dir gut", höchstens der Case-Study-Link oben, keine anderen Links, keine erfundenen Fakten über das Studio, kein Druck, höchstens ein Emoji.

Antworte ausschließlich mit einem JSON-Objekt, ohne Text davor oder danach:
{"intent": "interessiert" | "frage" | "preis" | "skeptisch" | "absage" | "sonstiges", "reply": "die Nachricht für Yusuf zum Kopieren", "next": "ein kurzer Satz für Yusuf, was er als Nächstes tun sollte"}`;

type Intent = 'interessiert' | 'frage' | 'preis' | 'skeptisch' | 'absage' | 'sonstiges';

function context(lead: OutreachLead, thread: OutreachMessage[]): string {
  const lines = [
    `Studio: ${lead.name}${lead.city ? `, ${lead.city}` : ''}`,
    lead.rating ? `Google: ${lead.rating} Sterne bei ${lead.reviews ?? '?'} Bewertungen` : '',
    lead.instagram ? `Instagram: @${lead.instagram}${lead.ig?.bio ? `, Bio: ${lead.ig.bio.replace(/\n/g, ' / ')}` : ''}` : '',
    lead.website ? `Website: ${lead.website}` : 'Keine eigene Website',
    lead.scan?.findings.length ? `Funde: ${lead.scan.findings.join('; ')}` : '',
    '',
    `Yusufs erste Nachricht:\n${lead.dm ?? '(nicht gespeichert)'}`,
    lead.followedUpAt && lead.followup ? `\nYusufs Nachfass-Nachricht:\n${lead.followup}` : '',
    '',
    'Verlauf danach (älteste zuerst):',
    ...thread.map((m) => `${m.from === 'studio' ? 'Studio' : 'Yusuf'}: ${m.text}`),
    '',
    'Schreib Yusufs Antwort auf die letzte Nachricht des Studios.',
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
