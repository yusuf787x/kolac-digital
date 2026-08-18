import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { EXPENSE_CATEGORIES, type ExpenseCategory } from '@/lib/types';
import { authenticate, authErrorResponse } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const RECEIPT_SCHEMA = {
  type: 'object',
  properties: {
    date: {
      type: 'string',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description:
        'Rechnungs-/Beleg-Datum im Format YYYY-MM-DD. Wenn unsicher, das Druck-/Kaufdatum nehmen.',
    },
    amount: {
      type: 'number',
      description:
        'Bruttobetrag in EUR (Endsumme inkl. MwSt.) als Dezimalzahl. Beispiel: 12.34',
    },
    supplier: {
      type: 'string',
      description:
        'Name des Lieferanten / Anbieters / Unternehmens (z.B. "Amazon EU", "Telekom"). Leerer String wenn nicht erkennbar.',
    },
    description: {
      type: 'string',
      description:
        'Kurze, prägnante Beschreibung des Postens auf Deutsch (max 80 Zeichen). Beispiele: "Canva Pro Februar", "USB-C Hub".',
    },
    category: {
      type: 'string',
      enum: [...EXPENSE_CATEGORIES],
      description: 'Kategorie. Wenn unsicher, "Sonstiges" wählen.',
    },
    confidence: {
      type: 'string',
      enum: ['high', 'medium', 'low'],
      description:
        'Wie sicher bin ich mir bei den extrahierten Daten? high = alles klar; low = wichtige Felder geraten oder unleserlich.',
    },
  },
  required: ['date', 'amount', 'supplier', 'description', 'category', 'confidence'],
  additionalProperties: false,
} as const;

interface ExtractedReceipt {
  date: string;
  amount: number;
  supplier: string;
  description: string;
  category: ExpenseCategory;
  confidence: 'high' | 'medium' | 'low';
}

const SYSTEM_PROMPT = `Du bist ein Beleg-Extraktor für die deutsche Buchhaltung von "Kolac Digital", einer Digitalagentur in Bielefeld.

Du bekommst ein Foto oder PDF eines Belegs/einer Rechnung und extrahierst genau die Felder, die das Schema vorgibt. Wichtig:

- Datum: Das Rechnungs-/Belegdatum, NICHT das Lieferdatum oder Druckdatum von Versand-Etiketten.
- Betrag: IMMER der Brutto-Endbetrag (inkl. MwSt.), nicht der Netto-Betrag, nicht einzelne Posten. Falls nur Netto + MwSt. einzeln aufgeführt sind: addieren.
- Beschreibung: Kurz, prägnant, deutsch. Wenn der Beleg ein Abo/Service ist, möglichst Monat/Jahr mitnehmen ("Notion Pro Februar 2026"). Bei Bewirtung Restaurant + Anlass, falls erkennbar ("Restaurant Roma, Kundenessen").
- Kategorie: Aus der Liste wählen. Zuordnung nach EÜR-Anlage:
  * "Bewirtung" — Restaurant/Café/Gaststätte/Catering-Belege (EÜR Zeile 66, NUR 70 % abziehbar!). Erkennbar an Wörtern wie "Restaurant", "Gaststätte", "Café", "Bar", "Trinkgeld", "Speisen", "Getränke", "Menü", "Kellner". WICHTIG: Nur wenn Bewirtung im geschäftlichen Kontext (Kunde, Meeting). Reines Selbstessen ist PRIVAT und gehört NICHT in die Buchhaltung.
  * "Geschenke" — Präsente an Geschäftspartner/Kunden (Wein, Blumen, Gutscheine). EÜR Zeile 65, nur bis 35 € netto pro Empfänger/Jahr abziehbar.
  * "Kfz-Kosten" — Tankstelle, Werkstatt, Kfz-Versicherung, Kfz-Steuer, Waschanlage (EÜR Zeile 36). NICHT Bahn/Flug/Taxi — das ist "Reisen".
  * "Reisen" — Bahn, Flug, Taxi, Uber, Hotel, Übernachtung, Reisenebenkosten (EÜR Zeile 46).
  * "Miete Büro" — Miete oder Nebenkosten für Geschäftsräume (EÜR Zeile 37).
  * "Fremdleistungen" — Rechnungen von Freelancern, Subunternehmern, Agenturen (EÜR Zeile 27).
  * "Software/Tools" — SaaS-Abos (Notion, Figma, Adobe, GitHub, Vercel, Firebase, Canva). EÜR Zeile 62.
  * "Werbung/Ads" — Google Ads, Meta/Facebook/Instagram Ads, TikTok Ads, Sponsored Posts, Flyer-Druck (EÜR Zeile 46).
  * "Hardware" — Physische Geräte: Laptop, Monitor, Tastatur, Kamera, Kabel (EÜR Zeile 33 bei ≤ 800 € netto).
  * "Telefon/Internet" — Provider-Rechnungen (Telekom, Vodafone, O2, 1&1, Domain-Rechnungen mit Hosting). EÜR Zeile 45.
  * "Weiterbildung" — Kurse, Bücher, Seminare, Konferenzen, Udemy, Coursera (EÜR Zeile 49).
  * "Büro" — Büromaterial, Papier, Stifte, kleiner Bürobedarf (EÜR Zeile 62).
  * "Versicherungen" — Berufshaftpflicht, Betriebshaftpflicht, Cyber-Versicherung (EÜR Zeile 62). NICHT private Kranken-/Rentenversicherung.
  * "Sonstiges" — Wenn nichts eindeutig passt (EÜR Zeile 62).
- Lieferant: Name des Unternehmens vom Briefkopf/Logo.
- Confidence: low → wichtige Felder geraten/unsicher; medium → ein paar Lücken aber Hauptdaten klar; high → alles klar erkennbar.

Wenn der Betrag nicht eindeutig erkennbar ist, lieber confidence: low setzen statt zu raten.

Antworte AUSSCHLIESSLICH mit dem strukturierten JSON, keine Erklärung davor oder danach.`;

const USER_INSTRUCTION = `Extrahiere die Belegdaten als strukturiertes JSON gemäß dem geforderten Schema.`;

interface Body {
  fileBase64: string;
  mimeType: string;
}

const SUPPORTED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

export async function POST(req: Request) {
  const auth = await authenticate(req);
  const errResp = authErrorResponse(auth);
  if (errResp) return errResp;

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY ist nicht gesetzt.' },
      { status: 500 },
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: 'Ungültiger Request-Body.' }, { status: 400 });
  }

  if (!body.fileBase64 || !body.mimeType) {
    return NextResponse.json(
      { error: 'fileBase64 und mimeType sind erforderlich.' },
      { status: 400 },
    );
  }

  const isImage = SUPPORTED_IMAGE_TYPES.has(body.mimeType);
  const isPdf = body.mimeType === 'application/pdf';

  if (!isImage && !isPdf) {
    return NextResponse.json(
      {
        error: `Dateityp ${body.mimeType} wird nicht unterstützt. Erlaubt: PNG, JPG, GIF, WebP, PDF.`,
      },
      { status: 400 },
    );
  }

  const client = new Anthropic();

  const fileBlock = isImage
    ? {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: body.mimeType as
            | 'image/jpeg'
            | 'image/png'
            | 'image/gif'
            | 'image/webp',
          data: body.fileBase64,
        },
      }
    : {
        type: 'document' as const,
        source: {
          type: 'base64' as const,
          media_type: 'application/pdf' as const,
          data: body.fileBase64,
        },
      };

  try {
    const response = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      thinking: { type: 'disabled' },
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [fileBlock, { type: 'text', text: USER_INSTRUCTION }],
        },
      ],
      // Structured output via output_config — GA, no beta header.
      // Cast around SDK 0.69 type gap (output_config not yet typed at top level).
      ...({
        output_config: {
          format: {
            type: 'json_schema',
            schema: RECEIPT_SCHEMA,
          },
        },
      } as Record<string, unknown>),
    });

    const textBlock = response.content.find(
      (b): b is Anthropic.TextBlock => b.type === 'text',
    );
    if (!textBlock) {
      return NextResponse.json(
        {
          error: 'Keine Text-Antwort vom Modell erhalten.',
          stop_reason: response.stop_reason,
        },
        { status: 502 },
      );
    }

    let parsed: ExtractedReceipt;
    try {
      parsed = JSON.parse(textBlock.text) as ExtractedReceipt;
    } catch {
      return NextResponse.json(
        {
          error: 'Modell-Antwort konnte nicht als JSON geparst werden.',
          rawResponse: textBlock.text.slice(0, 200),
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      data: parsed,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', err.status, err.message);
      return NextResponse.json(
        { error: `Claude API Fehler ${err.status}: ${err.message}` },
        { status: err.status >= 500 ? 502 : err.status },
      );
    }
    console.error('Receipt extraction error:', err);
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 },
    );
  }
}
