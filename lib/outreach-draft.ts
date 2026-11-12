/**
 * Erste Nachricht und Nachfass-Text mit Claude schreiben, nach Branchen-Playbook
 * und Jans Anschreiben-Aufbau: als Instagram-DM (lib/outreach-playbook.ts) oder
 * als E-Mail mit Website-Auswertung (lib/outreach-mail.ts). Jeder Text wird mit
 * lintMessage geprueft; bei Hinweisen schreibt Claude ihn einmal neu.
 * Genutzt von /api/outreach/draft, /api/outreach/mail und scripts/outreach/draft.mts.
 */
import Anthropic from '@anthropic-ai/sdk';
import { lintMessage, type OutreachLead } from './outreach';
import { MAIL_MAX, MAIL_SYSTEM, mailContext, parseMail } from './outreach-mail';
import { DRAFT_SYSTEM, branchOf, draftContext, parseDraft, type Branch } from './outreach-playbook';

type Usage = { input: number; output: number; cacheRead: number; cacheWrite: number };

export interface DraftResult {
  dm: string;
  followup: string;
  branch: Branch;
  warnings: string[];
  usage: Usage;
}

export interface MailResult {
  subject: string;
  body: string;
  followup: string;
  branch: Branch;
  warnings: string[];
  usage: Usage;
}

export class DraftError extends Error {}
/** Claude haelt den Betrieb fuer unpassend (Kette, Einkaufszentrum, falsche Branche). */
export class DraftSkip extends Error {}

/** Ein Text mit bis zu einem Korrekturdurchgang, wenn die Pruefung etwas meldet. */
async function write<T extends object>(
  client: Anthropic,
  system: string,
  context: string,
  parse: (text: string) => T | { skip: string } | null,
  lint: (r: T) => string[],
  format: string,
): Promise<{ result: T; warnings: string[]; usage: Usage }> {
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: context }];
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let last: T | null = null;
  let warnings: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const params = {
      model: 'claude-opus-5-5',
      max_tokens: 6000,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages,
      // Kurze Texte: wenig Nachdenken reicht und spart Kosten
      output_config: { effort: 'low' },
    } as Anthropic.MessageCreateParamsNonStreaming;
    const res = await client.messages.create(params);
    usage.input += res.usage.input_tokens;
    usage.output += res.usage.output_tokens;
    usage.cacheRead += res.usage.cache_read_input_tokens ?? 0;
    usage.cacheWrite += res.usage.cache_creation_input_tokens ?? 0;
    if (res.stop_reason === 'refusal') throw new DraftError('Claude hat keinen Text geschrieben.');

    const text = res.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const parsed = parse(text);
    if (!parsed) {
      if (attempt === 1) break;
      messages.push({ role: 'assistant', content: res.content }, { role: 'user', content: `Bitte nur das JSON-Objekt ${format} ausgeben.` });
      continue;
    }
    if ('skip' in parsed) throw new DraftSkip(parsed.skip);
    last = parsed;
    warnings = lint(parsed);
    if (!warnings.length) break;
    messages.push(
      { role: 'assistant', content: res.content },
      { role: 'user', content: `Die Prüfung meldet: ${warnings.join('; ')}. Bitte die Texte so korrigieren, sonst gleich lassen. Wieder nur das JSON.` },
    );
  }

  if (!last) throw new DraftError('Der Text kam unvollständig zurück.');
  return { result: last, warnings, usage };
}

export async function generateDraft(lead: OutreachLead & { contact?: string }, client = new Anthropic()): Promise<DraftResult> {
  const branch = branchOf(lead);
  const r = await write(
    client,
    DRAFT_SYSTEM,
    draftContext(lead, branch),
    (t) => parseDraft(t),
    (p) => [...lintMessage(p.dm, { first: true }), ...lintMessage(p.followup, { first: true }).map((w) => `Nachfassen: ${w}`)],
    '{"dm": "…", "followup": "…"}',
  );
  return { ...r.result, branch, warnings: r.warnings, usage: r.usage };
}

export async function generateMail(lead: OutreachLead, client = new Anthropic()): Promise<MailResult> {
  const branch = branchOf(lead);
  const r = await write(
    client,
    MAIL_SYSTEM,
    mailContext(lead, branch),
    (t) => parseMail(t),
    (p) => [
      ...lintMessage(p.body, { first: true, max: MAIL_MAX }),
      ...lintMessage(p.followup, { first: true, max: 500 }).map((w) => `Nachfassen: ${w}`),
      ...(/angebot|!/i.test(p.subject) ? ['Betreff klingt nach Werbung („Angebot“ oder Ausrufezeichen)'] : []),
    ],
    '{"subject": "…", "body": "…", "followup": "…"}',
  );
  return { ...r.result, branch, warnings: r.warnings, usage: r.usage };
}

/** Kosten in US-Dollar (Opus 5.5: 4 $ Eingabe, 20 $ Ausgabe, 0,20 $ Cache-Lesen, 5 $ Cache-Schreiben je Mio. Tokens). */
export const draftCost = (u: Usage) => (u.input * 4 + u.output * 20 + u.cacheRead * 0.2 + u.cacheWrite * 5) / 1e6;
