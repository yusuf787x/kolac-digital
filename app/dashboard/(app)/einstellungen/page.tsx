'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  getSettings,
  updateSettings,
  getGoogleAuth,
  deleteGoogleAuth,
} from '@/lib/firestore';
import { seedInitialData } from '@/lib/seed';
import type { Settings, GoogleAuth } from '@/lib/types';

export default function EinstellungenPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [defaultPaymentDays, setDefaultPaymentDays] = useState('7');
  const [defaultClosingText, setDefaultClosingText] = useState('');
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('1218');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const [googleAuth, setGoogleAuth] = useState<GoogleAuth | null>(null);
  const [seedRunning, setSeedRunning] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getSettings(), getGoogleAuth()]).then(([s, g]) => {
      setSettings(s);
      setDefaultPaymentDays(String(s.defaultPaymentDays));
      setDefaultClosingText(s.defaultClosingText);
      setNextInvoiceNumber(String(s.nextInvoiceNumber));
      setGoogleAuth(g);
    });
  }, []);

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSettingsMessage(null);
    setSavingSettings(true);
    try {
      await updateSettings({
        defaultPaymentDays: parseInt(defaultPaymentDays, 10) || 7,
        defaultClosingText,
        nextInvoiceNumber: parseInt(nextInvoiceNumber, 10) || 1218,
      });
      setSettingsMessage('Gespeichert.');
      setTimeout(() => setSettingsMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setSettingsMessage('Fehler beim Speichern.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSeed = async () => {
    if (
      !confirm(
        'Seed-Daten importieren? Es werden 4 Kunden angelegt (falls noch nicht vorhanden) und Default-Settings gesetzt.',
      )
    )
      return;
    setSeedMessage(null);
    setSeedRunning(true);
    try {
      const result = await seedInitialData();
      setSeedMessage(
        `Fertig: ${result.customersCreated} Kunden angelegt, ${result.customersSkipped} übersprungen. Settings ${result.settingsCreated ? 'gesetzt' : 'unverändert'}.`,
      );
    } catch (err) {
      console.error(err);
      setSeedMessage('Fehler beim Importieren der Seed-Daten.');
    } finally {
      setSeedRunning(false);
    }
  };

  const handleConnectDrive = () => {
    window.location.href = '/api/auth/google';
  };

  const handleDisconnectDrive = async () => {
    if (!confirm('Google Drive Verbindung wirklich trennen?')) return;
    await deleteGoogleAuth();
    setGoogleAuth(null);
  };

  return (
    <div>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Einstellungen</h1>
        <p className="mt-1 text-sm text-gray-500">
          Standard-Zahlungsziel, Abschlusstext, Rechnungsnummer und
          Google-Drive-Verbindung.
        </p>
      </header>

      <div className="space-y-6">
        <form onSubmit={handleSaveSettings} className="card space-y-4">
          <h2 className="text-base font-semibold text-gray-900">
            Rechnungs-Defaults
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Standard-Zahlungsziel (Tage)</label>
              <input
                type="number"
                className="input"
                value={defaultPaymentDays}
                onChange={(e) => setDefaultPaymentDays(e.target.value)}
                min="0"
              />
            </div>
            <div>
              <label className="label">Nächste Rechnungsnummer</label>
              <input
                type="number"
                className="input"
                value={nextInvoiceNumber}
                onChange={(e) => setNextInvoiceNumber(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Format wechselt ab 2027 automatisch zu KD-YYYY-NNN.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Standard-Abschlusstext</label>
            <textarea
              className="input min-h-[80px]"
              value={defaultClosingText}
              onChange={(e) => setDefaultClosingText(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={savingSettings}
              className="btn-primary"
            >
              {savingSettings ? 'Speichern…' : 'Speichern'}
            </button>
            {settingsMessage && (
              <span className="text-sm text-gray-700">{settingsMessage}</span>
            )}
          </div>
        </form>

        <section className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Google Drive
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Verbindet das Dashboard via OAuth2 mit deinem Google Drive für
            automatisches Backup von Rechnungen, Belegen und der Buchhaltungs-
            Tabelle.
          </p>

          {googleAuth ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-700">
                ✓ Verbunden als <strong>{googleAuth.connectedEmail}</strong>
              </div>
              <button
                onClick={handleDisconnectDrive}
                className="btn-secondary text-red-600 hover:bg-red-50"
              >
                Verbindung trennen
              </button>
            </div>
          ) : (
            <button onClick={handleConnectDrive} className="btn-secondary">
              Google Drive verbinden
            </button>
          )}
        </section>

        <section className="card">
          <h2 className="text-base font-semibold text-gray-900 mb-2">
            Seed-Daten importieren
          </h2>
          <p className="text-sm text-gray-500 mb-4">
            Legt 4 Kunden an (Mironi, CarHifi-Herford, MK Automobile,
            BitsAndBucks) und Default-Settings. Bestehende Kunden mit
            gleichem Firmennamen werden übersprungen.
          </p>
          <button
            onClick={handleSeed}
            disabled={seedRunning}
            className="btn-secondary"
          >
            {seedRunning ? 'Importiere…' : 'Seed-Daten importieren'}
          </button>
          {seedMessage && (
            <p className="mt-3 text-sm text-gray-700">{seedMessage}</p>
          )}
        </section>
      </div>
    </div>
  );
}
