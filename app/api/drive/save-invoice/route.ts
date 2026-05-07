import { NextResponse } from 'next/server';
import { saveInvoiceToDrive } from '@/lib/google-drive';
import { authenticate, authErrorResponse } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface Body {
  refreshToken: string;
  pdfBase64: string;
  filename: string;
  date: string;
  customerName: string;
  invoiceNumber: string;
  leistung: string;
  amount: number;
}

export async function POST(req: Request) {
  const auth = await authenticate(req);
  const errResp = authErrorResponse(auth);
  if (errResp) return errResp;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  if (!body.refreshToken || !body.pdfBase64 || !body.invoiceNumber) {
    return NextResponse.json(
      { error: 'Pflichtfelder fehlen.' },
      { status: 400 },
    );
  }

  try {
    const { webViewLink, sheetSyncError } = await saveInvoiceToDrive(body);
    return NextResponse.json({ ok: true, webViewLink, sheetSyncError });
  } catch (err) {
    console.error('Drive save invoice error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
