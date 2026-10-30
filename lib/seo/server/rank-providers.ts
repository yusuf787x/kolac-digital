import 'server-only';

/**
 * Austauschbare Schnittstelle fuer kostenpflichtige Ranking-Abfragen
 * (z. B. DataForSEO pay per use). Gedacht fuer Ziel-Keywords, fuer die
 * ein Kunde noch keine Impressionen in der Search Console hat.
 *
 * Standardmaessig AUS (SEO_RANK_PROVIDER nicht gesetzt oder "none").
 * Noch nirgends aufgerufen. Ein neuer Anbieter implementiert RankProvider
 * und wird in getRankProvider() eingetragen.
 */

export interface RankResult {
  keyword: string;
  /** null = nicht in den ersten 100 Ergebnissen */
  position: number | null;
  url: string | null;
  /** Monatliches Suchvolumen, falls der Anbieter es liefert. */
  searchVolume: number | null;
}

export interface RankProvider {
  readonly id: string;
  readonly enabled: boolean;
  checkRankings(opts: { domain: string; keywords: string[]; location: string; language: string }): Promise<RankResult[]>;
}

const noopProvider: RankProvider = {
  id: 'none',
  enabled: false,
  async checkRankings() {
    return [];
  },
};

export function getRankProvider(): RankProvider {
  const id = (process.env.SEO_RANK_PROVIDER ?? 'none').toLowerCase();
  switch (id) {
    case 'none':
      return noopProvider;
    default:
      throw new Error(`Ranking-Anbieter "${id}" ist nicht implementiert. Erlaubt: none.`);
  }
}
