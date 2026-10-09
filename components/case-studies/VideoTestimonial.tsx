'use client';

import { useState } from 'react';
import type { VideoTestimonial as VT } from '@/lib/case-studies';

interface Props {
  data: VT;
}

/** Gleicher Schluessel wie public/js/cookie-consent.js. */
const CONSENT_KEY = 'kolac_cookie_consent';

function hasYouTubeConsent(): boolean {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    return raw ? JSON.parse(raw).functional === true : false;
  } catch {
    return false;
  }
}

function grantYouTubeConsent() {
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    const consent = raw ? JSON.parse(raw) : {};
    window.localStorage.setItem(
      CONSENT_KEY,
      JSON.stringify({
        ...consent,
        essential: true,
        functional: true,
        timestamp: new Date().toISOString(),
      }),
    );
  } catch {
    // Ohne localStorage gilt die Einwilligung nur fuer dieses Video.
  }
}

/**
 * Video-Testimonial-Karte identisch zur Homepage-Kundenstimmen-Sektion.
 *
 * Datenschutz: Das Vorschaubild liegt lokal unter
 * /public/images/video/<youtubeId>.jpg, vor dem Klick geht also keine
 * Anfrage an YouTube. Ohne gespeicherte Einwilligung erscheint beim
 * Klick zuerst ein Hinweis, erst danach wird das iframe geladen.
 * Neue Videos brauchen deshalb ein lokales Vorschaubild.
 */
export default function VideoTestimonial({ data }: Props) {
  const [state, setState] = useState<'idle' | 'ask' | 'playing'>('idle');
  const thumb = `/images/video/${data.youtubeId}.jpg`;

  const start = () => setState(hasYouTubeConsent() ? 'playing' : 'ask');

  return (
    <div className="video-card">
      <div className="video-wrapper" data-youtube-id={data.youtubeId}>
        {state === 'playing' ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${data.youtubeId}?autoplay=1&rel=0`}
            title={data.alt}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              border: 0,
              borderRadius: 'inherit',
            }}
          />
        ) : (
          <div
            className="video-placeholder"
            role="button"
            tabIndex={0}
            aria-label="Video abspielen"
            onClick={start}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                start();
              }
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={thumb} alt={data.alt} loading="lazy" />
            <div className="video-play-btn">
              <svg viewBox="0 0 68 48">
                <path
                  d="M66.5 7.7s-.7-4.7-2.8-6.8C60.7-2 57.2-2 55.6-2.2 46.4-3 34-3 34-3s-12.4 0-21.6.8C10.8-2 7.3-2 4.3.9 2.2 3 1.5 7.7 1.5 7.7S.8 13.3.8 18.8v5.2c0 5.5.7 11.1.7 11.1s.7 4.7 2.8 6.8c3 3.1 6.9 3 8.7 3.3C19.3 45.7 34 45.8 34 45.8s12.4 0 21.6-.8c1.6-.2 5.1-.2 8.1-3.1 2.1-2.1 2.8-6.8 2.8-6.8s.7-5.5.7-11.1v-5.2c0-5.5-.7-11.1-.7-11.1z"
                  fill="red"
                />
                <path d="M27 33V14l18.4 9.5z" fill="#fff" />
              </svg>
            </div>
          </div>
        )}
        {state === 'ask' && (
          <div className="video-consent-notice">
            <p>
              Dieses Video wird von YouTube bereitgestellt. Beim Abspielen
              wird eine Verbindung zu YouTube (Google) aufgebaut und deine
              IP-Adresse übertragen.{' '}
              <a href="/datenschutz.html#youtube">Mehr dazu</a>
            </p>
            <button
              type="button"
              onClick={() => {
                grantYouTubeConsent();
                setState('playing');
              }}
            >
              YouTube erlauben und abspielen
            </button>
          </div>
        )}
      </div>
      <div className="video-info">
        <h3 className="video-name">{data.name}</h3>
        <p className="video-company">{data.company}</p>
        <p className="video-desc">{data.description}</p>
      </div>
    </div>
  );
}
