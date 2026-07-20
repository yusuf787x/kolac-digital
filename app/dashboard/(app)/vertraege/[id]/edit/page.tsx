'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Timestamp } from 'firebase/firestore';
import {
  getContract,
  getCustomer,
  updateContract,
  uploadFile,
} from '@/lib/firestore';
import { sha256Hex } from '@/lib/contract-utils';
import { buildTemplateContractPdf } from '@/lib/template-contract';
import RichTextArea from '@/components/quote/RichTextArea';
import AttachmentsEditor from '@/components/contract/AttachmentsEditor';
import type { ContractAttachment } from '@/components/contract/TemplateContractPdf';
import type { Contract, ContractField, Customer } from '@/lib/types';

/**
 * Bearbeiten eines Template-basierten Vertrags. Nur moeglich solange
 * der Vertrag noch nicht signiert / storniert ist. Beim Speichern
 * wird das PDF im gleichen Storage-Pfad ueberschrieben — der Signing-
 * Link bleibt gleich und zeigt automatisch die neue Version.
 */
export default function EditContractPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [contract, setContract] = useState<Contract | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [attachments, setAttachments] = useState<ContractAttachment[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await getContract(params.id);
        if (!c) {
          setError('Vertrag nicht gefunden.');
          return;
        }
        if (!c.templateData) {
          setError(
            'Dieser Vertrag stammt aus einem hochgeladenen PDF und kann hier nicht bearbeitet werden.',
          );
          return;
        }
        if (c.status === 'signed' || c.status === 'cancelled') {
          setError(
            `Vertrag ist bereits ${c.status === 'signed' ? 'unterschrieben' : 'storniert'} und kann nicht mehr bearbeitet werden.`,
          );
          return;
        }
        setContract(c);
        setTitle(c.title);
        setBodyText(c.templateData.bodyText);
        setAttachments(c.templateData.attachments ?? []);
        const cust = await getCustomer(c.customerId);
        setCustomer(cust);
      } catch (err) {
        console.error(err);
        setError(`Vertrag konnte nicht geladen werden: ${(err as Error).message}`);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const handleSave = async () => {
    if (!contract || !customer) return;
    if (!title.trim() || !bodyText.trim()) {
      setError('Titel und Freitext dürfen nicht leer sein.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const subtitle =
        contract.templateData?.subtitle ??
        `${contract.typeLabel} · ${customer.company || `${customer.firstName} ${customer.lastName}`}`;

      const { blob, pageCount, signaturePage } = await buildTemplateContractPdf(
        {
          title,
          subtitle,
          customer,
          bodyText,
          attachments,
        },
      );
      const buf = await blob.arrayBuffer();
      const hash = await sha256Hex(buf);
      // Denselben Storage-Pfad ueberschreiben — dadurch bleibt der
      // Signing-Link gueltig und zeigt sofort die neue Version. Die
      // Download-URL kann sich aendern (Firebase-Token), also updaten
      // wir sie im Contract mit.
      const pdfFile = new File([blob], 'contract.pdf', {
        type: 'application/pdf',
      });
      const downloadUrl = await uploadFile(contract.originalPdfPath, pdfFile);

      const fields: ContractField[] = [
        {
          type: 'date',
          page: signaturePage,
          x: 0.28,
          y: 0.72,
          width: 0.25,
          height: 0.04,
        },
        {
          type: 'customer_signature',
          page: signaturePage,
          x: 0.55,
          y: 0.78,
          width: 0.35,
          height: 0.08,
        },
      ];

      await updateContract(contract.id, {
        title,
        templateData: {
          bodyText,
          subtitle,
          attachments: attachments.map((a) => ({
            title: a.title,
            body: a.body,
          })),
        },
        originalPdfUrl: downloadUrl,
        originalSha256: hash,
        pageCount,
        fields,
        audit: [
          ...contract.audit,
          {
            at: Timestamp.now(),
            event: 'created',
            note: 'PDF nach Bearbeitung neu generiert',
          },
        ],
      });
      router.push(`/dashboard/vertraege/${contract.id}`);
    } catch (err) {
      console.error(err);
      setError(`Speichern fehlgeschlagen: ${(err as Error).message}`);
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="card text-sm text-gray-500">Lädt…</div>;
  }

  if (error && !contract) {
    return (
      <div>
        <Link
          href={`/dashboard/vertraege/${params.id}`}
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück
        </Link>
        <div className="card bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      </div>
    );
  }

  if (!contract || !customer) return null;

  return (
    <div>
      <header className="mb-6">
        <Link
          href={`/dashboard/vertraege/${contract.id}`}
          className="text-sm text-gray-500 hover:text-gray-900 mb-3 inline-block"
        >
          ← Zurück zum Vertrag
        </Link>
        <h1 className="text-3xl font-semibold text-gray-900">
          Vertrag bearbeiten
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Nach dem Speichern wird das PDF neu generiert. Der Signing-Link
          bleibt gleich und zeigt sofort die aktualisierte Version.
        </p>
      </header>

      {error && (
        <div className="card mb-4 bg-red-50 border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="card space-y-4">
        <div>
          <label className="label">Titel</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div>
          <label className="label">Freitext (Vertragsinhalt)</label>
          <RichTextArea
            value={bodyText}
            onChange={setBodyText}
            minHeight={280}
          />
        </div>

        <div className="border-t border-gray-100 pt-4">
          <AttachmentsEditor
            attachments={attachments}
            onChange={setAttachments}
          />
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
          <Link
            href={`/dashboard/vertraege/${contract.id}`}
            className="btn-secondary"
          >
            Abbrechen
          </Link>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary disabled:opacity-50"
          >
            {saving
              ? 'Erzeuge PDF & speichere…'
              : 'Speichern & PDF neu generieren'}
          </button>
        </div>
      </div>
    </div>
  );
}
