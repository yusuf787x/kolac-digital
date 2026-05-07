import { NextResponse } from 'next/server';
import { saveConfirmationToDrive } from '@/lib/google-drive';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface Body {
  refreshToken: string;
  fileBase64: string;
  filename: string;
  mimeType: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  if (!body.refreshToken || !body.fileBase64 || !body.filename) {
    return NextResponse.json(
      { error: 'Pflichtfelder fehlen.' },
      { status: 400 },
    );
  }

  try {
    const { webViewLink } = await saveConfirmationToDrive(body);
    return NextResponse.json({ ok: true, webViewLink });
  } catch (err) {
    console.error('Drive save confirmation error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
