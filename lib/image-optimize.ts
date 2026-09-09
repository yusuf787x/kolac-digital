/**
 * Bildaufbereitung im Browser, bevor etwas hochgeladen wird.
 *
 * Handy-Fotos und KI-Bilder sind gern mehrere Megabyte gross. Fuer ein
 * Titelbild im Blog reichen 1600 Pixel Breite voellig. Das spart
 * Speicherplatz und macht die Seite spuerbar schneller, weil Besucher
 * nicht mehr ein riesiges Bild laden muessen.
 *
 * Laeuft komplett im Browser ueber ein Canvas, kein Dienst noetig.
 */

export interface OptimizeResult {
  blob: Blob;
  width: number;
  height: number;
  /** Dateiendung passend zum erzeugten Format. */
  extension: 'webp' | 'jpg';
  originalBytes: number;
  optimizedBytes: number;
}

const MAX_WIDTH = 1600;
const MAX_HEIGHT = 1200;
const QUALITY = 0.82;

/** Prueft einmalig, ob der Browser WebP schreiben kann. */
function supportsWebp(): boolean {
  try {
    const c = document.createElement('canvas');
    c.width = 1;
    c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Bild konnte nicht gelesen werden.'));
    };
    img.src = url;
  });
}

/**
 * Skaliert das Bild auf eine sinnvolle Groesse und komprimiert es.
 * Bilder, die schon klein genug sind, werden trotzdem neu kodiert,
 * damit auch grosse PNG-Dateien kleiner werden.
 */
export async function optimizeImage(file: File): Promise<OptimizeResult> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Das ist keine Bilddatei.');
  }
  // SVG nicht ueber Canvas jagen, das wuerde es rastern.
  if (file.type === 'image/svg+xml') {
    return {
      blob: file,
      width: 0,
      height: 0,
      extension: 'webp',
      originalBytes: file.size,
      optimizedBytes: file.size,
    };
  }

  const img = await loadImage(file);
  const ratio = Math.min(
    1,
    MAX_WIDTH / img.naturalWidth,
    MAX_HEIGHT / img.naturalHeight,
  );
  const width = Math.round(img.naturalWidth * ratio);
  const height = Math.round(img.naturalHeight * ratio);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Bildbearbeitung im Browser nicht möglich.');
  ctx.drawImage(img, 0, 0, width, height);

  const useWebp = supportsWebp();
  const mime = useWebp ? 'image/webp' : 'image/jpeg';

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error('Bild konnte nicht erzeugt werden.')),
      mime,
      QUALITY,
    );
  });

  return {
    blob,
    width,
    height,
    extension: useWebp ? 'webp' : 'jpg',
    originalBytes: file.size,
    optimizedBytes: blob.size,
  };
}

/** Groesse lesbar ausgeben, z.B. "1,4 MB". */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} kB`;
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
}

/** Erzeugt einen sauberen Dateinamen aus dem Artikel-Slug. */
export function buildImagePath(slug: string, extension: string): string {
  const safe =
    slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 60) || 'artikel';
  const stamp = Date.now().toString(36);
  return `blog/${safe}-${stamp}.${extension}`;
}
