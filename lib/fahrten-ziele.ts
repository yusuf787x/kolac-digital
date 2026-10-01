/**
 * Haeufig angefahrene Ziele mit hinterlegter Entfernung.
 *
 * Die Kilometer sind echte Strassenentfernungen ab dem Betriebssitz,
 * ermittelt am 01.10.2026 ueber OSRM (OpenStreetMap-Routing, kuerzeste
 * Fahrstrecke fuer PKW). Sie sind als Vorschlag gedacht. Wer eine
 * andere Route gefahren ist, etwa ueber die Autobahn statt durch die
 * Stadt, traegt die tatsaechlich gefahrene Strecke ein.
 *
 * Der Katalog ersetzt keine Adresssuche. Er spart nur Tipparbeit bei
 * den Zielen, die ohnehin staendig vorkommen.
 */
export interface Fahrtziel {
  name: string;
  address: string;
  /** Einfache Entfernung ab Betriebssitz in km. */
  distanceKm: number;
  /** Typischer Anlass. Wird als Vorschlag ins Formular uebernommen. */
  defaultPurpose: string;
}

export const FAHRTZIELE: Fahrtziel[] = [
  {
    name: 'MK Automobile',
    address: 'Goebenstraße 82, 32051 Herford',
    distanceKm: 16.7,
    defaultPurpose: 'Video-Dreh und Content-Produktion',
  },
  {
    name: 'Mironi',
    address: 'Gehrenberg 8, 32052 Herford',
    distanceKm: 14.4,
    defaultPurpose: 'Kundenmeeting und Projektabsprache',
  },
  {
    name: 'CarHiFi Halim',
    address: 'Wittekindstraße 10, 32051 Herford',
    distanceKm: 13.2,
    defaultPurpose: 'Dreh und Besprechung der Zusammenarbeit',
  },
  {
    name: 'PaderPuls',
    address: 'Frankfurter Weg 27, 33106 Paderborn',
    distanceKm: 50.9,
    defaultPurpose:
      'Besprechung Webseite, weitere Projekte, Einrichtung Telefonanlage',
  },
  {
    name: 'Bielefeld Innenstadt',
    address: 'Jahnplatz, 33602 Bielefeld',
    distanceKm: 2.7,
    defaultPurpose: 'Kundentermin vor Ort',
  },
  {
    name: 'Bielefeld-Brake',
    address: 'Brake, 33729 Bielefeld',
    distanceKm: 6.5,
    defaultPurpose: 'Kundentermin vor Ort',
  },
];

/**
 * Schaetzt aus einer getankten Menge die damit gefahrene Strecke.
 *
 * Dient NICHT dazu, Kilometer zu erfinden. Der Wert ist eine
 * Plausibilitaetsgrenze: die tatsaechlich aufgezeichneten Fahrten
 * sollten in dieser Groessenordnung liegen und sie nicht
 * ueberschreiten.
 */
export function kmAusLitern(liter: number, verbrauchPro100km: number): number {
  if (verbrauchPro100km <= 0) return 0;
  return Math.round((liter / verbrauchPro100km) * 100);
}
