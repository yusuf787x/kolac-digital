import type { ExpenseCategory } from './types';

/**
 * Heuristik zur Neuzuordnung bestehender Belege auf die
 * erweiterten EÜR-Kategorien (Bewirtung, Kfz, Miete, Fremdleistungen,
 * Geschenke). Nutzt Description + Lieferant. Konservativ: wenn nichts
 * eindeutig passt, wird die alte Kategorie beibehalten.
 */
export function suggestCategory(
  description: string,
  supplier: string,
  currentCategory: ExpenseCategory,
): ExpenseCategory {
  const text = `${description} ${supplier}`.toLowerCase();

  // Bewirtung — Restaurants, Cafés, Bars, Catering
  if (
    /(restaurant|gaststätte|gaststaette|café|cafe|bar\b|bistro|imbiss|pizzeria|trattoria|brasserie|catering|kellner|speisen|getränke|getraenke|menü|menu|trinkgeld|bewirtung)/.test(
      text,
    )
  ) {
    return 'Bewirtung';
  }

  // Kfz-Kosten (nicht Reisen — die sind ÖPNV/Flug/Hotel)
  if (
    /(tankstelle|shell|aral|jet\b|esso|total|hem\b|star\b|werkstatt|kfz-|kfz\s|auto-?reparatur|auto-?wäsche|autowaesche|waschanlage|reifen|adac|kfz-versicherung|kfz-?steuer)/.test(
      text,
    )
  ) {
    return 'Kfz-Kosten';
  }

  // Fremdleistungen — externe Freelancer/Subunternehmer
  if (
    /(freelance|freelancer|subunternehmer|auftragnehmer|dienstleist|honorar|beratung.*(rechnung|leistung)|agentur.*rechnung|graphicdesign|entwickler.*extern)/.test(
      text,
    )
  ) {
    return 'Fremdleistungen';
  }

  // Geschenke
  if (
    /(geschenk|präsent|praesent|blumenstrauß|blumenstrauss|weinpräsent|weinpraesent|geschenkgutschein)/.test(
      text,
    )
  ) {
    return 'Geschenke';
  }

  // Miete Büro (nicht Möbel)
  if (
    /(mieten?|nebenkosten|betriebskosten).*(büro|buero|geschäftsraum|geschaeftsraum|gewerbe)|(büro|buero).*mieten?/.test(
      text,
    )
  ) {
    return 'Miete Büro';
  }

  return currentCategory;
}
