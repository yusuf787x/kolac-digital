/**
 * Stelle im Browser, an der nach einem erfolgreichen Freischalten ein
 * „Lead“ gemeldet wird. Heute nur ein Browser-Ereignis (kolac:lead), auf
 * das ein späteres Mess-Skript (z. B. Meta-Pixel nach Einwilligung) hören
 * kann, ohne den SEO-Check anzufassen.
 */
export interface LeadEventDetail {
  checkId: string;
  branche?: string;
  landing?: string;
}

export function emitLeadCaptured(detail: LeadEventDetail): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<LeadEventDetail>('kolac:lead', { detail }));
}
