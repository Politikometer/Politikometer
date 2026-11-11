/**
 * tester (31.10.2026): Belege für Befunde der Prüfung von Commit d0e28f5.
 * ABSICHTLICH ROT, solange der jeweilige Fehler besteht. Nach der Behebung grün.
 * Daten nach echten Antworten vom 31.10.2026 (DIP /vorgang/333140, abgeordnetenwatch /politicians).
 */
import { GovernmentRepository } from '@/data/repositories/government-repository';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { DipClient } from '@/data/sources/dip/client';
import { mapLegislation } from '@/data/sources/dip/mappers';
import { vorgangDetailSchema } from '@/data/sources/dip/schemas';
import type { GovernmentOffice } from '@/domain/government';
import { weekWindow } from '@/domain/legislation';
import { createFavoritesStore, serializeFavorites, FAVORITES_STORAGE_KEY } from '@/state/favorites';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import awMandate from './fixtures/aw-mandate-merz-161.json';
import awParliament from './fixtures/aw-parliament-bundestag.json';
import awSearchMerz from './fixtures/aw-politician-search-merz.json';

function jsonResponse(body: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: () => null },
    json: async () => body,
  } as unknown as Response;
}

describe('Befund: Inkrafttreten ohne Erläuterung (Gesetz verfolgen)', () => {
  // Auszug aus https://search.dip.bundestag.de/api/v1/vorgang/333140 (31.10.2026)
  const raw = {
    id: '333140',
    titel: 'Gesetz zur Modernisierung des Designrechts und zur Änderung des Gesetzes gegen den unlauteren Wettbewerb',
    vorgangstyp: 'Gesetzgebung',
    beratungsstand: 'Verkündet',
    wahlperiode: 21,
    datum: '2026-10-16',
    verkuendung: [
      {
        ausfertigungsdatum: '2026-10-22',
        verkuendungsdatum: '2026-10-27',
        fundstelle: 'BGBl I 2026, 322',
        verkuendungsblatt_bezeichnung: 'Bundesgesetzblatt Teil I',
        pdf_url: 'https://www.recht.bund.de/eli/bund/BGBl_1/2026/322',
      },
    ],
    inkrafttreten: [
      { datum: '2026-09-27', erlaeuterung: 'Artikel 5' },
      { datum: '2026-12-09', erlaeuterung: 'im Übrigen' },
      { datum: '2028-09-27', erlaeuterung: 'Artikel 6' },
    ],
  };

  it('behält, welcher Teil des Gesetzes an welchem Tag in Kraft tritt', () => {
    const l = mapLegislation(vorgangDetailSchema.parse(raw), [], 0, '2026-10-31T12:00:00.000Z');
    // Heute: ['2026-09-27', '2026-12-09', '2028-09-27'] – angezeigt als „27.09.2026, 09.12.2026, 27.09.2028“,
    // obwohl der größte Teil erst am 09.12.2026 gilt und ein Datum vor der Verkündung liegt.
    expect(JSON.stringify(l.entryIntoForce)).toContain('im Übrigen');
    expect(JSON.stringify(l.entryIntoForce)).toContain('Artikel 5');
  });
});

describe('Befund: Abgeordnetenprofil fehlt bei mehrteiligem Nachnamen (Regierung)', () => {
  // abgeordnetenwatch findet „Reem Alabali Radovan“ nur mit last_name=„Alabali Radovan“ (live 31.10.2026:
  // first_name=„Reem Alabali“&last_name=„Radovan“ → total 0). Mandat 68384 in WP 2025–2029 ohne Ende.
  const person = {
    ...awSearchMerz.data[0],
    id: 175486,
    label: 'Reem Alabali Radovan',
    first_name: 'Reem',
    last_name: 'Alabali Radovan',
    qid_wikidata: 'Q108731156',
  };

  it('findet das Profil der Ministerin', async () => {
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      const url = decodeURIComponent(String(input)).replace(/\+/g, ' ');
      if (url.includes('/politicians?')) {
        const found = url.includes('first_name=Reem&') && url.includes('last_name=Alabali Radovan');
        return jsonResponse({ ...awSearchMerz, data: found ? [person] : [] });
      }
      if (url.includes('/parliaments/5')) return jsonResponse(awParliament);
      if (url.includes('/candidacies-mandates?')) return jsonResponse(awMandate);
      throw new Error(`Unerwartete URL: ${url}`);
    });
    const http = { fetchImpl: fetchImpl as unknown as typeof fetch, retries: 0 };
    const aw = new AbgeordnetenwatchClient(http);
    const repo = new GovernmentRepository(undefined, new DipClient(http), aw, http);
    const office: GovernmentOffice = {
      title: 'Bundesministerin für wirtschaftliche Zusammenarbeit und Entwicklung',
      wikidataId: 'Q108731156',
      name: 'Reem Alabali Radovan',
      inOfficeSince: '2025-05-06',
      party: { name: 'Sozialdemokratische Partei Deutschlands', shortName: 'SPD' },
      source: { publisher: 'Wikidata', url: 'https://www.wikidata.org/wiki/Q108731156', license: 'CC0 1.0', retrievedAt: '' },
    };
    await expect(repo.findBundestagProfile(office)).resolves.toMatchObject({ politicianId: 175486 });
  });
});

describe('Befund: Merkliste geht nach einem Lesefehler verloren', () => {
  it('überschreibt gespeicherte Einträge nicht, wenn das Lesen einmal fehlschlug', async () => {
    const saved = serializeFavorites([
      { type: 'politician', id: '118559', title: 'Friedrich Merz', subtitle: null, savedAt: '2026-10-01T10:00:00.000Z' },
    ]);
    const disk = new Map<string, string>([[FAVORITES_STORAGE_KEY, saved]]);
    let failRead = true;
    const storage = {
      getItem: async (k: string) => {
        if (failRead) {
          failRead = false;
          throw new Error('vorübergehender Lesefehler');
        }
        return disk.get(k) ?? null;
      },
      setItem: async (k: string, v: string) => {
        disk.set(k, v);
      },
    };
    const store = createFavoritesStore(storage);
    await store.load(); // Lesefehler → leere Liste
    await store.add({ type: 'proceeding', id: '333140', title: 'Designrecht', subtitle: null });
    // Erwartet: Merz bleibt gespeichert. Tatsächlich: nur noch „Designrecht“.
    expect(disk.get(FAVORITES_STORAGE_KEY)).toContain('118559');
  });
});

describe('Befund (Konzept): „Diese Woche“ schneidet eine Sitzungswoche ab', () => {
  it('zeigt am Donnerstag nach der Sitzungswoche 14.–16.10. alle drei Sitzungstage', () => {
    // Echte Sitzungen laut DIP: 14., 15., 16.10.2026. Am 22.10. beginnen die „letzten 7 Tage“ am 16.10.
    // → Sitzungen und die namentlichen Abstimmungen vom 15.10. (UNMISS, EUNAVFOR) fehlen.
    const w = weekWindow('2026-10-22', ['2026-10-14', '2026-10-15', '2026-10-16']);
    expect(w.start <= '2026-10-14').toBe(true);
  });
});
