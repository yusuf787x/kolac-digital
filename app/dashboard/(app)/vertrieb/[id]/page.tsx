'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Timestamp } from 'firebase/firestore';
import {
  createActivity,
  deleteActivity,
  deleteDeal,
  getCustomer,
  getDeal,
  listActivitiesByDeal,
  listCustomers,
  listEmailTemplates,
  updateActivity,
  updateDeal,
} from '@/lib/firestore';
import type {
  Activity,
  Customer,
  Deal,
  DealStage,
  EmailTemplate,
} from '@/lib/types';
import {
  PIPELINE_STAGES,
  activityDef,
  sourceLabel,
  stageDef,
  stageLabel,
} from '@/lib/sales';
import {
  formatEUR,
  formatDateDE,
  formatTsDE,
  daysOverdue,
  tsToMillis,
} from '@/lib/utils';
import DealFormModal from '@/components/vertrieb/DealFormModal';
import ActivityModal from '@/components/vertrieb/ActivityModal';
import EmailComposerModal from '@/components/vertrieb/EmailComposerModal';

function formatDateTimeDE(d: Date): string {
  return d.toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DealDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [deal, setDeal] = useState<Deal | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityPreset, setActivityPreset] = useState<Activity['type']>();
  const [emailOpen, setEmailOpen] = useState(false);

  const load = useCallback(() => {
    Promise.all([getDeal(id), listActivitiesByDeal(id), listEmailTemplates()])
      .then(async ([d, acts, tpls]) => {
        setDeal(d);
        setActivities(acts);
        setTemplates(tpls);
        if (d) {
          const [c, all] = await Promise.all([
            getCustomer(d.customerId),
            listCustomers(),
          ]);
          setCustomer(c);
          setCustomers(all);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(`Deal konnte nicht geladen werden: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleStageChange = async (newStage: DealStage) => {
    if (!deal || deal.stage === newStage) return;
    const oldStage = deal.stage;
    try {
      await updateDeal(deal.id, { stage: newStage });
      await createActivity({
        dealId: deal.id,
        type: 'notiz',
        description: `Stufe geändert: ${stageLabel(oldStage)} → ${stageLabel(newStage)}`,
        emailSubject: null,
        emailBody: null,
        dueDate: null,
        completed: true,
        completedAt: Timestamp.now(),
      });
      load();
      if (newStage === 'abgeschlossen') {
        if (
          window.confirm(
            'Deal abgeschlossen! 🎉 Möchtest du direkt eine Rechnung erstellen?',
          )
        ) {
          router.push(
            `/dashboard/rechnungen/neu?customerId=${deal.customerId}`,
          );
        }
      }
    } catch (err) {
      console.error(err);
      alert('Stufe konnte nicht geändert werden.');
    }
  };

  const markLost = async () => {
    if (!deal) return;
    const reason = window.prompt(
      'Grund für den verlorenen Deal (optional):',
      deal.lostReason ?? '',
    );
    if (reason === null) return; // Abbruch
    try {
      await updateDeal(deal.id, { stage: 'verloren', lostReason: reason });
      await createActivity({
        dealId: deal.id,
        type: 'notiz',
        description: reason
          ? `Deal als verloren markiert: ${reason}`
          : 'Deal als verloren markiert',
        emailSubject: null,
        emailBody: null,
        dueDate: null,
        completed: true,
        completedAt: Timestamp.now(),
      });
      load();
    } catch (err) {
      console.error(err);
      alert('Konnte nicht aktualisiert werden.');
    }
  };

  const completeActivity = async (a: Activity) => {
    try {
      await updateActivity(a.id, {
        completed: true,
        completedAt: Timestamp.now(),
      });
      load();
    } catch (err) {
      console.error(err);
      alert('Konnte nicht aktualisiert werden.');
    }
  };

  const handleDeleteActivity = async (a: Activity) => {
    if (!window.confirm('Diese Aktivität löschen?')) return;
    try {
      await deleteActivity(a.id);
      load();
    } catch (err) {
      console.error(err);
      alert('Löschen fehlgeschlagen.');
    }
  };

  const handleDeleteDeal = async () => {
    if (!deal) return;
    if (
      !window.confirm(
        'Diesen Deal inkl. aller Aktivitäten löschen? Das kann nicht rückgängig gemacht werden.',
      )
    )
      return;
    try {
      await deleteDeal(deal.id);
      router.push('/dashboard/vertrieb');
    } catch (err) {
      console.error(err);
      alert('Löschen fehlgeschlagen.');
    }
  };

  const openQuickActivity = (type: Activity['type']) => {
    setActivityPreset(type);
    setActivityOpen(true);
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }
  if (error || !deal) {
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        {error ?? 'Deal nicht gefunden.'}
      </div>
    );
  }

  // Nächste fällige/geplante (offene) Aktivität
  const nextActivity = activities
    .filter((a) => !a.completed && a.dueDate)
    .sort((a, b) => a.dueDate!.toMillis() - b.dueDate!.toMillis())[0];

  const sd = stageDef(deal.stage);

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/vertrieb"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zum Board
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              {customer?.company ||
                `${customer?.firstName ?? ''} ${customer?.lastName ?? ''}`.trim() ||
                'Deal'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">{deal.title}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditOpen(true)} className="btn-secondary">
              Bearbeiten
            </button>
            <button
              onClick={handleDeleteDeal}
              className="btn-secondary text-red-600 hover:bg-red-50"
            >
              Löschen
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LINKE SPALTE */}
        <div className="lg:col-span-2 space-y-6">
          {/* E-Mail / Aktivität Aktionen */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActivityOpen(true)}
              className="btn-primary"
            >
              + Aktivität hinzufügen
            </button>
            <button
              onClick={() => setEmailOpen(true)}
              className="btn-secondary"
            >
              ✉️ E-Mail senden
            </button>
          </div>

          {/* Timeline */}
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Aktivitäten
            </h2>
            {activities.length === 0 ? (
              <p className="text-sm text-gray-500">
                Noch keine Aktivitäten. Logge einen Anruf oder sende eine
                E-Mail.
              </p>
            ) : (
              <ol className="relative border-l border-gray-200 ml-3 space-y-5">
                {activities.map((a) => (
                  <TimelineItem
                    key={a.id}
                    activity={a}
                    onComplete={() => completeActivity(a)}
                    onDelete={() => handleDeleteActivity(a)}
                  />
                ))}
              </ol>
            )}
          </section>
        </div>

        {/* RECHTE SPALTE */}
        <div className="space-y-6">
          {/* Deal-Info */}
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Deal
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-500">
                  Pipeline-Stufe
                </p>
                <select
                  className="input mt-1"
                  value={deal.stage}
                  onChange={(e) =>
                    handleStageChange(e.target.value as DealStage)
                  }
                >
                  {PIPELINE_STAGES.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                  {deal.stage === 'verloren' && (
                    <option value="verloren">Verloren</option>
                  )}
                </select>
              </div>
              <InfoRow label="Titel" value={deal.title} />
              <InfoRow
                label="Dealwert"
                value={deal.value != null ? formatEUR(deal.value) : '—'}
              />
              <InfoRow
                label="Erwartetes Abschlussdatum"
                value={formatTsDE(deal.expectedCloseDate)}
              />
              <InfoRow label="Quelle" value={sourceLabel(deal.source)} />
              <InfoRow
                label="Erstellt am"
                value={formatTsDE(deal.createdAt)}
              />
              {deal.stage === 'verloren' && deal.lostReason && (
                <InfoRow label="Verlust-Grund" value={deal.lostReason} />
              )}
              {deal.notes && <InfoRow label="Notizen" value={deal.notes} />}
            </div>
          </section>

          {/* Kontaktinfo */}
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Kontakt
            </h2>
            {customer ? (
              <div className="space-y-3 text-sm">
                <InfoRow label="Firma" value={customer.company || '—'} />
                <InfoRow
                  label="Ansprechpartner"
                  value={
                    `${customer.salutation} ${customer.firstName} ${customer.lastName}`.trim() ||
                    '—'
                  }
                />
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    Telefon
                  </p>
                  {customer.phone ? (
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-brand-blue hover:underline"
                    >
                      {customer.phone}
                    </a>
                  ) : (
                    <p className="text-gray-900">—</p>
                  )}
                </div>
                <div>
                  <p className="text-xs uppercase tracking-wider text-gray-500">
                    E-Mail
                  </p>
                  {customer.email ? (
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-brand-blue hover:underline break-all"
                    >
                      {customer.email}
                    </a>
                  ) : (
                    <p className="text-gray-900">—</p>
                  )}
                </div>
                <InfoRow
                  label="Adresse"
                  value={
                    customer.street || customer.zip || customer.city
                      ? `${customer.street}\n${customer.zip} ${customer.city}`.trim()
                      : '—'
                  }
                />
                <Link
                  href={`/dashboard/kunden/${customer.id}`}
                  className="inline-block text-sm text-brand-blue hover:underline font-medium pt-1"
                >
                  Kundenprofil öffnen →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Kunde nicht gefunden.</p>
            )}
          </section>

          {/* Nächste Aktivität */}
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Nächste Aktivität
            </h2>
            {nextActivity ? (
              <NextActivity
                activity={nextActivity}
                onComplete={() => completeActivity(nextActivity)}
              />
            ) : (
              <p className="text-sm text-gray-500">
                Keine geplante Aktivität. Plane ein Follow-up.
              </p>
            )}
          </section>

          {/* Schnellaktionen */}
          <section className="card">
            <h2 className="text-base font-semibold text-gray-900 mb-3">
              Schnellaktionen
            </h2>
            <div className="space-y-2">
              <button
                onClick={() => openQuickActivity('anruf')}
                className="btn-secondary w-full justify-start"
              >
                📞 Anruf loggen
              </button>
              <button
                onClick={() => setEmailOpen(true)}
                className="btn-secondary w-full justify-start"
              >
                ✉️ E-Mail senden
              </button>
              <Link
                href={`/dashboard/angebote/neu?customerId=${deal.customerId}`}
                className="btn-secondary w-full justify-start"
              >
                📄 Angebot erstellen
              </Link>
              {deal.stage !== 'verloren' && (
                <button
                  onClick={markLost}
                  className="btn-secondary w-full justify-start text-red-600 hover:bg-red-50"
                >
                  ❌ Als verloren markieren
                </button>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Modals */}
      <DealFormModal
        key={tsToMillis(deal.updatedAt, tsToMillis(deal.createdAt, deal.id.length))}
        open={editOpen}
        onClose={() => setEditOpen(false)}
        mode="edit"
        customers={customers}
        deal={deal}
        onSaved={() => load()}
      />
      <ActivityModal
        open={activityOpen}
        onClose={() => {
          setActivityOpen(false);
          setActivityPreset(undefined);
        }}
        dealId={deal.id}
        presetType={activityPreset}
        onSaved={() => load()}
      />
      <EmailComposerModal
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        deal={deal}
        customer={customer}
        templates={templates}
        onSent={() => load()}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-gray-500">{label}</p>
      <p className="mt-0.5 text-gray-900 whitespace-pre-line break-words">
        {value}
      </p>
    </div>
  );
}

function TimelineItem({
  activity,
  onComplete,
  onDelete,
}: {
  activity: Activity;
  onComplete: () => void;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const def = activityDef(activity.type);
  const when = (activity.dueDate ?? activity.createdAt)?.toDate?.();
  const overdue =
    !activity.completed &&
    activity.dueDate &&
    activity.dueDate.toMillis() < Date.now();

  return (
    <li className="ml-6">
      <span className="absolute -left-3 flex h-6 w-6 items-center justify-center rounded-full bg-white ring-4 ring-white text-base">
        {def.icon}
      </span>
      <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900">{def.label}</p>
            <p className="text-sm text-gray-700 whitespace-pre-line break-words">
              {activity.description}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            {!activity.completed && (
              <button
                onClick={onComplete}
                className="text-xs text-brand-blue hover:underline"
              >
                ✓ erledigt
              </button>
            )}
            <button
              onClick={onDelete}
              className="text-xs text-gray-400 hover:text-red-600"
              title="Löschen"
            >
              ×
            </button>
          </div>
        </div>

        {activity.type === 'email' && activity.emailSubject && (
          <div className="mt-2 text-xs">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="text-gray-600 hover:underline"
            >
              Betreff: <span className="font-medium">{activity.emailSubject}</span>{' '}
              {expanded ? '▲' : '▼'}
            </button>
            {expanded && activity.emailBody && (
              <pre className="mt-2 whitespace-pre-wrap rounded bg-white border border-gray-200 p-2 font-sans text-gray-700">
                {activity.emailBody}
              </pre>
            )}
          </div>
        )}

        <p className="mt-1 text-[11px] text-gray-400">
          {when ? formatDateTimeDE(when) : ''}
          {activity.dueDate && !activity.completed && (
            <span className={overdue ? 'text-red-600 font-medium' : ''}>
              {' '}
              · fällig
            </span>
          )}
          {activity.completed && ' · erledigt'}
        </p>
      </div>
    </li>
  );
}

function NextActivity({
  activity,
  onComplete,
}: {
  activity: Activity;
  onComplete: () => void;
}) {
  const def = activityDef(activity.type);
  const due = activity.dueDate!.toDate();
  const overdue = activity.dueDate!.toMillis() < Date.now();
  const days = daysOverdue(due);

  return (
    <div
      className={`rounded-lg border px-3 py-3 ${
        overdue ? 'border-red-200 bg-red-50' : 'border-gray-200 bg-gray-50'
      }`}
    >
      <p className="text-sm font-medium text-gray-900">
        {def.icon} {def.label}
      </p>
      <p className="text-sm text-gray-700 whitespace-pre-line">
        {activity.description}
      </p>
      <p
        className={`mt-1 text-xs ${overdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}
      >
        {overdue
          ? `Überfällig seit ${days} ${days === 1 ? 'Tag' : 'Tagen'}`
          : `Fällig: ${formatDateTimeDE(due)}`}
      </p>
      <button
        onClick={onComplete}
        className="btn-secondary mt-3 w-full justify-center text-sm"
      >
        Als erledigt markieren
      </button>
    </div>
  );
}
