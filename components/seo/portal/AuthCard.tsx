import Logo from '@/components/Logo';

/** Rahmen fuer Login und Link-Einloesung. */
export default function AuthCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-8">
          <Logo width={180} height={45} priority />
        </div>
        <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8">
          <h1 className="text-2xl font-semibold mb-2">{title}</h1>
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-gray-500">
          Fragen? <a className="underline" href="mailto:yusuf@kolac-digital.de">yusuf@kolac-digital.de</a> oder{' '}
          <a className="underline whitespace-nowrap" href="tel:+4917695762018">0176 95762018</a>
        </p>
      </div>
    </main>
  );
}

export function Notice({ tone, children }: { tone: 'info' | 'error' | 'success'; children: React.ReactNode }) {
  const cls =
    tone === 'error'
      ? 'bg-red-50 border-red-200 text-red-800'
      : tone === 'success'
        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : 'bg-blue-50 border-blue-200 text-blue-900';
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`mb-5 px-4 py-3 rounded-lg border text-sm leading-relaxed ${cls}`}>
      {children}
    </div>
  );
}
