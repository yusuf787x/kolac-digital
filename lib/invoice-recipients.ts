/**
 * Empfänger für Rechnungen und Zahlungserinnerungen.
 *
 * Ist beim Kunden eine Rechnungs-Mail (`retainerInvoiceEmail`) hinterlegt,
 * gehen Rechnungen NUR dorthin. Das Feld darf mehrere Adressen enthalten,
 * getrennt durch Komma oder Semikolon. Sonst gilt `fallback` (z.B. die Mail
 * aus GoCardless) und zuletzt die Haupt-Mail aus den Stammdaten.
 */
export function parseEmailList(value: string | null | undefined): string[] {
  if (!value) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of value.split(/[,;\s]+/)) {
    const mail = part.trim();
    if (!mail || seen.has(mail.toLowerCase())) continue;
    seen.add(mail.toLowerCase());
    out.push(mail);
  }
  return out;
}

export function invoiceRecipients(
  customer:
    | { email?: string | null; retainerInvoiceEmail?: string | null }
    | null
    | undefined,
  fallback?: string | null,
): string[] {
  if (!customer) return [];
  const override = parseEmailList(customer.retainerInvoiceEmail);
  if (override.length) return override;
  const fb = fallback?.trim();
  if (fb) return [fb];
  const main = customer.email?.trim();
  return main ? [main] : [];
}
