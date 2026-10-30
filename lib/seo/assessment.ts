import { stripInlineMarkdown } from './changelog-markdown';
import { formatMonthDE, monthNameDE, prevMonth, sameMonthLastYear } from './months';
import { pctChange } from './analysis';
import { fmtInt, fmtPos, type PortalData } from './view';

/**
 * Vorschlag fuer die Einschaetzung eines Monatsberichts. Rein regelbasiert
 * aus den Zahlen, ohne KI und ohne Kosten. Yusuf passt den Text im Admin
 * an oder ergaenzt ihn, bevor der Bericht freigegeben wird.
 *
 * Stil: Sie-Form, kurze Saetze, keine Gedankenstriche.
 */
export function suggestAssessment(data: PortalData): string {
  if (!data.month || !data.kpis) {
    return 'Für diesen Monat liegen noch keine Zahlen aus der Google Search Console vor.';
  }
  const m = data.month;
  const name = monthNameDE(m);
  const prevName = monthNameDE(prevMonth(m));
  const { current, prevMonth: pm, prevYear: py } = data.kpis;
  const out: string[] = [];

  // 1. Klicks
  const clickTrend = pctChange(current.clicks, pm?.clicks);
  let s = `Im ${name} kamen ${fmtInt(current.clicks)} Besucher über die Google-Suche auf Ihre Website.`;
  if (clickTrend !== null) {
    s += ` ${trendSentence(clickTrend, `als im ${prevName}`)}`;
  }
  const yoy = pctChange(current.clicks, py?.clicks);
  if (yoy !== null) {
    s += ` Im Vergleich zum ${formatMonthDE(sameMonthLastYear(m))} sind es ${percentWord(yoy)}.`;
  }
  out.push(s);

  // 2. Sichtbarkeit und Position
  const imprTrend = pctChange(current.impressions, pm?.impressions);
  let v = `Ihre Website wurde ${fmtInt(current.impressions)} Mal in den Suchergebnissen angezeigt`;
  v += imprTrend !== null ? ` (${signed(imprTrend)} zum Vormonat).` : '.';
  if (pm && pm.position > 0 && current.position > 0) {
    const diff = pm.position - current.position;
    if (Math.abs(diff) >= 0.3) {
      v += ` Die durchschnittliche Position hat sich von ${fmtPos(pm.position)} auf ${fmtPos(current.position)} ${
        diff > 0 ? 'verbessert' : 'verschlechtert'
      }.`;
    } else {
      v += ` Die durchschnittliche Position ist mit ${fmtPos(current.position)} stabil geblieben.`;
    }
  }
  out.push(v);

  // 3. Gewinner
  const winners = data.movers.positionWinners.slice(0, 3);
  if (winners.length) {
    const list = winners
      .map((w) => `„${w.query}“ (von Platz ${Math.round(w.prevPosition ?? 0)} auf ${Math.round(w.position)})`)
      .join(', ');
    out.push(`Besonders gut entwickelt haben sich ${list}.`);
  }

  // 4. Verlierer, ehrlich benennen
  const losers = data.movers.positionLosers.slice(0, 2);
  if (losers.length) {
    const list = losers
      .map((w) => `„${w.query}“ (von Platz ${Math.round(w.prevPosition ?? 0)} auf ${Math.round(w.position)})`)
      .join(' und ');
    out.push(`Etwas verloren haben ${list}. Das beobachten wir im nächsten Monat.`);
  }

  // 5. Groesste Chance
  const top = data.opportunities[0];
  if (top) {
    out.push(
      `Die größte Chance ist „${top.query}“: Ihre Seite steht dort im Schnitt auf Platz ${Math.round(
        top.position,
      )} und wurde ${fmtInt(top.impressions)} Mal angezeigt. Auf Platz 3 wären etwa ${fmtInt(
        top.potential,
      )} zusätzliche Besucher pro Monat möglich.`,
    );
  }

  // 6. Massnahmen
  const acts = data.activitiesThisMonth.filter((a) => a.status === 'done' || a.status === 'prepared');
  if (acts.length) {
    const sample = acts
      .slice(0, 3)
      .map((a) => stripInlineMarkdown(a.change).replace(/\.$/, ''))
      .join('; ');
    out.push(
      `Diesen Monat haben wir ${acts.length === 1 ? 'eine Maßnahme' : `${acts.length} Maßnahmen`} für Sie umgesetzt oder vorbereitet, unter anderem: ${sample}. Alle Details finden Sie unten unter „Was wir für Sie getan haben“.`,
    );
  }

  return out.join('\n\n');
}

function signed(r: number): string {
  const v = Math.round(r * 100);
  return `${v > 0 ? '+' : ''}${v} %`;
}

function percentWord(r: number): string {
  const v = Math.round(Math.abs(r) * 100);
  if (v === 0) return 'etwa gleich viele';
  return `${v} % ${r > 0 ? 'mehr' : 'weniger'}`;
}

function trendSentence(r: number, than: string): string {
  const v = Math.round(Math.abs(r) * 100);
  if (v === 0) return `Das sind etwa genauso viele wie ${than.replace(/^als /, '')}.`;
  return `Das sind ${v} % ${r > 0 ? 'mehr' : 'weniger'} ${than}.`;
}
