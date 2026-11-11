import { BundestagRepository } from '@/data/repositories/bundestag-repository';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { extractOfficialLinks, htmlToText } from '@/data/sources/abgeordnetenwatch/html';
import { countVotes, mapReasonNoShow, mapVoteChoice } from '@/data/sources/abgeordnetenwatch/mappers';
import type { AwVote } from '@/data/sources/abgeordnetenwatch/schemas';

import candidaciesFixture from './fixtures/aw-candidacies-wk192.json';
import parliamentFixture from './fixtures/aw-parliament-bundestag.json';
import periodFixture from './fixtures/aw-period-161.json';
import candidatePeopleFixture from './fixtures/aw-politicians-candidates-wk192.json';
import pollsFixture from './fixtures/aw-polls-161-subset.json';
import votesFixture from './fixtures/aw-votes-mandate-70826.json';

const NOW = new Date('2026-10-27T12:00:00.000Z');

function jsonResponse(body: unknown) {
  return { status: 200, ok: true, headers: { get: () => null }, json: async () => body } as unknown as Response;
}

function repoWith(routes: [string, unknown][]) {
  const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
    const url = decodeURIComponent(String(input));
    const hit = routes.find(([part]) => url.includes(part));
    if (!hit) throw new Error(`Unerwartete URL: ${url}`);
    return jsonResponse(hit[1]);
  });
  return { repo: new BundestagRepository(new AbgeordnetenwatchClient({ fetchImpl }), () => NOW), fetchImpl };
}

describe('HTML-Beschreibungen', () => {
  it('wandelt HTML in lesbaren Text', () => {
    expect(htmlToText('<p>Der <strong>Bundestag</strong>&nbsp;hat &amp; beschlossen.</p><p>Zweiter Absatz</p>')).toBe(
      'Der Bundestag hat & beschlossen.\n\nZweiter Absatz',
    );
    expect(htmlToText('')).toBeNull();
  });

  it('übernimmt nur Links auf offizielle Bundestagsdokumente', () => {
    const html =
      '<a href="https://dserver.bundestag.de/btd/21/078/2107869.pdf">Gesetzentwurf</a> ' +
      '<a href="https://www.abgeordnetenwatch.de/x">intern</a> ' +
      '<a href="https://dserver.bundestag.de/btd/21/078/2107869.pdf">doppelt</a>';
    expect(extractOfficialLinks(html)).toEqual([
      { label: 'Gesetzentwurf', url: 'https://dserver.bundestag.de/btd/21/078/2107869.pdf' },
    ]);
  });
});

describe('Stimmen', () => {
  const vote = (v: string, fraction: string | null, reason: string | null = null): AwVote => ({
    id: Math.random(),
    mandate: { id: 1, label: 'x' },
    poll: { id: 1, label: 'p' },
    vote: v,
    reason_no_show: reason,
    reason_no_show_other: null,
    fraction: fraction ? { id: 1, label: `${fraction} (Bundestag 2025 - 2029)` } : null,
  });

  it('übersetzt Stimmen und Gründe', () => {
    expect(mapVoteChoice('yes')).toBe('yes');
    expect(mapVoteChoice('no_show')).toBe('no_show');
    expect(mapVoteChoice('irgendwas')).toBe('no_show');
    expect(mapReasonNoShow(vote('no_show', 'SPD', 'maternity_protection'))).toBe('Mutterschutz');
    expect(mapReasonNoShow(vote('no_show', 'SPD', 'unbekannt'))).toBe('Grund angegeben');
    expect(mapReasonNoShow(vote('yes', 'SPD'))).toBeNull();
  });

  it('zählt gesamt und je Fraktion, alphabetisch mit „fraktionslos“ am Ende', () => {
    const result = countVotes([
      vote('yes', 'SPD'),
      vote('no', 'fraktionslos'),
      vote('abstain', 'Die Linke'),
      vote('yes', 'CDU/CSU'),
      vote('no_show', 'CDU/CSU'),
    ]);
    expect(result.totals).toEqual({ yes: 2, no: 1, abstain: 1, no_show: 1 });
    expect(result.byFraction.map((f) => f.fraction)).toEqual(['CDU/CSU', 'Die Linke', 'SPD', 'fraktionslos']);
    expect(result.byFraction[0].counts).toEqual({ yes: 1, no: 0, abstain: 0, no_show: 1 });
  });
});

describe('BundestagRepository – Abstimmungen', () => {
  it('verknüpft Stimmen mit Abstimmungen und sortiert neueste zuerst', async () => {
    const { repo } = repoWith([
      ['/parliaments/5', parliamentFixture],
      ['/votes?', votesFixture],
      ['/polls?', pollsFixture],
    ]);
    const result = await repo.getVotes(70826);
    expect(result.votes).toHaveLength(votesFixture.data.length);
    const dates = result.votes.map((v) => v.poll.date ?? '');
    expect(dates).toEqual([...dates].sort().reverse());
    for (const v of result.votes) {
      expect(v.poll.title).toBeTruthy();
      expect(['yes', 'no', 'abstain', 'no_show']).toContain(v.choice);
      expect(v.poll.source.url).toMatch(/^https:\/\/www\.abgeordnetenwatch\.de\//);
    }
  });

  it('lässt Stimmen zu Abstimmungen anderer Wahlperioden weg', async () => {
    const { repo } = repoWith([
      ['/parliaments/5', parliamentFixture],
      ['/votes?', votesFixture],
      ['/polls?', { ...pollsFixture, data: pollsFixture.data.slice(0, 3) }],
    ]);
    const result = await repo.getVotes(70826);
    expect(result.votes).toHaveLength(3);
  });
});

describe('BundestagRepository – Kandidierende', () => {
  it('lädt die Kandidaturen der Wahl vor der aktuellen Wahlperiode, alphabetisch nach Nachnamen', async () => {
    const { repo, fetchImpl } = repoWith([
      ['/parliaments/5', parliamentFixture],
      ['/parliament-periods/161', periodFixture],
      ['/candidacies-mandates', candidaciesFixture],
      ['/politicians?', candidatePeopleFixture],
    ]);
    const result = await repo.getCandidates(192);
    expect(result.electionLabel).toBe(periodFixture.data.previous_period.label);
    expect(result.candidates).toHaveLength(candidaciesFixture.data.length);
    const lastNames = result.candidates.map((c) => c.lastName);
    expect(lastNames).toEqual([...lastNames].sort((a, b) => a.localeCompare(b, 'de')));
    expect(result.candidates.every((c) => c.party)).toBe(true);

    const urls = fetchImpl.mock.calls.map(([u]) => decodeURIComponent(String(u)));
    expect(
      urls.some(
        (u) =>
          u.includes(`parliament_period=${periodFixture.data.previous_period.id}`) &&
          u.includes('type=candidacy') &&
          u.includes('constituency_nr=192'),
      ),
    ).toBe(true);
  });
});
