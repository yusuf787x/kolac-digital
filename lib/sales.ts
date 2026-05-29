import type {
  ActivityType,
  Customer,
  Deal,
  DealSource,
  DealStage,
} from './types';
import { formatEUR } from './utils';

// ===================================================================
// PIPELINE-STUFEN
// ===================================================================

export interface StageDef {
  key: DealStage;
  label: string;
  /** Header-/Akzentfarbe (Hex) – als Inline-Style genutzt, damit Tailwind
   *  sie beim Purgen nicht entfernt. */
  color: string;
}

/** Die fünf aktiven Pipeline-Stufen (ohne "Verloren"). */
export const PIPELINE_STAGES: StageDef[] = [
  { key: 'kontaktiert', label: 'Kontaktiert', color: '#3B82F6' },
  { key: 'erstgespraech', label: 'Erstgespräch', color: '#F97316' },
  { key: 'angebot_verschickt', label: 'Angebot verschickt', color: '#EAB308' },
  { key: 'vertrag_erhalten', label: 'Vertrag erhalten', color: '#8B5CF6' },
  { key: 'abgeschlossen', label: 'Abgeschlossen', color: '#22C55E' },
];

export const LOST_STAGE: StageDef = {
  key: 'verloren',
  label: 'Verloren',
  color: '#EF4444',
};

/** Alle Stufen inkl. "Verloren" – für das Board (6 Spalten). */
export const ALL_STAGES: StageDef[] = [...PIPELINE_STAGES, LOST_STAGE];

const STAGE_BY_KEY: Record<DealStage, StageDef> = ALL_STAGES.reduce(
  (acc, s) => {
    acc[s.key] = s;
    return acc;
  },
  {} as Record<DealStage, StageDef>,
);

export function stageDef(stage: DealStage): StageDef {
  return STAGE_BY_KEY[stage] ?? LOST_STAGE;
}

export function stageLabel(stage: DealStage): string {
  return stageDef(stage).label;
}

/** Eine Stufe gilt als "offen", wenn sie weder abgeschlossen noch verloren ist. */
export function isOpenStage(stage: DealStage): boolean {
  return stage !== 'abgeschlossen' && stage !== 'verloren';
}

// ===================================================================
// QUELLEN
// ===================================================================

export const DEAL_SOURCES: { key: DealSource; label: string }[] = [
  { key: 'empfehlung', label: 'Empfehlung' },
  { key: 'google', label: 'Google' },
  { key: 'social_media', label: 'Social Media' },
  { key: 'kaltakquise', label: 'Kaltakquise' },
  { key: 'sonstiges', label: 'Sonstiges' },
];

const SOURCE_LABELS: Record<DealSource, string> = DEAL_SOURCES.reduce(
  (acc, s) => {
    acc[s.key] = s.label;
    return acc;
  },
  {} as Record<DealSource, string>,
);

export function sourceLabel(source: DealSource): string {
  return SOURCE_LABELS[source] ?? 'Sonstiges';
}

// ===================================================================
// AKTIVITÄTSTYPEN
// ===================================================================

export interface ActivityTypeDef {
  key: ActivityType;
  label: string;
  icon: string;
}

/** Auswahl im "Aktivität hinzufügen"-Dialog. */
export const ACTIVITY_TYPES: ActivityTypeDef[] = [
  { key: 'anruf', label: 'Anruf', icon: '📞' },
  { key: 'email', label: 'E-Mail', icon: '✉️' },
  { key: 'notiz', label: 'Notiz', icon: '📝' },
  { key: 'meeting', label: 'Meeting', icon: '🤝' },
  { key: 'angebot', label: 'Angebot verschickt', icon: '📄' },
  { key: 'vertrag', label: 'Vertrag verschickt', icon: '📋' },
  { key: 'sonstiges', label: 'Sonstiges', icon: '🔔' },
];

const ACTIVITY_BY_KEY: Record<ActivityType, ActivityTypeDef> =
  ACTIVITY_TYPES.reduce(
    (acc, t) => {
      acc[t.key] = t;
      return acc;
    },
    {} as Record<ActivityType, ActivityTypeDef>,
  );

export function activityDef(type: ActivityType): ActivityTypeDef {
  return ACTIVITY_BY_KEY[type] ?? ACTIVITY_BY_KEY.sonstiges;
}

// ===================================================================
// PLATZHALTER-ERSETZUNG
// ===================================================================

/**
 * Ersetzt Platzhalter wie {{firma}} in Vorlagen-Text durch die konkreten
 * Werte aus Kunde + Deal.
 */
export function replacePlaceholders(
  text: string,
  ctx: { customer?: Customer | null; deal?: Deal | null },
): string {
  const c = ctx.customer;
  const d = ctx.deal;
  const map: Record<string, string> = {
    vorname: c?.firstName ?? '',
    nachname: c?.lastName ?? '',
    firma: c?.company ?? '',
    anrede: c?.salutation ?? '',
    deal_titel: d?.title ?? '',
    deal_wert: d?.value != null ? formatEUR(d.value) : '',
  };
  return text.replace(/\{\{\s*(\w+)\s*\}\}/g, (full, key: string) =>
    key in map ? map[key] : full,
  );
}

/** Liste aller verfügbaren Platzhalter – für die Vorlagen-Hilfe. */
export const TEMPLATE_PLACEHOLDERS: { token: string; description: string }[] = [
  { token: '{{vorname}}', description: 'Vorname des Kunden' },
  { token: '{{nachname}}', description: 'Nachname des Kunden' },
  { token: '{{firma}}', description: 'Firmenname' },
  { token: '{{anrede}}', description: '"Herr" / "Frau"' },
  { token: '{{deal_titel}}', description: 'Titel des Deals' },
  { token: '{{deal_wert}}', description: 'Dealwert in EUR' },
];

// ===================================================================
// SEED-VORLAGEN (beim ersten Setup anlegen)
// ===================================================================

// Hinweis: Die Signatur (Kontaktdaten + Firmen-Footer) wird automatisch von
// buildDealEmail() unter jede ausgehende Mail gehängt – deshalb enden diese
// Vorlagen-Bodies nur bei der Grußformel.
export const SEED_TEMPLATES: { name: string; subject: string; body: string }[] =
  [
    {
      name: 'Erstansprache',
      subject: 'Digitaler Auftritt für {{firma}} – Kolac Digital',
      body: `Sehr geehrter {{anrede}} {{nachname}},

mein Name ist Yusuf Kolac von Kolac Digital. Ich bin auf {{firma}} aufmerksam geworden und sehe großes Potenzial, Ihre digitale Sichtbarkeit zu stärken.

Wir unterstützen kleine und mittelständische Unternehmen mit professionellen Webseiten, Google Ads und Social Media Content – alles aus einer Hand.

Hätten Sie in den nächsten Tagen Zeit für ein kurzes, unverbindliches Gespräch?

Herzliche Grüße
Yusuf Kolac`,
    },
    {
      name: 'Follow-up Erstgespräch',
      subject: 'Schön, dass wir gesprochen haben – {{firma}}',
      body: `Sehr geehrter {{anrede}} {{nachname}},

vielen Dank für das angenehme Gespräch. Wie besprochen sende ich Ihnen in den nächsten Tagen ein konkretes Angebot zu.

Bei Fragen stehe ich Ihnen jederzeit zur Verfügung.

Herzliche Grüße
Yusuf Kolac`,
    },
    {
      name: 'Angebot Nachfass',
      subject: 'Rückmeldung zum Angebot – {{firma}}',
      body: `Sehr geehrter {{anrede}} {{nachname}},

ich wollte kurz nachfragen, ob Sie bereits Gelegenheit hatten, sich unser Angebot anzuschauen. Gerne bespreche ich offene Fragen mit Ihnen.

Herzliche Grüße
Yusuf Kolac`,
    },
  ];
