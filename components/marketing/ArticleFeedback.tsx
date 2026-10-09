'use client';

import { useState } from 'react';
import { trackBlog } from '@/lib/blog-tracking';

/**
 * "War der Artikel hilfreich?" am Ende jedes Beitrags. Die Antworten
 * landen als Summe in der Ratgeber-Statistik und zeigen, welche
 * Beitraege wirklich weiterhelfen.
 */
export default function ArticleFeedback({ postId }: { postId: string }) {
  const [answer, setAnswer] = useState<'yes' | 'no' | null>(null);

  const vote = (value: 'yes' | 'no') => {
    if (answer) return;
    setAnswer(value);
    trackBlog({ type: 'helpful', postId, value });
  };

  return (
    <div className="article-feedback" aria-live="polite">
      {answer ? (
        <p className="article-feedback-thanks">
          {answer === 'yes'
            ? 'Danke! Das freut uns.'
            : 'Danke für die ehrliche Rückmeldung. Wir machen den Beitrag besser.'}
        </p>
      ) : (
        <>
          <span className="article-feedback-question">
            War dieser Beitrag hilfreich für dich?
          </span>
          <div className="article-feedback-actions">
            <button type="button" onClick={() => vote('yes')}>
              👍 Ja
            </button>
            <button type="button" onClick={() => vote('no')}>
              👎 Nein
            </button>
          </div>
        </>
      )}
    </div>
  );
}
