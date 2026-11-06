import { NextResponse } from 'next/server';
import { authenticate, authErrorResponse } from '@/lib/server-auth';
import { sendDunningStage, sendDunningTest } from '@/lib/dunning-server';
import type { DunningStage } from '@/lib/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * „Jetzt senden“ im Dashboard: verschickt die nächste Stufe sofort,
 * unabhängig vom Zeitplan und auch bei pausierter Rechnung. `stage` muss
 * der Stufe entsprechen, die der Knopf angezeigt hat.
 *
 * Mit `test: true` geht dieselbe Mail nur an Yusuf ([Test] im Betreff),
 * an der Rechnung ändert sich nichts.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const auth = await authenticate(req);
  const errResp = authErrorResponse(auth);
  if (errResp) return errResp;

  const { id } = await ctx.params;
  let stage: DunningStage | undefined;
  let test = false;
  try {
    const body = (await req.json()) as { stage?: number; test?: boolean };
    if (body.stage === 1 || body.stage === 2 || body.stage === 3) stage = body.stage;
    test = body.test === true;
  } catch {
    // Body optional
  }
  if (!stage) {
    return NextResponse.json({ error: 'Stufe fehlt.' }, { status: 400 });
  }

  if (test) {
    try {
      return NextResponse.json({ ok: true, ...(await sendDunningTest(id, stage)) });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 500 });
    }
  }

  try {
    const result = await sendDunningStage(id, { trigger: 'manual', expectedStage: stage });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }
}
