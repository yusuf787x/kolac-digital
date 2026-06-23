'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import SignaturePad from 'signature_pad';
import type { ContractField } from '@/lib/types';

const ContractPdfView = dynamic(
  () => import('@/components/contract/ContractPdfView'),
  { ssr: false, loading: () => <PdfLoading /> },
);

interface LoadResponse {
  id: string;
  title: string;
  typeLabel: string;
  customerCompany: string;
  fields: ContractField[];
  originalPdfUrl: string;
  expiresAt: number | null;
  alreadySigned?: boolean;
  signedPdfUrl?: string | null;
  error?: string;
}

export default function SignPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [state, setState] = useState<
    | { kind: 'loading' }
    | { kind: 'error'; message: string }
    | { kind: 'ready'; data: LoadResponse }
    | { kind: 'signed'; signedPdfUrl: string }
  >({ kind: 'loading' });

  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const padRef = useRef<SignaturePad | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/contracts/sign/load?token=${encodeURIComponent(token)}`)
      .then(async (res) => {
        const body = (await res.json()) as LoadResponse;
        if (!res.ok) {
          setState({
            kind: 'error',
            message: body.error ?? 'Vertrag konnte nicht geladen werden.',
          });
          return;
        }
        if (body.alreadySigned) {
          setState({
            kind: 'signed',
            signedPdfUrl: body.signedPdfUrl ?? '',
          });
          return;
        }
        setState({ kind: 'ready', data: body });
      })
      .catch((err) => {
        setState({
          kind: 'error',
          message: `Netzwerkfehler: ${(err as Error).message}`,
        });
      });
  }, [token]);

  // Signature-Pad initialisieren, sobald Canvas im DOM ist.
  useEffect(() => {
    if (state.kind !== 'ready') return;
    if (!canvasRef.current) return;
    resizeCanvas(canvasRef.current);
    const pad = new SignaturePad(canvasRef.current, {
      backgroundColor: 'rgba(255,255,255,0)',
      penColor: '#0a0a0a',
      minWidth: 1.1,
      maxWidth: 2.6,
    });
    pad.addEventListener('endStroke', () => setHasSignature(!pad.isEmpty()));
    padRef.current = pad;

    const onResize = () => {
      if (canvasRef.current) {
        const data = pad.toData();
        resizeCanvas(canvasRef.current);
        pad.clear();
        pad.fromData(data);
      }
    };
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      pad.off();
      padRef.current = null;
    };
  }, [state.kind]);

  const clearSignature = () => {
    padRef.current?.clear();
    setHasSignature(false);
  };

  const submit = async () => {
    if (state.kind !== 'ready') return;
    if (!padRef.current || padRef.current.isEmpty()) {
      setSubmitError('Bitte unterschreibe im Signatur-Feld.');
      return;
    }
    if (!name.trim()) {
      setSubmitError('Bitte deinen Namen angeben.');
      return;
    }
    setSubmitError(null);
    setSubmitting(true);
    try {
      const dataUrl = padRef.current.toDataURL('image/png');
      const res = await fetch('/api/contracts/sign/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          signedByName: name.trim(),
          signatureDataUrl: dataUrl,
        }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        signedPdfUrl?: string;
        error?: string;
      };
      if (!res.ok || !body.ok) {
        throw new Error(body.error ?? 'Signieren fehlgeschlagen.');
      }
      setState({
        kind: 'signed',
        signedPdfUrl: body.signedPdfUrl ?? '',
      });
    } catch (err) {
      setSubmitError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo.png"
              alt="Kolac Digital"
              className="h-8 w-auto"
            />
            <span className="text-sm text-gray-500 hidden sm:inline">
              Sicheres Unterschreiben
            </span>
          </div>
          <a
            href="https://www.kolac-digital.de"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-500 hover:text-gray-800"
          >
            kolac-digital.de
          </a>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        {state.kind === 'loading' && (
          <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
            Lade Vertrag…
          </div>
        )}

        {state.kind === 'error' && (
          <div className="bg-white rounded-xl border border-red-200 p-6 text-sm text-red-700">
            {state.message}
          </div>
        )}

        {state.kind === 'signed' && (
          <div className="bg-white rounded-xl border border-green-200 p-8 text-center">
            <div className="text-4xl mb-3">✓</div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Danke, der Vertrag ist unterschrieben.
            </h1>
            <p className="mt-2 text-sm text-gray-600">
              Du erhältst gleich auch eine Kopie per Mail. Hier ist das
              signierte PDF zum sofortigen Download:
            </p>
            {state.signedPdfUrl && (
              <a
                href={state.signedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block mt-5 px-5 py-2.5 rounded-lg bg-brand-blue text-white text-sm font-medium hover:opacity-90"
              >
                Signiertes PDF öffnen
              </a>
            )}
          </div>
        )}

        {state.kind === 'ready' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h1 className="text-2xl font-semibold text-gray-900">
                {state.data.title}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {state.data.typeLabel}
                {state.data.customerCompany
                  ? ` · für ${state.data.customerCompany}`
                  : ''}
              </p>
              <p className="mt-3 text-sm text-gray-700">
                Bitte lies den Vertrag in Ruhe durch und unterschreibe unten
                im Signatur-Feld. Mit dem Klick auf "Verbindlich
                unterschreiben" wird der Vertrag rechtsgültig signiert und
                ein finales PDF erstellt — du bekommst sofort eine Kopie.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-3 overflow-x-auto">
              <ContractPdfView
                pdfUrl={state.data.originalPdfUrl}
                fields={state.data.fields}
              />
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Verbindlich unterschreiben
              </h2>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Dein vollständiger Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  placeholder="Max Mustermann"
                  autoComplete="name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Unterschrift (mit Finger oder Maus zeichnen)
                </label>
                <div className="relative border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="block w-full h-44 sm:h-56 touch-none"
                    style={{ touchAction: 'none' }}
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className="text-gray-400 text-sm">
                        Hier unterschreiben
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-xs text-gray-500 hover:text-gray-800"
                  >
                    Unterschrift löschen
                  </button>
                  <span className="text-xs text-gray-500">
                    {hasSignature
                      ? '✓ Unterschrift gesetzt'
                      : 'noch leer'}
                  </span>
                </div>
              </div>

              {submitError && (
                <div className="mt-4 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                  {submitError}
                </div>
              )}

              <button
                onClick={submit}
                disabled={submitting}
                className="mt-5 w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-lg bg-brand-blue text-white font-medium hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? 'Wird verarbeitet…' : 'Verbindlich unterschreiben'}
              </button>

              <p className="mt-4 text-xs text-gray-500">
                Mit dem Klick wird eine einfache elektronische Signatur gemäß
                eIDAS erstellt. Datum, IP-Adresse und Browser werden zur
                Beweissicherung dokumentiert. Beide Parteien erhalten das
                signierte PDF.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function PdfLoading() {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 text-sm text-gray-500">
      Lade Vertrag…
    </div>
  );
}

function resizeCanvas(c: HTMLCanvasElement) {
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  c.width = c.offsetWidth * ratio;
  c.height = c.offsetHeight * ratio;
  const ctx = c.getContext('2d');
  ctx?.scale(ratio, ratio);
}
