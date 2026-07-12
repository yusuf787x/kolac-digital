import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { caseStudies, findCaseStudy } from '@/lib/case-studies';
import { site } from '@/lib/site-config';
import Reveal from '@/components/marketing/Reveal';
import ValueIcon from '@/components/case-studies/ValueIcon';
import VideoTestimonial from '@/components/case-studies/VideoTestimonial';

interface Params {
  params: { slug: string };
}

export async function generateStaticParams() {
  return caseStudies.map((cs) => ({ slug: cs.slug }));
}

export async function generateMetadata({
  params,
}: Params): Promise<Metadata> {
  const cs = findCaseStudy(params.slug);
  if (!cs) return {};
  const title = `${cs.company} · Case Study · Kolac Digital`;
  return {
    title,
    description: cs.resultTeaser,
    alternates: { canonical: `${site.baseUrl}/case-studys/${cs.slug}` },
    openGraph: {
      title,
      description: cs.resultTeaser,
      url: `${site.baseUrl}/case-studys/${cs.slug}`,
      type: 'article',
      images: [{ url: cs.screenshot }],
    },
  };
}

export default function CaseStudyDetailPage({ params }: Params) {
  const cs = findCaseStudy(params.slug);
  if (!cs) notFound();

  return (
    <article>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gray-100 bg-gradient-to-b from-white to-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:py-24">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-wider text-brand-blue">
              {cs.category} · Case Study
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
              {cs.hero.headline}
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {cs.hero.subline}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Wer ist das eigentlich? — kurzer Founder/Betrieb-Kontext,
          damit der Leser sofort weiss um wen es geht. */}
      <section className="border-b border-gray-100 bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-blue">
              Wer ist das eigentlich
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-gray-900 sm:text-3xl">
              {cs.founder.headline}
            </h2>
          </Reveal>
          <Reveal delay={80}>
            <p className="mt-5 text-base leading-relaxed text-gray-700 sm:text-lg">
              {cs.founder.paragraph}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              {cs.problem.headline}
            </h2>
          </Reveal>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-gray-700 sm:text-lg">
            {cs.problem.paragraphs.map((p, idx) => (
              <Reveal key={idx} delay={80 + idx * 60}>
                <p>{p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Ausgangslage */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-blue">
              Ausgangslage
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              {cs.situation.headline}
            </h2>
          </Reveal>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-gray-700 sm:text-lg">
            {cs.situation.paragraphs.map((p, idx) => (
              <Reveal key={idx} delay={80 + idx * 60}>
                <p>{p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Mehrwerte / Icons */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-blue">
              Mehrwert
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              {cs.values.headline}
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
              {cs.values.intro}
            </p>
          </Reveal>

          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {cs.values.blocks.map((block, idx) => (
              <Reveal key={idx} delay={idx * 100}>
                <div className="flex flex-col rounded-2xl border border-gray-100 bg-gradient-to-b from-white to-gray-50 p-6 shadow-sm transition-shadow hover:shadow-md">
                  <div className="mb-4">
                    <ValueIcon icon={block.iconKey} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {block.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    {block.description}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Screenshot Dashboard */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="mx-auto max-w-2xl text-center">
              <p className="text-xs font-medium uppercase tracking-wider text-brand-blue">
                Überblick
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                So sieht der Überblick aus
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600 sm:text-lg">
                Ein Bildschirm, auf dem alles zusammenläuft. Termine, Patienten,
                Rechnungen, Automatisierungen.
              </p>
            </div>
          </Reveal>

          <Reveal delay={120}>
            <div className="mx-auto mt-12 max-w-5xl">
              {/* Browser-Mockup Rahmen */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
                <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3">
                  <span className="h-3 w-3 rounded-full bg-red-400" />
                  <span className="h-3 w-3 rounded-full bg-yellow-400" />
                  <span className="h-3 w-3 rounded-full bg-green-400" />
                  <span className="ml-4 truncate rounded-md bg-white px-3 py-1 text-xs text-gray-500 shadow-sm">
                    dashboard.bacara-aesthetik.de
                  </span>
                </div>
                <div className="relative aspect-[16/10] w-full bg-gray-100">
                  <Image
                    src={cs.screenshot}
                    alt={cs.screenshotAlt}
                    fill
                    className="object-cover object-left"
                    sizes="(max-width: 1024px) 100vw, 1024px"
                  />
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Ergebnis */}
      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <p className="text-xs font-medium uppercase tracking-wider text-brand-blue">
              Ergebnis
            </p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              {cs.results.headline}
            </h2>
          </Reveal>

          <ul className="mt-8 space-y-4">
            {cs.results.points.map((point, idx) => (
              <Reveal key={idx} delay={idx * 90}>
                <li className="flex items-start gap-3 rounded-xl bg-gray-50 p-5">
                  <span
                    aria-hidden
                    className="mt-0.5 grid h-6 w-6 flex-shrink-0 place-items-center rounded-full bg-brand-blue text-xs font-bold text-white"
                  >
                    ✓
                  </span>
                  <p className="text-base leading-relaxed text-gray-800">
                    {point}
                  </p>
                </li>
              </Reveal>
            ))}
          </ul>

          <Reveal delay={400}>
            <p className="mt-10 text-lg font-medium leading-relaxed text-gray-900">
              {cs.results.closing}
            </p>
          </Reveal>
        </div>
      </section>

      {/* Video-Testimonial (optional) — nutzt die gleichen CSS-Klassen
          wie die Homepage-Kundenstimmen, damit alles einheitlich aussieht. */}
      {cs.videoTestimonial && (
        <section className="bg-white pb-16 sm:pb-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <Reveal>
              <div className="text-center">
                <p className="text-xs font-medium uppercase tracking-wider text-brand-blue">
                  Kundenstimme
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
                  Was der Kunde selbst dazu sagt
                </h2>
              </div>
            </Reveal>
            <Reveal delay={100}>
              <div className="video-testimonials mt-10 mx-auto max-w-3xl">
                <VideoTestimonial data={cs.videoTestimonial} />
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* Bridge zu anderen Zielgruppen */}
      <section className="bg-gray-50 py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tight text-gray-900 sm:text-4xl">
              {cs.bridge.headline}
            </h2>
          </Reveal>
          <div className="mt-8 space-y-5 text-base leading-relaxed text-gray-700 sm:text-lg">
            {cs.bridge.paragraphs.map((p, idx) => (
              <Reveal key={idx} delay={80 + idx * 60}>
                <p>{p}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Technischer Anhang, dezent */}
      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <details className="rounded-xl border border-gray-100 bg-gray-50/50 p-6 open:bg-white">
              <summary className="cursor-pointer text-base font-semibold text-gray-900">
                {cs.technical.headline}
              </summary>
              <p className="mt-4 text-sm leading-relaxed text-gray-600">
                {cs.technical.paragraph}
              </p>
            </details>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-gradient-to-br from-brand-blue to-blue-700 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
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
          </Reveal>
        </div>
      </section>

      {/* Zurueck zur Uebersicht */}
      <div className="border-t border-gray-100 bg-white py-10">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Link
            href="/case-studys"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            ← Alle Case Studys ansehen
          </Link>
        </div>
      </div>
    </article>
  );
}
