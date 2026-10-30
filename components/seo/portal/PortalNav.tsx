'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const ITEMS: Array<[string, string]> = [
  ['/portal', 'Bericht'],
  ['/portal/massnahmen', 'Maßnahmen'],
  ['/portal/berichte', 'Alle Berichte'],
];

export default function PortalNav() {
  const path = usePathname();
  return (
    <nav aria-label="Kundenbereich" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex gap-1">
        {ITEMS.map(([href, label]) => {
          const active = href === '/portal' ? path === '/portal' : path.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? 'page' : undefined}
                className={`block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${
                  active ? 'border-brand-blue text-gray-900' : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
