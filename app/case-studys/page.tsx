import type { Metadata } from 'next';
import Link from 'next/link';
import { caseStudies } from '@/lib/case-studies';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import ValueIcon from '@/components/case-studies/ValueIcon';

export const metadata: Metadata = {
  title: 'Case Studys · Kolac Digital',
  description:
    'Echte Projekte, echte Ergebnisse. Wie wir für Betriebe Systeme bauen, die die Verwaltung übernehmen und Zeit zurückgeben.',
  alternates: {
    canonical: `${site.baseUrl}/case-studys`,
  },
  openGraph: {
    title: 'Case Studys · Kolac Digital',
    description:
      'Echte Projekte, echte Ergebnisse. Von der Praxis bis zum Handwerksbetrieb.',
    url: `${site.baseUrl}/case-studys`,
    type: 'website',
  },
};

export default function CaseStudysOverviewPage() {
  return (
    <>
      {/* Hero */}
      <section className="border-b border-gray-100 bg-gradient-to-b from-white to-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-24">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              Case Studys
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-gray-900 sm:text-5xl">
              Echte Projekte, echte Ergebnisse.
            </h1>
            <p className="mt-4 max-w-2xl text-base text-gray-600 sm:text-lg">
              Kein Portfolio-Show. Wir zeigen, wie wir echten Betrieben ein
              System gebaut haben, das ihnen die Verwaltung abnimmt und Zeit
              zurückgibt.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Karten */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {caseStudies.map((cs, idx) => (
              <Reveal key={cs.slug} delay={idx * 90}>
                <Link
                  href={`/case-studys/${cs.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-xl"
                >
                  {/* Statt Screenshot ein grosses 3D-Icon in einer
                      dezenten Blau-Gradient-Flaeche. Sofort erkennbar,
                      passt zum Kern-Nutzen des Projekts. */}
                  <div className="relative aspect-[4/3] bg-gradient-to-br from-blue-50 via-white to-white flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_60%,rgba(37,99,235,0.10),transparent_60%)]" />
                    <div className="relative scale-[1.6] transition-transform duration-300 group-hover:scale-[1.75]">
                      <ValueIcon icon={cs.overviewIconKey} />
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <p className="text-xs font-medium uppercase tracking-wider text-brand-blue">
                      {cs.category}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-gray-900">
                      {cs.company}
                    </h2>
                    <p className="mt-3 flex-1 text-sm leading-relaxed text-gray-600">
                      {cs.resultTeaser}
                    </p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-blue">
                      Case ansehen
                      <span
                        aria-hidden
                        className="transition-transform group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-brand-blue to-blue-700 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Sollen wir über dein System reden?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-blue-100">
            Kein Verkaufsgespräch. Wir schauen uns an, wie dein Betrieb läuft
            und wo du Zeit verlierst. Wenn wir dir helfen können, sagen wir
            dir wie. Wenn nicht, auch ehrlich.
          </p>
          <a
            href={site.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-base font-medium text-brand-blue hover:opacity-90"
          >
            📅 Kostenloses Gespräch buchen
            <span aria-hidden>↗</span>
          </a>
        </div>
      </section>
    </>
  );
}
