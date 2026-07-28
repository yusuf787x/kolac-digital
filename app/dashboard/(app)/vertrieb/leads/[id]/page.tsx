'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import {
  getLead,
  updateLead,
  deleteLead,
  listActivitiesByLead,
  createActivity,
  updateActivity,
  deleteActivity,
  createCustomer,
} from '@/lib/firestore';
import type { Activity, ActivityType, Lead, LeadStatus } from '@/lib/types';
import { LEAD_STATUS_LABELS, LEAD_CATEGORIES } from '@/lib/types';

const ACTIVITY_ICONS: Record<ActivityType, string> = {
  anruf: '📞',
  email: '✉️',
  notiz: '📝',
  meeting: '🤝',
  angebot: '📄',
  vertrag: '📜',
  sonstiges: '•',
};

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [lead, setLead] = useState<Lead | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const [l, acts] = await Promise.all([
      getLead(id),
      listActivitiesByLead(id),
    ]);
    setLead(l);
    setActivities(acts);
  }, [id]);

  useEffect(() => {
    load()
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [load]);

  if (loading) return <div className="card text-sm text-gray-500">Lädt…</div>;
  if (!lead)
    return (
      <div className="card text-sm text-red-700 bg-red-50 border-red-200">
        Lead nicht gefunden.
      </div>
    );

  const patch = async (data: Partial<Lead>) => {
    setSaving(true);
    try {
      await updateLead(lead.id, data);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Lead "${lead.company}" wirklich löschen?`)) return;
    await deleteLead(lead.id);
    router.push('/dashboard/vertrieb/leads');
  };

  /**
   * Lead in Customer konvertieren — legt einen neuen Customer aus den
   * Lead-Daten an und speichert die convertedCustomerId auf dem Lead.
   * Danach kann im CRM ein Deal am neuen Customer angelegt werden.
   */
  const handleConvertToCustomer = async () => {
    if (!confirm('Diesen Lead als Kunden anlegen?')) return;
    const customerId = await createCustomer({
      company: lead.company,
      salutation: 'Divers',
      firstName: lead.contactName?.split(' ')[0] ?? '',
      lastName: lead.contactName?.split(' ').slice(1).join(' ') ?? '',
      street: lead.street ?? '',
      zip: lead.zip ?? '',
      city: lead.city ?? '',
      email: lead.email ?? '',
      phone: lead.phone ?? '',
      notes: [`Aus Lead uebernommen. Quelle: ${lead.source ?? '—'}`, lead.notes]
        .filter(Boolean)
        .join('\n\n'),
    });
    await updateLead(lead.id, {
      status: 'gewonnen',
      convertedCustomerId: customerId,
    });
    router.push(`/dashboard/kunden/${customerId}`);
  };

  return (
    <div>
      <header className="mb-6">
        <Link
          href="/dashboard/vertrieb/leads"
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zu Leads
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">
              {lead.company}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {lead.contactName ?? '—'}
              {lead.city && ` · ${lead.city}`}
              {lead.category && ` · ${lead.category}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {lead.status !== 'gewonnen' && (
              <button
                onClick={handleConvertToCustomer}
                className="btn-primary"
                disabled={saving}
              >
                → Als Kunde übernehmen
              </button>
            )}
            <button
              onClick={handleDelete}
              className="btn-secondary text-red-600 hover:bg-red-50"
            >
              Löschen
            </button>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <section className="card space-y-4 lg:col-span-1">
          <div>
            <label className="label">Status</label>
            <select
              className="input"
              value={lead.status}
              onChange={(e) =>
                patch({ status: e.target.value as LeadStatus })
              }
              disabled={saving}
            >
              {Object.entries(LEAD_STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Nächster Rückruf</label>
            <input
              type="datetime-local"
              className="input"
              value={
                lead.nextCallAt
                  ? new Date(
                      lead.nextCallAt.toMillis() -
                        new Date().getTimezoneOffset() * 60000,
                    )
                      .toISOString()
                      .slice(0, 16)
                  : ''
              }
              onChange={(e) => {
                const v = e.target.value;
                patch({
                  nextCallAt: v ? Timestamp.fromDate(new Date(v)) : null,
                });
              }}
              disabled={saving}
            />
            {lead.nextCallAt && (
              <button
                type="button"
                onClick={() => patch({ nextCallAt: null })}
                className="mt-1 text-xs text-gray-500 hover:underline"
              >
                Rückruf löschen
              </button>
            )}
          </div>

          <ContactBlock lead={lead} patch={patch} saving={saving} />

          <div>
            <label className="label">Branche</label>
            <select
              className="input"
              value={lead.category ?? ''}
              onChange={(e) =>
                patch({ category: e.target.value || undefined })
              }
              disabled={saving}
            >
              <option value="">— wählen —</option>
              {LEAD_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              {lead.category &&
                !LEAD_CATEGORIES.includes(
                  lead.category as (typeof LEAD_CATEGORIES)[number],
                ) && <option value={lead.category}>{lead.category}</option>}
            </select>
          </div>

          <div>
            <label className="label">Website-Alter</label>
            <select
              className="input"
              value={lead.websiteAge ?? 'unbekannt'}
              onChange={(e) =>
                patch({
                  websiteAge: e.target.value as Lead['websiteAge'],
                })
              }
              disabled={saving}
            >
              <option value="unbekannt">unbekannt</option>
              <option value="keine">Keine Website</option>
              <option value="veraltet">Veraltet (3+ Jahre)</option>
              <option value="modern">Modern (kein Bedarf)</option>
            </select>
          </div>

          <NotesBlock lead={lead} patch={patch} saving={saving} />

          <div className="text-xs text-gray-400 border-t border-gray-100 pt-3">
            Angelegt {new Date(lead.createdAt.toMillis()).toLocaleString('de-DE')}
            <br />
            Zuletzt geändert{' '}
            {new Date(lead.updatedAt.toMillis()).toLocaleString('de-DE')}
          </div>
        </section>

        <ActivitiesTimeline
          leadId={lead.id}
          activities={activities}
          onChange={load}
        />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function ContactBlock({
  lead,
  patch,
  saving,
}: {
  lead: Lead;
  patch: (data: Partial<Lead>) => Promise<void>;
  saving: boolean;
}) {
  return (
    <div className="space-y-2 border-t border-gray-100 pt-3">
      <p className="label !mb-0">Kontakt</p>
      <input
        className="input"
        value={lead.contactName ?? ''}
        onChange={(e) => patch({ contactName: e.target.value })}
        placeholder="Ansprechpartner"
        disabled={saving}
      />
      <input
        className="input"
        value={lead.phone ?? ''}
        onChange={(e) => patch({ phone: e.target.value })}
        placeholder="Telefon"
        disabled={saving}
      />
      <input
        className="input"
        value={lead.email ?? ''}
        onChange={(e) => patch({ email: e.target.value })}
        placeholder="E-Mail"
        disabled={saving}
      />
      <input
        className="input"
        value={lead.website ?? ''}
        onChange={(e) => patch({ website: e.target.value })}
        placeholder="Website"
        disabled={saving}
      />
      <input
        className="input"
        value={lead.googleMapsUrl ?? ''}
        onChange={(e) => patch({ googleMapsUrl: e.target.value })}
        placeholder="Google-Maps-Link"
        disabled={saving}
      />
      {lead.googleMapsUrl && (
        <a
          href={lead.googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-xs text-brand-blue hover:underline"
        >
          Auf Google Maps öffnen ↗
        </a>
      )}
    </div>
  );
}

function NotesBlock({
  lead,
  patch,
  saving,
}: {
  lead: Lead;
  patch: (data: Partial<Lead>) => Promise<void>;
  saving: boolean;
}) {
  const [local, setLocal] = useState(lead.notes ?? '');
  return (
    <div className="border-t border-gray-100 pt-3">
      <label className="label">Notizen</label>
      <textarea
        className="input min-h-[90px]"
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          if (local !== lead.notes) patch({ notes: local });
        }}
        disabled={saving}
      />
    </div>
  );
}

function ActivitiesTimeline({
  leadId,
  activities,
  onChange,
}: {
  leadId: string;
  activities: Activity[];
  onChange: () => Promise<void>;
}) {
  const [type, setType] = useState<ActivityType>('anruf');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [adding, setAdding] = useState(false);

  const add = async () => {
    if (!description.trim()) return;
    setAdding(true);
    try {
      await createActivity({
        leadId,
        type,
        description: description.trim(),
        emailSubject: null,
        emailBody: null,
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : null,
        completed: false,
        completedAt: null,
      });
      setDescription('');
      setDueDate('');
      await onChange();
    } finally {
      setAdding(false);
    }
  };

  const toggleComplete = async (a: Activity) => {
    await updateActivity(a.id, {
      completed: !a.completed,
      completedAt: !a.completed ? Timestamp.fromDate(new Date()) : null,
    });
    await onChange();
  };

  const remove = async (a: Activity) => {
    if (!confirm('Aktivität löschen?')) return;
    await deleteActivity(a.id);
    await onChange();
  };

  return (
    <section className="card lg:col-span-2 space-y-4">
      <h2 className="text-base font-semibold text-gray-900">Aktivitäten</h2>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
        <div className="flex gap-2">
          <select
            className="input sm:w-40"
            value={type}
            onChange={(e) => setType(e.target.value as ActivityType)}
          >
            <option value="anruf">Anruf</option>
            <option value="email">E-Mail</option>
            <option value="notiz">Notiz</option>
            <option value="meeting">Meeting</option>
            <option value="angebot">Angebot</option>
            <option value="vertrag">Vertrag</option>
            <option value="sonstiges">Sonstiges</option>
          </select>
          <input
            className="input flex-1"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Was ist passiert / geplant?"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="datetime-local"
            className="input sm:w-56"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            placeholder="Fällig am (optional)"
          />
          <span className="text-xs text-gray-500">
            Fällig am (leer = sofort erledigt / Notiz)
          </span>
          <button
            type="button"
            onClick={add}
            disabled={adding || !description.trim()}
            className="btn-primary text-sm ml-auto"
          >
            {adding ? 'Speichere…' : '+ Aktivität'}
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <p className="text-sm text-gray-500 italic">
          Noch keine Aktivitäten. Alle Anrufe, Mails und Notizen kommen hier
          rein.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {activities.map((a) => {
            const overdue =
              !a.completed &&
              a.dueDate &&
              a.dueDate.toMillis() < Date.now();
            return (
              <li key={a.id} className="py-3 flex items-start gap-3">
                <span className="text-xl leading-none">
                  {ACTIVITY_ICONS[a.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm ${a.completed ? 'line-through text-gray-400' : 'text-gray-900'}`}
                  >
                    {a.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {a.dueDate ? (
                      <>
                        <span
                          className={overdue ? 'text-amber-700 font-medium' : ''}
                        >
                          {new Date(a.dueDate.toMillis()).toLocaleString(
                            'de-DE',
                          )}
                          {overdue && ' (überfällig)'}
                        </span>
                        {a.completed && a.completedAt && (
                          <>
                            {' '}
                            · erledigt{' '}
                            {new Date(
                              a.completedAt.toMillis(),
                            ).toLocaleDateString('de-DE')}
                          </>
                        )}
                      </>
                    ) : a.completedAt ? (
                      <>
                        {new Date(a.completedAt.toMillis()).toLocaleString(
                          'de-DE',
                        )}
                      </>
                    ) : (
                      <>
                        {new Date(a.createdAt.toMillis()).toLocaleString(
                          'de-DE',
                        )}
                      </>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleComplete(a)}
                    className="text-xs text-gray-500 hover:text-gray-900"
                  >
                    {a.completed ? '↩ Wiederöffnen' : '✓ Erledigt'}
                  </button>
                  <button
                    onClick={() => remove(a)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Löschen
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
