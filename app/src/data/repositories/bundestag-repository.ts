/**
 * Bundestag: setzt die Quellen zum internen Datenmodell zusammen.
 * Aktuell nur abgeordnetenwatch; DIP folgt in Meilenstein 2.
 */
import type {
  Candidacy,
  Mandate,
  MemberListEntry,
  ParliamentTerm,
  Politician,
  SourceRef,
  PollResult,
  PollVote,
  Representative,
} from '@/domain/model';
import { compareByName, sortByName, sortedFractions } from '@/domain/representatives';
import { AbgeordnetenwatchClient, BUNDESTAG_ID } from '@/data/sources/abgeordnetenwatch/client';
import {
  countVotes,
  mapCandidacy,
  mapMandate,
  mapMemberListEntry,
  mapPolitician,
  mapPoll,
  mapReasonNoShow,
  mapVoteChoice,
  sourceRef,
  stripPeriodSuffix,
} from '@/data/sources/abgeordnetenwatch/mappers';
import { questionsPageUrl } from '@/data/sources/abgeordnetenwatch/links';
import type { AwPolitician } from '@/data/sources/abgeordnetenwatch/schemas';

export type CandidatesResult = {
  electionLabel: string;
  candidates: Candidacy[];
  retrievedAt: string;
};

export type VotesResult = {
  /** Name der Person laut Quelle; `null`, wenn zum Mandat keine Stimmen vorliegen. */
  personName: string | null;
  votes: PollVote[];
  /** Anzahl aller namentlichen Abstimmungen der Wahlperiode (zur Einordnung). */
  totalPollsInTerm: number;
  termLabel: string;
  retrievedAt: string;
};

export type RepresentativesResult = {
  term: ParliamentTerm;
  constituencyNumber: number;
  representatives: Representative[];
  retrievedAt: string;
};

export type ProfileResult = {
  politician: Politician;
  /** Aktuelles Bundestagsmandat, falls vorhanden. */
  mandate: Mandate | null;
  /** Seite „Fragen & Antworten“ des Profils bei abgeordnetenwatch.de (dort „Frage stellen“). */
  questionsUrl: string | null;
  retrievedAt: string;
};

export type MembersResult = {
  term: ParliamentTerm;
  /** Aktive Mandate, alphabetisch nach Nachname, dann Vorname. */
  members: MemberListEntry[];
  /** Alle vorkommenden Fraktionen, alphabetisch, „fraktionslos“ zuletzt. */
  fractions: string[];
  retrievedAt: string;
  source: SourceRef;
};

const TERM_TTL_MS = 6 * 60 * 60 * 1000;

export class BundestagRepository {
  private termCache: { term: ParliamentTerm; at: number } | null = null;

  constructor(
    private readonly aw: AbgeordnetenwatchClient = new AbgeordnetenwatchClient(),
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Aktuelle Wahlperiode – wird von der API ermittelt, nicht fest eingebaut. */
  async getCurrentTerm(): Promise<ParliamentTerm> {
    const nowMs = this.now().getTime();
    if (this.termCache && nowMs - this.termCache.at < TERM_TTL_MS) return this.termCache.term;
    const { data } = await this.aw.getParliament(BUNDESTAG_ID);
    if (!data.current_project) throw new Error('Keine aktuelle Wahlperiode gefunden.');
    const term = { id: data.current_project.id, label: data.current_project.label };
    this.termCache = { term, at: nowMs };
    return term;
  }

  /** Alle aktuellen Bundestagsabgeordneten, die im Wahlkreis gewählt wurden oder kandidiert haben. */
  async getRepresentatives(constituencyNumber: number): Promise<RepresentativesResult> {
    const term = await this.getCurrentTerm();
    const retrievedAt = this.now().toISOString();
    const mandatesRes = await this.aw.getMandatesByConstituency(term.id, constituencyNumber);
    const active = mandatesRes.data.filter((m) => !m.end_date);
    const peopleRes = await this.aw.getPoliticians(active.map((m) => m.politician.id));
    const people = new Map(peopleRes.data.map((p) => [p.id, p]));

    const representatives: Representative[] = [];
    for (const m of active) {
      const p = people.get(m.politician.id);
      if (!p) continue; // sollte nicht vorkommen; lieber weglassen als falsch anzeigen
      representatives.push({
        mandate: mapMandate(m, retrievedAt, mandatesRes.license),
        politician: mapPolitician(p, retrievedAt, peopleRes.license),
      });
    }
    return { term, constituencyNumber, representatives: sortByName(representatives), retrievedAt };
  }

  /** Kandidierende im Wahlkreis bei der Wahl, aus der die aktuelle Wahlperiode hervorging. */
  async getCandidates(constituencyNumber: number): Promise<CandidatesResult> {
    const term = await this.getCurrentTerm();
    const { data: period } = await this.aw.getParliamentPeriod(term.id);
    if (!period.previous_period) throw new Error('Keine Wahl zur aktuellen Wahlperiode gefunden.');
    const retrievedAt = this.now().toISOString();
    const res = await this.aw.getCandidaciesByConstituency(period.previous_period.id, constituencyNumber);
    const { people } = await this.fetchPeople(res.data.map((m) => m.politician.id));
    const candidates = res.data
      .map((m) => mapCandidacy(m, retrievedAt, res.license))
      .map((c) => ({ ...c, lastName: people.get(c.politicianId)?.last_name ?? c.name }))
      .sort((a, b) => a.lastName.localeCompare(b.lastName, 'de') || a.name.localeCompare(b.name, 'de'));
    return { electionLabel: period.previous_period.label, candidates, retrievedAt };
  }

  /**
   * Alle aktuellen Bundestagsabgeordneten der laufenden Wahlperiode.
   * Anfragen: Wahlperiode (zwischengespeichert), Mandate (eine Seite), Personen (eine Anfrage).
   */
  async getAllMembers(): Promise<MembersResult> {
    const term = await this.getCurrentTerm();
    const retrievedAt = this.now().toISOString();
    const mandatesRes = await this.aw.getMandatesOfPeriod(term.id);
    // Beendete Mandate liefert die API derzeit nicht mit; falls doch, tragen sie ein end_date.
    const active = mandatesRes.data.filter((m) => !m.end_date);
    // Nachnamen und Vornamen für die alphabetische Sortierung.
    const { people } = await this.fetchPeople(active.map((m) => m.politician.id));
    const members = active
      .map((m) => mapMemberListEntry(m, people.get(m.politician.id), retrievedAt, mandatesRes.license))
      .sort(compareByName);
    return {
      term,
      members,
      fractions: sortedFractions(members.map((m) => m.fraction)),
      retrievedAt,
      source: sourceRef('https://www.abgeordnetenwatch.de/bundestag/abgeordnete', retrievedAt, mandatesRes.license),
    };
  }

  /** Personendaten (u. a. Vor- und Nachname) zu vielen IDs in möglichst wenigen Anfragen. */
  private async fetchPeople(ids: number[]): Promise<{ people: Map<number, AwPolitician>; license: string | null }> {
    const unique = [...new Set(ids)];
    const res = await this.aw.getPoliticians(unique);
    return { people: new Map(res.data.map((p) => [p.id, p])), license: res.license };
  }

  /** Abstimmungsverhalten zu einem Mandat, neueste zuerst. */
  async getVotes(mandateId: number): Promise<VotesResult> {
    const term = await this.getCurrentTerm();
    const retrievedAt = this.now().toISOString();
    const [votesRes, pollsRes] = await Promise.all([
      this.aw.getVotesOfMandate(mandateId),
      this.aw.getPolls(term.id),
    ]);
    const polls = new Map(pollsRes.data.map((p) => [p.id, mapPoll(p, retrievedAt, pollsRes.license)]));
    const votes: PollVote[] = [];
    let personName: string | null = null;
    for (const v of votesRes.data) {
      if (v.mandate.id !== mandateId) continue; // nur Stimmen des angefragten Mandats
      personName ??= stripPeriodSuffix(v.mandate.label) || null;
      const poll = v.poll ? polls.get(v.poll.id) : undefined;
      if (!poll) continue; // Abstimmung einer anderen Wahlperiode
      votes.push({ poll, choice: mapVoteChoice(v.vote), reasonNoShow: mapReasonNoShow(v) });
    }
    votes.sort((a, b) => (b.poll.date ?? '').localeCompare(a.poll.date ?? '') || b.poll.id - a.poll.id);
    return { personName, votes, totalPollsInTerm: pollsRes.data.length, termLabel: term.label, retrievedAt };
  }

  /** Eine Abstimmung mit Ergebnis gesamt und je Fraktion. */
  async getPollResult(pollId: number): Promise<PollResult> {
    const retrievedAt = this.now().toISOString();
    const [pollRes, votesRes] = await Promise.all([this.aw.getPoll(pollId), this.aw.getVotesOfPoll(pollId)]);
    return {
      poll: mapPoll(pollRes.data, retrievedAt, pollRes.license),
      ...countVotes(votesRes.data),
      retrievedAt,
    };
  }

  async getProfile(politicianId: number): Promise<ProfileResult> {
    const term = await this.getCurrentTerm();
    const retrievedAt = this.now().toISOString();
    const [personRes, mandatesRes] = await Promise.all([
      this.aw.getPolitician(politicianId),
      this.aw.getMandatesOfPolitician(term.id, politicianId),
    ]);
    const current = mandatesRes.data.find((m) => !m.end_date) ?? mandatesRes.data[0];
    return {
      politician: mapPolitician(personRes.data, retrievedAt, personRes.license),
      mandate: current ? mapMandate(current, retrievedAt, mandatesRes.license) : null,
      questionsUrl: questionsPageUrl(personRes.data.abgeordnetenwatch_url),
      retrievedAt,
    };
  }
}
