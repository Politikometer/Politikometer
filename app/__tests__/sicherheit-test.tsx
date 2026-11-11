/**
 * Sicherheitsprüfung vom 11.11.2026.
 *
 * Wichtigster Befund: Name und Stimme auf der Abstimmungsseite kamen aus der Adresse. Ein präparierter
 * Link (politikometer://abstimmung/123?person=…&vote=yes) hätte einer beliebigen Person eine beliebige
 * Stimme zuschreiben können. Jetzt stehen in der Adresse nur Kennungen; Name und Stimme lädt die App
 * aus der Quelle.
 */
import { render, screen } from '@testing-library/react-native';

import PollScreen from '@/app/abstimmung/[pollId]';
import VotesScreen from '@/app/abstimmungen/[mandateId]';
import PlzScreen from '@/app/plz/[plz]';
import { BundestagRepository } from '@/data/repositories/bundestag-repository';
import { AbgeordnetenwatchClient } from '@/data/sources/abgeordnetenwatch/client';
import { extractOfficialLinks, htmlToText } from '@/data/sources/abgeordnetenwatch/html';
import type { Poll, PollVote } from '@/domain/model';
import { findPersonVote, parseRouteId } from '@/domain/votes';

import parliamentFixture from './fixtures/aw-parliament-bundestag.json';
import pollsFixture from './fixtures/aw-polls-161-subset.json';
import votesFixture from './fixtures/aw-votes-mandate-70826.json';

// Node-Module ohne @types/node (wie in regierung-snapshot-test.ts)
declare const __dirname: string;
declare function require(name: string): unknown;
const { readdirSync, readFileSync, statSync } = require('fs') as {
  readdirSync(p: string): string[];
  readFileSync(p: string, encoding: 'utf8'): string;
  statSync(p: string): { isDirectory(): boolean };
};
const path = require('path') as { join(...parts: string[]): string; relative(from: string, to: string): string };

const mockParams = jest.fn((): Record<string, string | string[] | undefined> => ({}));
const mockPollResult = jest.fn();
const mockVotes = jest.fn();

jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams(),
  useRouter: () => ({ push: jest.fn(), dismissTo: jest.fn(), back: jest.fn() }),
  Redirect: () => null,
  Stack: { Screen: () => null },
}));

jest.mock('@/features/bundestag/hooks', () => ({
  usePollResult: (id: number | null) => mockPollResult(id),
  useVotes: (id: number | null) => mockVotes(id),
}));

const POLL: Poll = {
  id: 6731,
  title: 'Verlängerung des Bundeswehreinsatzes im Südsudan (UNMISS)',
  date: '2026-03-20',
  accepted: true,
  description: null,
  topics: [],
  documents: [],
  source: {
    publisher: 'abgeordnetenwatch.de',
    url: 'https://www.abgeordnetenwatch.de/bundestag/21/abstimmungen/test',
    license: 'CC0 1.0',
    retrievedAt: '2026-11-11T10:00:00.000Z',
  },
} as unknown as Poll;

const VOTE: PollVote = { poll: POLL, choice: 'no', reasonNoShow: null } as PollVote;

function loaded<T>(data: T) {
  return { data, isPending: false, isError: false, error: null, fetchStatus: 'idle', refetch: jest.fn() };
}
const disabled = { data: undefined, isPending: true, isError: false, error: null, fetchStatus: 'idle', refetch: jest.fn() };

const POLL_RESULT = {
  poll: POLL,
  totals: { yes: 400, no: 200, abstain: 10, no_show: 20 },
  byFraction: [],
  retrievedAt: '2026-11-11T10:00:00.000Z',
};
const VOTES_RESULT = {
  personName: 'Katrin Zschau',
  votes: [VOTE],
  totalPollsInTerm: 1,
  termLabel: 'Bundestag 2025 - 2029',
  retrievedAt: '2026-11-11T10:00:00.000Z',
};

beforeEach(() => {
  mockParams.mockReset();
  mockPollResult.mockReset().mockReturnValue(loaded(POLL_RESULT));
  mockVotes.mockReset().mockImplementation((id: number | null) => (id === 70826 ? loaded(VOTES_RESULT) : disabled));
});

describe('Kennungen aus der Adresse', () => {
  it('nimmt nur reine Ziffernfolgen größer null an', () => {
    expect(parseRouteId('70826')).toBe(70826);
    for (const bad of ['', '0', '-1', '1e3', '0x10', '12abc', ' 12', '1.5', '1234567890123', undefined, null, ['1', '2'], 12]) {
      expect(parseRouteId(bad)).toBeNull();
    }
  });
});

describe('Stimme einer Person nur aus geladenen Daten', () => {
  it('findet die Stimme im Abstimmungsverhalten des Mandats', () => {
    expect(findPersonVote(VOTES_RESULT, 6731)).toEqual({ personName: 'Katrin Zschau', vote: VOTE });
  });

  it('zeigt nichts ohne Daten, ohne Namen oder wenn die Abstimmung nicht dabei ist', () => {
    expect(findPersonVote(undefined, 6731)).toBeNull();
    expect(findPersonVote(VOTES_RESULT, 1)).toBeNull();
    expect(findPersonVote(VOTES_RESULT, null)).toBeNull();
    expect(findPersonVote({ ...VOTES_RESULT, personName: null }, 6731)).toBeNull();
    // alter gespeicherter Stand ohne das Feld
    expect(findPersonVote({ votes: [VOTE] }, 6731)).toBeNull();
  });
});

describe('Abstimmungsseite: präparierter Link', () => {
  it('ignoriert Name und Stimme aus der Adresse', async () => {
    mockParams.mockReturnValue({ pollId: '6731', person: 'Erika Mustermann', vote: 'yes' });
    await render(<PollScreen />);
    expect(screen.getByText(POLL.title)).toBeTruthy();
    expect(screen.queryByText(/Stimme von/)).toBeNull();
    expect(screen.queryByText(/Erika Mustermann/)).toBeNull();
  });

  it('zeigt Name und Stimme aus der Quelle, auch wenn die Adresse etwas anderes behauptet', async () => {
    mockParams.mockReturnValue({ pollId: '6731', mandate: '70826', person: 'Erika Mustermann', vote: 'yes' });
    await render(<PollScreen />);
    expect(screen.getByText('Stimme von Katrin Zschau')).toBeTruthy();
    // „Nein“ steht einmal in der Ergebnistabelle und einmal als Stimme der Person.
    expect(screen.getAllByText('Nein')).toHaveLength(2);
    expect(screen.queryByText(/Erika Mustermann/)).toBeNull();
    expect(mockVotes).toHaveBeenCalledWith(70826);
  });

  it('lädt nichts bei ungültiger Kennung und zeigt einen Hinweis', async () => {
    mockParams.mockReturnValue({ pollId: '6731abc', mandate: '1e3' });
    mockPollResult.mockReturnValue(disabled);
    await render(<PollScreen />);
    expect(mockPollResult).toHaveBeenCalledWith(null);
    expect(mockVotes).toHaveBeenCalledWith(null);
    expect(screen.getByText(/Diese Seite gibt es nicht/)).toBeTruthy();
  });
});

describe('Liste aller Abstimmungen: präparierter Link', () => {
  it('nimmt die Überschrift aus der Quelle, nicht aus der Adresse', async () => {
    mockParams.mockReturnValue({ mandateId: '70826', person: 'Erika Mustermann' });
    await render(<VotesScreen />);
    expect(screen.getByText('Katrin Zschau')).toBeTruthy();
    expect(screen.queryByText(/Erika Mustermann/)).toBeNull();
  });
});

describe('PLZ-Seite: präparierter Link', () => {
  it('zeigt fremden Text aus der Adresse nicht an', async () => {
    mockParams.mockReturnValue({ plz: 'Die Wahl wurde abgesagt' });
    await render(<PlzScreen />);
    expect(screen.getByText(/keine gültige Postleitzahl/)).toBeTruthy();
    expect(screen.queryByText(/Wahl wurde abgesagt/)).toBeNull();
  });
});

describe('Quelltext: keine Namen oder Stimmen über die Adresse', () => {
  function files(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
      const full = path.join(dir, name);
      return statSync(full).isDirectory() ? files(full) : /\.tsx?$/.test(name) ? [full] : [];
    });
  }

  it('gibt bei der Navigation nur Kennungen weiter', () => {
    const src = path.join(__dirname, '..', 'src');
    for (const file of files(src)) {
      const text = readFileSync(file, 'utf8');
      for (const m of text.matchAll(/params:\s*\{([^}]*)\}/g)) {
        const keys = [...m[1].matchAll(/(\w+)\s*:/g)].map((k) => k[1]);
        for (const key of keys) {
          expect({ file: path.relative(src, file), key, ok: /^(\w*[iI]d|mandate|nr|plz|qid|thema)$/.test(key) }).toEqual({
            file: path.relative(src, file),
            key,
            ok: true,
          });
        }
      }
    }
  });
});

describe('Repository: Name der Person aus den Abstimmungsdaten', () => {
  function jsonResponse(body: unknown) {
    return { status: 200, ok: true, headers: { get: () => null }, json: async () => body } as unknown as Response;
  }
  function repoWith(votes: unknown) {
    const fetchImpl = jest.fn(async (input: RequestInfo | URL) => {
      const url = decodeURIComponent(String(input));
      if (url.includes('/parliaments/5')) return jsonResponse(parliamentFixture);
      if (url.includes('/votes?')) return jsonResponse(votes);
      if (url.includes('/polls?')) return jsonResponse(pollsFixture);
      throw new Error(`Unerwartete URL: ${url}`);
    });
    return new BundestagRepository(new AbgeordnetenwatchClient({ fetchImpl }), () => new Date('2026-11-11T12:00:00.000Z'));
  }

  it('liefert den Namen ohne Zusatz der Wahlperiode', async () => {
    const result = await repoWith(votesFixture).getVotes(70826);
    expect(result.personName).toBe('Katrin Zschau');
  });

  it('übernimmt keine Stimmen und keinen Namen eines anderen Mandats', async () => {
    const [first, ...rest] = votesFixture.data;
    const foreign = { ...first, mandate: { ...first.mandate, id: 99999, label: 'Erika Mustermann (Bundestag 2025 - 2029)' } };
    const all = await repoWith(votesFixture).getVotes(70826);
    const result = await repoWith({ ...votesFixture, data: [foreign, ...rest] }).getVotes(70826);
    expect(result.personName).toBe('Katrin Zschau');
    expect(result.votes).toHaveLength(all.votes.length - 1);
  });

  it('hat ohne Stimmen keinen Namen', async () => {
    const result = await repoWith({ ...votesFixture, data: [] }).getVotes(70826);
    expect(result.personName).toBeNull();
    expect(result.votes).toEqual([]);
  });
});

describe('HTML aus der Quelle', () => {
  it('bricht bei ungültigen Zeichenangaben nicht ab', () => {
    expect(htmlToText('<p>A&#99999999999;B&#55357;C&#0;D&#228;</p>')).toBe('A&#99999999999;B&#55357;C&#0;Dä');
  });

  it('übernimmt nur verschlüsselte Links auf offizielle Seiten', () => {
    const html =
      '<a href="https://dserver.bundestag.de/btd/21/001/2100100.pdf">Drucksache</a>' +
      '<a href="http://www.bundestag.de/unverschluesselt">alt</a>' +
      '<a href="javascript://www.bundestag.de/%0aalert(1)">x</a>' +
      '<a href="https://www.bundestag.de@example.org/">y</a>' +
      '<a href="https://www.bundestag.de.example.org/">z</a>';
    expect(extractOfficialLinks(html).map((l) => l.url)).toEqual(['https://dserver.bundestag.de/btd/21/001/2100100.pdf']);
  });
});
