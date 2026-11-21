/**
 * Erklaerung und Fragen unter dem SEO-Check. Von /seo-check und den
 * Branchen-Varianten (/seo-check/werkstatt, /seo-check/makler) genutzt.
 */

const CHECKED = [
  {
    title: 'Sichtbarkeit bei Google',
    text: 'Für wie viele Suchbegriffe deine Website angezeigt wird, wie viele davon auf Seite 1 stehen und welche kurz davor sind.',
  },
  {
    title: 'Technik',
    text: 'Ladezeit auf dem Handy, sichere Verbindung, Sitemap, defekte Links und ob Google deine Seiten überhaupt aufnehmen darf.',
  },
  {
    title: 'Inhalte',
    text: 'Seitentitel, Beschreibungen in Google, Überschriften, Textmenge und ob jede Leistung eine eigene Seite hat.',
  },
  {
    title: 'Lokale Auffindbarkeit',
    text: 'Adresse, Telefonnummer, Ort im Titel, Firmendaten für Google und alles, was dich in deiner Region sichtbar macht.',
  },
];

export const FAQ: { q: string; a: string }[] = [
  {
    q: 'Ist der SEO-Check wirklich kostenlos?',
    a: 'Ja. Du bekommst dein Ergebnis sofort. Den vollständigen Bericht mit allen Maßnahmen geben wir dir gegen Name, E-Mail und Telefonnummer frei. Jede Person kann einen Check machen.',
  },
  {
    q: 'Wie genau sind die Platzierungen?',
    a: 'Die Platzierungen stammen aus einer großen Datenbank mit Google-Suchergebnissen für Deutschland und werden wöchentlich aktualisiert. Lokal kann Google je nach Standort des Suchenden etwas anders sortieren.',
  },
  {
    q: 'Was passiert mit meinen Daten?',
    a: 'Wir speichern das Ergebnis, damit du es über deinen Link wieder aufrufen kannst. Name, E-Mail und Telefonnummer nutzen wir nur, um dir den Bericht zu schicken und dich zu deinem Ergebnis zu kontaktieren. Mehr dazu in der Datenschutzerklärung.',
  },
  {
    q: 'Und wenn ich die Maßnahmen nicht selbst umsetzen will?',
    a: 'Dann übernehmen wir das. Mit unserem Paket „Sichtbar in 90 Tagen“ richten wir dein Google-Profil ein, optimieren deine Website und du siehst jeden Monat die Zahlen in deinem eigenen Kundenportal.',
  },
];

/** Letzte Frage für die Branchen-Seiten, ohne Paketnamen. */
export const FAQ_FUNNEL: { q: string; a: string }[] = [
  ...FAQ.slice(0, 3),
  {
    q: 'Und wenn ich das nicht selbst umsetzen will?',
    a: 'Dann übernehmen wir das, von der Website bis zur Sichtbarkeit bei Google. Ob und wie wir dir helfen können, klären wir im kostenlosen Gespräch.',
  },
];

export default function SeoCheckSections({ faq, showChecked = true }: { faq: { q: string; a: string }[]; showChecked?: boolean }) {
  return (
    <>
      {showChecked && (
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-4 md:px-6">
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight text-[var(--color-black)]">Was der Check prüft</h2>
          <p className="mt-3 max-w-[640px] text-[17px] text-[var(--color-gray)]">
            Eine Website kann technisch perfekt sein und trotzdem bei Google nicht auftauchen. Deshalb prüfen wir beides:
            wie gut die Seite gebaut ist und ob sie tatsächlich angezeigt wird.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {CHECKED.map((c) => (
              <div key={c.title} className="rounded-[18px] bg-[var(--color-offwhite)] p-6">
                <h3 className="text-[17px] font-semibold text-[var(--color-black)]">{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-gray)]">{c.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      <section className="bg-[var(--color-offwhite)] py-16 md:py-24">
        <div className="mx-auto max-w-[800px] px-4 md:px-6">
          <h2 className="text-[28px] md:text-[36px] font-bold tracking-tight text-[var(--color-black)]">Häufige Fragen</h2>
          <div className="mt-8 space-y-3">
            {faq.map((f) => (
              <details key={f.q} className="group rounded-[18px] bg-white p-5 shadow-[var(--shadow-sm)]">
                <summary className="cursor-pointer list-none text-[17px] font-semibold text-[var(--color-black)] flex justify-between gap-4">
                  {f.q}
                  <span aria-hidden className="text-[var(--color-blue)] transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-[15px] leading-relaxed text-[var(--color-gray)]">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

    </>
  );
}
