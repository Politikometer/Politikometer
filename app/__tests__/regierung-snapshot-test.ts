/**
 * Mitgelieferter Stand der Bundesregierung (assets/data/regierung.json, erzeugt mit
 * `npm run regierung`) und Schutz davor, dass die App Wikidata wieder live abfragt.
 */
import {
  governmentSnapshotSchema,
  isSnapshotStale,
  parseGovernmentSnapshot,
  SNAPSHOT_STALE_DAYS,
  snapshotAgeDays,
} from '@/data/sources/local/government-snapshot-schema';
import { sourceLine } from '@/ui/components/SourceNote';

import shipped from '../assets/data/regierung.json';

// Ohne @types/node: nur die benötigten Node-Funktionen, schmal typisiert.
type Dirent = { name: string; isDirectory(): boolean };
const fs: {
  readdirSync(p: string, o: { withFileTypes: true }): Dirent[];
  readFileSync(p: string, encoding: 'utf8'): string;
} = require('fs');
const path: { join(...parts: string[]): string } = require('path');
declare const __dirname: string;

describe('assets/data/regierung.json', () => {
  it('ist gültig (Schema) und hat Quelle Wikidata mit Lizenz CC0', () => {
    expect(() => governmentSnapshotSchema.parse(shipped)).not.toThrow();
    const snap = parseGovernmentSnapshot(shipped);
    expect(snap.source).toMatchObject({ publisher: 'Wikidata', license: 'CC0 1.0' });
    expect(snap.source.url).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\/Q\d+$/);
    for (const e of snap.cabinet.entries) {
      expect(e.source.url).toMatch(/^https:\/\/www\.wikidata\.org\/wiki\//);
      expect(e.source.snapshot).toBe(true);
    }
  });

  it('enthält genau eine Kanzlerin oder einen Kanzler – dieselbe Person wie im Kabinett', () => {
    const snap = parseGovernmentSnapshot(shipped);
    const heads = snap.cabinet.entries.filter((e) => e.kind === 'member' && e.isHeadOfGovernment);
    expect(heads).toHaveLength(1);
    expect(heads[0].wikidataId).toBe(snap.chancellor.wikidataId);
    expect(snap.chancellor.title).toMatch(/^Bundeskanzler(in)?$/);
  });

  it('nennt Mitglieder alphabetisch nach Ressort, Kanzler/in zuerst', () => {
    const snap = parseGovernmentSnapshot(shipped);
    expect(snap.cabinet.entries[0]).toMatchObject({ kind: 'member', isHeadOfGovernment: true });
    expect(snap.cabinet.entries.filter((e) => e.kind === 'member').length).toBeGreaterThan(10);
  });

  it('lehnt eine Datei mit falschem Format ab', () => {
    expect(() => parseGovernmentSnapshot({ ...shipped, format: 2 })).toThrow();
    expect(() => parseGovernmentSnapshot({ ...shipped, chancellor: null })).toThrow();
  });
});

describe('Stand und Hinweis „möglicherweise veraltet“', () => {
  const snap = { retrievedAt: '2026-11-05T10:00:00.000Z' };

  it(`gilt erst nach ${SNAPSHOT_STALE_DAYS} Tagen als veraltet`, () => {
    expect(snapshotAgeDays(snap, new Date('2026-11-06T10:00:00.000Z'))).toBe(1);
    expect(isSnapshotStale(snap, new Date('2027-01-04T10:00:00.000Z'))).toBe(false); // 60 Tage
    expect(isSnapshotStale(snap, new Date('2027-01-05T10:00:00.000Z'))).toBe(true); // 61 Tage
  });

  it('zeigt „Quelle: Wikidata (CC0 1.0), Stand: …“ statt „abgerufen am“', () => {
    const line = sourceLine({
      publisher: 'Wikidata',
      url: 'https://www.wikidata.org/wiki/Q566257',
      license: 'CC0 1.0',
      retrievedAt: '2026-11-05T10:00:00.000Z',
      snapshot: true,
    });
    expect(line).toBe('Quelle: Wikidata (CC0 1.0), Stand: 05.11.2026');
    const live = sourceLine({ publisher: 'DIP', url: 'https://dip.bundestag.de/', license: 'x', retrievedAt: '2026-11-05T10:00:00.000Z' });
    expect(live).toContain('abgerufen am');
  });
});

describe('Keine Laufzeit-Abfragen an Wikidata', () => {
  function sourceFiles(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d: Dirent) => {
      const p = path.join(dir, d.name);
      return d.isDirectory() ? sourceFiles(p) : /\.tsx?$/.test(d.name) ? [p] : [];
    });
  }

  it('kein App-Code enthält einen Wikidata-Abfrage-Endpunkt', () => {
    const offenders = sourceFiles(path.join(__dirname, '../src')).filter((f) =>
      /query\.wikidata\.org|wikidata\.org\/w\/api\.php|wikidata\.org\/sparql/.test(fs.readFileSync(f, 'utf8')),
    );
    expect(offenders).toEqual([]);
  });

  it('nur das Build-Skript nutzt die Abfrage-Endpunkte', () => {
    const script = fs.readFileSync(path.join(__dirname, '../../tools/regierung/build.mjs'), 'utf8');
    expect(script).toContain('https://query.wikidata.org/sparql');
    expect(script).toContain('https://www.wikidata.org/w/api.php');
  });
});
