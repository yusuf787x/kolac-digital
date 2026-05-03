import { NextResponse } from 'next/server';
import {
  getOAuthClient,
  buildRedirectUri,
  PICKUP_COOKIE,
} from '@/lib/google-oauth';

export const runtime = 'nodejs';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  const settingsUrl = new URL('/dashboard/einstellungen', url.origin);

  if (error) {
    settingsUrl.searchParams.set('google', 'error');
    settingsUrl.searchParams.set('reason', error);
    return NextResponse.redirect(settingsUrl);
  }

  if (!code) {
    settingsUrl.searchParams.set('google', 'error');
    settingsUrl.searchParams.set('reason', 'missing_code');
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const redirectUri = buildRedirectUri(req.url);
    const client = getOAuthClient(redirectUri);
    const { tokens } = await client.getToken(code);

    if (!tokens.refresh_token) {
      settingsUrl.searchParams.set('google', 'error');
      settingsUrl.searchParams.set('reason', 'no_refresh_token');
      return NextResponse.redirect(settingsUrl);
    }

    // Get user email so the UI can show "verbunden als …".
    let userEmail = '';
    try {
      client.setCredentials(tokens);
      const userinfoRes = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        },
      );
      const userinfo = await userinfoRes.json();
      userEmail = userinfo.email ?? '';
    } catch (e) {
      console.warn('Could not fetch userinfo:', e);
    }

    const payload = {
      refreshToken: tokens.refresh_token,
      accessToken: tokens.access_token ?? null,
      tokenExpiresAt: tokens.expiry_date ?? null,
      scopes: (tokens.scope ?? '').split(' ').filter(Boolean),
      connectedEmail: userEmail,
    };

    const cookieValue = Buffer.from(JSON.stringify(payload)).toString('base64');

    settingsUrl.searchParams.set('google', 'connected');
    const res = NextResponse.redirect(settingsUrl);
    res.cookies.set(PICKUP_COOKIE, cookieValue, {
      httpOnly: true,
      sameSite: 'lax',
      secure: url.protocol === 'https:',
      path: '/',
      maxAge: 600, // 10 minutes — only used to hand off to client.
    });

    return res;
  } catch (err) {
    console.error('OAuth callback error:', err);
    settingsUrl.searchParams.set('google', 'error');
    settingsUrl.searchParams.set(
      'reason',
      (err as Error).message.slice(0, 100),
    );
    return NextResponse.redirect(settingsUrl);
  }
}
