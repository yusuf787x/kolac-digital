import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { adminDb } from '@/lib/firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import {
  BLOG_SYSTEM_PROMPT,
  BLOG_ARTICLE_SCHEMA,
  buildBlogUserPrompt,
  sanitizeArticleText,
  type GeneratedArticle,
} from '@/lib/blog-prompt';
import { estimateReadingMinutes } from '@/lib/blog-markdown';

export const runtime = 'nodejs';
export const maxDuration = 300;

/**
 * Woechentlicher Lauf: nimmt das naechste offene Thema aus der
 * Warteschlange und legt daraus einen Artikel-ENTWURF an.
 *
 * Bewusst kein automatisches Veroeffentlichen. Der Entwurf landet im
 * Dashboard unter Blog und geht erst live, wenn er dort freigegeben
 * wird. So kann kein ungeprueter Text mit falschen Angaben ueber das
 * eigene Geschaeft online gehen.
 *
 * Absicherung: Vercel schickt bei Cron-Aufrufen den Header
 * `authorization: Bearer <CRON_SECRET>`. Ohne passenden Wert wird der
 * Aufruf abgelehnt, damit die Route nicht von aussen ausgeloest werden
 * kann.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const header = req.headers.get('authorization');
    if (header !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Nicht berechtigt.' }, { status: 401 });
    }
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY ist nicht gesetzt.' },
      { status: 500 },
    );
  }

  const db = adminDb();

  try {
    // Naechstes offenes Thema mit der niedrigsten Prioritaetszahl.
    const topicSnap = await db
      .collection('blogTopics')
      .where('status', '==', 'open')
      .get();

    if (topicSnap.empty) {
      return NextResponse.json({
        ok: true,
        skipped: 'Keine offenen Themen in der Warteschlange.',
      });
    }

    interface TopicRow {
      id: string;
      title?: string;
      angle?: string;
      category?: string;
      targetKeywords?: string[];
      priority?: number;
    }
    const topics: TopicRow[] = topicSnap.docs
      .map((d) => ({ id: d.id, ...(d.data() as Omit<TopicRow, 'id'>) }))
      .sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999));
    const topic = topics[0];

    // Titel vorhandener Artikel mitgeben, damit nichts doppelt entsteht.
    const postsSnap = await db.collection('blogPosts').get();
    const existingTitles = postsSnap.docs.map(
      (d) => (d.data().title as string) ?? '',
    );

    const client = new Anthropic();
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 8000,
      system: BLOG_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: buildBlogUserPrompt({
            title: topic.title ?? '',
            angle: topic.angle ?? '',
            category: topic.category ?? 'Webseiten mit System',
            keywords: topic.targetKeywords ?? [],
            existingTitles,
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
        { error: 'Keine Text-Antwort vom Modell.' },
        { status: 502 },
      );
    }

    const article = sanitizeArticleText(
      JSON.parse(textBlock.text) as GeneratedArticle,
    );

    const now = Timestamp.now();
    const postRef = await db.collection('blogPosts').add({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      tldr: article.tldr,
      body: article.body,
      category: topic.category ?? 'Webseiten mit System',
      targetKeywords: article.targetKeywords ?? [],
      faq: article.faq ?? [],
      metaTitle: article.metaTitle,
      metaDescription: article.metaDescription,
      status: 'draft',
      heroEmoji: article.heroEmoji || '📄',
      readingMinutes: estimateReadingMinutes(article.body),
      source: 'ai',
      publishedAt: null,
      createdAt: now,
      updatedAt: now,
    });

    await db.collection('blogTopics').doc(topic.id).update({
      status: 'generated',
      generatedPostId: postRef.id,
      updatedAt: now,
    });

    // Kurze Info per Mail, damit der Entwurf nicht liegen bleibt.
    await notify(article.title, postRef.id).catch((err) =>
      console.warn('Benachrichtigung fehlgeschlagen:', err),
    );

    return NextResponse.json({
      ok: true,
      postId: postRef.id,
      title: article.title,
      topicId: topic.id,
      remainingTopics: topics.length - 1,
    });
  } catch (err) {
    console.error('Cron blog error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}

/** Kurze Mail, dass ein Entwurf zur Durchsicht bereitliegt. */
async function notify(title: string, postId: string): Promise<void> {
  if (!process.env.RESEND_API_KEY) return;
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const to = process.env.CONTACT_TO_EMAIL || 'yusuf@kolac-digital.de';
  const url = `https://www.kolac-digital.de/dashboard/blog/${postId}`;
  await resend.emails.send({
    from: 'Kolac Digital <system@kolac-digital.de>',
    to,
    subject: `Neuer Blog-Entwurf: ${title}`,
    text: `Ein neuer Artikel-Entwurf liegt zur Durchsicht bereit.

Titel: ${title}

Öffnen und freigeben: ${url}

Der Artikel ist noch nicht online. Er geht erst live, wenn du ihn im Dashboard freigibst.`,
  });
}
