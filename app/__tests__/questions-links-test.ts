import { BundestagRepository } from '@/data/repositories/bundestag-repository';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { questionsPageUrl } from '@/data/sources/abgeordnetenwatch/links';

import mandateMerz from './fixtures/aw-mandate-merz-161.json';
import parliament from './fixtures/aw-parliament-bundestag.json';
import searchMerz from './fixtures/aw-politician-search-merz.json';

describe('questionsPageUrl', () => {
  it('baut die Seite „Fragen & Antworten“ aus der Profil-URL', () => {
    expect(questionsPageUrl('https://www.abgeordnetenwatch.de/profile/friedrich-merz')).toBe(
      'https://www.abgeordnetenwatch.de/profile/friedrich-merz/fragen-antworten',
    );
    expect(questionsPageUrl('https://www.abgeordnetenwatch.de/profile/friedrich-merz/')).toBe(
      'https://www.abgeordnetenwatch.de/profile/friedrich-merz/fragen-antworten',
    );
  });

  it('nur echte Profil-Links von abgeordnetenwatch.de', () => {
    expect(questionsPageUrl(null)).toBeNull();
    expect(questionsPageUrl('http://www.abgeordnetenwatch.de/profile/x')).toBeNull();
    expect(questionsPageUrl('https://www.abgeordnetenwatch.de/bundestag')).toBeNull();
    expect(questionsPageUrl('https://evil.example/profile/x')).toBeNull();
    expect(questionsPageUrl('https://www.abgeordnetenwatch.de/profile/x?y=1')).toBeNull();
  });
});

describe('Profil mit Fragen-Link (echte Antworten als Fixture)', () => {
  it('liefert questionsUrl und die Fragen-Statistik', async () => {
    const person = (searchMerz as { data: unknown[] }).data[0];
    const fetchImpl = jest.fn(async (url: string) => {
      const body = url.includes('/parliaments/5')
        ? parliament
        : url.includes('candidacies-mandates')
          ? mandateMerz
          : { ...searchMerz, meta: { ...searchMerz.meta, result: {} }, data: person };
      return { ok: true, status: 200, json: async () => body, headers: { get: () => null } };
    });
    const repo = new BundestagRepository(
      new AbgeordnetenwatchClient({ fetchImpl: fetchImpl as unknown as typeof fetch, retries: 0 }),
    );
    const profile = await repo.getProfile(118559);
    expect(profile.questionsUrl).toBe('https://www.abgeordnetenwatch.de/profile/friedrich-merz/fragen-antworten');
    expect(profile.politician.citizenQuestions?.asked).toEqual(expect.any(Number));
    expect(profile.mandate?.end).toBeNull();
  });
});
