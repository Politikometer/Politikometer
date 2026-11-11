import { BundestagRepository } from '@/data/repositories/bundestag-repository';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { groupByHowElected } from '@/domain/representatives';

import mandatesFixture from './fixtures/aw-mandates-wk192.json';
import parliamentFixture from './fixtures/aw-parliament-bundestag.json';
import politiciansFixture from './fixtures/aw-politicians-wk192.json';

const NOW = new Date('2026-10-26T12:00:00.000Z');

function jsonResponse(body: unknown) {
  return { status: 200, ok: true, headers: { get: () => null }, json: async () => body } as unknown as Response;
}

/** Simuliert die API anhand der URL. */
function fakeFetch() {
  return jest.fn(async (input: RequestInfo | URL) => {
    const url = decodeURIComponent(String(input));
    if (url.includes('/parliaments/5')) return jsonResponse(parliamentFixture);
    if (url.includes('/candidacies-mandates') && url.includes('constituency_nr=192'))
      return jsonResponse(mandatesFixture);
    if (url.includes('/politicians?')) return jsonResponse(politiciansFixture);
    throw new Error(`Unerwartete URL: ${url}`);
  });
}

describe('BundestagRepository', () => {
  it('ermittelt die aktuelle Wahlperiode und speichert sie zwischen', async () => {
    const fetchImpl = fakeFetch();
    const repo = new BundestagRepository(new AbgeordnetenwatchClient({ fetchImpl }), () => NOW);
    const term = await repo.getCurrentTerm();
    await repo.getCurrentTerm();
    expect(term.id).toBe(parliamentFixture.data.current_project.id);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('liefert die Abgeordneten eines Wahlkreises, alphabetisch und mit Abrufzeit', async () => {
    const fetchImpl = fakeFetch();
    const repo = new BundestagRepository(new AbgeordnetenwatchClient({ fetchImpl }), () => NOW);
    const result = await repo.getRepresentatives(192);

    expect(result.retrievedAt).toBe(NOW.toISOString());
    expect(result.representatives).toHaveLength(mandatesFixture.data.length);
    const lastNames = result.representatives.map((r) => r.politician.lastName);
    expect(lastNames).toEqual([...lastNames].sort((a, b) => a.localeCompare(b, 'de')));

    // Nutzt den Filter der API statt alle 630 Mandate zu laden.
    const urls = fetchImpl.mock.calls.map(([u]) => decodeURIComponent(String(u)));
    expect(urls.some((u) => u.includes('constituency_nr=192') && u.includes('parliament_period=161'))).toBe(true);
    // Personen werden in einer einzigen Anfrage geholt.
    expect(urls.filter((u) => u.includes('/politicians?'))).toHaveLength(1);

    const groups = groupByHowElected(result.representatives);
    expect(groups.direct.length + groups.other.length).toBe(result.representatives.length);
    expect(groups.direct.every((r) => r.mandate.howElected === 'direct')).toBe(true);
  });

  it('lässt beendete Mandate weg', async () => {
    const ended = structuredClone(mandatesFixture) as { data: { end_date: string | null }[] };
    ended.data[0].end_date = '2026-01-01';
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      const url = decodeURIComponent(String(input));
      if (url.includes('/parliaments/5')) return jsonResponse(parliamentFixture);
      if (url.includes('/candidacies-mandates')) return jsonResponse(ended);
      return jsonResponse(politiciansFixture);
    });
    const repo = new BundestagRepository(new AbgeordnetenwatchClient({ fetchImpl }), () => NOW);
    const result = await repo.getRepresentatives(192);
    expect(result.representatives).toHaveLength(mandatesFixture.data.length - 1);
  });

  it('meldet Fehler der API', async () => {
    const fetchImpl = jest.fn(async () =>
      jsonResponse({ meta: { status: 'error', status_message: 'kaputt' }, data: [] }),
    );
    const repo = new BundestagRepository(new AbgeordnetenwatchClient({ fetchImpl }), () => NOW);
    await expect(repo.getRepresentatives(192)).rejects.toThrow();
  });
});
