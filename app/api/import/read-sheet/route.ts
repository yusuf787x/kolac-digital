import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getOAuthClientForRefresh } from '@/lib/google-oauth';
import { authenticate, authErrorResponse } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const SPREADSHEET_ID = process.env.GOOGLE_DRIVE_SPREADSHEET_ID!;

interface Body {
  refreshToken: string;
  einnahmenTab?: string;
  ausgabenTab?: string;
}

const matchTab = (
  available: string[],
  preferred: string,
  keywords: string[],
): string => {
  // Try exact match first.
  if (available.includes(preferred)) return preferred;
  // Then case-insensitive exact.
  const ci = available.find((t) => t.toLowerCase() === preferred.toLowerCase());
  if (ci) return ci;
  // Then any tab that contains one of the keywords.
  const fuzzy = available.find((t) =>
    keywords.some((kw) => t.toLowerCase().includes(kw)),
  );
  return fuzzy ?? '';
};

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

  if (!body.refreshToken) {
    return NextResponse.json(
      { error: 'refreshToken fehlt.' },
      { status: 400 },
    );
  }

  try {
    const auth = getOAuthClientForRefresh(body.refreshToken);
    const sheets = google.sheets({ version: 'v4', auth });

    // Read spreadsheet metadata to discover real tab names.
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: SPREADSHEET_ID,
      fields: 'sheets.properties.title',
    });
    const allTabs =
      meta.data.sheets?.map((s) => s.properties?.title).filter(Boolean) ?? [];

    const einnahmenTab =
      body.einnahmenTab ?? matchTab(allTabs as string[], 'Einnahmen', ['einnahm', 'umsatz']);
    const ausgabenTab =
      body.ausgabenTab ?? matchTab(allTabs as string[], 'Ausgaben', ['ausgab', 'kosten']);

    const fetchTab = async (tab: string) => {
      if (!tab) return [];
      try {
        const r = await sheets.spreadsheets.values.get({
          spreadsheetId: SPREADSHEET_ID,
          range: `${tab}!A:Z`,
          valueRenderOption: 'FORMATTED_VALUE',
        });
        return r.data.values ?? [];
      } catch (err) {
        console.warn(`Tab "${tab}" nicht lesbar:`, err);
        return [];
      }
    };

    const [einnahmen, ausgaben] = await Promise.all([
      fetchTab(einnahmenTab),
      fetchTab(ausgabenTab),
    ]);

    return NextResponse.json({
      ok: true,
      tabs: allTabs,
      einnahmenTab,
      ausgabenTab,
      einnahmen,
      ausgaben,
      einnahmenPreview: einnahmen.slice(0, 5),
      ausgabenPreview: ausgaben.slice(0, 5),
    });
  } catch (err) {
    console.error('Read sheet error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
