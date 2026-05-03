import QRCode from 'qrcode';
import { buildEpcQrPayload } from './utils';

const COMPANY_DEFAULTS = {
  recipientName: 'Yusuf Kolac',
  iban: 'DE98 2022 0800 0040 2027 72',
  bic: 'SXPYDEHHXXX',
};

/**
 * Build an EPC069-12 QR code (GiroCode) as a PNG data URL for embedding
 * into the invoice PDF. Banking apps scan this and pre-fill the SEPA
 * transfer with amount + reference + recipient.
 */
export async function buildInvoiceQrDataUrl(opts: {
  amount: number;
  invoiceNumber: string;
}): Promise<string> {
  const payload = buildEpcQrPayload({
    recipientName: COMPANY_DEFAULTS.recipientName,
    iban: COMPANY_DEFAULTS.iban,
    bic: COMPANY_DEFAULTS.bic,
    amount: opts.amount,
    reference: opts.invoiceNumber,
  });
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    width: 200,
    margin: 1,
  });
}

export const COMPANY_BANK = COMPANY_DEFAULTS;

export const COMPANY_INFO = {
  name: 'Kolac Digital',
  street: 'Beckhausstraße 108',
  zip: '33611',
  city: 'Bielefeld',
  phone: '0176 95762018',
  taxId: '305/5120/5036',
  email: 'yusuf@kolac-digital.de',
} as const;
