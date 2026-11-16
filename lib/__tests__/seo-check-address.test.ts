import { findAddress, parsePage } from '../seo-check/html';

// Ausfuehren: npx tsx lib/__tests__/seo-check-address.test.ts

let failed = 0;
const check = (label: string, ok: boolean, detail?: unknown) => {
  if (!ok) failed++;
  console.log(label.padEnd(56), ok ? 'OK' : `FEHLER ${JSON.stringify(detail) ?? ''}`);
};
const addr = (html: string) => {
  const page = parsePage(html, 'https://example.de/');
  return findAddress(page.text, page.schemaAddress);
};
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

console.log('--- findAddress ---');

// Fall berlinentsorgung24.de: Handynummer direkt vor dem Brotkrumen-Link.
{
  const html = `<body><a href="tel:+4915144901450">0151 449 01450</a> <nav><a href="/">Startseite</a> Leistungen</nav>
    <footer><span>Koloniestr. 33, 13359 Berlin</span></footer></body>`;
  const got = addr(html);
  check('Telefonnummer vor Navigationswort wird keine PLZ', same(got, { zip: '13359', city: 'Berlin' }), got);
  const onlyPhone = findAddress('Mobil 0151 449 01450 Startseite Kontakt');
  check('nur Telefonnummer und Menue ergibt keine Adresse', onlyPhone === undefined, onlyPhone);
  const phoneCity = findAddress('Tel. 05251/123 45678 Paderborn');
  check('Telefonnummer mit / davor zaehlt nicht', phoneCity === undefined, phoneCity);
}

// Adresse nur im JSON-LD, auch verschachtelt in @graph.
{
  const ld = {
    '@context': 'https://schema.org',
    '@graph': [
      { '@type': 'WebSite', name: 'Test' },
      {
        '@type': 'LocalBusiness',
        name: 'Test GmbH',
        address: { '@type': 'PostalAddress', streetAddress: 'Hauptstr. 1', postalCode: '33602', addressLocality: 'Bielefeld' },
      },
    ],
  };
  const html = `<head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body><h1>Willkommen</h1></body>`;
  const got = addr(html);
  check('Adresse nur im JSON-LD (@graph)', same(got, { zip: '33602', city: 'Bielefeld' }), got);
  const page = parsePage(html, 'https://example.de/');
  check('Text allein findet dann nichts', findAddress(page.text) === undefined, findAddress(page.text));
}

// JSON-LD geht vor einem anderen Treffer im Text.
{
  const ld = { '@type': 'LocalBusiness', address: { postalCode: '13359', addressLocality: 'Berlin' } };
  const html = `<head><script type="application/ld+json">${JSON.stringify(ld)}</script></head><body>Lager in 14467 Potsdam</body>`;
  check('JSON-LD-Adresse gilt vor dem Seitentext', same(addr(html), { zip: '13359', city: 'Berlin' }), addr(html));
}

// Adresse nur im Footer-Text.
{
  const html = `<body><main>Seit 1998 in OWL</main><footer>Muster GmbH · Detmolder Straße 12 · 33604 Bielefeld · Impressum</footer></body>`;
  check('Adresse nur im Footer-Text', same(addr(html), { zip: '33604', city: 'Bielefeld' }), addr(html));
  const noComma = findAddress('Hauptstr. 12 33602 Bielefeld');
  check('Hausnummer ohne Komma vor der PLZ', same(noComma, { zip: '33602', city: 'Bielefeld' }), noComma);
  const twoWords = findAddress('Am Ring 4a, 74906 Bad Rappenau Impressum');
  check('Ortsvorsatz bleibt erhalten', same(twoWords, { zip: '74906', city: 'Bad Rappenau' }), twoWords);
  const preferStreet = findAddress('Über 10000 Kunden, auch 12345 Musterstadt. Firma, Ringstraße 3, 32052 Herford');
  check('Treffer mit Strasse davor wird bevorzugt', same(preferStreet, { zip: '32052', city: 'Herford' }), preferStreet);
}

// Keine Adresse.
{
  const html = `<body><h1>Webdesign</h1><p>Rufen Sie an: 0170 1234567</p><a href="/">Home</a></body>`;
  check('keine Adresse', addr(html) === undefined, addr(html));
  check('PLZ ausserhalb 01001 bis 99998 zaehlt nicht', findAddress('00999 Irgendwo') === undefined, findAddress('00999 Irgendwo'));
  check('Navigationswort ist nie ein Ort', findAddress('Ausgabe 33602 Kontakt') === undefined, findAddress('Ausgabe 33602 Kontakt'));
}

console.log(failed ? `\n${failed} Fehler` : '\nAlle Tests bestanden');
if (failed) process.exit(1);
