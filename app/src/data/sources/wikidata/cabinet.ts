/**
 * Ermittelt das amtierende Bundeskabinett aus Wikidata-Rohdaten – ohne zu raten.
 *
 * Quellen innerhalb von Wikidata (beide CC0):
 * 1. Der Kabinett-Eintrag (z. B. „Kabinett Merz“) nennt seine Mitglieder mit Rolle und Beginn.
 * 2. Die Personen-Einträge nennen ihre Ämter (P39) mit Beginn, Ende, Vorgänger und Nachfolger.
 * Beide werden nicht immer gleichzeitig gepflegt (Stand 31.10.2026: Der Kabinett-Eintrag nennt
 * noch Ämter, die laut Personen-Eintrag am 29.07.2026 endeten). Deshalb gilt:
 * - Ein eingetragenes Ende ist stärker als ein fehlendes Ende (wer ausgeschieden ist, ist es).
 * - Wird jemand ausdrücklich als Vorgänger einer neuen Amtsinhaberin genannt, ist er es nicht mehr.
 * - Nennt die Quelle für ein Ressort nicht genau eine Person, zeigen wir „keine eindeutige Angabe“.
 * - Ämter derselben Bezeichnung gelten als dasselbe Ressort (Wikidata hat teils doppelte Einträge,
 *   z. B. zwei für „Bundesminister für Verkehr“).
 */
import type {
  Cabinet,
  CabinetEntry,
  CabinetMember,
  CabinetOffice,
  UnclearCabinetOffice,
} from '@/domain/government';

import { WD } from './ids';
import { sourceRef } from './mappers';
import { dateOf, entityOf, literalOf, rankOf, type SparqlBinding } from './sparql';

export type CabinetCandidate = { id: string; name: string | null; since: string | null };

/** Kabinette, die am Stichtag bestehen: Beginn erreicht, kein Ende (oder Ende in der Zukunft). */
export function selectCurrentCabinets(rows: SparqlBinding[], today: string): CabinetCandidate[] {
  const byId = new Map<string, CabinetCandidate & { ended: boolean; started: boolean }>();
  for (const b of rows) {
    const id = entityOf(b, 'cabinet');
    if (!id) continue;
    const start = dateOf(b, 'start');
    const end = dateOf(b, 'end');
    const prev = byId.get(id);
    const ended = end.unknown || (!!end.date && end.date <= today);
    const started = !!start.date && start.date <= today;
    byId.set(id, {
      id,
      name: prev?.name ?? literalOf(b, 'cabinetLabel'),
      since: prev?.since ?? start.date,
      ended: (prev?.ended ?? false) || ended,
      started: (prev?.started ?? false) || started,
    });
  }
  return [...byId.values()]
    .filter((c) => c.started && !c.ended)
    .map(({ id, name, since }) => ({ id, name, since }));
}

/** Alle Ämter, die im Kabinett vorkommen (Rolle eines Mitglieds oder Amt mit Kabinettsbezug). */
export function rolesOf(membershipRows: SparqlBinding[]): string[] {
  const roles = new Set<string>();
  for (const b of membershipRows) {
    const role = entityOf(b, 'role');
    if (role) roles.add(role);
  }
  return [...roles].sort();
}

const TITLE_HEAD = /^(Bundesminister|Bundeskanzler|Vizekanzler|Staatsminister|Chef)(in)?(?=\s|$)/;

/**
 * Amtsbezeichnung passend zum Geschlecht laut Quelle. Wikidata führt die Bezeichnungen teils nur
 * in einer Form („Bundesminister für Wirtschaft und Energie“ auch für eine Ministerin).
 * Geändert wird nur das erste Wort bei bekannten Amtsbezeichnungen; sonst bleibt der Text, wie er ist.
 */
export function genderedTitle(label: string, sex: 'female' | 'male' | null): string {
  if (!sex) return label;
  return label.replace(TITLE_HEAD, (_m, head: string) => (sex === 'female' ? `${head}in` : head));
}

/** Schlüssel eines Ressorts: Bezeichnung ohne weibliche Endung, ohne Groß/klein. */
export function ressortKey(label: string): string {
  return label.replace(TITLE_HEAD, '$1').replace(/\s+/g, ' ').trim().toLocaleLowerCase('de');
}

/** Sortierwort: „Bundesministerin der Finanzen“ → „Finanzen“, „Bundesministerium für Gesundheit“ → „Gesundheit“. */
export function ressortSortKey(title: string): string {
  return title
    .replace(TITLE_HEAD, '')
    .replace(/^Bundesministerium(?=\s)/, '')
    .trim()
    .replace(/^(der|des|für)\s+/, '');
}

type Statement = {
  id: string;
  person: string;
  role: string;
  start: string | null;
  end: string | null;
  endUnknown: boolean;
  /** Steht im Kabinett-Eintrag oder ist ausdrücklich diesem Kabinett zugeordnet. */
  inCabinet: boolean;
  replaces: Set<string>;
  replacedBy: Set<string>;
};

type RoleInfo = { label: string | null; ministries: Set<string> };
type PersonInfo = {
  label: string | null;
  sex: 'female' | 'male' | null;
  parties: Map<string, { label: string | null; shortName: string | null; preferred: boolean }>;
};

function collect(rows: SparqlBinding[], inCabinetByKind: boolean) {
  const statements = new Map<string, Statement>();
  const roles = new Map<string, RoleInfo>();
  const persons = new Map<string, PersonInfo>();
  for (const b of rows) {
    const id = b.st?.value;
    const person = entityOf(b, 'person');
    const role = entityOf(b, 'role');
    if (!id || !person || !role) continue;

    const r = roles.get(role) ?? { label: null, ministries: new Set<string>() };
    r.label ??= literalOf(b, 'roleLabel');
    const ministry = literalOf(b, 'ministryLabel');
    if (ministry) r.ministries.add(ministry);
    roles.set(role, r);

    const p = persons.get(person) ?? { label: null, sex: null, parties: new Map() };
    p.label ??= literalOf(b, 'personLabel');
    const sex = entityOf(b, 'sex');
    if (!p.sex && sex) p.sex = sex === WD.female ? 'female' : sex === WD.male ? 'male' : null;
    const party = entityOf(b, 'party');
    if (party) {
      const prev = p.parties.get(party);
      p.parties.set(party, {
        label: prev?.label ?? literalOf(b, 'partyLabel'),
        shortName: prev?.shortName ?? literalOf(b, 'partyShort'),
        preferred: (prev?.preferred ?? false) || rankOf(b, 'partyRank') === 'preferred',
      });
    }
    persons.set(person, p);

    if (rankOf(b) === 'deprecated') continue;
    const start = dateOf(b, 'start');
    const end = dateOf(b, 'end');
    const s = statements.get(id) ?? {
      id,
      person,
      role,
      start: start.date,
      end: end.date,
      endUnknown: end.unknown,
      inCabinet: false,
      replaces: new Set<string>(),
      replacedBy: new Set<string>(),
    };
    if (inCabinetByKind || entityOf(b, 'cab')) s.inCabinet = true;
    const replaces = entityOf(b, 'replaces');
    if (replaces) s.replaces.add(replaces);
    const replacedBy = entityOf(b, 'replacedBy');
    if (replacedBy) s.replacedBy.add(replacedBy);
    statements.set(id, s);
  }
  return { statements, roles, persons };
}

function mergeInto<K, V>(target: Map<K, V>, source: Map<K, V>, merge: (a: V, b: V) => V) {
  for (const [k, v] of source) {
    const prev = target.get(k);
    target.set(k, prev ? merge(prev, v) : v);
  }
}

type Holding = { person: string; since: string | null; statements: Statement[] };

/**
 * Hat die Person das Amt am Stichtag inne? Maßgeblich sind gültige Aussagen, die nach dem letzten
 * eingetragenen Ende beginnen (z. B. erneute Ernennung im neuen Kabinett).
 */
function holdingOf(person: string, own: Statement[], today: string): Holding | null {
  const ended = own.filter((s) => s.endUnknown || (!!s.end && s.end <= today));
  if (ended.some((s) => s.endUnknown)) return null;
  const latestEnd = ended.map((s) => s.end!).sort().at(-1) ?? null;
  const open = own.filter(
    (s) => !ended.includes(s) && (!s.start || s.start <= today) && (latestEnd ? !!s.start && s.start >= latestEnd : true),
  );
  if (open.length === 0) return null;
  const starts = [...new Set(open.map((s) => s.start).filter((d): d is string => !!d))];
  return { person, since: starts.length === 1 ? starts[0] : null, statements: open };
}

export type BuildCabinetInput = {
  cabinet: CabinetCandidate;
  membershipRows: SparqlBinding[];
  holderRows: SparqlBinding[];
  today: string;
  retrievedAt: string;
};

export function buildCabinet({ cabinet, membershipRows, holderRows, today, retrievedAt }: BuildCabinetInput): Cabinet {
  // In der Mitgliedschaftsabfrage gehört jede Zeile zum Kabinett (P527 oder P5054).
  const a = collect(membershipRows, true);
  const b = collect(holderRows, false);
  const statements = a.statements;
  mergeInto(statements, b.statements, (x, y) => ({
    ...x,
    inCabinet: x.inCabinet || y.inCabinet,
    replaces: new Set([...x.replaces, ...y.replaces]),
    replacedBy: new Set([...x.replacedBy, ...y.replacedBy]),
  }));
  const roles = a.roles;
  mergeInto(roles, b.roles, (x, y) => ({ label: x.label ?? y.label, ministries: new Set([...x.ministries, ...y.ministries]) }));
  const persons = a.persons;
  mergeInto(persons, b.persons, (x, y) => ({
    label: x.label ?? y.label,
    sex: x.sex ?? y.sex,
    parties: new Map([...y.parties, ...x.parties]),
  }));

  const cabinetStart = cabinet.since ?? '0000-00-00';
  const relevant = [...statements.values()].filter(
    (s) => s.inCabinet || (!!s.start && s.start >= cabinetStart) || (!!s.end && s.end >= cabinetStart),
  );

  // Ressorts: Ämter gleicher Bezeichnung zusammenfassen.
  const ressorts = new Map<string, { roles: string[]; statements: Statement[] }>();
  for (const role of rolesOf(membershipRows)) {
    const label = roles.get(role)?.label;
    if (!label) continue; // ohne deutsche Bezeichnung nicht anzeigbar
    const key = ressortKey(label);
    const r = ressorts.get(key) ?? { roles: [], statements: [] };
    r.roles.push(role);
    ressorts.set(key, r);
  }
  for (const s of relevant) {
    const label = roles.get(s.role)?.label;
    const r = label ? ressorts.get(ressortKey(label)) : undefined;
    if (r) r.statements.push(s);
  }

  const held = new Map<string, { offices: (CabinetOffice & { roles: string[] })[] }>();
  const unclear: UnclearCabinetOffice[] = [];

  for (const r of ressorts.values()) {
    const byPerson = new Map<string, Statement[]>();
    for (const s of r.statements) byPerson.set(s.person, [...(byPerson.get(s.person) ?? []), s]);
    const holdings = [...byPerson]
      .map(([person, own]) => holdingOf(person, own, today))
      .filter((h): h is Holding => !!h)
      // Ausdrücklich ersetzt: Eine neuere Aussage nennt die Person als Vorgänger.
      .filter(
        (h) =>
          !r.statements.some(
            (s) =>
              s.person !== h.person &&
              s.replaces.has(h.person) &&
              !!s.start &&
              s.start <= today &&
              (!h.since || s.start > h.since),
          ),
      );

    const ministry = r.roles.map((id) => [...(roles.get(id)?.ministries ?? [])][0]).find(Boolean) ?? null;
    const mainRole = r.roles.find((id) => roles.get(id)?.ministries.size) ?? r.roles[0];
    const label = roles.get(mainRole)!.label!;

    if (holdings.length === 1) {
      const h = holdings[0];
      const person = persons.get(h.person);
      const entry = held.get(h.person) ?? { offices: [] };
      entry.offices.push({
        title: genderedTitle(label, person?.sex ?? null),
        wikidataId: mainRole,
        ministry,
        since: h.since,
        roles: r.roles,
      });
      held.set(h.person, entry);
      continue;
    }
    const hasSuccessor = r.statements.some((s) => s.replacedBy.size > 0);
    // Ein Zusatzamt ohne Behörde (z. B. „Vizekanzler“), das ohne Nachfolge endete, entfällt.
    if (holdings.length === 0 && !ministry && !hasSuccessor) continue;
    unclear.push({
      kind: 'unclear',
      title: ministry ?? label,
      wikidataId: mainRole,
      reason:
        holdings.length === 0
          ? 'Die Quelle nennt für dieses Amt derzeit keine amtierende Person.'
          : 'Die Quelle nennt für dieses Amt derzeit mehr als eine amtierende Person.',
      source: sourceRef(mainRole, retrievedAt),
    });
  }

  const members: CabinetMember[] = [];
  for (const [id, { offices }] of held) {
    const person = persons.get(id);
    if (!person?.label) continue;
    offices.sort((x, y) => Number(!x.ministry) - Number(!y.ministry) || x.title.localeCompare(y.title, 'de'));
    members.push({
      kind: 'member',
      wikidataId: id,
      name: person.label,
      offices: offices.map(({ roles: _roles, ...o }) => o),
      isHeadOfGovernment: offices.some((o) => o.roles.includes(WD.chancellorOffice)),
      party: partyOf(person),
      source: sourceRef(id, retrievedAt),
    });
  }

  return {
    wikidataId: cabinet.id,
    name: cabinet.name,
    since: cabinet.since,
    entries: sortEntries([...members, ...unclear]),
    source: sourceRef(cabinet.id, retrievedAt),
  };
}

/** Partei nur, wenn eindeutig (bei mehreren gültigen Aussagen entscheidet „bevorzugt“). */
function partyOf(person: PersonInfo): CabinetMember['party'] {
  let parties = [...person.parties];
  if (parties.length > 1) parties = parties.filter(([, p]) => p.preferred);
  if (parties.length !== 1) return null;
  const [id, p] = parties[0];
  if (id === WD.independent) return { name: 'parteilos', shortName: null };
  return p.label ? { name: p.label, shortName: p.shortName } : null;
}

function primaryTitle(e: CabinetEntry): string {
  return e.kind === 'member' ? (e.offices[0]?.ministry ?? e.offices[0]?.title ?? '') : e.title;
}

/**
 * Reihenfolge: Kanzler/in zuerst (leitet die Regierung), danach alphabetisch nach Ressort.
 * Eine amtliche Reihenfolge ist in der Quelle nicht maschinenlesbar enthalten.
 */
export function sortEntries(entries: CabinetEntry[]): CabinetEntry[] {
  const head = (e: CabinetEntry) => (e.kind === 'member' && e.isHeadOfGovernment ? 0 : 1);
  return [...entries].sort(
    (x, y) =>
      head(x) - head(y) ||
      ressortSortKey(primaryTitle(x)).localeCompare(ressortSortKey(primaryTitle(y)), 'de', { sensitivity: 'base' }) ||
      (x.kind === 'member' ? x.name : x.title).localeCompare(y.kind === 'member' ? y.name : y.title, 'de'),
  );
}
