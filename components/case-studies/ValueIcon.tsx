/**
 * Hochwertig gestaltete 3D-Icons fuer die Value-Section der Case
 * Studies. Alle Icons benutzen die gleichen Gradient-IDs und den
 * gleichen visuellen Rhythmus (weiche Schatten, isometrische Basis,
 * blauer Akzent).
 *
 * Konsistente Farbwelt:
 *   Basis:      #eff4ff (helles Hintergrund-Element)
 *   Kante:      #dbe4fb
 *   Highlight:  linear-gradient #2563EB -> #4f7bf5 (Brand-Blue)
 *   Schatten:   drop-shadow, dezent
 *
 * Kein externer Bild-Download noetig, alles SVG inline.
 */

type IconKey =
  | 'calendar'
  | 'dashboard'
  | 'automation'
  | 'document'
  | 'shield'
  | 'bell';

interface Props {
  icon: IconKey;
  className?: string;
}

export default function ValueIcon({ icon, className = '' }: Props) {
  const svg = (() => {
    switch (icon) {
      case 'calendar':
        return <CalendarIcon />;
      case 'dashboard':
        return <DashboardIcon />;
      case 'automation':
        return <AutomationIcon />;
      case 'document':
        return <DocumentIcon />;
      case 'shield':
        return <ShieldIcon />;
      case 'bell':
        return <BellIcon />;
    }
  })();
  return (
    <div
      className={`inline-flex items-center justify-center ${className}`}
      style={{
        filter: 'drop-shadow(0 12px 24px rgba(37, 99, 235, 0.18))',
      }}
    >
      {svg}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shared gradient defs — jeder Icon-SVG rendert die einmal          */
/* ------------------------------------------------------------------ */

function Defs({ id }: { id: string }) {
  return (
    <defs>
      <linearGradient id={`${id}-blue`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#4f7bf5" />
        <stop offset="100%" stopColor="#2563EB" />
      </linearGradient>
      <linearGradient id={`${id}-light`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#eff4ff" />
      </linearGradient>
      <linearGradient id={`${id}-edge`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#dbe4fb" />
        <stop offset="100%" stopColor="#c9d6f7" />
      </linearGradient>
    </defs>
  );
}

/* ------------------------------------------------------------------ */
/*  Individual Icons — 96x96 viewBox, isometrisch angelegt            */
/* ------------------------------------------------------------------ */

function CalendarIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="cal" />
      {/* Rueckseite / Schatten-Basis */}
      <rect
        x="16"
        y="24"
        width="64"
        height="60"
        rx="10"
        fill="url(#cal-edge)"
      />
      {/* Vorderseite Kalender */}
      <rect
        x="14"
        y="20"
        width="64"
        height="60"
        rx="10"
        fill="url(#cal-light)"
        stroke="#dbe4fb"
        strokeWidth="1"
      />
      {/* Kopfleiste blau */}
      <path
        d="M14 30 a10 10 0 0 1 10 -10 h44 a10 10 0 0 1 10 10 v6 h-64 z"
        fill="url(#cal-blue)"
      />
      {/* Ringe */}
      <rect x="26" y="12" width="6" height="16" rx="3" fill="#1e40af" />
      <rect x="60" y="12" width="6" height="16" rx="3" fill="#1e40af" />
      {/* Gitter */}
      <g stroke="#dbe4fb" strokeWidth="1">
        <line x1="14" y1="48" x2="78" y2="48" />
        <line x1="14" y1="60" x2="78" y2="60" />
        <line x1="14" y1="72" x2="78" y2="72" />
        <line x1="30" y1="36" x2="30" y2="80" />
        <line x1="46" y1="36" x2="46" y2="80" />
        <line x1="62" y1="36" x2="62" y2="80" />
      </g>
      {/* Check-Kreis */}
      <circle cx="54" cy="66" r="10" fill="url(#cal-blue)" />
      <path
        d="M49 66 L53 70 L60 62"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="dash" />
      {/* Basis-Schatten */}
      <rect x="10" y="20" width="76" height="52" rx="6" fill="url(#dash-edge)" />
      {/* Bildschirm */}
      <rect
        x="8"
        y="16"
        width="76"
        height="52"
        rx="6"
        fill="url(#dash-light)"
        stroke="#dbe4fb"
        strokeWidth="1"
      />
      {/* Bildschirm-Innenrahmen dunkel */}
      <rect
        x="12"
        y="20"
        width="68"
        height="44"
        rx="3"
        fill="#0f1a3a"
      />
      {/* Kacheln */}
      <rect x="16" y="24" width="26" height="14" rx="2" fill="url(#dash-blue)" />
      <rect x="46" y="24" width="30" height="14" rx="2" fill="#1e40af" />
      <rect x="16" y="42" width="18" height="18" rx="2" fill="#1e40af" />
      <rect x="38" y="42" width="18" height="6" rx="1" fill="#4f7bf5" />
      <rect x="38" y="52" width="18" height="8" rx="1" fill="#4f7bf5" />
      <rect x="60" y="42" width="16" height="18" rx="2" fill="url(#dash-blue)" />
      {/* Standfuss */}
      <path d="M38 68 h16 l4 8 h-24 z" fill="url(#dash-edge)" />
      <rect x="30" y="76" width="32" height="4" rx="2" fill="#c9d6f7" />
    </svg>
  );
}

function AutomationIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="auto" />
      {/* Grosses Zahnrad Schatten */}
      <circle cx="46" cy="52" r="30" fill="url(#auto-edge)" />
      {/* Grosses Zahnrad */}
      <g transform="translate(44,48)">
        <path
          d="M0 -30 L4 -28 L4 -22 L10 -20 L14 -24 L18 -20 L14 -14 L18 -10 L22 -14 L24 -8 L20 -4 L22 2 L28 4 L26 10 L20 10 L18 16 L22 20 L18 24 L12 20 L8 22 L6 28 L0 30 L-4 28 L-4 22 L-10 20 L-14 24 L-18 20 L-14 14 L-18 10 L-22 14 L-24 8 L-20 4 L-22 -2 L-28 -4 L-26 -10 L-20 -10 L-18 -16 L-22 -20 L-18 -24 L-12 -20 L-8 -22 L-6 -28 Z"
          fill="url(#auto-blue)"
        />
        <circle cx="0" cy="0" r="10" fill="url(#auto-light)" />
        <circle cx="0" cy="0" r="5" fill="url(#auto-blue)" />
      </g>
      {/* Kleines Zahnrad */}
      <g transform="translate(74,74)">
        <path
          d="M0 -12 L2 -10 L4 -10 L5 -8 L8 -8 L8 -4 L10 -3 L10 0 L8 3 L8 5 L5 8 L4 10 L0 12 L-3 10 L-4 8 L-6 8 L-8 5 L-10 3 L-10 0 L-8 -3 L-8 -6 L-5 -8 L-4 -10 L-2 -10 Z"
          fill="url(#auto-blue)"
        />
        <circle cx="0" cy="0" r="4" fill="url(#auto-light)" />
      </g>
      {/* Refresh-Pfeil */}
      <path
        d="M14 48 a4 4 0 0 1 8 0"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="doc" />
      {/* Schatten-Basis */}
      <path
        d="M18 20 h34 l16 16 v52 h-50 z"
        fill="url(#doc-edge)"
      />
      {/* Papier */}
      <path
        d="M16 14 h34 l16 16 v52 h-50 z"
        fill="url(#doc-light)"
        stroke="#dbe4fb"
        strokeWidth="1"
      />
      {/* Falz oben rechts */}
      <path
        d="M50 14 v16 h16 z"
        fill="#dbe4fb"
      />
      {/* Textlinien */}
      <g stroke="#c9d6f7" strokeWidth="2" strokeLinecap="round">
        <line x1="24" y1="38" x2="46" y2="38" />
        <line x1="24" y1="46" x2="56" y2="46" />
        <line x1="24" y1="54" x2="50" y2="54" />
      </g>
      {/* Unterschrifts-Kurve blau */}
      <path
        d="M22 68 C 28 60, 34 76, 42 68 C 48 62, 54 74, 62 66"
        stroke="url(#doc-blue)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Stift */}
      <g transform="translate(56,60) rotate(30)">
        <rect x="0" y="0" width="4" height="20" rx="1" fill="url(#doc-blue)" />
        <path d="M0 20 L2 24 L4 20 z" fill="#1e40af" />
        <rect x="0" y="0" width="4" height="4" fill="#1e40af" />
      </g>
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="shield" />
      {/* Schatten */}
      <path
        d="M50 14 L74 22 v22 C74 60, 62 74, 50 82 C38 74, 26 60, 26 44 V22 z"
        fill="url(#shield-edge)"
      />
      {/* Schild-Vorderseite */}
      <path
        d="M48 10 L72 18 v22 C72 56, 60 70, 48 78 C36 70, 24 56, 24 40 V18 z"
        fill="url(#shield-light)"
        stroke="#dbe4fb"
        strokeWidth="1"
      />
      {/* Blaues Zentrum */}
      <path
        d="M48 18 L64 24 v16 C64 50, 56 60, 48 66 C40 60, 32 50, 32 40 V24 z"
        fill="url(#shield-blue)"
      />
      {/* Schloss */}
      <path
        d="M42 40 v-4 a6 6 0 0 1 12 0 v4"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <rect x="40" y="40" width="16" height="14" rx="2" fill="#ffffff" />
      <circle cx="48" cy="46" r="2" fill="url(#shield-blue)" />
      <rect x="47" y="46" width="2" height="4" rx="1" fill="url(#shield-blue)" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="bell" />
      {/* Schatten-Basis */}
      <path
        d="M50 22 c-13 0-22 9-22 22 v10 l-4 8 h52 l-4 -8 v-10 c0-13-9-22-22-22 z"
        fill="url(#bell-edge)"
      />
      {/* Glocke */}
      <path
        d="M48 16 c-13 0-22 9-22 22 v10 l-4 8 h52 l-4 -8 v-10 c0-13-9-22-22-22 z"
        fill="url(#bell-light)"
        stroke="#dbe4fb"
        strokeWidth="1"
      />
      {/* Blaue Innenkuppel */}
      <path
        d="M34 42 c0-8 6-14 14-14 c8 0 14 6 14 14 v10 h-28 z"
        fill="url(#bell-blue)"
      />
      {/* Klapper */}
      <circle cx="48" cy="66" r="6" fill="url(#bell-blue)" />
      {/* Kopf-Knopf */}
      <circle cx="48" cy="14" r="4" fill="url(#bell-blue)" />
      {/* Notification-Punkt */}
      <circle cx="70" cy="22" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
      <text
        x="70"
        y="26"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="10"
        fontWeight="700"
        fontFamily="sans-serif"
      >
        !
      </text>
    </svg>
  );
}
