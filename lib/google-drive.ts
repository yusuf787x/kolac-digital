import { google } from 'googleapis';
import { Readable } from 'stream';
import { getOAuthClientForRefresh } from './google-oauth';

const SPREADSHEET_ID = process.env.GOOGLE_DRIVE_SPREADSHEET_ID!;
const EINNAHMEN_FOLDER = process.env.GOOGLE_DRIVE_EINNAHMEN_FOLDER_2026!;
const AUSGABEN_FOLDER = process.env.GOOGLE_DRIVE_AUSGABEN_FOLDER_2026!;

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

async function appendSheetRow(
  refreshToken: string,
  sheetName: string,
  row: (string | number)[],
): Promise<void> {
  const auth = getOAuthClientForRefresh(refreshToken);
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SPREADSHEET_ID,
    range: `${sheetName}!A:Z`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: {
      values: [row],
    },
  });
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
}): Promise<{ webViewLink: string }> {
  const { webViewLink } = await uploadToDrive({
    refreshToken: opts.refreshToken,
    filename: opts.filename,
    mimeType: 'application/pdf',
    base64Content: opts.pdfBase64,
    folderId: EINNAHMEN_FOLDER,
  });

  await appendSheetRow(opts.refreshToken, 'Einnahmen', [
    opts.date,
    opts.customerName,
    opts.invoiceNumber,
    opts.leistung,
    opts.amount.toFixed(2).replace('.', ','),
    webViewLink,
  ]);

  return { webViewLink };
}

export async function saveExpenseToDrive(opts: {
  refreshToken: string;
  receiptBase64: string;
  receiptFilename: string;
  receiptMimeType: string;
  date: string; // DD.MM.YYYY
  posten: string;
  amount: number;
}): Promise<{ webViewLink: string }> {
  const { webViewLink } = await uploadToDrive({
    refreshToken: opts.refreshToken,
    filename: opts.receiptFilename,
    mimeType: opts.receiptMimeType,
    base64Content: opts.receiptBase64,
    folderId: AUSGABEN_FOLDER,
  });

  await appendSheetRow(opts.refreshToken, 'Ausgaben', [
    opts.date,
    opts.posten,
    opts.amount.toFixed(2).replace('.', ','),
    webViewLink,
  ]);

  return { webViewLink };
}
