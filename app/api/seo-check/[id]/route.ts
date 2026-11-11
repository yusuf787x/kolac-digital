import { NextResponse } from 'next/server';
import { redactResult } from '@/lib/seo-check/run';
import { isOwnerRequest, loadCheck } from '@/lib/seo-check/store';
import type { SeoCheckResponse } from '@/lib/seo-check/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Gespeicherten Check laden (teilbarer Link /seo-check?id=...). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const stored = await loadCheck(id).catch(() => null);
  if (!stored) return NextResponse.json({ error: 'Dieser Check wurde nicht gefunden.' }, { status: 404 });
  const owner = await isOwnerRequest(req);
  const unlocked = owner || !!stored.lead;
  const response: SeoCheckResponse = {
    id,
    owner,
    unlocked,
    result: unlocked ? stored.result : redactResult(stored.result),
  };
  return NextResponse.json(response);
}
