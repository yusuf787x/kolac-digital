import { NextResponse } from 'next/server';
import { getOAuthClient, buildRedirectUri, GOOGLE_SCOPES } from '@/lib/google-oauth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  try {
    const redirectUri = buildRedirectUri(req.url);
    const client = getOAuthClient(redirectUri);

    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
      include_granted_scopes: true,
    });

    return NextResponse.redirect(url);
  } catch (err) {
    console.error('OAuth start error:', err);
    return NextResponse.redirect(
      new URL('/dashboard/einstellungen?google=error', req.url),
    );
  }
}
