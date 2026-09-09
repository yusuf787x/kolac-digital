import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { authenticate, authErrorResponse } from '@/lib/server-auth';
import {
  BLOG_SYSTEM_PROMPT,
  BLOG_ARTICLE_SCHEMA,
  buildBlogUserPrompt,
  sanitizeArticleText,
  type GeneratedArticle,
} from '@/lib/blog-prompt';

export const runtime = 'nodejs';
export const maxDuration = 300;

interface Body {
  title: string;
  angle: string;
  category: string;
  keywords: string[];
  /** Titel vorhandener Artikel, damit nichts doppelt geschrieben wird. */
  existingTitles?: string[];
}

/**
 * Erzeugt aus einem Thema einen fertigen Artikel-Entwurf.
 *
 * Gibt nur die Daten zurueck, gespeichert wird im Dashboard. So kann
 * der Entwurf vor dem Anlegen noch verworfen werden.
 */
export async function POST(req: Request) {
  const auth = await authenticate(req);
  const errResp = authErrorResponse(auth);
  if (errResp) return errResp;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY ist nicht gesetzt.' },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: 'Ungültiger Request-Body.' },
      { status: 400 },
    );
  }

  if (!body.title?.trim()) {
    return NextResponse.json(
      { error: 'Ein Thema (title) ist erforderlich.' },
      { status: 400 },
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8000,
      system: BLOG_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildBlogUserPrompt({
            title: body.title.trim(),
            angle: body.angle?.trim() || 'Praxisnaher Ratgeber zum Thema.',
            category: body.category || 'Webseiten mit System',
            keywords: body.keywords?.length ? body.keywords : [body.title],
            existingTitles: body.existingTitles ?? [],
          }),
        },
      ],
      ...({
        output_config: {
          format: { type: 'json_schema', schema: BLOG_ARTICLE_SCHEMA },
        },
      } as Record<string, unknown>),
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    );
    if (!textBlock) {
      return NextResponse.json(
        { error: 'Keine Text-Antwort vom Modell erhalten.' },
        { status: 502 },
      );
    }

    let parsed: GeneratedArticle;
    try {
      parsed = JSON.parse(textBlock.text) as GeneratedArticle;
    } catch {
      return NextResponse.json(
        {
          error: 'Antwort konnte nicht als JSON gelesen werden.',
          rawResponse: textBlock.text.slice(0, 300),
        },
        { status: 502 },
      );
    }

    const clean = sanitizeArticleText(parsed);

    return NextResponse.json({
      ok: true,
      data: clean,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', err.status, err.message);
      return NextResponse.json(
        { error: `Claude API Fehler ${err.status}: ${err.message}` },
        { status: err.status >= 500 ? 502 : err.status },
      );
    }
    console.error('Blog generation error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
