import { NextResponse } from 'next/server';
import { Timestamp } from 'firebase-admin/firestore';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Resend } from 'resend';
import { readFile } from 'fs/promises';
import path from 'path';
import { adminDb, adminStorage } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Body {
  token: string;
  signedByName: string;
  /** Base64-kodierte PNG-Daten (data-URI ohne Header). */
  signatureDataUrl: string;
}

interface ContractFieldDoc {
  type: 'customer_signature' | 'date' | 'kolac_signature';
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Verarbeitet die Kundenunterschrift: lädt das Original, baut das
 * finalisierte PDF mit Signaturen + Datum + Audit-Footer und speichert
 * es in Storage. Aktualisiert den Vertrag in Firestore und benachrichtigt
 * Yusuf per Mail.
 */
export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json(
      { error: 'Ungültiger Request-Body.' },
      { status: 400 },
    );
  }

  if (!body.token || !body.signedByName || !body.signatureDataUrl) {
    return NextResponse.json(
      { error: 'Pflichtfelder fehlen.' },
      { status: 400 },
    );
  }

  const db = adminDb();
  const snap = await db
    .collection('contracts')
    .where('signingToken', '==', body.token)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json(
      { error: 'Vertrag nicht gefunden.' },
      { status: 404 },
    );
  }
  const docSnap = snap.docs[0];
  const data = docSnap.data();

  if (data.status === 'signed') {
    return NextResponse.json(
      {
        ok: true,
        alreadySigned: true,
        signedPdfUrl: data.signedPdfUrl ?? null,
      },
      { status: 200 },
    );
  }
  if (data.status === 'cancelled') {
    return NextResponse.json(
      { error: 'Vertrag wurde storniert.' },
      { status: 410 },
    );
  }
  const expiresAtMs: number | null =
    data.signingExpiresAt?.toMillis?.() ?? null;
  if (expiresAtMs && Date.now() > expiresAtMs) {
    return NextResponse.json(
      { error: 'Der Signing-Link ist abgelaufen.' },
      { status: 410 },
    );
  }

  const fields = (data.fields ?? []) as ContractFieldDoc[];

  // PDF-Bytes von Storage laden.
  const originalBytes = await downloadStoragePath(data.originalPdfPath);

  // Signatur-PNG dekodieren.
  const signatureBytes = decodeDataUrl(body.signatureDataUrl);

  // Yusufs Unterschrift aus public/ laden (filesystem-zugriff).
  let kolacSignatureBytes: Uint8Array | null = null;
  try {
    const fsPath = path.join(
      process.cwd(),
      'public',
      'images',
      'unterschrift-yusuf.png',
    );
    const buf = await readFile(fsPath);
    kolacSignatureBytes = new Uint8Array(buf);
  } catch (err) {
    console.warn('Kolac-Signatur konnte nicht geladen werden:', err);
  }

  const pdfDoc = await PDFDocument.load(originalBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const signatureImage = await pdfDoc.embedPng(signatureBytes);
  const kolacImage = kolacSignatureBytes
    ? await pdfDoc.embedPng(kolacSignatureBytes)
    : null;

  const today = formatDateDDMMYYYY(new Date());
  const city = (data.customerSnapshot?.city ?? '').trim();
  const dateString = city ? `${city}, ${today}` : today;

  for (const field of fields) {
    const pageIndex = field.page - 1;
    if (pageIndex < 0 || pageIndex >= pages.length) continue;
    const page = pages[pageIndex];
    const { width: pw, height: ph } = page.getSize();

    // y in pdf-lib ist von UNTEN gezählt; unsere Koordinaten von OBEN.
    const xPx = field.x * pw;
    const yTopPx = field.y * ph;
    const wPx = field.width * pw;
    const hPx = field.height * ph;
    const yBottomPx = ph - yTopPx - hPx;

    if (field.type === 'customer_signature') {
      page.drawImage(signatureImage, {
        x: xPx,
        y: yBottomPx,
        width: wPx,
        height: hPx,
      });
    } else if (field.type === 'kolac_signature' && kolacImage) {
      page.drawImage(kolacImage, {
        x: xPx,
        y: yBottomPx,
        width: wPx,
        height: hPx,
      });
    } else if (field.type === 'date') {
      // Text vertikal mittig im Feld.
      const fontSize = Math.max(8, Math.min(hPx * 0.7, 18));
      page.drawText(dateString, {
        x: xPx,
        y: yBottomPx + (hPx - fontSize) / 2,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
    }
  }

  // Audit-Seite anhängen.
  const ip = getClientIp(req);
  const ua = req.headers.get('user-agent') ?? '';
  const signedAt = new Date();
  await addAuditPage(pdfDoc, font, {
    contractTitle: data.title ?? 'Vertrag',
    signedByName: body.signedByName,
    signedAt,
    ip: ip ?? '–',
    userAgent: ua,
    originalSha256: data.originalSha256 ?? '–',
    signingToken: body.token,
  });

  const finalBytes = await pdfDoc.save();

  // Hochladen.
  const signedPath = `contracts/${body.token}/signed.pdf`;
  const signedUrl = await uploadPdf(signedPath, finalBytes);

  // Audit-Eintrag + Status aktualisieren.
  const audit = Array.isArray(data.audit) ? data.audit : [];
  audit.push({
    at: Timestamp.now(),
    event: 'signed',
    ip: ip ?? undefined,
    userAgent: ua,
    note: `Signiert von ${body.signedByName}`,
  });

  await docSnap.ref.update({
    status: 'signed',
    signedAt: Timestamp.now(),
    signedByName: body.signedByName,
    signedFromIp: ip ?? null,
    signedFromUserAgent: ua || null,
    signedPdfPath: signedPath,
    signedPdfUrl: signedUrl,
    audit,
    updatedAt: Timestamp.now(),
  });

  // Mail-Notification an Yusuf (best-effort, blockiert die Antwort nicht
  // bei Fehlern).
  await notifyYusufBestEffort({
    contractTitle: data.title ?? 'Vertrag',
    customerCompany: data.customerSnapshot?.company ?? '',
    signedByName: body.signedByName,
    signedAt,
    signedPdfUrl: signedUrl,
  });

  return NextResponse.json({
    ok: true,
    signedPdfUrl: signedUrl,
  });
}

// ===================================================================
// Helpers
// ===================================================================

function decodeDataUrl(dataUrl: string): Uint8Array {
  const m = dataUrl.match(/^data:[^;]+;base64,(.+)$/);
  const b64 = m ? m[1] : dataUrl;
  return Uint8Array.from(Buffer.from(b64, 'base64'));
}

async function downloadStoragePath(path: string): Promise<Uint8Array> {
  const bucket = adminStorage().bucket();
  const [buf] = await bucket.file(path).download();
  return new Uint8Array(buf);
}

async function uploadPdf(
  path: string,
  bytes: Uint8Array,
): Promise<string> {
  const bucket = adminStorage().bucket();
  const file = bucket.file(path);
  // makePublic() umgehen wir — wir nutzen Signed URL stattdessen,
  // damit das Bucket-Setup keine Public-Reads erlauben muss.
  await file.save(Buffer.from(bytes), {
    contentType: 'application/pdf',
    metadata: {
      cacheControl: 'private, max-age=0, no-store',
    },
    resumable: false,
  });

  // Generiere einen Download-Token, der den Datei-Download über die
  // Firebase-Storage-Public-URL erlaubt (kompatibel mit Web-SDK URLs).
  const token = randomToken();
  await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: token } });
  const bucketName = bucket.name;
  const encodedPath = encodeURIComponent(path);
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;
}

function randomToken(): string {
  // 16 Bytes Hex – ausreichend für Storage-Download-URLs.
  const bytes = new Uint8Array(16);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function formatDateDDMMYYYY(d: Date): string {
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
}

interface AuditPageOpts {
  contractTitle: string;
  signedByName: string;
  signedAt: Date;
  ip: string;
  userAgent: string;
  originalSha256: string;
  signingToken: string;
}

async function addAuditPage(
  pdfDoc: PDFDocument,
  font: import('pdf-lib').PDFFont,
  opts: AuditPageOpts,
) {
  const page = pdfDoc.addPage();
  const { width: pw, height: ph } = page.getSize();
  const margin = 56;
  const fs = 11;
  const lineHeight = 16;
  let y = ph - margin;

  const writeLine = (text: string, opt?: { bold?: boolean; size?: number }) => {
    page.drawText(text, {
      x: margin,
      y,
      size: opt?.size ?? fs,
      font,
      color: rgb(0.1, 0.1, 0.1),
    });
    y -= opt?.size ? opt.size + 6 : lineHeight;
  };

  writeLine('Audit-Trail zur elektronischen Signatur', { size: 16 });
  y -= 6;
  writeLine(
    'Dieses PDF dokumentiert die einfache elektronische Signatur gemäß',
    { size: 9 },
  );
  writeLine('eIDAS-Verordnung (EU) Nr. 910/2014. Inhalt ist unveränderbar:', {
    size: 9,
  });
  y -= 8;

  writeLine(`Vertrag: ${opts.contractTitle}`);
  writeLine(`Signiert von: ${opts.signedByName}`);
  writeLine(`Datum / Uhrzeit: ${formatDateTimeDE(opts.signedAt)}`);
  writeLine(`IP-Adresse: ${opts.ip}`);
  // User-Agent kann lang sein — auf eine Zeile begrenzen
  writeLine(`User-Agent: ${truncate(opts.userAgent, 90)}`);
  y -= 8;
  writeLine('Manipulationsschutz (SHA-256 des Originaldokuments):', {
    size: 9,
  });
  writeLine(opts.originalSha256, { size: 9 });
  y -= 8;
  writeLine(`Signing-Token: ${opts.signingToken}`, { size: 9 });
  y -= 8;
  writeLine(
    'Der Aussteller bestätigt mit seiner Unterschrift den Inhalt des',
    { size: 9 },
  );
  writeLine(
    'Dokuments. Beide Parteien erhalten dieses signierte PDF als',
    { size: 9 },
  );
  writeLine('Nachweis der Vereinbarung.', { size: 9 });
}

function formatDateTimeDE(d: Date): string {
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function truncate(s: string, max: number): string {
  if (!s) return '';
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

function getClientIp(req: Request): string | null {
  const xfwd = req.headers.get('x-forwarded-for');
  if (xfwd) return xfwd.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return null;
}

async function notifyYusufBestEffort(opts: {
  contractTitle: string;
  customerCompany: string;
  signedByName: string;
  signedAt: Date;
  signedPdfUrl: string;
}) {
  try {
    if (!process.env.RESEND_API_KEY) return;
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: 'Kolac Digital <yusuf@kolac-digital.de>',
      to: 'yusuf@kolac-digital.de',
      subject: `✓ Vertrag signiert: ${opts.contractTitle}`,
      html: `
        <div style="font-family:-apple-system,sans-serif;color:#0a0a0a;line-height:1.6;font-size:15px;">
          <p>Der Vertrag <strong>${escapeHtml(opts.contractTitle)}</strong> wurde gerade vom Kunden signiert.</p>
          <table cellpadding="6" cellspacing="0" border="0" style="border-collapse:collapse;margin:12px 0;">
            <tr><td style="color:#6b7280;">Kunde</td><td>${escapeHtml(opts.customerCompany)}</td></tr>
            <tr><td style="color:#6b7280;">Signiert von</td><td>${escapeHtml(opts.signedByName)}</td></tr>
            <tr><td style="color:#6b7280;">Zeitpunkt</td><td>${formatDateTimeDE(opts.signedAt)}</td></tr>
          </table>
          <p>
            <a href="${opts.signedPdfUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:600;">
              Signiertes PDF öffnen
            </a>
          </p>
          <p style="color:#6b7280;font-size:13px;">Liegt auch direkt im Dashboard unter Verträge.</p>
        </div>
      `,
      text: [
        `Vertrag ${opts.contractTitle} signiert.`,
        `Kunde: ${opts.customerCompany}`,
        `Signiert von: ${opts.signedByName}`,
        `Zeitpunkt: ${formatDateTimeDE(opts.signedAt)}`,
        '',
        `Signiertes PDF: ${opts.signedPdfUrl}`,
      ].join('\n'),
    });
  } catch (err) {
    console.error('Mail-Notification fehlgeschlagen:', err);
  }
}

function escapeHtml(s: string): string {
  return (s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
