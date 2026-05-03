import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClientForRefresh } from '@/lib/google-oauth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SPREADSHEET_ID = process.env.GOOGLE_DRIVE_SPREADSHEET_ID!;

interface Body {
  refreshToken: string;
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  if (!body.refreshToken) {
    return NextResponse.json(
      { error: 'refreshToken fehlt.' },
      { status: 400 },
    );
  }

  try {
    const auth = getOAuthClientForRefresh(body.refreshToken);
    const sheets = google.sheets({ version: 'v4', auth });

    const [einnahmen, ausgaben] = await Promise.all([
      sheets.spreadsheets.values
        .get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Einnahmen!A:Z',
          valueRenderOption: 'UNFORMATTED_VALUE',
          dateTimeRenderOption: 'FORMATTED_STRING',
        })
        .then((r) => r.data.values ?? []),
      sheets.spreadsheets.values
        .get({
          spreadsheetId: SPREADSHEET_ID,
          range: 'Ausgaben!A:Z',
          valueRenderOption: 'UNFORMATTED_VALUE',
          dateTimeRenderOption: 'FORMATTED_STRING',
        })
        .then((r) => r.data.values ?? []),
    ]);

    return NextResponse.json({ ok: true, einnahmen, ausgaben });
  } catch (err) {
    console.error('Read sheet error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
