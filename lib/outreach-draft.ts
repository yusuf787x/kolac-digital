/**
 * Erste DM und Nachfass-Text mit Claude schreiben, nach Branchen-Playbook und
 * Jans Anschreiben-Aufbau (lib/outreach-playbook.ts). Jeder Text wird mit
 * lintMessage geprueft; bei Hinweisen schreibt Claude ihn einmal neu.
 * Genutzt von /api/outreach/draft (Dashboard) und scripts/outreach/draft.mts.
 */
import Anthropic from '@anthropic-ai/sdk';
import { lintMessage, type OutreachLead } from './outreach';
import { DRAFT_SYSTEM, branchOf, draftContext, parseDraft, type Branch } from './outreach-playbook';

export interface DraftResult {
  dm: string;
  followup: string;
  branch: Branch;
  warnings: string[];
  usage: { input: number; output: number; cacheRead: number; cacheWrite: number };
}

export class DraftError extends Error {}
/** Claude haelt den Betrieb fuer unpassend (Kette, Einkaufszentrum, falsche Branche). */
export class DraftSkip extends Error {}

export async function generateDraft(lead: OutreachLead & { contact?: string }, client = new Anthropic()): Promise<DraftResult> {
  const branch = branchOf(lead);
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: draftContext(lead, branch) }];
  const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };
  let last: { dm: string; followup: string } | null = null;
  let warnings: string[] = [];

  for (let attempt = 0; attempt < 2; attempt++) {
    const params = {
      model: 'claude-opus-5-5',
      max_tokens: 6000,
      system: [{ type: 'text', text: DRAFT_SYSTEM, cache_control: { type: 'ephemeral' } }],
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
    const parsed = parseDraft(text);
    if (!parsed) {
      if (attempt === 1) break;
      messages.push({ role: 'assistant', content: res.content }, { role: 'user', content: 'Bitte nur das JSON-Objekt {"dm": "…", "followup": "…"} ausgeben.' });
      continue;
    }
    if ('skip' in parsed) throw new DraftSkip(parsed.skip);
    last = parsed;
    warnings = [...lintMessage(parsed.dm, { first: true }), ...lintMessage(parsed.followup, { first: true }).map((w) => `Nachfassen: ${w}`)];
    if (!warnings.length) break;
    messages.push(
      { role: 'assistant', content: res.content },
      { role: 'user', content: `Die Prüfung meldet: ${warnings.join('; ')}. Bitte beide Texte so korrigieren, sonst gleich lassen. Wieder nur das JSON.` },
    );
  }

  if (!last) throw new DraftError('Der Text kam unvollständig zurück.');
  return { ...last, branch, warnings, usage };
}

/** Kosten in US-Dollar (Opus 5.5: 4 $ Eingabe, 20 $ Ausgabe, 0,20 $ Cache-Lesen, 5 $ Cache-Schreiben je Mio. Tokens). */
export const draftCost = (u: DraftResult['usage']) => (u.input * 4 + u.output * 20 + u.cacheRead * 0.2 + u.cacheWrite * 5) / 1e6;
