import Image from 'next/image';
import type { FunnelVariant } from '@/lib/seo-check/funnel';
import { VSL_VIDEO_URL } from '@/lib/seo-check/funnel';

/**
 * Bausteine der Branchen-Landingpages (/seo-check/werkstatt, /seo-check/makler).
 * Aufbau angelehnt an Hormozis Workshop-Seite, aber kurz: Symptome, drei
 * Gründe, Belege, Ablauf, Über mich, zweiter Einstieg. Nur echte Zahlen,
 * keine Kundennamen, kein Preis.
 */

const H2 = 'text-[28px] md:text-[36px] font-bold leading-[1.15] tracking-tight text-[var(--color-black)]';

/** Kleine Zeile mit Porträt im Hero. */
export function FunnelByline() {
  return (
    <div className="mt-6 flex items-center gap-3">
      <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--color-offwhite)] ring-2 ring-white shadow-[var(--shadow-sm)]">
        <Image src="/images/yk-portrait.webp" alt="" fill sizes="40px" className="object-cover" />
      </span>
      <p className="text-[13px] leading-snug text-[var(--color-gray)]">
        Von <span className="font-semibold text-[var(--color-black)]">Yusuf Kolac</span>, Webdesigner aus Bielefeld
      </p>
    </div>
  );
}

/**
 * Rechte Seite im Hero: das Verkaufsvideo, sobald es eine Datei gibt, sonst
 * eine gebaute Beispiel-Ergebniskarte (klar als Beispiel gekennzeichnet).
 */
export function FunnelHeroVisual() {
  if (VSL_VIDEO_URL) {
    return (
      <div className="overflow-hidden rounded-[24px] bg-black shadow-[var(--shadow-md)]">
        <video src={VSL_VIDEO_URL} controls playsInline preload="metadata" className="aspect-video w-full" />
      </div>
    );
  }
  return <ExampleResultCard />;
}

function ExampleResultCard() {
  const score = 38;
  const r = 36;
  const c = 2 * Math.PI * r;
  const bars: Array<[string, number, string]> = [
    ['Sichtbarkeit bei Google', 14, 'var(--color-fail)'],
    ['Technik', 71, 'var(--color-warn)'],
    ['Inhalte', 46, 'var(--color-fail)'],
    ['Lokale Auffindbarkeit', 52, 'var(--color-warn)'],
  ];
  return (
    <figure aria-label="Beispiel für ein Ergebnis des Website-Checks" className="relative rounded-[24px] bg-white p-6 shadow-[var(--shadow-md)] md:p-7">
      <span className="absolute right-5 top-5 rounded-full bg-[var(--color-offwhite)] px-3 py-1 text-[12px] font-semibold text-[var(--color-gray)]">
        Beispiel
      </span>
      <div className="flex items-center gap-5">
        <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden className="shrink-0">
          <circle cx="44" cy="44" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke="var(--color-fail)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * c} ${c}`}
            transform="rotate(-90 44 44)"
          />
          <text x="44" y="50" textAnchor="middle" className="fill-[var(--color-black)]" fontSize="22" fontWeight="800">
            {score}
          </text>
        </svg>
        <div>
          <p className="text-[13px] text-[var(--color-gray)]">beispiel-betrieb.de</p>
          <p className="text-[20px] font-bold text-[var(--color-fail)]">Viel Luft nach oben</p>
        </div>
      </div>
      <div className="mt-5 space-y-3">
        {bars.map(([label, value, color]) => (
          <div key={label}>
            <div className="flex justify-between text-[13px]">
              <span className="text-[var(--color-black)]">{label}</span>
              <span className="font-semibold text-[var(--color-black)]">{value}</span>
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-[#eef0f3]">
              <div className="h-1.5 rounded-full" style={{ width: `${value}%`, background: color }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 rounded-[12px] bg-[#fdeceb] p-3 text-[13px] leading-snug text-[var(--color-black)]">
        <span className="font-semibold text-[var(--color-fail)]">Wichtigster Befund: </span>
        Nur 2 Suchbegriffe stehen auf Seite 1.
      </div>
    </figure>
  );
}

const REASONS: Array<[string, string, string]> = [
  ['01', 'Eine Seite für alles', 'Alle Leistungen stehen auf einer Seite. Google weiß dann gar nicht, wofür du eigentlich gefunden werden willst.'],
  ['02', 'Google-Profil halb ausgefüllt', 'Wer bei Google Maps oben steht, bekommt die Anrufe. Fehlen Kategorien, Fotos und Bewertungen, stehen andere vor dir.'],
  ['03', 'Seit Jahren nichts Neues', 'Kommt nie etwas dazu, wirkt deine Seite für Google wie ein Laden, der zu hat.'],
];

const PROOF: Array<[string, string, string]> = [
  ['3-mal', 'so oft bei Google angezeigt, in 28 Tagen', 'Eine Praxis aus OWL: von 19.414 auf 59.666 Einblendungen.'],
  ['5-mal', 'so viele Besucher über Google wie im Sommer', 'Meine eigene Website, nachdem sie nach denselben Regeln umgebaut wurde.'],
];

const STEPS: Array<[string, string]> = [
  ['Adresse eingeben', 'Nur deine Website, keine Anmeldung.'],
  ['Ergebnis in 30 Sekunden', 'Du siehst deine Note und das wichtigste Problem sofort.'],
  ['Vollen Bericht freischalten', 'Mit allen Befunden und Lösungen. Auf Wunsch gehen wir ihn gemeinsam durch.'],
];

export default function FunnelSections({ variant }: { variant: FunnelVariant }) {
  return (
    <>
      {/* Kommt dir das bekannt vor? */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto grid max-w-[1100px] gap-10 px-4 md:grid-cols-[0.9fr_1.1fr] md:items-center md:gap-16 md:px-6">
          <h2 className={H2}>Kommt dir das bekannt vor?</h2>
          <div>
            <ul className="space-y-3">
              {variant.symptoms.map((s) => (
                <li key={s} className="flex gap-3 rounded-[12px] bg-[var(--color-offwhite)] px-4 py-3 text-[16px] leading-snug text-[var(--color-black)]">
                  <span aria-hidden className="mt-[2px] font-bold text-[var(--color-blue)]">✓</span>
                  {s}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[17px] font-semibold leading-snug text-[var(--color-black)]">
              Das sind keine einzelnen Probleme. Google zeigt deine Website einfach nicht.
            </p>
          </div>
        </div>
      </section>

      {/* Drei Gründe */}
      <section className="bg-[var(--color-offwhite)] py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-4 md:px-6">
          <h2 className={H2}>Warum Websites keine Anfragen bringen</h2>
          <p className="mt-3 max-w-[620px] text-[17px] text-[var(--color-gray)]">
            Technisch sind die meisten Seiten in Ordnung. Woran es meistens liegt:
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {REASONS.map(([n, title, text]) => (
              <div key={n} className="rounded-[18px] bg-white p-6 shadow-[var(--shadow-sm)]">
                <p className="text-[20px] font-extrabold text-[var(--color-blue)]">{n}</p>
                <h3 className="mt-2 text-[17px] font-semibold text-[var(--color-black)]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-gray)]">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Belege */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-4 md:px-6">
          <h2 className={H2}>Dass es anders geht</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {PROOF.map(([big, label, note]) => (
              <div key={big} className="rounded-[18px] bg-[var(--color-offwhite)] p-6 md:p-8">
                <p className="text-[44px] font-extrabold leading-none tracking-tight text-[var(--color-blue)]">{big}</p>
                <p className="mt-2 text-[17px] font-semibold text-[var(--color-black)]">{label}</p>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-gray)]">{note}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-[13px] text-[var(--color-gray)]">Zahlen aus der Google Search Console. Kundennamen nennen wir nicht.</p>
        </div>
      </section>

      {/* Ablauf */}
      <section className="bg-[var(--color-offwhite)] py-16 md:py-24">
        <div className="mx-auto max-w-[1100px] px-4 md:px-6">
          <h2 className={H2}>So läuft der Check</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="rounded-[18px] bg-white p-6 shadow-[var(--shadow-sm)]">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-blue-light)] text-[15px] font-bold text-[var(--color-blue)]">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-[17px] font-semibold text-[var(--color-black)]">{title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[var(--color-gray)]">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Über mich */}
      <section className="bg-white py-16 md:py-24">
        <div className="mx-auto grid max-w-[900px] items-center gap-8 px-4 md:grid-cols-[auto_1fr] md:gap-12 md:px-6">
          <div className="relative mx-auto h-40 w-40 overflow-hidden rounded-full bg-[var(--color-offwhite)] shadow-[var(--shadow-md)] md:h-52 md:w-52">
            <Image
              src="/images/yk-portrait.webp"
              alt="Yusuf Kolac, Webdesigner aus Bielefeld"
              fill
              sizes="(min-width: 768px) 208px, 160px"
              className="object-cover"
            />
          </div>
          <div>
            <h2 className={H2}>Moin, ich bin Yusuf.</h2>
            <div className="mt-4 space-y-3 text-[17px] leading-relaxed text-[var(--color-gray)]">
              <p>Ich baue Websites für Betriebe aus OWL und kümmere mich darum, dass Google sie auch zeigt. Das mache ich selbst.</p>
              <p>{variant.aboutLine}</p>
              <p>
                Bevor wir sprechen, schaue ich mir dein Ergebnis genau an. Wenn ich dir nicht helfen kann, sag ich dir das ehrlich. Darum nehme ich
                pro Monat auch nur drei neue Betriebe an.
              </p>
            </div>
            <p className="mt-5 text-[17px] font-semibold text-[var(--color-black)]">Yusuf Kolac</p>
          </div>
        </div>
      </section>

      {/* Zweiter Einstieg */}
      <section className="bg-[var(--color-offwhite)] py-16 md:py-20">
        <div className="mx-auto max-w-[700px] px-4 text-center md:px-6">
          <h2 className={H2}>Wie steht deine Website da?</h2>
          <p className="mx-auto mt-3 max-w-[520px] text-[17px] text-[var(--color-gray)]">Kostenlos, ohne Anmeldung, in rund 30 Sekunden.</p>
          <a href="#seo-url" className="btn btn-primary mt-8 justify-center">
            Jetzt Website prüfen
          </a>
        </div>
      </section>
    </>
  );
}
