'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/dashboard/seo', label: 'Kunden' },
  { href: '/dashboard/seo/aufgaben', label: 'Aufgaben' },
] as const;

/** Reiter oben im SEO-Bereich: Kundenliste und Aufgaben über alle Kunden. */
export default function SeoSectionTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="SEO-Bereich" className="-mx-4 overflow-x-auto border-b border-gray-200 px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {TABS.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                  active ? 'border-brand-blue text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
