import { google } from 'googleapis';
import { Readable } from 'stream';
import { getOAuthClientForRefresh } from './google-oauth';

const SPREADSHEET_ID = process.env.GOOGLE_DRIVE_SPREADSHEET_ID!;
const EINNAHMEN_FOLDER = process.env.GOOGLE_DRIVE_EINNAHMEN_FOLDER_2026!;
const AUSGABEN_FOLDER = process.env.GOOGLE_DRIVE_AUSGABEN_FOLDER_2026!;
const AUFTRAEGE_FOLDER = process.env.GOOGLE_DRIVE_AUFTRAEGE_FOLDER ?? '';
// Partnerverträge — signierte DSV/AVV/etc. werden hier abgelegt.
// Folder-ID vom User vorgegeben, per Env Var override-bar.
const CONTRACTS_FOLDER =
  process.env.GOOGLE_DRIVE_CONTRACTS_FOLDER ??
  '12xfJ3Vq9Yan_08oA0mmlzR0u8qA1hEfs';

interface UploadFileOpts {
  refreshToken: string;
  filename: string;
  mimeType: string;
  base64Content: string;
  folderId: string;
}

async function uploadToDrive(opts: UploadFileOpts): Promise<{
  fileId: string;
  webViewLink: string;
}> {
  const auth = getOAuthClientForRefresh(opts.refreshToken);
  const drive = google.drive({ version: 'v3', auth });

  const buffer = Buffer.from(opts.base64Content, 'base64');
  const stream = Readable.from(buffer);

  const file = await drive.files.create({
    requestBody: {
      name: opts.filename,
      parents: [opts.folderId],
    },
    media: {
      mimeType: opts.mimeType,
      body: stream,
    },
    fields: 'id, webViewLink',
  });

  return {
    fileId: file.data.id ?? '',
    webViewLink: file.data.webViewLink ?? '',
  };
}

/**
 * Parse a German date string ("DD.MM.YYYY", "DD/MM/YYYY", or ISO).
 */
function parseGermanDate(input: string): Date | null {
  if (!input) return null;
  const str = input.trim();
  const m = str.match(/^(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
    const date = new Date(year, parseInt(mo, 10) - 1, parseInt(d, 10));
    if (!isNaN(date.getTime())) return date;
  }
  const iso = new Date(str);
  return isNaN(iso.getTime()) ? null : iso;
}

const HEADER_KEYWORDS = [
  'datum',
  'kunde',
  'posten',
  'betrag',
  'rechnungsnr',
  'leistung',
  'link',
];

interface SheetMeta {
  sheetId: number;
  allRows: (string | number)[][];
  headerRowIndex: number;
  columns: Map<string, number>;
}

/**
 * Read sheet metadata + all values + locate the header row.
 */
async function readSheetMeta(
  refreshToken: string,
  sheetName: string,
): Promise<SheetMeta> {
  const auth = getOAuthClientForRefresh(refreshToken);
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID,
    fields: 'sheets.properties(sheetId,title)',
  });
  const sheetMatch = meta.data.sheets?.find(
    (s) => s.properties?.title === sheetName,
  );
  if (!sheetMatch?.properties?.sheetId == null) {
    throw new Error(`Tab "${sheetName}" wurde im Spreadsheet nicht gefunden.`);
  }
  const sheetId = sheetMatch!.properties!.sheetId!;

  const valuesRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueRenderOption: 'FORMATTED_VALUE',
  });
  const allRows = (valuesRes.data.values ?? []) as (string | number)[][];

  let headerRowIndex = -1;
  let headerRow: (string | number)[] = [];
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i] ?? [];
    const blob = row.map((c) => String(c ?? '').toLowerCase().trim());
    if (blob.some((cell) => HEADER_KEYWORDS.includes(cell))) {
      headerRowIndex = i;
      headerRow = row;
      break;
    }
  }
  if (headerRowIndex < 0) {
    throw new Error(
      `Tab "${sheetName}": Header-Zeile mit Spalten-Namen (Datum/Posten/Betrag/...) konnte nicht gefunden werden.`,
    );
  }

  const columns = new Map<string, number>();
  headerRow.forEach((cell, idx) => {
    const norm = String(cell ?? '').toLowerCase().trim();
    if (norm) columns.set(norm, idx);
  });

  return { sheetId, allRows, headerRowIndex, columns };
}

/**
 * Find the row index where a new entry with the given date should be
 * inserted to keep the list sorted ascending by date. Insertion is
 * "between the last row with date <= newDate and the first row with
 * date > newDate", which preserves the existing block's order even when
 * dates aren't perfectly sorted to begin with.
 */
function findChronologicalInsertIndex(
  allRows: (string | number)[][],
  headerRowIndex: number,
  datumColIdx: number,
  newDate: Date,
): number {
  const newTime = newDate.getTime();
  for (let i = headerRowIndex + 1; i < allRows.length; i++) {
    const row = allRows[i] ?? [];
    const dateStr = String(row[datumColIdx] ?? '').trim();
    if (!dateStr) continue;
    const rowDate = parseGermanDate(dateStr);
    if (!rowDate) continue;
    if (rowDate.getTime() > newTime) {
      return i; // Insert before this row
    }
  }
  // No row with a later date — append at the bottom of the data block.
  // We use the row just past the last non-empty row to avoid creating
  // gaps if the sheet has trailing empty rows.
  let lastDataRow = headerRowIndex;
  for (let i = headerRowIndex + 1; i < allRows.length; i++) {
    const row = allRows[i] ?? [];
    if (row.some((c) => String(c ?? '').trim() !== '')) {
      lastDataRow = i;
    }
  }
  return lastDataRow + 1;
}

/**
 * Insert a new row chronologically by date — does NOT just append at the
 * bottom. The row's `datum` value is used to find the right position, and
 * existing rows below are shifted down by Google's `insertDimension` API.
 */
async function insertSheetRowChronologically(
  refreshToken: string,
  sheetName: string,
  values: Record<string, string | number>,
  rowDate: Date,
): Promise<void> {
  const auth = getOAuthClientForRefresh(refreshToken);
  const sheets = google.sheets({ version: 'v4', auth });

  const { sheetId, allRows, headerRowIndex, columns } = await readSheetMeta(
    refreshToken,
    sheetName,
  );

  const datumColIdx = columns.get('datum');
  if (datumColIdx === undefined) {
    throw new Error(
      `Spalte "Datum" in Tab "${sheetName}" nicht gefunden. Vorhandene Spalten: ${Array.from(columns.keys()).join(', ')}.`,
    );
  }

  const targetRowIndex = findChronologicalInsertIndex(
    allRows,
    headerRowIndex,
    datumColIdx,
    rowDate,
  );

  const maxIdx = Math.max(...columns.values(), 0);
  const rowValues: (string | number)[] = new Array(maxIdx + 1).fill('');
  const missingKeys: string[] = [];
  for (const [key, value] of Object.entries(values)) {
    const idx = columns.get(key.toLowerCase());
    if (idx === undefined) {
      missingKeys.push(key);
      continue;
    }
    rowValues[idx] = value;
  }
  if (missingKeys.length === Object.keys(values).length) {
    throw new Error(
      `Keine der Spalten (${missingKeys.join(', ')}) im Tab "${sheetName}" gefunden. Verfügbare Spalten: ${Array.from(columns.keys()).join(', ')}.`,
    );
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: 'ROWS',
              startIndex: targetRowIndex,
              endIndex: targetRowIndex + 1,
            },
            inheritFromBefore: false,
          },
        },
        {
          updateCells: {
            range: {
              sheetId,
              startRowIndex: targetRowIndex,
              endRowIndex: targetRowIndex + 1,
              startColumnIndex: 0,
              endColumnIndex: rowValues.length,
            },
            rows: [
              {
                values: rowValues.map((v) => ({
                  userEnteredValue:
                    typeof v === 'number'
                      ? { numberValue: v }
                      : { stringValue: String(v) },
                })),
              },
            ],
            fields: 'userEnteredValue',
          },
        },
      ],
    },
  });
}

interface SaveResult {
  webViewLink: string;
  sheetSyncError: string | null;
}

export async function saveInvoiceToDrive(opts: {
  refreshToken: string;
  pdfBase64: string;
  filename: string;
  date: string; // DD.MM.YYYY
  customerName: string;
  invoiceNumber: string;
  leistung: string;
  amount: number;
}): Promise<SaveResult> {
  const { webViewLink } = await uploadToDrive({
    refreshToken: opts.refreshToken,
    filename: opts.filename,
    mimeType: 'application/pdf',
    base64Content: opts.pdfBase64,
    folderId: EINNAHMEN_FOLDER,
  });

  let sheetSyncError: string | null = null;
  try {
    const rowDate = parseGermanDate(opts.date);
    if (!rowDate) {
      throw new Error(`Datum "${opts.date}" konnte nicht geparst werden.`);
    }
    await insertSheetRowChronologically(
      opts.refreshToken,
      'Einnahmen',
      {
        datum: opts.date,
        kunde: opts.customerName,
        rechnungsnr: opts.invoiceNumber,
        leistung: opts.leistung,
        betrag: opts.amount.toFixed(2).replace('.', ','),
        link: webViewLink,
      },
      rowDate,
    );
  } catch (err) {
    sheetSyncError = (err as Error).message;
    console.warn('Sheet-Insert (Einnahmen) fehlgeschlagen:', err);
  }

  return { webViewLink, sheetSyncError };
}

/**
 * Upload an order-confirmation file to the "Aufträge" Drive folder.
 * No sheet-append — confirmations are not bookkeeping data.
 */
export async function saveConfirmationToDrive(opts: {
  refreshToken: string;
  fileBase64: string;
  filename: string;
  mimeType: string;
}): Promise<{ webViewLink: string }> {
  if (!AUFTRAEGE_FOLDER) {
    throw new Error(
      'GOOGLE_DRIVE_AUFTRAEGE_FOLDER ist nicht gesetzt. Bitte Folder-ID des "Aufträge"-Ordners in .env.local und Vercel hinterlegen.',
    );
  }

  const { webViewLink } = await uploadToDrive({
    refreshToken: opts.refreshToken,
    filename: opts.filename,
    mimeType: opts.mimeType,
    base64Content: opts.fileBase64,
    folderId: AUFTRAEGE_FOLDER,
  });

  return { webViewLink };
}

/**
 * Lädt das signierte Vertrags-PDF in den Partnerverträge-Ordner hoch.
 * Dateiname wird systematisch gebildet, damit alle Verträge gleich
 * aussehen und chronologisch sortierbar sind:
 *
 *   2026-06-23 - CarHifi-Herford - Dienstleistungsvertrag.pdf
 */
export async function saveContractToDrive(opts: {
  refreshToken: string;
  pdfBase64: string;
  filename: string;
}): Promise<{ webViewLink: string }> {
  if (!CONTRACTS_FOLDER) {
    throw new Error(
      'GOOGLE_DRIVE_CONTRACTS_FOLDER ist nicht gesetzt und kein Default vorhanden.',
    );
  }

  const { webViewLink } = await uploadToDrive({
    refreshToken: opts.refreshToken,
    filename: opts.filename,
    mimeType: 'application/pdf',
    base64Content: opts.pdfBase64,
    folderId: CONTRACTS_FOLDER,
  });

  return { webViewLink };
}

/**
 * Baut einen einheitlichen Dateinamen für Vertrags-PDFs im Drive-Ordner.
 * Format: "YYYY-MM-DD - {Kundenfirma} - {Vertragstyp}.pdf"
 * Sonderzeichen werden entfernt, damit der Name plattformübergreifend
 * funktioniert.
 */
export function buildContractFilename(opts: {
  signedAt: Date;
  customerCompany: string;
  typeLabel: string;
}): string {
  const y = opts.signedAt.getFullYear();
  const m = String(opts.signedAt.getMonth() + 1).padStart(2, '0');
  const d = String(opts.signedAt.getDate()).padStart(2, '0');
  const datePrefix = `${y}-${m}-${d}`;

  const cleanName = (s: string) =>
    (s || '')
      .replace(/[^a-zA-Z0-9äöüÄÖÜß\-_ ]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

  const customer = cleanName(opts.customerCompany) || 'Kunde';
  const type = cleanName(opts.typeLabel) || 'Vertrag';

  return `${datePrefix} - ${customer} - ${type}.pdf`;
}

export async function saveExpenseToDrive(opts: {
  refreshToken: string;
  receiptBase64: string;
  receiptFilename: string;
  receiptMimeType: string;
  date: string; // DD.MM.YYYY
  posten: string;
  amount: number;
}): Promise<SaveResult> {
  const { webViewLink } = await uploadToDrive({
    refreshToken: opts.refreshToken,
    filename: opts.receiptFilename,
    mimeType: opts.receiptMimeType,
    base64Content: opts.receiptBase64,
    folderId: AUSGABEN_FOLDER,
  });

  let sheetSyncError: string | null = null;
  try {
    const rowDate = parseGermanDate(opts.date);
    if (!rowDate) {
      throw new Error(`Datum "${opts.date}" konnte nicht geparst werden.`);
    }
    await insertSheetRowChronologically(
      opts.refreshToken,
      'Ausgaben',
      {
        datum: opts.date,
        posten: opts.posten,
        betrag: opts.amount.toFixed(2).replace('.', ','),
        link: webViewLink,
      },
      rowDate,
    );
  } catch (err) {
    sheetSyncError = (err as Error).message;
    console.warn('Sheet-Insert (Ausgaben) fehlgeschlagen:', err);
  }

  return { webViewLink, sheetSyncError };
}
