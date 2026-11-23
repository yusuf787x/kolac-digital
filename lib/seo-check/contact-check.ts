/**
 * Prüfung von E-Mail und Telefon im Freischalt-Formular (Browser und Server).
 * Ziel: Tippfehler und offensichtliche Fantasie-Angaben abfangen, ohne echte
 * Angaben abzulehnen. Im Zweifel gilt eine Angabe als gültig.
 */

/** Häufige Tippfehler bei großen Anbietern: falsche Domain → richtige Domain. */
const DOMAIN_TYPOS: Record<string, string> = {
  'gmial.com': 'gmail.com',
  'gmal.com': 'gmail.com',
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'gmail.co': 'gmail.com',
  'gmail.cm': 'gmail.com',
  'gmail.con': 'gmail.com',
  'gmail.om': 'gmail.com',
  'googlemail.de': 'googlemail.com',
  'gmx.dee': 'gmx.de',
  'gmx.ed': 'gmx.de',
  'gmx.dr': 'gmx.de',
  'gmx.d': 'gmx.de',
  'gxm.de': 'gmx.de',
  'gmxde': 'gmx.de',
  'web.ed': 'web.de',
  'web.dee': 'web.de',
  'wed.de': 'web.de',
  'webde': 'web.de',
  't-onlin.de': 't-online.de',
  'tonline.de': 't-online.de',
  't-online.com': 't-online.de',
  'hotmial.com': 'hotmail.com',
  'hotmal.com': 'hotmail.com',
  'hotmail.co': 'hotmail.com',
  'outlok.com': 'outlook.com',
  'outlook.co': 'outlook.com',
  'outlok.de': 'outlook.de',
  'yahooo.com': 'yahoo.com',
  'yaho.com': 'yahoo.com',
  'yahoo.co': 'yahoo.com',
  'icloud.co': 'icloud.com',
  'iclod.com': 'icloud.com',
  'icould.com': 'icloud.com',
};

/** Fehlertext zur E-Mail-Adresse oder null, wenn sie in Ordnung aussieht. */
export function emailProblem(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!email) return 'Bitte gib deine E-Mail-Adresse an. Dorthin schicken wir dir den Bericht.';
  if (/\s/.test(email)) return 'In der E-Mail-Adresse ist ein Leerzeichen. Bitte entfern es.';
  const at = email.split('@');
  if (at.length === 1) return 'In der E-Mail-Adresse fehlt das @, z. B. name@firma.de.';
  if (at.length > 2) return 'Die E-Mail-Adresse enthält mehr als ein @. Bitte prüf sie noch einmal.';
  const [local, domain] = at;
  if (!local) return 'Vor dem @ fehlt dein Name, z. B. name@firma.de.';
  if (!domain) return 'Nach dem @ fehlt noch etwas, z. B. name@firma.de.';
  const fix = DOMAIN_TYPOS[domain];
  if (fix) return `Meintest du ${local}@${fix}? Bitte prüf die Schreibweise nach dem @.`;
  if (!domain.includes('.')) return `Nach dem @ fehlt die Endung, z. B. ${local}@${domain}.de.`;
  if (local.startsWith('.') || local.endsWith('.') || /\.\./.test(email) || domain.startsWith('.') || domain.startsWith('-')) {
    return 'An den Punkten in der E-Mail-Adresse stimmt etwas nicht. Bitte prüf sie noch einmal.';
  }
  const tld = domain.split('.').pop() ?? '';
  if (!/^[a-z]{2,24}$/.test(tld)) return 'Die Endung der E-Mail-Adresse sieht falsch aus, z. B. .de oder .com.';
  if (email.length > 254 || !/^[^@]+@[a-z0-9.-]+$/.test(email)) {
    return 'Die E-Mail-Adresse enthält Zeichen, die es nicht gibt. Bitte prüf sie noch einmal.';
  }
  return null;
}

const PHONE_HINT = 'z. B. 0171 2345678 oder 05251 123456';

/** Fehlertext zur Telefonnummer oder null, wenn sie in Ordnung aussieht. */
export function phoneProblem(raw: string): string | null {
  const value = raw.trim();
  if (!value) return 'Bitte gib deine Telefonnummer an. Wir rufen nur an, um dein Ergebnis mit dir durchzugehen.';
  if (!/^\+?[\d\s/().-]+$/.test(value)) return `Die Telefonnummer darf nur Ziffern enthalten, ${PHONE_HINT}.`;
  let digits = value.replace(/\D/g, '');
  const plus = value.startsWith('+');

  // Deutsche Nummer in Landesform bringen: +49 / 0049 → 0
  if (plus && digits.startsWith('49')) digits = `0${digits.slice(2).replace(/^0/, '')}`;
  else if (!plus && digits.startsWith('0049')) digits = `0${digits.slice(4).replace(/^0/, '')}`;
  else if (plus || digits.startsWith('00')) {
    // Ausland: nur die Länge prüfen (internationale Nummern haben 8 bis 15 Ziffern)
    const intl = digits.replace(/^00/, '');
    if (/^0/.test(intl) || /^(\d)\1+$/.test(intl)) return `Diese Telefonnummer gibt es so nicht. Bitte gib deine echte Nummer an, ${PHONE_HINT}.`;
    return intl.length >= 8 && intl.length <= 15 ? null : `Die Telefonnummer ist zu ${intl.length < 8 ? 'kurz' : 'lang'}. Bitte prüf sie noch einmal.`;
  }

  if (!digits.startsWith('0')) return `Bitte gib die Nummer mit Vorwahl an, ${PHONE_HINT}.`;
  const rest = digits.slice(1);
  if (/^(\d)\1+$/.test(rest) || '1234567890'.includes(rest) || '9876543210'.includes(rest)) {
    return `Diese Telefonnummer gibt es so nicht. Bitte gib deine echte Nummer an, ${PHONE_HINT}.`;
  }
  if (digits.length < 8) return `Die Telefonnummer ist zu kurz. Bitte mit Vorwahl angeben, ${PHONE_HINT}.`;
  if (digits.length > 14) return 'Die Telefonnummer ist zu lang. Bitte prüf sie noch einmal.';
  // Handynummern (015, 016, 017) haben 10 bis 12 Ziffern
  if (/^01[567]/.test(digits) && (digits.length < 10 || digits.length > 12)) {
    return `${digits.length < 10 ? 'Bei der Handynummer fehlt eine Ziffer' : 'Die Handynummer hat eine Ziffer zu viel'}. Bitte prüf sie noch einmal.`;
  }
  return null;
}
