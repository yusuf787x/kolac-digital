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
  | 'bell'
  | 'configurator'
  | 'inbox'
  | 'cart'
  | 'panel'
  | 'search'
  | 'star'
  | 'chart';

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
      case 'configurator':
        return <ConfiguratorIcon />;
      case 'inbox':
        return <InboxIcon />;
      case 'cart':
        return <CartIcon />;
      case 'panel':
        return <PanelIcon />;
      case 'search':
        return <SearchIcon />;
      case 'star':
        return <StarPlayIcon />;
      case 'chart':
        return <ChartIcon />;
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

function ConfiguratorIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="cfg" />
      {/* Auto-Silhouette Schatten */}
      <path
        d="M14 60 c0-8 6-12 14-14 l4-8 c2-4 6-6 12-6 h12 c6 0 10 2 12 6 l4 8 c8 2 14 6 14 14 v10 h-72 z"
        fill="url(#cfg-edge)"
      />
      {/* Auto-Karosserie */}
      <path
        d="M12 54 c0-8 6-12 14-14 l4-8 c2-4 6-6 12-6 h12 c6 0 10 2 12 6 l4 8 c8 2 14 6 14 14 v10 h-72 z"
        fill="url(#cfg-light)"
        stroke="#dbe4fb"
        strokeWidth="1"
      />
      {/* Fenster blau */}
      <path
        d="M28 40 l6-10 c1-2 3-3 5-3 h18 c2 0 4 1 5 3 l6 10 z"
        fill="url(#cfg-blue)"
      />
      {/* Raeder */}
      <circle cx="26" cy="66" r="7" fill="#0f1a3a" />
      <circle cx="26" cy="66" r="3" fill="#4f7bf5" />
      <circle cx="70" cy="66" r="7" fill="#0f1a3a" />
      <circle cx="70" cy="66" r="3" fill="#4f7bf5" />
      {/* Schallwellen aus dem Auto rechts oben */}
      <g stroke="url(#cfg-blue)" strokeWidth="2.5" strokeLinecap="round" fill="none">
        <path d="M74 20 c4 4 4 8 0 12" />
        <path d="M80 14 c8 8 8 16 0 24" opacity="0.7" />
        <path d="M86 8 c12 12 12 24 0 36" opacity="0.4" />
      </g>
    </svg>
  );
}

function InboxIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="inbox" />
      {/* Schatten-Basis */}
      <rect x="14" y="24" width="68" height="60" rx="6" fill="url(#inbox-edge)" />
      {/* Body */}
      <rect
        x="12"
        y="20"
        width="68"
        height="60"
        rx="6"
        fill="url(#inbox-light)"
        stroke="#dbe4fb"
        strokeWidth="1"
      />
      {/* Ausgefuelltes Formular-Papier */}
      <rect x="22" y="12" width="48" height="46" rx="3" fill="#ffffff" stroke="#dbe4fb" />
      {/* Formular-Zeilen */}
      <line x1="28" y1="22" x2="52" y2="22" stroke="#c9d6f7" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="30" x2="60" y2="30" stroke="#c9d6f7" strokeWidth="2" strokeLinecap="round" />
      <line x1="28" y1="38" x2="56" y2="38" stroke="#c9d6f7" strokeWidth="2" strokeLinecap="round" />
      {/* Grosses Haekchen unten */}
      <circle cx="46" cy="66" r="12" fill="url(#inbox-blue)" />
      <path
        d="M40 66 L45 71 L54 62"
        stroke="#ffffff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="cart" />
      {/* Schatten Warenkorb */}
      <path
        d="M16 26 h8 l8 40 h44 l6 -28 h-46"
        stroke="url(#cart-edge)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Vorderes Warenkorb-Gestell */}
      <path
        d="M14 24 h8 l8 40 h44 l6 -28 h-46"
        stroke="url(#cart-blue)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Ware im Korb */}
      <rect x="32" y="38" width="10" height="14" rx="1.5" fill="url(#cart-blue)" />
      <rect x="46" y="34" width="10" height="18" rx="1.5" fill="#4f7bf5" />
      <rect x="60" y="40" width="10" height="12" rx="1.5" fill="url(#cart-blue)" />
      {/* Raeder */}
      <circle cx="38" cy="76" r="6" fill="#0f1a3a" />
      <circle cx="38" cy="76" r="2" fill="#4f7bf5" />
      <circle cx="70" cy="76" r="6" fill="#0f1a3a" />
      <circle cx="70" cy="76" r="2" fill="#4f7bf5" />
      {/* Plus-Kreis oben rechts */}
      <circle cx="76" cy="22" r="9" fill="url(#cart-blue)" />
      <line x1="76" y1="17" x2="76" y2="27" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="71" y1="22" x2="81" y2="22" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function PanelIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="panel" />
      {/* Schatten */}
      <rect x="14" y="22" width="70" height="60" rx="8" fill="url(#panel-edge)" />
      {/* Steuerpult */}
      <rect
        x="12"
        y="18"
        width="70"
        height="60"
        rx="8"
        fill="url(#panel-light)"
        stroke="#dbe4fb"
        strokeWidth="1"
      />
      {/* Schieberegler-Bahnen */}
      <line x1="22" y1="32" x2="72" y2="32" stroke="#dbe4fb" strokeWidth="3" strokeLinecap="round" />
      <line x1="22" y1="48" x2="72" y2="48" stroke="#dbe4fb" strokeWidth="3" strokeLinecap="round" />
      <line x1="22" y1="64" x2="72" y2="64" stroke="#dbe4fb" strokeWidth="3" strokeLinecap="round" />
      {/* Aktive Bahn-Fuellungen */}
      <line x1="22" y1="32" x2="54" y2="32" stroke="url(#panel-blue)" strokeWidth="3" strokeLinecap="round" />
      <line x1="22" y1="48" x2="38" y2="48" stroke="url(#panel-blue)" strokeWidth="3" strokeLinecap="round" />
      <line x1="22" y1="64" x2="62" y2="64" stroke="url(#panel-blue)" strokeWidth="3" strokeLinecap="round" />
      {/* Regler-Knoepfe */}
      <circle cx="54" cy="32" r="6" fill="url(#panel-blue)" stroke="#ffffff" strokeWidth="2" />
      <circle cx="38" cy="48" r="6" fill="url(#panel-blue)" stroke="#ffffff" strokeWidth="2" />
      <circle cx="62" cy="64" r="6" fill="url(#panel-blue)" stroke="#ffffff" strokeWidth="2" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="search" />
      {/* Schatten der Lupe */}
      <circle cx="44" cy="46" r="24" fill="url(#search-edge)" />
      <rect
        x="62"
        y="62"
        width="20"
        height="8"
        rx="4"
        transform="rotate(45 62 62)"
        fill="url(#search-edge)"
      />
      {/* Lupe */}
      <circle
        cx="42"
        cy="44"
        r="24"
        fill="url(#search-light)"
        stroke="url(#search-blue)"
        strokeWidth="4"
      />
      {/* Griff */}
      <rect
        x="60"
        y="60"
        width="20"
        height="8"
        rx="4"
        transform="rotate(45 60 60)"
        fill="url(#search-blue)"
      />
      {/* Standort-Pin in der Lupe */}
      <path
        d="M42 32 c-4 0-7 3-7 7 c0 5 7 12 7 12 s7-7 7-12 c0-4-3-7-7-7 z"
        fill="url(#search-blue)"
      />
      <circle cx="42" cy="39" r="2.5" fill="#ffffff" />
    </svg>
  );
}

function StarPlayIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="star" />
      {/* Schatten */}
      <path
        d="M48 20 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 z"
        fill="url(#star-edge)"
        transform="translate(0,4)"
      />
      {/* Stern */}
      <path
        d="M48 16 l7 15 16 2 -12 11 3 16 -14 -8 -14 8 3 -16 -12 -11 16 -2 z"
        fill="url(#star-blue)"
        stroke="#1e40af"
        strokeWidth="1"
      />
      {/* Play-Dreieck im Zentrum */}
      <circle cx="48" cy="46" r="10" fill="#ffffff" />
      <path d="M45 41 L54 46 L45 51 z" fill="url(#star-blue)" />
      {/* Kleines Stern-Sparkle rechts oben */}
      <path
        d="M76 26 l1 4 4 1 -4 1 -1 4 -1 -4 -4 -1 4 -1 z"
        fill="#4f7bf5"
      />
      {/* Kleines Stern-Sparkle links unten */}
      <path
        d="M20 70 l1 4 4 1 -4 1 -1 4 -1 -4 -4 -1 4 -1 z"
        fill="#4f7bf5"
        opacity="0.7"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="96" height="96" viewBox="0 0 96 96" fill="none">
      <Defs id="chart" />
      {/* Schatten-Basis */}
      <rect x="14" y="24" width="70" height="60" rx="8" fill="url(#chart-edge)" />
      {/* Karten-Body */}
      <rect
        x="12"
        y="20"
        width="70"
        height="60"
        rx="8"
        fill="url(#chart-light)"
        stroke="#dbe4fb"
        strokeWidth="1"
      />
      {/* Achsen */}
      <line x1="22" y1="30" x2="22" y2="68" stroke="#c9d6f7" strokeWidth="2" strokeLinecap="round" />
      <line x1="22" y1="68" x2="72" y2="68" stroke="#c9d6f7" strokeWidth="2" strokeLinecap="round" />
      {/* Balken (steigend, was ein Wachstum suggeriert) */}
      <rect x="28" y="54" width="8" height="14" rx="1.5" fill="#4f7bf5" />
      <rect x="40" y="46" width="8" height="22" rx="1.5" fill="url(#chart-blue)" />
      <rect x="52" y="38" width="8" height="30" rx="1.5" fill="#4f7bf5" />
      <rect x="64" y="30" width="8" height="38" rx="1.5" fill="url(#chart-blue)" />
      {/* Trend-Pfeil oben rechts */}
      <path
        d="M28 42 L40 34 L52 26 L64 18"
        stroke="#1e40af"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        opacity="0.6"
      />
      <path d="M60 18 L64 18 L64 22" stroke="#1e40af" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity="0.6" />
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
