/**
 * Gezeichneter NFC-Bewertungs-Aufsteller (nach Yusufs echtem Aufsteller,
 * bewusst ohne Google-Logo). Wird ersetzt, sobald es ein eigenes Foto gibt.
 */

// Ausgedachtes Muster, nur Optik eines QR-Codes (nicht scanbar)
const QR = [
  '1110101',
  '1010010',
  '1101101',
  '0010110',
  '1011001',
  '0110101',
  '1001011',
];

function Finder({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <rect x={x} y={y} width="14" height="14" rx="2" fill="#1d1d1f" />
      <rect x={x + 2.5} y={y + 2.5} width="9" height="9" rx="1" fill="#fff" />
      <rect x={x + 4.5} y={y + 4.5} width="5" height="5" rx="0.8" fill="#1d1d1f" />
    </g>
  );
}

export default function NfcAufsteller({ className = 'w-[180px]', id = 'nfc' }: { className?: string; id?: string }) {
  const qx = 128;
  const qy = 162;
  return (
    <svg viewBox="0 0 200 236" className={className} role="img" aria-label="NFC-Bewertungs-Aufsteller: Bewerte uns auf Google, Handy kurz dranhalten oder QR-Code scannen">
      <defs>
        <linearGradient id={`${id}-glass`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <filter id={`${id}-shadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="7" floodColor="#1d1d1f" floodOpacity="0.14" />
        </filter>
      </defs>

      {/* Fuß */}
      <path d="M38 214h124l10 14H28z" fill="#e3e6ea" />
      <rect x="28" y="226" width="144" height="5" rx="2.5" fill="#d3d7dc" />

      {/* Tafel */}
      <g filter={`url(#${id}-shadow)`}>
        <rect x="16" y="6" width="168" height="212" rx="14" fill="#fff" />
      </g>
      <path d="M16 20a14 14 0 0 1 14-14h140a14 14 0 0 1 14 14v92H16z" fill="var(--color-blue)" />

      {/* Zeichen links oben: Sprechblase mit Stern statt Logo */}
      <circle cx="54" cy="56" r="25" fill="#fff" />
      <path d="M42 46a4 4 0 0 1 4-4h16a4 4 0 0 1 4 4v12a4 4 0 0 1-4 4h-9l-6 5v-5h-1a4 4 0 0 1-4-4z" fill="var(--color-blue)" />
      <path d="m54 45.5 2.1 4.3 4.7.7-3.4 3.3.8 4.7-4.2-2.2-4.2 2.2.8-4.7-3.4-3.3 4.7-.7z" fill="var(--color-star)" />

      <text x="132" y="47" textAnchor="middle" fill="#fff" fontSize="14" fontWeight="600">Bewerte uns</text>
      <text x="132" y="67" textAnchor="middle" fill="#fff" fontSize="17" fontWeight="800">auf Google</text>
      <text x="132" y="86" textAnchor="middle" fill="var(--color-star)" fontSize="15" letterSpacing="1.5">★★★★★</text>

      {/* Unten links: Handy dranhalten */}
      <text x="56" y="128" textAnchor="middle" fill="#1d1d1f" fontSize="10.5" fontWeight="700">Handy kurz</text>
      <text x="56" y="140" textAnchor="middle" fill="#1d1d1f" fontSize="10.5" fontWeight="700">dranhalten</text>
      <g transform="translate(30 152)">
        <rect x="14" y="2" width="24" height="40" rx="5" fill="#fff" stroke="#1d1d1f" strokeWidth="2" />
        <rect x="22" y="6" width="8" height="1.8" rx="0.9" fill="#1d1d1f" />
        <text x="26" y="27" textAnchor="middle" fill="var(--color-blue)" fontSize="7" fontWeight="800">NFC</text>
        <path d="M8 14a12 12 0 0 0 0 16M3 10a18 18 0 0 0 0 24" fill="none" stroke="var(--color-blue)" strokeWidth="2" strokeLinecap="round" />
      </g>

      <text x="100" y="180" textAnchor="middle" fill="#6e6e73" fontSize="10">oder</text>

      {/* Unten rechts: QR-Code */}
      <text x="144" y="128" textAnchor="middle" fill="#1d1d1f" fontSize="10.5" fontWeight="700">QR-Code</text>
      <text x="144" y="140" textAnchor="middle" fill="#1d1d1f" fontSize="10.5" fontWeight="700">scannen</text>
      <rect x={qx - 6} y={qy - 10} width="44" height="44" rx="4" fill="#fff" stroke="#e3e6ea" />
      <Finder x={qx - 3} y={qy - 7} />
      <Finder x={qx + 21} y={qy - 7} />
      <Finder x={qx - 3} y={qy + 17} />
      {QR.flatMap((row, r) =>
        row.split('').map((c, k) =>
          c === '1' && !((r < 3 && k < 3) || (r < 3 && k > 3) || (r > 3 && k < 3)) ? (
            <rect key={`${r}-${k}`} x={qx - 3 + k * 5.4} y={qy - 7 + r * 5.4} width="4.2" height="4.2" rx="0.6" fill="#1d1d1f" />
          ) : null,
        ),
      )}

      {/* Glanz der Acrylplatte */}
      <path d="M16 20a14 14 0 0 1 14-14h70L16 150z" fill={`url(#${id}-glass)`} />
    </svg>
  );
}
