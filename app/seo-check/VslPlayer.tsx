'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Verkaufsvideo als HLS-Stream: passt die Qualität laufend an die Verbindung
 * an (240p bis 720p), startet stumm von selbst, sobald es zu sehen ist (die
 * Untertitel sind eingebrannt), und beginnt mit Ton von vorn, wenn man auf
 * „Mit Ton ansehen“ tippt. Safari spielt HLS selbst, sonst hls.js.
 */
export default function VslPlayer({ src, poster }: { src: string; poster: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [failed, setFailed] = useState(false);

  // Stream anhängen
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let destroy: (() => void) | undefined;
    let cancelled = false;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src;
    } else {
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          setFailed(true);
          return;
        }
        // Start in 360p (startet auch bei schwacher Leitung schnell, 240p springt bei sehr langsamer ein), danach misst hls.js die Leitung und schaltet hoch
        const hls = new Hls({ startLevel: 1, capLevelToPlayerSize: true, maxBufferLength: 20 });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_e, data) => {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else setFailed(true);
        });
        destroy = () => hls.destroy();
      });
    }
    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [src]);

  // Stumm abspielen, solange das Video sichtbar ist
  useEffect(() => {
    const video = videoRef.current;
    if (!video || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          video.play().catch(() => {});
        } else if (video.muted) {
          video.pause();
        }
      },
      { threshold: [0, 0.5] },
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  const withSound = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = false;
    video.currentTime = 0;
    video.play().catch(() => {});
    setMuted(false);
  };

  if (failed) {
    return (
      <video className="aspect-video w-full rounded-[18px] bg-black" src={src.replace(/master\.m3u8$/, '720/index.m3u8')} poster={poster} controls playsInline preload="metadata" />
    );
  }

  return (
    <div className="relative overflow-hidden rounded-[18px] bg-black shadow-[var(--shadow-md)]">
      <video
        ref={videoRef}
        className="aspect-video w-full"
        poster={poster}
        muted={muted}
        playsInline
        loop={muted}
        preload="auto"
        controls={!muted}
        aria-label="Verkaufsvideo, 2 Minuten, mit Untertiteln"
      />
      {muted && (
        <button
          type="button"
          onClick={withSound}
          className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/45 via-transparent to-transparent pb-5 md:items-center md:pb-0"
        >
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-[15px] font-semibold text-[var(--color-black)] shadow-[var(--shadow-md)]">
            <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5 fill-[var(--color-blue)]">
              <path d="M3 9v6h4l5 4V5L7 9H3zm13.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4zM14 3.2v2.1a7 7 0 0 1 0 13.4v2.1a9 9 0 0 0 0-17.6z" />
            </svg>
            Mit Ton von vorn ansehen
          </span>
        </button>
      )}
    </div>
  );
}
