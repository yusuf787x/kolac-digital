import { monthNameDE, prevMonth } from './months';
import { pctChange } from './analysis';
import { fmtInt, type PortalData } from './view';

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
  // Kurz halten: hoechstens drei Saetze. Details stehen in Kennzahlen und Massnahmen.
  const m = data.month;
  const { current, prevMonth: pm } = data.kpis;
  const out: string[] = [];

  const trend = pctChange(current.clicks, pm?.clicks);
  out.push(
    trend === null
      ? `Im ${monthNameDE(m)} kamen ${fmtInt(current.clicks)} Besucher über Google auf Ihre Website.`
      : `Im ${monthNameDE(m)} kamen ${fmtInt(current.clicks)} Besucher über Google, ${compareWord(trend)} im ${monthNameDE(prevMonth(m))}.`,
  );

  const w = data.movers.positionWinners[0];
  const top = data.opportunities[0];
  if (w) {
    out.push(`Am stärksten zugelegt hat „${w.query}“ (von Platz ${Math.round(w.prevPosition ?? 0)} auf ${Math.round(w.position)}).`);
  } else if (top) {
    out.push(`Die größte Chance ist „${top.query}“, dort stehen Sie aktuell auf Platz ${Math.round(top.position)}.`);
  }

  const acts = data.activitiesThisMonth.filter((a) => a.status === 'done' || a.status === 'prepared');
  if (acts.length) {
    out.push(`Wir haben diesen Monat ${acts.length === 1 ? 'eine Maßnahme' : `${acts.length} Maßnahmen`} für Sie umgesetzt.`);
  }
  return out.join(' ');
}

/** "18 % mehr als", "5 % weniger als" oder "etwa so viele wie" */
function compareWord(r: number): string {
  const v = Math.round(Math.abs(r) * 100);
  if (v === 0) return 'etwa so viele wie';
  return `${v} % ${r > 0 ? 'mehr' : 'weniger'} als`;
}
